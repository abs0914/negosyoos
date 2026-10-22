export type ModuleCategory = "sales" | "operations" | "customers" | "finance" | "workforce";
export type MinimumPlan = "starter" | "growth" | "pro";
export type ModuleConfigurationValue = string | number | boolean;

interface ConfigurationFieldBase {
  label: string;
  description?: string | undefined;
  required: boolean;
}

export interface StringConfigurationField extends ConfigurationFieldBase {
  type: "string";
  default?: string | undefined;
  minLength?: number | undefined;
  maxLength?: number | undefined;
}

export interface BooleanConfigurationField extends ConfigurationFieldBase {
  type: "boolean";
  default?: boolean | undefined;
}

export interface NumberConfigurationField extends ConfigurationFieldBase {
  type: "integer" | "number";
  default?: number | undefined;
  minimum?: number | undefined;
  maximum?: number | undefined;
}

export interface EnumConfigurationField extends ConfigurationFieldBase {
  type: "enum";
  options: readonly string[];
  default?: string | undefined;
}

export type ModuleConfigurationField =
  | StringConfigurationField
  | BooleanConfigurationField
  | NumberConfigurationField
  | EnumConfigurationField;

export interface ModuleConfigurationSchema {
  properties: Readonly<Record<string, ModuleConfigurationField>>;
  additionalProperties: false;
}

export interface ModuleDefinition {
  key: string;
  name: string;
  description: string;
  category: ModuleCategory;
  dependencies: readonly string[];
  icon: string;
  minimumPlan: MinimumPlan;
  configurationSchema: ModuleConfigurationSchema;
  version: number;
}

export interface BusinessModule {
  businessId: string;
  moduleKey: string;
  enabled: boolean;
  configuration: Readonly<Record<string, ModuleConfigurationValue>>;
  activatedAt: string;
}

export interface ModuleRegistryEntry {
  definition: ModuleDefinition;
  businessModule: BusinessModule | null;
}

export interface ModuleNavigationItem {
  key: string;
  label: string;
  icon: string;
  href: string;
}
