import { useMemo, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { useApp, useData } from '../lib/store';
import { attStats, dueSummaries, validPayments } from '../lib/derive';
import { addDays, cx, fmtDate, isoOf, monthIndexOfIso, monthLabel, parseIso, rupees } from '../lib/format';
import { downloadCsv } from '../lib/share';
import { Button, Card, EmptyState, Field, Input, PageHeader, Select, TableWrap } from '../components/ui';

type Cell = string | number;
interface Report { cols: { label: string; num?: boolean; money?: boolean }[]; rows: Cell[][]; total?: Cell[] }
const REPORTS = [
  { id: 'students', label: 'Students', range: false }, { id: 'admissions', label: 'Admissions', range: true }, { id: 'attendance', label: 'Attendance', range: true },
  { id: 'payments', label: 'Payments', range: true }, { id: 'outstanding', label: 'Outstanding dues', range: false }, { id: 'revenue', label: 'Monthly revenue', range: true },
  { id: 'expenses', label: 'Expenses', range: true, admin: true }, { id: 'courses', label: 'Course-wise', range: true }, { id: 'teachers', label: 'Teacher-wise', range: true },
] as const;
type Rid = (typeof REPORTS)[number]['id'];

export default function Reports() {
  const d = useData(); const { isAdmin } = useApp();
  const [rid, setRid] = useState<Rid>('payments');
  const [preset, setPreset] = useState('this-month');
  const t = parseIso(d.meta.today);
  const presets: Record<string, [string, string]> = {
    'this-month': [isoOf(new Date(t.getFullYear(), t.getMonth(), 1)), d.meta.today],
    'last-month': [isoOf(new Date(t.getFullYear(), t.getMonth() - 1, 1)), isoOf(new Date(t.getFullYear(), t.getMonth(), 0))],
    'last-3': [isoOf(new Date(t.getFullYear(), t.getMonth() - 2, 1)), d.meta.today],
    'this-year': [`${t.getFullYear()}-01-01`, d.meta.today],
    'last-365': [addDays(d.meta.today, -364), d.meta.today],
  };
  const [custom, setCustom] = useState<[string, string]>(presets['this-month']);
  const [from, to] = preset === 'custom' ? custom : presets[preset];
  const def = REPORTS.find((r) => r.id === rid)!;
  const inRange = (iso: string) => !!iso && iso >= from && iso <= to;

  const report = useMemo<Report>(() => {
    const course = (id: string) => d.courses.find((c) => c.id === id)?.name;
    const pays = validPayments(d.payments);
    switch (rid) {
      case 'students': return { cols: [{ label: 'ID' }, { label: 'Name' }, { label: 'Parent' }, { label: 'Phone' }, { label: 'Course' }, { label: 'Batch' }, { label: 'Fee', money: true }, { label: 'Admitted' }, { label: 'Status' }],
        rows: [...d.students].sort((a, b) => a.id.localeCompare(b.id)).map((s) => [s.id, s.name, s.parentName, s.phone, course(s.courseId) || s.instrument, d.batches.find((b) => b.id === s.batchId)?.name || s.batch, s.fee, s.joinDate, s.status]) };
      case 'admissions': { const rows = d.students.filter((s) => inRange(s.joinDate)).sort((a, b) => a.joinDate.localeCompare(b.joinDate)); return { cols: [{ label: 'Admitted' }, { label: 'ID' }, { label: 'Name' }, { label: 'Course' }, { label: 'Fee', money: true }, { label: 'Status' }], rows: rows.map((s) => [s.joinDate, s.id, s.name, course(s.courseId) || s.instrument, s.fee, s.status]), total: ['Total', `${rows.length} admissions`, '', '', '', ''] }; }
      case 'attendance': { const rows = d.students.map((s) => ({ s, st: attStats(d.attendance.filter((a) => a.studentId === s.id && inRange(a.date))) })).filter((r) => r.st.total || r.s.status === 'Active'); return { cols: [{ label: 'ID' }, { label: 'Name' }, { label: 'Present', num: true }, { label: 'Absent', num: true }, { label: 'Leave', num: true }, { label: 'Attendance %', num: true }], rows: rows.map((r) => [r.s.id, r.s.name, r.st.present, r.st.absent, r.st.leave, r.st.pct === null ? '—' : `${r.st.pct}%`]) }; }
      case 'payments': { const rows = d.payments.filter((p) => inRange(p.date)).sort((a, b) => a.date.localeCompare(b.date)); const v = rows.filter((p) => p.status !== 'Void'); return { cols: [{ label: 'Date' }, { label: 'Invoice' }, { label: 'Student' }, { label: 'Months' }, { label: 'Method' }, { label: 'Amount', money: true }, { label: 'Status' }], rows: rows.map((p) => [p.date, p.invoiceNo || '—', `${p.studentName} (${p.studentId})`, p.months, p.method, p.amount, p.status]), total: ['Total (excl. void)', '', `${v.length} payments`, '', '', v.reduce((a, p) => a + Number(p.amount), 0), ''] }; }
      case 'outstanding': { const ds = dueSummaries(d); return { cols: [{ label: 'ID' }, { label: 'Name' }, { label: 'Phone' }, { label: 'Months' }, { label: 'Due since' }, { label: 'Amount', money: true }], rows: ds.map((x) => [x.student.id, x.student.name, x.student.whatsapp || x.student.phone, x.months.map((m) => m.month).join(', '), x.oldestDue, x.total]), total: ['Total', `${ds.length} students`, '', '', '', ds.reduce((a, x) => a + x.total, 0)] }; }
      case 'revenue': { const a = monthIndexOfIso(from), b = monthIndexOfIso(to), rows: Cell[][] = []; for (let m = a; m <= b; m++) { const ps = pays.filter((p) => monthIndexOfIso(p.date) === m && inRange(p.date)), ex = d.expenses.filter((e) => monthIndexOfIso(e.date) === m && inRange(e.date)).reduce((s, e) => s + e.amount, 0), r = ps.reduce((s, p) => s + Number(p.amount), 0); rows.push(isAdmin ? [monthLabel(m), ps.length, r, ex, r - ex] : [monthLabel(m), ps.length, r]); }
        const sum = (i: number) => rows.reduce((s, r) => s + Number(r[i]), 0);
        return { cols: isAdmin ? [{ label: 'Month' }, { label: 'Payments', num: true }, { label: 'Revenue', money: true }, { label: 'Expenses', money: true }, { label: 'Net', money: true }] : [{ label: 'Month' }, { label: 'Payments', num: true }, { label: 'Revenue', money: true }], rows, total: isAdmin ? ['Total', sum(1), sum(2), sum(3), sum(4)] : ['Total', sum(1), sum(2)] }; }
      case 'expenses': { const rows = d.expenses.filter((e) => inRange(e.date)).sort((a, b) => a.date.localeCompare(b.date)); return { cols: [{ label: 'Date' }, { label: 'Category' }, { label: 'Description' }, { label: 'Method' }, { label: 'Amount', money: true }], rows: rows.map((e) => [e.date, e.category, e.description, e.method, e.amount]), total: ['Total', '', '', '', rows.reduce((a, e) => a + e.amount, 0)] }; }
      case 'courses': { const groups = [...d.courses.map((c) => ({ id: c.id, name: c.name })), { id: '', name: 'No course set' }]; const rows = groups.map((g) => { const ss = d.students.filter((s) => s.courseId === g.id), ids = new Set(ss.map((s) => s.id)); return [g.name, ss.filter((s) => s.status === 'Active').length, ss.filter((s) => inRange(s.joinDate)).length, pays.filter((p) => ids.has(p.studentId) && inRange(p.date)).reduce((a, p) => a + Number(p.amount), 0), d.pending.filter((p) => ids.has(p.studentId)).reduce((a, p) => a + p.due, 0)] as Cell[]; }).filter((r) => Number(r[1]) || Number(r[3]) || Number(r[4]));
        return { cols: [{ label: 'Course' }, { label: 'Active students', num: true }, { label: 'New admissions', num: true }, { label: 'Collected', money: true }, { label: 'Outstanding', money: true }], rows }; }
      case 'teachers': return { cols: [{ label: 'Teacher' }, { label: 'Batches', num: true }, { label: 'Active students', num: true }, { label: 'Attendance %', num: true }, { label: 'Collected from students', money: true }],
        rows: d.teachers.map((t) => { const bs = d.batches.filter((b) => b.teacherId === t.id), ss = d.students.filter((s) => bs.some((b) => b.id === s.batchId)), ids = new Set(ss.map((s) => s.id)), st = attStats(d.attendance.filter((a) => ids.has(a.studentId) && inRange(a.date))); return [t.name, bs.length, ss.filter((s) => s.status === 'Active').length, st.pct === null ? '—' : `${st.pct}%`, pays.filter((p) => ids.has(p.studentId) && inRange(p.date)).reduce((a, p) => a + Number(p.amount), 0)]; }) };
    }
  }, [d, rid, from, to, isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  const fmt = (v: Cell, i: number) => (report.cols[i]?.money && typeof v === 'number' ? rupees(v) : /^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? fmtDate(String(v)) : String(v ?? ''));
  const name = `${def.label}${def.range ? ` ${from} to ${to}` : ''}`;
  return (
    <>
      <PageHeader title="Reports" description="Every figure is calculated from the live database." actions={<><Button icon={<Download className="size-4" />} onClick={() => downloadCsv([report.cols.map((c) => c.label), ...report.rows, ...(report.total ? [report.total] : [])], `RZAMS_${name.replace(/\s+/g, '_')}.csv`)} data-testid="rep-csv">CSV / Excel</Button><Button icon={<Printer className="size-4" />} onClick={() => window.print()}>Print / Save as PDF</Button></>} />
      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <Card padded={false} className="no-print h-fit"><ul className="p-2">{REPORTS.filter((r) => !('admin' in r) || isAdmin).map((r) => <li key={r.id}><button onClick={() => setRid(r.id)} className={cx('w-full rounded-[10px] px-3 py-2 text-left text-[13.5px] font-medium', rid === r.id ? 'bg-[var(--surface-2)] text-[var(--text)]' : 'muted hover:bg-[var(--surface-2)]')}>{r.label}</button></li>)}</ul></Card>
        <Card padded={false}>
          <div className="flex flex-wrap items-end gap-3 border-b border-[var(--border)] p-4">
            <div className="mr-auto"><h2 className="text-[15px] font-semibold">{def.label} report</h2><p className="text-[12.5px] muted">{def.range ? `${fmtDate(from)} – ${fmtDate(to)}` : `As of ${fmtDate(d.meta.today)}`} · {d.settings.academyName}</p></div>
            {def.range && <div className="no-print flex flex-wrap items-end gap-2">
              <Field label="Period"><Select value={preset} onChange={(e) => setPreset(e.target.value)} className="w-[170px]"><option value="this-month">This month</option><option value="last-month">Last month</option><option value="last-3">Last 3 months</option><option value="this-year">This year</option><option value="last-365">Last 12 months</option><option value="custom">Custom range</option></Select></Field>
              {preset === 'custom' && <><Field label="From"><Input type="date" value={custom[0]} onChange={(e) => setCustom([e.target.value, custom[1]])} className="w-[155px]" /></Field><Field label="To"><Input type="date" value={custom[1]} onChange={(e) => setCustom([custom[0], e.target.value])} className="w-[155px]" /></Field></>}
            </div>}
          </div>
          {!report.rows.length ? <EmptyState title="No data for this period" /> : <TableWrap><table className="table" data-testid="report-table"><thead><tr>{report.cols.map((c) => <th key={c.label} className={c.num || c.money ? 'text-right' : ''}>{c.label}</th>)}</tr></thead><tbody>
            {report.rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j} className={report.cols[j]?.num || report.cols[j]?.money ? 'num text-right' : ''}>{fmt(v, j)}</td>)}</tr>)}
            {report.total && <tr className="font-semibold">{report.total.map((v, j) => <td key={j} className={report.cols[j]?.num || report.cols[j]?.money ? 'num text-right' : ''}>{fmt(v, j)}</td>)}</tr>}
          </tbody></table></TableWrap>}
        </Card>
      </div>
    </>
  );
}
