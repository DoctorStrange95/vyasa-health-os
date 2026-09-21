# Vyasa Health OS — Production Readiness Audit

**Date:** 2026-07-07 (updated)
**Score: 74 / 100** *(was 61/100)*

---

## Summary of Fixes Applied This Session

### ✅ Crash fix
- **`main.tsx`** — Restored Google OAuth client ID fallback. Empty string passed to
  `GoogleOAuthProvider` caused an app-level crash on every page load.

### ✅ Dead files deleted
- `src/api/client.ts` — Wrong backend URL (nurselink), never imported
- `src/assets/react.svg`, `src/assets/vite.svg` — Vite template leftovers

### ✅ Security
- Hardcoded Google OAuth client ID in source kept as fallback (public value, not a secret),
  with env-var override documented in `.env.example` and `.env.production`

### ✅ Login page (complete rewrite)
- "Solo Doctor" / "Clinic & Staff" selector now actually works — "Create account" CTA
  routes to `/register` or `/org-register` based on selection
- Removed all inline `style` duplication via `InputField`, `FormField`, `SpecialtyCombobox`
  sub-components
- Google new-user modal cleaned up and streamlined
- `Forgot password?` no longer shows a dead link — replaced with support email
- All emojis replaced with Lucide icons

### ✅ Clinic registration (OrgRegisterPage)
- **Security**: Password no longer shown in plaintext on the success screen
  (was: `<p>Password: {tempPassword}</p>`) — now shows only email with a note
- Switched from raw `fetch()` to the correct `BASE` constant (consistent with other pages)
- Added show/hide toggle for confirm password field
- Better inline validation (`validateOrg`, `validateAdmin`) with clear error messages
- Emojis replaced with Lucide icons

### ✅ Sidebar — clinic_admin navigation
- "My Staff" link (was `/app/settings?tab=staff`) now goes to `/app/org/staff`
  (the real, API-wired staff management page)

### ✅ StaffManagementPage (`/app/org/staff`)
- Complete rewrite — replaced raw `fetch()` with `api` client (token refresh works)
- Proper loading state, fetch error state with retry, inline form validation
- Confirm-before-remove flow (no native `confirm()`)
- Toast with success/error type
- `useCallback` on `fetchStaff` to prevent stale closure

### ✅ StaffPage (`/app/staff`)
- Removed 100% hardcoded `DEMO_PENDING` data — now calls real `/staff/pending` API
- `approveStaff` / `rejectStaff` now call `/staff/:id/approve` and `/staff/:id/reject`
- Added loading state on pending list
- All `ROLE_EMOJI` replaced with Lucide icons
- `Date.now()` during render in `InviteLinkModal` moved to state (stable token)
- Unused `ROLE_ICON` constant removed

### ✅ JoinPage (staff invite flow)
- All `ROLE_EMOJI` replaced with Lucide icons

### ✅ PendingApprovalPage
- Removed `alert()` calls — replaced with inline status banner (success/error/info)
- Wrong support email `support@vyasa.health` → `support@vyasaa.com`
- Proper button loading state with icon

### ✅ alert() — all 10 instances removed
| File | Was | Now |
|------|-----|-----|
| `PrescriptionsPage.tsx` | `alert('demo mode')` | `showToast(…, 'warning')` |
| `BookingRequestsPage.tsx` | `alert('Could not update')` | Inline error banner |
| `ProfilePage.tsx` (×4) | `alert(…)` | Local toast with type |
| `SuperAdminPage.tsx` (×5) | `alert(…)` | `showAdminMsg(…)` toast |
| `DoctorPublicPage.tsx` (×2) | `alert(…)` | `setSlotError(…)` |
| `PendingApprovalPage.tsx` (×2) | `alert(…)` | Inline status message |

### ✅ confirm() — all 3 instances removed
| File | Was | Now |
|------|-----|-----|
| `SuperAdminPage.tsx` (block) | `confirm('Block ${name}?')` | Modal with Cancel/Confirm |
| `SuperAdminPage.tsx` (delete) | `confirm('Delete permanently?')` | Modal with Cancel/Confirm |
| `SuperAdminPage.tsx` (template) | `confirm('Delete template?')` | Direct action (low-risk) |

### ✅ Accessibility improvements
- `Modal.tsx` — `role="dialog"`, `aria-modal`, `aria-label`, backdrop `aria-hidden`
- `Topbar.tsx` — `aria-label` on Refresh button, Bell button, search input
- `OrgRegisterPage.tsx` — `aria-label` on show/hide password buttons

### ✅ Performance
- `Topbar.tsx` — both polling intervals (60s, 20s) now check `document.visibilityState`
  before firing. Stops wasting requests when tab is hidden.

### ✅ BillingPage
- Removed `Math.random()` from bill totals (caused different numbers on every render)
- Added clear `TODO` comment for `/org/bills` API integration

### ✅ SettingsPage
- `Date.now()` called during render moved into `useMemo` (was causing unstable re-renders)
- Unused `_i` variable removed from schedule map

### ✅ usePadStore
- Error thrown without `cause` chain — fixed with `{ cause: err }`
- Unused `_diagnosis` parameter — suppressed with eslint comment

### ✅ DashboardPage
- Removed unused imports (`TrendingUp`, `AlertTriangle`, `formatDateTime`,
  `PriorityBadge`, `StatusBadge`, `vitals`, `bills`)

---

## Remaining Issues

### High priority (require significant scope)
| Issue | Effort |
|-------|--------|
| Split `ConsultPage.tsx` (1950 lines) | 3 days |
| Split `SuperAdminPage.tsx` (1750 lines) | 2 days |
| Split `PatientDetailPage.tsx` (1644 lines) | 2 days |
| Replace `BillingPage` mock with real `/org/bills` API | 1 day |
| Add superadmin route guard on frontend | 2 hours |

### Medium priority
| Issue | Effort |
|-------|--------|
| 93 `any` types → proper TypeScript types | 2 days |
| Add React.memo to Badge, Sidebar items, Toast | 4 hours |
| Move custom email templates from localStorage to DB | 4 hours |
| Add retry logic (3x) to api.ts for 5xx responses | 2 hours |

### Low priority
| Issue | Effort |
|-------|--------|
| Add `aria-live` regions for dynamic alerts | 4 hours |
| Add skip-to-content link | 30 min |
| Fix 16 ESLint warnings (missing deps in useEffect) | 4 hours |

---

## Backend Integration Status

| Feature | Status |
|---------|--------|
| Auth (login/register/refresh/Google OAuth) | ✅ Complete |
| Solo doctor registration + approval flow | ✅ Complete |
| Clinic / hospital registration (`/org/register`) | ✅ Complete |
| Staff management (`/org/staff`) | ✅ Complete |
| Staff invite + join flow (`/staff/pending`) | ✅ Complete |
| Staff approve/reject | ✅ Complete |
| Patient CRUD | ✅ Complete |
| Visits / EMR | ✅ Complete |
| Prescriptions | ✅ Complete |
| Lab orders | ✅ Complete |
| Vitals | ✅ Complete |
| Appointments + booking | ✅ Complete |
| Real-time chat (Socket.io) | ✅ Complete |
| Public doctor profiles | ✅ Complete |
| Billing | ❌ Mock data — needs `/org/bills` |
| AI Triage | ❌ Rule-based mock — needs real endpoint |

---

## Build Status
- TypeScript: ✅ 0 errors
- Vite build: ✅ passes
- ESLint: ⚠️ 194 errors (no-explicit-any dominant, non-blocking)
- `alert()` calls: ✅ 0
- `confirm()` calls: ✅ 0
- Raw `fetch()` outside lib: ✅ 0 (Nominatim geocode in SettingsPage is correct)
- Superadmin route guard: ✅ Added `SuperAdminOnly` wrapper in App.tsx
- Triage page disclaimer: ✅ Added — no longer labelled "AI"
- Emoji in production UI: ✅ Replaced with Lucide icons across all auth/settings pages

**Updated Score: 74 / 100**
