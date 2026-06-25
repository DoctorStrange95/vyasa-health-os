// ─── Product Analytics Dashboard ── live usage insight for the super-admin ───
//
// Surfaces: who's online now, engagement (DAU/WAU/MAU), feature adoption,
// errors / user issues (with per-user drill-down), device mix, and growth funnel.
// Reads the /admin/analytics/* endpoints. All data is feature-usage metadata —
// no patient PHI is ever captured.

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Activity, Users, Zap, AlertTriangle, TrendingUp, Smartphone, Monitor,
  RefreshCw, X, Clock, Flame, ChevronRight,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface LiveData {
  now: { online_5m?: number; online_30m?: number; events_1h?: number; events_24h?: number };
  online: { user_id: number; user_name: string; role: string; last_seen: string; events: number }[];
  recent: { event_type: string; user_name: string; role: string; path: string; metadata: any; created_at: string }[];
}
interface Engagement { dau: number; wau: number; mau: number; stickiness: number; trend: { day: string; active_users: number; events: number }[]; }
interface Feature { event_type: string; total: number; d1: number; d7: number; d30: number; users: number; }
interface UserRow { user_id: number; user_name: string; role: string; last_seen: string; events_total: number; events_7d: number; sessions: number; active_days: number; errors: number; top_feature: string; }
interface ErrorData { grouped: { message: string; count: number; users: number; last_seen: string }[]; recent: { user_id: number; user_name: string; role: string; path: string; metadata: any; created_at: string }[]; }
interface Devices { browsers: Bucket[]; os: Bucket[]; device: Bucket[]; }
interface Bucket { browser?: string; os?: string; device?: string; users: number; events: number; }
interface Growth { signups: number; approved: number; activated: number; signups_7d?: number; signups_30d?: number; signupTrend: { day: string; signups: number }[]; }
interface UserDetail {
  summary: { user_name?: string; role?: string; first_seen?: string; last_seen?: string; events_total?: number; sessions?: number; active_days?: number; errors?: number };
  features: { event_type: string; count: number }[];
  timeline: { event_type: string; path: string; metadata: any; created_at: string }[];
  sessions: { logged_in_at: string; ip_address: string; user_agent: string; location_label: string }[];
}

const ago = (t?: string) => {
  if (!t) return '—';
  const s = Math.floor((Date.now() - new Date(t).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};
const fmt = (n?: number) => (n ?? 0).toLocaleString();
const ROLE_COLOR: Record<string, string> = {
  doctor: 'bg-teal-100 text-teal-700', clinic_admin: 'bg-indigo-100 text-indigo-700',
  nurse: 'bg-rose-100 text-rose-700', pharmacist: 'bg-amber-100 text-amber-700',
  labtech: 'bg-violet-100 text-violet-700',
};
const roleBadge = (r?: string) => ROLE_COLOR[r ?? ''] ?? 'bg-slate-100 text-slate-600';

// ─── Small UI atoms ──────────────────────────────────────────────────────────
function Stat({ icon: Icon, label, value, sub, tone = 'slate' }: { icon: any; label: string; value: string | number; sub?: string; tone?: string }) {
  const tones: Record<string, string> = {
    slate: 'from-slate-50 to-white border-slate-200 text-slate-700',
    teal: 'from-teal-50 to-white border-teal-200 text-teal-700',
    emerald: 'from-emerald-50 to-white border-emerald-200 text-emerald-700',
    amber: 'from-amber-50 to-white border-amber-200 text-amber-700',
    rose: 'from-rose-50 to-white border-rose-200 text-rose-700',
    indigo: 'from-indigo-50 to-white border-indigo-200 text-indigo-700',
  };
  return (
    <div className={cn('rounded-2xl border bg-gradient-to-b p-4', tones[tone])}>
      <div className="flex items-center gap-2 text-xs font-semibold opacity-70"><Icon className="w-4 h-4" />{label}</div>
      <div className="text-3xl font-black mt-1 text-slate-900">{value}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function MiniBars({ data, max, color = 'bg-teal-400' }: { data: number[]; max: number; color?: string }) {
  return (
    <div className="flex items-end gap-0.5 h-12">
      {data.map((v, i) => (
        <div key={i} className="flex-1 rounded-sm bg-slate-100 relative" title={String(v)}>
          <div className={cn('absolute bottom-0 left-0 right-0 rounded-sm', color)}
            style={{ height: `${max ? Math.max(4, (v / max) * 100) : 0}%` }} />
        </div>
      ))}
    </div>
  );
}

function BarRow({ label, value, max, color = 'bg-teal-500', meta }: { label: string; value: number; max: number; color?: string; meta?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="w-44 truncate font-medium text-slate-700">{label}</div>
      <div className="flex-1 h-5 bg-slate-100 rounded-md overflow-hidden">
        <div className={cn('h-full rounded-md', color)} style={{ width: `${max ? Math.max(3, (value / max) * 100) : 0}%` }} />
      </div>
      <div className="w-20 text-right tabular-nums font-bold text-slate-800">{fmt(value)}</div>
      {meta && <div className="w-20 text-right text-xs text-slate-400">{meta}</div>}
    </div>
  );
}

// Friendly labels for known event types.
const EVENT_LABEL: Record<string, string> = {
  page_view: 'Page views', consult_saved: 'Consults saved', rx_printed: 'Prescriptions printed',
  ready_mix_used: 'Ready-Mix used', login_attempt: 'Login attempts', login_failed: 'Login failed',
  login_page_view: 'Login page views', error: 'Errors',
};
const evLabel = (t: string) => EVENT_LABEL[t] ?? t.replace(/_/g, ' ');

// ─── Main dashboard ──────────────────────────────────────────────────────────
export function AnalyticsDashboard() {
  const [live, setLive] = useState<LiveData | null>(null);
  const [eng, setEng] = useState<Engagement | null>(null);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [errs, setErrs] = useState<ErrorData | null>(null);
  const [devices, setDevices] = useState<Devices | null>(null);
  const [growth, setGrowth] = useState<Growth | null>(null);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const loadLive = useCallback(() => {
    api.get<LiveData>('/admin/analytics/live').then(setLive).catch(() => {});
    setLastRefresh(new Date());
  }, []);

  const loadAll = useCallback(() => {
    setLoading(true);
    Promise.allSettled([
      api.get<LiveData>('/admin/analytics/live').then(setLive),
      api.get<Engagement>('/admin/analytics/engagement').then(setEng),
      api.get<Feature[]>('/admin/analytics/features').then(setFeatures),
      api.get<UserRow[]>('/admin/analytics/users').then(setUsers),
      api.get<ErrorData>('/admin/analytics/errors').then(setErrs),
      api.get<Devices>('/admin/analytics/devices').then(setDevices),
      api.get<Growth>('/admin/analytics/growth-funnel').then(setGrowth),
    ]).finally(() => { setLoading(false); setLastRefresh(new Date()); });
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);
  // Live section auto-refreshes every 12s.
  useEffect(() => {
    const t = setInterval(loadLive, 12000);
    return () => clearInterval(t);
  }, [loadLive]);

  const openUser = (id: number) => {
    setDetailLoading(true);
    setDetail({ summary: {}, features: [], timeline: [], sessions: [] });
    api.get<UserDetail>(`/admin/analytics/user/${id}`).then(setDetail).catch(() => {}).finally(() => setDetailLoading(false));
  };

  const trendMax = Math.max(1, ...(eng?.trend ?? []).map(d => d.active_users));
  const featMax = Math.max(1, ...features.filter(f => f.event_type !== 'page_view').map(f => f.d30));
  const sigMax = Math.max(1, ...(growth?.signupTrend ?? []).map(d => d.signups));

  return (
    <div className="space-y-5">
      {/* Header / refresh */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Activity className="w-5 h-5 text-teal-500" /> Product Analytics</h2>
          <p className="text-xs text-slate-400">How doctors actually use Vyasa · live · no patient data captured</p>
        </div>
        <button onClick={loadAll} disabled={loading}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-1.5 hover:border-slate-300">
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} /> Refresh · updated {ago(lastRefresh.toISOString())}
        </button>
      </div>

      {/* ── LIVE PULSE ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={Flame} label="Online now (5 min)" value={fmt(live?.now.online_5m)} tone="emerald" sub="active users right now" />
        <Stat icon={Users} label="Active (30 min)" value={fmt(live?.now.online_30m)} tone="teal" />
        <Stat icon={Zap} label="Events / hour" value={fmt(live?.now.events_1h)} tone="indigo" />
        <Stat icon={Clock} label="Events / 24h" value={fmt(live?.now.events_24h)} tone="slate" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Who's online */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Online now ({live?.online.length ?? 0})
          </div>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {(live?.online ?? []).map(u => (
              <button key={u.user_id} onClick={() => openUser(u.user_id)}
                className="w-full flex items-center gap-2 text-left px-2 py-1.5 rounded-lg hover:bg-slate-50">
                <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded uppercase', roleBadge(u.role))}>{u.role || '—'}</span>
                <span className="text-sm font-medium text-slate-800 flex-1 truncate">{u.user_name || `User ${u.user_id}`}</span>
                <span className="text-xs text-slate-400">{u.events} ev · {ago(u.last_seen)}</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              </button>
            ))}
            {(live?.online ?? []).length === 0 && <div className="text-xs text-slate-400 py-6 text-center">No one active in the last 30 minutes.</div>}
          </div>
        </div>

        {/* Live activity feed */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-sm font-bold text-slate-700 mb-2">Live activity feed</div>
          <div className="space-y-1 max-h-64 overflow-y-auto font-mono text-[11px]">
            {(live?.recent ?? []).map((e, i) => (
              <div key={i} className={cn('flex items-center gap-2 px-1.5 py-1 rounded', e.event_type === 'error' && 'bg-rose-50')}>
                <span className="text-slate-400 w-14 shrink-0">{ago(e.created_at)}</span>
                <span className={cn('font-bold shrink-0', e.event_type === 'error' ? 'text-rose-600' : 'text-teal-600')}>{e.event_type}</span>
                <span className="text-slate-500 truncate">{e.user_name || 'anon'} {e.path ? `· ${e.path}` : ''}</span>
              </div>
            ))}
            {(live?.recent ?? []).length === 0 && <div className="text-xs text-slate-400 py-6 text-center font-sans">No recent events yet.</div>}
          </div>
        </div>
      </div>

      {/* ── ENGAGEMENT ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-indigo-500" /> Engagement</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <Stat icon={Users} label="DAU" value={fmt(eng?.dau)} tone="teal" sub="daily active users" />
          <Stat icon={Users} label="WAU" value={fmt(eng?.wau)} tone="indigo" sub="weekly active" />
          <Stat icon={Users} label="MAU" value={fmt(eng?.mau)} tone="slate" sub="monthly active" />
          <Stat icon={Flame} label="Stickiness" value={`${eng?.stickiness ?? 0}%`} tone="emerald" sub="DAU / MAU" />
        </div>
        <div className="text-xs font-semibold text-slate-500 mb-1">Active users · last 30 days</div>
        <MiniBars data={(eng?.trend ?? []).map(d => d.active_users)} max={trendMax} color="bg-indigo-400" />
        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
          <span>{eng?.trend?.[0]?.day?.slice(5)}</span><span>today</span>
        </div>
      </div>

      {/* ── FEATURE USAGE ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><Zap className="w-4 h-4 text-teal-500" /> Feature usage <span className="text-xs font-normal text-slate-400">· last 30 days</span></div>
        <div className="space-y-2">
          {features.filter(f => f.event_type !== 'page_view').slice(0, 15).map(f => (
            <BarRow key={f.event_type} label={evLabel(f.event_type)} value={Number(f.d30)} max={featMax}
              color={f.event_type === 'error' ? 'bg-rose-400' : 'bg-teal-500'} meta={`${fmt(Number(f.users))} users`} />
          ))}
          {features.length === 0 && <div className="text-xs text-slate-400 py-4 text-center">No feature events yet — usage will appear as doctors work.</div>}
        </div>
      </div>

      {/* ── ERRORS / USER ISSUES ── */}
      <div className="rounded-2xl border border-rose-200 bg-rose-50/30 p-4">
        <div className="text-sm font-bold text-rose-700 mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Errors & user issues <span className="text-xs font-normal text-rose-400">· {errs?.recent.length ?? 0} recent</span></div>
        <div className="grid lg:grid-cols-2 gap-4">
          <div>
            <div className="text-xs font-semibold text-slate-500 mb-1.5">Top error messages</div>
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {(errs?.grouped ?? []).map((g, i) => (
                <div key={i} className="flex items-center gap-2 text-xs bg-white border border-rose-100 rounded-lg px-2.5 py-1.5">
                  <span className="font-bold text-rose-600 tabular-nums w-8">{g.count}×</span>
                  <span className="flex-1 truncate text-slate-700" title={g.message}>{g.message}</span>
                  <span className="text-slate-400 shrink-0">{g.users}u · {ago(g.last_seen)}</span>
                </div>
              ))}
              {(errs?.grouped ?? []).length === 0 && <div className="text-xs text-emerald-600 py-4 text-center">✓ No errors recorded. Clean!</div>}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 mb-1.5">Latest occurrences (click to inspect user)</div>
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {(errs?.recent ?? []).map((e, i) => (
                <button key={i} onClick={() => e.user_id && openUser(e.user_id)}
                  className="w-full text-left flex items-start gap-2 text-[11px] bg-white border border-rose-100 rounded-lg px-2.5 py-1.5 hover:border-rose-300">
                  <span className="text-slate-400 shrink-0 w-12">{ago(e.created_at)}</span>
                  <span className="flex-1">
                    <span className="font-semibold text-slate-700">{e.user_name || 'anon'}</span>
                    <span className="text-slate-400"> · {e.path}</span>
                    <div className="text-rose-600 truncate">{e.metadata?.message || 'error'}</div>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── DEVICES + GROWTH ── */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><Smartphone className="w-4 h-4 text-violet-500" /> Devices & browsers <span className="text-xs font-normal text-slate-400">· 30 days</span></div>
          <div className="space-y-3">
            <DeviceGroup title="Device" items={(devices?.device ?? []).map(d => ({ label: d.device!, value: Number(d.users) }))} icon={Monitor} />
            <DeviceGroup title="OS" items={(devices?.os ?? []).map(d => ({ label: d.os!, value: Number(d.users) }))} icon={Smartphone} />
            <DeviceGroup title="Browser" items={(devices?.browsers ?? []).map(d => ({ label: d.browser!, value: Number(d.users) }))} icon={Monitor} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-500" /> Growth funnel</div>
          <div className="space-y-2 mb-4">
            <FunnelStep label="Signed up" value={Number(growth?.signups ?? 0)} total={Number(growth?.signups ?? 1)} color="bg-slate-400" />
            <FunnelStep label="Approved" value={Number(growth?.approved ?? 0)} total={Number(growth?.signups ?? 1)} color="bg-indigo-400" />
            <FunnelStep label="Activated (1st consult)" value={Number(growth?.activated ?? 0)} total={Number(growth?.signups ?? 1)} color="bg-emerald-500" />
          </div>
          <div className="text-xs font-semibold text-slate-500 mb-1">New signups · last 30 days</div>
          <MiniBars data={(growth?.signupTrend ?? []).map(d => d.signups)} max={sigMax} color="bg-emerald-400" />
          <div className="text-[11px] text-slate-400 mt-1">{fmt(growth?.signups_7d)} this week · {fmt(growth?.signups_30d)} this month</div>
        </div>
      </div>

      {/* ── PER-USER LEADERBOARD ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-teal-500" /> User activity <span className="text-xs font-normal text-slate-400">· click a user to see their full timeline</span></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-400 border-b border-slate-100">
                <th className="text-left py-2 px-2 font-semibold">User</th>
                <th className="text-left py-2 px-2 font-semibold">Role</th>
                <th className="text-right py-2 px-2 font-semibold">Last seen</th>
                <th className="text-right py-2 px-2 font-semibold">7d events</th>
                <th className="text-right py-2 px-2 font-semibold">Active days</th>
                <th className="text-right py-2 px-2 font-semibold">Sessions</th>
                <th className="text-right py-2 px-2 font-semibold">Errors</th>
                <th className="text-left py-2 px-2 font-semibold">Top feature</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.user_id} onClick={() => openUser(u.user_id)} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer">
                  <td className="py-2 px-2 font-medium text-slate-800">{u.user_name || `User ${u.user_id}`}</td>
                  <td className="py-2 px-2"><span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded uppercase', roleBadge(u.role))}>{u.role || '—'}</span></td>
                  <td className="py-2 px-2 text-right text-slate-500">{ago(u.last_seen)}</td>
                  <td className="py-2 px-2 text-right font-semibold tabular-nums">{fmt(Number(u.events_7d))}</td>
                  <td className="py-2 px-2 text-right tabular-nums">{fmt(Number(u.active_days))}</td>
                  <td className="py-2 px-2 text-right tabular-nums">{fmt(Number(u.sessions))}</td>
                  <td className={cn('py-2 px-2 text-right tabular-nums font-semibold', Number(u.errors) > 0 ? 'text-rose-600' : 'text-slate-300')}>{fmt(Number(u.errors))}</td>
                  <td className="py-2 px-2 text-slate-500">{u.top_feature ? evLabel(u.top_feature) : '—'}</td>
                </tr>
              ))}
              {users.length === 0 && <tr><td colSpan={8} className="text-center text-xs text-slate-400 py-6">No user activity captured yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── USER DRILL-DOWN MODAL ── */}
      {detail && (
        <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <div>
                <div className="font-bold text-slate-800 flex items-center gap-2">
                  {detail.summary.user_name || 'User'}
                  <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded uppercase', roleBadge(detail.summary.role))}>{detail.summary.role}</span>
                </div>
                <div className="text-xs text-slate-400">
                  {fmt(detail.summary.events_total)} events · {fmt(detail.summary.sessions)} sessions · {fmt(detail.summary.active_days)} active days
                  {Number(detail.summary.errors) > 0 && <span className="text-rose-500"> · {fmt(detail.summary.errors)} errors</span>}
                </div>
              </div>
              <button onClick={() => setDetail(null)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto p-5 space-y-4">
              {detailLoading ? <div className="text-center text-sm text-slate-400 py-10">Loading…</div> : <>
                <div>
                  <div className="text-xs font-semibold text-slate-500 mb-1.5">Most-used features</div>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.features.map(f => (
                      <span key={f.event_type} className="text-xs bg-slate-100 rounded-lg px-2 py-1 text-slate-700">{evLabel(f.event_type)} <b>{f.count}</b></span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500 mb-1.5">Recent sessions</div>
                  <div className="space-y-1 text-[11px]">
                    {detail.sessions.map((s, i) => (
                      <div key={i} className="flex gap-2 text-slate-500">
                        <span className="w-28 shrink-0">{ago(s.logged_in_at)}</span>
                        <span className="truncate">{s.location_label || s.ip_address || '—'}</span>
                      </div>
                    ))}
                    {detail.sessions.length === 0 && <div className="text-slate-400">No login sessions recorded.</div>}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500 mb-1.5">Activity timeline (newest first)</div>
                  <div className="space-y-0.5 font-mono text-[11px] max-h-64 overflow-y-auto">
                    {detail.timeline.map((e, i) => (
                      <div key={i} className={cn('flex items-center gap-2 px-1.5 py-1 rounded', e.event_type === 'error' && 'bg-rose-50')}>
                        <span className="text-slate-400 w-14 shrink-0">{ago(e.created_at)}</span>
                        <span className={cn('font-bold shrink-0 w-36 truncate', e.event_type === 'error' ? 'text-rose-600' : 'text-teal-600')}>{e.event_type}</span>
                        <span className="text-slate-500 truncate">{e.path}{e.metadata?.message ? ` · ${e.metadata.message}` : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DeviceGroup({ title, items, icon: Icon }: { title: string; items: { label: string; value: number }[]; icon: any }) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  return (
    <div>
      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1"><Icon className="w-3 h-3" />{title}</div>
      <div className="space-y-1">
        {items.map(i => (
          <div key={i.label} className="flex items-center gap-2 text-xs">
            <span className="w-16 text-slate-600">{i.label}</span>
            <div className="flex-1 h-3 bg-slate-100 rounded overflow-hidden"><div className="h-full bg-violet-400 rounded" style={{ width: `${(i.value / total) * 100}%` }} /></div>
            <span className="w-16 text-right text-slate-500">{i.value} ({Math.round((i.value / total) * 100)}%)</span>
          </div>
        ))}
        {items.length === 0 && <div className="text-xs text-slate-300">No data</div>}
      </div>
    </div>
  );
}

function FunnelStep({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="w-44 text-slate-600">{label}</div>
      <div className="flex-1 h-6 bg-slate-100 rounded-md overflow-hidden">
        <div className={cn('h-full rounded-md flex items-center justify-end pr-2 text-[10px] font-bold text-white', color)} style={{ width: `${Math.max(8, pct)}%` }}>{pct}%</div>
      </div>
      <div className="w-12 text-right font-bold tabular-nums text-slate-800">{fmt(value)}</div>
    </div>
  );
}
