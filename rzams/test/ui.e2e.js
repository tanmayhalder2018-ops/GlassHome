// End-to-end UI test: real Dashboard/Style/Script in Chromium, google.script.run
// wired to Code.gs running on the in-memory sheet mock.
// Run: TZ=Asia/Kolkata node rzams/test/ui.e2e.js [screenshotDir]
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium, devices } = require('playwright');
const { loadBackend, seed } = require('./gas-mock');

const SRC = path.join(__dirname, '..', 'src');
const SHOTS = process.argv[2] || null;
const html = fs.readFileSync(path.join(SRC, 'Dashboard.html'), 'utf8')
  .replace("<?!= include('Style'); ?>", fs.readFileSync(path.join(SRC, 'Style.html'), 'utf8'))
  .replace("<?!= include('Script'); ?>", fs.readFileSync(path.join(SRC, 'Script.html'), 'utf8'));
assert.ok(!/<\?/.test(html), 'all template tags resolved');

const SHIM = `window.google = { script: { get run() {
  var ok = function(){}, bad = function(){};
  var p = new Proxy({}, { get: function(_, name) {
    if (name === 'withSuccessHandler') return function(f){ ok = f; return p; };
    if (name === 'withFailureHandler') return function(f){ bad = f; return p; };
    return function(){ var args = Array.prototype.slice.call(arguments);
      window.__gas(name, JSON.stringify(args)).then(function(r){ r = JSON.parse(r); setTimeout(function(){ r.error ? bad(new Error(r.error)) : ok(r.value); }, 30); }); };
  }}); return p; } } };`;

async function run(label, contextOpts) {
  const env = loadBackend();
  seed(env);
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...contextOpts, acceptDownloads: true });
  await context.exposeFunction('__gas', (name, argsJson) => {
    try {
      if (typeof env.ctx[name] !== 'function' || /_$/.test(name)) throw new Error('Script function not found: ' + name);
      const v = env.ctx[name](...JSON.parse(argsJson));
      return JSON.stringify({ value: v === undefined ? null : v });
    } catch (e) { return JSON.stringify({ error: e.message }); }
  });
  await context.addInitScript(SHIM);
  await context.route('**/*', (r) => (r.request().url().startsWith('http://rzams.test') ? r.fulfill({ contentType: 'text/html', body: html }) : /fonts\.(googleapis|gstatic)\.com/.test(r.request().url()) ? r.continue() : r.abort()));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const shot = async (n) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${label}-${n}.png`) }); };
  const idle = async () => { await page.waitForFunction(() => !document.getElementById('loadingOverlay').classList.contains('active')); await page.waitForTimeout(450); };
  const toastText = async () => (await page.locator('#toastContainer .toast').last().textContent()) || '';
  const noSideScroll = async (where) => { const o = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); assert.ok(o <= 1, `${label}: page scrolls sideways on ${where} (${o}px)`); };
  const nav = async (pg) => {
    if (await page.locator('#menuToggle').isVisible()) { await page.click('#menuToggle'); await page.waitForTimeout(350); }
    await page.click(`.nav-item[data-page="${pg}"]`); await idle();
  };
  const steps = [];
  const step = (s) => { steps.push(s); };

  await page.goto('http://rzams.test/');
  // 1. Login
  await page.fill('#loginPassword', 'wrong'); await page.click('#loginForm button'); await idle();
  assert.match(await toastText(), /Invalid password/);
  await page.fill('#loginPassword', 'test-pass'); await page.click('#loginForm button'); await idle();
  assert.equal(await page.locator('#pageTitle').textContent(), 'Dashboard');
  assert.equal(await page.locator('#statFeesDue').textContent(), '₹2,000');
  assert.match(await page.locator('#statFeesDueLabel').textContent(), /3 students/);
  assert.equal(await page.locator('#statActiveStudents').textContent(), '3');
  await noSideScroll('dashboard'); await shot('1-dashboard');
  step('login (wrong + right), dashboard shows real pending ₹2,000 for 3 students');

  // 2. Dashboard card -> pending fees
  await page.click('.stat-card[data-tab="due"]'); await idle();
  assert.equal(await page.locator('#pageTitle').textContent(), 'Fees');
  assert.equal(await page.locator('#feesTableBody tr').count(), 4);
  assert.match(await page.locator('#feeSummary').textContent(), /4 unpaid month\(s\) · ₹2,000 pending/);
  await shot('2-pending');
  step('Fees Pending card opens the Pending tab (4 unpaid months)');

  // 3. Collect from a pending row: STU005 owes October (200) + November (600)
  await page.locator('#feesTableBody tr', { hasText: 'October 2026' }).locator('button').click();
  await page.waitForSelector('#feeMonthList .month-option'); await page.waitForTimeout(300);
  assert.equal(await page.locator('#feeMonthList input:checked').count(), 1, 'oldest unpaid month pre-ticked');
  assert.equal(await page.inputValue('#feePaid'), '200');
  await page.locator('#feeMonthList .month-option', { hasText: 'November 2026' }).locator('input').check();
  assert.equal(await page.inputValue('#feePaid'), '800');
  await page.fill('#feePaid', '1000');
  assert.match(await page.locator('#feeBreakdown').textContent(), /more than the ticked months/);
  await page.fill('#feePaid', '500');
  assert.match(await page.locator('#feeBreakdown').textContent(), /October 2026: ₹200 ✓ · November 2026: ₹300 \(₹300 left\)/);
  await shot('3-fee-modal');
  await page.click('#feeForm button[type=submit]'); await idle();
  assert.match(await toastText(), /Payment of ₹500 saved/);
  assert.match(await page.locator('#feeSummary').textContent(), /₹1,500 pending/);
  step('collect ₹500 split over October (₹200, paid) + November (₹300, ₹300 left); pending drops to ₹1,500');

  // 4. All records tab shows the history
  await page.click('#feeTabAll'); await page.fill('#feeSearchInput', 'STU005');
  const rows = await page.locator('#feesTableBody tr').allTextContents();
  assert.equal(rows.length, 2);
  assert.ok(rows.some((r) => /October 2026.*₹600.*₹600.*₹0/.test(r)));
  assert.ok(rows.some((r) => /November 2026.*₹600.*₹300.*₹300/.test(r)));
  await page.fill('#feeSearchInput', '');
  step('payment history for the student is correct in All records');

  // 5. Add student: validation, then success
  await nav('students');
  assert.equal(await page.locator('#pageTitle').textContent(), 'Students');
  await page.click('button:has-text("Add Student")');
  await page.fill('#studentName', 'Riya Test'); await page.fill('#studentPhone', '12345');
  await page.selectOption('#studentInstrument', 'Vocals'); await page.fill('#studentFee', '600');
  await page.click('#studentForm button[type=submit]'); await idle();
  assert.match(await toastText(), /10-digit/);
  assert.ok(await page.locator('#studentModal').evaluate((e) => e.classList.contains('active')), 'modal stays open on error');
  await page.fill('#studentPhone', '+91 98300 11111');
  await page.click('#studentForm button[type=submit]'); await idle();
  assert.match(await toastText(), /Student added \(STU010\)/);
  assert.equal(await page.locator('#studentsTableBody tr', { hasText: 'Riya Test' }).count(), 1);
  await noSideScroll('students'); await shot('4-students');
  step('add student: bad phone refused (form stays open), valid student saved as STU010');

  // 6. Edit student
  await page.locator('#studentsTableBody tr', { hasText: 'Riya Test' }).locator('button[title=Edit]').click();
  await page.fill('#studentFee', '650'); await page.click('#studentForm button[type=submit]'); await idle();
  assert.match(await page.locator('#studentsTableBody tr', { hasText: 'Riya Test' }).textContent(), /₹650/);
  step('edit student fee 600 -> 650');

  // 7. Archive student
  await page.locator('#studentsTableBody tr', { hasText: 'Bikram Test' }).locator('button[title=Archive]').click();
  await page.click('#confirmYesBtn'); await idle();
  assert.match(await toastText(), /archived/);
  assert.equal(await page.locator('#studentsTableBody tr', { hasText: 'Bikram Test' }).count(), 0);
  await page.selectOption('#studentStatusFilter', 'Inactive');
  assert.equal(await page.locator('#studentsTableBody tr', { hasText: 'Bikram Test' }).count(), 1);
  await page.selectOption('#studentStatusFilter', 'Active');
  step('archive student: hidden from Active list, visible under Archived');

  // 8. Attendance
  await nav('attendance');
  await page.locator('#attendanceTableBody tr', { hasText: 'Asha Test' }).locator('select').selectOption('Absent');
  await page.click('button:has-text("Mark rest Present")');
  assert.match(await page.locator('#attendanceSummary').textContent(), /2 present · 1 absent · 0 not marked/);
  await page.click('#page-attendance button:has-text("Save")'); await idle();
  assert.match(await toastText(), /Attendance saved: 2 present, 1 absent/);
  await shot('5-attendance');
  step('attendance: mark one Absent + "Mark rest Present", save');

  // 9. Refresh the page: still logged in, everything persisted
  await page.reload(); await idle();
  assert.equal(await page.locator('#appShell').evaluate((e) => e.style.display), 'block');
  assert.equal(await page.locator('#statAttendanceToday').textContent(), '2');
  assert.equal(await page.locator('#statFeesDue').textContent(), '₹1,450'); // 2000 - 500 paid + 650 new student - 700 archived student
  await nav('attendance');
  assert.match(await page.locator('#attendanceSummary').textContent(), /2 present · 1 absent/);
  step('refresh: session kept; attendance and fees persisted; dashboard updated');

  // 10. Reports + CSV
  await nav('reports');
  await page.click('[data-report=pending]'); await idle();
  assert.ok((await page.locator('#reportResultBody tr').count()) >= 3);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Export CSV")')]);
  const csv = fs.readFileSync(await dl.path(), 'utf8');
  assert.match(csv, /"ID","Name","Phone","Month"/);
  assert.match(dl.suggestedFilename(), /^RZAMS_pending_\d{4}-\d{2}-\d{2}\.csv$/);
  await page.click('[data-report=student]'); await idle();
  assert.equal(await page.locator('#reportResultBody tr').count(), 5);
  await noSideScroll('reports'); await shot('6-reports');
  step('reports: pending + students load, CSV export downloads');

  // 11. Logout
  if (await page.locator('#menuToggle').isVisible()) { await page.click('#menuToggle'); await page.waitForTimeout(350); }
  await page.click('#logoutBtn');
  await page.reload(); await page.waitForTimeout(300);
  assert.ok(await page.locator('#loginScreen').evaluate((e) => e.classList.contains('active')));
  step('lock session logs out and survives refresh');

  assert.deepEqual(errors, [], 'no JavaScript errors');
  await browser.close();
  return steps;
}

(async () => {
  for (const [label, opts] of [['desktop', { viewport: { width: 1280, height: 800 } }], ['android', devices['Pixel 7']]]) {
    const steps = await run(label, opts);
    console.log(`\n${label}: ${steps.length} workflows passed`);
    steps.forEach((s) => console.log('  ✓ ' + s));
  }
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
