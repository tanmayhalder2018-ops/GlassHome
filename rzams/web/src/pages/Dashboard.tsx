import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, BadgeIndianRupee, CalendarCheck, CalendarDays, Clock, HandCoins, IndianRupee, Plus, UserCheck, UserMinus, UserPlus, Users, Wallet } from 'lucide-react';
import { useApp, useData } from '../lib/store';
import type { Payment } from '../lib/types';
import { attStats, dueSummaries, expensesByMonth, lastMonths, occurrences, revenueByMonth, upcomingDues, validPayments, weekStart } from '../lib/derive';
import { addDays, compactRupees, fmtDate, fmtTime, monthIndexOfIso, monthLabel, rupees, shortMonth } from '../lib/format';
import { Avatar, Badge, Button, Card, EmptyState, PageHeader, StatCard } from '../components/ui';
import { Bars, HBars, Lines } from '../components/charts';
import { InvoiceDialog, PaymentForm } from '../components/finance';

export default function Dashboard() {
  const d = useData();
  const { isAdmin, user } = useApp();
  const nav = useNavigate();
  const [paying, setPaying] = useState(false);
  const [invoice, setInvoice] = useState<Payment | null>(null);
  const today = d.meta.today, cur = d.meta.currentMonthIndex;

  const m = useMemo(() => {
    const active = d.students.filter((s) => s.status === 'Active');
    const rev = revenueByMonth(d.payments), exp = expensesByMonth(d);
    const months = lastMonths(cur, 12);
    const valid = validPayments(d.payments);
    const dues = dueSummaries(d);
    const occToday = occurrences(d.batches, d.classes, today, today, today);
    const occNext = occurrences(d.batches, d.classes, addDays(today, 1), addDays(today, 7), today).filter((o) => o.status !== 'Cancelled');
    const attToday = attStats(d.attendance.filter((a) => a.date === today));
    const attMonth = attStats(d.attendance.filter((a) => monthIndexOfIso(a.date) === cur));
    // student growth: students admitted on or before the end of each month (excluding those archived before then is not tracked, so this is total enrolled)
    const growth = months.map((mi) => ({ m: shortMonth(mi), students: d.students.filter((s) => monthIndexOfIso(s.joinDate) <= mi).length, new: d.students.filter((s) => monthIndexOfIso(s.joinDate) === mi).length }));
    const courseCounts = new Map<string, number>();
    active.forEach((s) => { const n = d.courses.find((c) => c.id === s.courseId)?.name || s.instrument || 'Not set'; courseCounts.set(n, (courseCounts.get(n) || 0) + 1); });
    const weeks = Array.from({ length: 8 }, (_, i) => addDays(weekStart(today), -7 * (7 - i)));
    const attWeeks = weeks.map((w) => { const rows = d.attendance.filter((a) => a.date >= w && a.date < addDays(w, 7)); const s = attStats(rows); return { w: fmtDate(w, { day: 'numeric', month: 'short' }), Present: s.present, Absent: s.absent, Leave: s.leave }; });
    const methods = new Map<string, number>();
    valid.filter((p) => monthIndexOfIso(p.date) === cur).forEach((p) => methods.set(p.method || 'Other', (methods.get(p.method || 'Other') || 0) + Number(p.amount)));
    return {
      active, months, valid, dues, occToday, occNext, attToday, attMonth, growth, attWeeks,
      inactive: d.students.length - active.length,
      newAdmissions: d.students.filter((s) => monthIndexOfIso(s.joinDate) === cur).length,
      revenueThisMonth: rev.get(cur) || 0, revenuePrev: rev.get(cur - 1) || 0,
      totalCollected: valid.reduce((a, p) => a + Number(p.amount), 0),
      outstanding: d.pending.reduce((a, p) => a + p.due, 0),
      revData: months.map((mi) => ({ m: shortMonth(mi), Revenue: rev.get(mi) || 0, Expenses: exp.get(mi) || 0 })),
      courses: Array.from(courseCounts, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      methods: Array.from(methods, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      recentPays: [...d.payments].filter((p) => p.status !== 'Legacy').sort((a, b) => (b.createdAt || b.date).localeCompare(a.createdAt || a.date)).slice(0, 6),
      recentAdmissions: [...d.students].sort((a, b) => b.joinDate.localeCompare(a.joinDate)).slice(0, 5),
      upcoming: upcomingDues(d),
    };
  }, [d, cur, today]);

  const change = m.revenuePrev ? Math.round(((m.revenueThisMonth - m.revenuePrev) / m.revenuePrev) * 100) : null;
  const hour = new Date().getHours();
  return (
    <>
      <PageHeader title={`Good ${hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'}, ${user?.name?.split(' ')[0] || ''}`} description={`${fmtDate(today, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · ${d.settings.academyName}`}
        actions={<><Link to="/attendance"><Button icon={<CalendarCheck className="size-4" />}>Mark attendance</Button></Link><Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setPaying(true)} data-testid="dash-pay">Record payment</Button></>} />

      {!d.meta.setupDone && isAdmin && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13.5px] text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertCircle className="size-4 shrink-0" /><span className="flex-1">Finish the one-time setup to create courses and import existing payments into reports.</span><Link to="/settings?tab=data"><Button size="sm">Open setup</Button></Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4" data-testid="kpis">
        <StatCard label="Total students" value={d.students.length} sub={`${m.active.length} active · ${m.inactive} inactive`} icon={<Users />} onClick={() => nav('/students')} />
        <StatCard label="Active students" value={m.active.length} icon={<UserCheck />} tone="green" sub={`${m.inactive} archived`} onClick={() => nav('/students')} />
        <StatCard label="New admissions" value={m.newAdmissions} icon={<UserPlus />} tone="violet" sub={`in ${monthLabel(cur)}`} />
        <StatCard label="Inactive students" value={m.inactive} icon={<UserMinus />} sub="Archived records kept" />
        <StatCard label="Monthly revenue" value={rupees(m.revenueThisMonth)} icon={<IndianRupee />} tone="blue" sub={change === null ? monthLabel(cur) : `${change >= 0 ? '+' : ''}${change}% vs last month`} onClick={() => nav('/payments')} />
        <StatCard label="Total fees collected" value={rupees(m.totalCollected)} icon={<BadgeIndianRupee />} sub={`${m.valid.length} payments recorded`} />
        <StatCard label="Pending payments" value={m.dues.length} icon={<HandCoins />} tone="amber" sub={`${m.dues.filter((x) => x.overdue).length} overdue students`} onClick={() => nav('/reminders')} />
        <StatCard label="Outstanding dues" value={rupees(m.outstanding)} icon={<Wallet />} tone="red" sub={`${d.pending.length} unpaid month(s)`} onClick={() => nav('/payments?tab=outstanding')} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card title="Monthly revenue" className="xl:col-span-2" action={<span className="text-[12px] faint">Last 12 months · by payment date</span>}>
          <Bars data={m.revData} xKey="m" series={isAdmin ? [{ key: 'Revenue', name: 'Revenue' }, { key: 'Expenses', name: 'Expenses' }] : [{ key: 'Revenue', name: 'Revenue' }]} fmt={rupees} yFmt={compactRupees} height={240} label="Monthly revenue bar chart" />
        </Card>
        <Card title="Today's classes" action={<Link to="/schedule" className="text-[12.5px] muted hover:text-[var(--text)]">Schedule</Link>}>
          {!m.occToday.length ? <EmptyState icon={<CalendarDays />} title="No classes today" text={d.batches.length ? undefined : 'Create batches with days and times to build the schedule.'} /> : (
            <ul className="divide-y divide-[var(--border)]">{m.occToday.map((o) => {
              const b = d.batches.find((x) => x.id === o.batchId);
              return <li key={o.key} className="flex items-center gap-3 py-2.5"><span className="num w-[68px] shrink-0 text-[12.5px] font-medium">{fmtTime(o.startTime)}</span><span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-medium">{b?.name || o.title}</span><span className="block truncate text-[12px] faint">{d.teachers.find((t) => t.id === o.teacherId)?.name || 'No teacher'}{o.location && ` · ${o.location}`}</span></span><Badge tone={o.status === 'Cancelled' ? 'red' : o.status === 'Ongoing' ? 'green' : o.status === 'Completed' ? 'neutral' : 'blue'}>{o.status}</Badge></li>;
            })}</ul>)}
          {m.occNext.length > 0 && <div className="mt-3 border-t border-[var(--border)] pt-3"><p className="mb-2 text-[12px] font-medium uppercase tracking-wide faint">Upcoming · next 7 days</p><ul className="space-y-1.5">{m.occNext.slice(0, 4).map((o) => <li key={o.key} className="flex justify-between text-[12.5px]"><span className="truncate">{d.batches.find((x) => x.id === o.batchId)?.name || o.title}</span><span className="shrink-0 pl-2 muted">{fmtDate(o.date, { weekday: 'short', day: 'numeric' })} · {fmtTime(o.startTime)}</span></li>)}</ul></div>}
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <Card title="Student growth" action={<span className="text-[12px] faint">Total enrolled</span>}><Lines data={m.growth} xKey="m" series={[{ key: 'students', name: 'Students' }]} fmt={(v) => String(v)} height={200} label="Student growth line chart" /></Card>
        <Card title="Course distribution" action={<span className="text-[12px] faint">Active students</span>}>{m.courses.length ? <HBars data={m.courses} fmt={(v) => String(v)} label="Active students per course" /> : <EmptyState title="No active students" />}</Card>
        <Card title="Attendance overview" action={<Link to="/attendance" className="text-[12.5px] muted hover:text-[var(--text)]">Open</Link>}>
          <div className="mb-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-[var(--surface-2)] py-2"><p className="num text-[18px] font-semibold">{m.attToday.present}</p><p className="text-[11.5px] muted">Present today</p></div>
            <div className="rounded-lg bg-[var(--surface-2)] py-2"><p className="num text-[18px] font-semibold">{m.attToday.absent}</p><p className="text-[11.5px] muted">Absent today</p></div>
            <div className="rounded-lg bg-[var(--surface-2)] py-2"><p className="num text-[18px] font-semibold">{m.attMonth.pct === null ? '—' : `${m.attMonth.pct}%`}</p><p className="text-[11.5px] muted">This month</p></div>
          </div>
          <Bars data={m.attWeeks} xKey="w" stacked series={[{ key: 'Present', name: 'Present' }, { key: 'Absent', name: 'Absent' }, { key: 'Leave', name: 'Leave' }]} fmt={(v) => String(v)} height={170} label="Weekly attendance stacked bar chart" />
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <Card title="Recent transactions" padded={false} action={<Link to="/payments" className="text-[12.5px] muted hover:text-[var(--text)]">All payments</Link>}>
          {!m.recentPays.length ? <EmptyState icon={<Wallet />} title="No payments yet" /> : <ul className="divide-y divide-[var(--border)] px-5 pb-2">{m.recentPays.map((p) => (
            <li key={p.id}><button className="flex w-full items-center gap-3 py-2.5 text-left" onClick={() => setInvoice(p)}><span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-medium">{p.studentName}</span><span className="block truncate text-[12px] faint">{p.invoiceNo} · {p.method} · {fmtDate(p.date, { day: 'numeric', month: 'short' })}</span></span><span className={`num text-[13.5px] font-medium ${p.status === 'Void' ? 'line-through faint' : ''}`}>{rupees(p.amount)}</span></button></li>))}</ul>}
        </Card>
        <Card title="Payment collection" action={<span className="text-[12px] faint">{monthLabel(cur)} · by method</span>}>
          {m.methods.length ? <HBars data={m.methods} fmt={rupees} label="Collection by payment method this month" /> : <EmptyState icon={<IndianRupee />} title="Nothing collected yet this month" />}
          <div className="mt-3 flex justify-between border-t border-[var(--border)] pt-3 text-[13px]"><span className="muted">Collected / still pending</span><span className="num font-medium">{rupees(m.revenueThisMonth)} / {rupees(m.outstanding)}</span></div>
        </Card>
        <Card title="Payment reminders" padded={false} action={<Link to="/reminders" className="text-[12.5px] muted hover:text-[var(--text)]">Reminders</Link>}>
          {!m.dues.length && !m.upcoming.length ? <EmptyState icon={<Clock />} title="Nothing due" text="All active students are paid up." /> : (
            <ul className="divide-y divide-[var(--border)] px-5 pb-2">
              {m.dues.slice(0, 5).map((x) => <li key={x.student.id} className="flex items-center gap-3 py-2.5"><Avatar name={x.student.name} src={x.student.photo} size={30} /><Link to={`/students/${x.student.id}`} className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-medium">{x.student.name}</span><span className="block truncate text-[12px] faint">{x.months.map((p) => p.month.slice(0, 3)).join(', ')}</span></Link><span className="text-right"><span className="num block text-[13px] font-medium">{rupees(x.total)}</span>{x.overdue ? <Badge tone="red">Overdue</Badge> : <span className="text-[11.5px] faint">due {fmtDate(x.oldestDue, { day: 'numeric', month: 'short' })}</span>}</span></li>)}
              {m.upcoming.filter((u) => !m.dues.some((x) => x.student.id === u.student.id)).slice(0, 3).map((u) => <li key={u.student.id + u.month} className="flex items-center gap-3 py-2.5"><Avatar name={u.student.name} size={30} /><span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-medium">{u.student.name}</span><span className="block text-[12px] faint">{u.month} · upcoming</span></span><span className="num text-[13px]">{rupees(u.amount)}</span></li>)}
            </ul>)}
        </Card>
      </div>

      <Card title="Recent admissions" padded={false} className="mt-5" action={<Link to="/students" className="text-[12.5px] muted hover:text-[var(--text)]">All students</Link>}>
        <ul className="grid divide-y divide-[var(--border)] px-5 pb-2 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-5">{m.recentAdmissions.map((s) => (
          <li key={s.id}><Link to={`/students/${s.id}`} className="flex items-center gap-3 py-3"><Avatar name={s.name} src={s.photo} size={34} /><span className="min-w-0"><span className="block truncate text-[13.5px] font-medium">{s.name}</span><span className="block text-[12px] faint">{fmtDate(s.joinDate)}</span></span></Link></li>))}</ul>
      </Card>

      <PaymentForm open={paying} onClose={() => setPaying(false)} onRecorded={(p) => { setPaying(false); setInvoice(p); }} />
      <InvoiceDialog payment={invoice} onClose={() => setInvoice(null)} />
    </>
  );
}
