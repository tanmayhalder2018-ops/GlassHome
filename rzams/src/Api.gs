/**
 * =====================================================================
 * RZAMS Pro - JSON API (v3)  |  Api.gs
 *
 * Used by the RZAMS Pro admin app (admin.tmusiclab.in). The app sends
 *   POST <web app URL>   body: {"action": "...", "token": "...", "data": {...}}
 * with Content-Type text/plain (no CORS preflight) and receives JSON.
 *
 * The legacy screen (doGet -> Dashboard.html) and its google.script.run
 * functions in Code.gs keep working alongside this API.
 *
 * Sheets: existing tabs keep their columns; new columns are only ever
 * appended at the end. New tabs are created on first use.
 * =====================================================================
 */

var API_VERSION = '3.0.0';
var PASSWORD_ITERATIONS = 300;
var ROLE_ADMIN = 'Admin', ROLE_STAFF = 'Staff';

// [jsonKey, Sheet header, type]   type: text | num | date | month | json | (default: plain)
var PRO_SCHEMA = {
  students: { sheet: 'Students', key: 'id', cols: [
    ['id', 'Student ID', 'text'], ['name', 'Student Name'], ['phone', 'Phone', 'text'], ['parentName', 'Parent Name'],
    ['instrument', 'Instrument'], ['batch', 'Batch'], ['fee', 'Monthly Fee', 'num'], ['joinDate', 'Join Date', 'date'], ['status', 'Status'],
    ['whatsapp', 'WhatsApp', 'text'], ['email', 'Email'], ['address', 'Address'], ['photo', 'Photo', 'text'],
    ['courseId', 'Course ID', 'text'], ['batchId', 'Batch ID', 'text'], ['notes', 'Notes'], ['updatedAt', 'Updated At', 'text']] },
  fees: { sheet: 'Fees', cols: [
    ['studentId', 'Student ID', 'text'], ['studentName', 'Student Name'], ['month', 'Month', 'month'], ['amount', 'Amount', 'num'],
    ['paid', 'Paid', 'num'], ['due', 'Due', 'num'], ['paymentDate', 'Payment Date', 'date']] },
  payments: { sheet: 'Payments', key: 'id', cols: [
    ['id', 'Payment ID', 'text'], ['date', 'Date', 'date'], ['studentId', 'Student ID', 'text'], ['studentName', 'Student Name'], ['course', 'Course'],
    ['amount', 'Amount', 'num'], ['method', 'Method'], ['reference', 'Reference', 'text'], ['months', 'Billing Period', 'text'],
    ['allocation', 'Allocation', 'json'], ['previousBalance', 'Previous Balance', 'num'], ['currentFee', 'Current Fee', 'num'],
    ['remaining', 'Remaining Balance', 'num'], ['nextDueDate', 'Next Due Date', 'date'], ['invoiceNo', 'Invoice No', 'text'],
    ['status', 'Status'], ['notes', 'Notes'], ['requestId', 'Request ID', 'text'], ['recordedBy', 'Recorded By'],
    ['createdAt', 'Created At', 'text'], ['voidReason', 'Void Reason']] },
  attendance: { sheet: 'Attendance', cols: [
    ['date', 'Date', 'date'], ['studentId', 'Student ID', 'text'], ['studentName', 'Student Name'], ['status', 'Present/Absent'],
    ['batchId', 'Batch ID', 'text'], ['markedAt', 'Marked At', 'text'], ['markedBy', 'Marked By']] },
  courses: { sheet: 'Courses', key: 'id', cols: [
    ['id', 'Course ID', 'text'], ['name', 'Name'], ['fee', 'Monthly Fee', 'num'], ['description', 'Description'], ['status', 'Status'], ['createdAt', 'Created At', 'text']] },
  batches: { sheet: 'Batches', key: 'id', cols: [
    ['id', 'Batch ID', 'text'], ['name', 'Name'], ['courseId', 'Course ID', 'text'], ['teacherId', 'Teacher ID', 'text'], ['days', 'Days', 'text'],
    ['startTime', 'Start Time', 'text'], ['endTime', 'End Time', 'text'], ['location', 'Location'], ['capacity', 'Capacity', 'num'],
    ['status', 'Status'], ['createdAt', 'Created At', 'text']] },
  teachers: { sheet: 'Teachers', key: 'id', cols: [
    ['id', 'Teacher ID', 'text'], ['name', 'Name'], ['phone', 'Phone', 'text'], ['whatsapp', 'WhatsApp', 'text'], ['email', 'Email'],
    ['courseIds', 'Courses', 'text'], ['status', 'Status'], ['joinDate', 'Joined', 'date'], ['notes', 'Notes']] },
  classes: { sheet: 'Classes', key: 'id', cols: [
    ['id', 'Class ID', 'text'], ['date', 'Date', 'date'], ['startTime', 'Start Time', 'text'], ['endTime', 'End Time', 'text'],
    ['batchId', 'Batch ID', 'text'], ['teacherId', 'Teacher ID', 'text'], ['courseId', 'Course ID', 'text'], ['location', 'Location'],
    ['status', 'Status'], ['title', 'Title'], ['notes', 'Notes'], ['createdAt', 'Created At', 'text']] },
  expenses: { sheet: 'Expenses', key: 'id', cols: [
    ['id', 'Expense ID', 'text'], ['date', 'Date', 'date'], ['category', 'Category'], ['description', 'Description'],
    ['amount', 'Amount', 'num'], ['method', 'Method'], ['createdBy', 'Created By'], ['createdAt', 'Created At', 'text']] },
  reminders: { sheet: 'Reminders', key: 'id', cols: [
    ['id', 'Reminder ID', 'text'], ['date', 'Date', 'text'], ['studentId', 'Student ID', 'text'], ['studentName', 'Student Name'],
    ['phone', 'Phone', 'text'], ['amount', 'Amount', 'num'], ['months', 'Months', 'text'], ['message', 'Message', 'text'],
    ['channel', 'Channel'], ['status', 'Status'], ['createdBy', 'Created By']] },
  studio: { sheet: 'Studio Clients', cols: [
    ['clientName', 'Client Name'], ['phone', 'Phone', 'text'], ['projectName', 'Project Name'], ['total', 'Total Amount', 'num'],
    ['advance', 'Advance', 'num'], ['due', 'Due', 'num'], ['status', 'Status']] },
  tasks: { sheet: 'Tasks', cols: [
    ['date', 'Date', 'date'], ['task', 'Task'], ['priority', 'Priority'], ['status', 'Status'], ['notes', 'Notes']] },
  settings: { sheet: 'Settings', key: 'key', cols: [['key', 'Key', 'text'], ['value', 'Value', 'text']] },
  users: { sheet: 'Users', key: 'username', cols: [
    ['username', 'Username', 'text'], ['name', 'Name'], ['role', 'Role'], ['hash', 'Password Hash', 'text'], ['salt', 'Salt', 'text'],
    ['status', 'Status'], ['createdAt', 'Created At', 'text'], ['lastLogin', 'Last Login', 'text']] },
  audit: { sheet: 'AuditLog', cols: [
    ['time', 'Time', 'text'], ['user', 'User'], ['action', 'Action'], ['entity', 'Entity'], ['entityId', 'Entity ID', 'text'], ['details', 'Details', 'text']] },
  errors: { sheet: 'ErrorLog', cols: [
    ['time', 'Time', 'text'], ['user', 'User'], ['action', 'Action'], ['message', 'Message', 'text'], ['stack', 'Stack', 'text']] }
};

var DEFAULT_SETTINGS = {
  academyName: 'Rhythm Zone Academy',
  studioName: 'T Music Lab',
  tagline: 'Music classes · Recording studio',
  address: '',
  phone: '',
  whatsapp: '',
  email: '',
  website: 'https://tmusiclab.in',
  invoicePrefix: 'RZA',
  invoiceSeq: '0',
  invoiceFooter: 'Thank you for learning music with Rhythm Zone Academy!',
  signatory: 'Authorised Signatory',
  paymentMethods: 'Cash,UPI,Bank Transfer',
  expenseCategories: 'Rent,Electricity,Internet,Instruments & Repairs,Teacher Payment,Marketing,Studio Equipment,Miscellaneous',
  feeStartMonth: DEFAULT_FEE_START_MONTH,
  feeDueDay: '10',
  reminderDaysBefore: '5',
  calendarSync: 'true',
  logo: '',
  reminderTemplate: 'Hello {name},\nThis is a gentle reminder from {academy} regarding your monthly tuition fee of ₹{amount} ({months}).\nPlease contact us if you have already completed the payment.\nThank you!',
  invoiceTemplate: 'Hello {name},\nYour payment has been successfully recorded at {academy}.\nStudent ID: {id}\nCourse: {course}\nAmount Paid: ₹{amount}\nRemaining Due: ₹{due}\nInvoice No: {invoice}\nThank you for being part of {academy}!'
};
var PUBLIC_SETTING_KEYS = Object.keys(DEFAULT_SETTINGS).filter(function (k) { return k !== 'invoiceSeq'; });

var INITIAL_COURSES = [
  ['Guitar', ['guitar']], ['Ukulele', ['ukulele']], ['Piano', ['piano', 'piano/keyboard', 'keyboard']],
  ['Vocal', ['vocal', 'vocals', 'singing']], ['Indian Classical Music', ['indian classical', 'indian classical music', 'classical']]
];

// ---------------------------------------------------------------------
// Request plumbing
// ---------------------------------------------------------------------
var REQ_ = { tables: {}, user: null, action: '' };

function doPost(e) {
  REQ_ = { tables: {}, user: null, action: '' };
  var body = {};
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    REQ_.action = String(body.action || '');
    var result = routeApi_(REQ_.action, body.token, body.data || {});
    return jsonOut_({ ok: true, data: result, version: API_VERSION });
  } catch (err) {
    var code = err && err.code ? err.code : 'ERROR';
    if (code === 'ERROR') logError_(REQ_.action, err);
    return jsonOut_({ ok: false, error: (err && err.message) || String(err), code: code, version: API_VERSION });
  }
}

function jsonOut_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

function apiError_(message, code) { var e = new Error(message); e.code = code || 'INVALID'; return e; }

/** action -> [handler, minimum role, writes?] */
var API_ROUTES = {
  'auth.login': [apiLogin_, null],
  'auth.logout': [apiLogout_, null],
  'auth.me': [function () { return publicUser_(REQ_.user); }, ROLE_STAFF],
  'auth.changePassword': [apiChangePassword_, ROLE_STAFF, true],
  'app.bootstrap': [apiBootstrap_, ROLE_STAFF],
  'students.save': [apiSaveStudent_, ROLE_STAFF, true],
  'students.archive': [apiArchiveStudent_, ROLE_STAFF, true],
  'students.delete': [apiDeleteStudent_, ROLE_ADMIN, true],
  'courses.save': [function (d) { return saveSimple_('courses', d, 'CRS', validateCourse_); }, ROLE_ADMIN, true],
  'courses.delete': [function (d) { return deleteSimple_('courses', d.id, function (id) { return inUse_('courseId', id); }); }, ROLE_ADMIN, true],
  'batches.save': [function (d) { return saveSimple_('batches', d, 'BAT', validateBatch_); }, ROLE_ADMIN, true],
  'batches.delete': [function (d) { return deleteSimple_('batches', d.id, function (id) { return inUse_('batchId', id); }); }, ROLE_ADMIN, true],
  'batches.assign': [apiAssignBatch_, ROLE_ADMIN, true],
  'teachers.save': [function (d) { return saveSimple_('teachers', d, 'TCH', validateTeacher_); }, ROLE_ADMIN, true],
  'teachers.delete': [function (d) { return deleteSimple_('teachers', d.id, function (id) { return inUse_('teacherId', id); }); }, ROLE_ADMIN, true],
  'classes.save': [function (d) { return saveSimple_('classes', d, 'CLS', validateClass_); }, ROLE_STAFF, true],
  'classes.delete': [function (d) { return deleteSimple_('classes', d.id); }, ROLE_STAFF, true],
  'attendance.save': [apiSaveAttendance_, ROLE_STAFF, true],
  'payments.record': [apiRecordPayment_, ROLE_STAFF, true],
  'payments.void': [apiVoidPayment_, ROLE_ADMIN, true],
  'payments.studentStatus': [function (d) { return studentFeeStatus_(d.studentId); }, ROLE_STAFF],
  'reminders.log': [apiLogReminder_, ROLE_STAFF, true],
  'expenses.save': [function (d) { return saveSimple_('expenses', d, 'EXP', validateExpense_); }, ROLE_ADMIN, true],
  'expenses.delete': [function (d) { return deleteSimple_('expenses', d.id); }, ROLE_ADMIN, true],
  'studio.save': [apiSaveStudio_, ROLE_STAFF, true],
  'studio.delete': [apiDeleteStudio_, ROLE_ADMIN, true],
  'tasks.save': [apiSaveTask_, ROLE_STAFF, true],
  'tasks.delete': [apiDeleteTask_, ROLE_STAFF, true],
  'settings.save': [apiSaveSettings_, ROLE_ADMIN, true],
  'users.save': [apiSaveUser_, ROLE_ADMIN, true],
  'system.backup': [function () { return backupNow_('manual'); }, ROLE_ADMIN, true],
  'system.setupPreview': [setupPreview_, ROLE_ADMIN],
  'system.setup': [apiRunSetup_, ROLE_ADMIN, true],
  'system.health': [function () { return { version: API_VERSION, time: new Date().toISOString() }; }, null]
};

function routeApi_(action, token, data) {
  var route = API_ROUTES[action];
  if (!route) throw apiError_('Unknown action: ' + action, 'NOT_FOUND');
  if (route[1]) {
    REQ_.user = sessionUser_(token);
    if (!REQ_.user) throw apiError_('Session expired. Please log in again.', 'AUTH');
    if (route[1] === ROLE_ADMIN && REQ_.user.role !== ROLE_ADMIN) throw apiError_('Only an admin can do this.', 'FORBIDDEN');
  }
  if (route[2]) return withLock_(function () { REQ_.tables = {}; return route[0](data || {}); });
  return route[0](data || {});
}

// ---------------------------------------------------------------------
// Table access (header-name based; appends missing columns at the end)
// ---------------------------------------------------------------------
function ensureTable_(name) {
  var def = PRO_SCHEMA[name], ss = SpreadsheetApp.getActiveSpreadsheet(), sheet = ss.getSheetByName(def.sheet);
  var headers = def.cols.map(function (c) { return c[1]; });
  if (!sheet) sheet = ss.insertSheet(def.sheet);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1e1e1e').setFontColor('#ffffff');
    return sheet;
  }
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var existing = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h).trim(); });
  var missing = headers.filter(function (h) { return existing.indexOf(h) < 0; });
  if (missing.length) {
    sheet.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]);
    sheet.getRange(1, lastCol + 1, 1, missing.length).setFontWeight('bold').setBackground('#1e1e1e').setFontColor('#ffffff');
  }
  return sheet;
}

function readTable_(name) {
  if (REQ_.tables[name]) return REQ_.tables[name];
  var def = PRO_SCHEMA[name], sheet = ensureTable_(name);
  var range = sheet.getDataRange(), raw = range.getValues(), disp = range.getDisplayValues();
  var headerRow = (raw[0] || []).map(function (h) { return String(h).trim(); });
  var idx = {};
  def.cols.forEach(function (c) { idx[c[0]] = headerRow.indexOf(c[1]); });
  var rows = [];
  for (var r = 1; r < raw.length; r++) {
    if (disp[r].join('').trim() === '') continue;
    var o = { _row: r + 1 };
    def.cols.forEach(function (c) {
      var i = idx[c[0]];
      o[c[0]] = i < 0 ? '' : fromCell_(c[2], raw[r][i], disp[r][i]);
    });
    rows.push(o);
  }
  var t = { name: name, def: def, sheet: sheet, idx: idx, width: headerRow.length, rows: rows };
  REQ_.tables[name] = t;
  return t;
}

function fromCell_(type, rv, dv) {
  if (rv === undefined || rv === null) rv = '';
  if (type === 'num') return rv === '' ? '' : (isFinite(Number(rv)) ? Number(rv) : 0);
  if (type === 'month') return rv === '' ? '' : monthText_(rv, dv);
  if (type === 'date') return isDateObj_(rv) ? isoDate_(rv) : (isoDate_(dv) || String(dv || '').trim());
  if (type === 'json') { try { return rv === '' ? null : JSON.parse(rv); } catch (e) { return null; } }
  if (isDateObj_(rv)) return dv; // e.g. a time typed into a text column
  return type === 'text' ? String(rv).trim() : (typeof rv === 'string' ? rv.trim() : String(dv).trim());
}

function isDateObj_(v) { return Object.prototype.toString.call(v) === '[object Date]'; }

function toCell_(type, v) {
  if (v === undefined || v === null) return '';
  if (type === 'num') return v === '' ? '' : money_(v);
  if (type === 'json') return JSON.stringify(v);
  if (type === 'date') return v ? isoDate_(v) : '';
  return v;
}

/** Writes obj (only the keys it has) into a new row or an existing row number. */
function writeRow_(name, obj, rowNum) {
  var t = readTable_(name), sheet = t.sheet;
  var width = Math.max(t.width, sheet.getLastColumn());
  var target = rowNum || sheet.getLastRow() + 1;
  var arr = rowNum ? sheet.getRange(rowNum, 1, 1, width).getValues()[0] : new Array(width).join('.').split('.').map(function () { return ''; });
  t.def.cols.forEach(function (c) {
    if (!obj.hasOwnProperty(c[0]) || t.idx[c[0]] < 0) return;
    arr[t.idx[c[0]]] = toCell_(c[2], obj[c[0]]);
    if (c[2] === 'text' || c[2] === 'month' || c[2] === 'json') sheet.getRange(target, t.idx[c[0]] + 1).setNumberFormat('@');
  });
  sheet.getRange(target, 1, 1, width).setValues([arr]);
  delete REQ_.tables[name];
  return target;
}

function deleteRowAt_(name, rowNum) { readTable_(name).sheet.deleteRow(rowNum); delete REQ_.tables[name]; }

function clean_(row) { var o = {}; for (var k in row) if (k !== '_row') o[k] = row[k]; return o; }
function rowsOf_(name) { return readTable_(name).rows.map(clean_); }
function findBy_(name, key, value) { var rows = readTable_(name).rows; for (var i = 0; i < rows.length; i++) if (String(rows[i][key]) === String(value)) return rows[i]; return null; }

function nextId_(name, prefix) {
  var max = 0, re = new RegExp('^' + prefix + '(\\d+)$', 'i'), key = PRO_SCHEMA[name].key;
  readTable_(name).rows.forEach(function (r) { var m = String(r[key]).match(re); if (m) max = Math.max(max, +m[1]); });
  return prefix + ('000' + (max + 1)).slice(-3);
}

function nowIso_() { return Utilities.formatDate(new Date(), tz_(), "yyyy-MM-dd'T'HH:mm:ss"); }

function audit_(action, entity, entityId, details) {
  try { writeRow_('audit', { time: nowIso_(), user: REQ_.user ? REQ_.user.username : '', action: action, entity: entity, entityId: String(entityId || ''), details: details ? JSON.stringify(details).slice(0, 4000) : '' }); } catch (e) {}
}

function logError_(action, err) {
  try {
    REQ_.tables = {};
    writeRow_('errors', { time: nowIso_(), user: REQ_.user ? REQ_.user.username : '', action: action, message: String(err && err.message || err).slice(0, 1000), stack: String(err && err.stack || '').slice(0, 3000) });
  } catch (e) {}
}

// ---------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------
function getSettings_() {
  var s = {}; for (var k in DEFAULT_SETTINGS) s[k] = DEFAULT_SETTINGS[k];
  readTable_('settings').rows.forEach(function (r) { if (r.key) s[r.key] = r.value; });
  return s;
}

function setSetting_(key, value) {
  var row = findBy_('settings', 'key', key);
  writeRow_('settings', { key: key, value: String(value) }, row ? row._row : null);
}

function apiSaveSettings_(d) {
  var allowed = PUBLIC_SETTING_KEYS, changed = [];
  var input = d.settings || {};
  Object.keys(input).forEach(function (k) {
    if (allowed.indexOf(k) < 0) return;
    var v = String(input[k] === null || input[k] === undefined ? '' : input[k]);
    if (k === 'logo') { if (v && !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+\/=]+$/.test(v)) throw apiError_('Logo must be a PNG, JPEG or WebP image.'); if (v.length > 45000) throw apiError_('Logo is too large. Use an image under 30 KB.'); }
    else v = v.slice(0, 2000);
    if (k === 'feeStartMonth' && monthIndex_(v) < 0) throw apiError_('Fee start month must look like "November 2026".');
    if (k === 'feeDueDay' && !(+v >= 1 && +v <= 28)) throw apiError_('Fee due day must be between 1 and 28.');
    if (k === 'invoicePrefix' && !/^[A-Z0-9-]{1,10}$/i.test(v)) throw apiError_('Invoice prefix: letters, numbers or "-" (max 10).');
    if (k === 'paymentMethods' && !v.split(',').filter(function (x) { return x.trim(); }).length) throw apiError_('Add at least one payment method.');
    setSetting_(k, v); changed.push(k);
  });
  audit_('settings.save', 'settings', '', changed);
  return { settings: publicSettings_() , delta: {} };
}

function publicSettings_() {
  var s = getSettings_(), out = {};
  PUBLIC_SETTING_KEYS.forEach(function (k) { out[k] = s[k]; });
  return out;
}

// ---------------------------------------------------------------------
// Auth: users with salted, iterated HMAC-SHA256 password hashes
// ---------------------------------------------------------------------
function hashPassword_(password, salt) {
  var h = String(password);
  for (var i = 0; i < PASSWORD_ITERATIONS; i++) h = Utilities.base64Encode(Utilities.computeHmacSha256Signature(h, salt));
  return h;
}

function makeUserSecret_(password) {
  var salt = Utilities.getUuid().replace(/-/g, '');
  return { salt: salt, hash: hashPassword_(password, salt) };
}

function validatePassword_(p) {
  p = String(p || '');
  if (p.length < 8) throw apiError_('Password must be at least 8 characters.');
  return p;
}

function publicUser_(u) { return u ? { username: u.username, name: u.name, role: u.role } : null; }

function sessionUser_(token) {
  if (!token) return null;
  var v = CacheService.getScriptCache().get('rzams_pro_session_' + token);
  if (!v) return null;
  try { var u = JSON.parse(v); CacheService.getScriptCache().put('rzams_pro_session_' + token, v, SESSION_DURATION); return u; } catch (e) { return null; }
}

function apiLogin_(d) {
  var cache = CacheService.getScriptCache();
  var username = cleanText_(d.username, 40).toLowerCase(), password = String(d.password || '');
  if (!username || !password) throw apiError_('Enter username and password.');
  if (cache.get('rzams_pro_lock_' + username) || cache.get('rzams_login_lock')) throw apiError_('Too many wrong attempts. Try again in 10 minutes.', 'LOCKED');
  var users = readTable_('users').rows, user = null;

  if (!users.length) {
    // First run: the admin logs in as "admin" with the APP_PASSWORD script property;
    // an Admin user with a hashed copy of that password is created.
    var boot = getPassword_();
    if (!boot) throw apiError_('Set APP_PASSWORD in Apps Script > Project Settings > Script properties first.', 'SETUP');
    if (username === 'admin' && password === boot) {
      withLock_(function () {
        REQ_.tables = {};
        if (!readTable_('users').rows.length) {
          var sec = makeUserSecret_(password);
          writeRow_('users', { username: 'admin', name: 'Administrator', role: ROLE_ADMIN, hash: sec.hash, salt: sec.salt, status: 'Active', createdAt: nowIso_() });
        }
      });
      user = findBy_('users', 'username', 'admin');
    }
  } else {
    var u = findBy_('users', 'username', username);
    if (u && u.status === 'Active' && u.hash && hashPassword_(password, u.salt) === u.hash) user = u;
  }

  if (!user) {
    var key = 'rzams_pro_fail_' + username, fails = Number(cache.get(key) || 0) + 1;
    if (fails >= MAX_LOGIN_FAILURES) { cache.put('rzams_pro_lock_' + username, '1', LOGIN_LOCK_SECONDS); cache.remove(key); }
    else cache.put(key, String(fails), LOGIN_LOCK_SECONDS);
    throw apiError_('Wrong username or password.', 'AUTH_FAILED');
  }
  cache.remove('rzams_pro_fail_' + username);
  var token = Utilities.getUuid() + Utilities.getUuid().replace(/-/g, '');
  var pu = publicUser_(user);
  cache.put('rzams_pro_session_' + token, JSON.stringify(pu), SESSION_DURATION);
  try { withLock_(function () { REQ_.tables = {}; var row = findBy_('users', 'username', user.username); if (row) writeRow_('users', { lastLogin: nowIso_() }, row._row); }); } catch (e) {}
  REQ_.user = pu;
  return { token: token, user: pu };
}

function apiLogout_(d) { if (d && d.token) CacheService.getScriptCache().remove('rzams_pro_session_' + d.token); return { ok: true }; }

function apiChangePassword_(d) {
  var u = findBy_('users', 'username', REQ_.user.username);
  if (!u || hashPassword_(String(d.current || ''), u.salt) !== u.hash) throw apiError_('Current password is wrong.');
  var sec = makeUserSecret_(validatePassword_(d.next));
  writeRow_('users', { hash: sec.hash, salt: sec.salt }, u._row);
  audit_('auth.changePassword', 'user', u.username);
  return { ok: true };
}

function apiSaveUser_(d) {
  var username = cleanText_(d.username, 40).toLowerCase();
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) throw apiError_('Username: 3-40 letters, numbers, ".", "_" or "-".');
  var role = d.role === ROLE_ADMIN ? ROLE_ADMIN : ROLE_STAFF, status = d.status === 'Disabled' ? 'Disabled' : 'Active';
  var existing = findBy_('users', 'username', username);
  var obj = { username: username, name: cleanText_(d.name, 80) || username, role: role, status: status };
  if (existing && existing.username === REQ_.user.username && (role !== ROLE_ADMIN || status !== 'Active')) throw apiError_('You cannot remove your own admin access.');
  if (d.password) { var sec = makeUserSecret_(validatePassword_(d.password)); obj.hash = sec.hash; obj.salt = sec.salt; }
  else if (!existing) throw apiError_('Set a password for the new user.');
  if (!existing) obj.createdAt = nowIso_();
  writeRow_('users', obj, existing ? existing._row : null);
  audit_(existing ? 'users.update' : 'users.create', 'user', username, { role: role, status: status });
  return { delta: { users: [publicUserRow_(findBy_('users', 'username', username))] } };
}

function publicUserRow_(u) { return { username: u.username, name: u.name, role: u.role, status: u.status, lastLogin: u.lastLogin, createdAt: u.createdAt }; }

/** Legacy screen: master password = any active admin's password (or APP_PASSWORD before setup). */
function verifyLegacyPassword_(password) {
  var users = readTable_('users').rows.filter(function (u) { return u.status === 'Active' && u.role === ROLE_ADMIN; });
  if (!users.length) { var boot = getPassword_(); return !!boot && password === boot; }
  return users.some(function (u) { return hashPassword_(password, u.salt) === u.hash; });
}

// ---------------------------------------------------------------------
// Bootstrap: everything the app needs in one round trip
// ---------------------------------------------------------------------
function apiBootstrap_() {
  var isAdmin = REQ_.user.role === ROLE_ADMIN;
  var students = rowsOf_('students'), fees = rowsOf_('fees');
  var studio = readTable_('studio').rows.map(function (r) { var o = clean_(r); o.row = r._row; return o; });
  var tasks = readTable_('tasks').rows.map(function (r) { var o = clean_(r); o.row = r._row; return o; });
  return {
    user: REQ_.user,
    meta: metaInfo_(),
    settings: publicSettings_(),
    students: students,
    courses: rowsOf_('courses'),
    batches: rowsOf_('batches'),
    teachers: rowsOf_('teachers'),
    classes: rowsOf_('classes'),
    attendance: rowsOf_('attendance'),
    fees: fees,
    payments: rowsOf_('payments'),
    pending: pendingFor_(students, fees),
    reminders: rowsOf_('reminders'),
    expenses: isAdmin ? rowsOf_('expenses') : [],
    studio: studio,
    tasks: tasks,
    users: isAdmin ? readTable_('users').rows.map(publicUserRow_) : []
  };
}

function metaInfo_() {
  var cur = currentMonthIndex_();
  return { today: todayIso_(), currentMonth: monthLabel_(cur), currentMonthIndex: cur, feeStartMonth: monthLabel_(feeStartMonthIndex_()), version: API_VERSION, setupDone: !!findBy_('settings', 'key', 'setupDoneAt') };
}

// ---------------------------------------------------------------------
// Pending fees (shared rule with the legacy screen: computePending_ in Code.gs)
// ---------------------------------------------------------------------
function legacyStudent_(s) { return { 'Student ID': s.id, 'Student Name': s.name, 'Phone': s.phone, 'Monthly Fee': s.fee, 'Join Date': s.joinDate, 'Status': s.status }; }
function legacyFee_(f) { return { 'Student ID': f.studentId, 'Student Name': f.studentName, 'Month': f.month, 'Amount': f.amount, 'Paid': f.paid, 'Due': f.due }; }

function pendingFor_(students, fees) {
  return computePending_(students.map(legacyStudent_), fees.map(legacyFee_)).map(function (p) {
    return { studentId: p.studentId, name: p.name, phone: p.phone, month: p.month, monthIndex: p.monthIndex, amount: p.amount, paid: p.paid, due: p.due, recorded: p.recorded };
  });
}

function studentFeeStatus_(studentId) {
  var s = findBy_('students', 'id', studentId);
  if (!s) throw apiError_('Student not found.');
  var fees = rowsOf_('fees').filter(function (f) { return String(f.studentId) === String(s.id); });
  var cur = currentMonthIndex_(), fee = money_(s.fee);
  var months = pendingFor_([clean_(s)], fees);
  var have = {}; months.forEach(function (m) { have[m.month] = 1; });
  for (var m = cur; m <= cur + 3; m++) {
    var lbl = monthLabel_(m); if (have[lbl]) continue;
    var rec = fees.filter(function (f) { return f.month === lbl; })[0];
    var amount = rec ? money_(rec.amount) : fee, paid = rec ? money_(rec.paid) : 0;
    if (amount - paid > 0) months.push({ studentId: s.id, name: s.name, month: lbl, monthIndex: m, amount: amount, paid: paid, due: money_(amount - paid), recorded: !!rec, advance: m > cur });
  }
  months.forEach(function (x) { if (x.advance === undefined) x.advance = x.monthIndex > cur; });
  months.sort(function (a, b) { return a.monthIndex - b.monthIndex; });
  return { student: clean_(s), months: months };
}

// ---------------------------------------------------------------------
// Payments (transactions) + invoices
// ---------------------------------------------------------------------
function nextInvoiceNo_(dateIso) {
  var s = getSettings_(), seq = (parseInt(s.invoiceSeq, 10) || 0) + 1;
  // never reuse a number that already exists (e.g. after a manual edit of the sequence)
  var used = {}; readTable_('payments').rows.forEach(function (p) { if (p.invoiceNo) used[p.invoiceNo] = 1; });
  var no;
  do { no = String(s.invoicePrefix || 'RZA').toUpperCase() + '-' + String(dateIso).slice(0, 4) + '-' + ('000' + seq).slice(-4); seq++; } while (used[no]);
  setSetting_('invoiceSeq', String(seq - 1));
  return no;
}

function dueDateFor_(monthIdx, dueDay) { return Math.floor(monthIdx / 12) + '-' + pad2_(monthIdx % 12 + 1) + '-' + pad2_(Math.min(Math.max(+dueDay || 10, 1), 28)); }

/**
 * Records one payment. Idempotent on requestId (a retry returns the original
 * payment instead of creating a second one). The amount fills the selected
 * months oldest first. Remaining = Previous Balance + Current Fee - Amount Paid.
 */
function recordPayment_(d) {
  var requestId = cleanText_(d.requestId, 80);
  if (requestId) {
    var dup = findBy_('payments', 'requestId', requestId);
    if (dup) return { payment: clean_(dup), duplicate: true };
  }
  var student = findBy_('students', 'id', d.studentId);
  if (!student) throw apiError_('Student not found.');
  var amount = money_(d.amount);
  if (!(amount > 0)) throw apiError_('Enter the amount being paid.');
  var date = d.date ? isoDate_(d.date) : todayIso_();
  if (!date) throw apiError_('Payment date is not valid.');
  if (date > todayIso_()) throw apiError_('Payment date cannot be in the future.');
  var settings = getSettings_();
  var methods = String(settings.paymentMethods).split(',').map(function (m) { return m.trim(); }).filter(String);
  var method = cleanText_(d.method, 40);
  if (d.legacy) method = method || 'Not recorded';
  else if (methods.indexOf(method) < 0) throw apiError_('Choose a payment method: ' + methods.join(', ') + '.');

  var idxs = [], seen = {};
  (d.months && d.months.length ? d.months : []).forEach(function (m) {
    var mi = monthIndex_(m);
    if (mi < 0) throw apiError_('Month "' + cleanText_(m, 30) + '" is not valid.');
    if (!seen[mi]) { seen[mi] = 1; idxs.push(mi); }
  });
  if (!idxs.length) throw apiError_('Select at least one month.');
  idxs.sort(function (a, b) { return a - b; });

  var fees = readTable_('fees').rows.filter(function (f) { return String(f.studentId) === String(student.id); });
  var cur = currentMonthIndex_(), fee = money_(student.fee);
  var before = pendingFor_([clean_(student)], fees.map(clean_));
  var previousBalance = 0, currentFee = 0, counted = {};
  before.forEach(function (p) { counted[p.month] = 1; if (p.monthIndex < cur) previousBalance += p.due; else currentFee += p.due; });

  var remainingPay = amount, plan = [];
  idxs.forEach(function (mi) {
    var lbl = monthLabel_(mi), rec = fees.filter(function (f) { return f.month === lbl; })[0];
    var amt = rec ? money_(rec.amount) : (d.customAmount !== undefined && d.customAmount !== null && d.customAmount !== '' && idxs.length === 1 ? money_(d.customAmount) : fee);
    var already = rec ? money_(rec.paid) : 0, due = money_(amt - already);
    // selected months that are not already in the pending list (advance months, or
    // months before the fee start month) are added to this bill
    if (!counted[lbl] && due > 0) { if (mi < cur) previousBalance += due; else currentFee += due; }
    var take = Math.min(remainingPay, Math.max(due, 0));
    remainingPay = money_(remainingPay - take);
    plan.push({ mi: mi, lbl: lbl, rec: rec, amount: amt, already: already, take: take });
  });
  if (!plan.some(function (p) { return p.amount - p.already > 0; })) throw apiError_('The selected month(s) are already fully paid.');
  if (remainingPay > 0) throw apiError_('₹' + remainingPay + ' is more than the fees due for the selected month(s). Select another month or reduce the amount.');

  var allocation = [];
  plan.forEach(function (p) {
    if (p.take <= 0) return;
    var totalPaid = money_(p.already + p.take), due = money_(p.amount - totalPaid);
    var obj = { studentId: student.id, studentName: student.name, month: p.lbl, amount: p.amount, paid: totalPaid, due: due, paymentDate: date };
    writeRow_('fees', obj, p.rec ? p.rec._row : null);
    allocation.push({ month: p.lbl, amount: p.take, fee: p.amount, dueAfter: due });
  });

  previousBalance = money_(previousBalance); currentFee = money_(currentFee);
  var remaining = money_(previousBalance + currentFee - amount);

  // next due date: earliest month still unpaid (current or older), else the month after the last paid one
  var feesAfter = readTable_('fees').rows.filter(function (f) { return String(f.studentId) === String(student.id); }).map(clean_);
  var after = pendingFor_([clean_(student)], feesAfter);
  var nextIdx;
  if (after.length) nextIdx = after[0].monthIndex;
  else {
    nextIdx = cur + 1;
    feesAfter.forEach(function (f) { var mi = monthIndex_(f.month); if (mi >= nextIdx && money_(f.due) <= 0) nextIdx = mi + 1; });
  }
  var course = student.courseId ? findBy_('courses', 'id', student.courseId) : null;
  var invoiceNo = nextInvoiceNo_(date);
  var payment = {
    id: nextId_('payments', 'PAY'), date: date, studentId: student.id, studentName: student.name,
    course: course ? course.name : student.instrument, amount: amount, method: method, reference: cleanText_(d.reference, 80),
    months: allocation.map(function (a) { return a.month; }).join(', '), allocation: allocation,
    previousBalance: previousBalance, currentFee: currentFee, remaining: remaining, nextDueDate: dueDateFor_(nextIdx, settings.feeDueDay),
    invoiceNo: invoiceNo, status: remaining > 0 ? 'Partial' : 'Paid', notes: cleanText_(d.notes, 300), requestId: requestId,
    recordedBy: REQ_.user ? REQ_.user.username : 'legacy', createdAt: nowIso_(), voidReason: ''
  };
  writeRow_('payments', payment);
  audit_('payments.record', 'payment', payment.id, { invoiceNo: invoiceNo, studentId: student.id, amount: amount, months: payment.months });
  return { payment: payment, duplicate: false };
}

function studentDelta_(studentId) {
  var students = rowsOf_('students'), fees = rowsOf_('fees');
  return {
    fees: fees.filter(function (f) { return String(f.studentId) === String(studentId); }),
    pending: pendingFor_(students, fees)
  };
}

function apiRecordPayment_(d) {
  var r = recordPayment_(d);
  var sd = studentDelta_(r.payment.studentId);
  return { payment: r.payment, duplicate: r.duplicate, delta: { payments: [r.payment], fees: sd.fees }, replace: { pending: sd.pending } };
}

function apiVoidPayment_(d) {
  var p = findBy_('payments', 'id', d.id);
  if (!p) throw apiError_('Payment not found.');
  if (p.status === 'Void') throw apiError_('This payment is already void.');
  if (p.status === 'Legacy') throw apiError_('Imported legacy payments cannot be voided here. Correct the Fees tab instead.');
  var reason = cleanText_(d.reason, 200);
  if (!reason) throw apiError_('Give a reason for voiding this payment.');
  (p.allocation || []).forEach(function (a) {
    var rec = readTable_('fees').rows.filter(function (f) { return String(f.studentId) === String(p.studentId) && f.month === a.month; })[0];
    if (!rec) return;
    var paid = money_(Math.max(money_(rec.paid) - money_(a.amount), 0));
    writeRow_('fees', { paid: paid, due: money_(money_(rec.amount) - paid) }, rec._row);
  });
  writeRow_('payments', { status: 'Void', voidReason: reason }, p._row);
  audit_('payments.void', 'payment', p.id, { invoiceNo: p.invoiceNo, reason: reason });
  var sd = studentDelta_(p.studentId);
  return { delta: { payments: [clean_(findBy_('payments', 'id', p.id))], fees: sd.fees }, replace: { pending: sd.pending } };
}

// ---------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------
function apiSaveStudent_(d) {
  var s = d.student || d, existing = s.id ? findBy_('students', 'id', s.id) : null;
  if (s.id && !existing) throw apiError_('Student not found.');
  var c = {
    name: cleanText_(s.name, 100), phone: cleanPhone_(s.phone), parentName: cleanText_(s.parentName, 100),
    whatsapp: s.whatsapp ? cleanPhone_(s.whatsapp) : '', email: cleanText_(s.email, 120).toLowerCase(), address: cleanText_(s.address, 300),
    courseId: cleanText_(s.courseId, 20), batchId: cleanText_(s.batchId, 20), fee: Number(s.fee), notes: cleanText_(s.notes, 500),
    joinDate: s.joinDate ? isoDate_(s.joinDate) : '', status: s.status === 'Inactive' ? 'Inactive' : 'Active'
  };
  if (!c.name) throw apiError_('Student name is required.');
  if (!c.phone) throw apiError_('Enter a valid 10-digit phone number.');
  if (s.whatsapp && !c.whatsapp) throw apiError_('WhatsApp number must be a valid 10-digit number.');
  if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) throw apiError_('Email address is not valid.');
  if (String(s.fee).trim() === '' || !isFinite(c.fee) || c.fee < 0 || c.fee > 100000) throw apiError_('Enter a valid monthly fee.');
  if (s.joinDate && !c.joinDate) throw apiError_('Admission date is not valid.');
  var course = c.courseId ? findBy_('courses', 'id', c.courseId) : null;
  if (c.courseId && !course) throw apiError_('Selected course does not exist.');
  var batch = c.batchId ? findBy_('batches', 'id', c.batchId) : null;
  if (c.batchId && !batch) throw apiError_('Selected batch does not exist.');
  if (batch && course && batch.courseId && batch.courseId !== course.id) throw apiError_('The batch belongs to a different course.');
  if (batch && Number(batch.capacity) > 0 && (!existing || existing.batchId !== batch.id)) {
    var count = readTable_('students').rows.filter(function (x) { return x.batchId === batch.id && x.status === 'Active'; }).length;
    if (count >= Number(batch.capacity)) throw apiError_('Batch "' + batch.name + '" is full (' + batch.capacity + ' students).');
  }
  if (s.photo !== undefined) {
    var photo = String(s.photo || '');
    if (photo && !/^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/.test(photo)) throw apiError_('Photo must be a JPEG image.');
    if (photo.length > 45000) throw apiError_('Photo is too large.');
    c.photo = photo;
  }
  c.fee = money_(c.fee);
  c.instrument = course ? course.name : (existing ? existing.instrument : cleanText_(s.instrument, 50));
  if (batch) c.batch = batch.name; else if (!c.batchId && s.batch !== undefined) c.batch = cleanText_(s.batch, 50);
  c.updatedAt = nowIso_();

  if (!existing) {
    var dup = readTable_('students').rows.filter(function (x) { return String(x.name).toLowerCase() === c.name.toLowerCase() && cleanPhone_(x.phone) === c.phone; })[0];
    if (dup) throw apiError_('This student already exists (' + dup.id + ').');
    c.id = generateNextStudentId_(readTable_('students').sheet);
    if (!c.joinDate) c.joinDate = todayIso_();
    writeRow_('students', c);
    audit_('students.create', 'student', c.id, { name: c.name });
  } else {
    if (!c.joinDate) delete c.joinDate;
    writeRow_('students', c, existing._row);
    audit_('students.update', 'student', existing.id, { fields: Object.keys(c) });
  }
  var saved = clean_(findBy_('students', 'id', c.id || existing.id));
  return { student: saved, delta: { students: [saved] }, replace: { pending: pendingFor_(rowsOf_('students'), rowsOf_('fees')) } };
}

function apiArchiveStudent_(d) {
  var s = findBy_('students', 'id', d.id);
  if (!s) throw apiError_('Student not found.');
  var status = d.restore ? 'Active' : 'Inactive';
  writeRow_('students', { status: status, updatedAt: nowIso_() }, s._row);
  audit_(d.restore ? 'students.restore' : 'students.archive', 'student', s.id);
  return { delta: { students: [clean_(findBy_('students', 'id', s.id))] }, replace: { pending: pendingFor_(rowsOf_('students'), rowsOf_('fees')) } };
}

/** Permanent delete is only allowed for a student with no payments, fees or attendance. */
function apiDeleteStudent_(d) {
  var s = findBy_('students', 'id', d.id);
  if (!s) throw apiError_('Student not found.');
  var has = rowsOf_('fees').some(function (f) { return f.studentId === s.id; }) || rowsOf_('payments').some(function (p) { return p.studentId === s.id; }) || rowsOf_('attendance').some(function (a) { return a.studentId === s.id; });
  if (has) throw apiError_('This student has payment or attendance history, so they can only be archived.');
  deleteRowAt_('students', s._row);
  audit_('students.delete', 'student', s.id, { name: s.name });
  return { removed: { students: [s.id] }, replace: { pending: pendingFor_(rowsOf_('students'), rowsOf_('fees')) } };
}

function apiAssignBatch_(d) {
  var batch = findBy_('batches', 'id', d.batchId);
  if (!batch) throw apiError_('Batch not found.');
  var ids = (d.studentIds || []).map(String), updated = [];
  var active = readTable_('students').rows.filter(function (x) { return x.batchId === batch.id && x.status === 'Active'; }).length;
  var adding = ids.filter(function (id) { var s = findBy_('students', 'id', id); return s && s.batchId !== batch.id; }).length;
  if (Number(batch.capacity) > 0 && active + adding > Number(batch.capacity)) throw apiError_('Batch "' + batch.name + '" can take ' + batch.capacity + ' students; this would make ' + (active + adding) + '.');
  var course = batch.courseId ? findBy_('courses', 'id', batch.courseId) : null;
  ids.forEach(function (id) {
    var s = findBy_('students', 'id', id); if (!s) return;
    var obj = { batchId: batch.id, batch: batch.name, updatedAt: nowIso_() };
    if (course) { obj.courseId = course.id; obj.instrument = course.name; }
    writeRow_('students', obj, s._row);
    updated.push(clean_(findBy_('students', 'id', id)));
  });
  audit_('batches.assign', 'batch', batch.id, { students: ids });
  return { delta: { students: updated } };
}

// ---------------------------------------------------------------------
// Courses, batches, teachers, classes, expenses (simple tables)
// ---------------------------------------------------------------------
function saveSimple_(name, d, prefix, validator) {
  var input = d.item || d, key = PRO_SCHEMA[name].key;
  var existing = input[key] ? findBy_(name, key, input[key]) : null;
  if (input[key] && !existing) throw apiError_('Record not found. Please refresh.');
  var c = validator(input, existing);
  if (!existing) { c[key] = nextId_(name, prefix); if (PRO_SCHEMA[name].cols.some(function (x) { return x[0] === 'createdAt'; })) c.createdAt = nowIso_(); }
  writeRow_(name, c, existing ? existing._row : null);
  var saved = clean_(findBy_(name, key, c[key] || existing[key]));
  audit_(name + (existing ? '.update' : '.create'), name, saved[key]);
  var delta = {}; delta[name] = [saved];
  var res = { item: saved, delta: delta };
  if (name === 'courses' && existing && existing.name !== saved.name) {
    // keep the student's Instrument text in step with the course name
    var touched = [];
    readTable_('students').rows.filter(function (s) { return s.courseId === saved.id; }).forEach(function (s) { writeRow_('students', { instrument: saved.name }, s._row); touched.push(s.id); });
    if (touched.length) res.delta.students = touched.map(function (id) { return clean_(findBy_('students', 'id', id)); });
  }
  if (name === 'batches' && existing && existing.name !== saved.name) {
    var moved = [];
    readTable_('students').rows.filter(function (s) { return s.batchId === saved.id; }).forEach(function (s) { writeRow_('students', { batch: saved.name }, s._row); moved.push(s.id); });
    if (moved.length) res.delta.students = moved.map(function (id) { return clean_(findBy_('students', 'id', id)); });
  }
  return res;
}

function deleteSimple_(name, id, inUseCheck) {
  var key = PRO_SCHEMA[name].key, row = findBy_(name, key, id);
  if (!row) throw apiError_('Record not found. Please refresh.');
  if (inUseCheck) { var why = inUseCheck(id); if (why) throw apiError_(why); }
  deleteRowAt_(name, row._row);
  audit_(name + '.delete', name, id);
  var removed = {}; removed[name] = [id];
  return { removed: removed };
}

function inUse_(field, id) {
  var n = readTable_('students').rows.filter(function (s) { return s[field] === id; }).length;
  if (n) return 'In use by ' + n + ' student(s). Mark it Inactive instead, or move the students first.';
  if (field !== 'batchId') {
    var b = readTable_('batches').rows.filter(function (x) { return x[field] === id; }).length;
    if (b) return 'In use by ' + b + ' batch(es). Mark it Inactive instead.';
  }
  var c = readTable_('classes').rows.filter(function (x) { return x[field] === id; }).length;
  if (c) return 'In use by ' + c + ' scheduled class(es). Mark it Inactive instead.';
  return '';
}

function activeStatus_(v) { return v === 'Inactive' ? 'Inactive' : 'Active'; }
function cleanTime_(v) { var m = String(v || '').trim().match(/^(\d{1,2}):(\d{2})$/); return m && +m[1] < 24 && +m[2] < 60 ? pad2_(+m[1]) + ':' + m[2] : ''; }
var WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function validateCourse_(d, existing) {
  var c = { name: cleanText_(d.name, 80), fee: Number(d.fee), description: cleanText_(d.description, 500), status: activeStatus_(d.status) };
  if (!c.name) throw apiError_('Course name is required.');
  if (!isFinite(c.fee) || c.fee < 0 || String(d.fee).trim() === '') throw apiError_('Enter a valid monthly fee.');
  var dup = readTable_('courses').rows.filter(function (x) { return x.name.toLowerCase() === c.name.toLowerCase() && (!existing || x.id !== existing.id); })[0];
  if (dup) throw apiError_('A course with this name already exists.');
  return c;
}

function validateBatch_(d, existing) {
  var days = String(d.days || '').split(',').map(function (x) { return x.trim().slice(0, 3); }).filter(function (x) { return WEEKDAYS.indexOf(x) >= 0; });
  var c = { name: cleanText_(d.name, 80), courseId: cleanText_(d.courseId, 20), teacherId: cleanText_(d.teacherId, 20), days: days.join(','),
    startTime: cleanTime_(d.startTime), endTime: cleanTime_(d.endTime), location: cleanText_(d.location, 120), capacity: d.capacity === '' || d.capacity === undefined ? '' : Number(d.capacity), status: activeStatus_(d.status) };
  if (!c.name) throw apiError_('Batch name is required.');
  if (!c.courseId || !findBy_('courses', 'id', c.courseId)) throw apiError_('Choose the course for this batch.');
  if (c.teacherId && !findBy_('teachers', 'id', c.teacherId)) throw apiError_('Selected teacher does not exist.');
  if ((d.startTime && !c.startTime) || (d.endTime && !c.endTime)) throw apiError_('Times must look like 17:30.');
  if (c.startTime && c.endTime && c.endTime <= c.startTime) throw apiError_('End time must be after start time.');
  if (c.capacity !== '' && (!isFinite(c.capacity) || c.capacity < 0 || c.capacity > 500)) throw apiError_('Capacity must be a number.');
  if (existing && c.capacity !== '' && c.capacity > 0) {
    var n = readTable_('students').rows.filter(function (s) { return s.batchId === existing.id && s.status === 'Active'; }).length;
    if (n > c.capacity) throw apiError_('This batch already has ' + n + ' active students.');
  }
  return c;
}

function validateTeacher_(d) {
  var c = { name: cleanText_(d.name, 100), phone: d.phone ? cleanPhone_(d.phone) : '', whatsapp: d.whatsapp ? cleanPhone_(d.whatsapp) : '', email: cleanText_(d.email, 120).toLowerCase(),
    courseIds: String(d.courseIds || '').split(',').map(function (x) { return x.trim(); }).filter(function (x) { return x && findBy_('courses', 'id', x); }).join(','),
    status: activeStatus_(d.status), joinDate: d.joinDate ? isoDate_(d.joinDate) : '', notes: cleanText_(d.notes, 500) };
  if (!c.name) throw apiError_('Teacher name is required.');
  if (d.phone && !c.phone) throw apiError_('Enter a valid 10-digit phone number.');
  if (d.whatsapp && !c.whatsapp) throw apiError_('WhatsApp number must be a valid 10-digit number.');
  if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) throw apiError_('Email address is not valid.');
  return c;
}

function validateClass_(d) {
  var statuses = ['Scheduled', 'Completed', 'Cancelled'];
  var c = { date: isoDate_(d.date), startTime: cleanTime_(d.startTime), endTime: cleanTime_(d.endTime), batchId: cleanText_(d.batchId, 20), teacherId: cleanText_(d.teacherId, 20),
    courseId: cleanText_(d.courseId, 20), location: cleanText_(d.location, 120), status: statuses.indexOf(d.status) >= 0 ? d.status : 'Scheduled', title: cleanText_(d.title, 100), notes: cleanText_(d.notes, 300) };
  if (!c.date) throw apiError_('Choose a valid date.');
  if (!c.startTime) throw apiError_('Start time must look like 17:30.');
  if (d.endTime && !c.endTime) throw apiError_('End time must look like 18:30.');
  if (c.endTime && c.endTime <= c.startTime) throw apiError_('End time must be after start time.');
  var batch = c.batchId ? findBy_('batches', 'id', c.batchId) : null;
  if (c.batchId && !batch) throw apiError_('Selected batch does not exist.');
  if (batch) { if (!c.courseId) c.courseId = batch.courseId; if (!c.teacherId) c.teacherId = batch.teacherId; if (!c.location) c.location = batch.location; }
  if (!c.batchId && !c.title) throw apiError_('Give the class a title or choose a batch.');
  if (c.teacherId && !findBy_('teachers', 'id', c.teacherId)) throw apiError_('Selected teacher does not exist.');
  if (batch) {
    var clash = readTable_('classes').rows.filter(function (x) { return x.batchId === c.batchId && x.date === c.date && x.id !== d.id; })[0];
    if (clash) throw apiError_('This batch already has an entry on ' + c.date + '. Edit that one instead.');
  }
  return c;
}

function validateExpense_(d) {
  var c = { date: isoDate_(d.date), category: cleanText_(d.category, 60), description: cleanText_(d.description, 300), amount: Number(d.amount), method: cleanText_(d.method, 40) || 'Cash', createdBy: REQ_.user.username };
  if (!c.date) throw apiError_('Choose a valid date.');
  if (c.date > todayIso_()) throw apiError_('Expense date cannot be in the future.');
  if (!c.category) throw apiError_('Choose a category.');
  if (!isFinite(c.amount) || c.amount <= 0) throw apiError_('Enter a valid amount.');
  c.amount = money_(c.amount);
  return c;
}

// ---------------------------------------------------------------------
// Attendance: Present / Absent / Leave, one entry per student per date
// ---------------------------------------------------------------------
function apiSaveAttendance_(d) {
  var date = isoDate_(d.date);
  if (!date) throw apiError_('Invalid date.');
  if (date > todayIso_()) throw apiError_('Attendance cannot be saved for a future date.');
  var students = {}; readTable_('students').rows.forEach(function (s) { students[s.id] = s; });
  var clean = [], seen = {};
  (d.records || []).forEach(function (r) {
    var id = String(r && r.studentId || r && r.id || ''), st = String(r && r.status || '');
    if (!students[id] || seen[id] || ['Present', 'Absent', 'Leave'].indexOf(st) < 0) return;
    seen[id] = 1; clean.push({ id: id, status: st });
  });
  if (!clean.length) throw apiError_('Mark at least one student.');
  var existing = {};
  readTable_('attendance').rows.forEach(function (a) { if (a.date === date) existing[a.studentId] = a; });
  var batchId = cleanText_(d.batchId, 20), now = nowIso_(), user = REQ_.user.username, appended = [];
  clean.forEach(function (rec) {
    var obj = { date: date, studentId: rec.id, studentName: students[rec.id].name, status: rec.status, batchId: batchId || students[rec.id].batchId || '', markedAt: now, markedBy: user };
    if (existing[rec.id]) writeRow_('attendance', { status: rec.status, batchId: obj.batchId, markedAt: now, markedBy: user }, existing[rec.id]._row);
    else appended.push(obj);
  });
  if (appended.length) {
    var t = readTable_('attendance'), sheet = t.sheet, width = Math.max(t.width, sheet.getLastColumn()), start = sheet.getLastRow() + 1;
    var rows = appended.map(function (o) {
      var arr = new Array(width).join('.').split('.').map(function () { return ''; });
      t.def.cols.forEach(function (c) { if (t.idx[c[0]] >= 0) arr[t.idx[c[0]]] = toCell_(c[2], o[c[0]]); });
      return arr;
    });
    sheet.getRange(start, 1, rows.length, width).setValues(rows);
    delete REQ_.tables.attendance;
  }
  if (String(getSettings_().calendarSync) === 'true') {
    try { syncAttendanceToCalendar_(date, clean.map(function (r) { return { name: students[r.id].name, status: r.status }; })); } catch (e) { console.error('Calendar sync failed: ' + e.message); }
  }
  audit_('attendance.save', 'attendance', date, { count: clean.length, batchId: batchId });
  var counts = { Present: 0, Absent: 0, Leave: 0 }; clean.forEach(function (r) { counts[r.status]++; });
  return { counts: counts, delta: { attendance: rowsOf_('attendance').filter(function (a) { return a.date === date; }) } };
}

// ---------------------------------------------------------------------
// Reminders (manual WhatsApp; logged, never reported as "delivered")
// ---------------------------------------------------------------------
function apiLogReminder_(d) {
  var s = findBy_('students', 'id', d.studentId);
  if (!s) throw apiError_('Student not found.');
  var r = { id: nextId_('reminders', 'REM'), date: nowIso_(), studentId: s.id, studentName: s.name, phone: cleanPhone_(d.phone || s.whatsapp || s.phone),
    amount: money_(d.amount), months: cleanText_(d.months, 200), message: String(d.message || '').slice(0, 2000),
    channel: d.channel === 'Invoice' ? 'Invoice' : 'WhatsApp', status: 'WhatsApp opened', createdBy: REQ_.user.username };
  writeRow_('reminders', r);
  return { delta: { reminders: [r] } };
}

// ---------------------------------------------------------------------
// Studio clients & tasks (row-addressed legacy tabs)
// ---------------------------------------------------------------------
function rowList_(name) { return readTable_(name).rows.map(function (r) { var o = clean_(r); o.row = r._row; return o; }); }

function checkProRow_(name, row, keyField, expected) {
  var r = readTable_(name).rows.filter(function (x) { return x._row === Number(row); })[0];
  if (!r) throw apiError_('Record not found. Please refresh.');
  if (expected !== undefined && expected !== null && String(r[keyField]) !== String(expected)) throw apiError_('This record changed in the sheet. Please refresh and try again.');
  return r;
}

function apiSaveStudio_(d) {
  var v = validateStudio_(d.item || d); if (v.error) throw apiError_(v.error);
  var c = v.clean, obj = { clientName: c.clientName, phone: c.phone, projectName: c.projectName, total: c.total, advance: c.advance, due: money_(c.total - c.advance), status: c.status };
  if (d.row) { checkProRow_('studio', d.row, 'clientName', d.expected); writeRow_('studio', obj, Number(d.row)); }
  else writeRow_('studio', obj);
  audit_('studio.save', 'studio', c.clientName);
  return { replace: { studio: rowList_('studio') } };
}
function apiDeleteStudio_(d) { checkProRow_('studio', d.row, 'clientName', d.expected); deleteRowAt_('studio', Number(d.row)); audit_('studio.delete', 'studio', d.expected); return { replace: { studio: rowList_('studio') } }; }

function apiSaveTask_(d) {
  var task = cleanText_(d.task, 300); if (!task) throw apiError_('Task description is required.');
  var obj = { date: d.date ? isoDate_(d.date) : todayIso_(), task: task, priority: ['High', 'Medium', 'Low'].indexOf(d.priority) >= 0 ? d.priority : 'Medium', status: d.status === 'Completed' ? 'Completed' : 'Pending', notes: cleanText_(d.notes, 300) };
  if (!obj.date) throw apiError_('Date is not valid.');
  if (d.row) { checkProRow_('tasks', d.row, 'task', d.expected); writeRow_('tasks', obj, Number(d.row)); } else writeRow_('tasks', obj);
  return { replace: { tasks: rowList_('tasks') } };
}
function apiDeleteTask_(d) { checkProRow_('tasks', d.row, 'task', d.expected); deleteRowAt_('tasks', Number(d.row)); return { replace: { tasks: rowList_('tasks') } }; }

// ---------------------------------------------------------------------
// Backup & one-time setup (migration)
// ---------------------------------------------------------------------
function backupNow_(kind) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var folders = DriveApp.getFoldersByName('RZAMS Backups');
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder('RZAMS Backups');
  var name = 'RZAMS backup ' + Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd HH-mm') + ' (' + (kind || 'manual') + ')';
  var copy = DriveApp.getFileById(ss.getId()).makeCopy(name, folder);
  // keep the newest 30 automatic backups
  var files = [], it = folder.getFiles();
  while (it.hasNext()) { var f = it.next(); if (/\(daily\)$/.test(f.getName())) files.push(f); }
  files.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); });
  files.slice(30).forEach(function (f) { f.setTrashed(true); });
  if (REQ_.user) audit_('system.backup', 'backup', copy.getId(), { name: name });
  setSetting_('lastBackupAt', nowIso_());
  return { name: name, url: copy.getUrl(), at: nowIso_() };
}

/** Run from the editor once to schedule a daily backup at ~2 AM. */
function installDailyBackup() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'dailyBackup') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('dailyBackup').timeBased().everyDays(1).atHour(2).create();
  return 'Daily backup scheduled';
}
function dailyBackup() { REQ_ = { tables: {}, user: null, action: 'dailyBackup' }; return backupNow_('daily'); }

/** What setup would do, without changing anything. */
function setupPreview_() {
  var plan = buildSetupPlan_();
  return { coursesToCreate: plan.courses.map(function (c) { return c.name; }), studentsToLink: plan.links.length, unmatchedInstruments: plan.unmatched,
    legacyPaymentsToImport: plan.legacy.length, legacyAmount: plan.legacy.reduce(function (a, p) { return a + p.amount; }, 0), alreadyDone: !!findBy_('settings', 'key', 'setupDoneAt') };
}

function buildSetupPlan_() {
  var courses = readTable_('courses').rows, toCreate = [];
  INITIAL_COURSES.forEach(function (c) { if (!courses.some(function (x) { return x.name.toLowerCase() === c[0].toLowerCase(); })) toCreate.push({ name: c[0], aliases: c[1] }); });
  var all = courses.map(function (x) { return { id: x.id, name: x.name, aliases: [x.name.toLowerCase()] }; });
  INITIAL_COURSES.forEach(function (c) { var hit = all.filter(function (x) { return x.name.toLowerCase() === c[0].toLowerCase(); })[0]; if (hit) hit.aliases = hit.aliases.concat(c[1]); });
  var links = [], unmatched = {};
  readTable_('students').rows.forEach(function (s) {
    if (s.courseId) return;
    var inst = String(s.instrument || '').trim().toLowerCase(); if (!inst) return;
    var target = all.filter(function (x) { return x.aliases.indexOf(inst) >= 0; })[0] || toCreate.filter(function (x) { return x.aliases.indexOf(inst) >= 0; })[0];
    if (target) links.push({ row: s._row, id: s.id, courseName: target.name }); else unmatched[s.instrument] = (unmatched[s.instrument] || 0) + 1;
  });
  var imported = {}; readTable_('payments').rows.forEach(function (p) { if (p.requestId) imported[p.requestId] = 1; });
  var legacy = readTable_('fees').rows.filter(function (f) { return money_(f.paid) > 0 && !imported['legacy:' + f.studentId + ':' + f.month]; })
    .map(function (f) { return { studentId: f.studentId, studentName: f.studentName, month: f.month, amount: money_(f.paid), fee: money_(f.amount), due: money_(f.due), date: f.paymentDate }; });
  return { courses: toCreate, links: links, unmatched: unmatched, legacy: legacy };
}

/**
 * One-time, additive setup: backs up the spreadsheet, creates the default
 * courses, links students to courses by their Instrument text (only fills the
 * new Course ID column) and imports existing Fees payments as "Legacy"
 * transactions so revenue reports include them. Safe to run again.
 */
function apiRunSetup_(d) {
  var backup = null;
  if (!d.skipBackup) backup = backupNow_('before setup');
  var plan = buildSetupPlan_(), fees = {};
  plan.courses.forEach(function (c) {
    var fee = 0;
    var priced = readTable_('students').rows.filter(function (s) { return c.aliases.indexOf(String(s.instrument).trim().toLowerCase()) >= 0 && money_(s.fee) > 0; }).map(function (s) { return money_(s.fee); });
    if (priced.length) { var counts = {}; priced.forEach(function (f) { counts[f] = (counts[f] || 0) + 1; }); fee = +Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; })[0]; }
    writeRow_('courses', { id: nextId_('courses', 'CRS'), name: c.name, fee: fee, description: '', status: 'Active', createdAt: nowIso_() });
    fees[c.name] = fee;
  });
  var byName = {}; readTable_('courses').rows.forEach(function (c) { byName[c.name] = c; });
  plan.links.forEach(function (l) { var c = byName[l.courseName]; if (c) writeRow_('students', { courseId: c.id }, l.row); });
  var n = 0, pRows = [], pt = readTable_('payments'), seq = 0;
  readTable_('payments').rows.forEach(function (p) { var m = String(p.id).match(/^PAY(\d+)$/); if (m) seq = Math.max(seq, +m[1]); });
  plan.legacy.forEach(function (f) {
    seq++; n++;
    pRows.push({ id: 'PAY' + ('000' + seq).slice(-3), date: f.date || '', studentId: f.studentId, studentName: f.studentName, course: '', amount: f.amount, method: 'Not recorded',
      reference: '', months: f.month, allocation: [{ month: f.month, amount: f.amount, fee: f.fee, dueAfter: f.due }], previousBalance: '', currentFee: f.fee, remaining: f.due,
      nextDueDate: '', invoiceNo: '', status: 'Legacy', notes: 'Imported from the Fees tab', requestId: 'legacy:' + f.studentId + ':' + f.month,
      recordedBy: 'setup', createdAt: nowIso_(), voidReason: '' });
  });
  if (pRows.length) {
    var sheet = pt.sheet, width = Math.max(pt.width, sheet.getLastColumn()), start = sheet.getLastRow() + 1;
    var textCols = pt.def.cols.filter(function (c) { return c[2] === 'text' || c[2] === 'json'; });
    textCols.forEach(function (c) { sheet.getRange(start, pt.idx[c[0]] + 1, pRows.length, 1).setNumberFormat('@'); });
    sheet.getRange(start, 1, pRows.length, width).setValues(pRows.map(function (o) {
      var arr = new Array(width).join('.').split('.').map(function () { return ''; });
      pt.def.cols.forEach(function (c) { if (pt.idx[c[0]] >= 0) arr[pt.idx[c[0]]] = toCell_(c[2], o[c[0]]); });
      return arr;
    }));
    delete REQ_.tables.payments;
  }
  setSetting_('setupDoneAt', nowIso_());
  audit_('system.setup', 'system', '', { coursesCreated: plan.courses.length, studentsLinked: plan.links.length, legacyImported: n });
  return { backup: backup, coursesCreated: plan.courses.map(function (c) { return c.name; }), studentsLinked: plan.links.length, legacyImported: n, unmatchedInstruments: plan.unmatched };
}
