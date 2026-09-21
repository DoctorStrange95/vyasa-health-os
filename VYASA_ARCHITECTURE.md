# Vyasa Health OS — Architecture Reference

## Frontend
- **Local path:** `/Users/doctor_strange/vyasa/`
- **Live URL:** https://app.vyasaa.com
- **Platform:** Cloudflare Pages (project: `vyasa-health-os`)
- **Tech:** React + Vite + Tailwind CSS v4 + Zustand
- **Deploy command:**
  ```
  cd /Users/doctor_strange/vyasa
  npm run build
  npx wrangler pages deploy dist --project-name vyasa-health-os --commit-dirty=true
  ```

### Key Frontend Files
| File | Purpose |
|------|---------|
| `src/main.tsx` → `src/App.tsx` | Entry point |
| `src/pages/admin/SuperAdminPage.tsx` | Superadmin panel (approvals, doctor stats, email, templates) |
| `src/pages/doctor/PatientDetailPage.tsx` | Patient record + visits + Rx + labs |
| `src/lib/emailService.ts` | Email templates + branded HTML header + sendDirectEmail() |
| `src/lib/api.ts` | API client (JWT auth, auto token refresh) |
| `src/store/useAppStore.ts` | Zustand store (patients, visits, labs, prescriptions, vitals) |
| `src/store/useAuthStore.ts` | Auth state (user, token) |
| `src/store/usePadStore.ts` | Prescription pad settings — always use `const { settings: pad } = usePadStore()` |
| `src/components/layout/Sidebar.tsx` | App sidebar + Vyasa branding |
| `vite.config.ts` | PWA config (autoUpdate + skipWaiting + clientsClaim) |

---

## Backend
- **Local path:** `/Users/doctor_strange/vyasa-backend/`
- **Live URL:** https://vyasa-os-backend.onrender.com
- **Platform:** Render (auto-deploys on git push)
- **GitHub:** https://github.com/DoctorStrange95/vyasa-os-backend
- **Tech:** Express.js + TypeScript + Neon PostgreSQL
- **Deploy command:**
  ```
  cd /Users/doctor_strange/vyasa-backend
  git add . && git commit -m "message" && git push
  ```
  *(Render auto-deploys within ~3 mins after push)*

### Key Backend Files
| File | Purpose |
|------|---------|
| `src/index.ts` | Express app entry, all route mounts, runMigrations() call |
| `src/db.ts` | Neon PG connection + ALL table migrations (run on startup) |
| `src/routes/admin.ts` | Superadmin routes (requireSuperAdmin middleware) |
| `src/routes/auth.ts` | Login, register, Google OAuth, token refresh |
| `src/routes/visits.ts` | OPD visits (includes doctor_id filter for solo practice) |
| `src/routes/patients.ts` | Patient CRUD |
| `src/routes/prescriptions.ts` | Prescription management |
| `src/routes/labs.ts` | Lab orders + results |
| `src/routes/appointments.ts` | Booking + scheduling |
| `src/lib/mailer.ts` | Brevo HTTP API email sender (support@vyasaa.com) |

### API Base URL
- Production: `https://vyasa-os-backend.onrender.com`
- Local dev: `http://localhost:3000`
- Set via `VITE_API_URL` env var on Cloudflare Pages

---

## Database
- **Provider:** Neon (serverless PostgreSQL)
- **Connection:** `DATABASE_URL` environment variable on Render
- **Migrations:** Run automatically on every backend startup via `runMigrations()` in `src/db.ts`
- **Add new columns:** Always use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` (never rely on CREATE TABLE IF NOT EXISTS for new columns)

### Tables
| Table | Purpose |
|-------|---------|
| `users` | All users (doctors, nurses, admins, superadmin) |
| `clinics` | Clinic profiles linked to owner (doctor) |
| `pad_settings` | Prescription pad customisation per doctor |
| `patients` | Patient records |
| `visits` | OPD consultation records (has `doctor_id` column for solo practice) |
| `vitals` | Patient vitals per visit |
| `lab_orders` | Lab test orders + PDF results |
| `prescriptions` | Prescription records |
| `appointments` / `bookings` | Patient booking system |
| `login_sessions` | Login history per user (IP, timestamp) |
| `discharge_summaries` | IPD discharge records |
| `email_logs` | All emails sent from SuperAdmin (recipient, template, subject, timestamp) |

---

## Email System
- **Provider:** Brevo (HTTP API — Render blocks SMTP)
- **From address:** support@vyasaa.com (reply-to)
- **Actual sending domain:** Brevo subdomain (until vyasaa.com is authenticated in Brevo)
- **Templates location:** `src/lib/emailService.ts` → `EMAIL_TEMPLATES`
- **Custom templates:** Stored in browser `localStorage` (key: `vyasa_custom_email_templates`)
- **Email logs:** Saved to `email_logs` table in Neon DB (synced across devices)
- **Branded header:** CSS-only (dark navy, VYASA serif + logo from app.vyasaa.com/logo.svg)

---

## Critical Patterns (Do Not Break)
1. **usePadStore** — always destructure: `const { settings: pad } = usePadStore()` NOT `const pad = usePadStore()`
2. **PWA** — `registerType: 'autoUpdate'` + `skipWaiting: true` + `clientsClaim: true` — do not revert
3. **visits table** — filter includes `OR doctor_id = userId` for solo-practice doctors with no clinic
4. **DB migrations** — new columns need `ALTER TABLE ADD COLUMN IF NOT EXISTS`, not schema edits
5. **Frontend deploy** — always `npm run build` first, then wrangler deploy
6. **Backend deploy** — git push triggers Render auto-deploy (~3 min cold start after)
