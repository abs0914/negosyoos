import Link from "next/link";
import { getBusinessOSPreview } from "@negosyo-os/templates/server";
import { Icon } from "@negosyo-os/ui";
import { TemplateInstallForm } from "../../../template-install-form";

const toolNames: Record<string, string> = { crm: 'Customers', pos: 'Point of sale', product_catalog: 'Product catalog', invoicing: 'Invoices' };
const outcomes: Record<string, string[]> = {
  'retail-store-os': ['Record counter sales and customer balances', 'Track stock and plan replenishment', 'Prepare quotations, invoices, and deliveries'],
  'food-restaurant-os': ['Manage your menu and counter sales', 'Track ingredients, purchasing, and wastage', 'Keep customer and employee records together'],
  'service-business-os': ['Organize bookings and customer relationships', 'Track service jobs and staff assignments', 'Manage sales, rewards, and operating expenses'],
};

export default async function TemplatePreviewPage({ params, searchParams }: {
  params: Promise<{ businessId: string; templateKey: string }>;
  searchParams: Promise<{ version?: string }>;
}) {
  const [{ businessId, templateKey }, query] = await Promise.all([params, searchParams]);
  const preview = await getBusinessOSPreview(businessId, templateKey, query.version);
  const { template } = preview;
  const definition = template.latestVersion.definition;
  const sameVersion = Boolean(template.installation && template.installation.installedVersion >= template.latestVersion.version);
  const label = sameVersion ? 'Already installed' : preview.hasOtherInstallation ? 'Another setup is installed' : preview.isUpdate ? 'Update business tools' : 'Activate these tools';
  return <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
    <header><Link className="text-sm font-semibold text-primary hover:underline" href={`/business/${businessId}/templates`}>← Compare business setups</Link><p className="design-label mt-6">Ready for your daily work</p><h1 className="mt-2">{template.name}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{template.description}</p></header>
    <div className="grid items-start gap-6 lg:grid-cols-[1.3fr_.7fr]">
      <section className="space-y-6">
        <article className="rounded-xl border bg-card p-6"><h2 className="text-xl font-semibold">What you can do</h2><ul className="mt-5 space-y-4">{(outcomes[templateKey] ?? [template.description]).map(outcome => <li className="flex items-start gap-3 text-sm leading-6" key={outcome}><Icon name="check" className="mt-1 shrink-0 text-primary" size={18}/>{outcome}</li>)}</ul></article>
        <article className="rounded-xl border bg-card p-6"><h2 className="text-xl font-semibold">Included tools</h2><p className="mt-2 text-sm text-muted-foreground">{definition.modules.length} tools in this setup.</p><ul className="mt-5 grid gap-3 sm:grid-cols-2">{definition.modules.map(module => <li className="flex items-center gap-3 rounded-lg bg-primary-soft p-3 text-sm font-semibold capitalize text-primary" key={module.key}><Icon name={module.key} size={18}/>{toolNames[module.key] ?? module.key.replaceAll('_', ' ')}</li>)}</ul></article>
      </section>
      <aside className="rounded-xl border border-primary/30 bg-card p-6"><p className="design-label">Before you activate</p><h2 className="mt-3 text-xl font-semibold capitalize">{template.minimumPlan} plan required</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Review your plan and access before activating. Your available plan determines which tools you can use.</p><Link className="mt-3 inline-block text-sm font-semibold text-primary underline underline-offset-4" href={`/business/${businessId}/billing`}>View plans and current access</Link><p className="mt-5 border-t pt-5 text-sm leading-6 text-muted-foreground">This sets up tools for this business. Updates preserve your existing records and customizations.</p><div className="mt-5"><TemplateInstallForm businessId={businessId} disabled={sameVersion || preview.hasOtherInstallation} label={label} versionId={template.latestVersion.id}/></div></aside>
    </div>
    <details className="rounded-xl border bg-card p-6"><summary className="cursor-pointer font-semibold">Setup details and version history</summary><div className="mt-6 space-y-6">
      <p className="text-sm text-muted-foreground">Version {template.latestVersion.version}</p>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">{Object.entries(preview.counts).filter(([, value]) => value > 0).map(([key, value]) => <div key={key}><dt className="text-xs capitalize text-muted-foreground">{key}</dt><dd className="font-semibold">{value}</dd></div>)}</dl>
      {Object.keys(definition.terminology).length ? <section><h2 className="font-semibold">Names used in your workspace</h2><dl className="mt-3 grid gap-3 sm:grid-cols-2">{Object.entries(definition.terminology).map(([key,value]) => <div key={key}><dt className="text-xs capitalize text-muted-foreground">{key.replaceAll('_',' ')}</dt><dd className="text-sm">{value}</dd></div>)}</dl></section> : null}
      {definition.objects.length ? <section><h2 className="font-semibold">Custom records</h2>{definition.objects.map(object => <div className="mt-3 text-sm" key={object.key}><b>{object.pluralLabel}</b><p>{object.description}</p><p>{object.fields.length} fields · {object.forms.length} forms · {object.views.length} views</p></div>)}</section> : null}
      <section><h2 className="font-semibold">Version history</h2><div className="mt-3 space-y-2">{template.versions.map(version => <Link className="block rounded-lg border p-3 text-sm hover:border-primary" href={`?version=${version.id}`} key={version.id}><b>v{version.version}</b><span className="ml-2 text-muted-foreground">{version.changeSummary}</span></Link>)}</div></section>
    </div></details>
  </main>;
}
