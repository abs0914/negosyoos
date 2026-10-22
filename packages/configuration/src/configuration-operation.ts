import { WorkflowConfigurationSchema } from "@negosyo-os/workflow";
import { ViewConfigurationSchema } from "@negosyo-os/views";
import { z } from "zod";

export const ConfigurationKeySchema = z.string().trim().toLowerCase()
  .regex(/^[a-z][a-z0-9_]*$/).max(64);
const label = z.string().trim().min(1).max(120);
const description = z.string().trim().max(500);
const scalar = z.union([z.string().max(2_000), z.number().finite(), z.boolean(), z.null(), z.array(z.string().max(200)).max(100)]);

const FieldDefinitionBaseSchema = z.strictObject({
  label,
  type: z.enum(["text","textarea","number","decimal","currency","percentage","boolean","date","datetime","email","phone","url","select","multiselect","status","user","branch","relation","attachment"]),
  required: z.boolean().default(false), unique: z.boolean().default(false), defaultValue: scalar.optional(),
  placeholder: z.string().trim().max(200).optional(), helpText: z.string().trim().max(500).optional(),
  options: z.array(z.strictObject({ value: ConfigurationKeySchema, label })).max(100).default([]),
  validation: z.strictObject({ minLength: z.number().int().min(0).max(10_000).optional(), maxLength: z.number().int().min(1).max(10_000).optional(), minimum: z.number().finite().optional(), maximum: z.number().finite().optional() }).default({}),
  visibility: z.enum(["visible","hidden"]).default("visible"), readOnly: z.boolean().default(false), relationObjectKey: ConfigurationKeySchema.optional(),
});
function validateField(field: z.infer<typeof FieldDefinitionBaseSchema>, context: z.RefinementCtx) {
  const optionType = ["select","multiselect","status"].includes(field.type);
  if (optionType !== (field.options.length > 0)) context.addIssue({ code:"custom", path:["options"], message:optionType?"This field type requires options.":"This field type cannot have options." });
  if ((field.type === "relation") !== Boolean(field.relationObjectKey)) context.addIssue({ code:"custom", path:["relationObjectKey"], message:"Only relation fields require one target object." });
  if (new Set(field.options.map((item)=>item.value)).size !== field.options.length) context.addIssue({ code:"custom", path:["options"], message:"Option values must be unique." });
  if (field.validation.minLength !== undefined && field.validation.maxLength !== undefined && field.validation.minLength > field.validation.maxLength) context.addIssue({ code:"custom", path:["validation"], message:"Minimum length cannot exceed maximum length." });
  if (field.validation.minimum !== undefined && field.validation.maximum !== undefined && field.validation.minimum > field.validation.maximum) context.addIssue({ code:"custom", path:["validation"], message:"Minimum cannot exceed maximum." });
}
export const FieldDefinitionSchema = FieldDefinitionBaseSchema.extend({ key:ConfigurationKeySchema }).superRefine(validateField);
const FieldChangesSchema = FieldDefinitionBaseSchema.partial().refine((value)=>Object.keys(value).length>0,"At least one field property must change.");

const EnableModuleOperationSchema = z.strictObject({ operation:z.literal("enable_module"), moduleKey:ConfigurationKeySchema, configuration:z.record(ConfigurationKeySchema,z.union([z.string().max(500),z.number().finite(),z.boolean()])).default({}) });
const DisableModuleOperationSchema = z.strictObject({ operation:z.literal("disable_module"), moduleKey:ConfigurationKeySchema });
const RenameEntityOperationSchema = z.strictObject({ operation:z.literal("rename_entity"), entityKey:ConfigurationKeySchema, singularLabel:label, pluralLabel:label });
const AddObjectOperationSchema = z.strictObject({ operation:z.literal("add_object"), object:z.strictObject({ key:ConfigurationKeySchema, singularLabel:label, pluralLabel:label, description:description.default("") }) });
const AddFieldOperationSchema = z.strictObject({ operation:z.literal("add_field"), objectKey:ConfigurationKeySchema, field:FieldDefinitionSchema });
const UpdateFieldOperationSchema = z.strictObject({ operation:z.literal("update_field"), objectKey:ConfigurationKeySchema, fieldKey:ConfigurationKeySchema, changes:FieldChangesSchema });

const ViewDefinitionSchema = z.strictObject({ key:ConfigurationKeySchema, name:label, description:description.default(""), scope:z.enum(["personal","shared"]).default("shared"), configuration:ViewConfigurationSchema });
const AddViewOperationSchema = z.strictObject({ operation:z.literal("add_view"), objectKey:ConfigurationKeySchema, view:ViewDefinitionSchema });
const UpdateViewOperationSchema = z.strictObject({ operation:z.literal("update_view"), objectKey:ConfigurationKeySchema, viewKey:ConfigurationKeySchema, changes:ViewDefinitionSchema.omit({key:true}).partial().refine((value)=>Object.keys(value).length>0,"At least one view property must change.") });

const FormSectionSchema = z.strictObject({ key:ConfigurationKeySchema, title:label, description:description.default(""), columns:z.union([z.literal(1),z.literal(2)]).default(1), fieldKeys:z.array(ConfigurationKeySchema).min(1).max(100) });
const FormDefinitionSchema = z.strictObject({ key:ConfigurationKeySchema, name:label, description:description.default(""), mode:z.enum(["create","edit"]), sections:z.array(FormSectionSchema).min(1).max(20) });
const AddFormOperationSchema = z.strictObject({ operation:z.literal("add_form"), objectKey:ConfigurationKeySchema, form:FormDefinitionSchema });
const UpdateFormOperationSchema = z.strictObject({ operation:z.literal("update_form"), objectKey:ConfigurationKeySchema, formKey:ConfigurationKeySchema, changes:FormDefinitionSchema.omit({key:true}).partial().refine((value)=>Object.keys(value).length>0,"At least one form property must change.") });

const WorkflowDefinitionSchema = z.strictObject({ key:ConfigurationKeySchema, name:label, description:description.default(""), configuration:WorkflowConfigurationSchema, status:z.enum(["draft","active","disabled"]).default("draft") });
const AddWorkflowOperationSchema = z.strictObject({ operation:z.literal("add_workflow"), workflow:WorkflowDefinitionSchema });
const UpdateWorkflowOperationSchema = z.strictObject({ operation:z.literal("update_workflow"), workflowKey:ConfigurationKeySchema, changes:WorkflowDefinitionSchema.omit({key:true}).partial().refine((value)=>Object.keys(value).length>0,"At least one workflow property must change.") });

const ReportFilterSchema = z.strictObject({ fieldKey:ConfigurationKeySchema, operator:z.enum(["equals","not_equals","greater_than","less_than","contains","is_empty","not_empty","is_today"]), value:scalar.optional() }).superRefine((item,context)=>{const empty=["is_empty","not_empty","is_today"].includes(item.operator);if(empty===(item.value!==undefined))context.addIssue({code:"custom",path:["value"],message:empty?"This filter accepts no value.":"This filter requires a value."});});
const ReportMetricSchema = z.strictObject({ key:ConfigurationKeySchema, aggregation:z.enum(["count","sum","average","minimum","maximum"]), fieldKey:ConfigurationKeySchema.optional(), label });
export const SafeReportQuerySchema = z.strictObject({ provider:z.literal("core_report"), source:ConfigurationKeySchema, datePreset:z.enum(["today","this_week","this_month","rolling_30_days","rolling_90_days","all_time"]).optional(), filters:z.array(ReportFilterSchema).max(25).default([]), groupBy:z.array(ConfigurationKeySchema).max(10).default([]), metrics:z.array(ReportMetricSchema).min(1).max(20), limit:z.number().int().min(1).max(500).default(100) });
const ReportDefinitionSchema = z.strictObject({ key:ConfigurationKeySchema, name:label, description:description.default(""), queryConfig:SafeReportQuerySchema, visualizationConfig:z.strictObject({ type:z.enum(["metric","table","bar","line","pie"]), format:z.enum(["number","currency","percentage"]).default("number"), currency:z.literal("PHP").optional(), pageSize:z.number().int().min(5).max(100).optional() }) });
const AddReportOperationSchema = z.strictObject({ operation:z.literal("add_report"), report:ReportDefinitionSchema });
const DashboardWidgetSchema = z.strictObject({ key:ConfigurationKeySchema, reportKey:ConfigurationKeySchema, title:label, visualization:z.enum(["metric","table","bar","line","pie"]), x:z.number().int().min(0).max(11), y:z.number().int().min(0).max(1000), width:z.number().int().min(1).max(12), height:z.number().int().min(1).max(20) }).refine((widget)=>widget.x+widget.width<=12,"Widget must fit within the 12-column dashboard.");
const AddDashboardWidgetOperationSchema = z.strictObject({ operation:z.literal("add_dashboard_widget"), dashboardKey:ConfigurationKeySchema, dashboardName:label, widget:DashboardWidgetSchema });
const UpdatePermissionOperationSchema = z.strictObject({ operation:z.literal("update_permission"), roleKey:ConfigurationKeySchema, permissionKey:z.string().regex(/^[a-z][a-z-]*\.[a-z][a-z-]*$/).max(80), enabled:z.boolean() });

export const ConfigurationOperationSchema = z.discriminatedUnion("operation", [EnableModuleOperationSchema,DisableModuleOperationSchema,RenameEntityOperationSchema,AddObjectOperationSchema,AddFieldOperationSchema,UpdateFieldOperationSchema,AddViewOperationSchema,UpdateViewOperationSchema,AddFormOperationSchema,UpdateFormOperationSchema,AddWorkflowOperationSchema,UpdateWorkflowOperationSchema,AddDashboardWidgetOperationSchema,AddReportOperationSchema,UpdatePermissionOperationSchema]);
export const CONFIGURATION_OPERATIONS = ["enable_module","disable_module","rename_entity","add_object","add_field","update_field","add_view","update_view","add_form","update_form","add_workflow","update_workflow","add_dashboard_widget","add_report","update_permission"] as const;
export const ConfigurationChangeSetSchema = z.strictObject({ id:z.uuid(), title:z.string().trim().min(1).max(160), summary:z.string().trim().min(1).max(1000), operations:z.array(ConfigurationOperationSchema).min(1).max(50) });
export const ConfigurationProposalInputSchema = ConfigurationChangeSetSchema.omit({id:true}).extend({ expectedRevision:z.number().int().min(0) });
export const ConfigurationProposalIdSchema = z.uuid();

export type FieldDefinition = z.infer<typeof FieldDefinitionSchema>;
export type ConfigurationOperation = z.infer<typeof ConfigurationOperationSchema>;
export type ConfigurationChangeSet = z.infer<typeof ConfigurationChangeSetSchema>;
export type ConfigurationProposalInput = z.input<typeof ConfigurationProposalInputSchema>;
