import { describe, expect, it } from "vitest";

import { CONFIGURATION_OPERATIONS, ConfigurationOperationSchema } from "./configuration-operation";

describe("configuration operations", () => {
  it("accepts the contractor-name field proposal", () => {
    expect(ConfigurationOperationSchema.parse({
      operation: "add_field",
      objectKey: "quotation",
      field: { key: "contractor_name", label: "Contractor Name", type: "text" },
    })).toMatchObject({ operation: "add_field", objectKey: "quotation" });
  });

  it("rejects arbitrary code and SQL attached to an operation", () => {
    expect(() => ConfigurationOperationSchema.parse({
      operation: "add_field",
      objectKey: "quotation",
      field: { key: "contractor_name", label: "Contractor Name", type: "text" },
      sourceCode: "ALTER TABLE quotations ADD contractor_name text",
    })).toThrow();
  });

  it("supports the Object Builder field vocabulary", () => {
    expect(ConfigurationOperationSchema.parse({
      operation: "add_field",
      objectKey: "customer",
      field: {
        key: "status",
        label: "Status",
        type: "status",
        options: [{ value: "active", label: "Active" }],
        visibility: "visible",
        readOnly: false,
      },
    })).toMatchObject({ operation: "add_field", field: { type: "status" } });
  });

  it("exposes exactly the allow-listed DSL commands", () => {
    expect(CONFIGURATION_OPERATIONS).toHaveLength(15);
    expect(new Set(CONFIGURATION_OPERATIONS)).toEqual(new Set([
      "enable_module","disable_module","rename_entity","add_object","add_field","update_field","add_view","update_view","add_form","update_form","add_workflow","update_workflow","add_dashboard_widget","add_report","update_permission",
    ]));
  });

  it("accepts safe reports and rejects SQL, API, and executable payloads", () => {
    const report={operation:"add_report",report:{key:"sales_today",name:"Sales Today",queryConfig:{provider:"core_report",source:"sales",metrics:[{key:"total",aggregation:"sum",fieldKey:"total",label:"Total"}]},visualizationConfig:{type:"metric",format:"currency",currency:"PHP"}}};
    expect(ConfigurationOperationSchema.parse(report)).toMatchObject({operation:"add_report"});
    for(const unsafe of [{sql:"select * from users"},{apiUrl:"https://example.test"},{javascript:"eval(input)"}])expect(()=>ConfigurationOperationSchema.parse({...report,...unsafe})).toThrow();
  });

  it("accepts a declarative workflow but rejects an executable action property", () => {
    const workflow={operation:"add_workflow",workflow:{key:"follow_up",name:"Follow up",status:"active",configuration:{trigger:{type:"manual"},conditions:{logic:"all",conditions:[]},actions:[{key:"task",name:"Create task",type:"create_task",title:"Call customer"}],retryPolicy:{maxAttempts:2,backoffSeconds:60}}}};
    expect(ConfigurationOperationSchema.parse(workflow)).toMatchObject({operation:"add_workflow"});
    const unsafe=structuredClone(workflow) as typeof workflow&{workflow:{configuration:{actions:Array<Record<string,unknown>>}}};unsafe.workflow.configuration.actions[0]!.javascript="fetch('https://example.test')";
    expect(()=>ConfigurationOperationSchema.parse(unsafe)).toThrow();
  });

  it("keeps dashboard widgets inside the 12-column grid", () => {
    expect(()=>ConfigurationOperationSchema.parse({operation:"add_dashboard_widget",dashboardKey:"main",dashboardName:"Main",widget:{key:"sales",reportKey:"sales_today",title:"Sales",visualization:"metric",x:10,y:0,width:3,height:2}})).toThrow(/12-column/);
  });
});
