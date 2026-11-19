import { cleanPhone } from './format';

/** International WhatsApp number (91XXXXXXXXXX) or '' */
export function waNumber(...candidates: (string | undefined)[]) {
  for (const c of candidates) { const p = cleanPhone(c || ''); if (p) return '91' + p; }
  return '';
}
export function waUrl(number: string, text: string) { return `https://wa.me/${number}?text=${encodeURIComponent(text)}`; }
export function openWhatsApp(number: string, text: string) { window.open(waUrl(number, text), '_blank', 'noopener'); }

export type ShareOutcome = 'shared' | 'cancelled' | 'unsupported' | 'failed';
/**
 * Opens the phone's share sheet with the PDF (Android/iOS browsers that support
 * sharing files). Resolves 'shared' when the share sheet completed – this does
 * NOT confirm that WhatsApp delivered the message.
 */
export async function shareFile(blob: Blob, filename: string, text: string): Promise<ShareOutcome> {
  const file = new File([blob], filename, { type: blob.type || 'application/pdf' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (!nav.share || !nav.canShare || !nav.canShare({ files: [file] })) return 'unsupported';
  try { await nav.share({ files: [file], text, title: filename }); return 'shared'; }
  catch (e) { return (e as DOMException)?.name === 'AbortError' ? 'cancelled' : 'failed'; }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export function printBlob(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  frame.src = url;
  frame.onload = () => { try { frame.contentWindow?.focus(); frame.contentWindow?.print(); } catch { window.open(url, '_blank'); } setTimeout(() => { frame.remove(); URL.revokeObjectURL(url); }, 60000); };
  document.body.appendChild(frame);
}

export function toCsv(rows: (string | number | null | undefined)[][]) {
  return '﻿' + rows.map((r) => r.map((v) => {
    let s = v === null || v === undefined ? '' : String(v);
    if (/^[=+\-@]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = "'" + s; // no spreadsheet formulas
    return '"' + s.replace(/"/g, '""') + '"';
  }).join(',')).join('\r\n');
}
export function downloadCsv(rows: (string | number | null | undefined)[][], filename: string) { downloadBlob(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }), filename); }

/** Resize an image file to a square JPEG data URL (for student photos, kept small for the sheet). */
export async function imageToJpeg(file: File, size = 160, quality = 0.82): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Could not read that image.')); i.src = url; });
    const c = document.createElement('canvas'); c.width = size; c.height = size;
    const s = Math.min(img.width, img.height), ctx = c.getContext('2d')!;
    ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
    return c.toDataURL('image/jpeg', quality);
  } finally { URL.revokeObjectURL(url); }
}
export async function imageToPng(file: File, max = 240): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Could not read that image.')); i.src = url; });
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    const jpeg = c.toDataURL('image/jpeg', 0.85), png = c.toDataURL('image/png');
    return png.length < 42000 ? png : jpeg;
  } finally { URL.revokeObjectURL(url); }
}
