import { Bell, Search, RefreshCw, Wifi, WifiOff, Menu, CheckCircle, XCircle, Calendar, Phone, ChevronRight, X, ArrowRightLeft } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useAppStore } from '@/store/useAppStore';
import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';

interface BookingRequest {
  id: number;
  patient_name: string;
  patient_phone: string;
  patient_age: number | null;
  clinic_name?: string | null;
  reason: string;
  preferred_date: string | null;
  preferred_time: string | null;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
}

function fmtSlot(date: string | null, time: string | null) {
  if (!date) return '';
  const d = new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const t = time ? new Date(`2000-01-01T${time}`).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';
  return t ? `${d} · ${t}` : d;
}

interface TopbarProps {
  title?: string;
  subtitle?: string;
}

export function Topbar({ title, subtitle }: TopbarProps) {
  const { user, isDemo } = useAuthStore();
  const { alerts, toggleMobileSidebar, refreshAppointments, patients } = useAppStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [updating, setUpdating] = useState<number | null>(null);
  const [chatNotifs, setChatNotifs] = useState<Array<{ id: string; patientId: string; senderId: number; senderName: string; message: string; time: string }>>([]);
  const [appNotifs, setAppNotifs] = useState<Array<{ id: number; type: string; title: string; message: string; entityType: string; entityId: string; read: boolean; createdAt: string }>>([]);
  const dropRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const searchResults = search.trim().length > 0
    ? patients.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.mrn.toLowerCase().includes(search.toLowerCase()) ||
        (p.diagnosis || '').toLowerCase().includes(search.toLowerCase())
      ).slice(0, 7)
    : [];

  function selectPatient(id: string) {
    navigate(`/app/patients/${id}`);
    setSearch('');
    setSearchOpen(false);
  }

  // Close search dropdown on outside click
  useEffect(() => {
    if (!searchOpen) return;
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [searchOpen]);

  const unack = alerts.filter(a => !a.acknowledged).length;
  const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const date = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  const loadRequests = useCallback(async () => {
    if (isDemo) return;
    try {
      const rows = await api.get<BookingRequest[]>('/booking-requests?status=pending');
      setRequests(rows);
    } catch { /* noop */ }
  }, [isDemo]);

  // Poll every 60 seconds but skip when tab is hidden (saves requests, avoids memory leaks)
  useEffect(() => {
    loadRequests();
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') loadRequests();
    }, 60000);
    return () => clearInterval(t);
  }, [loadRequests]);

  // Care-team chat notifications: messages from OTHERS, newer than last-seen.
  const loadChatNotifs = useCallback(async () => {
    if (isDemo || !user) return;
    try {
      const rows = await api.get<Array<{ id: string; patientId: string; senderId: number; senderName: string; message: string; time: string }>>('/chat/recent');
      const seen = Number(localStorage.getItem('vyasa_chat_seen') || 0);
      setChatNotifs(rows.filter(m => m.senderId !== user.id && new Date(m.time).getTime() > seen));
    } catch { /* noop */ }
  }, [isDemo, user]);

  useEffect(() => {
    loadChatNotifs();
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') loadChatNotifs();
    }, 20000);
    return () => clearInterval(t);
  }, [loadChatNotifs]);

  function markChatSeen() {
    localStorage.setItem('vyasa_chat_seen', String(Date.now()));
    setChatNotifs([]);
  }

  const loadAppNotifs = useCallback(async () => {
    if (isDemo) return;
    try {
      const rows = await api.get<typeof appNotifs>('/notifications');
      setAppNotifs(rows.filter(n => !n.read));
    } catch { /* noop */ }
  }, [isDemo]);

  useEffect(() => {
    loadAppNotifs();
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') loadAppNotifs();
    }, 30000);
    return () => clearInterval(t);
  }, [loadAppNotifs]);

  async function markAppNotifsRead() {
    if (appNotifs.length === 0) return;
    try { await api.patch('/notifications/read-all', {}); setAppNotifs([]); } catch { /* noop */ }
  }

  // Close dropdown on outside click
  useEffect(() => {
    if (!bellOpen) return;
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setBellOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [bellOpen]);

  async function updateStatus(id: number, status: 'confirmed' | 'cancelled') {
    setUpdating(id);
    try {
      await api.patch(`/booking-requests/${id}`, { status });
      setRequests(prev => prev.filter(r => r.id !== id));
      // Pull the newly created appointment into Today's OPD immediately
      if (status === 'confirmed') refreshAppointments();
    } catch { /* noop */ }
    finally { setUpdating(null); }
  }

  const pendingCount = requests.length;
  const totalBadge = unack + pendingCount + chatNotifs.length + appNotifs.length;

  return (
    <header className="h-14 md:h-16 bg-white border-b border-slate-200 flex items-center gap-3 px-3 md:px-5 flex-shrink-0">
      {/* Mobile hamburger */}
      <button
        onClick={toggleMobileSidebar}
        className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 flex-shrink-0"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Search / title */}
      <div className="flex-1 min-w-0">
        {title ? (
          <div>
            <div className="text-base font-bold text-slate-900 leading-tight">{title}</div>
            {subtitle && <div className="text-xs text-slate-500">{subtitle}</div>}
          </div>
        ) : (
          <div className="relative max-w-xs" ref={searchRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={e => {
                if (e.key === 'Escape') { setSearch(''); setSearchOpen(false); }
                if (e.key === 'Enter' && searchResults.length > 0) selectPatient(searchResults[0].id);
              }}
              placeholder="Search patients…"
              aria-label="Search patients, appointments, and prescriptions"
              className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition"
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setSearchOpen(false); searchInputRef.current?.focus(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Live search dropdown */}
            {searchOpen && search.trim().length > 0 && (
              <div className="absolute left-0 top-full mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-[9999] overflow-hidden">
                {searchResults.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-slate-400">No patients found</div>
                ) : (
                  searchResults.map(p => (
                    <button
                      key={p.id}
                      onClick={() => selectPatient(p.id)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-teal-50 transition-colors text-left border-b border-slate-50 last:border-b-0 cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-700 text-xs font-bold flex-shrink-0">
                        {p.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate">{p.name}</div>
                        <div className="text-xs text-slate-400">
                          {p.mrn} · {p.age}y · <span className={cn(
                            'font-medium',
                            p.status === 'Critical' ? 'text-red-600' :
                            p.status === 'IPD' ? 'text-blue-600' :
                            p.status === 'OPD' ? 'text-teal-600' : 'text-slate-500'
                          )}>{p.status}</span>
                        </div>
                      </div>
                    </button>
                  ))
                )}
                {searchResults.length > 0 && (
                  <Link
                    to={`/app/patients?q=${encodeURIComponent(search)}`}
                    onClick={() => { setSearch(''); setSearchOpen(false); }}
                    className="flex items-center justify-center gap-1 px-4 py-2.5 text-xs font-semibold text-teal-600 hover:bg-teal-50 transition-colors border-t border-slate-100"
                  >
                    See all results <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {isDemo && (
          <span className="hidden sm:flex badge bg-amber-100 text-amber-700 gap-1 text-xs">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
            Demo
          </span>
        )}

        <div className="hidden lg:flex flex-col items-end leading-tight">
          <span className="text-xs font-semibold text-slate-700">{now}</span>
          <span className="text-[10px] text-slate-400">{date}</span>
        </div>

        {!isDemo && (
          <button aria-label="Refresh data" className="hidden md:block p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500">
            <RefreshCw className="w-4 h-4" />
          </button>
        )}

        <div className="hidden sm:flex items-center gap-1 text-xs text-slate-400">
          {isDemo ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5 text-emerald-500" />}
        </div>

        {/* Notification bell with dropdown */}
        <div className="relative" ref={dropRef}>
          <button
            aria-label={`Notifications${totalBadge > 0 ? ` (${totalBadge} unread)` : ''}`}
            onClick={() => { const opening = !bellOpen; setBellOpen(opening); if (opening) { loadRequests(); loadChatNotifs(); loadAppNotifs(); localStorage.setItem('vyasa_chat_seen', String(Date.now())); markAppNotifsRead(); } }}
            className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
          >
            <Bell className="w-5 h-5" />
            {totalBadge > 0 && (
              <span className={cn(
                'absolute top-1 right-1 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-0.5',
                pendingCount > 0 && 'animate-pulse'
              )}>
                {totalBadge > 9 ? '9+' : totalBadge}
              </span>
            )}
          </button>

          {bellOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 z-[9999] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div className="text-sm font-bold text-slate-800">Notifications</div>
                {pendingCount > 0 && (
                  <span className="text-xs bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">
                    {pendingCount} pending
                  </span>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto">
                {/* Care-team chat notifications (nurse ↔ doctor) */}
                {chatNotifs.length > 0 && (
                  <div className="border-b border-slate-100">
                    <div className="px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-teal-600 bg-teal-50/50">Care Team Chat</div>
                    {chatNotifs.slice(0, 8).map(n => {
                      const pname = patients.find(p => p.id === n.patientId)?.name || 'Patient';
                      return (
                        <Link key={n.id} to={`/app/patients/${n.patientId}?tab=chat`}
                          onClick={() => { setBellOpen(false); markChatSeen(); }}
                          className="block px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-slate-900">{n.senderName} <span className="text-xs font-normal text-slate-400">· {pname}</span></span>
                            <span className="text-[10px] text-slate-400 flex-shrink-0">{new Date(n.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                          </div>
                          <div className="text-xs text-slate-600 truncate mt-0.5">{n.message}</div>
                        </Link>
                      );
                    })}
                  </div>
                )}
                {/* In-app notifications (referrals, etc.) */}
                {appNotifs.length > 0 && (
                  <div className="border-b border-slate-100">
                    <div className="px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-indigo-600 bg-indigo-50/50">Notifications</div>
                    {appNotifs.slice(0, 5).map(n => (
                      <Link key={n.id}
                        to={n.entityType === 'referral' ? '/app/referrals' : '/app/dashboard'}
                        onClick={() => setBellOpen(false)}
                        className="block px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                            <span className="text-sm font-semibold text-slate-900">{n.title}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 flex-shrink-0">
                            {new Date(n.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 mt-0.5 line-clamp-2">{n.message}</div>
                      </Link>
                    ))}
                  </div>
                )}
                {pendingCount === 0 && chatNotifs.length === 0 && appNotifs.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-sm">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No notifications
                  </div>
                ) : pendingCount === 0 ? null : (
                  requests.map(r => (
                    <div key={r.id} className="px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{r.patient_name}{r.patient_age ? `, ${r.patient_age}y` : ''}</div>
                          <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                            <Phone className="w-3 h-3" />{r.patient_phone}
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap flex-shrink-0 mt-0.5">
                          {new Date(r.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </span>
                      </div>
                      {r.preferred_date && (
                        <div className="flex items-center gap-1 text-xs text-teal-700 mb-1.5">
                          <Calendar className="w-3 h-3" />
                          {fmtSlot(r.preferred_date, r.preferred_time)}
                          {r.clinic_name && <span className="text-slate-400 ml-1">· {r.clinic_name}</span>}
                        </div>
                      )}
                      {r.reason && <div className="text-xs text-slate-500 mb-2 truncate">{r.reason}</div>}
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateStatus(r.id, 'confirmed')}
                          disabled={updating === r.id}
                          className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-lg py-1.5 transition-colors disabled:opacity-50"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Confirm
                        </button>
                        <button
                          onClick={() => updateStatus(r.id, 'cancelled')}
                          disabled={updating === r.id}
                          className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg py-1.5 transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Cancel
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <Link
                to="/app/bookings"
                onClick={() => setBellOpen(false)}
                className="flex items-center justify-center gap-1 px-4 py-3 text-xs font-semibold text-teal-600 hover:bg-teal-50 transition-colors border-t border-slate-100"
              >
                View all booking requests <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Avatar + name — click goes to My Profile */}
        <Link to="/app/profile" className="flex items-center gap-2 pl-2 border-l border-slate-200 hover:opacity-80 transition-opacity" aria-label="My profile">
          <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user?.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="hidden md:block">
            <div className="text-sm font-semibold text-slate-800 leading-tight">{user?.name}</div>
            <div className="text-[11px] text-slate-400 capitalize">
              {user?.role === 'clinic_admin' ? 'Solo Practice' : user?.role === 'clinic_manager' ? 'Clinic Manager' : user?.role}
            </div>
          </div>
        </Link>
      </div>
    </header>
  );
}
