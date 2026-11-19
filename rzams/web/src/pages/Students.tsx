import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownUp, Download, Plus, Users } from 'lucide-react';
import { useData } from '../lib/store';
import { balanceOf, batchOf, courseName, payStatus, type PayStatus } from '../lib/derive';
import { fmtDate, fmtPhone, rupees } from '../lib/format';
import { downloadCsv } from '../lib/share';
import { Avatar, Badge, Button, Card, EmptyState, PageHeader, SearchInput, Select, TableWrap } from '../components/ui';
import StudentForm from '../components/StudentForm';

export const payTone = (s: PayStatus) => (s === 'Paid' ? 'green' : s === 'Partial' ? 'amber' : s === 'Due' ? 'red' : 'neutral') as 'green' | 'amber' | 'red' | 'neutral';
type SortKey = 'name' | 'id' | 'joinDate' | 'fee' | 'due';

export default function Students() {
  const d = useData();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('Active');
  const [course, setCourse] = useState('');
  const [batch, setBatch] = useState('');
  const [pay, setPay] = useState('');
  const [sort, setSort] = useState<SortKey>('name');
  const [dir, setDir] = useState<1 | -1>(1);
  const [adding, setAdding] = useState(false);

  const rows = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return d.students.map((s) => ({ s, course: courseName(d, s), batch: batchOf(d, s)?.name || s.batch || '', due: balanceOf(d, s.id), pay: payStatus(d, s) }))
      .filter((r) => (!status || r.s.status === status) && (!course || r.s.courseId === course || (course === '__none' && !r.s.courseId)) && (!batch || r.s.batchId === batch || (batch === '__none' && !r.s.batchId)) && (!pay || r.pay === pay)
        && (!qq || `${r.s.name} ${r.s.id} ${r.s.phone} ${r.s.whatsapp} ${r.s.parentName} ${r.s.email}`.toLowerCase().includes(qq)))
      .sort((a, b) => {
        const v = sort === 'name' ? a.s.name.localeCompare(b.s.name) : sort === 'id' ? a.s.id.localeCompare(b.s.id) : sort === 'joinDate' ? a.s.joinDate.localeCompare(b.s.joinDate) : sort === 'fee' ? a.s.fee - b.s.fee : a.due - b.due;
        return v * dir;
      });
  }, [d, q, status, course, batch, pay, sort, dir]);

  const sortBy = (k: SortKey) => { if (sort === k) setDir(dir === 1 ? -1 : 1); else { setSort(k); setDir(k === 'due' || k === 'joinDate' ? -1 : 1); } };
  const Th = ({ k, children, right }: { k: SortKey; children: string; right?: boolean }) => (
    <th className={right ? 'text-right' : ''}><button className="inline-flex items-center gap-1 hover:text-[var(--text)]" onClick={() => sortBy(k)}>{children}<ArrowDownUp className={`size-3 ${sort === k ? 'opacity-100' : 'opacity-30'}`} /></button></th>
  );
  const exportCsv = () => downloadCsv([['Student ID', 'Name', 'Parent', 'Phone', 'WhatsApp', 'Email', 'Course', 'Batch', 'Monthly fee', 'Admission date', 'Status', 'Payment status', 'Outstanding'], ...rows.map((r) => [r.s.id, r.s.name, r.s.parentName, r.s.phone, r.s.whatsapp, r.s.email, r.course, r.batch, r.s.fee, r.s.joinDate, r.s.status, r.pay, r.due])], `students_${d.meta.today}.csv`);

  return (
    <>
      <PageHeader title="Students" description={`${d.students.filter((s) => s.status === 'Active').length} active · ${d.students.length} total`}
        actions={<><Button icon={<Download className="size-4" />} onClick={exportCsv}>Export</Button><Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setAdding(true)} data-testid="add-student">Add student</Button></>} />
      <Card padded={false}>
        <div className="grid gap-2 border-b border-[var(--border)] p-3 sm:grid-cols-2 lg:grid-cols-[1fr_repeat(4,160px)]">
          <SearchInput value={q} onChange={setQ} placeholder="Search name, ID, phone, parent…" />
          <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status"><option value="Active">Active</option><option value="Inactive">Archived</option><option value="">All statuses</option></Select>
          <Select value={course} onChange={(e) => setCourse(e.target.value)} aria-label="Course"><option value="">All courses</option>{d.courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}<option value="__none">No course set</option></Select>
          <Select value={batch} onChange={(e) => setBatch(e.target.value)} aria-label="Batch"><option value="">All batches</option>{d.batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}<option value="__none">Not in a batch</option></Select>
          <Select value={pay} onChange={(e) => setPay(e.target.value)} aria-label="Payment status"><option value="">Any payment status</option><option>Paid</option><option>Partial</option><option>Due</option></Select>
        </div>
        {!rows.length ? <EmptyState icon={<Users />} title={d.students.length ? 'No students match these filters' : 'No students yet'} text={d.students.length ? 'Try clearing the search or filters.' : 'Add your first student to get started.'} action={!d.students.length && <Button variant="primary" onClick={() => setAdding(true)}>Add student</Button>} /> : (
          <>
            <div className="hidden md:block"><TableWrap>
              <table className="table" data-testid="students-table">
                <thead><tr><Th k="name">Student</Th><Th k="id">ID</Th><th>Phone</th><th>Course · Batch</th><Th k="fee" right>Fee</Th><th>Payment</th><Th k="due" right>Due</Th><Th k="joinDate">Admitted</Th></tr></thead>
                <tbody>{rows.map((r) => (
                  <tr key={r.s.id} className="clickable" onClick={() => nav(`/students/${r.s.id}`)}>
                    <td><div className="flex items-center gap-3"><Avatar name={r.s.name} src={r.s.photo} size={32} /><div><p className="font-medium">{r.s.name}</p>{r.s.parentName && <p className="text-[12px] faint">{r.s.parentName}</p>}</div></div></td>
                    <td className="muted">{r.s.id}</td>
                    <td className="muted">{fmtPhone(r.s.phone)}</td>
                    <td><p>{r.course}</p><p className="text-[12px] faint">{r.batch || 'No batch'}</p></td>
                    <td className="num text-right">{rupees(r.s.fee)}</td>
                    <td><Badge tone={payTone(r.pay)} dot>{r.pay}</Badge></td>
                    <td className={`num text-right ${r.due > 0 ? 'font-medium text-red-600 dark:text-red-400' : 'faint'}`}>{r.due > 0 ? rupees(r.due) : '—'}</td>
                    <td className="muted">{fmtDate(r.s.joinDate)}</td>
                  </tr>))}
                </tbody>
              </table>
            </TableWrap></div>
            <ul className="divide-y divide-[var(--border)] md:hidden" data-testid="students-cards">
              {rows.map((r) => (
                <li key={r.s.id}><button className="flex w-full items-center gap-3 px-4 py-3 text-left" onClick={() => nav(`/students/${r.s.id}`)}>
                  <Avatar name={r.s.name} src={r.s.photo} size={40} />
                  <div className="min-w-0 flex-1"><p className="truncate font-medium">{r.s.name}</p><p className="truncate text-[12.5px] faint">{r.s.id} · {r.course}</p></div>
                  <div className="text-right"><Badge tone={payTone(r.pay)} dot>{r.pay}</Badge>{r.due > 0 && <p className="num mt-1 text-[12.5px] font-medium text-red-600 dark:text-red-400">{rupees(r.due)}</p>}</div>
                </button></li>))}
            </ul>
          </>
        )}
      </Card>
      <StudentForm open={adding} onClose={() => setAdding(false)} onSaved={(s) => nav(`/students/${s.id}`)} />
    </>
  );
}
