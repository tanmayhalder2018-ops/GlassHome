export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function rupees(n: number | '' | null | undefined, opts: { sign?: boolean } = {}) {
  const v = Number(n) || 0;
  const s = '₹' + Math.abs(v).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  return v < 0 ? '−' + s : opts.sign && v > 0 ? '+' + s : s;
}
export function compactRupees(n: number) {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 100000) return '₹' + (v / 100000).toFixed(v % 100000 === 0 ? 0 : 1) + 'L';
  if (Math.abs(v) >= 1000) return '₹' + (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1) + 'k';
  return '₹' + v;
}

export function pad2(n: number) { return String(n).padStart(2, '0'); }
export function isoOf(d: Date) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
export function parseIso(s: string) { const [y, m, d] = s.split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); }
export function addDays(iso: string, n: number) { const d = parseIso(iso); d.setDate(d.getDate() + n); return isoOf(d); }

export function fmtDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso || '—';
  return parseIso(iso.slice(0, 10)).toLocaleDateString('en-IN', opts);
}
export function fmtDateTime(s: string) {
  if (!s) return '—';
  const m = s.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
  return m ? `${fmtDate(m[1])}, ${fmtTime(`${m[2]}:${m[3]}`)}` : s;
}
export function fmtTime(t: string) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  return `${((h + 11) % 12) + 1}:${pad2(m)} ${ap}`;
}

/** 'November 2026' -> year*12 + month0 */
export function monthIndex(label: string) {
  const m = String(label || '').trim().match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (!m) return -1;
  const i = MONTHS.findIndex((x) => x.toLowerCase().startsWith(m[1].toLowerCase().slice(0, 3)));
  return i < 0 ? -1 : +m[2] * 12 + i;
}
export function monthLabel(idx: number) { return `${MONTHS[idx % 12]} ${Math.floor(idx / 12)}`; }
export function shortMonth(idx: number) { return `${MONTHS[idx % 12].slice(0, 3)} ${String(Math.floor(idx / 12)).slice(2)}`; }
export function monthIndexOfIso(iso: string) { if (!/^\d{4}-\d{2}/.test(iso || '')) return -1; return +iso.slice(0, 4) * 12 + +iso.slice(5, 7) - 1; }
export function monthKeyOfIso(iso: string) { return (iso || '').slice(0, 7); }

/** 10-digit Indian mobile or '' */
export function cleanPhone(v: string) {
  let d = String(v || '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return d.length === 10 ? d : '';
}
export function fmtPhone(v: string) { const p = cleanPhone(v); return p ? `+91 ${p.slice(0, 5)} ${p.slice(5)}` : v || '—'; }

export function initials(name: string) { return (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join(''); }

export function fillTemplate(tpl: string, vars: Record<string, string | number>) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export function cx(...c: (string | false | null | undefined)[]) { return c.filter(Boolean).join(' '); }
