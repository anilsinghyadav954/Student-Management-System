# Testing Guide

This project has two layers of testing: an **automated backend test suite** (Vitest + Supertest + an in-memory MongoDB) and a **manual QA checklist** for the frontend.

> **Note on how this was built:** the sandbox used to build this project has no network access, so the automated suite below was written and syntax-verified (`node --check` on every file) but **could not actually be executed here** — `mongodb-memory-server` needs to download a real MongoDB binary on first run, and `npm install` itself requires network access. Run `npm test` locally (see below) to execute it for real before you rely on it. While writing these tests I did catch and fix one real bug through careful review of Mongoose's semantics (see "Bugs found while writing this suite" below) — running the suite for real may surface more.

## 1. Backend automated tests

**Stack:** [Vitest](https://vitest.dev) (test runner, native ESM support) + [Supertest](https://github.com/ladjs/supertest) (HTTP assertions against the Express app) + [mongodb-memory-server](https://github.com/nodkz/mongodb-memory-server) (a real, ephemeral MongoDB instance — not a mock — so tests exercise actual schema validation, indexes, and hooks).

### Setup & run

```bash
cd server
npm install
npm test          # runs the full suite once
npm run test:watch  # re-runs on file changes
```

No `.env` file is required to run tests — `tests/env.setup.js` sets all required environment variables (JWT secrets, etc.) directly, so the suite is fully self-contained. The first run will take a little longer than usual while `mongodb-memory-server` downloads a MongoDB binary (cached afterward).

### What's covered

| File | Covers |
|---|---|
| `tests/auth.test.js` | Login (success/failure/deactivated account), `/me` session check, the full forgot→verify→reset password flow, generic response for non-existent emails (no user enumeration), change password |
| `tests/student.test.js` | Create/list/search/filter/paginate/update/delete, duplicate-email rejection, validation errors, role-based access control (student blocked from admin routes, unauthenticated blocked), the student's own `/me/profile` endpoint |
| `tests/attendance.test.js` | Bulk marking, upsert-on-re-mark, monthly report percentage math, **ownership enforcement** (a student can view their own attendance but gets a 403 on anyone else's) |
| `tests/marks.test.js` | Grade auto-calculation, upsert-on-resubmit, overall percentage summary math, ownership enforcement, validation (marks can't exceed total) |

### Bugs found while writing this suite

Writing the marks test for grade auto-calculation surfaced a real bug: `addMarks` and `markAttendance` originally used `findOneAndUpdate(..., { upsert: true, runValidators: true })`. **Mongoose does not run `pre('validate')` document middleware for `findOneAndUpdate`**, even with `runValidators: true` — that option only re-runs schema-level validators (`required`, `min`, `max`), not custom hooks. Since grade calculation and attendance date-normalization both live in `pre('validate')` hooks, upserts were silently skipping them. Fixed by switching both controllers to a find-or-build + `.save()` pattern, which does trigger document middleware. This is exactly the kind of bug integration tests are meant to catch — a manual click-through would likely have missed it, since `new Marks(...).save()` on the *first* insert always worked fine; only the upsert path was broken.

### What's intentionally not covered

- Notice CRUD and dashboard stats endpoints (same patterns as students/marks — CRUD + role checks — omitted here to keep the suite focused rather than exhaustive)
- Cloudinary image upload endpoints (would require mocking the Cloudinary SDK; the upload logic itself is a thin wrapper documented inline in `middleware/uploadMiddleware.js`)
- Email delivery itself (mocked via `vi.mock` — we assert the app *tried* to send the right email, not that Nodemailer/SMTP actually delivered it)

## 2. Frontend manual QA checklist

The frontend can't be tested headlessly in this environment (no network to install React Testing Library / Playwright, no browser to render against). Once you have the app running locally (`npm run dev` in both `client/` and `server/`), walk through this checklist:

### Authentication
- [ ] Log in as admin → redirected to `/admin/dashboard`
- [ ] Log in as student → redirected to `/student/dashboard`
- [ ] Wrong password → toast error, stays on login
- [ ] Refresh the page while logged in → session persists (no re-login prompt)
- [ ] Forgot password → OTP email arrives → verify OTP → reset password → can log in with new password
- [ ] Wrong OTP → clear error shown, can retry or resend
- [ ] Change password (from Profile) → old password stops working, new one works
- [ ] Logout → redirected to `/login`, protected routes now redirect back to login
- [ ] Visit `/admin/dashboard` as a student (or vice versa) → redirected to `/unauthorized`
- [ ] Visit a nonexistent route → 404 page

### Admin panel
- [ ] Dashboard stat cards and all 3 charts render with real data
- [ ] Add a student → appears in the list immediately
- [ ] Search students by name/email/roll/student ID → results filter correctly
- [ ] Filter by class/status → results filter correctly
- [ ] Pagination → page numbers work, "Showing X–Y of Z" is accurate
- [ ] Edit a student → changes persist
- [ ] Delete a student → confirmation dialog appears first; after confirming, student and their attendance/marks are gone
- [ ] Export PDF and Export Excel → both download and open correctly
- [ ] Mark attendance for a class → grid loads, statuses save
- [ ] Re-open the same class/date → previously marked statuses are pre-filled
- [ ] Monthly report → percentages match manual math
- [ ] Add marks for a student → grade appears correctly (A+/A/B+/etc.)
- [ ] Edit/delete a marks entry
- [ ] Create a notice (both "All Students" and "Specific Class") → appears in the list
- [ ] Pin a notice → sorts to the top
- [ ] Edit/delete a notice
- [ ] Update own profile (name/phone) and upload a profile photo

### Student panel
- [ ] Dashboard shows correct attendance %, marks %, and recent notices
- [ ] Attendance page shows full history with correct percentage
- [ ] Marks page shows all subjects with correct grades
- [ ] Notice board shows only notices for "all students" or their own class — never another class's notices
- [ ] Profile page: can update name/phone, upload photo, change password
- [ ] Cannot navigate to any `/admin/*` URL directly (redirected)

### Responsive / cross-device
- [ ] At 320–375px width: no horizontal page scroll anywhere, sidebar becomes a slide-in drawer, tables scroll independently within their own container
- [ ] At tablet width (~768px): layout adapts (2-column stat grids, drawer sidebar)
- [ ] At laptop/desktop width (≥1024px): fixed sidebar, full multi-column layouts
- [ ] Dark mode toggle works consistently across every page (no unstyled/invisible text)
- [ ] All toasts, loaders, and confirmation dialogs render correctly on mobile
