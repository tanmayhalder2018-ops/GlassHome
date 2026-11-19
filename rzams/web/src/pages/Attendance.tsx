import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, CheckCheck, Download, Save } from 'lucide-react';
import { useApp, useData } from '../lib/store';
import type { AttendanceStatus } from '../lib/types';
import { attStats, occurrences } from '../lib/derive';
import { addDays, cx, fmtDate, fmtTime, monthIndexOfIso, monthLabel } from '../lib/format';
import { downloadCsv } from '../lib/share';
import { Avatar, Badge, Button, Card, EmptyState, Field, Input, PageHeader, Progress, Select, TableWrap, Tabs, useUi } from '../components/ui';

const OPTS: { v: AttendanceStatus; label: string; on: string }[] = [
  { v: 'Present', label: 'P', on: 'bg-emerald-600 text-white border-emerald-600' },
  { v: 'Absent', label: 'A', on: 'bg-red-600 text-white border-red-600' },
  { v: 'Leave', label: 'L', on: 'bg-sky-600 text-white border-sky-600' },
];

export default function Attendance() {
  const [tab, setTab] = useState<'daily' | 'monthly' | 'history'>('daily');
  return (
    <>
      <PageHeader title="Attendance" description="One entry per student per day. Saving again updates the same entry." />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'daily', label: 'Daily attendance' }, { value: 'monthly', label: 'Monthly report' }, { value: 'history', label: 'Student history' }]} />
      <div className="mt-5">{tab === 'daily' ? <Daily /> : tab === 'monthly' ? <Monthly /> : <History />}</div>
    </>
  );
}

function Daily() {
  const d = useData(); const { mutate } = useApp(); const { toast } = useUi();
  const [date, setDate] = useState(d.meta.today);
  const [batch, setBatch] = useState('');
  const [marks, setMarks] = useState<Record<string, AttendanceStatus | ''>>({});
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const saved = useMemo(() => { const m: Record<string, AttendanceStatus> = {}; d.attendance.filter((a) => a.date === date).forEach((a) => { m[a.studentId] = a.status; }); return m; }, [d.attendance, date]);
  useEffect(() => { setMarks({ ...saved }); setDirty(false); }, [saved, date]);
  const list = d.students.filter((s) => s.status === 'Active' && (!batch || (batch === '__none' ? !s.batchId : s.batchId === batch))).sort((a, b) => a.name.localeCompare(b.name));
  const classes = occurrences(d.batches, d.classes, date, date, d.meta.today);
  const counts = { Present: 0, Absent: 0, Leave: 0 } as Record<AttendanceStatus, number>;
  list.forEach((s) => { const v = marks[s.id]; if (v) counts[v]++; });
  const set = (id: string, v: AttendanceStatus) => { setMarks((m) => ({ ...m, [id]: m[id] === v ? '' : v })); setDirty(true); };
  const restPresent = () => { setMarks((m) => { const n = { ...m }; list.forEach((s) => { if (!n[s.id]) n[s.id] = 'Present'; }); return n; }); setDirty(true); };
  const save = async () => {
    const records = list.filter((s) => marks[s.id]).map((s) => ({ studentId: s.id, status: marks[s.id] }));
    if (!records.length) { toast('Mark at least one student.', 'error'); return; }
    setBusy(true);
    try { const r = await mutate<{ counts: Record<AttendanceStatus, number> }>('attendance.save', { date, batchId: batch && batch !== '__none' ? batch : '', records }); toast(`Saved · ${r.counts.Present} present, ${r.counts.Absent} absent, ${r.counts.Leave} leave`); setDirty(false); }
    catch (e) { toast((e as Error).message, 'error'); } finally { setBusy(false); }
  };

  return (
    <Card padded={false}>
      <div className="flex flex-wrap items-end gap-3 border-b border-[var(--border)] p-4">
        <Field label="Date"><Input type="date" value={date} max={d.meta.today} onChange={(e) => e.target.value && setDate(e.target.value > d.meta.today ? d.meta.today : e.target.value)} className="w-[170px]" data-testid="att-date" /></Field>
        <Field label="Batch"><Select value={batch} onChange={(e) => setBatch(e.target.value)} className="w-[220px]"><option value="">All active students</option>{d.batches.filter((b) => b.status === 'Active').map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}<option value="__none">Not in a batch</option></Select></Field>
        <div className="flex flex-1 flex-wrap justify-end gap-2">
          <Button icon={<CheckCheck className="size-4" />} onClick={restPresent} data-testid="att-rest">Mark rest present</Button>
          <Button variant="primary" icon={<Save className="size-4" />} loading={busy} onClick={save} data-testid="att-save">{dirty ? 'Save changes' : 'Save'}</Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-[var(--border)] px-4 py-2.5 text-[12.5px]" data-testid="att-summary">
        <span><b className="num">{counts.Present}</b> <span className="muted">present</span></span><span><b className="num">{counts.Absent}</b> <span className="muted">absent</span></span><span><b className="num">{counts.Leave}</b> <span className="muted">leave</span></span><span className="muted">{list.length - counts.Present - counts.Absent - counts.Leave} not marked</span>
        {dirty && <Badge tone="amber">Unsaved changes</Badge>}
        {classes.length > 0 && <span className="ml-auto faint">Classes this day: {classes.map((o) => `${d.batches.find((b) => b.id === o.batchId)?.name || o.title} ${fmtTime(o.startTime)}${o.status === 'Cancelled' ? ' (cancelled)' : ''}`).join(' · ')}</span>}
      </div>
      {!list.length ? <EmptyState icon={<CalendarCheck />} title="No students in this batch" /> : (
        <ul className="divide-y divide-[var(--border)]">{list.map((s) => (
          <li key={s.id} className="flex items-center gap-3 px-4 py-2.5" data-testid="att-row">
            <Avatar name={s.name} src={s.photo} size={32} />
            <div className="min-w-0 flex-1"><p className="truncate text-[13.5px] font-medium">{s.name}</p><p className="truncate text-[12px] faint">{s.id} · {d.batches.find((b) => b.id === s.batchId)?.name || s.batch || 'No batch'}</p></div>
            <div className="flex gap-1.5" role="radiogroup" aria-label={`Attendance for ${s.name}`}>
              {OPTS.map((o) => <button key={o.v} type="button" role="radio" aria-checked={marks[s.id] === o.v} aria-label={o.v} title={o.v} onClick={() => set(s.id, o.v)} className={cx('size-9 rounded-[10px] border text-[13px] font-semibold transition-colors', marks[s.id] === o.v ? o.on : 'border-[var(--border-strong)] text-[var(--text-2)] hover:bg-[var(--surface-2)]')}>{o.label}</button>)}
            </div>
          </li>))}</ul>)}
    </Card>
  );
}

function Monthly() {
  const d = useData();
  const cur = d.meta.currentMonthIndex;
  const [month, setMonth] = useState(cur);
  const [batch, setBatch] = useState('');
  const rows = d.students.filter((s) => (s.status === 'Active' || d.attendance.some((a) => a.studentId === s.id && monthIndexOfIso(a.date) === month)) && (!batch || s.batchId === batch))
    .map((s) => ({ s, st: attStats(d.attendance.filter((a) => a.studentId === s.id && monthIndexOfIso(a.date) === month)) }))
    .sort((a, b) => (b.st.pct ?? -1) - (a.st.pct ?? -1) || a.s.name.localeCompare(b.s.name));
  const days = new Set(d.attendance.filter((a) => monthIndexOfIso(a.date) === month).map((a) => a.date)).size;
  const exportCsv = () => downloadCsv([['Student ID', 'Name', 'Present', 'Absent', 'Leave', 'Attendance %'], ...rows.map((r) => [r.s.id, r.s.name, r.st.present, r.st.absent, r.st.leave, r.st.pct ?? ''])], `attendance_${monthLabel(month).replace(' ', '-')}.csv`);
  return (
    <Card padded={false}>
      <div className="flex flex-wrap items-end gap-3 border-b border-[var(--border)] p-4">
        <Field label="Month"><Select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="w-[180px]">{Array.from({ length: 12 }, (_, i) => cur - i).map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</Select></Field>
        <Field label="Batch"><Select value={batch} onChange={(e) => setBatch(e.target.value)} className="w-[200px]"><option value="">All</option>{d.batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>
        <span className="pb-2 text-[12.5px] muted">{days} day(s) with attendance</span>
        <Button className="ml-auto" icon={<Download className="size-4" />} onClick={exportCsv}>Export CSV</Button>
      </div>
      <TableWrap><table className="table"><thead><tr><th>Student</th><th className="text-right">Present</th><th className="text-right">Absent</th><th className="text-right">Leave</th><th className="w-[220px]">Attendance</th></tr></thead><tbody>
        {rows.map((r) => <tr key={r.s.id}><td><p className="font-medium">{r.s.name}</p><p className="text-[12px] faint">{r.s.id}</p></td><td className="num text-right">{r.st.present}</td><td className="num text-right">{r.st.absent}</td><td className="num text-right">{r.st.leave}</td><td>{r.st.pct === null ? <span className="faint">No records</span> : <div className="flex items-center gap-3"><Progress value={r.st.pct} tone={r.st.pct >= 75 ? 'green' : r.st.pct >= 50 ? 'amber' : 'red'} /><span className="num w-10 text-right text-[12.5px]">{r.st.pct}%</span></div>}</td></tr>)}
      </tbody></table></TableWrap>
    </Card>
  );
}

function History() {
  const d = useData();
  const [sid, setSid] = useState(d.students.find((s) => s.status === 'Active')?.id || '');
  const [from, setFrom] = useState(addDays(d.meta.today, -90));
  const [to, setTo] = useState(d.meta.today);
  const rows = d.attendance.filter((a) => a.studentId === sid && a.date >= from && a.date <= to).sort((a, b) => b.date.localeCompare(a.date));
  const st = attStats(rows);
  return (
    <Card padded={false}>
      <div className="flex flex-wrap items-end gap-3 border-b border-[var(--border)] p-4">
        <Field label="Student"><Select value={sid} onChange={(e) => setSid(e.target.value)} className="w-[240px]">{[...d.students].sort((a, b) => a.name.localeCompare(b.name)).map((s) => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}</Select></Field>
        <Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[160px]" /></Field>
        <Field label="To"><Input type="date" value={to} max={d.meta.today} onChange={(e) => setTo(e.target.value)} className="w-[160px]" /></Field>
        <div className="ml-auto pb-1 text-right"><p className="num text-[20px] font-semibold">{st.pct === null ? '—' : `${st.pct}%`}</p><p className="text-[12px] muted">{st.present} present · {st.absent} absent · {st.leave} leave</p></div>
      </div>
      {!rows.length ? <EmptyState title="No attendance in this period" /> : <TableWrap><table className="table"><thead><tr><th>Date</th><th>Status</th><th>Batch</th><th>Marked</th></tr></thead><tbody>{rows.map((a) => (
        <tr key={a.date}><td>{fmtDate(a.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</td><td><Badge tone={a.status === 'Present' ? 'green' : a.status === 'Absent' ? 'red' : 'blue'}>{a.status}</Badge></td><td className="muted">{d.batches.find((b) => b.id === a.batchId)?.name || '—'}</td><td className="muted">{a.markedBy || '—'}</td></tr>))}</tbody></table></TableWrap>}
    </Card>
  );
}
