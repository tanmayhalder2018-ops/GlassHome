// A4 PDF invoices built in the browser with jsPDF (vector text, embedded Inter for the ₹ sign).
import type { Payment, Settings, Student } from './types';
import { fmtDate, fmtPhone, rupees } from './format';

let fontCache: Record<string, string> | null = null;
const assetCache = new Map<string, string>();

function toBase64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf); let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
async function loadFonts() {
  if (fontCache) return fontCache;
  const out: Record<string, string> = {};
  await Promise.all(['400', '500', '600', '700'].map(async (w) => {
    const r = await fetch(`/fonts/Inter-${w}.ttf`);
    if (!r.ok) throw new Error('Could not load the invoice font.');
    out[w] = toBase64(await r.arrayBuffer());
  }));
  return (fontCache = out);
}
async function dataUrl(path: string) {
  if (assetCache.has(path)) return assetCache.get(path)!;
  const r = await fetch(path); const b = await r.blob();
  const url = await new Promise<string>((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.onerror = rej; fr.readAsDataURL(b); });
  assetCache.set(path, url); return url;
}

export interface InvoiceInput { payment: Payment; student?: Student; batchName?: string; settings: Settings }

export function invoiceFileName(p: Payment) { return `${p.invoiceNo || 'Receipt-' + p.id}_${(p.studentName || '').replace(/[^\w]+/g, '-')}.pdf`; }

export async function buildInvoicePdf({ payment: p, student, batchName, settings }: InvoiceInput): Promise<Blob> {
  const [{ jsPDF }, fonts, logo, tml] = await Promise.all([
    import('jspdf'), loadFonts(), settings.logo ? Promise.resolve(settings.logo) : dataUrl('/brand/rza-logo.png'), dataUrl('/brand/tml-logo.png'),
  ]);
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  for (const [w, b64] of Object.entries(fonts)) { doc.addFileToVFS(`Inter-${w}.ttf`, b64); doc.addFont(`Inter-${w}.ttf`, 'Inter', `w${w}`); }
  const font = (w: '400' | '500' | '600' | '700', size: number, color: [number, number, number] = [24, 24, 27]) => { doc.setFont('Inter', `w${w}`); doc.setFontSize(size); doc.setTextColor(...color); };
  const MUTED: [number, number, number] = [113, 113, 122], SOFT: [number, number, number] = [161, 161, 170], INK: [number, number, number] = [24, 24, 27];
  const W = 210, L = 16, R = W - 16;
  const isLegacy = !p.invoiceNo, isVoid = p.status === 'Void';
  const prev = Number(p.previousBalance) || 0, cur = Number(p.currentFee) || 0, paid = Number(p.amount) || 0;
  const remaining = p.remaining === '' ? Math.max(prev + cur - paid, 0) : Number(p.remaining);

  // ---- header
  doc.addImage(logo, logo.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG', L, 14, 26, 26);
  font('700', 15, INK); doc.text(settings.academyName || 'Rhythm Zone Academy', L + 31, 20);
  font('400', 8.5, MUTED);
  const contact = [settings.tagline, settings.address, [settings.phone && fmtPhone(settings.phone), settings.email].filter(Boolean).join('  ·  '), settings.website?.replace(/^https?:\/\//, '')].filter(Boolean) as string[];
  let cy = 25; contact.forEach((line) => { doc.text(doc.splitTextToSize(line, 88), L + 31, cy); cy += 4.2 * Math.max(1, doc.splitTextToSize(line, 88).length); });

  font('700', 21, INK); doc.text(isLegacy ? 'RECEIPT' : 'INVOICE', R, 21, { align: 'right' });
  font('400', 8.5, MUTED);
  doc.text(isLegacy ? 'Receipt for' : 'Invoice No.', R - 42, 28); doc.text('Invoice Date', R - 42, 33);
  font('600', 8.5, INK);
  doc.text(isLegacy ? p.id : p.invoiceNo, R, 28, { align: 'right' }); doc.text(fmtDate(p.date), R, 33, { align: 'right' });
  const chip = isVoid ? 'VOID' : remaining > 0 ? 'PARTIALLY PAID' : 'PAID';
  const chipColor: [number, number, number] = isVoid ? [220, 38, 38] : remaining > 0 ? [217, 119, 6] : [22, 163, 74];
  font('700', 7.5, [255, 255, 255]);
  const cw = doc.getTextWidth(chip) + 7;
  doc.setFillColor(...chipColor); doc.roundedRect(R - cw, 36.5, cw, 6, 3, 3, 'F'); doc.text(chip, R - cw / 2, 40.6, { align: 'center' });

  let y = Math.max(cy, 46) + 2;
  doc.setDrawColor(228, 228, 231); doc.setLineWidth(0.3); doc.line(L, y, R, y); y += 8;

  // ---- billed to / course
  font('600', 7.5, SOFT); doc.text('BILLED TO', L, y); doc.text('COURSE DETAILS', 112, y); y += 5.5;
  font('600', 11, INK); doc.text(p.studentName || '', L, y); doc.text(p.course || student?.instrument || '—', 112, y); y += 5;
  font('400', 8.5, MUTED);
  const left = [`Student ID: ${p.studentId}`, student?.parentName ? `Parent/Guardian: ${student.parentName}` : '', student ? `Phone: ${fmtPhone(student.whatsapp || student.phone)}` : ''].filter(Boolean);
  const right = [batchName ? `Batch: ${batchName}` : '', `Billing period: ${p.months || '—'}`, student ? `Monthly tuition fee: ${rupees(student.fee)}` : ''].filter(Boolean);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    if (left[i]) doc.text(left[i], L, y);
    if (right[i]) doc.text(doc.splitTextToSize(right[i], R - 112), 112, y);
    y += 4.6;
  }
  y += 5;

  // ---- amount summary
  const rowH = 9;
  doc.setFillColor(244, 244, 245); doc.roundedRect(L, y, R - L, 8, 1.5, 1.5, 'F');
  font('600', 8, MUTED); doc.text('DESCRIPTION', L + 4, y + 5.3); doc.text('AMOUNT', R - 4, y + 5.3, { align: 'right' }); y += 8;
  const line = (label: string, sub: string, amount: string, opts: { bold?: boolean; color?: [number, number, number]; top?: boolean } = {}) => {
    if (opts.top) { doc.setDrawColor(212, 212, 216); doc.line(L, y, R, y); }
    font(opts.bold ? '700' : '500', opts.bold ? 10.5 : 9.5, opts.color || INK); doc.text(label, L + 4, y + 6);
    if (sub) { font('400', 7.5, SOFT); doc.text(sub, L + 4 + doc.getTextWidth(label) * (opts.bold ? 10.5 / 7.5 : 9.5 / 7.5) + 2.5, y + 6); }
    font(opts.bold ? '700' : '500', opts.bold ? 10.5 : 9.5, opts.color || INK); doc.text(amount, R - 4, y + 6, { align: 'right' });
    y += rowH;
    doc.setDrawColor(244, 244, 245); doc.line(L, y, R, y);
  };
  if (isLegacy) {
    line('Amount received', p.months ? `(${p.months})` : '', rupees(paid), { bold: true });
  } else {
    line('Previous outstanding balance', '', rupees(prev));
    line('Current fee', p.months ? `(${p.months})` : '', rupees(cur));
    line('Total payable', '', rupees(prev + cur), { bold: true, top: true });
    line('Amount paid', `${p.method}${p.reference ? ' · Ref ' + p.reference : ''}`, '− ' + rupees(paid), { color: [22, 163, 74] });
    line('Remaining due', '', rupees(remaining), { bold: true, color: remaining > 0 ? [220, 38, 38] : INK, top: true });
  }
  y += 6;

  // ---- allocation
  if (p.allocation && p.allocation.length) {
    font('600', 7.5, SOFT); doc.text('PAYMENT APPLIED TO', L, y); y += 4;
    const cols = [L + 4, 92, 130, R - 4];
    font('500', 8, MUTED);
    doc.text('Month', cols[0], y + 4); doc.text('Fee', cols[1], y + 4, { align: 'right' }); doc.text('Paid now', cols[2], y + 4, { align: 'right' }); doc.text('Balance', cols[3], y + 4, { align: 'right' });
    y += 6; doc.setDrawColor(228, 228, 231); doc.line(L, y, R, y);
    p.allocation.forEach((a) => {
      font('400', 8.5, INK);
      doc.text(a.month, cols[0], y + 5); doc.text(rupees(a.fee), cols[1], y + 5, { align: 'right' }); doc.text(rupees(a.amount), cols[2], y + 5, { align: 'right' }); doc.text(rupees(a.dueAfter), cols[3], y + 5, { align: 'right' });
      y += 7; doc.setDrawColor(244, 244, 245); doc.line(L, y, R, y);
    });
    y += 7;
  }

  // ---- info boxes
  const boxes: [string, string][] = [
    ['Payment method', p.method || '—'],
    ['Payment status', isVoid ? 'Void' : remaining > 0 ? 'Partially paid' : 'Paid in full'],
    [remaining > 0 ? 'Balance due by' : 'Next payment due', p.nextDueDate ? fmtDate(p.nextDueDate) : '—'],
  ];
  const bw = (R - L - 8) / 3;
  boxes.forEach(([k, v], i) => {
    const x = L + i * (bw + 4);
    doc.setDrawColor(228, 228, 231); doc.roundedRect(x, y, bw, 15, 2, 2, 'S');
    font('500', 7.5, SOFT); doc.text(k.toUpperCase(), x + 4, y + 5.5);
    font('600', 10, INK); doc.text(v, x + 4, y + 11.5);
  });
  y += 24;
  if (p.notes) { font('400', 8.5, MUTED); doc.text(doc.splitTextToSize(`Note: ${p.notes}`, R - L), L, y); y += 8; }
  if (isVoid && p.voidReason) { font('500', 8.5, [220, 38, 38]); doc.text(`Voided: ${p.voidReason}`, L, y); y += 8; }

  // ---- footer: thank you + signature
  const fy = 240;
  font('600', 11, INK); doc.text(doc.splitTextToSize(settings.invoiceFooter || 'Thank you!', 100), L, fy);
  font('400', 8, MUTED); doc.text('This is a computer-generated invoice.', L, fy + 10);
  doc.setDrawColor(161, 161, 170); doc.line(R - 60, fy + 8, R, fy + 8);
  font('500', 8.5, INK); doc.text(settings.signatory || 'Authorised Signatory', R, fy + 13, { align: 'right' });
  font('400', 7.5, MUTED); doc.text(`for ${settings.academyName || 'Rhythm Zone Academy'}`, R, fy + 17.5, { align: 'right' });

  doc.setDrawColor(228, 228, 231); doc.line(L, 272, R, 272);
  doc.addImage(tml, 'PNG', L, 275.5, 9, 9);
  font('400', 7.5, MUTED);
  doc.text(`${settings.academyName || 'Rhythm Zone Academy'} · in association with ${settings.studioName || 'T Music Lab'}`, L + 12, 279.5);
  doc.text(`Recorded by ${p.recordedBy || '—'} · ${p.id}`, L + 12, 283.5);
  doc.text('Page 1 of 1', R, 281.5, { align: 'right' });

  if (isVoid) {
    font('700', 90, [254, 202, 202]);
    doc.text('VOID', W / 2, 175, { align: 'center', angle: 30 });
  }
  doc.setProperties({ title: `${isLegacy ? 'Receipt' : 'Invoice'} ${p.invoiceNo || p.id}`, author: settings.academyName, creator: 'RZAMS Pro' });
  return doc.output('blob');
}
