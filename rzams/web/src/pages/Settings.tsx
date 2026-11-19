import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DatabaseBackup, ImageUp, KeyRound, Moon, Plus, Sun } from 'lucide-react';
import { useApp, useData } from '../lib/store';
import { api } from '../lib/api';
import type { Settings as S, UserRow } from '../lib/types';
import { fmtDateTime } from '../lib/format';
import { imageToPng } from '../lib/share';
import { Badge, Button, Card, Field, Input, Modal, PageHeader, Select, TableWrap, Tabs, Textarea, useUi } from '../components/ui';
import { useTheme } from '../components/Layout';

type Tab = 'academy' | 'invoices' | 'fees' | 'users' | 'security' | 'data' | 'appearance';

export default function Settings() {
  const { isAdmin } = useApp();
  const [params, setParams] = useSearchParams();
  const tabs = (isAdmin ? [{ value: 'academy', label: 'Academy' }, { value: 'invoices', label: 'Invoices & messages' }, { value: 'fees', label: 'Fees & payments' }, { value: 'users', label: 'Users' }] : []).concat([{ value: 'security', label: 'Password' }, ...(isAdmin ? [{ value: 'data', label: 'Data & backup' }] : []), { value: 'appearance', label: 'Appearance' }]) as { value: Tab; label: string }[];
  const tab = (tabs.find((t) => t.value === params.get('tab'))?.value || tabs[0].value) as Tab;
  return (
    <>
      <PageHeader title="Settings" description={isAdmin ? 'Branding, invoices, fees, users and data.' : 'Your account.'} />
      <Tabs value={tab} onChange={(t) => setParams({ tab: t })} tabs={tabs} />
      <div className="mt-5 max-w-3xl">
        {['academy', 'invoices', 'fees'].includes(tab) && <SettingsForm tab={tab as 'academy' | 'invoices' | 'fees'} />}
        {tab === 'users' && <Users />}
        {tab === 'security' && <Password />}
        {tab === 'data' && <Data />}
        {tab === 'appearance' && <Appearance />}
      </div>
    </>
  );
}

function SettingsForm({ tab }: { tab: 'academy' | 'invoices' | 'fees' }) {
  const d = useData(); const { mutate } = useApp(); const { toast } = useUi();
  const [f, setF] = useState<S>(d.settings); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => setF(d.settings), [d.settings]);
  const set = (k: keyof S, v: string) => setF((x) => ({ ...x, [k]: v }));
  const fields: Record<typeof tab, (keyof S)[]> = { academy: ['academyName', 'studioName', 'tagline', 'address', 'phone', 'whatsapp', 'email', 'website', 'logo'], invoices: ['invoicePrefix', 'invoiceFooter', 'signatory', 'invoiceTemplate'], fees: ['paymentMethods', 'feeStartMonth', 'feeDueDay', 'reminderDaysBefore', 'reminderTemplate', 'expenseCategories', 'calendarSync'] };
  const save = async () => {
    setBusy(true); setErr('');
    try { const payload: Partial<S> = {}; fields[tab].forEach((k) => { if (f[k] !== d.settings[k]) payload[k] = f[k]; }); await mutate('settings.save', { settings: payload }); toast('Settings saved'); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const logo = async (file?: File) => { if (!file) return; try { const v = await imageToPng(file); if (v.length > 45000) throw new Error('That image is too large even after resizing. Use a simpler logo.'); set('logo', v); } catch (e) { toast((e as Error).message, 'error'); } };
  return (
    <Card>
      <div className="grid gap-4 sm:grid-cols-2">
        {tab === 'academy' && <>
          <div className="flex items-center gap-4 sm:col-span-2">
            <img src={f.logo || '/brand/rza-logo.png'} alt="" className="size-16 rounded-xl object-cover" />
            <div className="flex gap-2"><Button size="sm" icon={<ImageUp className="size-4" />} onClick={() => fileRef.current?.click()}>Upload logo</Button>{f.logo && <Button size="sm" variant="ghost" onClick={() => set('logo', '')}>Use default logo</Button>}<input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { logo(e.target.files?.[0]); e.target.value = ''; }} /></div>
          </div>
          <Field label="Academy name"><Input value={f.academyName} onChange={(e) => set('academyName', e.target.value)} /></Field>
          <Field label="Associated studio"><Input value={f.studioName} onChange={(e) => set('studioName', e.target.value)} /></Field>
          <Field label="Tagline" className="sm:col-span-2"><Input value={f.tagline} onChange={(e) => set('tagline', e.target.value)} /></Field>
          <Field label="Address" className="sm:col-span-2"><Textarea rows={2} value={f.address} onChange={(e) => set('address', e.target.value)} /></Field>
          <Field label="Contact number"><Input type="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
          <Field label="WhatsApp number"><Input type="tel" value={f.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} /></Field>
          <Field label="Email"><Input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
          <Field label="Website"><Input value={f.website} onChange={(e) => set('website', e.target.value)} /></Field>
        </>}
        {tab === 'invoices' && <>
          <Field label="Invoice prefix" hint="e.g. RZA → RZA-2026-0001. Numbers never repeat."><Input value={f.invoicePrefix} onChange={(e) => set('invoicePrefix', e.target.value.toUpperCase())} /></Field>
          <Field label="Signatory"><Input value={f.signatory} onChange={(e) => set('signatory', e.target.value)} /></Field>
          <Field label="Invoice footer / thank-you message" className="sm:col-span-2"><Input value={f.invoiceFooter} onChange={(e) => set('invoiceFooter', e.target.value)} /></Field>
          <Field label="WhatsApp invoice message" className="sm:col-span-2" hint="Placeholders: {name} {id} {course} {amount} {due} {invoice} {academy}"><Textarea rows={8} value={f.invoiceTemplate} onChange={(e) => set('invoiceTemplate', e.target.value)} /></Field>
        </>}
        {tab === 'fees' && <>
          <Field label="Payment methods" className="sm:col-span-2" hint="Comma separated"><Input value={f.paymentMethods} onChange={(e) => set('paymentMethods', e.target.value)} /></Field>
          <Field label="Count pending fees from" hint='Month, e.g. "November 2026"'><Input value={f.feeStartMonth} onChange={(e) => set('feeStartMonth', e.target.value)} /></Field>
          <Field label="Fee due day of month" hint="1–28"><Input type="number" min={1} max={28} value={f.feeDueDay} onChange={(e) => set('feeDueDay', e.target.value)} /></Field>
          <Field label="Show upcoming reminders (days before due)"><Input type="number" min={1} max={20} value={f.reminderDaysBefore} onChange={(e) => set('reminderDaysBefore', e.target.value)} /></Field>
          <Field label="Sync attendance to Google Calendar"><Select value={f.calendarSync} onChange={(e) => set('calendarSync', e.target.value)}><option value="true">On (existing behaviour)</option><option value="false">Off (faster saving)</option></Select></Field>
          <Field label="Reminder message" className="sm:col-span-2" hint="Placeholders: {name} {amount} {months} {academy} {id}"><Textarea rows={6} value={f.reminderTemplate} onChange={(e) => set('reminderTemplate', e.target.value)} /></Field>
          <Field label="Expense categories" className="sm:col-span-2" hint="Comma separated"><Input value={f.expenseCategories} onChange={(e) => set('expenseCategories', e.target.value)} /></Field>
        </>}
        {err && <p role="alert" className="text-[13px] text-red-600 sm:col-span-2">{err}</p>}
        <div className="sm:col-span-2"><Button variant="primary" loading={busy} onClick={save} data-testid="save-settings">Save settings</Button></div>
      </div>
    </Card>
  );
}

function Users() {
  const d = useData(); const { mutate, user } = useApp(); const { toast } = useUi();
  const [edit, setEdit] = useState<Partial<UserRow> & { password?: string; isNew?: boolean } | null>(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const save = async () => { if (!edit) return; setBusy(true); setErr(''); try { await mutate('users.save', edit); toast('User saved'); setEdit(null); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } };
  return (
    <Card padded={false} title="Users & roles" action={<Button size="sm" icon={<Plus className="size-4" />} onClick={() => { setErr(''); setEdit({ role: 'Staff', status: 'Active', isNew: true }); }}>Add user</Button>}>
      <p className="px-5 pb-3 text-[12.5px] muted">Admins can do everything. Staff can manage students, attendance, payments and reminders, but cannot see expenses, change settings, void payments or delete records.</p>
      <TableWrap><table className="table"><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Last login</th><th /></tr></thead><tbody>
        {d.users.map((u) => <tr key={u.username}><td><p className="font-medium">{u.name}</p><p className="text-[12px] faint">{u.username}{u.username === user?.username && ' · you'}</p></td><td><Badge tone={u.role === 'Admin' ? 'violet' : 'neutral'}>{u.role}</Badge></td><td><Badge tone={u.status === 'Active' ? 'green' : 'red'}>{u.status}</Badge></td><td className="muted">{u.lastLogin ? fmtDateTime(u.lastLogin) : 'Never'}</td><td className="text-right"><Button size="sm" variant="ghost" onClick={() => { setErr(''); setEdit({ ...u }); }}>Edit</Button></td></tr>)}
      </tbody></table></TableWrap>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.isNew ? 'Add user' : `Edit ${edit?.username}`} size="sm" footer={<><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" loading={busy} onClick={save}>Save</Button></>}>
        {edit && <div className="space-y-4">
          <Field label="Username"><Input value={edit.username || ''} disabled={!edit.isNew} onChange={(e) => setEdit((x) => x && ({ ...x, username: e.target.value.toLowerCase() }))} autoCapitalize="none" /></Field>
          <Field label="Full name"><Input value={edit.name || ''} onChange={(e) => setEdit((x) => x && ({ ...x, name: e.target.value }))} /></Field>
          <div className="grid grid-cols-2 gap-4"><Field label="Role"><Select value={edit.role} onChange={(e) => setEdit((x) => x && ({ ...x, role: e.target.value as UserRow['role'] }))}><option>Staff</option><option>Admin</option></Select></Field><Field label="Status"><Select value={edit.status} onChange={(e) => setEdit((x) => x && ({ ...x, status: e.target.value as UserRow['status'] }))}><option>Active</option><option>Disabled</option></Select></Field></div>
          <Field label={edit.isNew ? 'Password' : 'New password'} hint={edit.isNew ? 'At least 8 characters' : 'Leave empty to keep the current password'}><Input type="password" value={edit.password || ''} onChange={(e) => setEdit((x) => x && ({ ...x, password: e.target.value }))} autoComplete="new-password" /></Field>
          {err && <p role="alert" className="text-[13px] text-red-600">{err}</p>}
        </div>}
      </Modal>
    </Card>
  );
}

function Password() {
  const { toast } = useUi();
  const [cur, setCur] = useState(''); const [next, setNext] = useState(''); const [again, setAgain] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const save = async () => {
    setErr('');
    if (next.length < 8) return setErr('New password must be at least 8 characters.');
    if (next !== again) return setErr('The new passwords do not match.');
    setBusy(true);
    try { await api('auth.changePassword', { current: cur, next }); toast('Password changed'); setCur(''); setNext(''); setAgain(''); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Card title="Change password">
      <div className="max-w-sm space-y-4">
        <Field label="Current password"><Input type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" /></Field>
        <Field label="New password" hint="At least 8 characters. Passwords are stored as salted hashes, never in plain text."><Input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" /></Field>
        <Field label="Repeat new password"><Input type="password" value={again} onChange={(e) => setAgain(e.target.value)} autoComplete="new-password" /></Field>
        {err && <p role="alert" className="text-[13px] text-red-600">{err}</p>}
        <Button variant="primary" icon={<KeyRound className="size-4" />} loading={busy} onClick={save}>Change password</Button>
      </div>
    </Card>
  );
}

function Data() {
  const d = useData(); const { reload } = useApp(); const { toast, confirm } = useUi();
  const [busy, setBusy] = useState(''); const [preview, setPreview] = useState<Record<string, unknown> | null>(null); const [last, setLast] = useState<{ name: string; url: string } | null>(null);
  useEffect(() => { api<Record<string, unknown>>('system.setupPreview').then(setPreview).catch(() => {}); }, []);
  const backup = async () => { setBusy('backup'); try { const r = await api<{ name: string; url: string }>('system.backup'); setLast(r); toast('Backup created in Google Drive'); } catch (e) { toast((e as Error).message, 'error'); } finally { setBusy(''); } };
  const setup = async () => {
    if (!(await confirm({ title: 'Run one-time setup?', text: 'A backup copy of the spreadsheet is made first. Then default courses are created, students are linked to courses by their instrument, and existing Fees payments are imported as transactions. Existing rows are not changed or deleted.', confirmLabel: 'Back up and run setup' }))) return;
    setBusy('setup');
    try { const r = await api<{ coursesCreated: string[]; studentsLinked: number; legacyImported: number }>('system.setup'); toast(`Setup done: ${r.coursesCreated.length} courses, ${r.studentsLinked} students linked, ${r.legacyImported} payments imported`); await reload(); }
    catch (e) { toast((e as Error).message, 'error'); } finally { setBusy(''); }
  };
  return (
    <div className="space-y-5">
      <Card title="Backup">
        <p className="mb-3 text-[13.5px] muted">Creates a full copy of the Google Sheet in the “RZAMS Backups” folder of your Google Drive. Daily automatic backups are enabled by running <code>installDailyBackup</code> once in the Apps Script editor (see the deployment guide).</p>
        <Button icon={<DatabaseBackup className="size-4" />} loading={busy === 'backup'} onClick={backup}>Back up now</Button>
        {last && <p className="mt-3 text-[13px]">Created <a className="underline" href={last.url} target="_blank" rel="noreferrer">{last.name}</a></p>}
      </Card>
      <Card title="One-time setup" action={d.meta.setupDone ? <Badge tone="green">Done</Badge> : <Badge tone="amber">Not run yet</Badge>}>
        {preview ? <ul className="mb-4 space-y-1 text-[13.5px]">
          <li>Courses to create: <b>{(preview.coursesToCreate as string[]).join(', ') || 'none'}</b></li>
          <li>Students to link to a course: <b>{String(preview.studentsToLink)}</b></li>
          <li>Existing payments to import: <b>{String(preview.legacyPaymentsToImport)}</b> (₹{Number(preview.legacyAmount).toLocaleString('en-IN')})</li>
          {Object.keys(preview.unmatchedInstruments as object).length > 0 && <li className="text-amber-700 dark:text-amber-400">Instruments without a matching course: {Object.entries(preview.unmatchedInstruments as Record<string, number>).map(([k, v]) => `${k} (${v})`).join(', ')}</li>}
        </ul> : <p className="mb-4 text-[13px] muted">Checking…</p>}
        <p className="mb-3 text-[12.5px] muted">Safe to run again: it only adds what is missing.</p>
        <Button variant={d.meta.setupDone ? 'secondary' : 'primary'} loading={busy === 'setup'} onClick={setup} data-testid="run-setup">{d.meta.setupDone ? 'Run again' : 'Back up and run setup'}</Button>
      </Card>
      <Card title="Server">
        <p className="text-[13px] muted">API version {d.meta.version}. Fee tracking from {d.meta.feeStartMonth}.</p>
      </Card>
    </div>
  );
}

function Appearance() {
  const { dark, toggle } = useTheme();
  return (
    <Card title="Theme">
      <p className="mb-3 text-[13.5px] muted">Saved on this device.</p>
      <div className="flex gap-2"><Button variant={!dark ? 'primary' : 'secondary'} icon={<Sun className="size-4" />} onClick={() => dark && toggle()}>Light</Button><Button variant={dark ? 'primary' : 'secondary'} icon={<Moon className="size-4" />} onClick={() => !dark && toggle()}>Dark</Button></div>
    </Card>
  );
}

