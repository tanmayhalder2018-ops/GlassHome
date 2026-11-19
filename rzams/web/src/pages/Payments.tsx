import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Bell, Download, Plus, Wallet } from 'lucide-react';
import { useData } from '../lib/store';
import type { Payment, Student } from '../lib/types';
import { dueSummaries, lastMonths, revenueByMonth, validPayments } from '../lib/derive';
import { fmtDate, monthIndexOfIso, monthLabel, rupees } from '../lib/format';
import { downloadCsv } from '../lib/share';
import { Avatar, Badge, Button, Card, EmptyState, PageHeader, SearchInput, Select, StatCard, TableWrap, Tabs } from '../components/ui';
import { InvoiceDialog, PaymentForm, ReminderDialog } from '../components/finance';

export const payBadge = (p: Payment) => <Badge tone={p.status === 'Void' ? 'red' : p.status === 'Partial' ? 'amber' : p.status === 'Legacy' ? 'neutral' : 'green'}>{p.status === 'Legacy' ? 'Imported' : p.status}</Badge>;

export default function Payments() {
  const d = useData();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as 'history' | 'outstanding' | 'monthly') || 'history';
  const [paying, setPaying] = useState<{ sid?: string } | null>(null);
  const [invoice, setInvoice] = useState<Payment | null>(null);
  const [remind, setRemind] = useState<{ student: Student; amount: number; months: string } | null>(null);
  const [q, setQ] = useState(''); const [month, setMonth] = useState(''); const [method, setMethod] = useState(''); const [status, setStatus] = useState('');
  const cur = d.meta.currentMonthIndex;
  const rev = revenueByMonth(d.payments);
  const dues = dueSummaries(d);
  const methods = Array.from(new Set([...d.settings.paymentMethods.split(',').map((m) => m.trim()), ...d.payments.map((p) => p.method)])).filter(Boolean);

  const list = useMemo(() => d.payments.filter((p) => (!q || `${p.studentName} ${p.studentId} ${p.invoiceNo} ${p.reference}`.toLowerCase().includes(q.toLowerCase())) && (!month || monthIndexOfIso(p.date) === Number(month)) && (!method || p.method === method) && (!status || p.status === status))
    .sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt)), [d.payments, q, month, method, status]);
  const total = validPayments(list).reduce((a, p) => a + Number(p.amount), 0);

  const exportCsv = () => downloadCsv([['Date', 'Invoice', 'Student ID', 'Student', 'Course', 'Months', 'Method', 'Reference', 'Amount', 'Previous balance', 'Current fee', 'Remaining', 'Status', 'Recorded by'], ...list.map((p) => [p.date, p.invoiceNo, p.studentId, p.studentName, p.course, p.months, p.method, p.reference, p.amount, p.previousBalance, p.currentFee, p.remaining, p.status, p.recordedBy])], `payments_${d.meta.today}.csv`);
  const months12 = lastMonths(cur, 12).reverse();

  return (
    <>
      <PageHeader title="Payments" description="Every payment is a transaction with its own invoice." actions={<><Button icon={<Download className="size-4" />} onClick={exportCsv}>Export</Button><Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setPaying({})} data-testid="pay-new">Record payment</Button></>} />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={`Collected in ${monthLabel(cur)}`} value={rupees(rev.get(cur) || 0)} tone="green" icon={<Wallet />} />
        <StatCard label={`Collected in ${monthLabel(cur - 1)}`} value={rupees(rev.get(cur - 1) || 0)} icon={<Wallet />} />
        <StatCard label="Outstanding dues" value={rupees(dues.reduce((a, x) => a + x.total, 0))} tone="red" sub={`${dues.length} students`} />
        <StatCard label="Overdue students" value={dues.filter((x) => x.overdue).length} tone="amber" sub={`Fee due on day ${d.settings.feeDueDay} of the month`} />
      </div>
      <Tabs value={tab} onChange={(t) => setParams(t === 'history' ? {} : { tab: t })} tabs={[{ value: 'history', label: 'Payment history', count: d.payments.length }, { value: 'outstanding', label: 'Outstanding dues', count: dues.length }, { value: 'monthly', label: 'Monthly collection' }]} />
      <div className="mt-5">
        {tab === 'history' && (
          <Card padded={false}>
            <div className="grid gap-2 border-b border-[var(--border)] p-3 sm:grid-cols-2 lg:grid-cols-[1fr_170px_170px_150px]">
              <SearchInput value={q} onChange={setQ} placeholder="Search student, invoice, reference…" />
              <Select value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Month"><option value="">All months</option>{months12.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</Select>
              <Select value={method} onChange={(e) => setMethod(e.target.value)} aria-label="Method"><option value="">All methods</option>{methods.map((m) => <option key={m}>{m}</option>)}</Select>
              <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status"><option value="">All statuses</option><option>Paid</option><option>Partial</option><option>Void</option><option value="Legacy">Imported</option></Select>
            </div>
            {!list.length ? <EmptyState icon={<Wallet />} title="No payments found" /> : <>
              <TableWrap><table className="table" data-testid="payments-table"><thead><tr><th>Date</th><th>Invoice</th><th>Student</th><th>Months</th><th>Method</th><th className="text-right">Amount</th><th className="text-right">Balance after</th><th>Status</th></tr></thead><tbody>
                {list.map((p) => <tr key={p.id} className="clickable" onClick={() => setInvoice(p)}><td>{fmtDate(p.date)}</td><td className="font-medium">{p.invoiceNo || <span className="faint">—</span>}</td><td><p>{p.studentName}</p><p className="text-[12px] faint">{p.studentId}</p></td><td className="muted">{p.months}</td><td className="muted">{p.method}{p.reference && <span className="block text-[12px] faint">{p.reference}</span>}</td><td className={`num text-right font-medium ${p.status === 'Void' ? 'line-through faint' : ''}`}>{rupees(p.amount)}</td><td className="num text-right muted">{p.remaining === '' ? '—' : rupees(p.remaining)}</td><td>{payBadge(p)}</td></tr>)}
              </tbody></table></TableWrap>
              <div className="flex justify-between border-t border-[var(--border)] px-4 py-3 text-[13px]"><span className="muted">{list.length} payment(s) · void payments excluded from total</span><span className="num font-semibold">{rupees(total)}</span></div>
            </>}
          </Card>
        )}
        {tab === 'outstanding' && (
          <Card padded={false}>
            {!dues.length ? <EmptyState title="No outstanding dues" text="All active students are paid up." /> : <TableWrap><table className="table" data-testid="dues-table"><thead><tr><th>Student</th><th>Unpaid months</th><th>Due since</th><th className="text-right">Total due</th><th /></tr></thead><tbody>
              {dues.map((x) => <tr key={x.student.id}><td><Link to={`/students/${x.student.id}`} className="flex items-center gap-3"><Avatar name={x.student.name} src={x.student.photo} size={30} /><span><span className="block font-medium">{x.student.name}</span><span className="block text-[12px] faint">{x.student.id}</span></span></Link></td><td className="muted">{x.months.map((m) => m.month).join(', ')}</td><td>{fmtDate(x.oldestDue)} {x.overdue && <Badge tone="red">Overdue</Badge>}</td><td className="num text-right font-medium text-red-600 dark:text-red-400">{rupees(x.total)}</td>
                <td className="text-right"><div className="flex justify-end gap-2"><Button size="sm" icon={<Bell className="size-3.5" />} onClick={() => setRemind({ student: x.student, amount: x.total, months: x.months.map((m) => m.month).join(', ') })}>Remind</Button><Button size="sm" variant="primary" onClick={() => setPaying({ sid: x.student.id })}>Collect</Button></div></td></tr>)}
            </tbody></table></TableWrap>}
          </Card>
        )}
        {tab === 'monthly' && (
          <Card padded={false}>
            <TableWrap><table className="table"><thead><tr><th>Month</th><th className="text-right">Payments</th>{methods.map((m) => <th key={m} className="text-right">{m}</th>)}<th className="text-right">Total collected</th></tr></thead><tbody>
              {months12.map((mi) => { const ps = validPayments(d.payments).filter((p) => monthIndexOfIso(p.date) === mi); return (
                <tr key={mi}><td className="font-medium">{monthLabel(mi)}</td><td className="num text-right">{ps.length}</td>{methods.map((m) => <td key={m} className="num text-right muted">{rupees(ps.filter((p) => p.method === m).reduce((a, p) => a + Number(p.amount), 0))}</td>)}<td className="num text-right font-semibold">{rupees(ps.reduce((a, p) => a + Number(p.amount), 0))}</td></tr>); })}
            </tbody></table></TableWrap>
          </Card>
        )}
      </div>
      <PaymentForm open={!!paying} onClose={() => setPaying(null)} studentId={paying?.sid} onRecorded={(p) => { setPaying(null); setInvoice(p); }} />
      <InvoiceDialog payment={invoice} onClose={() => setInvoice(null)} />
      <ReminderDialog target={remind} onClose={() => setRemind(null)} />
    </>
  );
}
