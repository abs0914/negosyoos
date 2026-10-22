import { ZodError } from "zod";

import { AppError, ERROR_CODES, toAppError, type ErrorCode } from "../errors/app-error";
import { logger } from "../logging/logger";

interface ResponseMeta {
  requestId: string;
}

export interface ApiSuccess<T> {
  ok: true;
  data: T;
  meta: ResponseMeta;
}

export interface ApiFailure {
  ok: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
  meta: ResponseMeta;
}

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export function successResponse<T>(
  data: T,
  requestId: string,
  init: ResponseInit = {},
): Response {
  return Response.json(
    { ok: true, data, meta: { requestId } } satisfies ApiSuccess<T>,
    { ...init, headers: responseHeaders(requestId, init.headers) },
  );
}

export function errorResponse(error: unknown, requestId: string): Response {
  const appError = normalizeApiError(error);
  const message = appError.expose ? appError.message : "An unexpected error occurred.";
  const details = appError.expose ? appError.details : undefined;
  const payload: ApiFailure = {
    ok: false,
    error: {
      code: appError.code,
      message,
      ...(details === undefined ? {} : { details }),
    },
    meta: { requestId },
  };

  return Response.json(payload, {
    status: appError.status,
    headers: responseHeaders(requestId),
  });
}

export async function handleApiRequest(
  request: Request,
  handler: (context: { requestId: string }) => Promise<Response>,
): Promise<Response> {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  try {
    return await handler({ requestId });
  } catch (error) {
    logger.error("API request failed", error, {
      requestId,
      method: request.method,
      pathname: new URL(request.url).pathname,
    });
    return errorResponse(error, requestId);
  }
}

function normalizeApiError(error: unknown): AppError {
  if (error instanceof ZodError) {
    return new AppError({
      code: ERROR_CODES.validationFailed,
      message: "The request is invalid.",
      status: 422,
      details: error.flatten(),
    });
  }

  return toAppError(error);
}

function responseHeaders(requestId: string, initial?: HeadersInit): Headers {
  const headers = new Headers(initial);
  headers.set("x-request-id", requestId);
  headers.set("cache-control", "no-store");
  return headers;
}
