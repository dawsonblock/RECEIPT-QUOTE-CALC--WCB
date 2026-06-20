interface RequestOptions extends RequestInit {
  expectedStatus?: number;
}

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers =
    options.body instanceof FormData
      ? options.headers
      : { "Content-Type": "application/json", ...(options.headers ?? {}) };

  const response = await fetch(path, {
    headers,
    ...options,
  });

  const text = await response.text();
  const data = text.length > 0 ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    throw new ApiError(response.status, (data as { message?: string } | null)?.message ?? response.statusText, data);
  }

  return data as T;
}

export function apiPath(path: string): string {
  return path.startsWith("/api") ? path : `/api${path}`;
}
