import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Download, ExternalLink, FileText, MessageCircle, Printer, Share2, TriangleAlert } from 'lucide-react';
import { useApp, useData } from '../lib/store';
import { newRequestId } from '../lib/api';
import type { Payment, Pending, Student } from '../lib/types';
import { cleanPhone, cx, fillTemplate, fmtDate, fmtPhone, monthIndex, monthLabel, rupees } from '../lib/format';
import { courseName, feeDueDate, lastBilledMonth } from '../lib/derive';
import { buildInvoicePdf, invoiceFileName } from '../lib/invoice';
import { downloadBlob, openWhatsApp, printBlob, shareFile, waNumber } from '../lib/share';
import { Badge, Button, Field, Input, Modal, Select, Textarea, useUi } from './ui';

// ---------------- months a student can pay for (same rule as the server) ----------------
export function payableMonths(data: ReturnType<typeof useData>, s: Student | undefined): Pending[] {
  if (!s) return [];
  const cur = data.meta.currentMonthIndex, upTo = lastBilledMonth(data, s);
  const out: Pending[] = data.pending.filter((p) => p.studentId === s.id).map((p) => ({ ...p, advance: p.monthIndex > upTo }));
  const have = new Set(out.map((p) => p.month));
  for (let m = cur; m <= cur + 3; m++) {
    const lbl = monthLabel(m); if (have.has(lbl)) continue;
    const rec = data.fees.find((f) => f.studentId === s.id && f.month === lbl);
    const amount = rec ? Number(rec.amount) : Number(s.fee), paid = rec ? Number(rec.paid) : 0;
    if (amount - paid > 0) out.push({ studentId: s.id, name: s.name, phone: s.phone, month: lbl, monthIndex: m, amount, paid, due: amount - paid, recorded: !!rec, advance: m > upTo });
  }
  return out.sort((a, b) => a.monthIndex - b.monthIndex);
}

export function PaymentForm({ open, onClose, studentId, onRecorded }: { open: boolean; onClose: () => void; studentId?: string; onRecorded: (p: Payment) => void }) {
  const data = useData();
  const { mutate } = useApp();
  const { toast } = useUi();
  const methods = data.settings.paymentMethods.split(',').map((m) => m.trim()).filter(Boolean);
  const [sid, setSid] = useState(studentId || '');
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(methods[0] || 'Cash');
  const [date, setDate] = useState(data.meta.today);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(newRequestId());

  const student = data.students.find((s) => s.id === sid);
  const months = useMemo(() => payableMonths(data, student), [data, student]);
  const cur = data.meta.currentMonthIndex;

  const preTick = (id: string) => {
    const ms = payableMonths(data, data.students.find((x) => x.id === id));
    const first = ms.find((m) => !m.advance) || ms[0];
    setChecked(new Set(first ? [first.month] : []));
    setAmount(first ? String(first.due) : '');
    requestId.current = newRequestId();
  };
  useEffect(() => {
    if (!open) return;
    // reset everything and pre-tick the oldest unpaid month, recalculated on every open
    setSid(studentId || ''); setReference(''); setNotes(''); setError(''); setDate(data.meta.today); setMethod(methods[0] || 'Cash');
    preTick(studentId || '');
  }, [open, studentId]); // eslint-disable-line react-hooks/exhaustive-deps
  const chooseStudent = (id: string) => { setSid(id); preTick(id); };

  const selected = months.filter((m) => checked.has(m.month));
  const selectedDue = selected.reduce((a, m) => a + m.due, 0);
  const paid = Number(amount) || 0;
  // Remaining = Previous Balance + Current Fee - Amount Paid (preview; the server recalculates)
  const pend = data.pending.filter((p) => p.studentId === sid);
  const bm = student ? lastBilledMonth(data, student) : cur; // billing month: last month (postpaid) or this month (prepaid)
  let prev = pend.filter((p) => p.monthIndex < bm).reduce((a, p) => a + p.due, 0);
  let current = pend.filter((p) => p.monthIndex >= bm).reduce((a, p) => a + p.due, 0);
  selected.forEach((m) => { if (!pend.some((p) => p.month === m.month)) { if (m.monthIndex < bm) prev += m.due; else current += m.due; } });
  const remaining = prev + current - paid;
  let rest = paid;
  const split = selected.map((m) => { const take = Math.min(rest, m.due); rest -= take; return { ...m, take }; });

  const toggle = (m: string) => {
    const n = new Set(checked); if (n.has(m)) n.delete(m); else n.add(m);
    setChecked(n);
    setAmount(String(months.filter((x) => n.has(x.month)).reduce((a, x) => a + x.due, 0) || ''));
  };

  const submit = async () => {
    setError('');
    if (!student) return setError('Select a student.');
    if (!selected.length) return setError('Tick at least one month.');
    if (!(paid > 0)) return setError('Enter the amount received.');
    if (paid > selectedDue) return setError(`${rupees(paid - selectedDue)} is more than the ticked months. Tick another month.`);
    if (date > data.meta.today) return setError('Payment date cannot be in the future.');
    setBusy(true);
    try {
      const r = await mutate<{ payment: Payment; duplicate: boolean }>('payments.record', { studentId: sid, months: selected.map((m) => m.month), amount: paid, method, date, reference, notes, requestId: requestId.current }, { retries: 2 });
      toast(r.duplicate ? `Already recorded as ${r.payment.invoiceNo}` : `Payment recorded · ${r.payment.invoiceNo}`);
      onRecorded(r.payment);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  const active = data.students.filter((s) => s.status === 'Active' || s.id === studentId).sort((a, b) => a.name.localeCompare(b.name));
  return (
    <Modal open={open} onClose={onClose} title="Record payment" description="The amount fills the oldest ticked month first." size="md"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={submit} data-testid="save-payment">Save payment</Button></>}>
      <div className="space-y-4">
        <Field label="Student">
          <Select value={sid} onChange={(e) => chooseStudent(e.target.value)} data-testid="pay-student">
            <option value="">Select student…</option>
            {active.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
          </Select>
        </Field>
        {student && (
          <div>
            <span className="label">Months this payment covers</span>
            {months.length ? (
              <div className="space-y-1.5" data-testid="pay-months">
                {months.map((m) => (
                  <label key={m.month} className={cx('flex cursor-pointer items-center gap-3 rounded-[10px] border px-3 py-2.5 transition-colors', checked.has(m.month) ? 'border-[var(--ring)] bg-[var(--surface-2)]' : 'border-[var(--border)]')}>
                    <input type="checkbox" className="size-4 accent-zinc-900 dark:accent-zinc-100" checked={checked.has(m.month)} onChange={() => toggle(m.month)} />
                    <span className="flex-1 text-[13.5px] font-medium">{m.month}{m.advance && <span className="ml-1.5 text-[12px] font-normal faint">advance</span>}{!m.advance && feeDueDate(data, student, m.monthIndex) < data.meta.today && <span className="ml-1.5"><Badge tone="red">overdue</Badge></span>}</span>
                    <span className="num text-right text-[12.5px]">{m.paid > 0 && <span className="faint">{rupees(m.paid)} paid · </span>}<span className={m.advance ? 'muted' : 'font-medium text-red-600 dark:text-red-400'}>{rupees(m.due)} due</span></span>
                  </label>
                ))}
              </div>
            ) : <p className="text-[13px] muted">Nothing due for this student.</p>}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Amount received (₹)"><Input type="number" inputMode="decimal" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} data-testid="pay-amount" /></Field>
          <Field label="Payment method"><Select value={method} onChange={(e) => setMethod(e.target.value)} data-testid="pay-method">{methods.map((m) => <option key={m}>{m}</option>)}</Select></Field>
          <Field label="Payment date"><Input type="date" max={data.meta.today} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Reference (UPI / bank)" hint="Optional"><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. UPI txn ID" /></Field>
        </div>
        <Field label="Note" hint="Optional, shown on the invoice"><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        {student && selected.length > 0 && (
          <div className="rounded-xl bg-[var(--surface-2)] p-4 text-[13px]" data-testid="pay-preview">
            <Row k="Previous balance" v={rupees(prev)} />
            <Row k="Current fee" v={rupees(current)} />
            <Row k="Amount paid" v={'− ' + rupees(paid)} className="text-emerald-600 dark:text-emerald-400" />
            <div className="my-2 border-t border-[var(--border-strong)]" />
            <Row k="Remaining balance" v={rupees(Math.max(remaining, 0))} bold />
            {paid > 0 && <p className="mt-2 text-[12px] muted">{split.filter((s) => s.take > 0).map((s) => `${s.month}: ${rupees(s.take)}${s.take < s.due ? ` (${rupees(s.due - s.take)} left)` : ' ✓'}`).join(' · ')}</p>}
          </div>
        )}
        {error && <p role="alert" className="rounded-[10px] bg-red-50 px-3 py-2 text-[13px] text-red-700 dark:bg-red-950/50 dark:text-red-400">{error}</p>}
      </div>
    </Modal>
  );
}
function Row({ k, v, bold, className }: { k: string; v: string; bold?: boolean; className?: string }) {
  return <div className={cx('flex justify-between py-0.5', bold && 'text-[14px] font-semibold', className)}><span className={bold ? '' : 'muted'}>{k}</span><span className="num">{v}</span></div>;
}

// ---------------- Invoice dialog ----------------
type StepStatus = { tone: 'ok' | 'warn' | 'err'; text: string } | null;
export function InvoiceDialog({ payment, onClose }: { payment: Payment | null; onClose: () => void }) {
  const data = useData();
  const { mutate, isAdmin } = useApp();
  const { toast, confirm } = useUi();
  const [busy, setBusy] = useState('');
  const [waStatus, setWaStatus] = useState<StepStatus>(null);
  const [pdfStatus, setPdfStatus] = useState<StepStatus>(null);
  const [voidMode, setVoidMode] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const blobRef = useRef<Blob | null>(null);
  useEffect(() => { blobRef.current = null; setWaStatus(null); setPdfStatus(null); }, [payment?.id, payment?.status]);
  if (!payment) return null;
  const p = data.payments.find((x) => x.id === payment.id) || payment;
  const student = data.students.find((s) => s.id === p.studentId);
  const batch = student ? data.batches.find((b) => b.id === student.batchId) : undefined;
  const number = waNumber(student?.whatsapp, student?.phone);
  const canShareFiles = typeof navigator !== 'undefined' && !!(navigator as Navigator & { canShare?: unknown }).canShare;
  const message = fillTemplate(data.settings.invoiceTemplate, { name: p.studentName, academy: data.settings.academyName, id: p.studentId, course: p.course || (student ? courseName(data, student) : ''), amount: Number(p.amount).toLocaleString('en-IN'), due: Number(p.remaining || 0).toLocaleString('en-IN'), invoice: p.invoiceNo || p.id });

  const pdf = async () => {
    if (!blobRef.current) blobRef.current = await buildInvoicePdf({ payment: p, student, batchName: batch?.name, settings: data.settings });
    return blobRef.current;
  };
  const run = async (key: string, fn: () => Promise<void>) => { setBusy(key); try { await fn(); } catch (e) { toast((e as Error).message, 'error'); } finally { setBusy(''); } };

  const openChat = () => run('wa', async () => {
    if (!number) { setWaStatus({ tone: 'err', text: 'No valid WhatsApp or phone number for this student. Add one in their profile.' }); return; }
    openWhatsApp(number, message);
    setWaStatus({ tone: 'warn', text: `WhatsApp opened for ${fmtPhone(number)} with the message filled in. Press Send in WhatsApp — it is not sent until you do.` });
    mutate('reminders.log', { studentId: p.studentId, phone: number.slice(2), amount: p.amount, months: p.months, message, channel: 'Invoice' }).catch(() => {});
  });
  const sharePdf = () => run('share', async () => {
    const blob = await pdf();
    const r = await shareFile(blob, invoiceFileName(p), message);
    if (r === 'shared') setPdfStatus({ tone: 'warn', text: 'Share sheet completed. Your phone does not report whether WhatsApp delivered it — check the chat.' });
    else if (r === 'cancelled') setPdfStatus({ tone: 'err', text: 'Sharing was cancelled. The PDF was not shared.' });
    else if (r === 'unsupported') { downloadBlob(blob, invoiceFileName(p)); setPdfStatus({ tone: 'warn', text: 'This browser cannot share files directly. The PDF was downloaded — attach it in the WhatsApp chat.' }); }
    else setPdfStatus({ tone: 'err', text: 'Sharing failed. Use Download PDF and attach it in WhatsApp.' });
  });
  const download = () => run('dl', async () => { downloadBlob(await pdf(), invoiceFileName(p)); setPdfStatus({ tone: 'ok', text: 'PDF downloaded.' }); });
  const print = () => run('print', async () => printBlob(await pdf()));
  const voidIt = async () => {
    if (!voidReason.trim()) { toast('Give a reason for voiding this payment.', 'error'); return; }
    if (!(await confirm({ title: `Void ${p.invoiceNo}?`, text: 'The payment is reversed from the student’s fee records and the invoice is marked VOID. This is recorded in the audit log and cannot be undone.', confirmLabel: 'Void payment', danger: true, requireText: 'VOID' }))) return;
    await run('void', async () => { await mutate('payments.void', { id: p.id, reason: voidReason.trim() }); toast('Payment voided'); setVoidMode(false); });
  };

  const isLegacy = p.status === 'Legacy';
  return (
    <Modal open onClose={onClose} size="md" title={isLegacy ? 'Imported payment' : `Invoice ${p.invoiceNo}`} description={`${p.studentName} · ${fmtDate(p.date)}`}
      footer={<>{isAdmin && !isLegacy && p.status !== 'Void' && !voidMode && <Button variant="ghost" className="mr-auto text-red-600" onClick={() => setVoidMode(true)}>Void payment</Button>}<Button onClick={onClose}>Close</Button></>}>
      <div className="space-y-5">
        <div className="rounded-xl border border-[var(--border)] p-4">
          <div className="mb-3 flex items-center justify-between"><span className="text-[13px] muted">Status</span><Badge tone={p.status === 'Void' ? 'red' : p.status === 'Partial' ? 'amber' : p.status === 'Legacy' ? 'neutral' : 'green'}>{p.status === 'Partial' ? 'Partially paid' : p.status}</Badge></div>
          {!isLegacy && <><Row k="Previous balance" v={rupees(p.previousBalance)} /><Row k={`Current fee (${p.months})`} v={rupees(p.currentFee)} /></>}
          <Row k={`Paid · ${p.method}${p.reference ? ' · ' + p.reference : ''}`} v={rupees(p.amount)} className="text-emerald-600 dark:text-emerald-400" />
          {!isLegacy && <><div className="my-2 border-t border-[var(--border)]" /><Row k="Remaining due" v={rupees(p.remaining)} bold />{p.nextDueDate && <p className="mt-1 text-[12px] muted">{Number(p.remaining) > 0 ? 'Balance due by' : 'Next payment due'} {fmtDate(p.nextDueDate)}</p>}</>}
          {p.status === 'Void' && <p className="mt-2 text-[12.5px] text-red-600">Voided: {p.voidReason}</p>}
        </div>

        {voidMode && (
          <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 dark:border-red-900 dark:bg-red-950/30">
            <Field label="Reason for voiding" hint="Required. Shown on the invoice and in the audit log."><Input value={voidReason} onChange={(e) => setVoidReason(e.target.value)} placeholder="e.g. Entered twice by mistake" /></Field>
            <div className="mt-3 flex justify-end gap-2"><Button size="sm" onClick={() => setVoidMode(false)}>Cancel</Button><Button size="sm" variant="danger" loading={busy === 'void'} onClick={voidIt}>Void payment</Button></div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button icon={<Download className="size-4" />} onClick={download} loading={busy === 'dl'} data-testid="inv-download">Download PDF</Button>
          <Button icon={<Printer className="size-4" />} onClick={print} loading={busy === 'print'}>Print</Button>
        </div>

        <div className="rounded-xl border border-[var(--border)] p-4">
          <p className="flex items-center gap-2 text-[13.5px] font-semibold"><MessageCircle className="size-4 text-emerald-600" />Send invoice on WhatsApp</p>
          <p className="mt-1 text-[12.5px] muted">{number ? <>To {fmtPhone(number)} (registered {cleanPhone(student?.whatsapp || '') ? 'WhatsApp' : 'phone'} number).</> : 'No valid number on file for this student.'} WhatsApp links cannot attach files, so the PDF is shared in step 2.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Button variant="primary" icon={<ExternalLink className="size-4" />} onClick={openChat} loading={busy === 'wa'} data-testid="inv-wa">1 · Open chat with message</Button>
            <Button icon={canShareFiles ? <Share2 className="size-4" /> : <FileText className="size-4" />} onClick={sharePdf} loading={busy === 'share'} data-testid="inv-share">2 · {canShareFiles ? 'Share PDF' : 'Get PDF to attach'}</Button>
          </div>
          {[waStatus, pdfStatus].filter(Boolean).map((s, i) => (
            <p key={i} data-testid="inv-status" className={cx('mt-3 flex items-start gap-2 rounded-[10px] px-3 py-2 text-[12.5px]', s!.tone === 'ok' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' : s!.tone === 'warn' ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300' : 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400')}>
              {s!.tone === 'ok' ? <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" /> : <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />}{s!.text}
            </p>
          ))}
        </div>
      </div>
    </Modal>
  );
}

// ---------------- WhatsApp reminder ----------------
export function ReminderDialog({ target, onClose }: { target: { student: Student; amount: number; months: string } | null; onClose: () => void }) {
  const data = useData();
  const { mutate } = useApp();
  const [msg, setMsg] = useState('');
  const [status, setStatus] = useState<StepStatus>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!target) return;
    setStatus(null);
    setMsg(fillTemplate(data.settings.reminderTemplate, { name: target.student.name, academy: data.settings.academyName, amount: target.amount.toLocaleString('en-IN'), months: target.months, id: target.student.id }));
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!target) return null;
  const number = waNumber(target.student.whatsapp, target.student.phone);
  const send = async () => {
    if (!number) { setStatus({ tone: 'err', text: 'No valid WhatsApp or phone number for this student.' }); return; }
    setBusy(true);
    openWhatsApp(number, msg);
    try {
      await mutate('reminders.log', { studentId: target.student.id, phone: number.slice(2), amount: target.amount, months: target.months, message: msg });
      setStatus({ tone: 'warn', text: `WhatsApp opened for ${fmtPhone(number)}. The reminder is only sent when you press Send in WhatsApp. Logged in reminder history.` });
    } catch (e) { setStatus({ tone: 'err', text: `WhatsApp opened, but the reminder could not be logged: ${(e as Error).message}` }); }
    finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={`Remind ${target.student.name}`} description={`${rupees(target.amount)} · ${target.months}`}
      footer={<><Button onClick={onClose}>Close</Button><Button variant="primary" icon={<MessageCircle className="size-4" />} loading={busy} onClick={send} data-testid="rem-send">Open WhatsApp</Button></>}>
      <Field label="Message" hint={number ? `To ${fmtPhone(number)}` : 'No valid number on file'}><Textarea rows={7} value={msg} onChange={(e) => setMsg(e.target.value)} /></Field>
      {status && <p data-testid="rem-status" className={cx('mt-3 rounded-[10px] px-3 py-2 text-[12.5px]', status.tone === 'err' ? 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400' : 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300')}>{status.text}</p>}
    </Modal>
  );
}

export function monthSort(a: string, b: string) { return monthIndex(a) - monthIndex(b); }
