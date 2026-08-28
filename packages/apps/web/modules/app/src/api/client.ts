const API_URL = import.meta.env.VITE_API_URL || '';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  token: string;
}

/**
 * Minimal fetch wrapper for the StockFlow Products API (WebiAI cloud.core
 * `Products@Api`). Prepends VITE_API_URL, attaches the Cognito id token as a
 * Bearer credential (the API Gateway HTTP API enforces a Cognito JWT
 * authorizer), and normalizes error responses into ApiError.
 */
export async function apiFetch<T>(path: string, opts: RequestOptions): Promise<T> {
  if (!API_URL) {
    throw new ApiError(0, 'VITE_API_URL is not configured');
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${opts.token}`,
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    const message = data?.message || data?.error || `Request failed (${res.status})`;
    throw new ApiError(res.status, message, data?.details);
  }

  return data as T;
}
