import { describe, expect, it } from "vitest";
import { ConfigurationChangeSetSchema, type FieldDefinition } from "./configuration-operation";
import { validateConfigurationChangeSet, type ConfigurationValidationState } from "./validation";

const nameField:FieldDefinition={key:"name",label:"Name",type:"text",required:true,unique:false,options:[],validation:{},visibility:"visible",readOnly:false};
function state():ConfigurationValidationState{return{revision:2,plan:"growth",modules:new Map([
 ["products",{key:"products",enabled:true,dependencies:[],minimumPlan:"starter",configurationSchema:{properties:{},additionalProperties:false}}],
 ["inventory",{key:"inventory",enabled:false,dependencies:["products"],minimumPlan:"growth",configurationSchema:{properties:{},additionalProperties:false}}],
 ["multi_branch_only",{key:"multi_branch_only",enabled:false,dependencies:[],minimumPlan:"multi_branch",configurationSchema:{properties:{},additionalProperties:false}}],
]),objects:new Map([["customer",{key:"customer",fields:new Map([["name",nameField]]),views:new Set(),forms:new Set()}]]),workflows:new Set(),reports:new Set(),dashboardWidgets:new Map(),roles:new Set(["manager"]),permissions:new Set(["sales.read"]),entityKeys:new Set(["customer"]),reportSources:new Set(["sales","customer"])};}
const change=(operations:unknown[])=>ConfigurationChangeSetSchema.parse({id:"11111111-1111-4111-8111-111111111111",title:"Test",summary:"Safe test",operations});

describe("configuration proposal validation",()=>{
 it("simulates ordered changes and validates cross-operation references",()=>{const result=validateConfigurationChangeSet(state(),change([
  {operation:"add_object",object:{key:"project",singularLabel:"Project",pluralLabel:"Projects"}},
  {operation:"add_field",objectKey:"project",field:{key:"name",label:"Name",type:"text"}},
  {operation:"add_view",objectKey:"project",view:{key:"all",name:"All projects",configuration:{type:"table",selectedColumns:["name"]}}},
 ]));expect(result.checks).toEqual({schema:"passed",tenantAuthorization:"passed",dependencies:"passed",businessRules:"passed"});});
 it("requires module dependencies and plan eligibility",()=>{expect(()=>validateConfigurationChangeSet(state(),change([{operation:"enable_module",moduleKey:"inventory"}]))).not.toThrow();expect(()=>validateConfigurationChangeSet(state(),change([{operation:"enable_module",moduleKey:"multi_branch_only"}]))).toThrow(/multi_branch plan/);});
 it("prevents disabling a module while an enabled dependent remains",()=>{const value=state();const modules=new Map(value.modules);modules.set("inventory",{...modules.get("inventory")!,enabled:true});expect(()=>validateConfigurationChangeSet({...value,modules},change([{operation:"disable_module",moduleKey:"products"}]))).toThrow(/dependent module/);});
 it("rejects unknown fields in views, forms, and object-backed reports",()=>{expect(()=>validateConfigurationChangeSet(state(),change([{operation:"add_view",objectKey:"customer",view:{key:"bad",name:"Bad",configuration:{type:"table",selectedColumns:["secret"]}}}]))).toThrow(/unknown field/);expect(()=>validateConfigurationChangeSet(state(),change([{operation:"add_report",report:{key:"bad",name:"Bad",queryConfig:{provider:"core_report",source:"customer",groupBy:["secret"],metrics:[{key:"count",aggregation:"count",label:"Count"}]},visualizationConfig:{type:"table",format:"number"}}}]))).toThrow(/unknown field/);});
 it("validates role and permission references",()=>{expect(()=>validateConfigurationChangeSet(state(),change([{operation:"update_permission",roleKey:"manager",permissionKey:"admin.all",enabled:true}]))).toThrow(/Permission/);});
});
