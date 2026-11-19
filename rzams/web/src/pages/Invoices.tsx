import { useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import { useData } from '../lib/store';
import type { Payment } from '../lib/types';
import { fmtDate, monthIndexOfIso, monthLabel, rupees } from '../lib/format';
import { lastMonths } from '../lib/derive';
import { Card, EmptyState, PageHeader, SearchInput, Select, TableWrap } from '../components/ui';
import { InvoiceDialog } from '../components/finance';
import { payBadge } from './Payments';

export default function Invoices() {
  const d = useData();
  const [q, setQ] = useState(''); const [month, setMonth] = useState('');
  const [open, setOpen] = useState<Payment | null>(null);
  const list = useMemo(() => d.payments.filter((p) => p.invoiceNo && (!q || `${p.invoiceNo} ${p.studentName} ${p.studentId}`.toLowerCase().includes(q.toLowerCase())) && (!month || monthIndexOfIso(p.date) === Number(month)))
    .sort((a, b) => b.invoiceNo.localeCompare(a.invoiceNo)), [d.payments, q, month]);
  return (
    <>
      <PageHeader title="Invoices" description="One invoice per payment. Open any invoice to download, print or share it again." />
      <Card padded={false}>
        <div className="grid gap-2 border-b border-[var(--border)] p-3 sm:grid-cols-[1fr_200px]">
          <SearchInput value={q} onChange={setQ} placeholder="Search invoice number or student…" />
          <Select value={month} onChange={(e) => setMonth(e.target.value)}><option value="">All months</option>{lastMonths(d.meta.currentMonthIndex, 12).reverse().map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</Select>
        </div>
        {!list.length ? <EmptyState icon={<FileText />} title="No invoices yet" text="An invoice is created automatically every time a payment is recorded." /> : (
          <TableWrap><table className="table" data-testid="invoices-table"><thead><tr><th>Invoice</th><th>Date</th><th>Student</th><th>Billing period</th><th className="text-right">Paid</th><th className="text-right">Remaining</th><th>Status</th></tr></thead><tbody>
            {list.map((p) => <tr key={p.id} className="clickable" onClick={() => setOpen(p)}><td className="font-medium">{p.invoiceNo}</td><td className="muted">{fmtDate(p.date)}</td><td>{p.studentName} <span className="faint">{p.studentId}</span></td><td className="muted">{p.months}</td><td className="num text-right">{rupees(p.amount)}</td><td className="num text-right muted">{rupees(p.remaining)}</td><td>{payBadge(p)}</td></tr>)}
          </tbody></table></TableWrap>)}
      </Card>
      <InvoiceDialog payment={open} onClose={() => setOpen(null)} />
    </>
  );
}
