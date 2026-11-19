import { useState } from 'react';
import { GraduationCap, Mail, MessageCircle, Pencil, Phone, Plus, Trash2 } from 'lucide-react';
import { useApp, useData } from '../lib/store';
import type { Teacher } from '../lib/types';
import { attStats, occurrences } from '../lib/derive';
import { addDays, fmtDate, fmtPhone, fmtTime } from '../lib/format';
import { openWhatsApp, waNumber } from '../lib/share';
import { Avatar, Badge, Button, Card, EmptyState, Field, IconButton, Input, Modal, PageHeader, Select, Textarea, useUi } from '../components/ui';

export default function Teachers() {
  const d = useData(); const { mutate, isAdmin } = useApp(); const { toast, confirm } = useUi();
  const [edit, setEdit] = useState<Partial<Teacher> | null>(null);
  const [view, setView] = useState<Teacher | null>(null);
  const del = async (t: Teacher) => {
    if (!(await confirm({ title: `Delete ${t.name}?`, text: 'Only possible when no batch or class uses this teacher. Otherwise mark them Inactive.', confirmLabel: 'Delete', danger: true }))) return;
    try { await mutate('teachers.delete', { id: t.id }); toast('Teacher deleted'); } catch (e) { toast((e as Error).message, 'error'); }
  };
  return (
    <>
      <PageHeader title="Teachers" description={`${d.teachers.filter((t) => t.status === 'Active').length} active teachers`} actions={isAdmin && <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setEdit({ status: 'Active' })}>Add teacher</Button>} />
      {!d.teachers.length ? <Card><EmptyState icon={<GraduationCap />} title="No teachers yet" text="Add teachers, then assign them to batches." action={isAdmin && <Button variant="primary" onClick={() => setEdit({ status: 'Active' })}>Add teacher</Button>} /></Card> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {d.teachers.map((t) => {
            const batches = d.batches.filter((b) => b.teacherId === t.id && b.status === 'Active');
            const students = d.students.filter((s) => s.status === 'Active' && batches.some((b) => b.id === s.batchId)).length;
            return (
              <Card key={t.id}>
                <div className="flex items-start gap-3">
                  <Avatar name={t.name} size={42} />
                  <button className="min-w-0 flex-1 text-left" onClick={() => setView(t)}><p className="truncate font-semibold">{t.name}</p><p className="truncate text-[12.5px] muted">{t.courseIds.split(',').filter(Boolean).map((id) => d.courses.find((c) => c.id === id)?.name).filter(Boolean).join(', ') || 'No courses set'}</p></button>
                  {t.status !== 'Active' ? <Badge>Inactive</Badge> : isAdmin && <div className="-mr-2 -mt-1 flex"><IconButton label="Edit" onClick={() => setEdit(t)}><Pencil className="size-4" /></IconButton><IconButton label="Delete" onClick={() => del(t)}><Trash2 className="size-4" /></IconButton></div>}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-center"><div className="rounded-lg bg-[var(--surface-2)] py-2"><p className="num font-semibold">{batches.length}</p><p className="text-[11.5px] muted">Batches</p></div><div className="rounded-lg bg-[var(--surface-2)] py-2"><p className="num font-semibold">{students}</p><p className="text-[11.5px] muted">Students</p></div></div>
                <Button size="sm" className="mt-3 w-full" onClick={() => setView(t)}>View profile</Button>
              </Card>);
          })}
        </div>)}
      <TeacherModal value={edit} onClose={() => setEdit(null)} />
      <TeacherProfile teacher={view} onClose={() => setView(null)} />
    </>
  );
}

function TeacherProfile({ teacher: t, onClose }: { teacher: Teacher | null; onClose: () => void }) {
  const d = useData();
  if (!t) return null;
  const batches = d.batches.filter((b) => b.teacherId === t.id);
  const studentIds = new Set(d.students.filter((s) => batches.some((b) => b.id === s.batchId)).map((s) => s.id));
  const st = attStats(d.attendance.filter((a) => studentIds.has(a.studentId) && a.date >= addDays(d.meta.today, -30)));
  const week = occurrences(d.batches, d.classes, d.meta.today, addDays(d.meta.today, 6), d.meta.today).filter((o) => o.teacherId === t.id);
  const wa = waNumber(t.whatsapp, t.phone);
  return (
    <Modal open onClose={onClose} title={t.name} description={t.status === 'Active' ? `Teacher since ${t.joinDate ? fmtDate(t.joinDate) : '—'}` : 'Inactive'} size="lg">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2 text-[13.5px]">
          <p className="flex items-center gap-2"><Phone className="size-4 faint" />{t.phone ? fmtPhone(t.phone) : '—'}</p>
          <p className="flex items-center gap-2"><Mail className="size-4 faint" />{t.email || '—'}</p>
          {wa && <Button size="sm" icon={<MessageCircle className="size-4 text-emerald-600" />} onClick={() => openWhatsApp(wa, `Hello ${t.name},\n`)}>WhatsApp</Button>}
          {t.notes && <p className="pt-2 muted">{t.notes}</p>}
          <div className="pt-3"><p className="label">Attendance overview · last 30 days</p><p className="num text-[22px] font-semibold">{st.pct === null ? '—' : `${st.pct}%`}</p><p className="text-[12.5px] muted">{st.present} present · {st.absent} absent · {st.leave} leave across {studentIds.size} students</p></div>
        </div>
        <div>
          <p className="label">Assigned batches</p>
          {!batches.length ? <p className="text-[13px] muted">No batches assigned.</p> : <ul className="mb-4 space-y-2">{batches.map((b) => <li key={b.id} className="rounded-[10px] border border-[var(--border)] px-3 py-2 text-[13px]"><p className="font-medium">{b.name}</p><p className="muted">{b.days ? `${b.days.replace(/,/g, ', ')} · ${fmtTime(b.startTime)}` : 'No schedule'} · {d.students.filter((s) => s.batchId === b.id && s.status === 'Active').length} students</p></li>)}</ul>}
          <p className="label">This week</p>
          {!week.length ? <p className="text-[13px] muted">No classes in the next 7 days.</p> : <ul className="space-y-1.5">{week.map((o) => <li key={o.key} className="flex justify-between text-[13px]"><span>{fmtDate(o.date, { weekday: 'short', day: 'numeric' })} · {fmtTime(o.startTime)}</span><span className="muted">{d.batches.find((b) => b.id === o.batchId)?.name || o.title}</span></li>)}</ul>}
        </div>
      </div>
    </Modal>
  );
}

function TeacherModal({ value, onClose }: { value: Partial<Teacher> | null; onClose: () => void }) {
  const d = useData(); const { mutate } = useApp(); const { toast } = useUi();
  const [f, setF] = useState<Partial<Teacher>>({}); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const [seenValue, setSeenValue] = useState<unknown>(null);
  if (value && value !== seenValue) { setSeenValue(value); setF(value); setErr(''); } // fill the form in the same render it opens
  if (!value) return null;
  const ids = (f.courseIds || '').split(',').filter(Boolean);
  const save = async () => { setBusy(true); setErr(''); try { await mutate('teachers.save', f); toast(value.id ? 'Teacher updated' : 'Teacher added'); onClose(); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } };
  return (
    <Modal open onClose={onClose} title={value.id ? 'Edit teacher' : 'Add teacher'} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={save}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" className="sm:col-span-2"><Input value={f.name || ''} onChange={(e) => setF((x) => ({ ...x, name: e.target.value }))} /></Field>
        <Field label="Phone"><Input type="tel" value={f.phone || ''} onChange={(e) => setF((x) => ({ ...x, phone: e.target.value }))} /></Field>
        <Field label="WhatsApp" hint="If different from phone"><Input type="tel" value={f.whatsapp || ''} onChange={(e) => setF((x) => ({ ...x, whatsapp: e.target.value }))} /></Field>
        <Field label="Email"><Input type="email" value={f.email || ''} onChange={(e) => setF((x) => ({ ...x, email: e.target.value }))} /></Field>
        <Field label="Joined"><Input type="date" value={f.joinDate || ''} onChange={(e) => setF((x) => ({ ...x, joinDate: e.target.value }))} /></Field>
        <div className="sm:col-span-2"><span className="label">Courses taught</span><div className="flex flex-wrap gap-2">{d.courses.map((c) => <label key={c.id} className="flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-1 text-[13px]"><input type="checkbox" className="accent-zinc-900" checked={ids.includes(c.id)} onChange={() => setF((x) => ({ ...x, courseIds: (ids.includes(c.id) ? ids.filter((x) => x !== c.id) : [...ids, c.id]).join(',') }))} />{c.name}</label>)}</div></div>
        <Field label="Status"><Select value={f.status} onChange={(e) => setF((x) => ({ ...x, status: e.target.value as Teacher['status'] }))}><option>Active</option><option>Inactive</option></Select></Field>
        <Field label="Notes" className="sm:col-span-2"><Textarea rows={2} value={f.notes || ''} onChange={(e) => setF((x) => ({ ...x, notes: e.target.value }))} /></Field>
        {err && <p role="alert" className="text-[13px] text-red-600 sm:col-span-2">{err}</p>}
      </div>
    </Modal>
  );
}
