# RZAMS – Rhythm Zone Academy Management System

Google Apps Script web app backed by a Google Sheet. The files in `src/` are the
four files of the Apps Script project:

| File here | File in Apps Script | What it is |
|---|---|---|
| `src/Code.gs` | `Code.gs` | Server code (reads/writes the Sheet) |
| `src/Dashboard.html` | `Dashboard.html` | Page layout |
| `src/Style.html` | `Style.html` | Styles |
| `src/Script.html` | `Script.html` | Browser code |

No secrets are stored in these files. The login password lives in the Apps
Script project's **Script properties** (see below).

## Deploying a new version (keeps the same app link)

**Before every structural change: back up the Sheet.**
Open the Google Sheet → File → Make a copy → name it `RZAMS backup YYYY-MM-DD`.

1. Open the Apps Script project (from the Sheet: Extensions → Apps Script).
2. **Set the password (first time only, required for v2.1).**
   Project Settings (gear icon, left) → Script properties → Add script property:
   - Property: `APP_PASSWORD` Value: *your new password* (use a new one, at least 10 characters)
   - Optional: `FEE_START_MONTH` Value: `November 2026` (month from which pending fees are counted; this is already the default)
   - Click **Save script properties**.
3. For each of the four files: open it in the editor, select all (Ctrl+A), paste
   the new content from `src/`, and save (Ctrl+S).
4. Deploy → **Manage deployments** → select the existing web app deployment →
   pencil (Edit) → Version: **New version** → Deploy.
   *Do not use "New deployment"*: that creates a different link.
5. Open the app link, log in with the new password and check the dashboard.

### Rolling back
Deploy → Manage deployments → Edit → Version: pick the previous version → Deploy.
The Sheet layout is unchanged in v2.1, so rolling back is always safe.

## Testing locally

Requires Node 18+ and Playwright with Chromium.

```bash
TZ=Asia/Kolkata node --test rzams/test/backend.test.js   # server logic on an in-memory sheet
TZ=Asia/Kolkata node rzams/test/ui.e2e.js [shotsDir]     # full UI in Chromium, desktop + Android size
```

`test/gas-mock.js` imitates the Sheet (including Google Sheets turning typed
text such as `2026-11-05` or `November 2026` into dates) and the Apps Script
services. The sample data contains no real student information.

## Changelog

### v2.1 – Stage 1: data accuracy & safety
- **Pending fees are real now.** Every active student owes their monthly fee for
  each month from `FEE_START_MONTH` (or their join month) to the current month.
  Older recorded balances are still included. Dashboard shows *Fees Pending*
  (with number of students) and *Collected for <this month>*.
- **New Collect Fee form.** Pick the student, tick the months the payment
  covers (unpaid months are listed first, then up to 3 advance months), enter
  the amount and payment date. The amount fills the oldest month first, and a
  preview shows exactly how it is split. Paying more than the ticked months is
  refused instead of silently lost.
- **Bug fix:** topping up a partly-paid month used to overwrite that month's
  fee with the remaining amount (e.g. ₹700 fee, ₹300 paid, then ₹400 paid became
  "Amount ₹400, Paid ₹700, Due −₹300"). The original amount is now kept.
- **Months are stored as text** (`November 2026`), so Sheets can no longer turn
  them into dates, and old variants (`Nov 2026`, date cells) are read correctly.
- **Fees page:** *Pending* tab (with a Collect button per row) and a *Paid On*
  column. **Reports:** new *Pending* report; CSV opens correctly in Excel.
- **Delete student → Archive.** The student is marked Inactive and hidden from
  the active list; payment/attendance history stays linked. New IDs never reuse
  an ID that appears in Fees or Attendance.
- **Attendance:** *Mark rest Present* button, live present/absent count,
  future dates blocked, only real students and Present/Absent accepted, saved in
  one batch (faster).
- **Validation on the server:** names required, 10-digit phone (`+91`/`0`
  prefixes removed), fee must be a number, studio advance ≤ total, task text
  required. Forms stay open with the error message when something is wrong.
- **Security:** password moved to Script properties; login locked for 10 minutes
  after 5 wrong attempts; *Lock Session* now also ends the session on the
  server; values shown in tables are escaped; studio/task edits check the row
  still belongs to the same record before changing or deleting it.
- **Reliability:** all writes use a script lock, so two phones saving at the
  same moment cannot create duplicate rows.
- Page title now matches the open page; dashboard cards open their page.
