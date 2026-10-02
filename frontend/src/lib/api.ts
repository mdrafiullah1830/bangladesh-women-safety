import type { AuthResult } from "../types";
import {
  clearSession,
  getAccessToken,
  getInstallationId,
  getRefreshToken,
  persistSession,
} from "./session";

/** Same-origin by default (the backend hosts the SPA in production). */
const BASE = import.meta.env.VITE_API_BASE_URL || "";

export class ApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(status: number, payload: unknown) {
    const detail =
      payload && typeof payload === "object"
        ? (payload as Record<string, unknown>).message ??
          (payload as Record<string, unknown>).error ??
          (payload as Record<string, unknown>).title
        : undefined;
    super(typeof detail === "string" && detail ? detail : `Request failed (${status})`);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

let unauthorizedHandler: (() => void) | null = null;

/** Registered by the auth layer so a dead session can redirect to /login. */
export function onUnauthorized(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

function buildHeaders(token: string | null, extra?: Record<string, string>): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Installation-Id": getInstallationId(),
    ...(extra || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function execute(path: string, opts: ApiOptions, token: string | null): Promise<Response> {
  return fetch(BASE + path, {
    method: opts.method || "GET",
    headers: buildHeaders(token, opts.headers),
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    signal: opts.signal,
  });
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const response = await fetch(`${BASE}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) return false;
    const result = (await response.json()) as AuthResult;
    if (!result.tokens?.accessToken) return false;
    persistSession(result.tokens.accessToken, result.tokens.refreshToken, result.user ?? undefined);
    return true;
  } catch {
    return false;
  }
}

/**
 * Typed fetch wrapper: injects the bearer token + installation id, transparently refreshes
 * an expired access token once, and throws {@link ApiError} for non-2xx responses.
 */
export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  let response = await execute(path, opts, getAccessToken());

  if (response.status === 401 && getRefreshToken() && !path.startsWith("/api/auth/")) {
    if (await refreshAccessToken()) {
      response = await execute(path, opts, getAccessToken());
    } else {
      clearSession();
      unauthorizedHandler?.();
      throw new ApiError(401, { message: "Session expired — please sign in again." });
    }
  }

  if (response.status === 204) return null as T;

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) throw new ApiError(response.status, data);
  return data as T;
}

export const http = {
  get: <T>(path: string, opts?: Omit<ApiOptions, "method" | "body">) => api<T>(path, opts),
  post: <T>(path: string, body?: unknown, opts?: Omit<ApiOptions, "method" | "body">) =>
    api<T>(path, { ...opts, method: "POST", body }),
  put: <T>(path: string, body?: unknown, opts?: Omit<ApiOptions, "method" | "body">) =>
    api<T>(path, { ...opts, method: "PUT", body }),
  del: <T>(path: string, opts?: Omit<ApiOptions, "method" | "body">) =>
    api<T>(path, { ...opts, method: "DELETE" }),
};

/** Builds a `?a=b&c=d` query string, skipping null/undefined/empty values. */
export function qs(params: Record<string, string | number | boolean | null | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}