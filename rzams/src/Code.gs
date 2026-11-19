/**
 * =====================================================================
 * RZAMS - Rhythm Zone Academy Management System
 * Backend (Google Apps Script) - Code.gs
 *
 * v2.1 (Stage 1: data accuracy & safety) + v3 compatibility (see Api.gs)
 *  - Password is read from Script Properties (APP_PASSWORD), not the code.
 *  - Login is locked for 10 minutes after 5 wrong passwords.
 *  - Dates are read from the real cell value, so attendance saved on a
 *    day is found again on that day (and the dashboard counts it).
 *  - Pending fees are calculated from each active student's monthly fee,
 *    from FEE_START_MONTH (default "November 2026") up to this month.
 *  - One payment can be split across several months, oldest first.
 *    Topping up a partly-paid month no longer overwrites its amount.
 *  - "Delete student" archives the student (Status = Inactive), so their
 *    payment and attendance history stays linked and IDs are never reused.
 *  - All writes are serialised with LockService (no double entries when
 *    two phones save at the same time) and input is validated server-side.
 *
 * All function names used by the previous version are kept, so an old
 * browser tab keeps working after the new version is deployed.
 * The sheet layout (tabs and columns) is unchanged.
 * =====================================================================
 */

var SESSION_DURATION = 21600; // 6 hours
var DEFAULT_FEE_START_MONTH = 'November 2026';
var MAX_LOGIN_FAILURES = 5;
var LOGIN_LOCK_SECONDS = 600;

var SHEET_NAMES = { STUDENTS: 'Students', ATTENDANCE: 'Attendance', FEES: 'Fees', STUDIO: 'Studio Clients', TASKS: 'Tasks' };
var HEADERS = {
  'Students': ['Student ID', 'Student Name', 'Phone', 'Parent Name', 'Instrument', 'Batch', 'Monthly Fee', 'Join Date', 'Status'],
  'Attendance': ['Date', 'Student ID', 'Student Name', 'Present/Absent'],
  'Fees': ['Student ID', 'Student Name', 'Month', 'Amount', 'Paid', 'Due', 'Payment Date'],
  'Studio Clients': ['Client Name', 'Phone', 'Project Name', 'Total Amount', 'Advance', 'Due', 'Status'],
  'Tasks': ['Date', 'Task', 'Priority', 'Status', 'Notes']
};
var NUMERIC_HEADERS = { 'Amount': 1, 'Paid': 1, 'Due': 1, 'Monthly Fee': 1, 'Total Amount': 1, 'Advance': 1 };
var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
var INSTRUMENTS = ['Guitar', 'Piano/Keyboard', 'Drums', 'Vocals', 'Other'];

function doGet(e) {
  initializeSheets();
  return HtmlService.createTemplateFromFile('Dashboard')
    .evaluate()
    .setTitle('Rhythm Zone Academy Management System')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) { return HtmlService.createHtmlOutputFromFile(filename).getContent(); }

// Only creates tabs that are missing and writes headers into empty tabs.
// It never clears or overwrites existing rows.
function initializeSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(HEADERS).forEach(function (name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) { sheet = ss.insertSheet(name); writeHeader_(sheet, HEADERS[name]); }
    else if (sheet.getLastRow() === 0) { writeHeader_(sheet, HEADERS[name]); }
  });
  var defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && defaultSheet.getLastRow() === 0 && ss.getSheets().length > 1) { try { ss.deleteSheet(defaultSheet); } catch (err) {} }
}

function writeHeader_(sheet, headerRow) {
  sheet.appendRow(headerRow); sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headerRow.length).setFontWeight('bold').setBackground('#1e1e1e').setFontColor('#ffffff');
  sheet.autoResizeColumns(1, headerRow.length);
}

function getSheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sheet = ss.getSheetByName(name);
  if (!sheet) { initializeSheets(); sheet = ss.getSheetByName(name); } return sheet;
}

// ---------------------------------------------------------------------
// Helpers: dates, months, locking, validation
// ---------------------------------------------------------------------
function tz_() { return Session.getScriptTimeZone() || 'Asia/Kolkata'; }

function pad2_(n) { return ('0' + n).slice(-2); }

/** Returns 'yyyy-MM-dd' or '' when the value is not a recognisable date. */
function isoDate_(d) {
  if (d === null || d === undefined || d === '') return '';
  if (Object.prototype.toString.call(d) === '[object Date]') {
    return isNaN(d.getTime()) ? '' : Utilities.formatDate(d, tz_(), 'yyyy-MM-dd');
  }
  var s = String(d).trim(), m;
  m = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);           // 2026-11-17
  if (m) return validYmd_(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/);         // 17/11/2026 (India: day first)
  if (m) return validYmd_(+m[3], +m[2], +m[1]);
  return '';
}

function validYmd_(y, mo, d) {
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) return '';
  var dt = new Date(y, mo - 1, d);
  if (dt.getMonth() !== mo - 1) return ''; // e.g. 31 February
  return y + '-' + pad2_(mo) + '-' + pad2_(d);
}

function todayIso_() { return Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd'); }

/** Month index (year*12 + month0) from 'November 2026', 'Nov 2026', '2026-11' or a Date. -1 if unknown. */
function monthIndex_(v) {
  if (v === null || v === undefined || v === '') return -1;
  if (Object.prototype.toString.call(v) === '[object Date]') {
    if (isNaN(v.getTime())) return -1;
    var p = Utilities.formatDate(v, tz_(), 'yyyy-MM').split('-');
    return (+p[0]) * 12 + (+p[1] - 1);
  }
  var s = String(v).trim(), m = s.match(/^(\d{4})-(\d{1,2})$/);
  if (m) return (+m[2] >= 1 && +m[2] <= 12) ? (+m[1]) * 12 + (+m[2] - 1) : -1;
  m = s.match(/^([A-Za-z]+)\.?,?\s+(\d{4})$/);
  if (m) {
    var name = m[1].toLowerCase();
    if (name === 'sept') name = 'sep';
    for (var i = 0; i < 12; i++) {
      // full name ("november") or any prefix of 3+ letters ("nov")
      if (name.length >= 3 && MONTH_NAMES[i].toLowerCase().indexOf(name) === 0) return (+m[2]) * 12 + i;
    }
  }
  return -1;
}

function monthLabel_(idx) { return MONTH_NAMES[idx % 12] + ' ' + Math.floor(idx / 12); }

function currentMonthIndex_() { return monthIndex_(new Date()); }

/** Month cell -> 'November 2026' when understood, otherwise the original text. */
function monthText_(raw, display) {
  var idx = monthIndex_(raw);
  if (idx < 0) idx = monthIndex_(display);
  return idx >= 0 ? monthLabel_(idx) : String(display !== undefined ? display : raw).trim();
}

function feeStartMonthIndex_() {
  var v = '';
  try { var row = findBy_('settings', 'key', 'feeStartMonth'); if (row) v = row.value; } catch (e) {} // Settings tab (Api.gs)
  if (!v) v = PropertiesService.getScriptProperties().getProperty('FEE_START_MONTH');
  var idx = monthIndex_(v || DEFAULT_FEE_START_MONTH);
  return idx >= 0 ? idx : monthIndex_(DEFAULT_FEE_START_MONTH);
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new Error('The sheet is busy. Please try again in a few seconds.');
  try { return fn(); } finally { lock.releaseLock(); }
}

function money_(v) { var n = Number(v); return isFinite(n) ? Math.round(n * 100) / 100 : 0; }

function cleanText_(v, max) { return String(v === null || v === undefined ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max || 200); }

/** Indian mobile number -> 10 digits, or '' if invalid. Accepts +91 / 0 prefixes. */
function cleanPhone_(v) {
  var d = String(v === null || v === undefined ? '' : v).replace(/\D/g, '');
  if (d.length === 12 && d.indexOf('91') === 0) d = d.slice(2);
  if (d.length === 11 && d.charAt(0) === '0') d = d.slice(1);
  return d.length === 10 ? d : '';
}

function fail_(msg) { return { success: false, message: msg }; }

/**
 * Sheet -> array of objects keyed by HEADERS. Money columns use the raw number,
 * date cells are returned as 'yyyy-MM-dd' (from the real date, not the
 * locale-dependent display text) and the Fees "Month" is normalised.
 */
function sheetToObjects_(sheetName, sheet) {
  var range = sheet.getDataRange();
  var displayData = range.getDisplayValues();
  var rawData = range.getValues();
  if (displayData.length < 2) return [];

  var headers = HEADERS[sheetName], out = [];
  for (var r = 1; r < displayData.length; r++) {
    var row = displayData[r], raw = rawData[r];
    if (row.join('').trim() === '') continue;
    var obj = { _row: r + 1 };
    for (var c = 0; c < headers.length; c++) {
      var h = headers[c], rv = raw[c], dv = row[c] !== undefined ? row[c] : '';
      if (NUMERIC_HEADERS[h]) obj[h] = (rv === '' || rv === undefined) ? '' : (isFinite(Number(rv)) ? Number(rv) : rv);
      else if (h === 'Month') obj[h] = monthText_(rv, dv);
      else if (Object.prototype.toString.call(rv) === '[object Date]') obj[h] = isoDate_(rv);
      else obj[h] = dv;
    }
    out.push(obj);
  }
  return out;
}

function readStudents_() { return sheetToObjects_(SHEET_NAMES.STUDENTS, getSheet_(SHEET_NAMES.STUDENTS)); }
function readFees_() { return sheetToObjects_(SHEET_NAMES.FEES, getSheet_(SHEET_NAMES.FEES)); }
function isActive_(s) { return String(s['Status']).toLowerCase() === 'active'; }

// ---------------------------------------------------------------------
// AUTH
// ---------------------------------------------------------------------
function getPassword_() {
  var p = PropertiesService.getScriptProperties().getProperty('APP_PASSWORD');
  return p ? String(p) : '';
}

function loginUser(password) {
  try {
    var cache = CacheService.getScriptCache();
    if (cache.get('rzams_login_lock')) return fail_('Too many wrong attempts. Try again in 10 minutes.');
    REQ_ = { tables: {}, user: null, action: 'loginUser' };
    var hasUsers = readTable_('users').rows.length > 0;
    if (!hasUsers && !getPassword_()) return fail_('Password is not set up yet. In Apps Script open Project Settings > Script properties and add APP_PASSWORD.');
    if (verifyLegacyPassword_((password || '').toString().trim())) {
      cache.remove('rzams_login_fail');
      var token = Utilities.getUuid();
      cache.put('rzams_session_' + token, 'valid', SESSION_DURATION);
      return { success: true, token: token, message: 'Login successful' };
    }
    var fails = Number(cache.get('rzams_login_fail') || 0) + 1;
    if (fails >= MAX_LOGIN_FAILURES) { cache.put('rzams_login_lock', '1', LOGIN_LOCK_SECONDS); cache.remove('rzams_login_fail'); }
    else cache.put('rzams_login_fail', String(fails), LOGIN_LOCK_SECONDS);
    return fail_('Invalid password');
  } catch (err) { return fail_('Server error'); }
}
function validateSession(token) { return token ? CacheService.getScriptCache().get('rzams_session_' + token) === 'valid' : false; }
function logoutUser(token) { if (token) CacheService.getScriptCache().remove('rzams_session_' + token); return { success: true }; }
function requireAuth_(token) {
  if (!validateSession(token)) throw new Error('SESSION_EXPIRED');
  REQ_ = { tables: {}, user: { username: 'legacy-screen', name: 'Legacy screen', role: 'Staff' }, action: 'legacy' }; // fresh table cache (Api.gs)
}

// ---------------------------------------------------------------------
// DASHBOARD
// ---------------------------------------------------------------------
function getDashboardStats(token) {
  requireAuth_(token);
  var students = readStudents_();
  var fees = readFees_();
  var studio = sheetToObjects_(SHEET_NAMES.STUDIO, getSheet_(SHEET_NAMES.STUDIO));
  var tasks = sheetToObjects_(SHEET_NAMES.TASKS, getSheet_(SHEET_NAMES.TASKS));
  var attendance = sheetToObjects_(SHEET_NAMES.ATTENDANCE, getSheet_(SHEET_NAMES.ATTENDANCE));

  var pending = computePending_(students, fees);
  var feesDue = 0, dueStudents = {};
  pending.forEach(function (p) { feesDue += p.due; dueStudents[p.studentId] = 1; });

  var curLabel = monthLabel_(currentMonthIndex_()), collectedThisMonth = 0;
  fees.forEach(function (f) { if (f['Month'] === curLabel) collectedThisMonth += Number(f['Paid']) || 0; });

  var today = todayIso_();
  var attendanceToday = attendance.filter(function (a) { return isoDate_(a['Date']) === today && String(a['Present/Absent']).toLowerCase() === 'present'; }).length;
  var pendingTasks = tasks.filter(function (t) { return String(t['Status']).toLowerCase() !== 'completed'; }).length;

  return {
    totalStudents: students.length,
    activeStudents: students.filter(isActive_).length,
    feesDue: money_(feesDue),
    studentsWithDue: Object.keys(dueStudents).length,
    collectedThisMonth: money_(collectedThisMonth),
    currentMonth: curLabel,
    attendanceToday: attendanceToday,
    studioClients: studio.length,
    pendingTasks: pendingTasks
  };
}

// ---------------------------------------------------------------------
// STUDENTS
// ---------------------------------------------------------------------
function getStudents(token) { requireAuth_(token); return readStudents_().reverse(); }

function generateNextStudentId_(sheet) {
  var maxNum = 0;
  function scan(values, col) {
    for (var i = 1; i < values.length; i++) {
      var m = String(values[i][col] || '').match(/^STU(\d+)$/i);
      if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
    }
  }
  scan(sheet.getDataRange().getValues(), 0);
  // IDs of removed students still appear in Fees/Attendance: never hand them out again.
  scan(getSheet_(SHEET_NAMES.FEES).getDataRange().getValues(), 0);
  scan(getSheet_(SHEET_NAMES.ATTENDANCE).getDataRange().getValues(), 1);
  return 'STU' + ('000' + (maxNum + 1)).slice(-3);
}

function validateStudent_(data) {
  data = data || {};
  var c = {
    name: cleanText_(data.name, 100),
    phone: cleanPhone_(data.phone),
    parentName: cleanText_(data.parentName, 100),
    instrument: cleanText_(data.instrument, 50),
    batch: cleanText_(data.batch, 50),
    fee: Number(data.fee),
    joinDate: data.joinDate ? isoDate_(data.joinDate) : '',
    status: cleanText_(data.status, 20) || 'Active'
  };
  if (!c.name) return { error: 'Student name is required.' };
  if (!c.phone) return { error: 'Enter a valid 10-digit phone number.' };
  if (!c.instrument) return { error: 'Select an instrument.' };
  if (String(data.fee).trim() === '' || !isFinite(c.fee) || c.fee < 0 || c.fee > 100000) return { error: 'Enter a valid monthly fee.' };
  if (data.joinDate && !c.joinDate) return { error: 'Join date is not valid.' };
  if (c.status !== 'Active' && c.status !== 'Inactive') return { error: 'Status must be Active or Inactive.' };
  c.fee = money_(c.fee);
  return { clean: c };
}

function addStudent(token, data) {
  requireAuth_(token);
  var v = validateStudent_(data); if (v.error) return fail_(v.error);
  var c = v.clean;
  return withLock_(function () {
    var sheet = getSheet_(SHEET_NAMES.STUDENTS);
    var dup = readStudents_().filter(function (s) {
      return String(s['Student Name']).trim().toLowerCase() === c.name.toLowerCase() && cleanPhone_(s['Phone']) === c.phone;
    })[0];
    if (dup) return fail_('This student already exists (' + dup['Student ID'] + ').');
    var studentId = generateNextStudentId_(sheet);
    sheet.appendRow([studentId, c.name, c.phone, c.parentName, c.instrument, c.batch, c.fee, c.joinDate || todayIso_(), c.status]);
    return { success: true, message: 'Student added (' + studentId + ')', studentId: studentId };
  });
}

function updateStudent(token, studentId, data) {
  requireAuth_(token);
  var v = validateStudent_(data); if (v.error) return fail_(v.error);
  var c = v.clean;
  return withLock_(function () {
    var sheet = getSheet_(SHEET_NAMES.STUDENTS), values = sheet.getDataRange().getValues();
    for (var i = 1; i < values.length; i++) {
      if (String(values[i][0]) === String(studentId)) {
        sheet.getRange(i + 1, 2, 1, 8).setValues([[c.name, c.phone, c.parentName, c.instrument, c.batch, c.fee, c.joinDate || values[i][7], c.status]]);
        return { success: true, message: 'Student updated' };
      }
    }
    return fail_('Student not found');
  });
}

/** Archives the student (Status = Inactive). History in Fees/Attendance stays linked. */
function deleteStudent(token, studentId) {
  requireAuth_(token);
  return withLock_(function () {
    var sheet = getSheet_(SHEET_NAMES.STUDENTS), values = sheet.getDataRange().getValues();
    for (var i = 1; i < values.length; i++) {
      if (String(values[i][0]) === String(studentId)) {
        sheet.getRange(i + 1, 9).setValue('Inactive');
        return { success: true, message: 'Student archived. Payment and attendance history is kept.' };
      }
    }
    return fail_('Student not found');
  });
}

function getStudentsBasicList(token) {
  requireAuth_(token);
  return readStudents_().map(function (s) {
    return { id: s['Student ID'], name: s['Student Name'], fee: s['Monthly Fee'], status: s['Status'] };
  });
}

// ---------------------------------------------------------------------
// CALENDAR SYNC HELPER
// ---------------------------------------------------------------------
function syncAttendanceToCalendar_(dateStr, records) {
  var calName = 'TML Attendance';
  var calendars = CalendarApp.getCalendarsByName(calName);
  var cal = (calendars.length > 0) ? calendars[0] : CalendarApp.createCalendar(calName);
  var presentCount = 0, absentNames = [];
  records.forEach(function (r) {
    var status = String(r.status).toLowerCase();
    if (status === 'present') presentCount++;
    else if (status === 'absent') absentNames.push(r.name);
  });
  var title = 'TML Attendance: ' + presentCount + ' Present, ' + absentNames.length + ' Absent';
  var desc = 'Date: ' + dateStr + '\n\n';
  if (absentNames.length > 0) desc += 'Absent Students:\n- ' + absentNames.join('\n- ');
  else desc += 'No absentees marked today!';
  var parts = dateStr.split('-');
  var eventDate = new Date(parts[0], parts[1] - 1, parts[2]);
  var existingEvents = cal.getEventsForDay(eventDate);
  for (var i = 0; i < existingEvents.length; i++) { existingEvents[i].deleteEvent(); }
  cal.createAllDayEvent(title, eventDate, { description: desc });
}

// ---------------------------------------------------------------------
// ATTENDANCE
// ---------------------------------------------------------------------
function getAttendanceByDate(token, dateStr) {
  requireAuth_(token);
  var targetIso = isoDate_(dateStr);
  if (!targetIso) throw new Error('Invalid date');
  var students = readStudents_().filter(isActive_);
  var attendance = sheetToObjects_(SHEET_NAMES.ATTENDANCE, getSheet_(SHEET_NAMES.ATTENDANCE));
  var attendanceMap = {};
  attendance.forEach(function (a) { if (isoDate_(a['Date']) === targetIso) attendanceMap[String(a['Student ID'])] = a['Present/Absent']; });
  return students.map(function (s) {
    return { id: s['Student ID'], name: s['Student Name'], batch: s['Batch'], instrument: s['Instrument'], status: attendanceMap[String(s['Student ID'])] || '' };
  });
}

function saveAttendance(token, dateStr, records) {
  requireAuth_(token);
  var targetIso = isoDate_(dateStr);
  if (!targetIso) return fail_('Invalid date');
  if (targetIso > todayIso_()) return fail_('Attendance cannot be saved for a future date.');

  var names = {};
  readStudents_().forEach(function (s) { names[String(s['Student ID'])] = s['Student Name']; });
  var clean = [], seen = {};
  (records || []).forEach(function (r) {
    var id = String(r && r.id || ''), st = String(r && r.status || '');
    if (!names.hasOwnProperty(id) || seen[id]) return;
    if (st !== 'Present' && st !== 'Absent') return;
    seen[id] = 1; clean.push({ id: id, name: names[id], status: st });
  });
  if (!clean.length) return fail_('Mark at least one student.');

  withLock_(function () {
    var sheet = getSheet_(SHEET_NAMES.ATTENDANCE), values = sheet.getDataRange().getValues(), existingRows = {};
    for (var i = 1; i < values.length; i++) { if (isoDate_(values[i][0]) === targetIso) existingRows[String(values[i][1])] = i + 1; }
    var toAppend = [];
    clean.forEach(function (rec) {
      if (existingRows[rec.id]) sheet.getRange(existingRows[rec.id], 4).setValue(rec.status);
      else toAppend.push([targetIso, rec.id, rec.name, rec.status]);
    });
    if (toAppend.length) sheet.getRange(sheet.getLastRow() + 1, 1, toAppend.length, 4).setValues(toAppend);
  });
  try { syncAttendanceToCalendar_(targetIso, clean); } catch (e) { console.error('Calendar Sync Failed: ' + e.message); }
  var present = clean.filter(function (r) { return r.status === 'Present'; }).length;
  return { success: true, message: 'Attendance saved: ' + present + ' present, ' + (clean.length - present) + ' absent', saved: clean.length };
}

// ---------------------------------------------------------------------
// FEES
// ---------------------------------------------------------------------
function getFeesRecords(token) {
  requireAuth_(token);
  return readFees_().reverse();
}

function findFee_(fees, studentId, monthLbl) {
  for (var i = 0; i < fees.length; i++) {
    if (String(fees[i]['Student ID']).trim() === String(studentId).trim() && fees[i]['Month'] === monthLbl) return fees[i];
  }
  return null;
}

/**
 * Pending list: for every active student, each month from max(FEE_START_MONTH,
 * join month) to the current month whose fee is not fully paid; plus any older
 * or archived record that still shows a balance.
 */
function computePending_(students, fees) {
  var start = feeStartMonthIndex_(), cur = currentMonthIndex_(), out = [], covered = {};
  students.forEach(function (s) {
    if (!isActive_(s)) return;
    var fee = money_(s['Monthly Fee']); if (fee <= 0) return;
    var from = Math.max(start, monthIndex_(String(s['Join Date']).slice(0, 7)));
    if (from < 0) from = start;
    for (var m = from; m <= cur; m++) {
      var lbl = monthLabel_(m), rec = findFee_(fees, s['Student ID'], lbl);
      var amount = rec ? money_(rec['Amount']) : fee, paid = rec ? money_(rec['Paid']) : 0;
      covered[s['Student ID'] + '|' + lbl] = 1;
      if (amount - paid > 0) out.push({ studentId: s['Student ID'], name: s['Student Name'], phone: s['Phone'], month: lbl, monthIndex: m, amount: amount, paid: paid, due: money_(amount - paid), recorded: !!rec });
    }
  });
  fees.forEach(function (f) {
    var key = f['Student ID'] + '|' + f['Month'], due = money_(f['Amount']) - money_(f['Paid']);
    if (covered[key] || due <= 0) return;
    out.push({ studentId: f['Student ID'], name: f['Student Name'], phone: '', month: f['Month'], monthIndex: monthIndex_(f['Month']), amount: money_(f['Amount']), paid: money_(f['Paid']), due: money_(due), recorded: true });
  });
  out.sort(function (a, b) { return (a.monthIndex - b.monthIndex) || String(a.name).localeCompare(String(b.name)); });
  return out;
}

function getPendingFees(token) {
  requireAuth_(token);
  return computePending_(readStudents_(), readFees_());
}

/** Months a student can pay for: unpaid months (oldest first) + the next 3 months in advance. */
function getStudentFeeStatus(token, studentId) {
  requireAuth_(token);
  var students = readStudents_(), fees = readFees_();
  var s = students.filter(function (x) { return String(x['Student ID']) === String(studentId); })[0];
  if (!s) return fail_('Student not found');
  var fee = money_(s['Monthly Fee']), cur = currentMonthIndex_();
  // computePending_ also returns older/archived balances for this student's records
  var months = computePending_([s], fees.filter(function (f) { return String(f['Student ID']) === String(s['Student ID']); }));
  var have = {}; months.forEach(function (p) { have[p.month] = 1; });
  for (var m = cur; m <= cur + 3; m++) {
    var lbl = monthLabel_(m); if (have[lbl]) continue;
    var rec = findFee_(fees, s['Student ID'], lbl);
    var amount = rec ? money_(rec['Amount']) : fee, paid = rec ? money_(rec['Paid']) : 0;
    if (amount - paid > 0) months.push({ studentId: s['Student ID'], name: s['Student Name'], month: lbl, monthIndex: m, amount: amount, paid: paid, due: money_(amount - paid), recorded: !!rec, advance: m > cur });
  }
  months.sort(function (a, b) { return a.monthIndex - b.monthIndex; });
  var history = fees.filter(function (f) { return String(f['Student ID']) === String(s['Student ID']); })
    .sort(function (a, b) { return monthIndex_(b['Month']) - monthIndex_(a['Month']); });
  return { success: true, student: { id: s['Student ID'], name: s['Student Name'], fee: fee, status: s['Status'] }, months: months, history: history };
}

/**
 * Records a payment.
 * New form:  { studentId, months: ['November 2026', 'December 2026'], paid, paymentDate? }
 *            The amount fills the oldest selected month first.
 * Old form:  { studentId, studentName, month, amount, paid } (still accepted).
 * An existing month keeps its original Amount; only Paid/Due/Payment Date change.
 */
function collectFee(token, data) {
  requireAuth_(token);
  data = data || {};
  var months = (data.months && data.months.length) ? data.months : [data.month];
  try {
    var r = withLock_(function () {
      return recordPayment_({ legacy: true, studentId: data.studentId, months: months, amount: data.paid, date: data.paymentDate,
        method: data.method || 'Not recorded', customAmount: data.months ? null : data.amount, requestId: data.requestId });
    });
    var p = r.payment, lines = (p.allocation || []).map(function (a) { return a.month + ': ₹' + a.amount + (a.dueAfter > 0 ? ' (₹' + a.dueAfter + ' still due)' : ' (paid)'); });
    var stillDue = 0; (p.allocation || []).forEach(function (a) { stillDue += Math.max(a.dueAfter, 0); });
    return { success: true, message: 'Payment of ₹' + p.amount + ' saved (' + p.invoiceNo + '). ' + lines.join('; '), due: money_(stillDue), lines: lines, invoiceNo: p.invoiceNo };
  } catch (err) {
    if (err && err.code) return fail_(err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------
// STUDIO, TASKS & REPORTS
// ---------------------------------------------------------------------
/** Checks a row number sent by the browser still points at the expected record. */
function checkRow_(sheet, rowNum, keyCol, expectedKey) {
  var r = Number(rowNum);
  if (!(r >= 2 && r <= sheet.getLastRow() && Math.floor(r) === r)) return 'Record not found. Please refresh.';
  if (expectedKey !== undefined && expectedKey !== null && String(sheet.getRange(r, keyCol).getDisplayValue()).trim() !== String(expectedKey).trim()) {
    return 'This record changed in the sheet. Please refresh and try again.';
  }
  return '';
}

function validateStudio_(data) {
  data = data || {};
  var c = { clientName: cleanText_(data.clientName, 100), phone: cleanPhone_(data.phone), projectName: cleanText_(data.projectName, 120), total: Number(data.total), advance: Number(data.advance), status: data.status === 'Completed' ? 'Completed' : 'Ongoing' };
  if (!c.clientName) return { error: 'Client name is required.' };
  if (!c.phone) return { error: 'Enter a valid 10-digit phone number.' };
  if (!c.projectName) return { error: 'Project name is required.' };
  if (!isFinite(c.total) || c.total < 0) return { error: 'Enter a valid total.' };
  if (!isFinite(c.advance) || c.advance < 0) return { error: 'Enter a valid advance.' };
  if (c.advance > c.total) return { error: 'Advance cannot be more than the total.' };
  c.total = money_(c.total); c.advance = money_(c.advance);
  return { clean: c };
}

function getStudioClients(token) { requireAuth_(token); return sheetToObjects_(SHEET_NAMES.STUDIO, getSheet_(SHEET_NAMES.STUDIO)).reverse(); }
function addStudioClient(token, data) {
  requireAuth_(token);
  var v = validateStudio_(data); if (v.error) return fail_(v.error);
  var c = v.clean;
  return withLock_(function () {
    getSheet_(SHEET_NAMES.STUDIO).appendRow([c.clientName, c.phone, c.projectName, c.total, c.advance, money_(c.total - c.advance), c.status]);
    return { success: true, message: 'Client added' };
  });
}
function updateStudioClient(token, rowNum, data, expectedName) {
  requireAuth_(token);
  var v = validateStudio_(data); if (v.error) return fail_(v.error);
  var c = v.clean;
  return withLock_(function () {
    var sheet = getSheet_(SHEET_NAMES.STUDIO), err = checkRow_(sheet, rowNum, 1, expectedName);
    if (err) return fail_(err);
    sheet.getRange(Number(rowNum), 1, 1, 7).setValues([[c.clientName, c.phone, c.projectName, c.total, c.advance, money_(c.total - c.advance), c.status]]);
    return { success: true, message: 'Client updated' };
  });
}
function deleteStudioClient(token, rowNum, expectedName) {
  requireAuth_(token);
  return withLock_(function () {
    var sheet = getSheet_(SHEET_NAMES.STUDIO), err = checkRow_(sheet, rowNum, 1, expectedName);
    if (err) return fail_(err);
    sheet.deleteRow(Number(rowNum));
    return { success: true, message: 'Client deleted' };
  });
}

function getTasks(token) { requireAuth_(token); return sheetToObjects_(SHEET_NAMES.TASKS, getSheet_(SHEET_NAMES.TASKS)).reverse(); }
function addTask(token, data) {
  requireAuth_(token);
  data = data || {};
  var task = cleanText_(data.task, 300);
  if (!task) return fail_('Task description is required.');
  var priority = ['High', 'Medium', 'Low'].indexOf(data.priority) >= 0 ? data.priority : 'Medium';
  var date = data.date ? isoDate_(data.date) : todayIso_();
  if (!date) return fail_('Date is not valid.');
  return withLock_(function () {
    getSheet_(SHEET_NAMES.TASKS).appendRow([date, task, priority, 'Pending', cleanText_(data.notes, 300)]);
    return { success: true, message: 'Task added' };
  });
}
function deleteTask(token, rowNum, expectedTask) {
  requireAuth_(token);
  return withLock_(function () {
    var sheet = getSheet_(SHEET_NAMES.TASKS), err = checkRow_(sheet, rowNum, 2, expectedTask);
    if (err) return fail_(err);
    sheet.deleteRow(Number(rowNum));
    return { success: true, message: 'Task deleted' };
  });
}

function getStudentReport(token) { requireAuth_(token); return readStudents_(); }
function getFeesReportFull(token) { requireAuth_(token); return readFees_(); }

// Run once from the editor to grant Calendar permission. Returns nothing.
function getPermission() { CalendarApp.getAllCalendars(); }
