import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, MessageCircle } from 'lucide-react';
import { useData } from '../lib/store';
import type { Student } from '../lib/types';
import { dueSummaries, upcomingDues } from '../lib/derive';
import { fmtDate, fmtDateTime, fmtPhone, rupees } from '../lib/format';
import { Avatar, Badge, Button, Card, EmptyState, PageHeader, TableWrap, Tabs } from '../components/ui';
import { ReminderDialog } from '../components/finance';

export default function Reminders() {
  const d = useData();
  const [tab, setTab] = useState<'overdue' | 'upcoming' | 'all' | 'history'>('overdue');
  const [target, setTarget] = useState<{ student: Student; amount: number; months: string } | null>(null);
  const dues = dueSummaries(d);
  const overdue = dues.filter((x) => x.overdue);
  const upcoming = upcomingDues(d);
  const history = [...d.reminders].sort((a, b) => b.date.localeCompare(a.date));
  const lastSent = (id: string) => history.find((r) => r.studentId === id);

  const DueTable = ({ rows }: { rows: typeof dues }) => !rows.length ? <EmptyState icon={<Bell />} title="Nobody here" text="No students in this list right now." /> : (
    <TableWrap><table className="table"><thead><tr><th>Student</th><th>Months</th><th>Due since</th><th className="text-right">Amount</th><th>Last reminder</th><th /></tr></thead><tbody>
      {rows.map((x) => { const l = lastSent(x.student.id); return (
        <tr key={x.student.id}><td><Link to={`/students/${x.student.id}`} className="flex items-center gap-3"><Avatar name={x.student.name} src={x.student.photo} size={30} /><span><span className="block font-medium">{x.student.name}</span><span className="block text-[12px] faint">{fmtPhone(x.student.whatsapp || x.student.phone)}</span></span></Link></td><td className="muted">{x.months.map((m) => m.month).join(', ')}</td><td>{fmtDate(x.oldestDue)}</td><td className="num text-right font-medium">{rupees(x.total)}</td><td className="muted">{l ? fmtDateTime(l.date) : '—'}</td>
          <td className="text-right"><Button size="sm" icon={<MessageCircle className="size-3.5 text-emerald-600" />} onClick={() => setTarget({ student: x.student, amount: x.total, months: x.months.map((m) => m.month).join(', ') })} data-testid="remind-btn">WhatsApp reminder</Button></td></tr>); })}
    </tbody></table></TableWrap>);

  return (
    <>
      <PageHeader title="Payment reminders" description="Reminders open WhatsApp with your message. They are sent only when you press Send in WhatsApp." />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'overdue', label: 'Overdue', count: overdue.length }, { value: 'upcoming', label: 'Upcoming', count: upcoming.length }, { value: 'all', label: 'All dues', count: dues.length }, { value: 'history', label: 'Reminder history', count: history.length }]} />
      <Card padded={false} className="mt-5">
        {tab === 'overdue' && <DueTable rows={overdue} />}
        {tab === 'all' && <DueTable rows={dues} />}
        {tab === 'upcoming' && (!upcoming.length ? <EmptyState icon={<Bell />} title="No upcoming dues" text={`Students appear here ${d.settings.reminderDaysBefore} days before the fee due date (day ${d.settings.feeDueDay}).`} /> : (
          <TableWrap><table className="table"><thead><tr><th>Student</th><th>Month</th><th>Due date</th><th className="text-right">Fee</th><th /></tr></thead><tbody>
            {upcoming.map((u) => <tr key={u.student.id + u.month}><td>{u.student.name} <span className="faint">{u.student.id}</span></td><td>{u.month}</td><td>{fmtDate(u.dueDate)}</td><td className="num text-right">{rupees(u.amount)}</td><td className="text-right"><Button size="sm" icon={<MessageCircle className="size-3.5 text-emerald-600" />} onClick={() => setTarget({ student: u.student, amount: u.amount, months: u.month })}>WhatsApp reminder</Button></td></tr>)}
          </tbody></table></TableWrap>))}
        {tab === 'history' && (!history.length ? <EmptyState icon={<Bell />} title="No reminders yet" /> : (
          <TableWrap><table className="table"><thead><tr><th>When</th><th>Student</th><th>Type</th><th className="text-right">Amount</th><th>Months</th><th>Status</th><th>By</th></tr></thead><tbody>
            {history.map((r) => <tr key={r.id}><td>{fmtDateTime(r.date)}</td><td>{r.studentName}</td><td className="muted">{r.channel === 'Invoice' ? 'Invoice message' : 'Fee reminder'}</td><td className="num text-right">{rupees(r.amount)}</td><td className="muted">{r.months}</td><td><Badge tone="amber">{r.status}</Badge></td><td className="muted">{r.createdBy}</td></tr>)}
          </tbody></table></TableWrap>))}
      </Card>
      <ReminderDialog target={target} onClose={() => setTarget(null)} />
    </>
  );
}
