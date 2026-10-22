import type { ObjectAttributeValue } from "@negosyo-os/objects";

export const FORM_MODES = ["create", "edit"] as const;
export const FORM_CONDITION_OPERATORS = ["equals", "not_equals", "is_empty", "is_not_empty"] as const;

export type FormMode = (typeof FORM_MODES)[number];
export type FormConditionOperator = (typeof FORM_CONDITION_OPERATORS)[number];

export interface FormDefinition {
  id: string;
  businessId: string;
  objectDefinitionId: string;
  key: string;
  name: string;
  description: string | null;
  mode: FormMode;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
}

export interface FormCondition {
  sourceFieldId: string;
  operator: FormConditionOperator;
  value?: ObjectAttributeValue | undefined;
}

export interface FormVisibilityRule {
  logic: "all" | "any";
  conditions: readonly FormCondition[];
}

export interface FormLayoutField {
  fieldId: string;
  width: "full" | "half";
  required: boolean;
  readOnly: boolean;
  defaultValue?: ObjectAttributeValue | undefined;
  visibilityRule?: FormVisibilityRule | undefined;
}

export interface FormSection {
  key: string;
  title: string;
  description: string | null;
  columns: 1 | 2;
  fields: readonly FormLayoutField[];
}

export interface FormLayout {
  id: string;
  businessId: string;
  formDefinitionId: string;
  version: number;
  sections: readonly FormSection[];
  createdAt: string;
  updatedAt: string;
}

export interface FormDefinitionWithLayout {
  definition: FormDefinition;
  layout: FormLayout;
}
