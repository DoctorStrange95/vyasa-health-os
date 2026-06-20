import { useState, useEffect, useCallback } from 'react';
import {
  Users, UserCheck, Clock, ShieldCheck, Search, RefreshCw,
  Loader2, CheckCircle2, XCircle, CalendarClock, Activity, ClipboardList, X, Trash2,
  Stethoscope, TrendingUp, CalendarCheck, BarChart2, ChevronDown, ChevronRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { sendEmail } from '@/lib/emailService';

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
type MainTab = 'users' | 'doctors';

// ─── Doctor Overview Card ─────────────────────────────────────────────────────

function DoctorCard({ doc }: { doc: DoctorOverview }) {
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

          {/* Directory visibility toggle */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <div>
              <div className="text-sm font-semibold text-slate-700">Show in Doctor Directory</div>
              <div className="text-xs text-slate-400">Controls visibility on vyasaa.com/doctors</div>
            </div>
            <button
              onClick={toggleDirectory}
              disabled={dirToggling}
              className={cn(
                'relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none',
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

  const filteredDoctors = doctors.filter(d => {
    if (!doctorSearch) return true;
    const q = doctorSearch.toLowerCase();
    return [d.name, d.email, d.specialty, d.city, d.state, d.license_number, d.reg_number, d.clinic_name]
      .some(v => v?.toLowerCase().includes(q));
  });

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
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Approved Doctors', value: doctors.length, color: 'text-teal-600', bg: 'bg-teal-50' },
                { label: 'Total Bookings', value: doctors.reduce((s, d) => s + Number(d.total_bookings), 0), color: 'text-violet-600', bg: 'bg-violet-50' },
                { label: 'Total Consults', value: doctors.reduce((s, d) => s + Number(d.total_visits), 0), color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Total Patients', value: doctors.reduce((s, d) => s + Number(d.total_patients), 0), color: 'text-blue-600', bg: 'bg-blue-50' },
              ].map(c => (
                <div key={c.label} className={cn('card p-4 text-center', c.bg, 'border-0')}>
                  <div className={cn('text-2xl font-bold', c.color)}>{c.value}</div>
                  <div className="text-xs font-semibold text-slate-500 mt-0.5">{c.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={doctorSearch} onChange={e => setDoctorSearch(e.target.value)}
              placeholder="Search doctor, specialty, city…"
              className="input pl-9 w-full" />
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
              <p className="font-semibold text-slate-500">No approved doctors found</p>
              <p className="text-sm mt-1">Approve doctors from the Users tab to see their stats here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDoctors.map(doc => (
                <DoctorCard key={doc.id} doc={doc} />
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
