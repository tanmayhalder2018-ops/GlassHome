# RZAMS Pro – Rhythm Zone Academy Management System

Admin platform for **Rhythm Zone Academy** and its associated studio **T Music Lab**.

```
admin.tmusiclab.in  (React app on its own Netlify site)
        │  HTTPS POST, JSON  (text/plain, no CORS preflight)
        ▼
Google Apps Script web app  (Code.gs + Api.gs)  ──►  Google Sheet (the database)
        ▲
        └── legacy screen at the /exec link (Dashboard/Style/Script.html) keeps working
```

* The public website **tmusiclab.in is not touched** (separate Netlify site, manual uploads).
* The Google Sheet stays the database. Existing tabs keep their columns; new columns are only ever
  **appended at the end**, new tabs are created on first use, and no existing row is overwritten.
* No secrets live in this (public) repository. Passwords are stored as salted hashes in the `Users` tab.

| Folder | What it is |
|---|---|
| `src/` | The Apps Script project: `Code.gs`, `Api.gs`, `Dashboard.html`, `Style.html`, `Script.html` |
| `web/` | RZAMS Pro admin app (React 19, TypeScript, Vite, Tailwind, Lucide, Recharts, jsPDF) |
| `test/` | In-memory Sheets/Apps Script mock, backend tests, API tests, browser end-to-end tests |

---

## 1. Deploying the backend (Apps Script)

**Before anything else: back up the Sheet.** Google Sheet → File → Make a copy → `RZAMS backup YYYY-MM-DD`.

1. Open the Sheet → Extensions → Apps Script.
2. **Script property (first time only):** Project Settings (gear) → Script properties → add
   `APP_PASSWORD` = a **new** password (at least 10 characters). It is used once, for the first
   RZAMS Pro login as user `admin`; after that the hashed password in the `Users` tab is used.
   *Do not reuse the old master password – it was exposed.*
3. Replace the contents of `Code.gs`, `Dashboard.html`, `Style.html`, `Script.html` with the files in
   `src/`, and add a new script file named **`Api`** with the contents of `src/Api.gs`. Save.
4. **Authorise the new permissions:** in the editor choose the function `installDailyBackup` and
   click **Run**. Google asks for permission (Drive for backups, triggers for the daily schedule).
   This also schedules a **daily backup at about 2 AM** into the Drive folder *RZAMS Backups*
   (the newest 30 daily copies are kept).
5. Deploy → **Manage deployments** → edit the existing web app → Version: **New version** → Deploy.
   Keep *Execute as: Me* and *Who has access: Anyone* (required for the admin app to reach it;
   every data request still needs a logged-in session token).
   Do **not** use “New deployment” – that would change the link.
6. Copy the web app link (ends in `/exec`). You will paste it once into the admin app.

**Rolling back:** Manage deployments → edit → pick the previous version → Deploy. The new tabs and
columns are ignored by older versions, so rollback is safe.

## 2. First login and one-time setup

1. Open the admin app, paste the `/exec` link into **Server address** (asked once per device),
   log in as **admin** with the `APP_PASSWORD` you set.
2. Settings → **Data & backup** → *One-time setup* shows a preview, then **Back up and run setup**:
   * makes a Drive backup first;
   * creates the courses Guitar, Ukulele, Piano, Vocal, Indian Classical Music (default fee = the most
     common fee of matching students; Ukulele and Indian Classical start at ₹0 – set them in Courses);
   * links students to courses from their Instrument text (Vocals→Vocal, Piano/Keyboard→Piano,
     Guitar→Guitar) by filling only the new *Course ID* column;
   * imports existing Fees-tab payments as **Legacy** transactions (no invoice number) so revenue
     reports include them.
   It only adds what is missing and can be run again safely.
3. Settings → Academy: add address, contact number, WhatsApp, email. Settings → Users: create
   staff accounts. Settings → Password: change the admin password.
4. Courses & Batches → **Batches**: the old free-text batch names are listed – create proper batches
   (days, time, teacher, location, capacity) and add students to them. This builds the class schedule.

## 3. Deploying the admin app (Netlify) and `admin.tmusiclab.in`

The admin app is a **separate Netlify site** (it never replaces the tmusiclab site).

```bash
cd rzams/web
npm ci
npm run build                # optional: VITE_API_URL=https://script.google.com/macros/s/…/exec npm run build
# deploy the dist/ folder to the RZAMS Pro Netlify site (drag-and-drop or Netlify CLI)
```

`web/public/_headers` sets strict security headers (CSP, no framing, `noindex`); `_redirects` enables
client-side routes.

### Subdomain setup (needs your approval – DNS is at your domain registrar, not Netlify)

1. Netlify → the RZAMS Pro site → Domain management → **Add a domain** → `admin.tmusiclab.in`.
2. At the registrar where `tmusiclab.in` is managed, add **one** DNS record:

   | Type | Name / Host | Value / Target | TTL |
   |---|---|---|---|
   | CNAME | `admin` | `<rzams-site-name>.netlify.app` | Auto / 3600 |

   Do not change the existing `tmusiclab.in` / `www` records.
3. Back in Netlify, wait for DNS verification, then **Provision certificate** (free Let’s Encrypt)
   and enable **Force HTTPS**. Usually ready within an hour of the DNS change.

## 4. WhatsApp invoices and reminders

**What works now (free, no setup):**
* *Send invoice on WhatsApp* → step 1 opens WhatsApp (app or WhatsApp Web) to the student’s
  registered number (`+91…`, from the WhatsApp field, else phone) with the payment message filled in;
  step 2 shares the PDF. On Android/iOS the phone’s **share sheet sends the real PDF file** to WhatsApp;
  on a computer the PDF is downloaded so you can attach it in WhatsApp Web.
* *WhatsApp reminder* opens the chat with your editable reminder template and logs it.
* The app **never claims a message was sent**. It shows “WhatsApp opened – press Send”, “Share sheet
  completed – check the chat”, or “Sharing was cancelled”. Reminder history records “WhatsApp opened”.
* A normal `wa.me` link cannot attach a file – that is why the PDF is a separate step.

**Fully automatic delivery (optional, paid) – WhatsApp Business Cloud API (Meta).** Not enabled.
What it needs:
1. A Meta Business account (business verification recommended) and a WhatsApp Business Account.
2. A phone number dedicated to the API (it cannot stay on the normal WhatsApp / WhatsApp Business app).
3. Approved **message templates** for messages you start (invoice, reminder). A template can carry a
   PDF as a document header.
4. A permanent access token, stored in Apps Script **Script properties** (never in code); Api.gs would
   send messages with `UrlFetchApp` to `graph.facebook.com` and record the real delivery status.
5. Cost: Meta charges **per delivered template message**, priced by category and country. For India,
   *utility* messages (invoices, payment reminders) cost a fraction of a rupee each and *marketing*
   messages cost more. Replies inside a 24-hour customer-service window are free.
   Check Meta’s current rate card before enabling – prices change.
   Approval is needed from you before any paid setup.

## 5. Database structure (Google Sheet tabs)

Existing tabs (columns 1–N unchanged; new columns appended at the end):

| Tab | Columns |
|---|---|
| **Students** | Student ID, Student Name, Phone, Parent Name, Instrument, Batch, Monthly Fee, Join Date, Status, *+ WhatsApp, Email, Address, Photo (small JPEG, private), Course ID, Batch ID, Notes, Updated At* |
| **Fees** (monthly ledger) | Student ID, Student Name, Month, Amount, Paid, Due, Payment Date |
| **Attendance** | Date, Student ID, Student Name, Present/Absent (Present / Absent / Leave), *+ Batch ID, Marked At, Marked By* |
| **Studio Clients** | Client Name, Phone, Project Name, Total Amount, Advance, Due, Status |
| **Tasks** | Date, Task, Priority, Status, Notes |

New tabs:

| Tab | Columns |
|---|---|
| **Payments** (one row per transaction = one invoice) | Payment ID, Date, Student ID, Student Name, Course, Amount, Method, Reference, Billing Period, Allocation (JSON), Previous Balance, Current Fee, Remaining Balance, Next Due Date, Invoice No, Status (Paid/Partial/Void/Legacy), Notes, Request ID, Recorded By, Created At, Void Reason |
| **Courses** | Course ID, Name, Monthly Fee, Description, Status, Created At |
| **Batches** | Batch ID, Name, Course ID, Teacher ID, Days, Start Time, End Time, Location, Capacity, Status, Created At |
| **Teachers** | Teacher ID, Name, Phone, WhatsApp, Email, Courses, Status, Joined, Notes |
| **Classes** (one-off classes and single-date changes to a batch) | Class ID, Date, Start Time, End Time, Batch ID, Teacher ID, Course ID, Location, Status, Title, Notes, Created At |
| **Expenses** | Expense ID, Date, Category, Description, Amount, Method, Created By, Created At |
| **Reminders** | Reminder ID, Date, Student ID, Student Name, Phone, Amount, Months, Message, Channel, Status, Created By |
| **Settings** | Key, Value (academy details, logo, invoice prefix & sequence, templates, fee rules) |
| **Users** | Username, Name, Role (Admin/Staff), Password Hash, Salt, Status, Created At, Last Login |
| **AuditLog** | Time, User, Action, Entity, Entity ID, Details |
| **ErrorLog** | Time, User, Action, Message, Stack |

**Fee rules.** Each active student owes their Monthly Fee for every month from *Fee start month*
(Settings, default November 2026) or their admission month, up to the current month. A payment fills
the ticked months oldest first. On every invoice:
`Previous Balance (months before this month) + Current Fee (this month + any advance months) − Amount Paid = Remaining Balance`.
Payments are idempotent: every form submission carries a Request ID, so a double tap or a network
retry returns the first payment instead of creating a second one. Invoice numbers
(`RZA-2026-0001`) are sequential and never reused. Wrong payments are **voided** (admin only, with a
reason) – the fee ledger is reversed and the invoice is marked VOID; nothing is deleted.

## 6. Security checklist

- [x] No password in code or in the repository; `APP_PASSWORD` only bootstraps the first admin.
- [x] Passwords stored as salted, iterated HMAC-SHA256 hashes; minimum 8 characters.
- [x] Login locked for 10 minutes after 5 wrong attempts (per username).
- [x] Sessions: random 64-character tokens in Apps Script cache, 6-hour sliding expiry, logout ends the session server-side.
- [x] Roles: Admin (everything) / Staff (no expenses, settings, users, voids or permanent deletes) – enforced on the server.
- [x] Every request is validated on the server (phones, emails, dates, amounts, months, capacity, future dates, overpayment).
- [x] All writes are serialised with `LockService`; payments are idempotent; invoice numbers unique.
- [x] Students with history can only be archived; courses/batches/teachers in use cannot be deleted.
- [x] Audit log of every change; unexpected errors logged in ErrorLog.
- [x] Admin app: strict Content-Security-Policy, no framing, `noindex`, HTTPS only, text is escaped by React.
- [x] Student photos are stored privately in the Sheet (not public Drive links).
- [ ] **You:** set a new `APP_PASSWORD`, change the admin password after first login, and never reuse the old master password.
- [ ] **You:** keep the Google account that owns the Sheet protected with 2-step verification.
- [ ] **You:** review the Sheet’s sharing settings – only people who should see student data.

## 7. Backup and recovery

* **Daily automatic backup** (after step 1.4) into Drive → *RZAMS Backups* (30 daily copies kept).
* **Manual backup**: Settings → Data & backup → *Back up now*; setup always backs up first.
* **Restore a backup**: open the backup copy → check it → in the live Sheet, copy back the tab(s) you
  need (or point the Apps Script at the copy: Extensions → Apps Script from the copy). Sheets also
  keeps its own version history (File → Version history).
* **Undo a wrong payment**: void it (Admin) – reversal is automatic and audited.
* **Undo a code deployment**: Manage deployments → previous version.

## 8. Testing

Requires Node 18+ and Playwright with Chromium.

```bash
TZ=Asia/Kolkata node --test rzams/test/backend.test.js rzams/test/api.test.js   # 37 tests
(cd rzams/web && npm ci && npm run build)
TZ=Asia/Kolkata node rzams/test/web.e2e.js [shotsDir]   # RZAMS Pro, desktop + Android (Pixel 7)
TZ=Asia/Kolkata node rzams/test/ui.e2e.js [shotsDir]    # legacy /exec screen, desktop + Android
```

`test/gas-mock.js` imitates Google Sheets (including Sheets turning typed text such as `2026-11-05`
or `November 2026` into dates) and the Apps Script services. Sample data only – no real student data.
The tests run against this mock, not the live Sheet; check the live system after deploying.

## Changelog

### v3.0 – RZAMS Pro
New admin app (dashboard with charts, students & profiles, courses & batches, attendance with
Present/Absent/Leave, payments with invoices, PDF invoices, WhatsApp sharing, reminders, class
schedule, teachers, expenses, reports, settings, users & roles), JSON API, backups, audit/error logs,
one-time setup. Legacy screen kept and connected to the same payment logic.

### v2.1 – Stage 1
Real pending fees, multi-month payments, archive instead of delete, validation, login lockout,
password moved to Script properties, write locking.
