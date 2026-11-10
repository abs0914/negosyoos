import { notFound } from "next/navigation";
import { requireTenantContext } from "@negosyo-os/business/tenant-context";
import { worldEnabled } from "@/features/business-world/flag";
import { WorldView } from "@/features/business-world/world-view";
import "@/features/business-world/world.css";
export default async function WorldPage({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  await requireTenantContext(businessId);
  if (!worldEnabled(businessId)) notFound();
  return <WorldView businessId={businessId} />;
}
