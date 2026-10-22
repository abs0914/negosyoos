import { describe, expect, it } from "vitest";

import { AppError, ERROR_CODES } from "../errors/app-error";
import { errorResponse, successResponse } from "./api-response";

describe("API responses", () => {
  it("returns a stable success envelope and request ID", async () => {
    const response = successResponse({ value: 42 }, "request-1");

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBe("request-1");
    expect(await response.json()).toEqual({
      ok: true,
      data: { value: 42 },
      meta: { requestId: "request-1" },
    });
  });

  it("exposes expected errors", async () => {
    const response = errorResponse(
      new AppError({
        code: ERROR_CODES.permissionDenied,
        message: "Not allowed.",
        status: 403,
      }),
      "request-2",
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: ERROR_CODES.permissionDenied, message: "Not allowed." },
    });
  });

  it("does not leak unexpected exception details", async () => {
    const response = errorResponse(new Error("database password leaked"), "request-3");
    const body = await response.text();

    expect(response.status).toBe(500);
    expect(body).not.toContain("database password leaked");
  });
});
