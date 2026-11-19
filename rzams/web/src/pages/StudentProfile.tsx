import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Archive, ArchiveRestore, ArrowLeft, Bell, CalendarDays, FileText, Mail, MapPin, MessageCircle, Pencil, Phone, Trash2, Wallet } from 'lucide-react';
import { useApp, useData } from '../lib/store';
import type { Payment } from '../lib/types';
import { attStats, batchOf, courseName, occurrences, payStatus } from '../lib/derive';
import { addDays, fmtDate, fmtPhone, fmtTime, monthIndexOfIso, monthLabel, rupees } from '../lib/format';
import { waNumber, openWhatsApp } from '../lib/share';
import { Avatar, Badge, Button, Card, EmptyState, Progress, StatCard, TableWrap, Tabs, useUi } from '../components/ui';
import StudentForm from '../components/StudentForm';
import { InvoiceDialog, PaymentForm, ReminderDialog } from '../components/finance';
import { payTone } from './Students';

type Tab = 'overview' | 'attendance' | 'payments' | 'dues' | 'schedule';

export default function StudentProfile() {
  const { id = '' } = useParams();
  const d = useData();
  const { mutate, isAdmin } = useApp();
  const { toast, confirm } = useUi();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');
  const [editing, setEditing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [invoice, setInvoice] = useState<Payment | null>(null);
  const [remind, setRemind] = useState(false);
  const s = d.students.find((x) => x.id === id);

  const att = useMemo(() => d.attendance.filter((a) => a.studentId === id).sort((a, b) => b.date.localeCompare(a.date)), [d.attendance, id]);
  const pays = useMemo(() => d.payments.filter((p) => p.studentId === id).sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt)), [d.payments, id]);
  const dues = useMemo(() => d.pending.filter((p) => p.studentId === id).sort((a, b) => a.monthIndex - b.monthIndex), [d.pending, id]);
  const fees = useMemo(() => d.fees.filter((f) => f.studentId === id), [d.fees, id]);

  if (!s) return <Card><EmptyState title="Student not found" text="They may have been deleted." action={<Link to="/students"><Button>Back to students</Button></Link>} /></Card>;
  const batch = batchOf(d, s);
  const teacher = batch ? d.teachers.find((t) => t.id === batch.teacherId) : undefined;
  const due = dues.reduce((a, p) => a + p.due, 0);
  const totalPaid = pays.filter((p) => p.status !== 'Void').reduce((a, p) => a + Number(p.amount), 0);
  const st = attStats(att);
  const cur = d.meta.currentMonthIndex;
  const thisMonth = attStats(att.filter((a) => monthIndexOfIso(a.date) === cur));
  const ps = payStatus(d, s);
  const wa = waNumber(s.whatsapp, s.phone);
  const upcoming = batch ? occurrences([batch], d.classes, d.meta.today, addDays(d.meta.today, 20), d.meta.today).slice(0, 8) : [];
  const byMonth = new Map<number, ReturnType<typeof attStats>>();
  Array.from(new Set(att.map((a) => monthIndexOfIso(a.date)))).sort((a, b) => b - a).forEach((m) => byMonth.set(m, attStats(att.filter((a) => monthIndexOfIso(a.date) === m))));

  const archive = async () => {
    const restore = s.status !== 'Active';
    if (!restore && !(await confirm({ title: `Archive ${s.name}?`, text: 'They will be marked Inactive and stop appearing in active lists and pending fees. All payment and attendance history is kept. You can restore them any time.', confirmLabel: 'Archive' }))) return;
    try { await mutate('students.archive', { id: s.id, restore }); toast(restore ? 'Student restored' : 'Student archived'); } catch (e) { toast((e as Error).message, 'error'); }
  };
  const del = async () => {
    if (!(await confirm({ title: `Delete ${s.name} permanently?`, text: 'This removes the student row from the database. Only possible when the student has no payments, fees or attendance.', confirmLabel: 'Delete permanently', danger: true, requireText: s.id }))) return;
    try { await mutate('students.delete', { id: s.id }); toast('Student deleted'); nav('/students'); } catch (e) { toast((e as Error).message, 'error'); }
  };
  const hasHistory = pays.length || fees.length || att.length;

  return (
    <>
      <Link to="/students" className="no-print mb-4 inline-flex items-center gap-1.5 text-[13px] muted hover:text-[var(--text)]"><ArrowLeft className="size-4" />Students</Link>
      <Card className="mb-5">
        <div className="flex flex-col gap-5 md:flex-row md:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <Avatar name={s.name} src={s.photo} size={64} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><h1 className="truncate text-[20px] font-semibold tracking-tight" data-testid="profile-name">{s.name}</h1><Badge tone={s.status === 'Active' ? 'green' : 'neutral'}>{s.status === 'Active' ? 'Active' : 'Archived'}</Badge><Badge tone={payTone(ps)} dot>{ps}</Badge></div>
              <p className="mt-0.5 text-[13px] muted">{s.id} · {courseName(d, s)}{(batch?.name || s.batch) && ` · ${batch?.name || s.batch}`}</p>
            </div>
          </div>
          <div className="no-print flex flex-wrap gap-2">
            {wa && <Button icon={<MessageCircle className="size-4 text-emerald-600" />} onClick={() => openWhatsApp(wa, `Hello ${s.name},\n`)}>WhatsApp</Button>}
            {s.status === 'Active' && <Button variant="primary" icon={<Wallet className="size-4" />} onClick={() => setPaying(true)} data-testid="profile-pay">Record payment</Button>}
            <Button icon={<Pencil className="size-4" />} onClick={() => setEditing(true)} data-testid="profile-edit">Edit</Button>
            <Button icon={s.status === 'Active' ? <Archive className="size-4" /> : <ArchiveRestore className="size-4" />} onClick={archive} data-testid="profile-archive">{s.status === 'Active' ? 'Archive' : 'Restore'}</Button>
            {isAdmin && !hasHistory && <Button variant="ghost" className="text-red-600" icon={<Trash2 className="size-4" />} onClick={del}>Delete</Button>}
          </div>
        </div>
      </Card>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Outstanding dues" value={rupees(due)} sub={dues.length ? `${dues.length} unpaid month(s)` : 'All paid up'} tone={due > 0 ? 'red' : 'green'} icon={<Wallet />} />
        <StatCard label="Total paid" value={rupees(totalPaid)} sub={`${pays.filter((p) => p.status !== 'Void').length} payment(s)`} icon={<FileText />} />
        <StatCard label="Attendance" value={st.pct === null ? '—' : `${st.pct}%`} sub={`${st.present} present · ${st.absent} absent · ${st.leave} leave`} tone="blue" icon={<CalendarDays />} />
        <StatCard label="Monthly fee" value={rupees(s.fee)} sub={`Since ${fmtDate(s.joinDate)}`} icon={<Wallet />} />
      </div>

      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'overview', label: 'Overview' }, { value: 'attendance', label: 'Attendance', count: att.length }, { value: 'payments', label: 'Payments & invoices', count: pays.length }, { value: 'dues', label: 'Dues', count: dues.length }, { value: 'schedule', label: 'Schedule' }]} />
      <div className="mt-5">
        {tab === 'overview' && (
          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Personal information">
              <dl className="grid gap-3 text-[13.5px]">
                <Info icon={<Phone />} k="Phone" v={fmtPhone(s.phone)} />
                <Info icon={<MessageCircle />} k="WhatsApp" v={s.whatsapp ? fmtPhone(s.whatsapp) : 'Same as phone'} />
                <Info icon={<Mail />} k="Email" v={s.email || '—'} />
                <Info icon={<MapPin />} k="Address" v={s.address || '—'} />
                <Info k="Parent / guardian" v={s.parentName || '—'} />
                <Info k="Admission date" v={fmtDate(s.joinDate)} />
                {s.notes && <Info k="Notes" v={s.notes} />}
              </dl>
            </Card>
            <Card title="Course information">
              <dl className="grid gap-3 text-[13.5px]">
                <Info k="Course" v={courseName(d, s)} />
                <Info k="Batch" v={batch ? batch.name : s.batch ? `${s.batch} (not linked to a batch)` : 'Not assigned'} />
                {batch && <Info k="Class time" v={batch.days ? `${batch.days.replace(/,/g, ', ')} · ${fmtTime(batch.startTime)}–${fmtTime(batch.endTime)}` : '—'} />}
                {batch?.location && <Info k="Location" v={batch.location} />}
                <Info k="Teacher" v={teacher?.name || '—'} />
                <Info k="Monthly fee" v={rupees(s.fee)} />
                <Info k="This month's attendance" v={thisMonth.pct === null ? 'No classes marked yet' : `${thisMonth.pct}% (${thisMonth.present}/${thisMonth.present + thisMonth.absent})`} />
              </dl>
            </Card>
          </div>
        )}

        {tab === 'attendance' && (
          <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
            <Card title="By month">
              {!byMonth.size ? <p className="text-[13px] muted">No attendance recorded.</p> : <ul className="space-y-3">{Array.from(byMonth).map(([m, x]) => (
                <li key={m}><div className="mb-1 flex justify-between text-[13px]"><span>{monthLabel(m)}</span><span className="num muted">{x.pct === null ? '—' : `${x.pct}%`} · {x.present}/{x.present + x.absent}{x.leave ? ` · ${x.leave} leave` : ''}</span></div><Progress value={x.pct ?? 0} tone={(x.pct ?? 0) >= 75 ? 'green' : (x.pct ?? 0) >= 50 ? 'amber' : 'red'} /></li>))}</ul>}
            </Card>
            <Card padded={false} title="History">
              {!att.length ? <EmptyState title="No attendance yet" /> : <TableWrap><table className="table"><thead><tr><th>Date</th><th>Status</th><th>Marked by</th></tr></thead><tbody>{att.map((a) => (
                <tr key={a.date}><td>{fmtDate(a.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</td><td><Badge tone={a.status === 'Present' ? 'green' : a.status === 'Absent' ? 'red' : 'blue'}>{a.status}</Badge></td><td className="muted">{a.markedBy || '—'}</td></tr>))}</tbody></table></TableWrap>}
            </Card>
          </div>
        )}

        {tab === 'payments' && (
          <Card padded={false} title="Payment & invoice history" action={s.status === 'Active' && <Button size="sm" onClick={() => setPaying(true)}>Record payment</Button>}>
            {!pays.length ? <EmptyState icon={<Wallet />} title="No payments yet" /> : <TableWrap><table className="table"><thead><tr><th>Date</th><th>Invoice</th><th>Months</th><th>Method</th><th className="text-right">Amount</th><th className="text-right">Balance after</th><th>Status</th></tr></thead><tbody>{pays.map((p) => (
              <tr key={p.id} className="clickable" onClick={() => setInvoice(p)}><td>{fmtDate(p.date)}</td><td className="font-medium">{p.invoiceNo || <span className="faint">Imported</span>}</td><td className="muted">{p.months}</td><td className="muted">{p.method}</td><td className="num text-right">{rupees(p.amount)}</td><td className="num text-right muted">{p.remaining === '' ? '—' : rupees(p.remaining)}</td><td><Badge tone={p.status === 'Void' ? 'red' : p.status === 'Partial' ? 'amber' : p.status === 'Legacy' ? 'neutral' : 'green'}>{p.status}</Badge></td></tr>))}</tbody></table></TableWrap>}
          </Card>
        )}

        {tab === 'dues' && (
          <Card padded={false} title="Outstanding dues" action={due > 0 && <div className="flex gap-2"><Button size="sm" icon={<Bell className="size-3.5" />} onClick={() => setRemind(true)}>Remind</Button><Button size="sm" variant="primary" onClick={() => setPaying(true)}>Collect</Button></div>}>
            {!dues.length ? <EmptyState title="No dues" text="This student is fully paid up." /> : <TableWrap><table className="table"><thead><tr><th>Month</th><th className="text-right">Fee</th><th className="text-right">Paid</th><th className="text-right">Due</th></tr></thead><tbody>{dues.map((p) => (
              <tr key={p.month}><td>{p.month}{p.monthIndex < cur && <span className="ml-2"><Badge tone="red">overdue</Badge></span>}</td><td className="num text-right">{rupees(p.amount)}</td><td className="num text-right muted">{rupees(p.paid)}</td><td className="num text-right font-medium text-red-600 dark:text-red-400">{rupees(p.due)}</td></tr>))}
              <tr><td className="font-semibold">Total</td><td /><td /><td className="num text-right font-semibold">{rupees(due)}</td></tr></tbody></table></TableWrap>}
          </Card>
        )}

        {tab === 'schedule' && (
          <Card title={batch ? `${batch.name} · next 3 weeks` : 'Class schedule'}>
            {!batch ? <p className="text-[13px] muted">Assign this student to a batch to see their class schedule.</p> : !upcoming.length ? <p className="text-[13px] muted">No classes scheduled. Set the batch days and time in Courses &amp; Batches.</p> : (
              <ul className="divide-y divide-[var(--border)]">{upcoming.map((o) => (
                <li key={o.key} className="flex items-center justify-between py-2.5 text-[13.5px]"><span>{fmtDate(o.date, { weekday: 'short', day: 'numeric', month: 'short' })}</span><span className="muted">{fmtTime(o.startTime)}{o.endTime && `–${fmtTime(o.endTime)}`}{o.location && ` · ${o.location}`}</span><Badge tone={o.status === 'Cancelled' ? 'red' : o.status === 'Completed' ? 'neutral' : 'blue'}>{o.status}</Badge></li>))}</ul>)}
          </Card>
        )}
      </div>

      <StudentForm open={editing} onClose={() => setEditing(false)} student={s} />
      <PaymentForm open={paying} onClose={() => setPaying(false)} studentId={s.id} onRecorded={(p) => { setPaying(false); setInvoice(p); }} />
      <InvoiceDialog payment={invoice} onClose={() => setInvoice(null)} />
      {remind && <ReminderDialog target={{ student: s, amount: due, months: dues.map((x) => x.month).join(', ') }} onClose={() => setRemind(false)} />}
    </>
  );
}

function Info({ k, v, icon }: { k: string; v: string; icon?: React.ReactNode }) {
  return <div className="grid grid-cols-[130px_1fr] items-start gap-3"><dt className="flex items-center gap-2 muted [&>svg]:size-3.5">{icon}{k}</dt><dd className="break-words">{v}</dd></div>;
}
