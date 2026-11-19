import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api, ApiError, getToken, setAuthLostHandler, setToken } from './api';
import type { ApiResult, AppData, CollectionName, User } from './types';

const KEYS: Record<CollectionName, (x: any) => string> = {
  students: (x) => x.id, courses: (x) => x.id, batches: (x) => x.id, teachers: (x) => x.id, classes: (x) => x.id,
  attendance: (x) => `${x.date}|${x.studentId}`, fees: (x) => `${x.studentId}|${x.month}`, payments: (x) => x.id,
  pending: (x) => `${x.studentId}|${x.month}`, reminders: (x) => x.id, expenses: (x) => x.id,
  studio: (x) => String(x.row), tasks: (x) => String(x.row), users: (x) => x.username,
};

export function applyResult(data: AppData, r: ApiResult): AppData {
  const next = { ...data } as AppData & Record<string, unknown[]>;
  const n = next as unknown as Record<CollectionName, unknown[]>;
  if (r.replace) for (const [k, v] of Object.entries(r.replace)) n[k as CollectionName] = v as unknown[];
  if (r.delta) for (const [k, items] of Object.entries(r.delta)) {
    const key = KEYS[k as CollectionName]; if (!key || !items) continue;
    const map = new Map(n[k as CollectionName].map((x) => [key(x), x]));
    for (const it of items) map.set(key(it), it);
    n[k as CollectionName] = Array.from(map.values());
  }
  if (r.removed) for (const [k, ids] of Object.entries(r.removed)) {
    const key = KEYS[k as CollectionName]; if (!key || !ids) continue;
    const set = new Set(ids);
    n[k as CollectionName] = n[k as CollectionName].filter((x) => !set.has(key(x)));
  }
  if (r.settings) next.settings = r.settings;
  return next;
}

interface Ctx {
  user: User | null;
  data: AppData | null;
  loading: boolean;
  error: string;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  reload: () => Promise<void>;
  /** call an API action and merge its delta into the store */
  mutate: <T extends ApiResult = ApiResult>(action: string, payload?: unknown, opts?: { retries?: number }) => Promise<T>;
  isAdmin: boolean;
}

const DataCtx = createContext<Ctx | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(!!getToken());
  const [error, setError] = useState('');
  const dataRef = useRef<AppData | null>(null);
  dataRef.current = data;

  const logout = useCallback(() => {
    const t = getToken();
    if (t) api('auth.logout', { token: t }).catch(() => {});
    setToken(null); setUser(null); setData(null); setLoading(false);
  }, []);

  useEffect(() => { setAuthLostHandler(() => { setToken(null); setUser(null); setData(null); setError('Your session expired. Please log in again.'); }); }, []);

  const reload = useCallback(async () => {
    setError('');
    try {
      const d = await api<AppData>('app.bootstrap', {}, { retries: 1 });
      setData(d); setUser(d.user);
    } catch (e) {
      if (!(e instanceof ApiError && e.code === 'AUTH')) setError((e as Error).message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (getToken()) reload(); }, [reload]);

  const login = useCallback(async (username: string, password: string) => {
    const r = await api<{ token: string; user: User }>('auth.login', { username, password });
    setToken(r.token); setUser(r.user); setLoading(true);
    await reload();
  }, [reload]);

  const mutate = useCallback(async <T extends ApiResult = ApiResult>(action: string, payload: unknown = {}, opts?: { retries?: number }) => {
    const r = await api<T>(action, payload, opts);
    setData((d) => (d ? applyResult(d, r) : d));
    return r;
  }, []);

  const value = useMemo<Ctx>(() => ({ user, data, loading, error, login, logout, reload, mutate, isAdmin: user?.role === 'Admin' }), [user, data, loading, error, login, logout, reload, mutate]);
  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}

export function useApp() {
  const c = useContext(DataCtx);
  if (!c) throw new Error('useApp outside provider');
  return c;
}
/** Only use inside the logged-in layout (data is loaded). */
export function useData(): AppData { const { data } = useApp(); if (!data) throw new Error('data not loaded'); return data; }
