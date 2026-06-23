import { useState, useEffect, useCallback } from 'react';
import {
  Users, UserCheck, Clock, ShieldCheck, Search, RefreshCw,
  Loader2, CheckCircle2, XCircle, CalendarClock, Activity, ClipboardList, X, Trash2,
  Stethoscope, TrendingUp, CalendarCheck, BarChart2, ChevronDown, ChevronRight,
  Mail, Send, Eye, Plus, Edit2, FileText,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { sendEmail, sendDirectEmail, EMAIL_TEMPLATES } from '@/lib/emailService';

interface AdminUser {
  id: number; name: string; email: string; role: string;
  specialty: string | null; degrees: string | null; phone: string | null;
  reg_number: string | null; license_number: string | null;
  state: string | null; city: string | null; profile_slug: string | null;
  approval_status: 'pending' | 'approved' | 'rejected' | 'suspended';
  rejection_reason: string | null;
  created_at: string; last_login: string | null; login_count: number;
}

interface DoctorOverview {
  id: number; name: string; email: string; specialty: string | null;
  degrees: string | null; phone: string | null;
  reg_number: string | null; license_number: string | null;
  city: string | null; state: string | null; profile_slug: string | null;
  approval_status: string; created_at: string; approved_at: string | null;
  clinic_id: string | null; clinic_name: string | null;
  consultation_fee: number | null; years_experience: number | null;
  total_bookings: number; confirmed_bookings: number; pending_bookings: number;
  total_visits: number; total_patients: number;
  login_count: number; last_login: string | null;
  show_in_directory: boolean;
}

interface AdminStats {
  users: { total: string; approved: string; pending: string; rejected: string; doctors: string; new_this_week: string };
  patients: { total: string };
  visits: { total: string };
  bookings: { total: string; pending: string; this_week: string };
  logins: { total: string; last_24h: string };
}

interface LoginSession {
  logged_in_at: string; ip_address: string | null; user_agent: string | null;
  location_label: string | null; lat: number | null; lng: number | null;
}

interface CustomTemplate {
  id: string; name: string; subject: string; body: string;
}

interface EmailLog {
  id: number;
  recipient_id: number | null;
  recipient_email: string;
  recipient_name: string;
  template_name: string;
  subject: string;
  sent_at: string;
}

const CUSTOM_TPL_KEY = 'vyasa_custom_email_templates';
function loadCustomTemplates(): CustomTemplate[] {
  try { return JSON.parse(localStorage.getItem(CUSTOM_TPL_KEY) ?? '[]'); } catch { return []; }
}
function persistCustomTemplates(tpls: CustomTemplate[]) {
  localStorage.setItem(CUSTOM_TPL_KEY, JSON.stringify(tpls));
}

function fmtDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  suspended: 'bg-slate-100 text-slate-600 border-slate-300',
};

const ROLE_LABELS: Record<string, string> = {
  clinic_admin: 'Solo Doctor', doctor: 'Doctor', nurse: 'Nurse', pharmacist: 'Pharmacist',
  labtech: 'Lab Tech', admin: 'Hospital Admin', billing: 'Billing', receptionist: 'Reception',
  patient: 'Patient',
};

type Filter = 'pending' | 'all' | 'approved' | 'rejected';
type MainTab = 'users' | 'doctors' | 'templates' | 'activity';
type DoctorFilter = 'all' | 'active' | 'inactive' | 'dormant';

interface RecentLogin {
  id: number; name: string; email: string; specialty: string | null;
  city: string | null; state: string | null;
  logged_in_at: string; ip_address: string | null;
  location_label: string | null; lat: number | null; lng: number | null;
  user_agent: string | null;
}

interface GeoSummary {
  location: string; state: string | null; login_count: number; unique_doctors: number;
}

// ─── Activity helpers ─────────────────────────────────────────────────────────

function daysSince(iso: string | null): number {
  if (!iso) return 9999;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

function activityBadge(lastLogin: string | null, loginCount: number) {
  if (!lastLogin || loginCount === 0) return { label: 'Never logged in', cls: 'bg-slate-100 text-slate-500 border-slate-200' };
  const d = daysSince(lastLogin);
  if (d <= 14) return { label: 'Active', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (d <= 60) return { label: `Inactive · ${d}d`, cls: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { label: `Dormant · ${d}d`, cls: 'bg-red-50 text-red-600 border-red-200' };
}

// ─── Email compose modal ──────────────────────────────────────────────────────

const OUTREACH_TEMPLATES = [
  { key: 'INACTIVE_30_DAYS',  label: 'We miss you (30 days inactive)',       icon: '👋' },
  { key: 'INACTIVE_60_DAYS',  label: 'Account review warning (60+ days)',     icon: '⚠️' },
  { key: 'FEATURE_HIGHLIGHT', label: 'New features highlight',                icon: '🆕' },
  { key: 'PATIENT_WAITING',   label: 'Patients are waiting for you',          icon: '🩺' },
  { key: 'ACCOUNT_REVIEW',    label: 'Scheduled account review',              icon: '📋' },
  { key: 'CUSTOM',            label: 'Custom message',                        icon: '✏️' },
];

interface EmailModal {
  doc: DoctorOverview;
  templateKey: string;
  subject: string;
  body: string;
  preview: boolean;
  sending: boolean;
  sent: boolean;
}

function buildEmail(templateKey: string, doc: DoctorOverview): { subject: string; body: string } {
  const tpl = EMAIL_TEMPLATES[templateKey as keyof typeof EMAIL_TEMPLATES];
  if (!tpl) return { subject: '', body: '' };
  const vars: Record<string, string> = {
    doctorName: doc.name,
    subject: tpl.subject,
    body: '',
    profileSlug: doc.profile_slug ?? '',
    rejectionReason: '',
  };
  let subject = tpl.subject;
  let body = tpl.body;
  Object.entries(vars).forEach(([k, v]) => {
    subject = subject.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    body = body.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
  });
  return { subject, body };
}

function EmailComposeModal({
  initial, onClose, onSent, customTemplates = [],
}: {
  initial: EmailModal; onClose: () => void;
  onSent?: (log: Pick<EmailLog, 'recipient_id' | 'recipient_email' | 'recipient_name' | 'template_name' | 'subject'>) => void;
  customTemplates?: CustomTemplate[];
}) {
  const [state, setState] = useState(initial);

  function pickTemplate(key: string, custom?: CustomTemplate) {
    if (custom) {
      let subject = custom.subject;
      let body = custom.body;
      const vars: Record<string, string> = { doctorName: state.doc.name, profileSlug: state.doc.profile_slug ?? '' };
      Object.entries(vars).forEach(([k, v]) => {
        subject = subject.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
        body = body.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
      });
      setState(s => ({ ...s, templateKey: `custom:${key}`, subject, body, preview: false }));
    } else {
      const { subject, body } = buildEmail(key, state.doc);
      setState(s => ({ ...s, templateKey: key, subject, body, preview: false }));
    }
  }

  async function doSend() {
    setState(s => ({ ...s, sending: true }));
    try {
      await sendDirectEmail(state.doc.email, state.subject, state.body);
      setState(s => ({ ...s, sending: false, sent: true }));
      onSent?.({
        recipient_id: state.doc.id,
        recipient_email: state.doc.email,
        recipient_name: state.doc.name,
        template_name: state.templateKey,
        subject: state.subject,
      });
      setTimeout(onClose, 1500);
    } catch {
      setState(s => ({ ...s, sending: false }));
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-teal-600" /> Email Dr. {state.doc.name}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">{state.doc.email} · from support@vyasaa.com</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Doctor activity summary */}
          <div className="bg-slate-50 rounded-xl p-3 text-xs flex flex-wrap gap-x-5 gap-y-1 text-slate-500">
            {(() => { const b = activityBadge(state.doc.last_login, state.doc.login_count); return (
              <span className={cn('font-semibold px-2 py-0.5 rounded-full border text-xs', b.cls)}>{b.label}</span>
            ); })()}
            <span>Last login: {fmtDateTime(state.doc.last_login)}</span>
            <span>{state.doc.total_visits} consults · {state.doc.total_bookings} bookings</span>
          </div>

          {/* Template picker */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Select Template</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {OUTREACH_TEMPLATES.map(t => (
                <button
                  key={t.key}
                  onClick={() => pickTemplate(t.key)}
                  className={cn(
                    'text-left px-3 py-2.5 rounded-xl border text-sm font-semibold transition-colors cursor-pointer',
                    state.templateKey === t.key
                      ? 'bg-teal-50 border-teal-300 text-teal-800'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-teal-200 hover:bg-teal-50/40'
                  )}
                >
                  <span className="mr-1.5">{t.icon}</span>{t.label}
                </button>
              ))}
              {customTemplates.map(t => (
                <button
                  key={t.id}
                  onClick={() => pickTemplate(t.id, t)}
                  className={cn(
                    'text-left px-3 py-2.5 rounded-xl border text-sm font-semibold transition-colors cursor-pointer',
                    state.templateKey === `custom:${t.id}`
                      ? 'bg-violet-50 border-violet-300 text-violet-800'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-violet-200 hover:bg-violet-50/40'
                  )}
                >
                  <FileText className="w-3.5 h-3.5 inline mr-1.5 opacity-60" />{t.name}
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Subject</label>
            <input
              value={state.subject}
              onChange={e => setState(s => ({ ...s, subject: e.target.value }))}
              className="input w-full text-sm"
              placeholder="Email subject…"
            />
          </div>

          {/* Body / Preview toggle */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Message Body</label>
              <button
                onClick={() => setState(s => ({ ...s, preview: !s.preview }))}
                className="flex items-center gap-1 text-xs text-teal-600 font-semibold hover:underline cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                {state.preview ? 'Edit' : 'Preview'}
              </button>
            </div>
            {state.preview ? (
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-mono max-h-64 overflow-y-auto">
                {state.body}
              </div>
            ) : (
              <textarea
                rows={10}
                value={state.body}
                onChange={e => setState(s => ({ ...s, body: e.target.value }))}
                className="input resize-none w-full text-sm font-mono"
                placeholder="Email body…"
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-slate-100 flex-shrink-0">
          <p className="text-xs text-slate-400">Sent via Brevo from support@vyasaa.com</p>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary btn-sm">Cancel</button>
            <button
              onClick={doSend}
              disabled={state.sending || state.sent || !state.subject || !state.body}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm text-white transition-colors cursor-pointer',
                state.sent ? 'bg-emerald-500' : 'bg-teal-600 hover:bg-teal-700 disabled:opacity-50'
              )}
            >
              {state.sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {state.sent ? 'Sent!' : state.sending ? 'Sending…' : 'Send Email'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Doctor Overview Card ─────────────────────────────────────────────────────

function DoctorCard({ doc, onEmail, emailLogs }: { doc: DoctorOverview; onEmail: (doc: DoctorOverview) => void; emailLogs: EmailLog[] }) {
  const docLogs = emailLogs.filter(l => l.recipient_id === doc.id || l.recipient_email === doc.email);
  const [expanded, setExpanded] = useState(false);
  const [showInDir, setShowInDir] = useState(doc.show_in_directory);
  const [dirToggling, setDirToggling] = useState(false);

  async function toggleDirectory() {
    setDirToggling(true);
    try {
      const { api } = await import('@/lib/api');
      await api.patch(`/admin/doctors/${doc.id}/directory`, { show: !showInDir });
      setShowInDir(v => !v);
    } catch { /* ignore */ } finally {
      setDirToggling(false);
    }
  }

  const badge = activityBadge(doc.last_login, doc.login_count);

  const statChips = [
    { icon: CalendarCheck, label: 'Bookings', value: doc.total_bookings, color: 'text-violet-600', bg: 'bg-violet-50' },
    { icon: CheckCircle2, label: 'Confirmed', value: doc.confirmed_bookings, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { icon: Clock, label: 'Pending', value: doc.pending_bookings, color: 'text-amber-600', bg: 'bg-amber-50' },
    { icon: Stethoscope, label: 'Visits', value: doc.total_visits, color: 'text-teal-600', bg: 'bg-teal-50' },
    { icon: Users, label: 'Patients', value: doc.total_patients, color: 'text-blue-600', bg: 'bg-blue-50' },
    { icon: Activity, label: 'Logins', value: doc.login_count, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  return (
    <div className="card overflow-hidden">
      {/* Header row */}
      <div
        className="flex items-start gap-3 p-4 sm:p-5 cursor-pointer hover:bg-slate-50/50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Avatar */}
        <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0 border border-teal-100">
          <Stethoscope className="w-5 h-5 text-teal-600" />
        </div>

        {/* Identity */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-800">{doc.name}</span>
            {doc.specialty && (
              <span className="text-xs text-teal-700 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full font-semibold">{doc.specialty}</span>
            )}
            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', badge.cls)}>{badge.label}</span>
            {docLogs.length > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-violet-50 text-violet-700 border-violet-200 flex items-center gap-1">
                <Mail className="w-2.5 h-2.5" />{docLogs.length} emailed
              </span>
            )}
          </div>
          <div className="text-sm text-slate-500 mt-0.5">{doc.email}</div>
          {(doc.city || doc.state) && (
            <div className="text-xs text-slate-400 mt-0.5">{[doc.city, doc.state].filter(Boolean).join(', ')}</div>
          )}
        </div>

        {/* Quick stats */}
        <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
          <div className="text-center">
            <div className="text-lg font-bold text-violet-600">{doc.total_bookings}</div>
            <div className="text-[10px] text-slate-400 font-semibold">BOOKINGS</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-teal-600">{doc.total_visits}</div>
            <div className="text-[10px] text-slate-400 font-semibold">CONSULTS</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">{doc.total_patients}</div>
            <div className="text-[10px] text-slate-400 font-semibold">PATIENTS</div>
          </div>
        </div>

        {/* Expand icon */}
        <div className="flex-shrink-0 ml-1">
          {expanded
            ? <ChevronDown className="w-4 h-4 text-slate-400" />
            : <ChevronRight className="w-4 h-4 text-slate-400" />
          }
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-slate-100 px-4 sm:px-5 py-4 space-y-4 bg-slate-50/40">
          {/* Stat chips */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {statChips.map(c => (
              <div key={c.label} className={cn('rounded-xl p-3 text-center', c.bg)}>
                <c.icon className={cn('w-4 h-4 mx-auto mb-1', c.color)} />
                <div className={cn('text-xl font-bold', c.color)}>{c.value}</div>
                <div className="text-[10px] font-semibold text-slate-500">{c.label}</div>
              </div>
            ))}
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
            {doc.degrees && (
              <div><span className="text-slate-400 text-xs">Degrees</span><div className="font-semibold text-slate-700">{doc.degrees}</div></div>
            )}
            {(doc.license_number || doc.reg_number) && (
              <div><span className="text-slate-400 text-xs">MCI / License</span><div className="font-bold text-slate-800">{doc.license_number || doc.reg_number}</div></div>
            )}
            {doc.phone && (
              <div><span className="text-slate-400 text-xs">Phone</span><div className="font-semibold text-teal-600">{doc.phone}</div></div>
            )}
            {doc.clinic_name && (
              <div><span className="text-slate-400 text-xs">Clinic</span><div className="font-semibold text-slate-700">{doc.clinic_name}</div></div>
            )}
            {doc.consultation_fee != null && (
              <div><span className="text-slate-400 text-xs">Consultation Fee</span><div className="font-semibold text-slate-700">₹{doc.consultation_fee}</div></div>
            )}
            {doc.years_experience != null && doc.years_experience > 0 && (
              <div><span className="text-slate-400 text-xs">Experience</span><div className="font-semibold text-slate-700">{doc.years_experience} yrs</div></div>
            )}
            {doc.profile_slug && (
              <div><span className="text-slate-400 text-xs">Profile Slug</span><div className="font-semibold text-slate-700">/{doc.profile_slug}</div></div>
            )}
          </div>

          {/* Directory toggle + Email action row */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-3 gap-3 flex-wrap">
            <div className="flex items-center justify-between flex-1 gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-700">Show in Doctor Directory</div>
                <div className="text-xs text-slate-400">Controls visibility on vyasaa.com/doctors</div>
              </div>
              <button
                onClick={toggleDirectory}
                disabled={dirToggling}
                className={cn(
                  'relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0',
                  showInDir ? 'bg-teal-500' : 'bg-slate-300',
                  dirToggling && 'opacity-50 cursor-not-allowed'
                )}
              >
                <span className={cn(
                  'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200',
                  showInDir ? 'translate-x-5' : 'translate-x-0'
                )} />
              </button>
            </div>
            <button
              onClick={e => { e.stopPropagation(); onEmail(doc); }}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl cursor-pointer flex-shrink-0"
            >
              <Mail className="w-4 h-4" /> Send Email
            </button>
          </div>

          {/* Email history */}
          {docLogs.length > 0 && (
            <div className="border-t border-slate-100 pt-3">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Mail className="w-3 h-3" /> Email History ({docLogs.length})
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {docLogs.map(log => (
                  <div key={log.id} className="flex items-start gap-2 text-xs bg-violet-50/60 rounded-lg px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-700 truncate">{log.subject}</div>
                      <div className="text-slate-400 text-[10px] mt-0.5">{log.template_name}</div>
                    </div>
                    <div className="text-[10px] text-slate-400 flex-shrink-0 text-right">{fmtDateTime(log.sent_at)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-slate-400 border-t border-slate-100 pt-3">
            <span className="flex items-center gap-1"><CalendarClock className="w-3 h-3" /> Registered: {fmtDate(doc.created_at)}</span>
            {doc.approved_at && <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Approved: {fmtDate(doc.approved_at)}</span>}
            <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> Last login: {fmtDateTime(doc.last_login)}</span>
            <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {doc.login_count} total login{doc.login_count !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Activity & Geo Tab ───────────────────────────────────────────────────────

interface FunnelData {
  events: { event_type: string; count: number }[];
  successful_logins: number;
}

interface FailedLogin {
  email: string; method: string; reason: string | null; created_at: string;
}

function ActivityTab() {
  const [logins, setLogins] = useState<RecentLogin[]>([]);
  const [geo, setGeo] = useState<GeoSummary[]>([]);
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [failedLogins, setFailedLogins] = useState<FailedLogin[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'logins' | 'geo' | 'funnel'>('funnel');

  useEffect(() => {
    Promise.all([
      api.get<RecentLogin[]>('/admin/recent-logins'),
      api.get<GeoSummary[]>('/admin/geo-summary'),
      api.get<FunnelData>('/admin/funnel'),
      api.get<FailedLogin[]>('/admin/failed-logins'),
    ]).then(([l, g, f, fl]) => { setLogins(l); setGeo(g); setFunnel(f); setFailedLogins(fl); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function deviceLabel(ua: string | null) {
    if (!ua) return '—';
    if (/iPhone|iPad/i.test(ua)) return '📱 iOS';
    if (/Android/i.test(ua)) return '📱 Android';
    if (/Mac/i.test(ua)) return '💻 Mac';
    if (/Windows/i.test(ua)) return '🖥️ Windows';
    return '🌐 Web';
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-teal-500" /></div>;

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        <button onClick={() => setView('funnel')}
          className={cn('py-2 px-4 rounded-lg text-sm font-semibold transition-all',
            view === 'funnel' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700')}>
          Login Funnel
        </button>
        <button onClick={() => setView('logins')}
          className={cn('py-2 px-4 rounded-lg text-sm font-semibold transition-all',
            view === 'logins' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700')}>
          Recent Logins
        </button>
        <button onClick={() => setView('geo')}
          className={cn('py-2 px-4 rounded-lg text-sm font-semibold transition-all',
            view === 'geo' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700')}>
          Geography
        </button>
      </div>

      {view === 'funnel' && funnel && (() => {
        const views = Number(funnel.events.find(e => e.event_type === 'login_page_view')?.count ?? 0);
        const attempts = Number(funnel.events.find(e => e.event_type === 'login_attempt')?.count ?? 0);
        const failed = Number(funnel.events.find(e => e.event_type === 'login_failed')?.count ?? 0);
        const succeeded = funnel.successful_logins;
        const dropOff = views > 0 ? Math.round(((views - attempts) / views) * 100) : 0;
        const failRate = attempts > 0 ? Math.round((failed / attempts) * 100) : 0;
        const convRate = views > 0 ? Math.round((succeeded / views) * 100) : 0;

        const steps = [
          { label: 'Visited Login Page', value: views, color: 'bg-blue-500', pct: 100 },
          { label: 'Attempted Login', value: attempts, color: 'bg-teal-500', pct: views > 0 ? Math.round((attempts / views) * 100) : 0 },
          { label: 'Login Failed', value: failed, color: 'bg-red-400', pct: views > 0 ? Math.round((failed / views) * 100) : 0 },
          { label: 'Logged In Successfully', value: succeeded, color: 'bg-emerald-500', pct: views > 0 ? Math.round((succeeded / views) * 100) : 0 },
        ];

        return (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">Last 30 days · tracking starts from today</p>
            {/* Funnel bars */}
            <div className="card p-6 space-y-4">
              {steps.map((s, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-slate-700">{s.label}</span>
                    <span className="text-sm font-bold text-slate-800">{s.value.toLocaleString()} <span className="text-xs text-slate-400 font-normal">({s.pct}%)</span></span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full transition-all', s.color)} style={{ width: `${s.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
            {/* Key metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="card p-4 text-center bg-amber-50 border-0">
                <div className="text-2xl font-bold text-amber-600">{dropOff}%</div>
                <div className="text-xs font-semibold text-slate-500 mt-0.5">Dropped off</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Saw page, didn't try</div>
              </div>
              <div className="card p-4 text-center bg-red-50 border-0">
                <div className="text-2xl font-bold text-red-500">{failRate}%</div>
                <div className="text-xs font-semibold text-slate-500 mt-0.5">Failed attempts</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Wrong password / error</div>
              </div>
              <div className="card p-4 text-center bg-emerald-50 border-0">
                <div className="text-2xl font-bold text-emerald-600">{convRate}%</div>
                <div className="text-xs font-semibold text-slate-500 mt-0.5">Conversion rate</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Page view → success</div>
              </div>
            </div>

            {/* Failed logins with emails */}
            {failedLogins.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <XCircle className="w-3.5 h-3.5 text-red-400" /> Failed Login Attempts — Email IDs
                </h3>
                <div className="card overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                        <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Method</th>
                        <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Reason</th>
                        <th className="text-right px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">When</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {failedLogins.map((f, i) => (
                        <tr key={i} className="hover:bg-red-50/30">
                          <td className="px-4 py-2.5 font-semibold text-slate-800">{f.email}</td>
                          <td className="px-4 py-2.5 text-slate-500 capitalize">{f.method}</td>
                          <td className="px-4 py-2.5 text-red-500 text-xs">{f.reason || '—'}</td>
                          <td className="px-4 py-2.5 text-right text-xs text-slate-400">{fmtDateTime(f.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })()}
      {view === 'funnel' && !funnel && !loading && (
        <div className="card p-10 text-center text-slate-400 text-sm">No funnel data yet — data starts collecting from now</div>
      )}

      {view === 'logins' && (
        <div className="space-y-2">
          <p className="text-xs text-slate-400">Last 100 logins across all doctors</p>
          {logins.length === 0 ? (
            <div className="card p-10 text-center text-slate-400">No login data yet</div>
          ) : logins.map((l, i) => (
            <div key={i} className="card p-4 flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                <Activity className="w-4 h-4 text-teal-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-800 text-sm">{l.name}</span>
                  {l.specialty && <span className="text-xs text-teal-700 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full">{l.specialty}</span>}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{l.email}</div>
                <div className="flex items-center gap-3 mt-1 flex-wrap text-[11px] text-slate-400">
                  {(l.location_label || l.city) && (
                    <span className="flex items-center gap-1 text-teal-600 font-semibold">
                      📍 {l.location_label || [l.city, l.state].filter(Boolean).join(', ')}
                    </span>
                  )}
                  <span>{deviceLabel(l.user_agent)}</span>
                  {l.ip_address && <span>IP: {l.ip_address}</span>}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-xs font-semibold text-slate-600">{fmtDateTime(l.logged_in_at)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'geo' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-400">Login count grouped by location</p>
          {geo.length === 0 ? (
            <div className="card p-10 text-center text-slate-400">No geo data yet</div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">#</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Location</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">State</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Logins</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Doctors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {geo.map((g, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-slate-400 text-xs">{i + 1}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">📍 {g.location}</td>
                      <td className="px-4 py-3 text-slate-500">{g.state || '—'}</td>
                      <td className="px-4 py-3 text-right font-bold text-teal-600">{g.login_count}</td>
                      <td className="px-4 py-3 text-right font-bold text-violet-600">{g.unique_doctors}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Templates Tab ───────────────────────────────────────────────────────────

const BUILTIN_TEMPLATE_META = [
  { key: 'DOCTOR_APPROVED',   label: 'Doctor Approved',        desc: 'Auto-sent on doctor approval' },
  { key: 'DOCTOR_REJECTED',   label: 'Doctor Rejected',        desc: 'Auto-sent on rejection' },
  { key: 'INACTIVE_30_DAYS',  label: 'We miss you (30 days)',  desc: 'Outreach for 30-day inactive' },
  { key: 'INACTIVE_60_DAYS',  label: 'Account review (60d)',   desc: 'Warning for 60-day dormant' },
  { key: 'FEATURE_HIGHLIGHT', label: 'New Features',           desc: 'Feature announcement' },
  { key: 'PATIENT_WAITING',   label: 'Patients Waiting',       desc: 'Patient acquisition nudge' },
  { key: 'ACCOUNT_REVIEW',    label: 'Scheduled Review',       desc: 'Routine account review' },
];

function TemplatesTab({
  customTemplates, onSave, onDelete,
}: {
  customTemplates: CustomTemplate[];
  onSave: (t: CustomTemplate) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState<CustomTemplate | null>(null);
  const [isNew, setIsNew] = useState(false);

  function startNew() {
    setEditing({ id: crypto.randomUUID(), name: '', subject: '', body: '' });
    setIsNew(true);
  }
  function startEdit(t: CustomTemplate) { setEditing({ ...t }); setIsNew(false); }
  function cancel() { setEditing(null); }
  function save() {
    if (!editing?.name || !editing.subject || !editing.body) return;
    onSave(editing);
    setEditing(null);
  }

  return (
    <div className="space-y-6">
      {/* Built-in */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Built-in Templates</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {BUILTIN_TEMPLATE_META.map(t => (
            <div key={t.key} className="card p-3.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4 text-slate-400" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-slate-700 text-sm truncate">{t.label}</div>
                <div className="text-xs text-slate-400 truncate">{t.desc}</div>
              </div>
              <span className="ml-auto flex-shrink-0 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">BUILT-IN</span>
            </div>
          ))}
        </div>
      </div>

      {/* Custom */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Custom Templates</h3>
          <button onClick={startNew} className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> New Template
          </button>
        </div>

        {editing && (
          <div className="card p-5 mb-4 border-2 border-teal-200 bg-teal-50/20">
            <h4 className="font-bold text-slate-800 mb-4 text-sm">{isNew ? 'New Template' : `Edit: ${editing.name}`}</h4>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Template Name</label>
                <input value={editing.name} onChange={e => setEditing(t => t ? { ...t, name: e.target.value } : null)}
                  className="input w-full" placeholder="e.g. Welcome Back, Festive Greetings" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Subject</label>
                <input value={editing.subject} onChange={e => setEditing(t => t ? { ...t, subject: e.target.value } : null)}
                  className="input w-full" placeholder="Subject line — use {doctorName} to personalise" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Body</label>
                <textarea rows={9} value={editing.body}
                  onChange={e => setEditing(t => t ? { ...t, body: e.target.value } : null)}
                  className="input resize-none w-full font-mono text-sm"
                  placeholder={"Dear Dr. {doctorName},\n\nYour message here…\n\nBest regards,\nVyasa Team"} />
              </div>
              <div className="bg-white rounded-xl p-3 text-xs text-slate-500 border border-slate-200">
                <span className="font-bold text-slate-600">Available variables: </span>
                <code className="bg-slate-100 px-1.5 py-0.5 rounded mx-1">{'{doctorName}'}</code>
                <code className="bg-slate-100 px-1.5 py-0.5 rounded mx-1">{'{profileSlug}'}</code>
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <button onClick={cancel} className="btn-secondary btn-sm">Cancel</button>
                <button onClick={save} disabled={!editing.name || !editing.subject || !editing.body}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl cursor-pointer">
                  <CheckCircle2 className="w-4 h-4" /> Save Template
                </button>
              </div>
            </div>
          </div>
        )}

        {customTemplates.length === 0 && !editing ? (
          <div className="card p-10 text-center">
            <FileText className="w-9 h-9 mx-auto mb-2 text-slate-200" />
            <p className="font-semibold text-slate-500 text-sm">No custom templates yet</p>
            <p className="text-xs text-slate-400 mt-1">Create reusable templates for doctor outreach</p>
          </div>
        ) : (
          <div className="space-y-2">
            {customTemplates.map(t => (
              <div key={t.id} className="card p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-teal-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800 text-sm">{t.name}</div>
                  <div className="text-xs text-slate-400 truncate mt-0.5">{t.subject}</div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => startEdit(t)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-teal-600 cursor-pointer" title="Edit">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => onDelete(t.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 cursor-pointer" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SuperAdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [doctors, setDoctors] = useState<DoctorOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [doctorsError, setDoctorsError] = useState(false);
  const [mainTab, setMainTab] = useState<MainTab>('users');
  const [filter, setFilter] = useState<Filter>('pending');
  const [search, setSearch] = useState('');
  const [doctorSearch, setDoctorSearch] = useState('');
  const [acting, setActing] = useState<number | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [rejectModal, setRejectModal] = useState<{ id: number; name: string; reason: string } | null>(null);
  const [sessionsModal, setSessionsModal] = useState<{ user: AdminUser; sessions: LoginSession[]; loading: boolean } | null>(null);
  const [emailModal, setEmailModal] = useState<EmailModal | null>(null);
  const [doctorFilter, setDoctorFilter] = useState<DoctorFilter>('all');
  const [emailsSent, setEmailsSent] = useState(0);
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>(() => loadCustomTemplates());
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);

  const loadEmailLogs = useCallback(async () => {
    try {
      setEmailLogs(await api.get<EmailLog[]>('/admin/email-logs'));
    } catch {
      // Retry once after 4s — Render may still be cold-starting after deploy
      setTimeout(async () => {
        try { setEmailLogs(await api.get<EmailLog[]>('/admin/email-logs')); } catch { /* non-critical */ }
      }, 4000);
    }
  }, []);

  useEffect(() => { loadEmailLogs(); }, [loadEmailLogs]);

  async function handleEmailSent(log: Pick<EmailLog, 'recipient_id' | 'recipient_email' | 'recipient_name' | 'template_name' | 'subject'>) {
    setEmailsSent(n => n + 1);
    try {
      await api.post('/admin/email-logs', log);
      // Optimistically add to local list
      setEmailLogs(prev => [{
        id: Date.now(), ...log, sent_at: new Date().toISOString(),
      }, ...prev]);
    } catch { /* log failure is non-critical */ }
  }

  function saveTemplate(t: CustomTemplate) {
    setCustomTemplates(prev => {
      const updated = prev.some(x => x.id === t.id) ? prev.map(x => x.id === t.id ? t : x) : [...prev, t];
      persistCustomTemplates(updated);
      return updated;
    });
  }

  function deleteTemplate(id: string) {
    if (!confirm('Delete this template?')) return;
    setCustomTemplates(prev => { const updated = prev.filter(x => x.id !== id); persistCustomTemplates(updated); return updated; });
  }

  const load = useCallback(async () => {
    setLoading(true);
    setAccessDenied(false);
    try {
      const [s, u] = await Promise.all([
        api.get<AdminStats>('/admin/stats'),
        api.get<AdminUser[]>('/admin/users'),
      ]);
      setStats(s);
      setUsers(u);
    } catch (e) {
      if (e instanceof Error && /superadmin/i.test(e.message)) setAccessDenied(true);
    }
    finally { setLoading(false); }
  }, []);

  const loadDoctors = useCallback(async () => {
    setDoctorsLoading(true);
    setDoctorsError(false);
    try {
      // 20-second timeout so it never hangs forever on Render cold start
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000);
      const data = await api.get<DoctorOverview[]>('/admin/doctors/overview');
      clearTimeout(timer);
      setDoctors(data);
    } catch {
      setDoctorsError(true);
    }
    finally { setDoctorsLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (mainTab === 'doctors' && doctors.length === 0 && !doctorsLoading) {
      loadDoctors();
    }
  }, [mainTab, doctors.length, doctorsLoading, loadDoctors]);

  async function approve(id: number) {
    setActing(id);
    try {
      const user = users.find(u => u.id === id);
      await api.post(`/admin/users/${id}/approve`, {});
      if (user) {
        await sendEmail(user.email, 'DOCTOR_APPROVED', { doctorName: user.name });
      }
      setUsers(prev => prev.map(u => u.id === id ? { ...u, approval_status: 'approved' } : u));
    } catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setActing(null); }
  }

  async function reject(id: number, reason: string) {
    setActing(id);
    try {
      const user = users.find(u => u.id === id);
      await api.post(`/admin/users/${id}/reject`, { reason });
      if (user) {
        await sendEmail(user.email, 'DOCTOR_REJECTED', { doctorName: user.name, rejectionReason: reason });
      }
      setUsers(prev => prev.map(u => u.id === id ? { ...u, approval_status: 'rejected', rejection_reason: reason } : u));
    } catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setActing(null); setRejectModal(null); }
  }

  async function deleteDoctor(id: number) {
    if (!confirm('Delete this doctor profile permanently?')) return;
    setActing(id);
    try {
      await api.post(`/admin/users/${id}/delete`, {});
      setUsers(prev => prev.filter(u => u.id !== id));
      alert('Doctor profile deleted successfully');
    } catch (e: any) {
      alert(e?.response?.data?.error || e?.message || 'Failed to delete doctor');
    }
    finally { setActing(null); }
  }

  async function showSessions(user: AdminUser) {
    setSessionsModal({ user, sessions: [], loading: true });
    try {
      const sessions = await api.get<LoginSession[]>(`/admin/users/${user.id}/sessions`);
      setSessionsModal({ user, sessions, loading: false });
    } catch {
      setSessionsModal({ user, sessions: [], loading: false });
    }
  }

  const filtered = users.filter(u => {
    if (filter !== 'all' && u.approval_status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return [u.name, u.email, u.specialty, u.license_number, u.reg_number, u.city, u.state]
        .some(v => v?.toLowerCase().includes(q));
    }
    return true;
  });

  function openEmail(doc: DoctorOverview) {
    const defaultKey = 'INACTIVE_30_DAYS';
    const { subject, body } = buildEmail(defaultKey, doc);
    setEmailModal({ doc, templateKey: defaultKey, subject, body, preview: false, sending: false, sent: false });
  }

  function emailAllInactive() {
    const inactiveDocs = doctors.filter(d => {
      const d2 = daysSince(d.last_login);
      return d.login_count === 0 || d2 > 30;
    });
    if (inactiveDocs.length === 0) return;
    // Open modal for first one; user can repeat for others
    openEmail(inactiveDocs[0]);
  }

  const filteredDoctors = doctors.filter(d => {
    const matchActivity = (() => {
      if (doctorFilter === 'all') return true;
      const days = daysSince(d.last_login);
      if (doctorFilter === 'active') return d.login_count > 0 && days <= 14;
      if (doctorFilter === 'inactive') return d.login_count > 0 && days > 14 && days <= 60;
      if (doctorFilter === 'dormant') return d.login_count === 0 || days > 60;
      return true;
    })();
    if (!matchActivity) return false;
    if (!doctorSearch) return true;
    const q = doctorSearch.toLowerCase();
    return [d.name, d.email, d.specialty, d.city, d.state, d.license_number, d.reg_number, d.clinic_name]
      .some(v => v?.toLowerCase().includes(q));
  });

  const inactiveCount = doctors.filter(d => d.login_count === 0 || daysSince(d.last_login) > 30).length;

  const pendingCount = users.filter(u => u.approval_status === 'pending').length;

  const STAT_CARDS = stats ? [
    { icon: Users, label: 'Total Users', value: stats.users?.total ?? '0', sub: `+${stats.users?.new_this_week ?? 0} this week`, color: 'text-teal-600', bg: 'bg-teal-50' },
    { icon: ShieldCheck, label: 'Doctors', value: stats.users?.doctors ?? '0', sub: `${stats.users?.approved ?? 0} approved`, color: 'text-blue-600', bg: 'bg-blue-50' },
    { icon: Clock, label: 'Pending Approval', value: stats.users?.pending ?? '0', sub: 'need MCI verification', color: 'text-amber-600', bg: 'bg-amber-50' },
    { icon: ClipboardList, label: 'Bookings', value: stats.bookings?.total ?? '0', sub: `${stats.bookings?.this_week ?? 0} this week`, color: 'text-violet-600', bg: 'bg-violet-50' },
    { icon: Activity, label: 'Logins (24h)', value: stats.logins?.last_24h ?? '0', sub: `${stats.logins?.total ?? 0} all-time`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { icon: Users, label: 'Patients', value: stats.patients?.total ?? '0', sub: `${stats.visits?.total ?? 0} visits`, color: 'text-rose-600', bg: 'bg-rose-50' },
  ] : [];

  if (accessDenied) {
    return (
      <div className="max-w-xl mx-auto p-6 mt-12">
        <div className="card p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-7 h-7 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Superadmin access required</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            You're signed in as a <strong>doctor</strong> account. This panel only works for the
            platform superadmin. Log out and sign in with the superadmin email and password to
            approve doctors and view platform stats.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Super Admin</h1>
          <p className="text-sm text-slate-500 mt-1">Approvals, users, and platform activity</p>
        </div>
        <button
          onClick={() => { load(); if (mainTab === 'doctors') loadDoctors(); }}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
          title="Refresh"
        >
          <RefreshCw className={cn('w-4 h-4', (loading || doctorsLoading) && 'animate-spin')} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {STAT_CARDS.map(c => (
          <div key={c.label} className="card p-4">
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mb-2', c.bg)}>
              <c.icon className={cn('w-4.5 h-4.5', c.color)} style={{ width: 18, height: 18 }} />
            </div>
            <div className="text-xl font-bold text-slate-800">{c.value}</div>
            <div className="text-xs font-semibold text-slate-500">{c.label}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{c.sub}</div>
          </div>
        ))}
        {!stats && !loading && (
          <div className="col-span-full text-sm text-slate-400 text-center py-4">Could not load stats</div>
        )}
      </div>

      {/* Main tabs */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          <button
            onClick={() => setMainTab('users')}
            className={cn('py-2 px-5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2',
              mainTab === 'users' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700')}
          >
            <Users className="w-4 h-4" /> Users
            {pendingCount > 0 && (
              <span className="bg-amber-400 text-white text-xs font-bold rounded-full px-1.5 py-0.5">{pendingCount}</span>
            )}
          </button>
          <button
            onClick={() => setMainTab('doctors')}
            className={cn('py-2 px-5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2',
              mainTab === 'doctors' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700')}
          >
            <BarChart2 className="w-4 h-4" /> Doctor Stats
            {doctors.length > 0 && (
              <span className="bg-teal-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5">{doctors.length}</span>
            )}
          </button>
          <button
            onClick={() => setMainTab('templates')}
            className={cn('py-2 px-5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2',
              mainTab === 'templates' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700')}
          >
            <FileText className="w-4 h-4" /> Templates
            {customTemplates.length > 0 && (
              <span className="bg-violet-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5">{customTemplates.length}</span>
            )}
          </button>
          <button
            onClick={() => setMainTab('activity')}
            className={cn('py-2 px-5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2',
              mainTab === 'activity' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700')}
          >
            <TrendingUp className="w-4 h-4" /> Activity & Geo
          </button>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700">
          <Send className="w-3.5 h-3.5" /> {emailLogs.length} email{emailLogs.length !== 1 ? 's' : ''} sent
          {emailsSent > 0 && <span className="text-emerald-500 font-normal">· {emailsSent} this session</span>}
        </div>
      </div>

      {/* ── USERS TAB ── */}
      {mainTab === 'users' && (
        <>
          {/* Filters + search */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1 flex-1">
              {(['pending', 'approved', 'rejected', 'all'] as Filter[]).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={cn('flex-1 py-2 px-3 rounded-lg text-sm font-semibold capitalize transition-all',
                    filter === f ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700')}>
                  {f}
                  {f === 'pending' && pendingCount > 0 && (
                    <span className="ml-1.5 bg-amber-400 text-white text-xs font-bold rounded-full px-1.5 py-0.5">{pendingCount}</span>
                  )}
                </button>
              ))}
            </div>
            <div className="relative sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search name, email, MCI no…"
                className="input pl-9 w-full" />
            </div>
          </div>

          {/* User list */}
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-teal-500" /></div>
          ) : filtered.length === 0 ? (
            <div className="card p-12 text-center text-slate-400">
              <UserCheck className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="font-semibold text-slate-500">No {filter !== 'all' ? filter : ''} users found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(u => (
                <div key={u.id} className="card p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    {/* Identity */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-800">{u.name}</span>
                        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{ROLE_LABELS[u.role] ?? u.role}</span>
                        <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full border capitalize', STATUS_STYLE[u.approval_status])}>
                          {u.approval_status}
                        </span>
                      </div>
                      <div className="text-sm text-slate-600 mt-1">{u.email}</div>
                      {u.phone && <div className="text-sm text-teal-600 font-semibold mt-0.5">📱 {u.phone}</div>}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 mt-2 text-xs text-slate-600">
                        {u.specialty && <div><span className="text-slate-400">Specialty:</span> <span className="font-semibold">{u.specialty}</span></div>}
                        {(u.license_number || u.reg_number) && (
                          <div><span className="text-slate-400">MCI / License:</span> <span className="font-bold text-slate-800">{u.license_number || u.reg_number}</span></div>
                        )}
                        {(u.city || u.state) && <div><span className="text-slate-400">Location:</span> <span className="font-semibold">{[u.city, u.state].filter(Boolean).join(', ')}</span></div>}
                        {u.degrees && <div><span className="text-slate-400">Degrees:</span> <span className="font-semibold">{u.degrees}</span></div>}
                      </div>
                      {u.approval_status === 'rejected' && u.rejection_reason && (
                        <div className="text-xs text-red-500 mt-1.5">Reason: {u.rejection_reason}</div>
                      )}
                      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2.5 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1"><CalendarClock className="w-3 h-3" /> Registered: {fmtDateTime(u.created_at)}</span>
                        <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> Last login: {fmtDateTime(u.last_login)}</span>
                        <button onClick={() => showSessions(u)} className="text-teal-600 font-semibold hover:underline">
                          {u.login_count} login{Number(u.login_count) !== 1 ? 's' : ''} — view history
                        </button>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex sm:flex-col gap-2 flex-shrink-0">
                      {u.approval_status !== 'approved' && (
                        <button onClick={() => approve(u.id)} disabled={acting === u.id}
                          className="flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-lg px-4 py-2 disabled:opacity-50 flex-1 sm:flex-none">
                          {acting === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          Approve
                        </button>
                      )}
                      {u.approval_status !== 'rejected' && (
                        <button onClick={() => setRejectModal({ id: u.id, name: u.name, reason: '' })} disabled={acting === u.id}
                          className="flex items-center justify-center gap-1.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-sm font-bold rounded-lg px-4 py-2 disabled:opacity-50 flex-1 sm:flex-none">
                          <XCircle className="w-4 h-4" /> Reject
                        </button>
                      )}
                      {u.approval_status === 'approved' && (
                        <button onClick={() => deleteDoctor(u.id)} disabled={acting === u.id}
                          className="flex items-center justify-center gap-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-bold rounded-lg px-4 py-2 disabled:opacity-50 flex-1 sm:flex-none">
                          {acting === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── DOCTORS STATS TAB ── */}
      {mainTab === 'doctors' && (
        <>
          {/* Summary bar */}
          {doctors.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: 'Approved Doctors', value: doctors.length, color: 'text-teal-600', bg: 'bg-teal-50' },
                { label: 'Total Bookings', value: doctors.reduce((s, d) => s + Number(d.total_bookings), 0), color: 'text-violet-600', bg: 'bg-violet-50' },
                { label: 'Total Consults', value: doctors.reduce((s, d) => s + Number(d.total_visits), 0), color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Inactive / Dormant', value: inactiveCount, color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: 'Emails Sent', value: emailLogs.length, color: 'text-rose-600', bg: 'bg-rose-50' },
              ].map(c => (
                <div key={c.label} className={cn('card p-4 text-center', c.bg, 'border-0')}>
                  <div className={cn('text-2xl font-bold', c.color)}>{c.value}</div>
                  <div className="text-xs font-semibold text-slate-500 mt-0.5">{c.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Activity filter + search + bulk email */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1 flex-shrink-0">
              {(['all', 'active', 'inactive', 'dormant'] as DoctorFilter[]).map(f => (
                <button key={f} onClick={() => setDoctorFilter(f)}
                  className={cn('py-1.5 px-3 rounded-lg text-xs font-bold capitalize transition-all',
                    doctorFilter === f ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700')}>
                  {f}
                  {(f === 'inactive' || f === 'dormant') && doctors.length > 0 && (
                    <span className="ml-1 text-[10px] text-amber-600 font-bold">
                      ({doctors.filter(d => {
                        const days = daysSince(d.last_login);
                        if (f === 'inactive') return d.login_count > 0 && days > 14 && days <= 60;
                        return d.login_count === 0 || days > 60;
                      }).length})
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={doctorSearch} onChange={e => setDoctorSearch(e.target.value)}
                placeholder="Search doctor, specialty, city…"
                className="input pl-9 w-full" />
            </div>
            {inactiveCount > 0 && (
              <button
                onClick={emailAllInactive}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl cursor-pointer flex-shrink-0"
              >
                <Mail className="w-4 h-4" /> Email Inactive ({inactiveCount})
              </button>
            )}
          </div>

          {doctorsLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-teal-500" />
              <p className="text-sm text-slate-400">Loading doctor stats… (backend may be waking up)</p>
            </div>
          ) : doctorsError ? (
            <div className="card p-12 text-center">
              <p className="font-semibold text-slate-600 mb-1">Could not load doctor stats</p>
              <p className="text-sm text-slate-400 mb-4">The backend may be waking up — try again in a moment</p>
              <button onClick={loadDoctors} className="btn-primary btn-sm mx-auto">
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </button>
            </div>
          ) : filteredDoctors.length === 0 ? (
            <div className="card p-12 text-center text-slate-400">
              <Stethoscope className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="font-semibold text-slate-500">
                {doctorFilter === 'all' ? 'No approved doctors found' : `No ${doctorFilter} doctors`}
              </p>
              <p className="text-sm mt-1">
                {doctorFilter === 'all'
                  ? 'Approve doctors from the Users tab to see their stats here'
                  : 'Try a different activity filter'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDoctors.map(doc => (
                <DoctorCard key={doc.id} doc={doc} onEmail={openEmail} emailLogs={emailLogs} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5">
            <h3 className="font-bold text-slate-900 mb-1">Reject {rejectModal.name}?</h3>
            <p className="text-sm text-slate-500 mb-3">They'll see this reason and can re-apply.</p>
            <textarea rows={3} autoFocus className="input resize-none w-full"
              placeholder="e.g. MCI number could not be verified"
              value={rejectModal.reason}
              onChange={e => setRejectModal(m => m ? { ...m, reason: e.target.value } : m)} />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setRejectModal(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => reject(rejectModal.id, rejectModal.reason || 'License not verified')}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg py-2.5 text-sm">
                Reject User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ACTIVITY & GEO TAB ── */}
      {mainTab === 'activity' && <ActivityTab />}

      {/* ── TEMPLATES TAB ── */}
      {mainTab === 'templates' && (
        <TemplatesTab
          customTemplates={customTemplates}
          onSave={saveTemplate}
          onDelete={deleteTemplate}
        />
      )}

      {/* Email compose modal */}
      {emailModal && (
        <EmailComposeModal
          initial={emailModal}
          onClose={() => setEmailModal(null)}
          onSent={handleEmailSent}
          customTemplates={customTemplates}
        />
      )}

      {/* Login sessions modal */}
      {sessionsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900">Login History</h3>
                <p className="text-xs text-slate-500">{sessionsModal.user.name} · {sessionsModal.user.email}</p>
              </div>
              <button onClick={() => setSessionsModal(null)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="overflow-y-auto p-5">
              {sessionsModal.loading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-teal-500" /></div>
              ) : sessionsModal.sessions.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No login sessions recorded</p>
              ) : (
                <div className="space-y-3">
                  {sessionsModal.sessions.map((s, i) => (
                    <div key={i} className="flex items-start gap-3 pb-3 border-b border-slate-50 last:border-0">
                      <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                        <Activity className="w-4 h-4 text-teal-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-700">{fmtDateTime(s.logged_in_at)}</div>
                        <div className="text-xs text-slate-400 truncate">
                          {[s.location_label, s.ip_address].filter(Boolean).join(' · ') || 'No location data'}
                        </div>
                        {s.user_agent && <div className="text-[11px] text-slate-300 truncate">{s.user_agent}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
