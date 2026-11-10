import { listBranches } from "@negosyo-os/business/server";
import { listCatalogProducts } from "@negosyo-os/catalog/server";
import { getInventoryDashboard, listInventoryLocations, listInventoryOverview } from "@negosyo-os/inventory/server";
import { EmptyState, Icon, PageHeader, StatCard } from "@negosyo-os/ui";

import { InventoryOperations } from "../../inventory-operations";

const money = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

export default async function InventoryPage({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  const [dashboard, overview, locations, products, branches] = await Promise.all([
    getInventoryDashboard(businessId),
    listInventoryOverview(businessId),
    listInventoryLocations(businessId),
    listCatalogProducts(businessId),
    listBranches(businessId),
  ]);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader eyebrow="Inventory" title="Stock control" description="Check stock levels by location, record changes, and review recent movements." />
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Inventory value" value={money.format(dashboard.currentInventoryValue)} />
        <StatCard label="Low stock" tone={dashboard.lowStockCount ? "warning" : "neutral"} value={dashboard.lowStockCount} />
        <StatCard label="Out of stock" tone={dashboard.outOfStockCount ? "warning" : "neutral"} value={dashboard.outOfStockCount} />
        <StatCard label="Slow moving" tone="neutral" value={dashboard.slowMovingCount} />
      </div>
      <InventoryOperations branches={branches} businessId={businessId} locations={locations} overview={overview} products={products} />
      <section aria-labelledby="stock-levels" className="mt-8">
        <h2 className="mb-3 text-xl font-semibold tracking-tight" id="stock-levels">Stock by location</h2>
        {overview.length ? (
          <div aria-labelledby="stock-levels" className="overflow-x-auto rounded-xl border bg-card" role="region" tabIndex={0}>
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-muted">
                <tr><th className="p-3" scope="col">Product / SKU</th><th className="p-3" scope="col">Location</th><th className="p-3 text-right" scope="col">On hand</th><th className="p-3 text-right" scope="col">Average cost</th><th className="p-3 text-right" scope="col">Value</th><th className="p-3 text-right" scope="col">Reorder</th></tr>
              </thead>
              <tbody>
                {overview.map((row) => (
                  <tr className="border-t" key={`${row.item.id}-${row.location.id}`}>
                    <td className="p-3"><b>{row.item.productName}</b><br /><span className="font-mono text-xs text-muted-foreground">{row.item.sku}</span></td>
                    <td className="p-3">{row.location.name}</td>
                    <td className="p-3 text-right font-semibold tabular-nums">{row.balance?.quantity ?? 0}</td>
                    <td className="p-3 text-right tabular-nums">{money.format(row.balance?.averageUnitCost ?? 0)}</td>
                    <td className="p-3 text-right tabular-nums">{money.format(row.balance?.inventoryValue ?? 0)}</td>
                    <td className="p-3 text-right tabular-nums">{row.item.reorderLevel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState icon={<Icon name="inventory" size={22} />} title="No stock records" description="Stock records will appear here once items are tracked at a location." />}
      </section>
      <section aria-labelledby="stock-movements" className="mt-8">
        <h2 className="mb-3 text-xl font-semibold tracking-tight" id="stock-movements">Recent stock movements</h2>
        {dashboard.recentMovements.length ? (
          <ul className="divide-y rounded-xl border bg-card">
            {dashboard.recentMovements.map((movement) => (
              <li className="flex justify-between gap-3 px-4 py-3 text-sm" key={movement.id}>
                <span className="capitalize">{movement.movementType.replace("_", " ")}</span>
                <span className={movement.quantityDelta < 0 ? "text-destructive" : "text-primary"}>{movement.quantityDelta > 0 ? "+" : ""}{movement.quantityDelta} → {movement.balanceAfter}</span>
              </li>
            ))}
          </ul>
        ) : <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">No stock movements recorded yet.</p>}
      </section>
    </main>
  );
}
