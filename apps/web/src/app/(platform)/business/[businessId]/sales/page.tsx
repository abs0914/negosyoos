import Link from "next/link";
import { getSalesDashboard } from "@negosyo-os/sales/server";
import { EmptyState, Icon, PageHeader, StatCard } from "@negosyo-os/ui";

const money = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

export default async function SalesPage({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  const dashboard = await getSalesDashboard(businessId);
  const base = `/business/${businessId}`;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Sales"
        title="Transactions"
        description="Review today’s receipts and open recent sales."
        actions={<Link className="site-button" href={`${base}/pos`}><Icon name="sales" size={17} /> Open POS</Link>}
      />
      <div className="mt-6 grid gap-3 min-[480px]:grid-cols-3">
        <StatCard icon={<Icon name="sales" size={18} />} label="Today’s receipt totals" tone="success" value={money.format(dashboard.todaySales)} />
        <StatCard icon={<Icon name="activity" size={18} />} label="Transactions" value={dashboard.todayTransactions} />
        <StatCard icon={<Icon name="reports" size={18} />} label="Average sale" value={money.format(dashboard.averageSale)} />
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">Totals cover accessible receipts completed today in Philippine time, including tax and before returns and refunds. These totals differ from net sales, profit, and cash collected.</p>
      <section aria-labelledby="recent-transactions" className="mt-8">
        <h2 className="mb-3 text-xl font-semibold tracking-tight" id="recent-transactions">Recent transactions</h2>
        {dashboard.recentSales.length ? (
          <div aria-labelledby="recent-transactions" className="overflow-x-auto rounded-xl border bg-card" role="region" tabIndex={0}>
            <table className="w-full min-w-[620px] text-left text-sm">
              <caption className="sr-only">Up to 20 recent transactions</caption>
              <thead className="bg-muted">
                <tr><th className="p-3" scope="col">Receipt</th><th className="p-3" scope="col">Date</th><th className="p-3" scope="col">Status</th><th className="p-3 text-right" scope="col">Total</th><th className="p-3 text-right" scope="col">Paid</th></tr>
              </thead>
              <tbody>
                {dashboard.recentSales.map((sale) => (
                  <tr className="border-t" key={sale.id}>
                    <td className="p-3"><Link className="font-mono font-semibold text-primary hover:underline" href={`${base}/sales/${sale.id}`}>{sale.receiptNumber}</Link></td>
                    <td className="p-3">{new Date(sale.createdAt).toLocaleString("en-PH")}</td>
                    <td className="p-3 capitalize">{sale.status.replace("_", " ")}</td>
                    <td className="p-3 text-right tabular-nums">{money.format(sale.total)}</td>
                    <td className="p-3 text-right tabular-nums">{money.format(sale.amountPaid)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState icon={<Icon name="sales" size={22} />} title="No recent transactions" description="Recent receipts will appear here after sales are recorded." />}
      </section>
    </main>
  );
}
