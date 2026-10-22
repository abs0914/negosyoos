export const FIELD_TYPES = [
  "text", "textarea", "number", "decimal", "currency", "percentage",
  "boolean", "date", "datetime", "email", "phone", "url", "select",
  "multiselect", "status", "user", "branch", "relation", "attachment",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];
export type FieldVisibility = "visible" | "hidden";
export type ObjectStatus = "draft" | "active" | "archived";
export type FieldStatus = "active" | "archived";
export type RecordStatus = "active" | "archived";
export type JsonPrimitive = string | number | boolean | null;
export type ObjectAttributeValue = JsonPrimitive | readonly string[];

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldValidation {
  minLength?: number | undefined;
  maxLength?: number | undefined;
  minimum?: number | undefined;
  maximum?: number | undefined;
}

export interface ObjectDefinition {
  id: string;
  businessId: string;
  key: string;
  singularLabel: string;
  pluralLabel: string;
  description: string | null;
  status: ObjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FieldDefinition {
  id: string;
  businessId: string;
  objectDefinitionId: string;
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  unique: boolean;
  defaultValue?: ObjectAttributeValue | undefined;
  placeholder?: string | undefined;
  helpText?: string | undefined;
  options: readonly FieldOption[];
  validation: FieldValidation;
  visibility: FieldVisibility;
  readOnly: boolean;
  relationObjectId?: string | undefined;
  sortOrder: number;
  status: FieldStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ObjectRecord {
  id: string;
  businessId: string;
  objectDefinitionId: string;
  branchId: string | null;
  displayValue: string;
  attributes: Readonly<Record<string, ObjectAttributeValue>>;
  status: RecordStatus;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ObjectRelationship {
  id: string;
  businessId: string;
  key: string;
  sourceObjectId: string;
  targetObjectId: string;
  cardinality: "one_to_one" | "one_to_many" | "many_to_many";
  sourceLabel: string;
  targetLabel: string;
  status: "active" | "archived";
}

export interface ObjectDefinitionWithFields {
  definition: ObjectDefinition;
  fields: readonly FieldDefinition[];
}

export interface RecordPage {
  records: readonly ObjectRecord[];
  nextCursor: string | null;
}
