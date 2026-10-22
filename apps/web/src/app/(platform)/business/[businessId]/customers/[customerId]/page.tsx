import Link from "next/link";

import { getCustomerProfile } from "@negosyo-os/crm/server";

import { CustomerNoteForm } from "../../../customer-profile-actions";

const money = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

export default async function CustomerProfilePage({ params }: { params: Promise<{ businessId: string; customerId: string }> }) {
  const { businessId, customerId } = await params;
  const profile = await getCustomerProfile(businessId, customerId);
  const customer = profile.customer;
  const address = [customer.address.street, customer.address.barangay, customer.address.cityMunicipality, customer.address.province, customer.address.postalCode].filter(Boolean).join(", ");
  const metrics = [
    ["Lifetime sales", money.format(customer.lifetimeSales)],
    ["Average transaction", money.format(customer.averageTransactionValue)],
    ["Transactions", String(customer.transactionCount)],
    ["Visits", String(customer.visitCount)],
    ["Outstanding", money.format(customer.outstandingBalance)],
    ["Loyalty points", String(customer.loyaltyPoints)],
  ];
  return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
    <Link className="text-sm text-primary hover:underline" href={`/business/${businessId}/customers`}>← Customers</Link>
    <div className="mt-4 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-semibold">{customer.name}</h1><a className="mt-2 block text-xl font-semibold text-primary" href={customer.mobile ? `tel:${customer.mobile}` : undefined}>{customer.mobile ?? "No mobile number"}</a><p className="mt-1 text-sm text-muted-foreground">{customer.email || "No email"} · {customer.branchName} · <span className="capitalize">{customer.customerType}</span></p></div><Link className="rounded-lg border px-4 py-2 text-sm font-semibold" href={`/business/${businessId}/customers/${customerId}/edit`}>Edit customer</Link></div>
    <div className="mt-5 flex flex-wrap gap-2">{customer.tags.map((tag) => <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold" key={tag}>{tag}</span>)}{profile.segments.map((segment) => <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary" key={segment.id}>{segment.name}</span>)}</div>
    <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">{metrics.map(([label, value]) => <div className="rounded-xl border bg-card p-4" key={label}><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p></div>)}</section>
    <section className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]"><div className="overflow-x-auto rounded-2xl border bg-card"><div className="border-b p-4"><h2 className="font-semibold">Purchase history</h2><p className="text-xs text-muted-foreground">Last purchase: {customer.lastPurchase ? new Date(customer.lastPurchase).toLocaleString("en-PH") : "None"}</p></div><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-muted"><tr><th className="p-3">Receipt</th><th className="p-3">Date</th><th className="p-3">Status</th><th className="p-3">Total</th></tr></thead><tbody>{profile.purchases.map((purchase) => <tr className="border-t" key={purchase.id}><td className="p-3 font-mono text-xs">{purchase.receiptNumber}</td><td className="p-3">{new Date(purchase.completedAt ?? purchase.createdAt).toLocaleString("en-PH")}</td><td className="p-3 capitalize">{purchase.status}</td><td className="p-3 font-semibold">{money.format(purchase.total)}</td></tr>)}{!profile.purchases.length ? <tr><td className="p-8 text-center text-muted-foreground" colSpan={4}>No purchases yet.</td></tr> : null}</tbody></table></div><aside className="space-y-4"><div className="rounded-xl border bg-card p-4"><h2 className="font-semibold">Customer details</h2><dl className="mt-3 space-y-2 text-sm"><div><dt className="text-muted-foreground">Address</dt><dd>{address || "Not provided"}</dd></div><div><dt className="text-muted-foreground">Company</dt><dd>{customer.company || "—"}</dd></div><div><dt className="text-muted-foreground">Birthdate</dt><dd>{customer.birthdate || "—"}</dd></div><div><dt className="text-muted-foreground">Profile notes</dt><dd className="whitespace-pre-wrap">{customer.notes || "—"}</dd></div></dl></div><Link className="block rounded-xl border bg-card p-4 hover:border-primary" href={`/business/${businessId}/loyalty`}><b>Manage loyalty</b><p className="mt-1 text-sm text-muted-foreground">Open balances, rules, redemptions, expiry, and point history.</p></Link></aside></section>
    <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_2fr]"><CustomerNoteForm businessId={businessId} customerId={customerId} /><div className="space-y-3">{profile.notes.map((note) => <article className="rounded-xl border bg-card p-4" key={note.id}><p className="whitespace-pre-wrap text-sm">{note.note}</p><time className="mt-2 block text-xs text-muted-foreground">{new Date(note.createdAt).toLocaleString("en-PH")}</time></article>)}{!profile.notes.length ? <p className="rounded-xl border p-6 text-sm text-muted-foreground">No interaction notes yet.</p> : null}</div></section>
  </main>;
}
