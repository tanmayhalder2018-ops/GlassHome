import { useRef, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { useApp, useData } from '../lib/store';
import type { Student } from '../lib/types';
import { cleanPhone } from '../lib/format';
import { imageToJpeg } from '../lib/share';
import { Avatar, Button, Field, Input, Modal, Select, Textarea, useUi } from './ui';

type Form = { billing: 'Postpaid' | 'Prepaid'; name: string; parentName: string; phone: string; whatsapp: string; sameWa: boolean; email: string; address: string; joinDate: string; courseId: string; batchId: string; fee: string; status: 'Active' | 'Inactive'; notes: string; photo: string };

export default function StudentForm({ open, onClose, student, onSaved }: { open: boolean; onClose: () => void; student?: Student; onSaved?: (s: Student) => void }) {
  const data = useData();
  const { mutate } = useApp();
  const { toast } = useUi();
  const fileRef = useRef<HTMLInputElement>(null);
  const empty: Form = { billing: data.settings.defaultBilling === 'Prepaid' ? 'Prepaid' : 'Postpaid', name: '', parentName: '', phone: '', whatsapp: '', sameWa: true, email: '', address: '', joinDate: data.meta.today, courseId: '', batchId: '', fee: '', status: 'Active', notes: '', photo: '' };
  const [f, setF] = useState<Form>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [seenKey, setSeenKey] = useState<unknown>(null);
  const openKey = open ? student || 'new' : null;
  if (openKey && openKey !== seenKey) {
    setSeenKey(openKey); setErrors({}); setError('');
    setF(student ? {
      billing: student.billing === 'Prepaid' || student.billing === 'Postpaid' ? student.billing : (data.settings.defaultBilling === 'Prepaid' ? 'Prepaid' : 'Postpaid'),
      name: student.name, parentName: student.parentName, phone: cleanPhone(student.phone) || student.phone, whatsapp: cleanPhone(student.whatsapp),
      sameWa: !student.whatsapp || cleanPhone(student.whatsapp) === cleanPhone(student.phone), email: student.email, address: student.address,
      joinDate: student.joinDate, courseId: student.courseId, batchId: student.batchId, fee: String(student.fee ?? ''), status: student.status, notes: student.notes, photo: student.photo,
    } : empty);
  }
  if (!openKey && seenKey) setSeenKey(null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const courses = data.courses.filter((c) => c.status === 'Active' || c.id === f.courseId);
  const batches = data.batches.filter((b) => (b.status === 'Active' || b.id === f.batchId) && (!f.courseId || b.courseId === f.courseId));

  const onCourse = (id: string) => {
    const c = data.courses.find((x) => x.id === id), prev = data.courses.find((x) => x.id === f.courseId);
    setF((x) => ({ ...x, courseId: id, batchId: data.batches.find((b) => b.id === x.batchId)?.courseId === id ? x.batchId : '', fee: c && (!x.fee || (prev && Number(x.fee) === prev.fee)) && c.fee > 0 ? String(c.fee) : x.fee }));
  };

  const pickPhoto = async (file?: File) => {
    if (!file) return;
    try { set('photo', await imageToJpeg(file)); } catch (e) { toast((e as Error).message, 'error'); }
  };

  const validate = () => {
    const e: typeof errors = {};
    if (!f.name.trim()) e.name = 'Name is required';
    if (!cleanPhone(f.phone)) e.phone = 'Enter a valid 10-digit mobile number';
    if (!f.sameWa && f.whatsapp && !cleanPhone(f.whatsapp)) e.whatsapp = 'Enter a valid 10-digit number';
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Email address is not valid';
    if (f.fee === '' || !(Number(f.fee) >= 0)) e.fee = 'Enter the monthly fee';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const save = async () => {
    setError('');
    if (!validate()) return;
    setBusy(true);
    try {
      const payload = { id: student?.id, name: f.name, parentName: f.parentName, phone: f.phone, whatsapp: f.sameWa ? f.phone : f.whatsapp, email: f.email, address: f.address, joinDate: f.joinDate, courseId: f.courseId, batchId: f.batchId, fee: f.fee, billing: f.billing, status: f.status, notes: f.notes, photo: f.photo, instrument: student?.instrument, batch: student?.batch };
      const r = await mutate<{ student: Student }>('students.save', payload);
      toast(student ? 'Student updated' : `Student added · ${r.student.id}`);
      onSaved?.(r.student); onClose();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={student ? `Edit ${student.name}` : 'Add student'} description={student ? student.id : 'A unique student ID is created automatically.'} size="lg"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={save} data-testid="save-student">{student ? 'Save changes' : 'Add student'}</Button></>}>
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <Avatar name={f.name || '?'} src={f.photo} size={64} />
          <div className="flex gap-2">
            <Button size="sm" icon={<Camera className="size-4" />} onClick={() => fileRef.current?.click()}>{f.photo ? 'Change photo' : 'Add photo'}</Button>
            {f.photo && <Button size="sm" variant="ghost" icon={<Trash2 className="size-4" />} onClick={() => set('photo', '')}>Remove</Button>}
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { pickPhoto(e.target.files?.[0]); e.target.value = ''; }} />
          </div>
        </div>
        <section>
          <h3 className="mb-3 text-[12px] font-medium uppercase tracking-wide faint">Personal information</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Student name *" error={errors.name}><Input value={f.name} onChange={(e) => set('name', e.target.value)} aria-invalid={!!errors.name} data-testid="st-name" /></Field>
            <Field label="Parent / guardian name"><Input value={f.parentName} onChange={(e) => set('parentName', e.target.value)} /></Field>
            <Field label="Phone number *" error={errors.phone}><Input type="tel" inputMode="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="10-digit mobile" aria-invalid={!!errors.phone} data-testid="st-phone" /></Field>
            <Field label="WhatsApp number" error={errors.whatsapp}>
              {f.sameWa
                ? <label className="flex h-[38px] items-center gap-2 text-[13.5px]"><input type="checkbox" checked onChange={() => set('sameWa', false)} className="size-4 accent-zinc-900" />Same as phone number</label>
                : <div className="flex gap-2"><Input type="tel" inputMode="tel" value={f.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="10-digit WhatsApp" aria-invalid={!!errors.whatsapp} /><Button size="sm" variant="ghost" className="h-[38px]" onClick={() => set('sameWa', true)}>Same</Button></div>}
            </Field>
            <Field label="Email" error={errors.email}><Input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} aria-invalid={!!errors.email} /></Field>
            <Field label="Admission date"><Input type="date" value={f.joinDate} max={data.meta.today} onChange={(e) => set('joinDate', e.target.value)} /></Field>
            <Field label="Address" className="sm:col-span-2"><Input value={f.address} onChange={(e) => set('address', e.target.value)} /></Field>
          </div>
        </section>
        <section>
          <h3 className="mb-3 text-[12px] font-medium uppercase tracking-wide faint">Course information</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Course / instrument" hint={!f.courseId && student?.instrument ? `Currently: ${student.instrument}` : undefined}>
              <Select value={f.courseId} onChange={(e) => onCourse(e.target.value)} data-testid="st-course"><option value="">Not set</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
            </Field>
            <Field label="Batch" hint={!f.batchId && student?.batch ? `Currently: ${student.batch}` : undefined}>
              <Select value={f.batchId} onChange={(e) => set('batchId', e.target.value)}><option value="">Not assigned</option>{batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select>
            </Field>
            <Field label="Monthly fee (₹) *" error={errors.fee}><Input type="number" min={0} inputMode="numeric" value={f.fee} onChange={(e) => set('fee', e.target.value)} aria-invalid={!!errors.fee} data-testid="st-fee" /></Field>
            <Field label="Fee billing" hint={f.billing === 'Postpaid' ? 'Pays after the month (November collects October)' : 'Pays at the start of the month'}><Select value={f.billing} onChange={(e) => set('billing', e.target.value as Form['billing'])} data-testid="st-billing"><option value="Postpaid">Postpaid</option><option value="Prepaid">Prepaid</option></Select></Field>
            <Field label="Status"><Select value={f.status} onChange={(e) => set('status', e.target.value as Form['status'])}><option value="Active">Active</option><option value="Inactive">Inactive (archived)</option></Select></Field>
            <Field label="Notes" className="sm:col-span-2"><Textarea rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
          </div>
        </section>
        {error && <p role="alert" className="rounded-[10px] bg-red-50 px-3 py-2 text-[13px] text-red-700 dark:bg-red-950/50 dark:text-red-400">{error}</p>}
      </div>
    </Modal>
  );
}
