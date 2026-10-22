import "server-only";

import { requireAuthenticatedUser, requireCapability, requirePermission } from "@negosyo-os/auth";
import { createClient } from "@negosyo-os/auth/server";
import { BusinessIdSchema } from "@negosyo-os/business";
import { AppError, ERROR_CODES } from "@negosyo-os/core/errors";
import { PERMISSIONS } from "@negosyo-os/core/permissions";
import type { Json } from "@negosyo-os/database";

import type { BusinessModule, ModuleDefinition, ModuleRegistryEntry } from "./models";
import {
  ModuleConfigurationSchemaSchema,
  ModuleDefinitionSchema,
  SetBusinessModuleStateInputSchema,
  coerceModuleConfiguration,
  parseModuleConfiguration,
  type SetBusinessModuleStateInput,
} from "./schemas";

function databaseError(message: string, cause: unknown): AppError {
  return new AppError({ code: ERROR_CODES.internal, message, status: 500, cause, expose: false });
}

export async function listModuleRegistry(businessId: string): Promise<readonly ModuleRegistryEntry[]> {
  const id = BusinessIdSchema.parse(businessId);
  const supabase = await createClient();
  await requirePermission(id, PERMISSIONS.moduleRead, supabase);

  const [definitionsResult, dependenciesResult, businessModulesResult] = await Promise.all([
    supabase.from("module_definitions").select(
      "id, key, name, description, category, icon, minimum_plan, configuration_schema, version",
    ).eq("status", "published").order("category").order("name"),
    supabase.from("module_dependencies").select("module_key, dependency_module_key"),
    supabase.from("organization_modules").select(
      "organization_id, module_id, config, enabled_at, is_enabled",
    ).eq("organization_id", id),
  ]);
  const error = definitionsResult.error ?? dependenciesResult.error ?? businessModulesResult.error;
  if (error) throw databaseError("Module registry could not be loaded.", error);
  const definitions = definitionsResult.data ?? [];
  const dependencies = dependenciesResult.data ?? [];
  const businessModules = businessModulesResult.data ?? [];

  const dependenciesByModule = Map.groupBy(
    dependencies,
    (dependency) => dependency.module_key,
  );
  const businessModulesByDefinition = new Map(
    businessModules.map((businessModule) => [businessModule.module_id, businessModule]),
  );

  return definitions.map((row): ModuleRegistryEntry => {
    const definition: ModuleDefinition = ModuleDefinitionSchema.parse({
      key: row.key,
      name: row.name,
      description: row.description,
      category: row.category,
      dependencies: (dependenciesByModule.get(row.key) ?? []).map((item) => item.dependency_module_key),
      icon: row.icon,
      minimumPlan: row.minimum_plan,
      configurationSchema: row.configuration_schema,
      version: row.version,
    });
    const assignment = businessModulesByDefinition.get(row.id);
    const businessModule: BusinessModule | null = assignment ? {
      businessId: assignment.organization_id,
      moduleKey: row.key,
      enabled: assignment.is_enabled,
      configuration: parseModuleConfiguration(definition.configurationSchema, assignment.config),
      activatedAt: assignment.enabled_at,
    } : null;
    return { definition, businessModule };
  });
}

export async function setBusinessModuleState(
  businessId: string,
  input: SetBusinessModuleStateInput,
): Promise<void> {
  const id = BusinessIdSchema.parse(businessId);
  const parsed = SetBusinessModuleStateInputSchema.parse(input);
  const supabase = await createClient();
  const user = await requireAuthenticatedUser(supabase);
  await requireCapability(user, PERMISSIONS.moduleManage, { businessId: id }, supabase);

  const { data: definition, error: definitionError } = await supabase.from("module_definitions")
    .select("configuration_schema").eq("key", parsed.moduleKey).eq("status", "published").single();
  if (definitionError) throw databaseError("Module definition could not be loaded.", definitionError);

  const configurationSchema = ModuleConfigurationSchemaSchema.parse(definition.configuration_schema);
  const configuration = parsed.enabled
    ? coerceModuleConfiguration(configurationSchema, parsed.configuration)
    : {};
  const { error } = await supabase.rpc("set_business_module_state", {
    requested_organization_id: id,
    requested_module_key: parsed.moduleKey,
    requested_enabled: parsed.enabled,
    requested_configuration: configuration as Json,
  });
  if (error) {
    const isExpectedConflict = error.code === "P0001";
    throw new AppError({
      code: isExpectedConflict ? ERROR_CODES.conflict : ERROR_CODES.internal,
      message: isExpectedConflict ? error.message : "Module state could not be saved.",
      status: isExpectedConflict ? 409 : 500,
      cause: error,
      expose: isExpectedConflict,
    });
  }
}
