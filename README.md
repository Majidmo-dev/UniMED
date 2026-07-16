# SUZA Medical

An online medical checking system for the **State University of Zanzibar (SUZA)**.
It replaces paperwork with a digital workflow for the medical check every incoming
first-year student completes as part of enrollment, and gives the university
administration a live view of the intake's baseline health.

Built as a static site (HTML + CSS + vanilla JS), no build step, no backend.
Data is persisted in the browser's `localStorage` / `sessionStorage` for demo
purposes.

---

## Roles

| Role      | How they access                          | What they can do                                                                 |
|-----------|-------------------------------------------|----------------------------------------------------------------------------------|
| Student   | Home → **View records** (Student ID only) | Look up their own medical reports by Student ID. No password.                    |
| Doctor    | Portal login (Doctor tab)                 | Submit medical reports after a student's checkup. See all reports they submitted.|
| Admin     | Portal login (Admin tab)                  | See every submitted report across the incoming class; search and export as JSON. |

Portal logins (`portal.html`) are demo-only: any ID + a 6+ character password
is accepted. The role tab picked at sign-in decides the destination page.

---

## Pages

| File            | Purpose                                                                 |
|-----------------|-------------------------------------------------------------------------|
| `index.html`    | Landing page describing the enrollment health check.                    |
| `register.html` | Enrollment medical check registration form for first-year students.     |
| `portal.html`   | Login page for Doctor and Admin roles.                                  |
| `staff.html`    | Doctor dashboard: new-report form + list of submitted reports.          |
| `admin.html`    | Administration dashboard: all reports, search, export.                  |
| `student.html`  | Student view: Student ID lookup → dashboard with the student's reports. |
| `about.html`    | Mission, vision, team, and FAQ.                                         |
| `style.css`     | Design system (teal + slate palette, cards, forms, dashboards).         |
| `script.js`     | Shared client-side logic (auth, forms, reports, dashboards).            |

---

## The medical report flow

1. A first-year student completes **`register.html`** as part of enrollment.
2. They attend the enrollment checkup at the SUZA clinic.
3. The doctor logs into **`portal.html`** and lands on **`staff.html`**, where
   they fill the *Enrollment medical check — new report* form (Student ID +
   name, visit date, diagnosis, treatment, prescription, follow-up, status,
   notes) and submits it.
4. The report is saved to `localStorage`. Immediately:
   - The student can visit **`student.html`**, enter their Student ID, and see
     the report on their dashboard.
   - The administration can log into **`admin.html`** and see the report in the
     university-wide list, along with stat tiles and search.

---

## Running it

Static site — open `index.html` in any modern browser, or serve the folder:

```bash
# Python 3
python3 -m http.server 8000

# Node
npx serve .
```

Then visit http://localhost:8000.

External dependencies (loaded from CDN, no bundling): Font Awesome 6.5.1 and
the Inter font from Google Fonts.

---

## Data storage

Everything lives in the browser. There is no backend and no network sync.

| Key                     | Where            | Contents                                      |
|-------------------------|------------------|-----------------------------------------------|
| `suzamed:reports`       | `localStorage`   | Array of submitted medical reports.           |
| `suzamed:session`       | `localStorage`   | The logged-in Doctor/Admin session.           |
| `suzamed:studentView`   | `sessionStorage` | Student ID the visitor is currently viewing.  |

Because reports are in `localStorage`, they persist across page reloads but
**not across different browsers or devices**. Two computers testing the site
will each see their own data.

The Admin dashboard's *Export JSON* button downloads the full report list so
you can move it between machines if needed.

---

## Notes for a real deployment

This repository is a working prototype. To take it further, at minimum you
would want to:

- Replace `localStorage` with a real backend (Postgres + a small API) so
  reports sync across devices and are actually secure.
- Replace the ID-only student lookup with a proper second factor (email match,
  DOB, or one-time code sent to the student's email).
- Replace the demo login (any ID + 6-char password) with real authentication
  and role-based authorization for Doctor and Admin.
- Encrypt personal health data at rest and log every access (ISO 27001).
