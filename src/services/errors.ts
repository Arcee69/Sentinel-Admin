import { isAxiosError } from "axios";

/** Error envelope: `{success:false, message, error:{code,details}, request_id}`. */
interface ErrorEnvelope {
  success?: false;
  message?: string;
  error?: { code?: string; details?: unknown };
  request_id?: string;
  /** Laravel's default validation shape, in case a route bypasses the envelope. */
  errors?: Record<string, string[]>;
}

export type FieldErrors = Record<string, string>;

/**
 * Every failed request is normalised to this, so screens can branch on
 * `status` without knowing about axios.
 */
export class ApiError extends Error {
  status: number;
  code: string | null;
  details: unknown;
  requestId: string | null;
  /** Seconds to wait before retrying, from `Retry-After` on a 429. */
  retryAfter: number | null;

  constructor(init: {
    message: string;
    status: number;
    code?: string | null;
    details?: unknown;
    requestId?: string | null;
    retryAfter?: number | null;
  }) {
    super(init.message);
    this.name = "ApiError";
    this.status = init.status;
    this.code = init.code ?? null;
    this.details = init.details;
    this.requestId = init.requestId ?? null;
    this.retryAfter = init.retryAfter ?? null;
  }

  get isUnauthorized() {
    return this.status === 401;
  }
  get isForbidden() {
    return this.status === 403;
  }
  get isConflict() {
    return this.status === 409;
  }
  get isValidation() {
    return this.status === 422;
  }
  get isRateLimited() {
    return this.status === 429;
  }
  get isNetwork() {
    return this.status === 0;
  }

  /** 422 details flattened to the first message per field, for inline display. */
  get fieldErrors(): FieldErrors {
    const source = this.details;
    if (!source || typeof source !== "object") return {};
    const out: FieldErrors = {};
    for (const [field, value] of Object.entries(source as Record<string, unknown>)) {
      const first = Array.isArray(value) ? value[0] : value;
      if (typeof first === "string") out[field] = first;
    }
    return out;
  }
}

const STATUS_FALLBACK: Record<number, string> = {
  401: "Your session has ended. Sign in again.",
  403: "You don't have permission to do that.",
  404: "That record could not be found.",
  409: "This record changed since you loaded it. Reload and try again.",
  422: "Some fields need attention.",
  429: "Too many requests. Wait a moment and try again.",
};

export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;

  if (isAxiosError<ErrorEnvelope>(err)) {
    if (!err.response) {
      const timedOut = err.code === "ECONNABORTED" || err.code === "ETIMEDOUT";
      return new ApiError({
        status: 0,
        code: timedOut ? "timeout" : "network",
        message: timedOut
          ? "The server took too long to respond. Try again."
          : "Can't reach the Sentinel API. Check your connection.",
      });
    }

    const { status, data, headers } = err.response;
    const body = (data && typeof data === "object" ? data : {}) as ErrorEnvelope;
    const retryHeader = Number(headers?.["retry-after"]);

    return new ApiError({
      status,
      message: body.message || STATUS_FALLBACK[status] || "Something went wrong. Try again.",
      code: body.error?.code ?? null,
      details: body.error?.details ?? body.errors,
      requestId: body.request_id ?? null,
      retryAfter: Number.isFinite(retryHeader) ? retryHeader : null,
    });
  }

  return new ApiError({
    status: -1,
    message: err instanceof Error ? err.message : "Something went wrong. Try again.",
  });
}

/** User-facing message for any thrown value. */
export function errorMessage(err: unknown): string {
  const e = toApiError(err);
  if (e.isRateLimited && e.retryAfter) {
    return `Too many requests. Try again in ${e.retryAfter}s.`;
  }
  return e.message;
}
