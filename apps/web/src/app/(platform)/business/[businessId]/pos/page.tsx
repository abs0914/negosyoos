import { listBranches } from "@negosyo-os/business/server";
import { listInventoryLocations } from "@negosyo-os/inventory/server";
import { getPosCatalogSnapshot } from "@negosyo-os/pos-sync/server";
import { listSalesCustomers } from "@negosyo-os/sales/server";
import { PosRegister } from "../../pos-register";

export default async function PosPage({ params, searchParams }: { params: Promise<{ businessId: string }>; searchParams: Promise<{ location?: string }> }) {
  const { businessId } = await params;
  const query = await searchParams;
  const [locations, branches, customers] = await Promise.all([listInventoryLocations(businessId), listBranches(businessId), listSalesCustomers(businessId)]);
  const selected = locations.find((location) => location.id === query.location) ?? locations[0];
  if (!selected) return <main className="p-8"><h1 className="text-2xl font-semibold">POS needs an inventory location</h1><p className="mt-2 text-muted-foreground">Activate Inventory and create a location first.</p></main>;
  const [snapshot, branch] = await Promise.all([getPosCatalogSnapshot(businessId, selected.id), Promise.resolve(branches.find((item) => item.id === selected.branchId))]);
  return <><div className="border-b bg-card px-4 py-2 text-xs text-muted-foreground">Register: <b className="text-foreground">{branch?.name} · {selected.name}</b></div><PosRegister branchCode={branch?.code ?? "BRANCH"} branchId={selected.branchId} businessId={businessId} catalog={snapshot.items} catalogRevision={snapshot.revision} customers={customers} locationId={selected.id}/></>;
}
