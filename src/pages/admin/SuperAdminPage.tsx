import { useState, useEffect, useCallback } from 'react';
import {
  Users, UserCheck, Clock, ShieldCheck, Search, RefreshCw,
  Loader2, CheckCircle2, XCircle, CalendarClock, Activity, ClipboardList, X, Trash2
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

export default function SuperAdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('pending');
  const [search, setSearch] = useState('');
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

  useEffect(() => { load(); }, [load]);

  async function approve(id: number) {
    setActing(id);
    try {
      const user = users.find(u => u.id === id);
      await api.post(`/admin/users/${id}/approve`, {});

      // Send approval email
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

      // Send rejection email
      if (user) {
        await sendEmail(user.email, 'DOCTOR_REJECTED', {
          doctorName: user.name,
          rejectionReason: reason
        });
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
      const errorMsg = e?.response?.data?.error || e?.message || 'Failed to delete doctor';
      alert(errorMsg || 'An error occurred');
      console.error('Delete error:', e);
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
        <button onClick={load} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" title="Refresh">
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
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
                  {/* Timestamps */}
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
