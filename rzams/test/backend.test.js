// Run: TZ=Asia/Kolkata node --test rzams/test/backend.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadBackend, seed, isDate } = require('./gas-mock');

function setup() {
  const env = loadBackend();
  seed(env);
  const tok = env.ctx.loginUser('test-pass').token;
  // vm-context objects have a foreign prototype; normalise for deepEqual
  const call = (fn, ...a) => JSON.parse(JSON.stringify(env.ctx[fn](tok, ...a)));
  return { env, tok, call, ctx: env.ctx };
}
const CUR = (() => { const d = new Date(); return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][d.getMonth()] + ' ' + d.getFullYear(); })();
const NEXT = (() => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + 1); return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][d.getMonth()] + ' ' + d.getFullYear(); })();
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

test('current month is November 2026 (tests assume FEE_START_MONTH = current month)', () => {
  assert.equal(CUR, 'November 2026');
});

test('login: password comes from Script Properties; missing password is reported', () => {
  const env = loadBackend({});
  const r = env.ctx.loginUser('old-hardcoded-password');
  assert.equal(r.success, false);
  assert.match(r.message, /APP_PASSWORD/);
});

test('login: wrong password 5 times locks login, even for the right password', () => {
  const { ctx } = setup();
  for (let i = 0; i < 5; i++) assert.equal(ctx.loginUser('nope').success, false);
  const r = ctx.loginUser('test-pass');
  assert.equal(r.success, false);
  assert.match(r.message, /Too many/);
});

test('auth: data functions reject missing or bad tokens', () => {
  const { ctx } = setup();
  assert.throws(() => ctx.getStudents(null), /SESSION_EXPIRED/);
  assert.throws(() => ctx.getPendingFees('bad'), /SESSION_EXPIRED/);
  assert.throws(() => ctx.collectFee('', { studentId: 'STU001', months: [CUR], paid: 1 }), /SESSION_EXPIRED/);
});

test('fees: months are normalised (text, date cells, unknown kept as-is)', () => {
  const { call } = setup();
  const months = call('getFeesRecords').map((f) => f.Month).sort();
  assert.deepEqual(months, ['August 2026', 'July 2026', 'July 2026', 'October 2026', 'September']);
});

test('pending: every active student owes the current month; old balances kept; archived ignored', () => {
  const { call } = setup();
  const p = call('getPendingFees').map((x) => `${x.studentId}|${x.month}|${x.due}`).sort();
  assert.deepEqual(p, [
    `STU001|${CUR}|500`,
    `STU002|${CUR}|700`,
    'STU005|October 2026|200',
    `STU005|${CUR}|600`,
  ].sort());
  const d = call('getDashboardStats');
  assert.equal(d.feesDue, 2000);
  assert.equal(d.studentsWithDue, 3);
  assert.equal(d.activeStudents, 3);
  assert.equal(d.collectedThisMonth, 0);
});

test('collect: one payment split over two months, oldest first', () => {
  const { call, env } = setup();
  const r = call('collectFee', { studentId: 'STU005', months: [CUR, 'October 2026'], paid: 500 });
  assert.equal(r.success, true, r.message);
  const fees = call('getFeesRecords');
  const oct = fees.find((f) => f['Student ID'] === 'STU005' && f.Month === 'October 2026');
  const cur = fees.find((f) => f['Student ID'] === 'STU005' && f.Month === CUR);
  assert.deepEqual([oct.Amount, oct.Paid, oct.Due], [600, 600, 0]);
  assert.deepEqual([cur.Amount, cur.Paid, cur.Due], [600, 300, 300]);
  // new month stays text in the sheet (no auto-conversion to a date)
  const raw = env.sheets['Fees'].rows.find((r) => r[0] === 'STU005' && r[2] === CUR);
  assert.ok(raw && !isDate(raw[2]), 'month cell should be stored as text');
  assert.equal(call('getDashboardStats').feesDue, 1200 + 300);
});

test('collect: advance payment for current + next month', () => {
  const { call } = setup();
  const st = call('getStudentFeeStatus', 'STU001');
  assert.ok(st.months.some((m) => m.month === NEXT && m.advance));
  const r = call('collectFee', { studentId: 'STU001', months: [CUR, NEXT], paid: 1000 });
  assert.equal(r.success, true, r.message);
  assert.equal(call('getPendingFees').some((p) => p.studentId === 'STU001'), false);
});

test('collect: paying more than the ticked months is refused and nothing is written', () => {
  const { call, env } = setup();
  const before = env.sheets['Fees'].rows.length;
  const r = call('collectFee', { studentId: 'STU001', months: [CUR], paid: 1200 });
  assert.equal(r.success, false);
  assert.match(r.message, /more than/);
  assert.equal(env.sheets['Fees'].rows.length, before);
});

test('collect: topping up a partly-paid month keeps the original amount (old client form)', () => {
  const { call } = setup();
  assert.equal(call('collectFee', { studentId: 'STU002', months: [CUR], paid: 300 }).success, true);
  // what the old browser code sent: amount = remaining due, paid = remaining due
  const r = call('collectFee', { studentId: 'STU002', studentName: 'x', month: CUR, amount: 400, paid: 400 });
  assert.equal(r.success, true, r.message);
  const rec = call('getFeesRecords').filter((f) => f['Student ID'] === 'STU002');
  assert.equal(rec.length, 1, 'no duplicate month rows');
  assert.deepEqual([rec[0].Amount, rec[0].Paid, rec[0].Due], [700, 700, 0]);
});

test('collect: validation (no student, zero amount, bad month, already paid)', () => {
  const { call } = setup();
  assert.equal(call('collectFee', { studentId: 'STU999', months: [CUR], paid: 100 }).success, false);
  assert.equal(call('collectFee', { studentId: 'STU001', months: [CUR], paid: 0 }).success, false);
  assert.equal(call('collectFee', { studentId: 'STU001', months: ['Sept'], paid: 100 }).success, false);
  assert.equal(call('collectFee', { studentId: 'STU001', months: ['July 2026'], paid: 100 }).success, false); // fully paid
});

test('student status: no duplicate months and history included', () => {
  const { call } = setup();
  const st = call('getStudentFeeStatus', 'STU005');
  const labels = st.months.map((m) => m.month);
  assert.equal(new Set(labels).size, labels.length);
  assert.deepEqual(labels.slice(0, 2), ['October 2026', CUR]);
  assert.equal(st.history.length, 1);
});

test('students: add validates, normalises phone, blocks duplicates, never reuses old IDs', () => {
  const { call, env } = setup();
  assert.equal(call('addStudent', { name: '', phone: '9000000009', instrument: 'Vocals', fee: 500 }).success, false);
  assert.equal(call('addStudent', { name: 'New', phone: '12345', instrument: 'Vocals', fee: 500 }).success, false);
  assert.equal(call('addStudent', { name: 'New', phone: '9000000009', instrument: 'Vocals', fee: '' }).success, false);
  const r = call('addStudent', { name: 'New Kid', phone: '+91 90000 00009', instrument: 'Vocals', batch: ' Sunday ', fee: '550' });
  assert.equal(r.success, true, r.message);
  assert.equal(r.studentId, 'STU010', 'STU009 appears in Fees, so the next ID is STU010');
  const row = env.sheets['Students'].rows.find((x) => x[0] === 'STU010');
  assert.equal(String(row[2]), '9000000009');
  assert.equal(row[5], 'Sunday');
  assert.equal(call('addStudent', { name: 'new kid', phone: '9000000009', instrument: 'Vocals', fee: 550 }).success, false);
});

test('students: delete archives instead of removing; history stays', () => {
  const { call } = setup();
  const r = call('deleteStudent', 'STU001');
  assert.equal(r.success, true);
  const s = call('getStudents').find((x) => x['Student ID'] === 'STU001');
  assert.equal(s.Status, 'Inactive');
  assert.equal(call('getFeesRecords').filter((f) => f['Student ID'] === 'STU001').length, 2);
  assert.equal(call('getPendingFees').some((p) => p.studentId === 'STU001'), false);
});

test('students: update keeps join date; join date returned as yyyy-MM-dd', () => {
  const { call } = setup();
  assert.equal(call('updateStudent', 'STU002', { name: 'Bikram T', phone: '9000000002', instrument: 'Guitar', fee: 750, status: 'Active' }).success, true);
  const s = call('getStudents').find((x) => x['Student ID'] === 'STU002');
  assert.equal(s['Join Date'], '2026-11-05');
  assert.equal(s['Monthly Fee'], 750);
});

test('attendance: old records found by date; bad dates refused', () => {
  const { call, ctx, tok } = setup();
  const a = call('getAttendanceByDate', '2026-08-01');
  assert.equal(a.find((x) => x.id === 'STU001').status, 'Present');
  assert.equal(a.find((x) => x.id === 'STU005').status, 'Absent');
  assert.equal(a.some((x) => x.id === 'STU003'), false, 'archived students are not listed');
  assert.throws(() => ctx.getAttendanceByDate(tok, 'garbage'), /Invalid date/);
  assert.equal(call('saveAttendance', '2099-01-01', [{ id: 'STU001', status: 'Present' }]).success, false);
});

test('attendance: save, read back, update without duplicating, ignore junk', () => {
  const { call, env } = setup();
  const d = today();
  let r = call('saveAttendance', d, [{ id: 'STU001', status: 'Present' }, { id: 'STU002', status: 'Absent' }, { id: 'STU777', status: 'Present' }, { id: 'STU005', status: 'Maybe' }]);
  assert.equal(r.success, true, r.message);
  assert.equal(r.saved, 2);
  r = call('saveAttendance', d, [{ id: 'STU002', status: 'Present' }]);
  assert.equal(r.success, true);
  const a = call('getAttendanceByDate', d);
  assert.equal(a.find((x) => x.id === 'STU002').status, 'Present');
  assert.equal(env.sheets['Attendance'].rows.length, 1 + 2 + 2);
  assert.equal(call('getDashboardStats').attendanceToday, 2);
  assert.equal(env.calendarEvents.length, 2);
});

test('studio & tasks: row-based edits check the record is still the same', () => {
  const { call } = setup();
  assert.equal(call('deleteStudioClient', 2, 'Someone Else').success, false);
  assert.equal(call('deleteStudioClient', 1, null).success, false, 'header row can never be deleted');
  assert.equal(call('updateStudioClient', 3, { clientName: 'Studio Two', phone: '9000000102', projectName: 'Song B', total: 3000, advance: 4000 }, 'Studio Two').success, false, 'advance > total');
  assert.equal(call('deleteStudioClient', 2, 'Studio One').success, true);
  assert.equal(call('getStudioClients').length, 1);
  assert.equal(call('addTask', { task: '  ', priority: 'High' }).success, false);
  assert.equal(call('addTask', { task: 'Call parents', priority: 'Urgent!' }).success, true);
  const t = call('getTasks')[0];
  assert.equal(t.Priority, 'Medium');
  assert.equal(call('deleteTask', t._row, 'Something else').success, false);
  assert.equal(call('deleteTask', t._row, 'Call parents').success, true);
});

test('isoDate_ handles every format seen in sheets', () => {
  const { ctx } = setup();
  assert.equal(ctx.isoDate_('2026-11-05'), '2026-11-05');
  assert.equal(ctx.isoDate_('05/11/2026'), '2026-11-05'); // Indian day-first
  assert.equal(ctx.isoDate_(new Date(2026, 10, 5)), '2026-11-05');
  assert.equal(ctx.isoDate_('31/02/2026'), '');
  assert.equal(ctx.isoDate_('garbage'), '');
  assert.equal(ctx.monthIndex_('Sept 2026'), ctx.monthIndex_('September 2026'));
  assert.equal(ctx.monthIndex_('Nov 2026'), ctx.monthIndex_('2026-11'));
  assert.equal(ctx.monthIndex_('September '), -1);
});
