// ── Generic API wrappers ─────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ── Error types ───────────────────────────────────────────────────────────────

export interface ApiErrorBody {
  message: string;
  status: number;
  code?: string;
}

// ── Custom error classes ─────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "Unauthorized") {
    super(401, message, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = "Forbidden") {
    super(403, message, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends ApiError {
  constructor(message = "Not found") {
    super(404, message, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class ValidationError extends ApiError {
  constructor(message = "Validation failed") {
    super(422, message, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class NetworkError extends ApiError {
  constructor(message = "Network error — check your connection") {
    super(0, message, "NETWORK_ERROR");
    this.name = "NetworkError";
  }
}

// ── Error factory ────────────────────────────────────────────────────────────

export function mapHttpError(status: number, message: string): ApiError {
  switch (status) {
    case 401:
      return new UnauthorizedError(message);
    case 403:
      return new ForbiddenError(message);
    case 404:
      return new NotFoundError(message);
    case 422:
      return new ValidationError(message);
    default:
      return new ApiError(status, message);
  }
}
