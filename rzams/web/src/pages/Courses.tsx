import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Clock, MapPin, Pencil, Plus, Trash2, User, UserPlus, Users } from 'lucide-react';
import { useApp, useData } from '../lib/store';
import type { Batch, Course } from '../lib/types';
import { cx, fmtTime, rupees, WEEKDAYS } from '../lib/format';
import { Badge, Button, Card, EmptyState, Field, IconButton, Input, Modal, PageHeader, Progress, SearchInput, Select, TableWrap, Tabs, Textarea, useUi } from '../components/ui';

export default function Courses() {
  const d = useData();
  const { mutate, isAdmin } = useApp();
  const { toast, confirm } = useUi();
  const [tab, setTab] = useState<'courses' | 'batches'>('courses');
  const [course, setCourse] = useState<Partial<Course> | null>(null);
  const [batch, setBatch] = useState<Partial<Batch> | null>(null);
  const [assign, setAssign] = useState<Batch | null>(null);

  const activeCount = (pred: (s: (typeof d.students)[number]) => boolean) => d.students.filter((s) => s.status === 'Active' && pred(s)).length;
  const unlinked = useMemo(() => {
    const m = new Map<string, number>();
    d.students.filter((s) => s.status === 'Active' && !s.batchId && s.batch.trim()).forEach((s) => { const k = s.batch.trim().replace(/\s+/g, ' '); const key = Array.from(m.keys()).find((x) => x.toLowerCase() === k.toLowerCase()) || k; m.set(key, (m.get(key) || 0) + 1); });
    return Array.from(m);
  }, [d.students]);

  const del = async (kind: 'courses' | 'batches', id: string, name: string) => {
    if (!(await confirm({ title: `Delete ${name}?`, text: 'Only possible when nothing uses it. Otherwise mark it Inactive.', confirmLabel: 'Delete', danger: true }))) return;
    try { await mutate(`${kind}.delete`, { id }); toast('Deleted'); } catch (e) { toast((e as Error).message, 'error'); }
  };

  return (
    <>
      <PageHeader title="Courses & Batches" description="Courses set the default fee; batches set the class schedule."
        actions={isAdmin && <><Button icon={<Plus className="size-4" />} onClick={() => setBatch({ status: 'Active', days: '' })}>New batch</Button><Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setCourse({ status: 'Active' })}>New course</Button></>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'courses', label: 'Courses', count: d.courses.length }, { value: 'batches', label: 'Batches', count: d.batches.length }]} />
      <div className="mt-5">
        {tab === 'courses' && (
          <Card padded={false}>
            {!d.courses.length ? <EmptyState icon={<BookOpen />} title="No courses yet" text="Run the one-time setup in Settings to create Guitar, Ukulele, Piano, Vocal and Indian Classical Music, or add courses yourself." action={isAdmin && <Button variant="primary" onClick={() => setCourse({ status: 'Active' })}>New course</Button>} /> : (
              <TableWrap><table className="table"><thead><tr><th>Course</th><th className="text-right">Monthly fee</th><th className="text-right">Active students</th><th className="text-right">Batches</th><th>Status</th>{isAdmin && <th />}</tr></thead><tbody>
                {d.courses.map((c) => (
                  <tr key={c.id}><td><p className="font-medium">{c.name}</p>{c.description && <p className="text-[12px] faint">{c.description}</p>}</td><td className="num text-right">{c.fee ? rupees(c.fee) : <span className="faint">Not set</span>}</td><td className="num text-right">{activeCount((s) => s.courseId === c.id)}</td><td className="num text-right">{d.batches.filter((b) => b.courseId === c.id).length}</td><td><Badge tone={c.status === 'Active' ? 'green' : 'neutral'}>{c.status}</Badge></td>
                    {isAdmin && <td className="text-right"><IconButton label="Edit" onClick={() => setCourse(c)}><Pencil className="size-4" /></IconButton><IconButton label="Delete" onClick={() => del('courses', c.id, c.name)}><Trash2 className="size-4" /></IconButton></td>}</tr>))}
              </tbody></table></TableWrap>)}
          </Card>
        )}
        {tab === 'batches' && (
          <>
            {unlinked.length > 0 && isAdmin && (
              <Card className="mb-5" title="Batch names from existing student records" action={<span className="text-[12px] faint">Not yet linked to a batch</span>}>
                <div className="flex flex-wrap gap-2">{unlinked.map(([name, n]) => (
                  <button key={name} onClick={() => setBatch({ name, status: 'Active', days: '' })} className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-1 text-[12.5px] hover:bg-[var(--surface-2)]"><Plus className="size-3" />{name}<span className="faint">{n}</span></button>))}</div>
                <p className="mt-3 text-[12px] muted">Create a batch from a name, then use “Add students” to link the students. Their old batch text is kept until you assign them.</p>
              </Card>
            )}
            {!d.batches.length ? <Card><EmptyState icon={<Users />} title="No batches yet" text="A batch is a group that meets on set days and times. Batches drive today's classes and the calendar." action={isAdmin && <Button variant="primary" onClick={() => setBatch({ status: 'Active', days: '' })}>New batch</Button>} /></Card> : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {d.batches.map((b) => {
                  const n = activeCount((s) => s.batchId === b.id), cap = Number(b.capacity) || 0;
                  return (
                    <Card key={b.id} className={b.status !== 'Active' ? 'opacity-70' : ''}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0"><p className="truncate font-semibold">{b.name}</p><p className="text-[12.5px] muted">{d.courses.find((c) => c.id === b.courseId)?.name || '—'}</p></div>
                        {b.status !== 'Active' ? <Badge>Inactive</Badge> : isAdmin && <div className="-mr-2 -mt-1 flex"><IconButton label="Edit batch" onClick={() => setBatch(b)}><Pencil className="size-4" /></IconButton><IconButton label="Delete batch" onClick={() => del('batches', b.id, b.name)}><Trash2 className="size-4" /></IconButton></div>}
                      </div>
                      <ul className="mt-3 space-y-1.5 text-[13px] muted [&_svg]:size-3.5">
                        <li className="flex items-center gap-2"><Clock />{b.days ? `${b.days.replace(/,/g, ', ')} · ${fmtTime(b.startTime)}${b.endTime ? '–' + fmtTime(b.endTime) : ''}` : 'No schedule set'}</li>
                        <li className="flex items-center gap-2"><User />{d.teachers.find((t) => t.id === b.teacherId)?.name || 'No teacher assigned'}</li>
                        {b.location && <li className="flex items-center gap-2"><MapPin />{b.location}</li>}
                      </ul>
                      <div className="mt-4"><div className="mb-1.5 flex justify-between text-[12.5px]"><span className="muted">Capacity</span><span className="num">{n}{cap ? ` / ${cap}` : ' students'}</span></div>{cap > 0 && <Progress value={(n / cap) * 100} tone={n >= cap ? 'red' : n / cap > 0.8 ? 'amber' : 'green'} />}</div>
                      {isAdmin && b.status === 'Active' && <Button size="sm" className="mt-4 w-full" icon={<UserPlus className="size-4" />} onClick={() => setAssign(b)}>Add students</Button>}
                    </Card>);
                })}
              </div>)}
          </>
        )}
      </div>
      <CourseModal value={course} onClose={() => setCourse(null)} />
      <BatchModal value={batch} onClose={() => setBatch(null)} />
      <AssignModal batch={assign} onClose={() => setAssign(null)} />
    </>
  );
}

function CourseModal({ value, onClose }: { value: Partial<Course> | null; onClose: () => void }) {
  const { mutate } = useApp(); const { toast } = useUi();
  const [f, setF] = useState<Partial<Course>>({}); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const [seenValue, setSeenValue] = useState<unknown>(null);
  if (value && value !== seenValue) { setSeenValue(value); setF({ ...value, fee: value.fee ?? ('' as unknown as number) }); setErr(''); } // fill the form in the same render it opens
  if (!value) return null;
  const save = async () => { setBusy(true); setErr(''); try { await mutate('courses.save', f); toast(value.id ? 'Course updated' : 'Course created'); onClose(); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } };
  return (
    <Modal open onClose={onClose} title={value.id ? 'Edit course' : 'New course'} size="sm" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={save}>Save</Button></>}>
      <div className="space-y-4">
        <Field label="Course name"><Input value={f.name || ''} onChange={(e) => setF((x) => ({ ...x, name: e.target.value }))} /></Field>
        <Field label="Default monthly fee (₹)" hint="Used when you pick this course for a student. Existing students keep their own fee."><Input type="number" min={0} value={String(f.fee ?? '')} onChange={(e) => setF((x) => ({ ...x, fee: e.target.value as unknown as number }))} /></Field>
        <Field label="Description"><Textarea rows={2} value={f.description || ''} onChange={(e) => setF((x) => ({ ...x, description: e.target.value }))} /></Field>
        <Field label="Status"><Select value={f.status} onChange={(e) => setF((x) => ({ ...x, status: e.target.value as Course['status'] }))}><option>Active</option><option>Inactive</option></Select></Field>
        {err && <p role="alert" className="text-[13px] text-red-600">{err}</p>}
      </div>
    </Modal>
  );
}

function BatchModal({ value, onClose }: { value: Partial<Batch> | null; onClose: () => void }) {
  const d = useData(); const { mutate } = useApp(); const { toast } = useUi();
  const [f, setF] = useState<Partial<Batch>>({}); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const [seenValue, setSeenValue] = useState<unknown>(null);
  if (value && value !== seenValue) { setSeenValue(value); setF({ capacity: '', ...value }); setErr(''); } // fill the form in the same render it opens
  if (!value) return null;
  const days = (f.days || '').split(',').filter(Boolean);
  const toggleDay = (w: string) => setF((x) => ({ ...x, days: WEEKDAYS.filter((x) => (x === w ? !days.includes(w) : days.includes(x))).join(',') }));
  const save = async () => { setBusy(true); setErr(''); try { await mutate('batches.save', f); toast(value.id ? 'Batch updated' : 'Batch created'); onClose(); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } };
  return (
    <Modal open onClose={onClose} title={value.id ? 'Edit batch' : 'New batch'} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={save}>Save batch</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Batch name" className="sm:col-span-2"><Input value={f.name || ''} onChange={(e) => setF((x) => ({ ...x, name: e.target.value }))} placeholder="e.g. Guitar · Saturday evening" /></Field>
        <Field label="Course"><Select value={f.courseId || ''} onChange={(e) => setF((x) => ({ ...x, courseId: e.target.value }))}><option value="">Choose…</option>{d.courses.filter((c) => c.status === 'Active' || c.id === f.courseId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <Field label="Teacher"><Select value={f.teacherId || ''} onChange={(e) => setF((x) => ({ ...x, teacherId: e.target.value }))}><option value="">Not assigned</option>{d.teachers.filter((t) => t.status === 'Active' || t.id === f.teacherId).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
        <div className="sm:col-span-2"><span className="label">Class days</span><div className="flex flex-wrap gap-1.5">{WEEKDAYS.map((w) => <button key={w} type="button" onClick={() => toggleDay(w)} className={cx('h-9 w-12 rounded-[10px] border text-[13px] font-medium', days.includes(w) ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900' : 'border-[var(--border-strong)] muted')}>{w}</button>)}</div></div>
        <Field label="Start time"><Input type="time" value={f.startTime || ''} onChange={(e) => setF((x) => ({ ...x, startTime: e.target.value }))} /></Field>
        <Field label="End time"><Input type="time" value={f.endTime || ''} onChange={(e) => setF((x) => ({ ...x, endTime: e.target.value }))} /></Field>
        <Field label="Location"><Input value={f.location || ''} onChange={(e) => setF((x) => ({ ...x, location: e.target.value }))} placeholder="e.g. Studio room 1" /></Field>
        <Field label="Capacity" hint="Leave empty for no limit"><Input type="number" min={0} value={String(f.capacity ?? '')} onChange={(e) => setF((x) => ({ ...x, capacity: e.target.value as unknown as number }))} /></Field>
        <Field label="Status"><Select value={f.status} onChange={(e) => setF((x) => ({ ...x, status: e.target.value as Batch['status'] }))}><option>Active</option><option>Inactive</option></Select></Field>
        {err && <p role="alert" className="text-[13px] text-red-600 sm:col-span-2">{err}</p>}
      </div>
    </Modal>
  );
}

function AssignModal({ batch, onClose }: { batch: Batch | null; onClose: () => void }) {
  const d = useData(); const { mutate } = useApp(); const { toast } = useUi();
  const [sel, setSel] = useState<Set<string>>(new Set()); const [q, setQ] = useState(''); const [busy, setBusy] = useState(false); const [onlyCourse, setOnlyCourse] = useState(true);
  useEffect(() => { setSel(new Set()); setQ(''); setOnlyCourse(true); }, [batch]);
  if (!batch) return null;
  const list = d.students.filter((s) => s.status === 'Active' && s.batchId !== batch.id && (!onlyCourse || !s.courseId || s.courseId === batch.courseId) && (!q || `${s.name} ${s.id} ${s.batch}`.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => a.name.localeCompare(b.name));
  const save = async () => { setBusy(true); try { await mutate('batches.assign', { batchId: batch.id, studentIds: Array.from(sel) }); toast(`${sel.size} student(s) added to ${batch.name}`); onClose(); } catch (e) { toast((e as Error).message, 'error'); } finally { setBusy(false); } };
  return (
    <Modal open onClose={onClose} title={`Add students to ${batch.name}`} description="Students are moved from any other batch. Their course is set to this batch's course." footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!sel.size} loading={busy} onClick={save}>Add {sel.size || ''}</Button></>}>
      <div className="mb-3 flex flex-wrap items-center gap-3"><SearchInput className="flex-1" value={q} onChange={setQ} /><label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={onlyCourse} onChange={(e) => setOnlyCourse(e.target.checked)} className="size-4 accent-zinc-900" />Same course only</label></div>
      {!list.length ? <p className="py-6 text-center text-[13px] muted">No students to add.</p> : <ul className="max-h-[50vh] divide-y divide-[var(--border)] overflow-y-auto rounded-[10px] border border-[var(--border)]">{list.map((s) => (
        <li key={s.id}><label className="flex cursor-pointer items-center gap-3 px-3 py-2.5"><input type="checkbox" className="size-4 accent-zinc-900" checked={sel.has(s.id)} onChange={() => { const n = new Set(sel); if (n.has(s.id)) n.delete(s.id); else n.add(s.id); setSel(n); }} /><span className="flex-1 text-[13.5px]">{s.name} <span className="faint">{s.id}</span></span><span className="text-[12px] faint">{d.batches.find((b) => b.id === s.batchId)?.name || s.batch || 'No batch'}</span></label></li>))}</ul>}
    </Modal>
  );
}
