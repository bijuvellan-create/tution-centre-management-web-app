# Smart Tuition Manager

A small but complete web application for running a tuition centre: students,
teachers, courses, batches, attendance, fees and receipts — all in one place.

- **Frontend:** React 18 + Vite (single-page app)
- **Backend:** Node.js + Express REST API
- **Database:** MongoDB (Atlas or local)
- **Auth:** JWT (Bearer token) with role-based access control

The user interface follows a "schoolhouse ledger" theme: a deep-pine sidebar,
warm paper surfaces and brass accents, with the Fraunces serif for headings and
figures.

---

## Features

- **Authentication** — email + password sign-in, short-lived JWT tokens,
  change-password, rate-limited login.
- **Roles** — `admin` (full access) and `teacher` (limited to their own batches,
  attendance and a scoped dashboard).
- **Students** — admissions, guardians, courses, batch, monthly fee, status.
- **Teachers** — staff records with subjects, qualifications and assigned batches.
- **Courses** — subjects, levels, duration and a standard monthly fee.
- **Batches** — schedule (days/time), capacity, teacher, roster, double-booking
  guard.
- **Attendance** — mark a whole batch for a date, with present/absent/late/excused;
  re-saving the same day updates the existing records.
- **Fees** — raise invoices (with optional billing period), track paid/balance,
  overdue detection. Amounts are stored in **paise** (integers).
- **Payments** — append-only collections against a fee, with printable receipts.
- **Dashboard** — live counts, today's attendance and money summary.
- **Reports** — students, teachers, attendance (daily/monthly/per-student) and
  fee collection, each exportable to **CSV**.
- **Audit log** — key actions are recorded for accountability.

---

## Project structure

```
tuition-management/
├─ backend/          Express API
│  ├─ src/
│  │  ├─ config/     env + database connection
│  │  ├─ models/     Mongoose schemas
│  │  ├─ controllers/ request handlers
│  │  ├─ routes/     URL definitions + validation
│  │  ├─ services/   business logic (fees, enrolment, audit)
│  │  ├─ middleware/ auth, validation, errors, rate limiting
│  │  ├─ utils/      money, dates, pagination, CSV, JWT, ...
│  │  └─ scripts/    one-time admin bootstrap
│  └─ tests/         Node test runner + in-memory MongoDB
└─ frontend/         React app
   └─ src/
      ├─ components/ui/  design-system components
      ├─ context/        auth context
      ├─ hooks/          useAuth, useList
      ├─ layouts/        dashboard shell
      ├─ pages/          one file per screen
      ├─ router/         protected/admin route guards
      ├─ services/       API client + endpoint wrappers
      └─ utils/          formatting helpers
```

---

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- A MongoDB database (MongoDB Atlas is recommended) — *optional for local
  development, see below*

---

## Quick start

### 1. Backend

```bash
cd tuition-management/backend
npm install
cp .env.example .env     # Windows: copy .env.example .env
```

Open `.env` and set at least:

- `MONGODB_URI` — your MongoDB Atlas connection string
- `JWT_SECRET` — a long random string (32+ characters)

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Then create the first administrator and start the API:

```bash
npm run seed:admin       # creates the first admin (refuses if one exists)
npm run dev              # http://localhost:5000
```

### 2. Frontend

```bash
cd tuition-management/frontend
npm install
cp .env.example .env     # Windows: copy .env.example .env
npm run dev              # http://localhost:5173
```

Sign in with the administrator account you created.

### No database yet? Use the built-in demo mode

If `MONGODB_URI` is left empty in development, the backend automatically starts
a **temporary in-memory MongoDB** and creates a demo admin so you can try the
whole app immediately:

```bash
cd tuition-management/backend
npm run dev
```

```
[dev]   email    : admin@demo.local
[dev]   password : Demo@12345
```

> This is for local demos only. Data is discarded when the server stops, and it
> never runs in production. Add `MONGODB_URI` to `.env` for real, persistent
> data.

---

## Environment variables

### Backend (`backend/.env`)

| Variable         | Required | Description                                                   |
| ---------------- | -------- | ------------------------------------------------------------- |
| `NODE_ENV`       | no       | `development` (default), `test`, or `production`              |
| `PORT`           | no       | API port (default `5000`)                                     |
| `MONGODB_URI`    | prod yes | MongoDB connection string (empty = in-memory demo in dev)     |
| `JWT_SECRET`     | yes      | Long random secret (32+ characters)                           |
| `JWT_EXPIRES_IN` | no       | Access-token lifetime (default `30m`)                         |
| `FRONTEND_URL`   | no       | Allowed CORS origin(s), comma-separated (default `:5173`)     |
| `APP_NAME`       | no       | Branding shown in the API responses                           |
| `TZ`             | no       | Timezone for date reports (default `Asia/Kolkata`)            |
| `ADMIN_NAME/EMAIL/PASSWORD` | no | Used by `npm run seed:admin` (or it prompts interactively) |

### Frontend (`frontend/.env`)

| Variable        | Description                                        |
| --------------- | -------------------------------------------------- |
| `VITE_API_URL`  | API base URL incl. `/api` (default `:5000/api`)    |
| `VITE_APP_NAME` | Application name shown in the UI                   |

---

## npm scripts

**Backend**

| Command              | What it does                                          |
| -------------------- | ----------------------------------------------------- |
| `npm run dev`        | Start API with auto-reload (nodemon)                  |
| `npm run dev:local`  | Force the in-memory demo database                     |
| `npm start`          | Start API without reload                              |
| `npm test`           | Run backend tests (in-memory MongoDB, no Atlas needed)|
| `npm run seed:admin` | Create the first administrator account                |

**Frontend**

| Command           | What it does                          |
| ----------------- | ------------------------------------- |
| `npm run dev`     | Start Vite dev server (`:5173`)       |
| `npm run build`   | Production build into `dist/`         |
| `npm run preview` | Serve the production build locally    |
| `npm test`        | Run the component/unit tests (Vitest) |

---

## Roles and permissions

| Area                          | Admin | Teacher |
| ----------------------------- | :---: | :-----: |
| Dashboard                     |  ✅   |  ✅ (scoped) |
| Students / Teachers / Courses |  ✅   |   —    |
| Batches (view)                |  ✅   | ✅ (own) |
| Batches (create / edit)       |  ✅   |   —    |
| Attendance                    |  ✅   | ✅ (own) |
| Fees / Payments               |  ✅   |   —    |
| Reports                       |  ✅   |  — (attendance only) |
| User accounts                 |  ✅   |   —    |

Permissions are enforced on the **backend**; the UI simply hides what a role
cannot use.

---

## API overview

All responses use the envelope `{ success, data, meta? }`.

| Method | Endpoint                        | Purpose                       |
| ------ | ------------------------------- | ----------------------------- |
| GET    | `/api/health`                   | Health / DB status            |
| POST   | `/api/auth/login`               | Sign in (returns token)       |
| GET    | `/api/auth/me`                  | Current user                  |
| POST   | `/api/auth/change-password`     | Change own password           |
| CRUD   | `/api/students`                 | Students                      |
| CRUD   | `/api/teachers`                 | Teachers                      |
| CRUD   | `/api/courses`                  | Courses                       |
| CRUD   | `/api/batches` (+ `/students`)  | Batches and enrolment         |
| GET/POST/PUT | `/api/attendance`          | Attendance                    |
| CRUD   | `/api/fees` (+ `/cancel`)       | Fee invoices                  |
| GET/POST | `/api/payments` (+ `/receipt`) | Payments and receipts         |
| CRUD   | `/api/users` (+ `/password`)    | User accounts                 |
| GET    | `/api/dashboard/summary`        | Dashboard numbers             |
| GET    | `/api/reports/{students,teachers,attendance,fees}` | Reports (`?format=csv`) |

See the route files under `backend/src/routes/` for the full list and the exact
query parameters (search, filters, pagination).

---

## Testing

```bash
# Backend — 9 tests across health, auth and a full business flow
cd tuition-management/backend && npm test

# Frontend — unit + component tests
cd tuition-management/frontend && npm test
```

Backend tests use `mongodb-memory-server`, so they never touch your real
database.

---

## Security notes

- Passwords are hashed with **bcrypt** and never returned by the API.
- JWTs are **short-lived** and invalidated on password change via a token
  version counter.
- The token is stored in `localStorage` and sent as `Authorization: Bearer`.
  Trade-off: `localStorage` is readable by JavaScript, so an XSS bug could
  leak it. This is mitigated by never rendering untrusted HTML and by short
  token lifetimes. HttpOnly cookies would be stronger but require CSRF
  protection and same-site hosting.
- Requests are rate-limited (stricter on login) and input is validated.
- Invoices with payments, teachers with batches, and students with history
  cannot be hard-deleted — they are deactivated or cancelled instead, so
  financial and attendance records stay intact.

---

## Deployment

See [`tuition-management/DEPLOYMENT.md`](tuition-management/DEPLOYMENT.md) for how
to build the frontend, run the API in production and connect MongoDB Atlas.
