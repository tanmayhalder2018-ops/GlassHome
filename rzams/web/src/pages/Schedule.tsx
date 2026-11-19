import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useApp, useData } from '../lib/store';
import { occurrences, weekStart, type Occurrence } from '../lib/derive';
import { addDays, cx, fmtDate, fmtTime, isoOf, parseIso } from '../lib/format';
import { Badge, Button, Card, EmptyState, Field, IconButton, Input, Modal, PageHeader, Segmented, Select, Textarea, useUi } from '../components/ui';

type View = 'month' | 'week' | 'day';
const tone = (s: Occurrence['status']) => (s === 'Cancelled' ? 'red' : s === 'Completed' ? 'neutral' : s === 'Ongoing' ? 'green' : 'blue') as 'red' | 'neutral' | 'green' | 'blue';

export default function Schedule() {
  const d = useData();
  const [view, setView] = useState<View>(() => (window.innerWidth < 768 ? 'day' : 'week'));
  const [anchor, setAnchor] = useState(d.meta.today);
  const [batch, setBatch] = useState('');
  const [teacher, setTeacher] = useState('');
  const [edit, setEdit] = useState<Partial<Occurrence> | null>(null);

  const range = useMemo(() => {
    if (view === 'day') return [anchor, anchor];
    if (view === 'week') { const s = weekStart(anchor); return [s, addDays(s, 6)]; }
    const a = parseIso(anchor), first = isoOf(new Date(a.getFullYear(), a.getMonth(), 1)), last = isoOf(new Date(a.getFullYear(), a.getMonth() + 1, 0));
    return [weekStart(first), addDays(weekStart(last), 6)];
  }, [view, anchor]);
  const occ = useMemo(() => occurrences(d.batches, d.classes, range[0], range[1], d.meta.today).filter((o) => (!batch || o.batchId === batch) && (!teacher || o.teacherId === teacher)), [d.batches, d.classes, range, d.meta.today, batch, teacher]);
  const step = (n: number) => { if (view === 'day') setAnchor(addDays(anchor, n)); else if (view === 'week') setAnchor(addDays(anchor, 7 * n)); else { const a = parseIso(anchor); setAnchor(isoOf(new Date(a.getFullYear(), a.getMonth() + n, 1))); } };
  const title = view === 'day' ? fmtDate(anchor, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : view === 'week' ? `${fmtDate(range[0], { day: 'numeric', month: 'short' })} – ${fmtDate(range[1], { day: 'numeric', month: 'short', year: 'numeric' })}` : parseIso(anchor).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const label = (o: Occurrence) => d.batches.find((b) => b.id === o.batchId)?.name || o.title || 'Class';
  const days = []; for (let x = range[0]; x <= range[1]; x = addDays(x, 1)) days.push(x);
  const curMonth = parseIso(anchor).getMonth();

  return (
    <>
      <PageHeader title="Class schedule" description="Generated from each batch's days and times. Change a single class without changing the batch."
        actions={<Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setEdit({ date: anchor, startTime: '17:00', endTime: '18:00', raw: 'Scheduled' })}>Add class</Button>} />
      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] p-3">
          <div className="flex items-center gap-1"><IconButton label="Previous" onClick={() => step(-1)}><ChevronLeft className="size-4" /></IconButton><IconButton label="Next" onClick={() => step(1)}><ChevronRight className="size-4" /></IconButton><Button size="sm" onClick={() => setAnchor(d.meta.today)}>Today</Button></div>
          <h2 className="mx-2 text-[14.5px] font-semibold">{title}</h2>
          <div className="ml-auto flex flex-wrap gap-2">
            <Select value={batch} onChange={(e) => setBatch(e.target.value)} className="h-8 w-[170px] text-[13px]"><option value="">All batches</option>{d.batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select>
            <Select value={teacher} onChange={(e) => setTeacher(e.target.value)} className="h-8 w-[160px] text-[13px]"><option value="">All teachers</option>{d.teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select>
            <Segmented size="sm" value={view} onChange={setView} options={[{ value: 'month', label: 'Month' }, { value: 'week', label: 'Week' }, { value: 'day', label: 'Day' }]} />
          </div>
        </div>
        {!d.batches.length && !d.classes.length ? <EmptyState icon={<CalendarDays />} title="No schedule yet" text="Create batches with class days and times in Courses & Batches, or add a one-off class." /> : view === 'month' ? (
          <div className="grid grid-cols-7 text-[12px]">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((w) => <div key={w} className="border-b border-[var(--border)] px-2 py-2 font-medium muted">{w}</div>)}
            {days.map((day) => { const list = occ.filter((o) => o.date === day); return (
              <div key={day} className={cx('min-h-[96px] border-b border-r border-[var(--border)] p-1.5', parseIso(day).getMonth() !== curMonth && 'bg-[var(--surface-2)]/50 opacity-60')}>
                <button onClick={() => { setAnchor(day); setView('day'); }} className={cx('mb-1 flex size-6 items-center justify-center rounded-full text-[12px]', day === d.meta.today ? 'bg-zinc-900 font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900' : 'muted hover:bg-[var(--surface-2)]')}>{parseIso(day).getDate()}</button>
                {list.slice(0, 3).map((o) => <button key={o.key} onClick={() => setEdit(o)} className={cx('mb-0.5 block w-full truncate rounded px-1.5 py-0.5 text-left text-[11.5px]', o.status === 'Cancelled' ? 'bg-red-50 text-red-700 line-through dark:bg-red-950/40 dark:text-red-400' : 'bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300')}>{fmtTime(o.startTime).replace(':00', '')} {label(o)}</button>)}
                {list.length > 3 && <p className="px-1.5 text-[11px] faint">+{list.length - 3} more</p>}
              </div>); })}
          </div>
        ) : (
          <div className={cx(view === 'week' && 'grid md:grid-cols-7')}>
            {days.map((day) => { const list = occ.filter((o) => o.date === day); return (
              <div key={day} className="border-b border-[var(--border)] p-3 md:border-r">
                <p className={cx('mb-2 text-[12.5px] font-medium', day === d.meta.today ? 'text-[var(--text)]' : 'muted')}>{fmtDate(day, { weekday: 'short', day: 'numeric', month: 'short' })}{day === d.meta.today && <span className="ml-1.5"><Badge tone="blue">Today</Badge></span>}</p>
                {!list.length ? <p className="text-[12px] faint">No classes</p> : list.map((o) => (
                  <button key={o.key} onClick={() => setEdit(o)} className="mb-2 block w-full rounded-[10px] border border-[var(--border)] p-2.5 text-left transition-colors hover:border-[var(--border-strong)]" data-testid="occ">
                    <p className={cx('truncate text-[13px] font-medium', o.status === 'Cancelled' && 'line-through')}>{label(o)}</p>
                    <p className="text-[12px] muted">{fmtTime(o.startTime)}{o.endTime && `–${fmtTime(o.endTime)}`}</p>
                    <p className="truncate text-[12px] faint">{d.teachers.find((t) => t.id === o.teacherId)?.name || 'No teacher'}{o.location && ` · ${o.location}`}</p>
                    <div className="mt-1.5"><Badge tone={tone(o.status)}>{o.status}</Badge></div>
                  </button>))}
              </div>); })}
          </div>
        )}
      </Card>
      <ClassModal value={edit} onClose={() => setEdit(null)} />
    </>
  );
}

function ClassModal({ value, onClose }: { value: Partial<Occurrence> | null; onClose: () => void }) {
  const d = useData(); const { mutate } = useApp(); const { toast, confirm } = useUi();
  const init = (v: Partial<Occurrence> | null) => ({ id: v?.classId || '', date: v?.date || d.meta.today, startTime: v?.startTime || '', endTime: v?.endTime || '', batchId: v?.batchId || '', teacherId: v?.teacherId || '', location: v?.location || '', status: v?.raw || 'Scheduled', title: v?.title || '', notes: v?.notes || '' });
  const [f, setF] = useState<Record<string, string>>(() => init(value)); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const [shown, setShown] = useState(value);
  if (value !== shown) { setShown(value); setF(init(value)); setErr(''); } // fill the form in the same render it opens
  if (!value) return null;
  const isBatch = !!value.batchId && !!value.key && value.key.includes('|');
  const save = async () => { setBusy(true); setErr(''); try { await mutate('classes.save', { ...f, id: f.id || undefined }); toast('Schedule updated'); onClose(); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } };
  const remove = async () => {
    if (!(await confirm({ title: isBatch ? 'Reset this class?' : 'Delete this class?', text: isBatch ? 'It goes back to the batch’s regular time and status.' : 'The one-off class is removed from the schedule.', confirmLabel: isBatch ? 'Reset' : 'Delete', danger: !isBatch }))) return;
    try { await mutate('classes.delete', { id: f.id }); toast(isBatch ? 'Class reset' : 'Class deleted'); onClose(); } catch (e) { toast((e as Error).message, 'error'); }
  };
  const set = (k: string, v: string) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Modal open onClose={onClose} title={isBatch ? d.batches.find((b) => b.id === value.batchId)?.name || 'Class' : f.id ? 'Edit class' : 'Add class'} description={isBatch ? `${fmtDate(f.date, { weekday: 'long', day: 'numeric', month: 'long' })} · changes apply to this date only` : undefined}
      footer={<>{f.id && <Button variant="ghost" className="mr-auto" onClick={remove}>{isBatch ? 'Reset to regular' : 'Delete'}</Button>}<Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={save}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        {!isBatch && <Field label="Title" className="sm:col-span-2" hint="Or choose a batch below"><Input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Recital rehearsal" /></Field>}
        {!isBatch && <Field label="Date"><Input type="date" value={f.date} onChange={(e) => set('date', e.target.value)} /></Field>}
        {!isBatch && <Field label="Batch"><Select value={f.batchId} onChange={(e) => set('batchId', e.target.value)}><option value="">None (one-off)</option>{d.batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>}
        <Field label="Status"><Select value={f.status} onChange={(e) => set('status', e.target.value)}><option value="Scheduled">Scheduled</option><option value="Completed">Completed</option><option value="Cancelled">Cancelled</option></Select></Field>
        <Field label="Teacher"><Select value={f.teacherId} onChange={(e) => set('teacherId', e.target.value)}><option value="">—</option>{d.teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
        <Field label="Start time"><Input type="time" value={f.startTime} onChange={(e) => set('startTime', e.target.value)} /></Field>
        <Field label="End time"><Input type="time" value={f.endTime} onChange={(e) => set('endTime', e.target.value)} /></Field>
        <Field label="Location" className="sm:col-span-2"><Input value={f.location} onChange={(e) => set('location', e.target.value)} /></Field>
        <Field label="Notes" className="sm:col-span-2"><Textarea rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} placeholder="e.g. Holiday, rescheduled to Sunday" /></Field>
        {err && <p role="alert" className="text-[13px] text-red-600 sm:col-span-2">{err}</p>}
      </div>
    </Modal>
  );
}
