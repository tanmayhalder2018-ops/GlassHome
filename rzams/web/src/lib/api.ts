// Talks to the Apps Script web app (Api.gs). POST with text/plain avoids a CORS preflight.
export class ApiError extends Error {
  code: string;
  constructor(message: string, code = 'ERROR') { super(message); this.code = code; }
}

type Transport = (body: { action: string; token: string | null; data: unknown }) => Promise<unknown>;
declare global { interface Window { __RZAMS_TRANSPORT__?: Transport } }

const URL_KEY = 'rzams_api_url';
const TOKEN_KEY = 'rzams_token';

export function getApiUrl(): string {
  try { const v = localStorage.getItem(URL_KEY); if (v) return v; } catch { /* storage blocked */ }
  return (import.meta.env.VITE_API_URL as string | undefined) || '';
}
export function setApiUrl(url: string) { try { localStorage.setItem(URL_KEY, url.trim()); } catch { /* ignore */ } }
export function isValidApiUrl(url: string) { return /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url.trim()); }

export function getToken(): string | null { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } }
export function setToken(t: string | null) { try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } }

let onAuthLost: (() => void) | null = null;
export function setAuthLostHandler(fn: () => void) { onAuthLost = fn; }

async function send(action: string, data: unknown): Promise<unknown> {
  const body = { action, token: getToken(), data };
  if (window.__RZAMS_TRANSPORT__) return window.__RZAMS_TRANSPORT__(body);
  const url = getApiUrl();
  if (!url) throw new ApiError('The server address is not set. Add it on the login screen.', 'SETUP');
  let res: Response;
  try {
    res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow' });
  } catch {
    throw new ApiError('Could not reach the server. Check your internet connection and try again.', 'NETWORK');
  }
  if (!res.ok) throw new ApiError(`Server error (${res.status}). Please try again.`, 'NETWORK');
  try { return await res.json(); } catch { throw new ApiError('The server sent an unexpected response. Is the web app deployed with access "Anyone"?', 'NETWORK'); }
}

export async function api<T = Record<string, unknown>>(action: string, data: unknown = {}, opts: { retries?: number } = {}): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      const r = (await send(action, data)) as { ok: boolean; data?: T; error?: string; code?: string };
      if (!r || typeof r !== 'object') throw new ApiError('Empty response from server.', 'NETWORK');
      if (!r.ok) {
        const err = new ApiError(r.error || 'Request failed.', r.code || 'ERROR');
        if (err.code === 'AUTH' && onAuthLost) onAuthLost();
        throw err;
      }
      return r.data as T;
    } catch (e) {
      // only network failures are retried; callers that retry must be idempotent (payments send a requestId)
      if (e instanceof ApiError && e.code === 'NETWORK' && attempt < (opts.retries ?? 0)) { attempt++; await new Promise((r) => setTimeout(r, 800 * attempt)); continue; }
      throw e;
    }
  }
}

export function newRequestId() {
  return (crypto as Crypto & { randomUUID?: () => string }).randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
