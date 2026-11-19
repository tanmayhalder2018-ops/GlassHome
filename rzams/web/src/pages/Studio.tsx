import { useState } from 'react';
import { CheckCircle2, Circle, Mic2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useApp, useData } from '../lib/store';
import type { StudioClient, Task } from '../lib/types';
import { cx, fmtDate, fmtPhone, rupees } from '../lib/format';
import { Badge, Button, Card, EmptyState, Field, IconButton, Input, Modal, PageHeader, Select, StatCard, TableWrap, Tabs, useUi } from '../components/ui';

export default function Studio() {
  const d = useData(); const { mutate, isAdmin } = useApp(); const { toast, confirm } = useUi();
  const [tab, setTab] = useState<'clients' | 'tasks'>('clients');
  const [client, setClient] = useState<Partial<StudioClient> | null>(null);
  const [task, setTask] = useState<Partial<Task> | null>(null);
  const totalDue = d.studio.reduce((a, c) => a + (Number(c.due) || 0), 0);
  const delClient = async (c: StudioClient) => { if (!(await confirm({ title: `Delete ${c.clientName}?`, confirmLabel: 'Delete', danger: true }))) return; try { await mutate('studio.delete', { row: c.row, expected: c.clientName }); toast('Client deleted'); } catch (e) { toast((e as Error).message, 'error'); } };
  const toggleTask = async (t: Task) => { try { await mutate('tasks.save', { ...t, row: t.row, expected: t.task, status: t.status === 'Completed' ? 'Pending' : 'Completed' }); } catch (e) { toast((e as Error).message, 'error'); } };
  const delTask = async (t: Task) => { if (!(await confirm({ title: 'Delete task?', text: t.task, confirmLabel: 'Delete', danger: true }))) return; try { await mutate('tasks.delete', { row: t.row, expected: t.task }); toast('Task deleted'); } catch (e) { toast((e as Error).message, 'error'); } };
  return (
    <>
      <PageHeader title={d.settings.studioName || 'T Music Lab'} description="Recording studio clients and to-dos (from the existing Studio Clients and Tasks tabs)."
        actions={tab === 'clients' ? <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setClient({ status: 'Ongoing' })}>Add client</Button> : <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setTask({ date: d.meta.today, priority: 'Medium' })}>Add task</Button>} />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Studio clients" value={d.studio.length} icon={<Mic2 />} />
        <StatCard label="Ongoing projects" value={d.studio.filter((c) => c.status !== 'Completed').length} tone="blue" />
        <StatCard label="Studio dues" value={rupees(totalDue)} tone="red" />
        <StatCard label="Open tasks" value={d.tasks.filter((t) => t.status !== 'Completed').length} tone="amber" />
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'clients', label: 'Studio clients', count: d.studio.length }, { value: 'tasks', label: 'Tasks', count: d.tasks.length }]} />
      <Card padded={false} className="mt-5">
        {tab === 'clients' && (!d.studio.length ? <EmptyState icon={<Mic2 />} title="No studio clients" /> : <TableWrap><table className="table"><thead><tr><th>Client</th><th>Project</th><th className="text-right">Total</th><th className="text-right">Advance</th><th className="text-right">Due</th><th>Status</th><th /></tr></thead><tbody>
          {d.studio.map((c) => <tr key={c.row}><td><p className="font-medium">{c.clientName}</p><p className="text-[12px] faint">{fmtPhone(c.phone)}</p></td><td>{c.projectName}</td><td className="num text-right">{rupees(c.total)}</td><td className="num text-right muted">{rupees(c.advance)}</td><td className={cx('num text-right font-medium', Number(c.due) > 0 && 'text-red-600 dark:text-red-400')}>{rupees(c.due)}</td><td><Badge tone={c.status === 'Completed' ? 'green' : 'blue'}>{c.status}</Badge></td><td className="text-right"><IconButton label="Edit" onClick={() => setClient(c)}><Pencil className="size-4" /></IconButton>{isAdmin && <IconButton label="Delete" onClick={() => delClient(c)}><Trash2 className="size-4" /></IconButton>}</td></tr>)}
        </tbody></table></TableWrap>)}
        {tab === 'tasks' && (!d.tasks.length ? <EmptyState title="No tasks" /> : <ul className="divide-y divide-[var(--border)]">{[...d.tasks].sort((a, b) => (a.status === 'Completed' ? 1 : 0) - (b.status === 'Completed' ? 1 : 0) || a.date.localeCompare(b.date)).map((t) => (
          <li key={t.row} className="flex items-center gap-3 px-4 py-3"><button onClick={() => toggleTask(t)} aria-label={t.status === 'Completed' ? 'Mark pending' : 'Mark done'}>{t.status === 'Completed' ? <CheckCircle2 className="size-5 text-emerald-600" /> : <Circle className="size-5 faint" />}</button><span className={cx('flex-1 text-[13.5px]', t.status === 'Completed' && 'line-through faint')}>{t.task}</span><Badge tone={t.priority === 'High' ? 'red' : t.priority === 'Low' ? 'neutral' : 'amber'}>{t.priority}</Badge><span className="w-24 text-right text-[12.5px] faint">{fmtDate(t.date, { day: 'numeric', month: 'short' })}</span><IconButton label="Delete" onClick={() => delTask(t)}><Trash2 className="size-4" /></IconButton></li>))}</ul>)}
      </Card>
      <ClientModal value={client} onClose={() => setClient(null)} />
      <TaskModal value={task} onClose={() => setTask(null)} />
    </>
  );
}

function ClientModal({ value, onClose }: { value: Partial<StudioClient> | null; onClose: () => void }) {
  const { mutate } = useApp(); const { toast } = useUi();
  const [f, setF] = useState<Partial<StudioClient>>({}); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const [seenValue, setSeenValue] = useState<unknown>(null);
  if (value && value !== seenValue) { setSeenValue(value); setF(value); setErr(''); } // fill the form in the same render it opens
  if (!value) return null;
  const save = async () => { setBusy(true); setErr(''); try { await mutate('studio.save', { item: f, row: value.row, expected: value.clientName }); toast('Saved'); onClose(); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } };
  const due = Math.max((Number(f.total) || 0) - (Number(f.advance) || 0), 0);
  return (
    <Modal open onClose={onClose} title={value.row ? 'Edit client' : 'Add client'} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={save}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Client name"><Input value={f.clientName || ''} onChange={(e) => setF((x) => ({ ...x, clientName: e.target.value }))} /></Field>
        <Field label="Phone"><Input type="tel" value={f.phone || ''} onChange={(e) => setF((x) => ({ ...x, phone: e.target.value }))} /></Field>
        <Field label="Project" className="sm:col-span-2"><Input value={f.projectName || ''} onChange={(e) => setF((x) => ({ ...x, projectName: e.target.value }))} /></Field>
        <Field label="Total (₹)"><Input type="number" min={0} value={String(f.total ?? '')} onChange={(e) => setF((x) => ({ ...x, total: e.target.value as unknown as number }))} /></Field>
        <Field label="Advance (₹)" hint={`Due: ${rupees(due)}`}><Input type="number" min={0} value={String(f.advance ?? '')} onChange={(e) => setF((x) => ({ ...x, advance: e.target.value as unknown as number }))} /></Field>
        <Field label="Status"><Select value={f.status || 'Ongoing'} onChange={(e) => setF((x) => ({ ...x, status: e.target.value }))}><option>Ongoing</option><option>Completed</option></Select></Field>
        {err && <p role="alert" className="text-[13px] text-red-600 sm:col-span-2">{err}</p>}
      </div>
    </Modal>
  );
}

function TaskModal({ value, onClose }: { value: Partial<Task> | null; onClose: () => void }) {
  const { mutate } = useApp(); const { toast } = useUi();
  const [f, setF] = useState<Partial<Task>>({}); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const [seenValue, setSeenValue] = useState<unknown>(null);
  if (value && value !== seenValue) { setSeenValue(value); setF(value); setErr(''); } // fill the form in the same render it opens
  if (!value) return null;
  const save = async () => { setBusy(true); setErr(''); try { await mutate('tasks.save', f); toast('Task added'); onClose(); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } };
  return (
    <Modal open onClose={onClose} title="Add task" size="sm" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={save}>Save</Button></>}>
      <div className="space-y-4">
        <Field label="Task"><Input value={f.task || ''} onChange={(e) => setF((x) => ({ ...x, task: e.target.value }))} /></Field>
        <div className="grid grid-cols-2 gap-4"><Field label="Priority"><Select value={f.priority || 'Medium'} onChange={(e) => setF((x) => ({ ...x, priority: e.target.value }))}><option>High</option><option>Medium</option><option>Low</option></Select></Field><Field label="Date"><Input type="date" value={f.date || ''} onChange={(e) => setF((x) => ({ ...x, date: e.target.value }))} /></Field></div>
        {err && <p role="alert" className="text-[13px] text-red-600">{err}</p>}
      </div>
    </Modal>
  );
}
