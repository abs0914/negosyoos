import { AppError, ERROR_CODES } from "@negosyo-os/core/errors";
import { handleApiRequest, successResponse } from "@negosyo-os/core/http";
import { getPosCatalogSnapshot } from "@negosyo-os/pos-sync/server";

export async function GET(request: Request, context: RouteContext<"/api/businesses/[businessId]/pos/catalog">) {
  return handleApiRequest(request, async ({ requestId }) => {
    const { businessId } = await context.params;
    const query = new URL(request.url).searchParams;
    const locationId = query.get("locationId");
    if (!locationId) throw new AppError({ code: ERROR_CODES.validationFailed, message: "Inventory location is required.", status: 422 });
    return successResponse(await getPosCatalogSnapshot(businessId, locationId, query.get("revision") ?? undefined), requestId);
  });
}
