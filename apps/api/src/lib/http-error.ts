/** Typed HTTP error carrying a stable machine-readable code. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message?: string,
    public readonly details?: unknown,
  ) {
    super(message ?? code);
    this.name = 'HttpError';
  }

  static badRequest(code = 'bad_request', details?: unknown) {
    return new HttpError(400, code, undefined, details);
  }
  static unauthorized(code = 'unauthorized') {
    return new HttpError(401, code);
  }
  static forbidden(code = 'forbidden', message?: string) {
    return new HttpError(403, code, message);
  }
  static notFound(code = 'not_found') {
    return new HttpError(404, code);
  }
  static conflict(code = 'conflict') {
    return new HttpError(409, code);
  }
  static tooMany(code = 'rate_limited') {
    return new HttpError(429, code);
  }
  static internal(code = 'internal_error') {
    return new HttpError(500, code);
  }
}
