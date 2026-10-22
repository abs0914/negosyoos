import Link from "next/link";

import { listBranches } from "@negosyo-os/business/server";
import { listCustomers, listCustomerSegments } from "@negosyo-os/crm/server";

const money = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

export default async function CustomersPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ q?: string; branchId?: string; customerType?: string; tag?: string; segmentId?: string }>;
}) {
  const { businessId } = await params;
  const query = await searchParams;
  const [customers, segments, branches] = await Promise.all([
    listCustomers(businessId, {
      ...(query.q ? { search: query.q } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.customerType ? { customerType: query.customerType } : {}),
      ...(query.tag ? { tag: query.tag } : {}),
      ...(query.segmentId ? { segmentId: query.segmentId } : {}),
    }),
    listCustomerSegments(businessId),
    listBranches(businessId),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">CRM</p>
          <h1 className="mt-1 text-3xl font-semibold">Customers</h1>
          <p className="mt-2 text-muted-foreground">Customer relationships, sales history, and loyalty in one place.</p>
        </div>
        <div className="flex gap-2">
          <Link className="rounded-lg border px-4 py-2 text-sm font-semibold" href={`/business/${businessId}/customers/segments`}>Segments</Link>
          <Link className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" href={`/business/${businessId}/customers/new`}>New customer</Link>
        </div>
      </div>

      <form className="mt-6 grid gap-2 rounded-2xl border bg-card p-4 md:grid-cols-[2fr_repeat(4,1fr)_auto]">
        <input className="min-h-11 rounded-lg border px-3" defaultValue={query.q} name="q" placeholder="Name, mobile, email, company, or tag" />
        <select className="min-h-11 rounded-lg border px-3" defaultValue={query.branchId} name="branchId"><option value="">All branches</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select>
        <select className="min-h-11 rounded-lg border px-3" defaultValue={query.customerType} name="customerType"><option value="">All types</option><option value="retail">Retail</option><option value="wholesale">Wholesale</option><option value="corporate">Corporate</option><option value="vip">VIP</option><option value="other">Other</option></select>
        <select className="min-h-11 rounded-lg border px-3" defaultValue={query.segmentId} name="segmentId"><option value="">All segments</option>{segments.map((segment) => <option key={segment.id} value={segment.id}>{segment.name}</option>)}</select>
        <input className="min-h-11 rounded-lg border px-3" defaultValue={query.tag} name="tag" placeholder="Tag" />
        <button className="min-h-11 rounded-lg border px-4 font-semibold">Search</button>
      </form>

      <div className="mt-5 overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-muted"><tr><th className="p-3">Customer</th><th className="p-3">Mobile</th><th className="p-3">Branch / type</th><th className="p-3">Transactions</th><th className="p-3">Lifetime sales</th><th className="p-3">Last purchase</th><th className="p-3">Balance</th></tr></thead>
          <tbody>
            {customers.map((customer) => <tr className="border-t" key={customer.id}>
              <td className="p-3"><Link className="font-semibold text-primary hover:underline" href={`/business/${businessId}/customers/${customer.id}`}>{customer.name}</Link><p className="mt-1 text-xs text-muted-foreground">{customer.tags.join(" · ") || customer.email || "No tags"}</p></td>
              <td className="p-3 text-base font-semibold"><a href={customer.mobile ? `tel:${customer.mobile}` : undefined}>{customer.mobile ?? "—"}</a></td>
              <td className="p-3">{customer.branchName}<br /><span className="text-xs capitalize text-muted-foreground">{customer.customerType}</span></td>
              <td className="p-3">{customer.transactionCount}</td>
              <td className="p-3 font-semibold">{money.format(customer.lifetimeSales)}</td>
              <td className="p-3">{customer.lastPurchase ? new Date(customer.lastPurchase).toLocaleDateString("en-PH") : "—"}</td>
              <td className="p-3">{money.format(customer.outstandingBalance)}</td>
            </tr>)}
            {!customers.length ? <tr><td className="p-10 text-center text-muted-foreground" colSpan={7}>No customers matched your filters.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
