# Deployment Guide

This guide walks through deploying the Student Management System to production:
**MongoDB Atlas** (database) → **Cloudinary** (image storage) → **Render** (backend API) → **Vercel** (frontend).

Deploy in that order — each step produces a value the next step needs.

---

## 1. MongoDB Atlas (Database)

1. Create a free account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
2. Create a new **Project**, then build a **free M0 Cluster**.
3. **Database Access** → add a new database user with a strong password (save it — you'll need it for the connection string). Give it "Read and write to any database".
4. **Network Access** → add IP address `0.0.0.0/0` (allow access from anywhere). Render's outbound IPs aren't static on the free tier, so this is the practical option; if you're on a paid Render plan with static IPs, restrict to those instead.
5. **Database** → **Connect** → **Drivers** → copy the connection string. It looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Insert your database name before the `?`: `.../student_management?retryWrites=true&w=majority`. This becomes your `MONGO_URI`.

---

## 2. Cloudinary (Image Storage)

1. Create a free account at [cloudinary.com](https://cloudinary.com).
2. On your Cloudinary dashboard home page, copy: **Cloud Name**, **API Key**, **API Secret**. These become `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

---

## 3. Email (Nodemailer / Gmail SMTP)

The forgot-password OTP flow needs a working SMTP account. Gmail's free tier works well for a portfolio/college project:

1. Enable 2-Step Verification on the Gmail account you'll send from.
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) and generate an **App Password** (not your real Gmail password).
3. Use:
   - `SMTP_HOST=smtp.gmail.com`
   - `SMTP_PORT=465`
   - `SMTP_SECURE=true`
   - `SMTP_EMAIL=your_gmail_address@gmail.com`
   - `SMTP_PASSWORD=<the 16-character app password>`

(Any other SMTP provider — SendGrid, Mailgun, etc. — works too; just swap the host/port/credentials.)

---

## 4. Backend → Render

1. Push this repository to GitHub (if you haven't already).
2. Create a free account at [render.com](https://render.com) and connect your GitHub account.
3. **New** → **Blueprint**, point it at your repo. Render will detect `render.yaml` at the project root and pre-fill the service config (root directory `server`, build command `npm install`, start command `npm start`, health check `/api/health`).
   - If you'd rather configure manually instead of using the blueprint: **New** → **Web Service** → select your repo → set **Root Directory** to `server`, **Build Command** to `npm install`, **Start Command** to `npm start`.
4. In the **Environment** tab, add every variable from `server/.env.example`, using your real values:

   | Variable | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `CLIENT_URL` | *(fill in after Step 5 — your Vercel URL)* |
   | `MONGO_URI` | from Step 1 |
   | `JWT_SECRET` / `JWT_REFRESH_SECRET` | generate with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` — run this twice for two different secrets |
   | `SMTP_*`, `FROM_*` | from Step 3 |
   | `CLOUDINARY_*` | from Step 2 |
   | `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | credentials for your first admin login |

5. Deploy. Once live, note your backend URL (e.g. `https://sms-server.onrender.com`).
6. Seed the first admin account. In the Render dashboard, open a **Shell** for your service and run:
   ```bash
   npm run seed
   ```
   This creates the admin account from `ADMIN_EMAIL`/`ADMIN_PASSWORD`. **Log in and change the password immediately** — the seeded password only exists to get you into the app.
7. Sanity check: visit `https://<your-backend-url>/api/health` — you should see `{"success":true,"message":"SMS API is running 🚀"}`.

> **Free tier note:** Render's free web services spin down after 15 minutes of inactivity and take ~30–60 seconds to wake up on the next request. This is normal — not a bug — and fine for a portfolio/demo project. Upgrade to a paid plan to avoid it.

---

## 5. Frontend → Vercel

1. Create a free account at [vercel.com](https://vercel.com) and connect your GitHub account.
2. **Add New** → **Project** → import your repo.
3. Vercel should auto-detect Vite. Confirm:
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   (These are also codified in `client/vercel.json`, so they should be picked up automatically.)
4. Add an environment variable:
   - `VITE_API_URL` = `https://<your-render-backend-url>/api`
5. Deploy. Vercel gives you a URL like `https://sms-client.vercel.app`.
6. **Go back to Render** and update the `CLIENT_URL` environment variable to this Vercel URL, then trigger a redeploy (Manual Deploy → Deploy latest commit). This is what makes CORS actually allow your frontend to talk to your backend — skipping this step is the #1 cause of "CORS error" after deployment.

---

## 6. Post-deployment checklist

- [ ] Visit your Vercel URL — the login page loads
- [ ] Log in with the seeded admin account, then **change the password** from Profile settings
- [ ] Create a test student, confirm login works for that student too
- [ ] Trigger a forgot-password flow end-to-end and confirm the OTP email arrives
- [ ] Upload a profile photo and confirm it appears (verifies Cloudinary is wired correctly)
- [ ] Export a student list as PDF and Excel
- [ ] Open the app on a phone (or your browser's device toolbar) and click through — confirm no horizontal scrolling and the sidebar drawer works

## 7. Custom domain (optional)

Both Render and Vercel support free custom domains under their respective dashboards' **Settings → Domains**. If you add one:
- Update `CLIENT_URL` on Render to the new frontend domain
- Update `VITE_API_URL` on Vercel to the new backend domain (if you also add a custom domain to the backend)
- Redeploy both after changing environment variables — they're baked in at build time for the frontend, and read at boot time for the backend.
