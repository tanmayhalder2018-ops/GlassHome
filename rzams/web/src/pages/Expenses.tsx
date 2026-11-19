import { useMemo, useState } from 'react';
import { Download, Pencil, Plus, Receipt, Trash2, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useApp, useData } from '../lib/store';
import type { Expense } from '../lib/types';
import { expensesByMonth, lastMonths, revenueByMonth } from '../lib/derive';
import { compactRupees, fmtDate, monthIndexOfIso, monthLabel, rupees, shortMonth } from '../lib/format';
import { downloadCsv } from '../lib/share';
import { Button, Card, EmptyState, Field, IconButton, Input, Modal, PageHeader, Select, StatCard, TableWrap, useUi } from '../components/ui';
import { Bars } from '../components/charts';

export default function Expenses() {
  const d = useData(); const { mutate } = useApp(); const { toast, confirm } = useUi();
  const cur = d.meta.currentMonthIndex;
  const [month, setMonth] = useState(String(cur));
  const [cat, setCat] = useState('');
  const [edit, setEdit] = useState<Partial<Expense> | null>(null);
  const rev = revenueByMonth(d.payments), exp = expensesByMonth(d);
  const mi = Number(month);
  const list = useMemo(() => d.expenses.filter((e) => (month === '' || monthIndexOfIso(e.date) === mi) && (!cat || e.category === cat)).sort((a, b) => b.date.localeCompare(a.date)), [d.expenses, month, mi, cat]);
  const cats = Array.from(new Set([...d.settings.expenseCategories.split(',').map((c) => c.trim()), ...d.expenses.map((e) => e.category)])).filter(Boolean);
  const byCat = cats.map((c) => ({ c, v: list.filter((e) => e.category === c).reduce((a, e) => a + e.amount, 0) })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v);
  const totalExp = list.reduce((a, e) => a + e.amount, 0);
  const revenue = month === '' ? Array.from(rev.values()).reduce((a, v) => a + v, 0) : rev.get(mi) || 0;
  const chart = lastMonths(cur, 12).map((m) => ({ m: shortMonth(m), Revenue: rev.get(m) || 0, Expenses: exp.get(m) || 0 }));
  const del = async (e: Expense) => { if (!(await confirm({ title: 'Delete this expense?', text: `${e.category} · ${rupees(e.amount)} on ${fmtDate(e.date)}`, confirmLabel: 'Delete', danger: true }))) return; try { await mutate('expenses.delete', { id: e.id }); toast('Expense deleted'); } catch (er) { toast((er as Error).message, 'error'); } };

  return (
    <>
      <PageHeader title="Expenses" description="Kept separate from student payments. Net = fees collected − expenses."
        actions={<><Button icon={<Download className="size-4" />} onClick={() => downloadCsv([['Date', 'Category', 'Description', 'Method', 'Amount', 'Added by'], ...list.map((e) => [e.date, e.category, e.description, e.method, e.amount, e.createdBy])], `expenses_${d.meta.today}.csv`)}>Export</Button><Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setEdit({ date: d.meta.today, method: 'Cash' })}>Add expense</Button></>} />
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label={month === '' ? 'Fees collected (all time)' : `Fees collected · ${monthLabel(mi)}`} value={rupees(revenue)} tone="green" icon={<TrendingUp />} />
        <StatCard label="Expenses" value={rupees(totalExp)} tone="red" icon={<TrendingDown />} />
        <StatCard label="Net collection" value={rupees(revenue - totalExp)} tone={revenue - totalExp >= 0 ? 'blue' : 'red'} icon={<Wallet />} />
      </div>
      <div className="mb-5 grid gap-5 lg:grid-cols-3">
        <Card title="Revenue vs expenses" className="lg:col-span-2" action={<span className="text-[12px] faint">Last 12 months</span>}><Bars data={chart} xKey="m" series={[{ key: 'Revenue', name: 'Revenue' }, { key: 'Expenses', name: 'Expenses' }]} fmt={rupees} yFmt={compactRupees} height={220} label="Revenue versus expenses by month" /></Card>
        <Card title="By category">{!byCat.length ? <p className="text-[13px] muted">No expenses in this period.</p> : <ul className="space-y-2">{byCat.map((x) => <li key={x.c} className="flex justify-between text-[13px]"><span>{x.c}</span><span className="num font-medium">{rupees(x.v)}</span></li>)}</ul>}</Card>
      </div>
      <Card padded={false}>
        <div className="flex flex-wrap gap-2 border-b border-[var(--border)] p-3">
          <Select value={month} onChange={(e) => setMonth(e.target.value)} className="w-[180px]"><option value="">All months</option>{lastMonths(cur, 24).reverse().map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</Select>
          <Select value={cat} onChange={(e) => setCat(e.target.value)} className="w-[200px]"><option value="">All categories</option>{cats.map((c) => <option key={c}>{c}</option>)}</Select>
        </div>
        {!list.length ? <EmptyState icon={<Receipt />} title="No expenses in this period" /> : <TableWrap><table className="table"><thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Method</th><th className="text-right">Amount</th><th /></tr></thead><tbody>
          {list.map((e) => <tr key={e.id}><td>{fmtDate(e.date)}</td><td>{e.category}</td><td className="muted">{e.description || '—'}</td><td className="muted">{e.method}</td><td className="num text-right font-medium">{rupees(e.amount)}</td><td className="text-right"><IconButton label="Edit" onClick={() => setEdit(e)}><Pencil className="size-4" /></IconButton><IconButton label="Delete" onClick={() => del(e)}><Trash2 className="size-4" /></IconButton></td></tr>)}
        </tbody></table></TableWrap>}
      </Card>
      <ExpenseModal value={edit} cats={cats} onClose={() => setEdit(null)} />
    </>
  );
}

function ExpenseModal({ value, cats, onClose }: { value: Partial<Expense> | null; cats: string[]; onClose: () => void }) {
  const d = useData(); const { mutate } = useApp(); const { toast } = useUi();
  const [f, setF] = useState<Partial<Expense>>({}); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const [seenValue, setSeenValue] = useState<unknown>(null);
  if (value && value !== seenValue) { setSeenValue(value); setF({ category: cats[0], ...value }); setErr(''); } // fill the form in the same render it opens
  if (!value) return null;
  const methods = d.settings.paymentMethods.split(',').map((m) => m.trim()).filter(Boolean);
  const save = async () => { setBusy(true); setErr(''); try { await mutate('expenses.save', f); toast(value.id ? 'Expense updated' : 'Expense added'); onClose(); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } };
  return (
    <Modal open onClose={onClose} title={value.id ? 'Edit expense' : 'Add expense'} size="sm" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={save}>Save</Button></>}>
      <div className="space-y-4">
        <Field label="Date"><Input type="date" max={d.meta.today} value={f.date || ''} onChange={(e) => setF((x) => ({ ...x, date: e.target.value }))} /></Field>
        <Field label="Category"><Select value={f.category || ''} onChange={(e) => setF((x) => ({ ...x, category: e.target.value }))}>{cats.map((c) => <option key={c}>{c}</option>)}</Select></Field>
        <Field label="Description"><Input value={f.description || ''} onChange={(e) => setF((x) => ({ ...x, description: e.target.value }))} /></Field>
        <Field label="Amount (₹)"><Input type="number" min={1} value={String(f.amount ?? '')} onChange={(e) => setF((x) => ({ ...x, amount: e.target.value as unknown as number }))} /></Field>
        <Field label="Payment method"><Select value={f.method || ''} onChange={(e) => setF((x) => ({ ...x, method: e.target.value }))}>{methods.map((m) => <option key={m}>{m}</option>)}</Select></Field>
        {err && <p role="alert" className="text-[13px] text-red-600">{err}</p>}
      </div>
    </Modal>
  );
}
