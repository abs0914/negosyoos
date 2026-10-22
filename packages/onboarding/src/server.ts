import "server-only";

import { can, requireAuthenticatedUser, requirePermission } from "@negosyo-os/auth";
import { createClient, type ServerSupabaseClient } from "@negosyo-os/auth/server";
import { BusinessIdSchema } from "@negosyo-os/business";
import { AppError, ERROR_CODES } from "@negosyo-os/core/errors";
import { PERMISSIONS } from "@negosyo-os/core/permissions";

import {
  resolveCoachCopy,
  selectCoachPlaybook,
  type CoachResource,
  type CoachTaskDefinition,
  type NegosyoCoach,
  type NegosyoCoachTask,
} from "./index";

const failure = (message: string, cause: unknown) => new AppError({
  code: ERROR_CODES.internal,
  message,
  status: 500,
  cause,
  expose: false,
});

function industryTemplate(industry: string): string {
  const normalized = industry.trim().toLocaleLowerCase();
  if (/(food|restaurant|cafe|bakery|carinderia)/u.test(normalized)) return "food-restaurant-os";
  if (/(salon|service|repair|laundry|clinic|spa|barber)/u.test(normalized)) return "service-business-os";
  return "retail-store-os";
}

async function exists(
  client: ServerSupabaseClient,
  businessId: string,
  resource: CoachResource,
): Promise<boolean> {
  if (resource === "business_os_installation") {
    const result = await client.from("business_os_installations").select("id").eq("organization_id", businessId).eq("status", "active").limit(1);
    if (result.error) throw failure("Business OS activation could not be checked.", result.error);
    return Boolean(result.data?.length);
  }
  if (resource === "product" || resource === "service") {
    let query = client.from("products").select("id").eq("organization_id", businessId);
    if (resource === "service") query = query.eq("product_type", "service");
    const result = await query.limit(1);
    if (result.error) throw failure("Catalog setup could not be checked.", result.error);
    return Boolean(result.data?.length);
  }
  if (resource === "customer") {
    const result = await client.from("sales_customers").select("id").eq("organization_id", businessId).limit(1);
    if (result.error) throw failure("Customer setup could not be checked.", result.error);
    return Boolean(result.data?.length);
  }
  if (resource === "stock_received") {
    // Use the immutable ledger: selling the opening stock must not undo setup progress.
    const result = await client.from("stock_movements").select("id")
      .eq("organization_id", businessId)
      .in("movement_type", ["opening_balance", "purchase"])
      .gt("quantity_delta", 0).limit(1);
    if (result.error) throw failure("Opening stock could not be checked.", result.error);
    return Boolean(result.data?.length);
  }
  if (resource === "job_order" || resource === "completed_job_order") {
    let query = client.from("job_orders").select("id").eq("organization_id", businessId);
    if (resource === "completed_job_order") query = query.in("status", ["completed", "released"]);
    const result = await query.limit(1);
    if (result.error) throw failure("Service work setup could not be checked.", result.error);
    return Boolean(result.data?.length);
  }
  if (resource === "appointment") {
    const result = await client.from("appointments").select("id").eq("organization_id", businessId).limit(1);
    if (result.error) throw failure("Appointment setup could not be checked.", result.error);
    return Boolean(result.data?.length);
  }
  const result = await client.from("sales_transactions").select("id").eq("organization_id", businessId).in("status", ["completed", "partially_returned", "returned", "refunded"]).limit(1);
  if (result.error) throw failure("Sales activation could not be checked.", result.error);
  return Boolean(result.data?.length);
}

function taskWithCopy(task: CoachTaskDefinition, base: string, labels: Readonly<Record<string, string>>): CoachTaskDefinition {
  return {
    ...task,
    title: resolveCoachCopy(task.title, labels),
    description: resolveCoachCopy(task.description, labels),
    reason: resolveCoachCopy(task.reason, labels),
    actionLabel: resolveCoachCopy(task.actionLabel, labels),
    href: `${base}${task.href}`,
  };
}

export async function getNegosyoCoach(businessId: string): Promise<NegosyoCoach | null> {
  const id = BusinessIdSchema.parse(businessId);
  const client = await createClient();
  const user = await requireAuthenticatedUser(client);
  await requirePermission(id, PERMISSIONS.organizationRead, client);

  const [business, installation, moduleDefinitions, moduleAssignments] = await Promise.all([
    client.from("organizations").select("industry_code").eq("id", id).single(),
    client.from("business_os_installations").select("template_id").eq("organization_id", id).eq("status", "active").maybeSingle(),
    client.from("module_definitions").select("id,key").eq("status", "published"),
    client.from("organization_modules").select("module_id,config,is_enabled").eq("organization_id", id),
  ]);
  const initialError = business.error ?? installation.error ?? moduleDefinitions.error ?? moduleAssignments.error;
  if (initialError) throw failure("The setup guide could not be loaded.", initialError);
  if (!business.data) throw failure("The Business could not be identified.", null);

  let templateKey: string | null = null;
  if (installation.data) {
    const template = await client.from("business_os_templates").select("key").eq("id", installation.data.template_id).single();
    if (template.error) throw failure("The installed Business OS could not be identified.", template.error);
    templateKey = template.data.key;
  }
  const playbook = selectCoachPlaybook(templateKey ?? industryTemplate(business.data.industry_code));
  const definitionsById = new Map((moduleDefinitions.data ?? []).map((item) => [item.id, item.key]));
  const assignmentsByKey = new Map((moduleAssignments.data ?? []).flatMap((item) => {
    const key = definitionsById.get(item.module_id);
    return key ? [[key, item] as const] : [];
  }));
  const enabledModules = new Set([...assignmentsByKey].filter(([, item]) => item.is_enabled).map(([key]) => key));
  const jobConfiguration = assignmentsByKey.get("job_orders")?.config;
  const jobConfig = jobConfiguration && typeof jobConfiguration === "object" && !Array.isArray(jobConfiguration) ? jobConfiguration : {};
  const labels = {
    jobOrderSingular: typeof jobConfig.singular_label === "string" ? jobConfig.singular_label : "Job Order",
    jobOrderPlural: typeof jobConfig.plural_label === "string" ? jobConfig.plural_label : "Job Orders",
  };

  const visibility = await Promise.all(playbook.mission.tasks.map(async (task) => ({
    task,
    allowed: await can(user, task.permission, { businessId: id }, client),
  })));
  const visibleDefinitions = visibility
    .filter(({ task, allowed }) => allowed && (!task.requiredModule || enabledModules.has(task.requiredModule)))
    .map(({ task }) => taskWithCopy(task, `/business/${id}`, labels));
  if (!visibleDefinitions.length) return null;

  const [completion, progress] = await Promise.all([
    Promise.all(visibleDefinitions.map((task) => exists(client, id, task.resource))),
    client.from("negosyo_coach_progress").select("dismissed_at").eq("organization_id", id).eq("user_id", user.id).eq("playbook_key", playbook.key).maybeSingle(),
  ]);
  if (progress.error) throw failure("Setup guide progress could not be loaded.", progress.error);

  const firstIncomplete = completion.findIndex((complete) => !complete);
  const tasks: NegosyoCoachTask[] = visibleDefinitions.map((task, index) => ({
    ...task,
    status: completion[index] ? "completed" : index === firstIncomplete ? "current" : "upcoming",
  }));
  const completedCount = completion.filter(Boolean).length;
  const currentTask = tasks.find((task) => task.status === "current") ?? null;
  return {
    playbookKey: playbook.key,
    title: playbook.title,
    description: playbook.description,
    missionTitle: playbook.mission.title,
    missionDescription: playbook.mission.description,
    tasks,
    completedCount,
    totalCount: tasks.length,
    percentComplete: Math.round((completedCount / tasks.length) * 100),
    dismissed: Boolean(progress.data?.dismissed_at),
    currentTask,
  };
}

export async function setNegosyoCoachDismissed(businessId: string, playbookKey: string, dismissed: boolean): Promise<void> {
  const id = BusinessIdSchema.parse(businessId);
  const playbook = selectCoachPlaybook(null);
  const valid = playbookKey === playbook.key || ["service_activation", "food_activation"].includes(playbookKey);
  if (!valid) throw new AppError({ code: ERROR_CODES.validationFailed, message: "Invalid setup guide.", status: 400 });
  const client = await createClient();
  await requirePermission(id, PERMISSIONS.organizationRead, client);
  const result = await client.rpc("save_negosyo_coach_progress", {
    requested_organization_id: id,
    requested_playbook_key: playbookKey,
    requested_dismissed: dismissed,
    requested_completed: false,
  });
  if (result.error) throw failure("Setup guide preference could not be saved.", result.error);
}
