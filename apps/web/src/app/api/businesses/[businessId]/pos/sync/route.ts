import { handleApiRequest, successResponse } from "@negosyo-os/core/http";
import { syncPosCommands } from "@negosyo-os/pos-sync/server";

export async function POST(request: Request, context: RouteContext<"/api/businesses/[businessId]/pos/sync">) {
  return handleApiRequest(request, async ({ requestId }) => {
    const { businessId } = await context.params;
    return successResponse(await syncPosCommands(businessId, await request.json()), requestId);
  });
}
