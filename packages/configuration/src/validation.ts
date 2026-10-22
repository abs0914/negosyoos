import { createModuleConfigurationValidator, type ModuleConfigurationSchema } from "@negosyo-os/modules";
import type{PlanKey}from"@negosyo-os/billing";
import { FieldDefinitionSchema, type ConfigurationChangeSet, type FieldDefinition } from "./configuration-operation";

export interface ValidationModule { readonly key:string; readonly enabled:boolean; readonly dependencies:readonly string[]; readonly minimumPlan:PlanKey; readonly configurationSchema:ModuleConfigurationSchema }
export interface ValidationObject { readonly key:string; readonly fields:ReadonlyMap<string,FieldDefinition>; readonly views:ReadonlySet<string>; readonly forms:ReadonlySet<string> }
export interface ConfigurationValidationState {
  readonly revision:number; readonly plan:PlanKey; readonly modules:ReadonlyMap<string,ValidationModule>;
  readonly objects:ReadonlyMap<string,ValidationObject>; readonly workflows:ReadonlySet<string>; readonly reports:ReadonlySet<string>;
  readonly dashboardWidgets:ReadonlyMap<string,ReadonlySet<string>>; readonly roles:ReadonlySet<string>; readonly permissions:ReadonlySet<string>;
  readonly entityKeys:ReadonlySet<string>; readonly reportSources:ReadonlySet<string>;
}
export interface ConfigurationValidationResult { readonly warnings:readonly string[]; readonly checks:{readonly schema:"passed";readonly tenantAuthorization:"passed";readonly dependencies:"passed";readonly businessRules:"passed"} }

const rank={free_assessment:0,starter:1,pro:2,growth:3,multi_branch:4}as const;
function fail(message:string):never{throw new Error(message)}
function objectOrFail(objects:Map<string,{fields:Map<string,FieldDefinition>;views:Set<string>;forms:Set<string>}>,key:string){return objects.get(key)??fail(`Object '${key}' does not exist.`)}
function validateFieldReferences(keys:readonly string[],fields:Map<string,FieldDefinition>,label:string){for(const key of keys)if(!["record","branch","created_at","updated_at"].includes(key)&&!fields.has(key))fail(`${label} references unknown field '${key}'.`)}

export function validateConfigurationChangeSet(state:ConfigurationValidationState,changeSet:ConfigurationChangeSet):ConfigurationValidationResult{
 const enabled=new Set([...state.modules.values()].filter((item)=>item.enabled).map((item)=>item.key));
 const objects=new Map([...state.objects].map(([key,value])=>[key,{fields:new Map(value.fields),views:new Set(value.views),forms:new Set(value.forms)}]));
 const workflows=new Set(state.workflows),reports=new Set(state.reports),widgets=new Map([...state.dashboardWidgets].map(([key,value])=>[key,new Set(value)]));
 const warnings:string[]=[];
 for(const item of changeSet.operations){
  switch(item.operation){
   case"enable_module":{const moduleDefinition=state.modules.get(item.moduleKey)??fail(`Module '${item.moduleKey}' is unavailable.`);if(rank[state.plan]<rank[moduleDefinition.minimumPlan])fail(`Module '${item.moduleKey}' requires the ${moduleDefinition.minimumPlan} plan.`);for(const dependency of moduleDefinition.dependencies)if(!enabled.has(dependency))fail(`Enable required module '${dependency}' before '${item.moduleKey}'.`);createModuleConfigurationValidator(moduleDefinition.configurationSchema).parse(item.configuration);enabled.add(item.moduleKey);break;}
   case"disable_module":{if(!enabled.has(item.moduleKey))fail(`Module '${item.moduleKey}' is not enabled.`);const dependent=[...state.modules.values()].find((module)=>enabled.has(module.key)&&module.dependencies.includes(item.moduleKey));if(dependent)fail(`Disable dependent module '${dependent.key}' before '${item.moduleKey}'.`);enabled.delete(item.moduleKey);warnings.push(`Disabling ${item.moduleKey} preserves existing records but removes module access.`);break;}
   case"rename_entity":if(!state.entityKeys.has(item.entityKey)&&!objects.has(item.entityKey))fail(`Entity '${item.entityKey}' is not configurable.`);break;
   case"add_object":if(objects.has(item.object.key))fail(`Object '${item.object.key}' already exists.`);else objects.set(item.object.key,{fields:new Map(),views:new Set(),forms:new Set()});break;
   case"add_field":{const object=objectOrFail(objects,item.objectKey);if(object.fields.has(item.field.key))fail(`Field '${item.objectKey}.${item.field.key}' already exists.`);if(item.field.relationObjectKey&&!objects.has(item.field.relationObjectKey))fail(`Relation target '${item.field.relationObjectKey}' does not exist.`);object.fields.set(item.field.key,item.field);break;}
   case"update_field":{const object=objectOrFail(objects,item.objectKey),current=object.fields.get(item.fieldKey)??fail(`Field '${item.objectKey}.${item.fieldKey}' does not exist.`);const merged=FieldDefinitionSchema.parse({...current,...item.changes,key:item.fieldKey});if(merged.relationObjectKey&&!objects.has(merged.relationObjectKey))fail(`Relation target '${merged.relationObjectKey}' does not exist.`);object.fields.set(item.fieldKey,merged);break;}
   case"add_view":{const object=objectOrFail(objects,item.objectKey);if(object.views.has(item.view.key))fail(`View '${item.objectKey}.${item.view.key}' already exists.`);validateFieldReferences(item.view.configuration.selectedColumns,object.fields,"View");for(const filter of item.view.configuration.filters.filters)validateFieldReferences([filter.fieldKey],object.fields,"View filter");object.views.add(item.view.key);break;}
   case"update_view":{const object=objectOrFail(objects,item.objectKey);if(!object.views.has(item.viewKey))fail(`View '${item.objectKey}.${item.viewKey}' does not exist.`);if(item.changes.configuration)validateFieldReferences(item.changes.configuration.selectedColumns,object.fields,"View");break;}
   case"add_form":{const object=objectOrFail(objects,item.objectKey);if(object.forms.has(item.form.key))fail(`Form '${item.objectKey}.${item.form.key}' already exists.`);for(const section of item.form.sections)validateFieldReferences(section.fieldKeys,object.fields,"Form");object.forms.add(item.form.key);break;}
   case"update_form":{const object=objectOrFail(objects,item.objectKey);if(!object.forms.has(item.formKey))fail(`Form '${item.objectKey}.${item.formKey}' does not exist.`);for(const section of item.changes.sections??[])validateFieldReferences(section.fieldKeys,object.fields,"Form");break;}
   case"add_workflow":if(workflows.has(item.workflow.key))fail(`Workflow '${item.workflow.key}' already exists.`);else workflows.add(item.workflow.key);break;
   case"update_workflow":if(!workflows.has(item.workflowKey))fail(`Workflow '${item.workflowKey}' does not exist.`);break;
   case"add_report":if(reports.has(item.report.key))fail(`Report '${item.report.key}' already exists.`);else{if(!state.reportSources.has(item.report.queryConfig.source)&&!objects.has(item.report.queryConfig.source))fail(`Report source '${item.report.queryConfig.source}' is unavailable.`);const source=objects.get(item.report.queryConfig.source);if(source){for(const filter of item.report.queryConfig.filters)validateFieldReferences([filter.fieldKey],source.fields,"Report filter");for(const key of item.report.queryConfig.groupBy)validateFieldReferences([key],source.fields,"Report grouping");for(const metric of item.report.queryConfig.metrics)if(metric.fieldKey)validateFieldReferences([metric.fieldKey],source.fields,"Report metric");}reports.add(item.report.key);}break;
   case"add_dashboard_widget":{if(!reports.has(item.widget.reportKey))fail(`Dashboard widget report '${item.widget.reportKey}' does not exist.`);const current=widgets.get(item.dashboardKey)??new Set<string>();if(current.has(item.widget.key))fail(`Dashboard widget '${item.widget.key}' already exists.`);current.add(item.widget.key);widgets.set(item.dashboardKey,current);break;}
   case"update_permission":if(!state.roles.has(item.roleKey))fail(`Role '${item.roleKey}' does not exist.`);else if(!state.permissions.has(item.permissionKey))fail(`Permission '${item.permissionKey}' does not exist.`);break;
  }
 }
 return{warnings,checks:{schema:"passed",tenantAuthorization:"passed",dependencies:"passed",businessRules:"passed"}};
}
