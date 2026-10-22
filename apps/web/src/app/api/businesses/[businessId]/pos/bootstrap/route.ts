import { handleApiRequest, successResponse } from "@negosyo-os/core/http";
import { bootstrapPosRegister } from "@negosyo-os/pos-sync/server";

export async function POST(request: Request, context: RouteContext<"/api/businesses/[businessId]/pos/bootstrap">) {
  return handleApiRequest(request, async ({ requestId }) => {
    const { businessId } = await context.params;
    return successResponse(await bootstrapPosRegister(businessId, await request.json()), requestId);
  });
}
