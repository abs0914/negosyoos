import { AuditSourceSchema } from "@negosyo-os/audit";
import { exportAuditEventsCsv } from "@negosyo-os/audit/server";

function date(value: string | null, end = false) { return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T${end ? "23:59:59.999" : "00:00:00.000"}+08:00` : undefined; }

export async function GET(request: Request, context: RouteContext<"/business/[businessId]/audit/export">) {
  const { businessId } = await context.params;
  const query = new URL(request.url).searchParams;
  const source = AuditSourceSchema.safeParse(query.get("source"));
  const csv = await exportAuditEventsCsv(businessId, {
    ...(source.success ? { source: source.data } : {}),
    ...(query.get("branch") ? { branchId: query.get("branch")! } : {}),
    ...(query.get("user") ? { userId: query.get("user")! } : {}),
    ...(query.get("entity") ? { entity: query.get("entity")! } : {}),
    ...(query.get("action") ? { action: query.get("action")! } : {}),
    ...(query.get("q") ? { search: query.get("q")! } : {}),
    ...(date(query.get("from")) ? { from: date(query.get("from")) } : {}),
    ...(date(query.get("to"), true) ? { to: date(query.get("to"), true) } : {}),
  });
  return new Response(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="negosyoos-audit-${new Date().toISOString().slice(0,10)}.csv"`, "cache-control": "private, no-store" } });
}
