// Minimal in-memory emulation of the Apps Script services RZAMS uses,
// so Code.gs can be tested locally. Run with TZ=Asia/Kolkata.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const isDate = (v) => Object.prototype.toString.call(v) === '[object Date]';
const pad = (n) => String(n).padStart(2, '0');
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Google Sheets turns typed text into dates/numbers unless the cell is plain text.
function autoConvert(v, textFormat) {
  if (typeof v !== 'string' || textFormat) return v;
  let m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = v.match(/^([A-Za-z]+) (\d{4})$/);
  if (m && MONTHS.includes(m[1])) return new Date(+m[2], MONTHS.indexOf(m[1]), 1);
  if (/^-?\d+(\.\d+)?$/.test(v.trim())) return Number(v);
  return v;
}
// Display text as an Indian-locale sheet shows it.
function display(v) {
  if (v === null || v === undefined) return '';
  if (isDate(v)) return `${pad(v.getDate())}/${pad(v.getMonth() + 1)}/${v.getFullYear()}`;
  return String(v);
}

class Sheet {
  constructor(name) { this.name = name; this.rows = []; this.textFmt = {}; this.frozen = 0; }
  width() { return this.rows.reduce((w, r) => Math.max(w, r.length), 0); }
  getLastRow() { return this.rows.length; }
  appendRow(row) { const r = this.rows.length; this.rows.push(row.map((v, c) => autoConvert(v, this.textFmt[`${r}:${c}`]))); }
  deleteRow(n) { this.rows.splice(n - 1, 1); }
  getDataRange() { return new Range(this, 1, 1, Math.max(this.rows.length, 1), Math.max(this.width(), 1)); }
  getRange(r, c, nr = 1, nc = 1) { return new Range(this, r, c, nr, nc); }
  setFrozenRows(n) { this.frozen = n; }
  autoResizeColumns() {}
}
class Range {
  constructor(sheet, r, c, nr, nc) { Object.assign(this, { sheet, r, c, nr, nc }); }
  cell(i, j) { const row = this.sheet.rows[this.r - 1 + i]; const v = row ? row[this.c - 1 + j] : undefined; return v === undefined ? '' : v; }
  getValues() { if (!this.sheet.rows.length) return [[]]; return Array.from({ length: this.nr }, (_, i) => Array.from({ length: this.nc }, (_, j) => { const v = this.cell(i, j); return isDate(v) ? new Date(v) : v; })); }
  getDisplayValues() { if (!this.sheet.rows.length) return [[]]; return Array.from({ length: this.nr }, (_, i) => Array.from({ length: this.nc }, (_, j) => display(this.cell(i, j)))); }
  getDisplayValue() { return display(this.cell(0, 0)); }
  setValues(vals) {
    if (vals.length !== this.nr || vals.some((r) => r.length !== this.nc)) throw new Error(`setValues size mismatch on ${this.sheet.name}`);
    vals.forEach((row, i) => {
      const ri = this.r - 1 + i;
      while (this.sheet.rows.length <= ri) this.sheet.rows.push([]);
      row.forEach((v, j) => { this.sheet.rows[ri][this.c - 1 + j] = autoConvert(v, this.sheet.textFmt[`${ri}:${this.c - 1 + j}`]); });
    });
    return this;
  }
  setValue(v) { return this.setValues([[v]]); }
  setNumberFormat(f) { for (let i = 0; i < this.nr; i++) for (let j = 0; j < this.nc; j++) this.sheet.textFmt[`${this.r - 1 + i}:${this.c - 1 + j}`] = f === '@'; return this; }
  setFontWeight() { return this; } setBackground() { return this; } setFontColor() { return this; }
}

function makeServices(props) {
  const sheets = {};
  const order = [];
  const ss = {
    getSheetByName: (n) => sheets[n] || null,
    insertSheet: (n) => { sheets[n] = new Sheet(n); order.push(n); return sheets[n]; },
    getSheets: () => order.map((n) => sheets[n]),
    deleteSheet: (s) => { delete sheets[s.name]; order.splice(order.indexOf(s.name), 1); },
  };
  const cache = new Map();
  const calendarEvents = [];
  const services = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ss },
    CacheService: { getScriptCache: () => ({ get: (k) => (cache.has(k) ? cache.get(k) : null), put: (k, v) => cache.set(k, String(v)), remove: (k) => cache.delete(k) }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = v; } }) },
    Session: { getScriptTimeZone: () => 'Asia/Kolkata' },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      formatDate: (d, tz, fmt) => {
        const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d).map((x) => [x.type, x.value]));
        if (fmt === 'yyyy-MM-dd') return `${p.year}-${p.month}-${p.day}`;
        if (fmt === 'yyyy-MM') return `${p.year}-${p.month}`;
        throw new Error('formatDate fmt not mocked: ' + fmt);
      },
    },
    CalendarApp: {
      getCalendarsByName: () => [{ getEventsForDay: () => [], createAllDayEvent: (t, d, o) => calendarEvents.push({ t, d, o }) }],
      createCalendar: () => ({}),
      getAllCalendars: () => [],
    },
    HtmlService: { XFrameOptionsMode: { ALLOWALL: 1 } },
    console,
  };
  return { services, sheets, ss, cache, calendarEvents, props };
}

function loadBackend(props = { APP_PASSWORD: 'test-pass' }) {
  const env = makeServices(props);
  const ctx = vm.createContext({ ...env.services });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', 'Code.gs'), 'utf8'), ctx, { filename: 'Code.gs' });
  return { ctx, ...env };
}

// Sample data that reproduces what was found in the live sheet (no real personal data).
function seed(env) {
  env.ctx.initializeSheets();
  const st = env.sheets['Students'], fe = env.sheets['Fees'], at = env.sheets['Attendance'], sc = env.sheets['Studio Clients'];
  const D = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  st.rows.push(['STU001', 'Asha Test', 9000000001, 'P One', 'Vocals', 'Saturday EVE', 500, D('2026-07-01'), 'Active']);
  st.rows.push(['STU002', 'Bikram Test', 919000000002, '', 'Guitar', 'Morning', 700, D('2026-11-05'), 'Active']);
  st.rows.push(['STU003', 'Charu Test', 9000000003, '', 'Piano/Keyboard', 'Evening', 600, D('2026-07-10'), 'Inactive']);
  st.rows.push(['STU005', 'Dipa Test', 9000000005, '', 'Vocals', 'Wednesday ', 600, D('2026-07-02'), 'Active']);
  fe.rows.push(['STU001', 'Asha Test', 'July 2026', 500, 500, 0, D('2026-07-05')]);
  fe.rows.push(['STU001', 'Asha Test', 'September ', 200, 200, 0, D('2026-09-03')]);
  fe.rows.push(['STU009', 'Gone Test', D('2026-08-01'), 600, 1200, 0, D('2026-08-04')]); // month stored as a date, overpaid, deleted student
  fe.rows.push(['STU008', 'Removed Test', 'July 2026', 650, 650, 0, D('2026-07-06')]);
  fe.rows.push(['STU005', 'Dipa Test', 'October 2026', 600, 400, 200, D('2026-10-08')]);
  at.rows.push([D('2026-08-01'), 'STU001', 'Asha Test', 'Present']);
  at.rows.push([D('2026-08-01'), 'STU005', 'Dipa Test', 'Absent']);
  sc.rows.push(['Studio One', 9000000101, 'Song A', 5000, 2000, 3000, 'Ongoing']);
  sc.rows.push(['Studio Two', 9000000102, 'Song B', 3000, 3000, 0, 'Completed']);
}

module.exports = { loadBackend, seed, isDate };
