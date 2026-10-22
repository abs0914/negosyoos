import { requireAuthenticatedUser } from "@negosyo-os/auth";
import { handleApiRequest, successResponse } from "@negosyo-os/core/http";

export function GET(request: Request): Promise<Response> {
  return handleApiRequest(request, async ({ requestId }) => {
    const user = await requireAuthenticatedUser();
    return successResponse({ user }, requestId);
  });
}
