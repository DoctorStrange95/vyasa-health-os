// ─── Product analytics ── fire-and-forget, never blocks or breaks the app ────
//
// Captures HOW the product is used so the super-admin can understand usage,
// engagement, feature adoption, and user issues. NEVER logs patient PHI
// (no patient names / MRN / diagnosis) — only feature-usage metadata.

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'https://vyasa-os-backend.onrender.com';

// Stable per-tab session id — groups a user's events into one visit.
function sessionId(): string {
  try {
    let sid = sessionStorage.getItem('vyasa_sid');
    if (!sid) {
      sid = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem('vyasa_sid', sid);
    }
    return sid;
  } catch { return 's_anon'; }
}

// Current logged-in user, read from the persisted auth store (no import cycle).
function currentUser(): { user_id?: number; user_name?: string; role?: string } {
  try {
    const raw = localStorage.getItem('vyasa-auth');
    if (!raw) return {};
    const u = JSON.parse(raw)?.state?.user;
    if (!u) return {};
    return { user_id: u.id, user_name: u.name, role: u.role };
  } catch { return {}; }
}

interface QueuedEvent {
  event_type: string;
  metadata: Record<string, string>;
  user_id?: number; user_name?: string; role?: string;
  path?: string; session_id?: string;
}

let queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
  if (queue.length === 0) return;
  const batch = queue;
  queue = [];
  const body = JSON.stringify({ events: batch });
  // Prefer sendBeacon so events survive tab close / navigation.
  try {
    if (navigator.sendBeacon && batch.length > 0) {
      navigator.sendBeacon(`${BASE}/api/events/batch`, new Blob([body], { type: 'application/json' }));
      return;
    }
  } catch { /* fall through to fetch */ }
  fetch(`${BASE}/api/events/batch`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true,
  }).catch(() => {});
}

function scheduleFlush() {
  if (queue.length >= 10) { flush(); return; }
  if (!flushTimer) flushTimer = setTimeout(flush, 4000);
}

/** Track any product event. Safe to call anywhere — never throws. */
export function trackEvent(event_type: string, metadata: Record<string, string | number | boolean> = {}) {
  try {
    const meta: Record<string, string> = {};
    for (const [k, v] of Object.entries(metadata)) meta[k] = String(v);
    queue.push({
      event_type,
      metadata: meta,
      ...currentUser(),
      path: (typeof location !== 'undefined' ? location.pathname : '') || undefined,
      session_id: sessionId(),
    });
    scheduleFlush();
  } catch { /* analytics must never break the app */ }
}

/** Record a page/route view. */
export function trackPageView(path: string) {
  trackEvent('page_view', { path });
}

/** Capture an error/user-issue so it shows up in the admin "Issues" feed. */
export function trackError(message: string, extra: Record<string, string | number | boolean> = {}) {
  trackEvent('error', { message: message.slice(0, 300), ...extra });
}

// Global error + rejection capture, and flush on tab hide. Call once at startup.
let installed = false;
export function installAnalytics() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  window.addEventListener('error', (e) => {
    trackError(e.message || 'window.error', {
      src: e.filename ? `${e.filename}:${e.lineno ?? ''}` : '',
    });
  });
  window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
    const r: any = e.reason;
    trackError(typeof r === 'string' ? r : (r?.message || 'unhandledrejection'));
  });
  // Flush whatever's queued before the tab is hidden/closed.
  window.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  window.addEventListener('pagehide', flush);
}
