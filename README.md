# 🎓 Student Management System (SMS)

A full-stack, production-ready **Student Management System** built with the **MERN stack**. Two role-based dashboards (Admin & Student), JWT authentication with OTP-based password recovery, attendance & marks tracking with auto-calculated grades, a notice board, and PDF/Excel export — all wrapped in a responsive, dark-mode-ready UI.

Built as a portfolio-grade / college major project reference implementation.

---

## ✨ Features

### Authentication & Security
- JWT-based authentication with role-based access control (Admin / Student)
- Bcrypt password hashing, protected API routes, input validation on both client and server
- Forgot password via **6-digit OTP emailed to the user** (Nodemailer), with a short-lived single-purpose reset token
- Change password, logout, and **session persistence** across page refreshes
- Per-endpoint rate limiting on auth routes to slow brute-force attempts

### Admin Panel
- **Dashboard** — total/active students, today's attendance breakdown, 7-day attendance trend, grade distribution, and a recent-activity feed, all backed by live charts (Chart.js)
- **Student Management** — full CRUD, search (name/email/roll/student ID), filter by class/section/status, pagination, and **PDF + Excel export** (streamed server-side, no temp files)
- **Attendance** — mark a whole class in one action, edit individual records, monthly percentage reports
- **Marks** — subject-wise entry with **automatic grade calculation** (A+ through F), editable, per-student result summaries
- **Notice Board** — create/edit/delete announcements, target "all students" or a specific class, pin important notices
- **Profile** — update details, upload a profile photo (Cloudinary), change password

### Student Panel
- Personal dashboard (attendance %, overall marks %, recent notices)
- Full attendance history with color-coded percentage
- Full subject-wise marks/results view
- Notice board (scoped to their own class + school-wide notices — enforced server-side, not just hidden in the UI)
- Profile management (same shared component as Admin — no duplicated code)

### UI/UX
- Fully responsive: mobile, tablet, laptop, desktop — no horizontal page scroll anywhere
- Dark mode (persisted, system-preference-aware on first load)
- Toast notifications, loading states, confirmation dialogs before every destructive action
- Sidebar navigation (off-canvas drawer on mobile/tablet, fixed on laptop/desktop) + top navbar

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router, Axios, Chart.js, React Icons |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas + Mongoose |
| Auth | JWT + bcrypt |
| Email | Nodemailer (Gmail SMTP or any SMTP provider) |
| File uploads | Multer + Cloudinary |
| Exports | PDFKit, ExcelJS |
| State management | React Context API |
| Testing | Vitest + Supertest + mongodb-memory-server |

---

## 📸 Screenshots

> Add screenshots here after your first deploy — e.g.:
> `![Admin Dashboard](docs/screenshots/admin-dashboard.png)`
>
> Suggested shots: Login page, Admin Dashboard (with charts), Student List, Attendance grid, Marks table, Notice board, Student Dashboard, mobile view of the sidebar drawer, and dark mode side-by-side with light mode.

---

## 📁 Project Structure

```
student-management-system/
├── client/                       # React + Vite frontend
│   ├── src/
│   │   ├── components/           # Reusable UI (Modal, ConfirmDialog, Pagination, Sidebar, Topbar, ...)
│   │   ├── pages/                # admin/, student/, auth/, error/
│   │   ├── layouts/               # AdminLayout, StudentLayout
│   │   ├── context/               # AuthContext, ThemeContext
│   │   ├── services/               # Axios API wrappers, one per resource
│   │   ├── utils/                  # download helper, etc.
│   │   └── assets/
│   ├── vercel.json                # SPA rewrite config for Vercel
│   └── package.json
├── server/                       # Express backend
│   ├── config/                    # db.js, cloudinary.js, mailer.js
│   ├── controllers/                # one per resource
│   ├── routes/                     # one per resource
│   ├── models/                     # User, Student, Attendance, Marks, Notice
│   ├── middleware/                  # auth, upload, validation, error handling
│   ├── validators/                  # express-validator rule chains
│   ├── utils/                       # tokens, OTP, email, exports, seed script
│   ├── tests/                       # Vitest + Supertest suite
│   ├── app.js                       # Express app (importable, side-effect-free)
│   └── server.js                    # process entrypoint (connects DB, listens)
├── render.yaml                    # Render deployment blueprint
├── DEPLOYMENT.md                  # step-by-step deployment guide
├── TESTING.md                     # testing guide + manual QA checklist
└── README.md
```

---

## 🚀 Installation

### Prerequisites
- Node.js ≥ 18
- A MongoDB Atlas account (or local MongoDB for development)
- A Cloudinary account (for profile photo uploads)
- An SMTP account (Gmail App Password works well) for the forgot-password OTP emails

### Setup

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd student-management-system

# 2. Install dependencies for both client and server
npm run install:all

# 3. Configure environment variables (see below)
cp server/.env.example server/.env
cp client/.env.example client/.env
# → edit both files with your real values

# 4. Seed the first admin account
npm run seed

# 5. Run both apps (in two terminals)
npm run dev:server     # http://localhost:5000
npm run dev:client     # http://localhost:5173
```

Log in with the admin email/password you set in `server/.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`), then **change the password immediately** from the Profile page.

---

## 🔑 Environment Variables

### `server/.env`

| Variable | Description |
|---|---|
| `NODE_ENV` | `development` or `production` |
| `PORT` | Backend port (default `5000`) |
| `CLIENT_URL` | Frontend URL(s), comma-separated for multiple (CORS allowlist) |
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Long random strings — generate with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `JWT_EXPIRE` / `JWT_REFRESH_EXPIRE` | Token lifetimes (e.g. `7d`, `30d`) |
| `BCRYPT_SALT_ROUNDS` | Password hashing cost factor (default `10`) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_EMAIL` / `SMTP_PASSWORD` | Email delivery for OTPs |
| `FROM_NAME` / `FROM_EMAIL` | Sender identity on outgoing emails |
| `OTP_EXPIRE_MINUTES` | OTP validity window (default `10`) |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Image upload credentials |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Used only by `npm run seed` to create the first admin |

Full template with comments: [`server/.env.example`](server/.env.example)

### `client/.env`

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL (`/api` for local dev via the Vite proxy; full URL in production) |

Full template: [`client/.env.example`](client/.env.example)

---

## 🧪 Testing

```bash
npm run test:server
```

Runs the automated backend suite (Vitest + Supertest against an in-memory MongoDB — real schema validation, no mocks of the database layer). Covers authentication, student CRUD, attendance, and marks, including role-based access control and cross-student ownership enforcement.

See [`TESTING.md`](TESTING.md) for full coverage details and a manual QA checklist for the frontend.

---

## ☁️ Deployment

- **Frontend** → Vercel
- **Backend** → Render
- **Database** → MongoDB Atlas
- **Images** → Cloudinary

Full step-by-step instructions (including the exact order to deploy in, and the CORS gotcha that trips most people up): [`DEPLOYMENT.md`](DEPLOYMENT.md)

---

## 🗺️ API Overview

All endpoints are prefixed with `/api`. Full request/response contracts are documented inline in each controller under `server/controllers/`.

| Resource | Base path | Notes |
|---|---|---|
| Auth | `/auth` | login, forgot/verify/reset password, change password, `/me`, logout |
| Students | `/students` | admin CRUD + export; `/students/me/profile` for the logged-in student |
| Attendance | `/attendance` | mark/edit (admin), monthly reports (admin), `/attendance/student/:id` (own record) |
| Marks | `/marks` | add/edit/delete (admin), `/marks/student/:id` (own record) |
| Notices | `/notices` | admin CRUD, `/notices/my` (student-scoped feed) |
| Dashboard | `/dashboard/stats` | admin-only aggregate stats |
| Users | `/users` | own profile update/photo, admin user management |

---

## 📄 License

MIT — free to use for learning, portfolio, or as a foundation for your own project.
