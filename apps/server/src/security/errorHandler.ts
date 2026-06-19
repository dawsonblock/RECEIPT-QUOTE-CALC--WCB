/** Centralized error handling for Fastify routes. */

export function httpError(statusCode: number, message: string): Error & { statusCode: number } {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
}

export function notFound(message = "Not found"): Error & { statusCode: number } {
  return httpError(404, message);
}

export function badRequest(message: string): Error & { statusCode: number } {
  return httpError(400, message);
}
