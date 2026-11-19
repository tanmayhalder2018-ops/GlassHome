// RZAMS Pro JSON API tests (Api.gs through doPost, like the web app calls it)
// Run: TZ=Asia/Kolkata node --test rzams/test/api.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadBackend, seed } = require('./gas-mock');

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const now = new Date();
const CUR = MONTHS[now.getMonth()] + ' ' + now.getFullYear();
const nextMonth = (k) => { const d = new Date(now.getFullYear(), now.getMonth() + k, 1); return MONTHS[d.getMonth()] + ' ' + d.getFullYear(); };
const TODAY = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

function setup({ runSetup = true } = {}) {
  const env = loadBackend();
  seed(env);
  const login = env.api('auth.login', { username: 'admin', password: 'test-pass' });
  assert.equal(login.ok, true, login.error);
  const token = login.data.token;
  const call = (action, data) => env.api(action, data, token);
  const ok = (action, data) => { const r = call(action, data); assert.equal(r.ok, true, `${action}: ${r.error}`); return r.data; };
  if (runSetup) ok('system.setup', {});
  return { env, token, call, ok };
}

test('first login creates a hashed admin user from APP_PASSWORD', () => {
  const { env } = setup({ runSetup: false });
  const u = env.sheets['Users'].rows[1];
  assert.equal(u[0], 'admin');
  assert.equal(u[2], 'Admin');
  assert.notEqual(u[3], 'test-pass');
  assert.ok(String(u[3]).length > 20 && String(u[4]).length > 10, 'hash and salt stored');
  // APP_PASSWORD no longer needed once a user exists, but the hashed password works
  const again = env.api('auth.login', { username: 'admin', password: 'test-pass' });
  assert.equal(again.ok, true);
});

test('auth: wrong password, lockout after 5 tries, bad token, unknown action', () => {
  const { env, call } = setup({ runSetup: false });
  for (let i = 0; i < 5; i++) assert.equal(env.api('auth.login', { username: 'admin', password: 'nope' }).code, 'AUTH_FAILED');
  assert.equal(env.api('auth.login', { username: 'admin', password: 'test-pass' }).code, 'LOCKED');
  assert.equal(env.api('app.bootstrap', {}, 'bad-token').code, 'AUTH');
  assert.equal(call('nope.nope', {}).code, 'NOT_FOUND');
});

test('setup: backup first, courses created, students linked, legacy fees imported once', () => {
  const { env, ok } = setup({ runSetup: false });
  const pre = ok('system.setupPreview', {});
  assert.deepEqual(pre.coursesToCreate, ['Guitar', 'Ukulele', 'Piano', 'Vocal', 'Indian Classical Music']);
  assert.equal(pre.studentsToLink, 4);
  assert.equal(pre.legacyPaymentsToImport, 5);
  assert.equal(pre.legacyAmount, 500 + 200 + 1200 + 650 + 400);
  const r = ok('system.setup', {});
  assert.ok(r.backup && /before setup/.test(r.backup.name));
  assert.equal(env.backups.length, 1);
  assert.equal(r.legacyImported, 5);
  const b = ok('app.bootstrap', {});
  const vocal = b.courses.find((c) => c.name === 'Vocal');
  assert.equal(b.courses.find((c) => c.name === 'Guitar').fee, 700, 'course fee = most common fee of its students');
  assert.equal(b.courses.find((c) => c.name === 'Ukulele').fee, 0, 'no students -> fee to be set by admin');
  assert.equal(b.students.find((s) => s.id === 'STU001').courseId, vocal.id);
  assert.equal(b.students.find((s) => s.id === 'STU001').instrument, 'Vocals', 'Instrument text untouched');
  assert.equal(b.payments.filter((p) => p.status === 'Legacy').length, 5);
  assert.equal(b.meta.setupDone, true);
  // running again adds nothing
  const r2 = ok('system.setup', { skipBackup: true });
  assert.equal(r2.legacyImported, 0);
  assert.equal(r2.coursesCreated.length, 0);
  assert.equal(ok('app.bootstrap', {}).payments.length, 5);
});

test('setup keeps legacy columns where they were and appends new ones at the end', () => {
  const { env } = setup();
  const header = JSON.parse(JSON.stringify(env.sheets['Students'].rows[0]));
  assert.deepEqual(header.slice(0, 9), ['Student ID', 'Student Name', 'Phone', 'Parent Name', 'Instrument', 'Batch', 'Monthly Fee', 'Join Date', 'Status']);
  assert.deepEqual(header.slice(9, 13), ['WhatsApp', 'Email', 'Address', 'Photo']);
  // the legacy screen still reads students correctly
  const tok = env.ctx.loginUser('test-pass').token;
  const legacy = JSON.parse(JSON.stringify(env.ctx.getStudents(tok)));
  assert.equal(legacy.find((s) => s['Student ID'] === 'STU001')['Student Name'], 'Asha Test');
});

test('bootstrap returns all collections and the real pending list', () => {
  const { ok } = setup();
  const b = ok('app.bootstrap', {});
  for (const k of ['students', 'courses', 'batches', 'teachers', 'classes', 'attendance', 'fees', 'payments', 'pending', 'reminders', 'expenses', 'studio', 'tasks', 'users', 'settings', 'meta']) assert.ok(k in b, k);
  assert.equal(b.pending.reduce((a, p) => a + p.due, 0), 2000);
  assert.equal(b.settings.academyName, 'Rhythm Zone Academy');
  assert.equal('invoiceSeq' in b.settings, false);
  assert.equal(b.users[0].hash, undefined, 'no password hashes leave the server');
});

test('payments: formula, invoice number, allocation, next due date', () => {
  const { ok } = setup();
  // STU005: October 2026 has ₹200 left (before current month) + current month ₹600
  const r = ok('payments.record', { studentId: 'STU005', months: ['October 2026', CUR], amount: 500, method: 'UPI', reference: 'UPI123', requestId: 'req-1' });
  const p = r.payment;
  assert.equal(p.previousBalance, 200);
  assert.equal(p.currentFee, 600);
  assert.equal(p.remaining, 200 + 600 - 500);
  assert.equal(p.invoiceNo, `RZA-${now.getFullYear()}-0001`);
  assert.equal(p.status, 'Partial');
  assert.equal(p.method, 'UPI');
  assert.equal(p.course, 'Vocal');
  assert.deepEqual(p.allocation.map((a) => [a.month, a.amount, a.dueAfter]), [['October 2026', 200, 0], [CUR, 300, 300]]);
  const due10 = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-10`;
  assert.equal(p.nextDueDate, due10 < TODAY ? TODAY : due10, 'due date never before the invoice date');
  assert.equal(r.replace.pending.filter((x) => x.studentId === 'STU005').reduce((a, x) => a + x.due, 0), 300);
  // second payment gets the next number
  const p2 = ok('payments.record', { studentId: 'STU001', months: [CUR, nextMonth(1)], amount: 1000, method: 'Cash', requestId: 'req-2' }).payment;
  assert.equal(p2.invoiceNo, `RZA-${now.getFullYear()}-0002`);
  assert.equal(p2.previousBalance, 0);
  assert.equal(p2.currentFee, 1000, 'current month + advance month');
  assert.equal(p2.remaining, 0);
  assert.equal(p2.status, 'Paid');
  const nm = new Date(now.getFullYear(), now.getMonth() + 2, 1);
  assert.equal(p2.nextDueDate, `${nm.getFullYear()}-${String(nm.getMonth() + 1).padStart(2, '0')}-10`, 'next unpaid month after the advance');
});

test('payments: retry with the same requestId never creates a second payment or invoice', () => {
  const { ok, env } = setup();
  const a = ok('payments.record', { studentId: 'STU002', months: [CUR], amount: 700, method: 'Cash', requestId: 'same-req' });
  const b = ok('payments.record', { studentId: 'STU002', months: [CUR], amount: 700, method: 'Cash', requestId: 'same-req' });
  assert.equal(b.duplicate, true);
  assert.equal(b.payment.invoiceNo, a.payment.invoiceNo);
  assert.equal(env.sheets['Payments'].rows.filter((r) => r[17] === 'same-req').length, 1);
  assert.equal(env.sheets['Fees'].rows.filter((r) => r[0] === 'STU002').length, 1);
});

test('payments: validation (overpay, method, future date, no months, paid month)', () => {
  const { call } = setup();
  assert.match(call('payments.record', { studentId: 'STU002', months: [CUR], amount: 900, method: 'Cash' }).error, /more than/);
  assert.match(call('payments.record', { studentId: 'STU002', months: [CUR], amount: 100, method: 'Bitcoin' }).error, /payment method/);
  assert.match(call('payments.record', { studentId: 'STU002', months: [CUR], amount: 100, method: 'Cash', date: '2099-01-01' }).error, /future/);
  assert.match(call('payments.record', { studentId: 'STU002', months: [], amount: 100, method: 'Cash' }).error, /at least one month/);
  assert.match(call('payments.record', { studentId: 'STU001', months: ['July 2026'], amount: 100, method: 'Cash' }).error, /already fully paid/);
});

test('payments: a month before the fee start month is added to the previous balance', () => {
  const { ok } = setup();
  // STU002 joined in November; paying an unrecorded September makes previous balance = 700
  const p = ok('payments.record', { studentId: 'STU002', months: ['September 2026'], amount: 700, method: 'Cash' }).payment;
  assert.equal(p.previousBalance, 700);
  assert.equal(p.currentFee, 700);
  assert.equal(p.remaining, 700, 'current month still due');
});

test('payments: void reverses the fee allocation; legacy screen payments get invoices too', () => {
  const { ok, call, env } = setup();
  const p = ok('payments.record', { studentId: 'STU002', months: [CUR], amount: 700, method: 'Cash' }).payment;
  assert.match(call('payments.void', { id: p.id }).error, /reason/);
  const v = ok('payments.void', { id: p.id, reason: 'Entered twice' });
  assert.equal(v.delta.payments[0].status, 'Void');
  assert.equal(v.replace.pending.find((x) => x.studentId === 'STU002').due, 700);
  assert.match(call('payments.void', { id: p.id, reason: 'again' }).error, /already void/);
  // legacy google.script.run screen
  const tok = env.ctx.loginUser('test-pass').token;
  const res = JSON.parse(JSON.stringify(env.ctx.collectFee(tok, { studentId: 'STU002', months: [CUR], paid: 300 })));
  assert.equal(res.success, true, res.message);
  assert.match(res.invoiceNo, /^RZA-\d{4}-0002$/);
  const b = ok('app.bootstrap', {});
  assert.equal(b.payments.find((x) => x.invoiceNo === res.invoiceNo).method, 'Not recorded');
});

test('students: new fields, validation, capacity, archive/restore, delete only without history', () => {
  const { ok, call } = setup();
  const b = ok('app.bootstrap', {});
  const guitar = b.courses.find((c) => c.name === 'Guitar');
  const batch = ok('batches.save', { name: 'Guitar Sat 5pm', courseId: guitar.id, days: 'Sat', startTime: '17:00', endTime: '18:00', capacity: 1 }).item;
  assert.match(call('students.save', { name: 'X', phone: '9000000099', fee: 500, email: 'bad' }).error, /Email/);
  assert.match(call('students.save', { name: 'X', phone: '9000000099', fee: 500, whatsapp: '123' }).error, /WhatsApp/);
  const s = ok('students.save', { name: 'Neel New', phone: '+91 90000 00099', whatsapp: '9000000098', email: 'Neel@Example.com', address: 'Kolkata', courseId: guitar.id, batchId: batch.id, fee: 650, photo: 'data:image/jpeg;base64,AAAA' }).student;
  assert.equal(s.id, 'STU010');
  assert.equal(s.instrument, 'Guitar');
  assert.equal(s.batch, 'Guitar Sat 5pm');
  assert.equal(s.email, 'neel@example.com');
  assert.equal(s.joinDate, TODAY);
  assert.match(call('students.save', { name: 'Other', phone: '9000000097', fee: 650, courseId: guitar.id, batchId: batch.id }).error, /full/);
  assert.match(call('students.save', { name: 'Other', phone: '9000000097', fee: 650, photo: 'javascript:alert(1)' }).error, /JPEG/);
  const ed = ok('students.save', { id: s.id, name: 'Neel New', phone: '9000000099', fee: 700, courseId: guitar.id, batchId: batch.id, status: 'Active' }).student;
  assert.equal(ed.fee, 700);
  assert.equal(ed.joinDate, TODAY, 'join date kept');
  assert.equal(ed.photo, 'data:image/jpeg;base64,AAAA', 'photo kept when not sent');
  assert.equal(ok('students.archive', { id: s.id }).delta.students[0].status, 'Inactive');
  assert.equal(ok('students.archive', { id: s.id, restore: true }).delta.students[0].status, 'Active');
  assert.match(call('students.delete', { id: 'STU001' }).error, /history/);
  assert.deepEqual(ok('students.delete', { id: s.id }).removed.students, [s.id]);
});

test('courses, batches, teachers: CRUD and in-use protection', () => {
  const { ok, call } = setup();
  const t = ok('teachers.save', { name: 'Teacher One', phone: '9000000201', courseIds: 'CRS001,CRS999' }).item;
  assert.equal(t.courseIds, 'CRS001', 'unknown course ids dropped');
  const c = ok('courses.save', { name: 'Drums', fee: 800 }).item;
  assert.match(call('courses.save', { name: 'drums', fee: 1 }).error, /already exists/);
  assert.match(call('batches.save', { name: 'B', courseId: c.id, startTime: '18:00', endTime: '17:00' }).error, /after start/);
  const b = ok('batches.save', { name: 'Drums Sun', courseId: c.id, teacherId: t.id, days: 'Sun,Wed,xyz', startTime: '9:00', endTime: '10:30', location: 'Room 1', capacity: 5 }).item;
  assert.equal(b.days, 'Sun,Wed');
  assert.equal(b.startTime, '09:00');
  assert.match(call('courses.delete', { id: c.id }).error, /batch/);
  assert.match(call('teachers.delete', { id: t.id }).error, /batch/);
  const asg = ok('batches.assign', { batchId: b.id, studentIds: ['STU001', 'STU005'] });
  assert.equal(asg.delta.students.length, 2);
  assert.equal(asg.delta.students[0].courseId, c.id);
  assert.match(call('batches.delete', { id: b.id }).error, /student/);
  // renaming a course updates the Instrument text of its students
  const ren = ok('courses.save', { id: c.id, name: 'Drums & Percussion', fee: 800 });
  assert.equal(ren.delta.students.length, 2);
  assert.equal(ren.delta.students[0].instrument, 'Drums & Percussion');
});

test('classes: one-off and batch overrides, validation, no double entry per batch/date', () => {
  const { ok, call } = setup();
  const b0 = ok('app.bootstrap', {});
  const batch = ok('batches.save', { name: 'Vocal Sat', courseId: b0.courses[0].id, days: 'Sat', startTime: '16:00', endTime: '17:00' }).item;
  const cancel = ok('classes.save', { date: '2026-11-21', batchId: batch.id, startTime: '16:00', status: 'Cancelled', notes: 'Holiday' }).item;
  assert.equal(cancel.courseId, batch.courseId);
  assert.match(call('classes.save', { date: '2026-11-21', batchId: batch.id, startTime: '16:00' }).error, /already has an entry/);
  assert.match(call('classes.save', { date: '2026-11-22', startTime: '10:00' }).error, /title/);
  const w = ok('classes.save', { date: '2026-11-22', startTime: '10:00', endTime: '12:00', title: 'Workshop' }).item;
  assert.equal(ok('classes.delete', { id: w.id }).removed.classes[0], w.id);
});

test('attendance: Present/Absent/Leave, one row per student per date, batch recorded', () => {
  const { ok, call, env } = setup();
  const r = ok('attendance.save', { date: TODAY, records: [{ studentId: 'STU001', status: 'Present' }, { studentId: 'STU002', status: 'Leave' }, { studentId: 'STU005', status: 'Absent' }, { studentId: 'STU005', status: 'Present' }, { studentId: 'X', status: 'Present' }] });
  assert.deepEqual(r.counts, { Present: 1, Absent: 1, Leave: 1 });
  ok('attendance.save', { date: TODAY, records: [{ studentId: 'STU002', status: 'Present' }] });
  const rows = ok('app.bootstrap', {}).attendance.filter((a) => a.date === TODAY);
  assert.equal(rows.length, 3, 'no duplicate rows');
  assert.equal(rows.find((a) => a.studentId === 'STU002').status, 'Present');
  assert.equal(rows[0].markedBy, 'admin');
  assert.match(call('attendance.save', { date: '2099-01-01', records: [{ studentId: 'STU001', status: 'Present' }] }).error, /future/);
  assert.match(call('attendance.save', { date: TODAY, records: [{ studentId: 'STU001', status: 'Late' }] }).error, /at least one/);
  assert.equal(env.calendarEvents.length, 2);
});

test('roles: staff can record payments but not see expenses, change settings or void', () => {
  const { ok, env } = setup();
  ok('users.save', { username: 'desk', name: 'Front Desk', role: 'Staff', password: 'deskpass1' });
  const st = env.api('auth.login', { username: 'desk', password: 'deskpass1' });
  assert.equal(st.ok, true, st.error);
  const call = (a, d) => env.api(a, d, st.data.token);
  const b = call('app.bootstrap', {});
  assert.equal(b.ok, true);
  assert.deepEqual(b.data.expenses, []);
  assert.deepEqual(b.data.users, []);
  assert.equal(call('expenses.save', { date: TODAY, category: 'Rent', amount: 10 }).code, 'FORBIDDEN');
  assert.equal(call('settings.save', { settings: { academyName: 'X' } }).code, 'FORBIDDEN');
  const p = call('payments.record', { studentId: 'STU002', months: [CUR], amount: 100, method: 'Cash' });
  assert.equal(p.ok, true, p.error);
  assert.equal(p.data.payment.recordedBy, 'desk');
  assert.equal(call('payments.void', { id: p.data.payment.id, reason: 'x' }).code, 'FORBIDDEN');
  // disabled users cannot log in
  ok('users.save', { username: 'desk', role: 'Staff', status: 'Disabled' });
  assert.equal(env.api('auth.login', { username: 'desk', password: 'deskpass1' }).ok, false);
});

test('users: password rules, change password, cannot remove own admin', () => {
  const { ok, call, env } = setup();
  assert.match(call('users.save', { username: 'ab', password: 'longenough' }).error, /Username/);
  assert.match(call('users.save', { username: 'abc', password: 'short' }).error, /8 characters/);
  assert.match(call('users.save', { username: 'admin', role: 'Staff' }).error, /own admin/);
  assert.match(call('auth.changePassword', { current: 'wrong', next: 'newpassword1' }).error, /Current password/);
  ok('auth.changePassword', { current: 'test-pass', next: 'newpassword1' });
  assert.equal(env.api('auth.login', { username: 'admin', password: 'test-pass' }).ok, false);
  assert.equal(env.api('auth.login', { username: 'admin', password: 'newpassword1' }).ok, true);
  // legacy screen master password follows the admin password
  assert.equal(env.ctx.loginUser('newpassword1').success, true);
  assert.equal(env.ctx.loginUser('test-pass').success, false);
});

test('expenses, reminders, settings, backup, audit and error logs', () => {
  const { ok, call, env } = setup();
  assert.match(call('expenses.save', { date: TODAY, category: 'Rent', amount: 0 }).error, /amount/);
  const e = ok('expenses.save', { date: TODAY, category: 'Rent', description: 'Studio rent', amount: 5000, method: 'Bank Transfer' }).item;
  assert.equal(e.id, 'EXP001');
  const rem = ok('reminders.log', { studentId: 'STU002', amount: 700, months: CUR, message: 'Hello' }).delta.reminders[0];
  assert.equal(rem.status, 'WhatsApp opened');
  assert.equal(rem.phone, '9000000002');
  assert.match(call('settings.save', { settings: { feeDueDay: '40' } }).error, /between 1 and 28/);
  assert.match(call('settings.save', { settings: { logo: 'data:text/html;base64,AAAA' } }).error, /PNG/);
  const s = ok('settings.save', { settings: { academyName: 'Rhythm Zone Academy', invoicePrefix: 'RZ', phone: '9000000000', invoiceSeq: '999' } });
  assert.equal(s.settings.invoicePrefix, 'RZ');
  const p = ok('payments.record', { studentId: 'STU002', months: [CUR], amount: 700, method: 'Cash' }).payment;
  assert.equal(p.invoiceNo, `RZ-${now.getFullYear()}-0001`, 'invoiceSeq cannot be set from the app');
  const bk = ok('system.backup', {});
  assert.match(bk.name, /RZAMS backup/);
  const auditActions = env.sheets['AuditLog'].rows.slice(1).map((r) => r[2]);
  for (const a of ['system.setup', 'expenses.create', 'settings.save', 'payments.record', 'system.backup']) assert.ok(auditActions.includes(a), a);
  // unexpected errors are logged, expected validation errors are not
  const before = (env.sheets['ErrorLog'] || { rows: [] }).rows.length;
  call('expenses.save', { date: TODAY, category: 'Rent', amount: 0 });
  assert.equal((env.sheets['ErrorLog'] || { rows: [] }).rows.length, before);
});

test('studio and tasks through the API keep working on the old tabs', () => {
  const { ok, call } = setup();
  const s1 = ok('studio.save', { item: { clientName: 'Band X', phone: '9000000301', projectName: 'EP', total: 9000, advance: 3000, status: 'Ongoing' } });
  const row = s1.replace.studio.find((x) => x.clientName === 'Band X');
  assert.equal(row.due, 6000);
  assert.match(call('studio.delete', { row: row.row, expected: 'Someone' }).error, /changed/);
  ok('studio.delete', { row: row.row, expected: 'Band X' });
  const t = ok('tasks.save', { task: 'Tune guitars', priority: 'High' }).replace.tasks[0];
  const done = ok('tasks.save', { row: t.row, expected: 'Tune guitars', task: 'Tune guitars', priority: 'High', status: 'Completed' }).replace.tasks[0];
  assert.equal(done.status, 'Completed');
});
