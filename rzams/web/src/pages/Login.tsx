import { useState, type FormEvent } from 'react';
import { Lock, Server } from 'lucide-react';
import { useApp } from '../lib/store';
import { getApiUrl, isValidApiUrl, setApiUrl } from '../lib/api';
import { Button, Field, Input } from '../components/ui';

export default function Login() {
  const { login, error: sessionError } = useApp();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(sessionError);
  const [server, setServer] = useState(getApiUrl());
  const [editServer, setEditServer] = useState(!getApiUrl() && !window.__RZAMS_TRANSPORT__);

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError('');
    if (editServer) {
      if (!isValidApiUrl(server)) { setError('Server address must be the Apps Script web app link ending in /exec.'); return; }
      setApiUrl(server); setEditServer(false);
    }
    setBusy(true);
    try { await login(username.trim(), password); } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-[380px]">
        <div className="mb-7 flex flex-col items-center text-center">
          <img src="/brand/rza-logo.png" alt="Rhythm Zone Academy" className="mb-4 size-16 rounded-2xl object-cover shadow-sm" />
          <h1 className="text-[20px] font-semibold tracking-tight">RZAMS Pro</h1>
          <p className="mt-1 text-[13.5px] muted">Rhythm Zone Academy · T Music Lab</p>
        </div>
        <form onSubmit={submit} className="card space-y-4 p-6" noValidate>
          {editServer && (
            <Field label="Server address" hint="One-time setup: the Apps Script web app link (ends with /exec).">
              <Input value={server} onChange={(e) => setServer(e.target.value)} placeholder="https://script.google.com/macros/s/…/exec" autoComplete="off" />
            </Field>
          )}
          <Field label="Username"><Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" required /></Field>
          <Field label="Password"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></Field>
          {error && <p role="alert" className="rounded-[10px] bg-red-50 px-3 py-2 text-[13px] text-red-700 dark:bg-red-950/50 dark:text-red-400">{error}</p>}
          <Button type="submit" variant="primary" className="w-full" loading={busy} icon={<Lock className="size-4" />}>Sign in</Button>
        </form>
        {!editServer && !window.__RZAMS_TRANSPORT__ && (
          <button onClick={() => setEditServer(true)} className="mx-auto mt-4 flex items-center gap-1.5 text-[12.5px] faint hover:text-[var(--text-2)]"><Server className="size-3.5" />Change server address</button>
        )}
        <p className="mt-6 text-center text-[12px] faint">Private admin portal. Authorised staff only.</p>
      </div>
    </div>
  );
}
