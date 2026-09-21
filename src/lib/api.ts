// ─── API client ── auto-refreshes access tokens ─────────────────────────────

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'https://vyasa-os-backend.onrender.com';

// Ping backend on load so Render free-tier warms up before first login attempt
fetch(`${BASE}/health`).catch(() => {});

let accessToken = localStorage.getItem('vyasa_access_token') ?? '';
let refreshToken = localStorage.getItem('vyasa_refresh_token') ?? '';

export function setTokens(at: string, rt: string) {
  accessToken = at;
  refreshToken = rt;
  localStorage.setItem('vyasa_access_token', at);
  localStorage.setItem('vyasa_refresh_token', rt);
}

export function clearTokens() {
  accessToken = '';
  refreshToken = '';
  localStorage.removeItem('vyasa_access_token');
  localStorage.removeItem('vyasa_refresh_token');
}

export function getAccessToken() { return accessToken; }

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) { clearTokens(); return false; }
    const data = await res.json() as { accessToken: string };
    accessToken = data.accessToken;
    localStorage.setItem('vyasa_access_token', accessToken);
    return true;
  } catch {
    return false;
  }
}

export async function apiFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const makeReq = (token: string) => fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
    body: init.body ? (typeof init.body === 'string' ? init.body : JSON.stringify(init.body)) : undefined,
  });

  let res = await makeReq(accessToken);

  // Token expired — refresh and retry once
  if (res.status === 401 && refreshToken) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      res = await makeReq(accessToken);
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }

  // Handle 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Convenience methods ──────────────────────────────────────────────────────

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};

export const isApiEnabled = () => Boolean(accessToken);

// Fire-and-forget event tracking — implemented in lib/analytics (auto-tags
// user/session/path, batches, captures errors). Re-exported for compatibility.
export { trackEvent, trackPageView, trackError, installAnalytics } from './analytics';
