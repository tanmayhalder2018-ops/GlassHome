// End-to-end test of the RZAMS Pro admin app (rzams/web/dist) against the real Api.gs
// running on the in-memory Sheets mock. Build first: (cd rzams/web && npm run build)
// Run: TZ=Asia/Kolkata node rzams/test/web.e2e.js [screenshotDir]
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium, devices } = require('playwright');
const { loadBackend, seed } = require('./gas-mock');

const DIST = path.join(__dirname, '..', 'web', 'dist');
const SHOTS = process.argv[2] || null;
const MIME = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.ttf': 'font/ttf', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain' };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const now = new Date();
const CUR = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;

async function run(label, ctxOpts) {
  const env = loadBackend();
  seed(env);
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...ctxOpts, acceptDownloads: true });
  await context.exposeFunction('__gasApi', (body) => { const b = JSON.parse(body); return JSON.stringify(env.api(b.action, b.data, b.token)); });
  await context.addInitScript(() => {
    window.__RZAMS_TRANSPORT__ = (body) => window.__gasApi(JSON.stringify(body)).then((t) => new Promise((r) => setTimeout(() => r(JSON.parse(t)), 40)));
    window.__opened = []; window.open = (u) => { window.__opened.push(String(u)); return null; };
  });
  await context.route('**/*', (route) => {
    const u = new URL(route.request().url());
    if (u.host === 'rzams.test') {
      let f = path.join(DIST, decodeURIComponent(u.pathname));
      if (!f.startsWith(DIST) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, 'index.html');
      return route.fulfill({ body: fs.readFileSync(f), contentType: MIME[path.extname(f)] || 'application/octet-stream' });
    }
    if (/fonts\.(googleapis|gstatic)\.com/.test(u.host)) return route.continue();
    return route.abort();
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  const steps = [];
  const step = (s) => steps.push(s);
  const shot = async (n) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `web-${label}-${n}.png`), fullPage: false }); };
  const toast = async (re) => { try { await page.waitForFunction((src) => [...document.querySelectorAll('.toast-text')].some((e) => new RegExp(src).test(e.textContent)), re.source, { timeout: 8000 }); } catch (e) { const t = await page.locator('.toast-text').allTextContents(); const errs = await page.locator('[role=dialog] [role=alert]').allTextContents(); throw new Error(`Expected toast ${re} but saw toasts=${JSON.stringify(t)} dialogErrors=${JSON.stringify(errs)}`); } };
  const noSideScroll = async (where) => { const o = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); assert.ok(o <= 1, `${label}: page scrolls sideways on ${where} (${o}px)`); };
  const mobile = (ctxOpts.viewport?.width || 1280) < 1024;
  const go = async (name) => {
    if (mobile) { await page.getByRole('button', { name: 'Open menu' }).click(); }
    await page.locator('nav a', { hasText: new RegExp(`^${name}$`) }).last().click();
    await page.waitForLoadState('networkidle');
  };
  const modal = () => page.locator('[role=dialog]').last();

  await page.goto('http://rzams.test/');
  // ---- login
  await page.getByLabel('Password').fill('nope');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByText('Wrong username or password').waitFor();
  await page.getByLabel('Password').fill('test-pass');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByText('Finish the one-time setup').waitFor();
  await noSideScroll('dashboard');
  step('login: wrong password refused; first login creates the admin user');

  // ---- one-time setup
  await page.getByRole('button', { name: 'Open setup' }).click();
  await page.getByText('Existing payments to import').waitFor();
  assert.match(await page.locator('main').textContent(), /Existing payments to import: 5/);
  await page.getByTestId('run-setup').click();
  await page.getByTestId('confirm-yes').click();
  await toast(/Setup done: 5 courses, 4 students linked, 5 payments imported/);
  assert.equal(env.backups.length, 1, 'backup made before setup');
  step('settings → data: preview, backup, setup (5 courses, 4 students linked, 5 legacy payments)');

  // ---- dashboard figures
  await go('Dashboard');
  const kpis = await page.getByTestId('kpis').textContent();
  assert.match(kpis, /Total students4/);
  assert.match(kpis, /Outstanding dues₹2,000/);
  assert.match(kpis, /Total fees collected₹2,950/);
  await shot('1-dashboard');
  step('dashboard: totals, ₹2,000 outstanding, ₹2,950 collected (imported) come from the database');

  // ---- add student (validation then success)
  await go('Students');
  await page.getByTestId('add-student').click();
  await page.getByTestId('st-name').fill('Riya Sen');
  await page.getByTestId('st-phone').fill('12345');
  await page.getByTestId('st-course').selectOption({ label: 'Guitar' });
  await page.getByTestId('save-student').click();
  await modal().getByText('Enter a valid 10-digit mobile number').waitFor();
  await page.getByTestId('st-phone').fill('+91 98300 11111');
  assert.equal(await page.getByTestId('st-fee').inputValue(), '700', 'fee defaults from the course');
  await page.getByTestId('save-student').click();
  await toast(/Student added · STU010/);
  await page.getByTestId('profile-name').waitFor();
  assert.equal(await page.getByTestId('profile-name').textContent(), 'Riya Sen');
  await shot('2-profile');
  step('add student: phone validated, course sets fee, saved as STU010, opens profile');

  // ---- edit student
  await page.getByTestId('profile-edit').click();
  await page.getByTestId('st-fee').fill('750');
  await page.getByTestId('st-billing').selectOption('Postpaid');
  await page.getByTestId('save-student').click();
  await toast(/Student updated/);
  assert.match(await page.locator('main').textContent(), /Monthly fee₹750/);
  assert.match(await page.locator('main').textContent(), /Fee billingPostpaid – pays after the month/);
  step('edit student: fee 700 → 750, billing set to Postpaid');

  // ---- record a split payment from the profile, invoice, WhatsApp
  await page.getByTestId('profile-pay').click();
  await page.getByTestId('pay-months').waitFor();
  await page.waitForFunction(() => document.querySelector('[data-testid=pay-amount]')?.value !== '', null, { timeout: 5000 });
  assert.equal(await page.getByTestId('pay-amount').inputValue(), '750', 'current fee pre-filled after the fee edit');
  await page.getByTestId('pay-amount').fill('500');
  await page.getByTestId('pay-method').selectOption('UPI');
  assert.match(await page.getByTestId('pay-preview').textContent(), /Previous balance₹0Current fee₹750Amount paid− ₹500Remaining balance₹250/);
  await page.getByTestId('save-payment').click();
  await toast(new RegExp(`Payment recorded · RZA-${now.getFullYear()}-0001`));
  await modal().getByText(`Invoice RZA-${now.getFullYear()}-0001`).waitFor();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('inv-download').click()]);
  const pdf = fs.readFileSync(await dl.path());
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  assert.ok(pdf.length > 20000, 'PDF has embedded font + logo');
  if (SHOTS) fs.copyFileSync(await dl.path(), path.join(SHOTS, `invoice-${label}.pdf`));
  await page.getByTestId('inv-wa').click();
  await page.getByTestId('inv-status').first().waitFor();
  const opened = await page.evaluate(() => window.__opened.slice(-1)[0]);
  assert.match(opened, /^https:\/\/wa\.me\/919830011111\?text=/);
  assert.match(decodeURIComponent(opened), new RegExp(`Invoice No: RZA-${now.getFullYear()}-0001`));
  assert.match(decodeURIComponent(opened), /Remaining Due: ₹250/);
  assert.match(await page.getByTestId('inv-status').first().textContent(), /Press Send in WhatsApp/);
  await shot('3-invoice');
  await page.keyboard.press('Escape');
  assert.equal(env.sheets['Payments'].rows.filter((r) => r[2] === 'STU010').length, 1);
  step('payment: ₹500 of ₹750 by UPI, preview = 0 + 750 − 500 = 250, invoice RZA-…-0001, PDF downloaded, WhatsApp opened to +91 98300 11111 with honest status');

  // ---- payments, invoices pages
  await go('Payments');
  assert.match(await page.getByTestId('payments-table').textContent(), new RegExp(`RZA-${now.getFullYear()}-0001`));
  await page.getByRole('tab', { name: /Outstanding dues/ }).click();
  assert.match(await page.getByTestId('dues-table').textContent(), /Riya Sen.*₹250/);
  await go('Invoices');
  await page.getByTestId('invoices-table').locator('tr', { hasText: 'Riya Sen' }).click();
  await modal().getByText('Download PDF').waitFor();
  await page.keyboard.press('Escape');
  step('payment history, outstanding dues and invoice reprint all show the new payment');

  // ---- courses & batches
  await go('Courses & Batches');
  await page.getByRole('tab', { name: /Batches/ }).click();
  await page.getByRole('button', { name: 'New batch' }).first().click();
  await modal().getByLabel('Batch name').fill('Guitar Weekdays');
  await modal().getByLabel('Course').selectOption({ label: 'Guitar' });
  for (const day of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']) await modal().getByRole('button', { name: day, exact: true }).click();
  await modal().getByLabel('Start time').fill('17:00');
  await modal().getByLabel('End time').fill('18:00');
  await modal().getByLabel('Capacity').fill('3');
  await modal().getByRole('button', { name: 'Save batch' }).click();
  await toast(/Batch created/);
  await page.getByRole('button', { name: 'Add students' }).first().click();
  await modal().locator('li', { hasText: 'Riya Sen' }).locator('input').check();
  await modal().getByRole('button', { name: /^Add 1$/ }).click();
  await toast(/1 student\(s\) added to Guitar Weekdays/);
  assert.match(await page.locator('main').textContent(), /1 \/ 3/);
  step('courses & batches: batch every day 5–6 PM, capacity 3, student assigned (1/3)');

  // ---- schedule
  await go('Class Schedule');
  await page.getByRole('button', { name: 'Day', exact: true }).click();
  await page.getByTestId('occ').first().click();
  await modal().getByLabel('Status').selectOption('Cancelled');
  await modal().getByRole('button', { name: 'Save' }).click();
  await toast(/Schedule updated/);
  assert.match(await page.getByTestId('occ').first().textContent(), /Cancelled/);
  step('schedule: today’s Guitar Weekdays class shown and cancelled for this date only');

  // ---- attendance
  await go('Attendance');
  await page.getByTestId('att-row').filter({ hasText: 'Asha Test' }).getByRole('radio', { name: 'Absent' }).click();
  await page.getByTestId('att-row').filter({ hasText: 'Dipa Test' }).getByRole('radio', { name: 'Leave' }).click();
  await page.getByTestId('att-rest').click();
  assert.match(await page.getByTestId('att-summary').textContent(), /2 present1 absent1 leave0 not marked/);
  await page.getByTestId('att-save').click();
  await toast(/Saved · 2 present, 1 absent, 1 leave/);
  step('attendance: Absent + Leave + “mark rest present”, saved (2/1/1)');

  // ---- refresh: data persists, session kept
  await page.reload();
  await page.getByTestId('att-summary').waitFor();
  assert.match(await page.getByTestId('att-summary').textContent(), /2 present1 absent1 leave/);
  step('refresh: still logged in, attendance reloaded from the database');

  // ---- reminders
  await go('Reminders');
  await page.getByRole('tab', { name: /All dues/ }).click();
  await page.getByTestId('remind-btn').first().click();
  await page.getByTestId('rem-send').click();
  await page.getByTestId('rem-status').waitFor();
  assert.match(await page.getByTestId('rem-status').textContent(), /only sent when you press Send/);
  assert.match(await page.evaluate(() => window.__opened.slice(-1)[0]), /^https:\/\/wa\.me\/91\d{10}\?text=Hello/);
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: /Reminder history/ }).click();
  assert.match(await page.locator('main table').textContent(), /WhatsApp opened/);
  step('reminders: WhatsApp reminder opened with template, logged in history as "WhatsApp opened" (not "sent")');

  // ---- teachers, expenses
  await go('Teachers');
  await page.getByRole('button', { name: 'Add teacher' }).first().click();
  await modal().getByLabel('Name').fill('Arjun Das');
  await modal().getByLabel('Phone', { exact: true }).fill('9000000501');
  await modal().getByRole('button', { name: 'Save' }).click();
  await toast(/Teacher added/);
  await go('Expenses');
  await page.getByRole('button', { name: 'Add expense' }).click();
  await modal().getByLabel('Amount (₹)').fill('300');
  await modal().getByLabel('Description').fill('Guitar strings');
  await modal().getByRole('button', { name: 'Save' }).click();
  await toast(/Expense added/);
  assert.match(await page.locator('main').textContent(), /Net collection₹200/);
  step('teachers: added; expenses: ₹300 added, net collection this month = ₹500 − ₹300 = ₹200');

  // ---- reports
  await go('Reports');
  assert.match(await page.getByTestId('report-table').textContent(), /Riya Sen \(STU010\)/);
  const [csv] = await Promise.all([page.waitForEvent('download'), page.getByTestId('rep-csv').click()]);
  assert.match(fs.readFileSync(await csv.path(), 'utf8'), /"Date","Invoice","Student"/);
  await page.getByRole('button', { name: 'Outstanding dues' }).click();
  assert.match(await page.getByTestId('report-table').textContent(), /Total4 students/);
  await noSideScroll('reports');
  step('reports: payments report + CSV export, outstanding dues report');

  // ---- clean-up of old / duplicate fee records
  await go('Settings');
  await page.getByRole('tab', { name: 'Data & backup' }).click();
  await page.getByTestId('cleanup-month').fill('October 2026');
  await page.getByTestId('cleanup-preview').click();
  await page.getByTestId('cleanup-summary').waitFor();
  assert.match(await page.getByTestId('cleanup-summary').textContent(), /Before October 2026: 4 fee row\(s\).*and 4 payment\(s\)/);
  const backupsBefore = env.backups.length;
  await page.getByTestId('cleanup-run').click();
  await modal().getByLabel('Type "DELETE" to confirm').fill('DELETE');
  await page.getByTestId('confirm-yes').click();
  await page.getByTestId('cleanup-done').waitFor();
  assert.match(await page.getByTestId('cleanup-done').textContent(), /Deleted 4 fee row\(s\) and 4 payment\(s\)/);
  assert.equal(env.backups.length, backupsBefore + 1, 'backup before deleting');
  assert.ok(!env.sheets['Fees'].rows.slice(1).some((r) => /July|August|^September $/.test(String(r[2]))), 'old months gone');
  step('clean-up: preview → type DELETE → backup → 4 old fee rows and 4 old payments removed');

  // ---- settings, users, staff role
  await go('Settings');
  await page.getByLabel('Contact number').fill('9876543210');
  await page.getByTestId('save-settings').click();
  await toast(/Settings saved/);
  await page.getByRole('tab', { name: 'Users' }).click();
  await page.getByRole('button', { name: 'Add user' }).click();
  await modal().getByLabel('Username').fill('desk');
  await modal().getByLabel('Full name').fill('Front Desk');
  await modal().getByLabel('Password').fill('deskpass1');
  await modal().getByRole('button', { name: 'Save' }).click();
  await toast(/User saved/);
  await page.getByRole('button', { name: 'Log out' }).click();
  await page.getByLabel('Username').fill('desk');
  await page.getByLabel('Password').fill('deskpass1');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('button', { name: 'Log out' }).waitFor();
  await go('Dashboard');
  await page.getByTestId('kpis').waitFor();
  if (mobile) await page.getByRole('button', { name: 'Open menu' }).click();
  assert.equal(await page.locator('nav a', { hasText: /^Expenses$/ }).count(), 0, 'staff cannot see Expenses');
  if (mobile) await page.getByRole('button', { name: 'Close menu' }).click();
  step('settings saved; staff user created; staff login has no Expenses or admin settings');

  // ---- phone menu: page behind it must not scroll
  if (mobile) {
    await go('Dashboard');
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(100);
    const y0 = await page.evaluate(() => window.scrollY);
    await page.getByRole('button', { name: 'Open menu' }).click();
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).position), 'fixed', 'page locked while menu open');
    const box = await page.locator('aside nav').last().boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => document.body.style.top), `-${y0}px`, 'page did not move behind the menu');
    await page.getByRole('button', { name: 'Close menu' }).click();
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => window.scrollY), y0, 'scroll position restored after closing');
    step('phone menu: scrolling the menu does not scroll the page; position restored on close');
  }

  // ---- dark theme + mobile overflow checks
  await page.getByRole('button', { name: 'Dark theme' }).click();
  await page.waitForTimeout(400); // let colour transitions finish
  await shot('4-dark');
  for (const p of ['Students', 'Payments', 'Attendance', 'Class Schedule', 'Reports']) { await go(p); await noSideScroll(p); }
  if (mobile) { await go('Students'); await shot('5-students'); await page.getByTestId('students-cards').waitFor({ timeout: 5000 }); }
  step(`dark theme; no sideways scrolling on any page${mobile ? '; student list uses cards on phones' : ''}`);

  assert.deepEqual(errors, [], 'no JavaScript errors');
  await browser.close();
  return steps;
}

(async () => {
  for (const [label, opts] of [['desktop', { viewport: { width: 1366, height: 860 } }], ['android', devices['Pixel 7']]]) {
    const steps = await run(label, opts);
    console.log(`\n${label}: ${steps.length} workflows passed`);
    steps.forEach((s) => console.log('  ✓ ' + s));
  }
})().catch((e) => { console.error('FAIL:', e.stack || e.message); process.exit(1); });
