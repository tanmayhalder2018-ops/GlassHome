import type { AppData, AttendanceRow, Batch, ClassEntry, Payment, Pending, Student } from './types';
import { addDays, isoOf, monthIndex, monthIndexOfIso, monthLabel, parseIso, WEEKDAYS } from './format';

export const validPayments = (p: Payment[]) => p.filter((x) => x.status !== 'Void');

export function byId<T extends { id: string }>(list: T[]) { const m = new Map<string, T>(); list.forEach((x) => m.set(x.id, x)); return m; }

export function courseName(d: AppData, s: Student) { return d.courses.find((c) => c.id === s.courseId)?.name || s.instrument || '—'; }
export function batchOf(d: AppData, s: Student) { return d.batches.find((b) => b.id === s.batchId); }

export function pendingFor(d: AppData, studentId: string) { return d.pending.filter((p) => p.studentId === studentId); }
export function balanceOf(d: AppData, studentId: string) { return pendingFor(d, studentId).reduce((a, p) => a + p.due, 0); }

export type PayStatus = 'Paid' | 'Partial' | 'Due' | 'Inactive';
export function payStatus(d: AppData, s: Student): PayStatus {
  if (s.status !== 'Active') return 'Inactive';
  const p = pendingFor(d, s.id);
  if (!p.length) return 'Paid';
  return p.some((x) => x.paid > 0) ? 'Partial' : 'Due';
}

export function revenueByMonth(payments: Payment[]) {
  const m = new Map<number, number>();
  validPayments(payments).forEach((p) => { const i = monthIndexOfIso(p.date); if (i >= 0) m.set(i, (m.get(i) || 0) + (Number(p.amount) || 0)); });
  return m;
}
export function expensesByMonth(d: AppData) {
  const m = new Map<number, number>();
  d.expenses.forEach((e) => { const i = monthIndexOfIso(e.date); if (i >= 0) m.set(i, (m.get(i) || 0) + (Number(e.amount) || 0)); });
  return m;
}
export function lastMonths(cur: number, n: number) { return Array.from({ length: n }, (_, i) => cur - n + 1 + i); }

export interface AttStats { present: number; absent: number; leave: number; total: number; pct: number | null }
export function attStats(rows: AttendanceRow[]): AttStats {
  let present = 0, absent = 0, leave = 0;
  rows.forEach((r) => { if (r.status === 'Present') present++; else if (r.status === 'Absent') absent++; else if (r.status === 'Leave') leave++; });
  const counted = present + absent;
  return { present, absent, leave, total: rows.length, pct: counted ? Math.round((present / counted) * 100) : null };
}

/** Next due date (fee due day) for a pending month index */
export function dueDateOf(monthIdx: number, dueDay: number) { return `${Math.floor(monthIdx / 12)}-${String((monthIdx % 12) + 1).padStart(2, '0')}-${String(Math.min(Math.max(dueDay || 10, 1), 28)).padStart(2, '0')}`; }

export interface DueSummary { student: Student; months: Pending[]; total: number; oldestDue: string; overdue: boolean }
export function dueSummaries(d: AppData): DueSummary[] {
  const dueDay = Number(d.settings.feeDueDay) || 10;
  const sMap = byId(d.students), groups = new Map<string, Pending[]>();
  d.pending.forEach((p) => { if (!groups.has(p.studentId)) groups.set(p.studentId, []); groups.get(p.studentId)!.push(p); });
  const out: DueSummary[] = [];
  groups.forEach((months, id) => {
    const student = sMap.get(id); if (!student) return;
    months.sort((a, b) => a.monthIndex - b.monthIndex);
    const oldestDue = dueDateOf(months[0].monthIndex, dueDay);
    out.push({ student, months, total: months.reduce((a, m) => a + m.due, 0), oldestDue, overdue: oldestDue < d.meta.today });
  });
  return out.sort((a, b) => a.oldestDue.localeCompare(b.oldestDue) || b.total - a.total);
}

/** Active students whose next month starts soon (fee will be due within N days) – for "upcoming" reminders */
export function upcomingDues(d: AppData) {
  const dueDay = Number(d.settings.feeDueDay) || 10, before = Number(d.settings.reminderDaysBefore) || 5;
  const cur = d.meta.currentMonthIndex, today = d.meta.today, out: { student: Student; month: string; amount: number; dueDate: string }[] = [];
  const pendingKeys = new Set(d.pending.map((p) => `${p.studentId}|${p.month}`));
  const paid = new Set(d.fees.filter((f) => Number(f.due) <= 0).map((f) => `${f.studentId}|${f.month}`));
  for (const mi of [cur, cur + 1]) {
    const due = dueDateOf(mi, dueDay);
    if (due < today || due > addDays(today, before)) continue;
    d.students.filter((s) => s.status === 'Active' && Number(s.fee) > 0).forEach((s) => {
      const k = `${s.id}|${monthLabel(mi)}`;
      if (paid.has(k)) return;
      if (mi === cur && !pendingKeys.has(k)) return; // not billed (joined later / before fee start)
      out.push({ student: s, month: monthLabel(mi), amount: Number(s.fee), dueDate: due });
    });
  }
  return out;
}

// ---------------- Schedule ----------------
export type OccStatus = 'Upcoming' | 'Completed' | 'Cancelled' | 'Ongoing';
export interface Occurrence { key: string; date: string; startTime: string; endTime: string; batchId: string; teacherId: string; courseId: string; location: string; title: string; notes: string; classId?: string; status: OccStatus; raw: 'Scheduled' | 'Completed' | 'Cancelled' }

function occStatus(raw: string, date: string, start: string, end: string, today: string, nowHm: string): OccStatus {
  if (raw === 'Cancelled') return 'Cancelled';
  if (raw === 'Completed') return 'Completed';
  if (date < today) return 'Completed';
  if (date > today) return 'Upcoming';
  if (end && nowHm >= end) return 'Completed';
  if (start && nowHm >= start) return 'Ongoing';
  return 'Upcoming';
}

export function occurrences(batches: Batch[], classes: ClassEntry[], from: string, to: string, today: string, now = new Date()): Occurrence[] {
  const nowHm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const out: Occurrence[] = [], used = new Set<string>();
  const overrides = new Map<string, ClassEntry>();
  classes.forEach((c) => { if (c.batchId) overrides.set(`${c.batchId}|${c.date}`, c); });
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const wd = WEEKDAYS[parseIso(d).getDay()];
    batches.forEach((b) => {
      if (b.status !== 'Active' || !b.startTime || !b.days.split(',').includes(wd)) return;
      const o = overrides.get(`${b.id}|${d}`);
      if (o) used.add(o.id);
      const start = o?.startTime || b.startTime, end = o?.endTime || b.endTime, raw = (o?.status || 'Scheduled') as Occurrence['raw'];
      out.push({ key: `${b.id}|${d}`, date: d, startTime: start, endTime: end, batchId: b.id, teacherId: o?.teacherId || b.teacherId, courseId: o?.courseId || b.courseId, location: o?.location || b.location, title: o?.title || '', notes: o?.notes || '', classId: o?.id, raw, status: occStatus(raw, d, start, end, today, nowHm) });
    });
  }
  classes.forEach((c) => {
    if (used.has(c.id) || c.date < from || c.date > to) return;
    out.push({ key: c.id, date: c.date, startTime: c.startTime, endTime: c.endTime, batchId: c.batchId, teacherId: c.teacherId, courseId: c.courseId, location: c.location, title: c.title, notes: c.notes, classId: c.id, raw: c.status, status: occStatus(c.status, c.date, c.startTime, c.endTime, today, nowHm) });
  });
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
}

export function weekStart(iso: string) { const d = parseIso(iso); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return isoOf(d); }
export function monthOfLabel(label: string) { return monthIndex(label); }
