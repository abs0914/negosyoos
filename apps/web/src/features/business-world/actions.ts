"use server";
import { requireCapability } from "@negosyo-os/auth";
import { PERMISSIONS } from "@negosyo-os/core/permissions";
import { revalidatePath } from "next/cache";
import { ConfigSchema, PreferencesSchema } from "./model";
import { getWorldSnapshot, worldAccess } from "./server";

export async function saveWorldConfig(businessId: string, input: unknown, reset = false) {
  const { client, user } = await worldAccess(businessId);
  await requireCapability(user, PERMISSIONS.settingsManage, { businessId }, client);
  const snapshot = await getWorldSnapshot(businessId);
  if (!snapshot.configCompatible) throw new Error("This world was saved by a newer version. Update the app before editing it.");
  const config = ConfigSchema.parse(reset ? snapshot.suggested : input);
  const result = await client.from("business_world_configs").upsert({ organization_id: businessId, schema_version: 1, config, suggestion_key: snapshot.suggestionKey, updated_at: new Date().toISOString() });
  if (result.error) throw new Error("World settings could not be saved.");
  revalidatePath(`/business/${businessId}/world`);
  return config;
}
export async function saveWorldPreferences(businessId: string, input: unknown) {
  const { client, user } = await worldAccess(businessId);
  const values = PreferencesSchema.parse(input);
  if (values.branch_id) await requireCapability(user, PERMISSIONS.organizationRead, { businessId, branchId: values.branch_id }, client);
  const result = await client.from("business_world_preferences").upsert({ organization_id: businessId, user_id: user.id, ...values, updated_at: new Date().toISOString() });
  if (result.error) throw new Error("Your view preferences could not be saved.");
}
