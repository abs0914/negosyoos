import Link from "next/link";
import { getObjectByKey, listObjectDefinitions } from "@negosyo-os/objects/server";
import { WorkflowDesigner } from "@/app/(platform)/business/workflow-designer";
import { saveWorkflowAction } from "@/app/(platform)/business/workflow-actions";

export default async function NewWorkflowPage({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params; const definitions = await listObjectDefinitions(businessId); const objects = await Promise.all(definitions.map(async (definition) => { const object = await getObjectByKey(businessId, definition.key); return { id: definition.id, name: definition.pluralLabel, fields: object.fields.filter((field) => field.status === "active").map((field) => ({ key: field.key, label: field.label, type: field.type })) }; }));
  return <main className="mx-auto w-full max-w-7xl px-6 py-12"><Link className="text-sm font-medium text-primary hover:underline" href={`/business/${businessId}/workflows`}>← Workflows</Link><h1 className="mt-5 text-3xl font-semibold">New workflow</h1><p className="mt-2 text-muted-foreground">Build a safe business automation from declarative blocks.</p><WorkflowDesigner action={saveWorkflowAction.bind(null, businessId, undefined)} objects={objects} /></main>;
}
