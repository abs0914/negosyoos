export const ERROR_CODES = {
  authenticationRequired: "AUTHENTICATION_REQUIRED",
  permissionDenied: "PERMISSION_DENIED",
  resourceNotFound: "RESOURCE_NOT_FOUND",
  validationFailed: "VALIDATION_FAILED",
  conflict: "CONFLICT",
  internal: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

interface AppErrorOptions {
  code: ErrorCode;
  message: string;
  status: number;
  details?: unknown;
  cause?: unknown;
  expose?: boolean;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;
  readonly expose: boolean;

  constructor(options: AppErrorOptions) {
    super(options.message, { cause: options.cause });
    this.name = "AppError";
    this.code = options.code;
    this.status = options.status;
    this.details = options.details;
    this.expose = options.expose ?? options.status < 500;
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  return new AppError({
    code: ERROR_CODES.internal,
    message: "An unexpected error occurred.",
    status: 500,
    cause: error,
    expose: false,
  });
}
