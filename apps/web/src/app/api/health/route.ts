import { handleApiRequest, successResponse } from "@negosyo-os/core/http";

export function GET(request: Request): Promise<Response> {
  return handleApiRequest(request, async ({ requestId }) =>
    successResponse({ status: "ok", service: "negosyo-os-web" }, requestId),
  );
}
