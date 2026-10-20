/** fetch wrapper: JSON in/out, bearer token, FastAPI error details surfaced as ApiError. */

import { API_BASE } from '../config';
import { getToken } from './session';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, `Can't reach the server at ${API_BASE}. Is it running?`);
  }

  if (!res.ok) throw new ApiError(res.status, await errorMessage(res));
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const { detail } = (await res.json()) as { detail?: unknown };
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return 'The server rejected that input.';
  } catch {
    // Non-JSON body; fall through.
  }
  return `Request failed (${res.status})`;
}
