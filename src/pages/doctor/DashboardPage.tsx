import { useState, useRef } from 'react';
import { useAppStore, uid } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { usePadStore } from '@/store/usePadStore';
import { Link, useNavigate } from 'react-router-dom';
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge';
import {
  Users, BedDouble, Bell, Clock, TrendingUp, AlertTriangle, Activity,
  CheckCircle2, Pencil, Search, UserPlus, X, ArrowRight, Phone,
  ChevronRight, Building2, ChevronDown, Edit2, Calendar, CalendarDays, Settings2, BarChart3, DollarSign
} from 'lucide-react';
import { formatDateTime, cn, localDate } from '@/lib/utils';
import type { Patient } from '@/types';

// ─── Today's Clinic Widget ─────────────────────────────────────────────────────

function TodayClinicWidget() {
  const { todayAvailability, setTodayAvailability, queue } = useAppStore();
  const { clinics } = usePadStore();
  const [open, setOpen] = useState(false);

  const todayStr = localDate();
  const avail = todayAvailability?.date === todayStr ? todayAvailability : null;
  const todayCount = queue.filter(q => q.status !== 'no-show').length;

  const todayDow = new Date().getDay(); // 0=Sun
  function defaultsForClinic(id: string) {
    const clinic = clinics.find(c => c.id === id);
    const daySchedule = clinic?.schedule?.find(d => d.day === todayDow);
    return {
      start: daySchedule?.sessions[0]?.start ?? '09:00',
      end: daySchedule?.sessions[0]?.end ?? '13:00',
      max: daySchedule?.maxPatients ?? clinic?.maxPatients ?? 20,
    };
  }
  const initClinicId = avail?.clinicId ?? clinics[0]?.id ?? '';
  const initDefaults = defaultsForClinic(initClinicId);
  const [clinicId, setClinicId] = useState(initClinicId);
  const [startTime, setStartTime] = useState(avail?.startTime ?? initDefaults.start);
  const [endTime, setEndTime] = useState(avail?.endTime ?? initDefaults.end);
  const [maxPat, setMaxPat] = useState(avail?.maxPatients ?? initDefaults.max);

  function save() {
    const clinic = clinics.find(c => c.id === clinicId);
    if (!clinic) return;
    setTodayAvailability({ date: todayStr, clinicId, clinicName: clinic.name, isOpen: true, startTime, endTime, maxPatients: maxPat });
    setOpen(false);
  }

  function closeClinic() {
    setTodayAvailability(null);
    setOpen(false);
  }

  if (clinics.length === 0) return null;

  // Collapsed state — show banner if set, else show setup prompt
  if (!open) {
    if (avail) {
      const pct = Math.min((todayCount / avail.maxPatients) * 100, 100);
      const atLimit = todayCount >= avail.maxPatients;
      return (
        <div className="rounded-2xl p-4 flex items-center gap-4 flex-wrap mb-6 cursor-pointer hover:shadow-md transition-shadow"
          style={{ background: 'linear-gradient(135deg, #0d948812, #0d948805)', border: '1.5px solid #0d948840' }}
          onClick={() => setOpen(true)}>
          <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-teal-800 text-sm flex items-center gap-1.5">
              {avail.clinicName}
              <Edit2 className="w-3 h-3 text-teal-400" />
            </div>
            <div className="text-xs text-teal-600">{avail.startTime} – {avail.endTime}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-2xl font-black text-slate-900 leading-none">
                {todayCount}<span className="text-sm font-normal text-slate-400">/{avail.maxPatients}</span>
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">patients</div>
            </div>
            <div className="w-14 h-2 rounded-full bg-slate-200 overflow-hidden">
              <div className={cn('h-full rounded-full transition-all', atLimit ? 'bg-red-500' : pct > 75 ? 'bg-amber-400' : 'bg-teal-500')}
                style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      );
    }
    return (
      <button onClick={() => setOpen(true)}
        className="w-full rounded-2xl p-4 border-2 border-dashed border-teal-200 bg-teal-50 flex items-center gap-3 hover:border-teal-400 transition-colors mb-6 text-left">
        <div className="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center flex-shrink-0">
          <Building2 className="w-4.5 h-4.5 text-teal-600" />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-teal-700 text-sm">Set today's clinic</div>
          <div className="text-xs text-teal-500">Tap to pick location · hours · patient limit</div>
        </div>
        <ChevronDown className="w-4 h-4 text-teal-400" />
      </button>
    );
  }

  // Expanded editor
  return (
    <div className="rounded-2xl p-5 border-2 border-teal-300 bg-teal-50 space-y-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="font-bold text-teal-800 flex items-center gap-2"><Building2 className="w-4 h-4" /> Today's Clinic Setup</div>
        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
      </div>

      {/* Clinic selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {clinics.map(c => (
          <button key={c.id} onClick={() => {
                const d = defaultsForClinic(c.id);
                setClinicId(c.id); setStartTime(d.start); setEndTime(d.end); setMaxPat(d.max);
              }}
            className={cn('flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all',
              clinicId === c.id ? 'border-teal-500 bg-white shadow-sm' : 'border-teal-200 bg-white/60 hover:border-teal-300')}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: (c.color ?? '#0d9488') + '20' }}>
              <Building2 className="w-4 h-4" style={{ color: c.color ?? '#0d9488' }} />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-slate-900 text-sm truncate">{c.name}</div>
              <div className="text-[11px] text-slate-400 truncate">{c.address}</div>
              <div className="text-[11px] text-teal-600">₹{c.fee} · max {c.maxPatients}/day</div>
            </div>
            {clinicId === c.id && <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0 ml-auto" />}
          </button>
        ))}
        <Link to="/app/settings?tab=clinics" onClick={() => setOpen(false)}
          className="flex items-center gap-2 p-3 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-teal-300 hover:text-teal-600 transition-colors text-sm">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
            <UserPlus className="w-4 h-4" />
          </div>
          Add new clinic
        </Link>
      </div>

      {/* Time and limit */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label text-teal-700">Start</label>
          <input type="time" className="input bg-white text-sm" value={startTime} onChange={e => setStartTime(e.target.value)} />
        </div>
        <div>
          <label className="label text-teal-700">End</label>
          <input type="time" className="input bg-white text-sm" value={endTime} onChange={e => setEndTime(e.target.value)} />
        </div>
        <div>
          <label className="label text-teal-700">Max patients</label>
          <input type="number" min={1} max={100} className="input bg-white text-sm" value={maxPat} onChange={e => setMaxPat(Number(e.target.value))} />
        </div>
      </div>

      <div className="flex gap-2">
        {avail && <button onClick={closeClinic} className="btn-secondary btn-sm text-red-600 border-red-200 hover:bg-red-50">Close clinic today</button>}
        <button onClick={save} className="btn-primary flex-1" disabled={!clinicId}>
          <CheckCircle2 className="w-4 h-4" /> Start today's session
        </button>
      </div>
    </div>
  );
}

// ─── Quick Rx Modal ────────────────────────────────────────────────────────────

function QuickRxModal({ onClose }: { onClose: () => void }) {
  const { patients, upsertPatient, showToast } = useAppStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'search' | 'new'>('search');
  const [form, setForm] = useState({
    name: '', age: '', gender: 'M' as 'M' | 'F' | 'Other',
    phone: '', complaint: '',
  });
  const searchRef = useRef<HTMLInputElement>(null);

  const results = query.trim().length >= 1
    ? patients.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.mrn.toLowerCase().includes(query.toLowerCase()) ||
        (p.phone ?? '').includes(query)
      ).slice(0, 6)
    : patients.slice(0, 5);

  function startConsult(patient: Patient) {
    onClose();
    navigate(`/app/consult/${patient.id}`);
  }

  function handleCreate() {
    if (!form.name.trim() || !form.age) {
      showToast('Name and age are required', 'error');
      return;
    }
    const newPatient: Patient = {
      id: uid(),
      name: form.name.trim(),
      age: Number(form.age),
      gender: form.gender,
      mrn: `MRN-${Date.now().toString().slice(-6)}`,
      phone: form.phone || undefined,
      status: 'OPD',
      priority: 'Stable',
      diagnosis: form.complaint || undefined,
      attendingDoctor: user?.name,
      attendingDoctorId: user?.id,
    };
    upsertPatient(newPatient);
    showToast(`${newPatient.name} registered`, 'success');
    onClose();
    navigate(`/app/consult/${newPatient.id}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[10vh]"
      onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-teal-600 to-teal-500">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Pencil className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <div className="font-bold text-white">Write Rx / Start Consultation</div>
              <div className="text-teal-100 text-xs">Search patient or register new</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toggle */}
        <div className="flex border-b border-slate-100">
          <button onClick={() => setMode('search')}
            className={cn('flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors',
              mode === 'search' ? 'text-teal-600 border-b-2 border-teal-500 bg-teal-50' : 'text-slate-500 hover:text-slate-700')}>
            <Search className="w-3.5 h-3.5" /> Existing Patient
          </button>
          <button onClick={() => { setMode('new'); setTimeout(() => (document.getElementById('qrx-name') as HTMLInputElement)?.focus(), 50); }}
            className={cn('flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors',
              mode === 'new' ? 'text-teal-600 border-b-2 border-teal-500 bg-teal-50' : 'text-slate-500 hover:text-slate-700')}>
            <UserPlus className="w-3.5 h-3.5" /> New Patient
          </button>
        </div>

        {mode === 'search' ? (
          <div className="p-4 space-y-3">
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={searchRef}
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by name, MRN or phone…"
                className="input pl-9 w-full"
              />
              {query && (
                <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Patient list */}
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {results.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-sm">
                  No patients found
                  <button onClick={() => setMode('new')} className="block mx-auto mt-2 text-teal-600 font-semibold hover:underline text-sm">
                    Register new patient →
                  </button>
                </div>
              ) : (
                results.map(p => (
                  <button key={p.id} type="button" onClick={() => startConsult(p)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-teal-50 hover:border-teal-200 border border-transparent transition-all group text-left">
                    <div className="w-9 h-9 rounded-full bg-navy-800 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {p.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 text-sm">{p.name}</div>
                      <div className="text-xs text-slate-500">
                        {p.age}y · {p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : 'Other'} · {p.mrn}
                        {p.phone && <> · <Phone className="w-3 h-3 inline mx-0.5" />{p.phone}</>}
                      </div>
                      {p.diagnosis && <div className="text-xs text-slate-400 truncate">{p.diagnosis}</div>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StatusBadge status={p.status} />
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-teal-500 transition-colors" />
                    </div>
                  </button>
                ))
              )}
            </div>

            {!query && patients.length > 5 && (
              <p className="text-xs text-slate-400 text-center">Showing recent patients · type to search all {patients.length}</p>
            )}
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Patient Name *</label>
                <input id="qrx-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Full name" className="input w-full" />
              </div>
              <div>
                <label className="label">Age *</label>
                <input type="number" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
                  placeholder="e.g. 45" className="input w-full" min={0} max={120} />
              </div>
              <div>
                <label className="label">Gender</label>
                <div className="flex gap-2">
                  {(['M', 'F', 'Other'] as const).map(g => (
                    <button key={g} type="button" onClick={() => setForm(f => ({ ...f, gender: g }))}
                      className={cn('flex-1 py-2 rounded-xl border-2 text-sm font-semibold transition-all',
                        form.gender === g ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-500 hover:border-slate-300')}>
                      {g === 'M' ? 'Male' : g === 'F' ? 'Female' : 'Other'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Phone (optional)</label>
                <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="9876543210" className="input w-full" />
              </div>
              <div>
                <label className="label">Chief Complaint (optional)</label>
                <input value={form.complaint} onChange={e => setForm(f => ({ ...f, complaint: e.target.value }))}
                  placeholder="e.g. Fever, headache" className="input w-full" />
              </div>
            </div>
            <button type="button" onClick={handleCreate}
              className="btn-primary w-full py-3 text-base gap-2"
              disabled={!form.name.trim() || !form.age}>
              <ArrowRight className="w-5 h-5" />
              Register & Start Consultation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { patients, alerts, queue, vitals, appointments, bills } = useAppStore();
  const [showRxModal, setShowRxModal] = useState(false);

  const myPatients = patients.filter(p => p.attendingDoctorId === user?.id);
  const ipd = myPatients.filter(p => p.status === 'IPD');
  const opd = myPatients.filter(p => p.status === 'OPD');
  const critical = myPatients.filter(p => p.priority === 'Critical');
  const unackAlerts = alerts.filter(a => !a.acknowledged);
  const waitingQueue = queue.filter(q => q.status === 'waiting' || q.status === 'in-progress');

  const todayStr = localDate();
  const todayAppointments = appointments
    .filter(a => a.date === todayStr && a.status !== 'cancelled')
    .sort((a, b) => a.time > b.time ? 1 : -1);
  const upcomingCount = appointments.filter(a => a.date >= todayStr && a.status === 'scheduled').length;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div>
      {/* Greeting + Write Rx CTA */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {greeting}, {user?.name?.split(' ').slice(0, 2).join(' ')} 👋
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Here's your clinical overview for today.</p>
        </div>
        <button
          onClick={() => setShowRxModal(true)}
          className="flex-shrink-0 flex items-center gap-2.5 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold px-5 py-3 rounded-2xl shadow-lg shadow-teal-500/30 transition-all text-sm"
        >
          <Pencil className="w-4.5 h-4.5" />
          <span className="hidden sm:inline">Write Rx</span>
          <span className="sm:hidden">Rx</span>
        </button>
      </div>

      {/* Today's clinic check-in — only for clinic_admin */}
      {user?.role === 'clinic_admin' && <TodayClinicWidget />}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<BedDouble className="w-5 h-5 text-blue-500" />}
          label="IPD Patients"
          value={ipd.length}
          sub={`${critical.length} critical`}
          subColor="text-red-500"
          bg="bg-blue-50"
          to="/app/patients"
        />
        <StatCard
          icon={<Users className="w-5 h-5 text-teal-500" />}
          label="OPD Today"
          value={opd.length}
          sub={`${waitingQueue.length} in queue`}
          subColor="text-slate-500"
          bg="bg-teal-50"
          to="/app/queue"
        />
        <StatCard
          icon={<Bell className="w-5 h-5 text-red-500" />}
          label="Active Alerts"
          value={unackAlerts.length}
          sub="Unacknowledged"
          subColor={unackAlerts.length > 0 ? 'text-red-500' : 'text-slate-500'}
          bg="bg-red-50"
          to="/app/alerts"
        />
        <StatCard
          icon={<Activity className="w-5 h-5 text-emerald-500" />}
          label="Upcoming Appts"
          value={upcomingCount}
          sub={`${todayAppointments.length} today`}
          subColor="text-slate-500"
          bg="bg-emerald-50"
          to="/app/schedule"
        />
      </div>

      {/* Quick actions row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { icon: UserPlus, label: 'New Patient', color: '#0d9488', bg: '#f0fdfa', action: () => setShowRxModal(true) },
          { icon: CalendarDays, label: "Today's Schedule", color: '#7c3aed', bg: '#f5f3ff', to: '/app/schedule' },
          { icon: Settings2, label: 'Pad Settings', color: '#0369a1', bg: '#f0f9ff', to: '/app/pad-settings' },
          { icon: BarChart3, label: 'Analytics', color: '#b45309', bg: '#fffbeb', to: '/app/analytics' },
        ].map(q => (
          q.to ? (
            <Link key={q.label} to={q.to}
              className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:shadow-sm transition-all group"
            >
              <div style={{ width: 36, height: 36, borderRadius: 10, background: q.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <q.icon style={{ width: 16, height: 16, color: q.color }} />
              </div>
              <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">{q.label}</span>
            </Link>
          ) : (
            <button key={q.label} onClick={q.action}
              className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:shadow-sm transition-all group text-left"
            >
              <div style={{ width: 36, height: 36, borderRadius: 10, background: q.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <q.icon style={{ width: 16, height: 16, color: q.color }} />
              </div>
              <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">{q.label}</span>
            </button>
          )
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Patient list */}
        <div className="xl:col-span-2 card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900">My Patients</h3>
              <p className="text-xs text-slate-500">{myPatients.length} total · {critical.length} critical</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowRxModal(true)}
                className="btn-secondary btn-sm text-teal-600 border-teal-200 hover:bg-teal-50">
                <Pencil className="w-3.5 h-3.5" /> New Consult
              </button>
              <Link to="/app/patients" className="btn-secondary btn-sm">View all</Link>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {myPatients.slice(0, 6).map(p => {
              const latest = vitals[p.id]?.[0];
              return (
                <div key={p.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors group">
                  <Link to={`/app/patients/${p.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-700 font-bold text-sm flex-shrink-0">
                      {p.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-sm">{p.name}</span>
                        <span className="text-xs text-slate-400">{p.age}y {p.gender}</span>
                      </div>
                      <div className="text-xs text-slate-500 truncate">{p.diagnosis || 'No diagnosis'}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {latest && (
                        <span className="text-xs text-slate-500 hidden md:inline">
                          BP {latest.bp} · SpO2 {latest.spo2}%
                        </span>
                      )}
                      <StatusBadge status={p.status} />
                      <PriorityBadge priority={p.priority} />
                    </div>
                  </Link>
                  {/* Quick consult from patient row */}
                  <Link to={`/app/consult/${p.id}`}
                    className="btn-secondary btn-sm text-teal-600 border-teal-200 hover:bg-teal-50 flex-shrink-0">
                    <Pencil className="w-3 h-3" /> Rx
                  </Link>
                </div>
              );
            })}
            {myPatients.length === 0 && (
              <div className="px-5 py-10 text-center">
                <p className="text-slate-400 text-sm mb-3">No patients assigned yet</p>
                <button onClick={() => setShowRxModal(true)}
                  className="btn-primary btn-sm gap-2">
                  <UserPlus className="w-3.5 h-3.5" /> Register first patient
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Unack Alerts */}
          <div className="card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                Active Alerts
              </h3>
              <Link to="/app/alerts" className="text-xs text-teal-600 hover:underline">View all</Link>
            </div>
            <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto">
              {unackAlerts.slice(0, 5).map(a => (
                <div key={a.id} className="px-5 py-3">
                  <div className="flex items-start gap-2">
                    <span className="w-2 h-2 mt-1.5 rounded-full bg-red-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">{a.patientName}</div>
                      <div className="text-xs text-slate-500 truncate">{a.message}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{formatDateTime(a.time)}</div>
                    </div>
                  </div>
                </div>
              ))}
              {unackAlerts.length === 0 && (
                <div className="px-5 py-5 flex items-center gap-2 text-sm text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" /> All clear
                </div>
              )}
            </div>
          </div>

          {/* Today's Appointments */}
          {todayAppointments.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-teal-500" />
                  Today's Appointments
                </h3>
                <span className="text-xs text-slate-400">{todayAppointments.length} scheduled</span>
              </div>
              <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto">
                {todayAppointments.map(apt => (
                  <div key={apt.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-teal-700">{apt.time}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-900">{apt.patientName}</div>
                      <div className="text-xs text-slate-500 truncate">{apt.reason}</div>
                      {apt.clinicName && <div className="text-[10px] text-slate-400">{apt.clinicName}</div>}
                    </div>
                    {(apt.status === 'scheduled' || apt.status === 'confirmed') && (
                      <Link to={`/app/consult/${apt.patientId}`}
                        className="flex-shrink-0 text-xs font-semibold text-teal-600 hover:underline">
                        Consult
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* OPD Queue */}
          <div className="card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-500" />
                OPD Queue
              </h3>
              <Link to="/app/queue" className="text-xs text-teal-600 hover:underline">Manage</Link>
            </div>
            <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto">
              {waitingQueue.slice(0, 4).map(q => (
                <Link key={q.id} to={`/app/consult/${q.patientId}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-teal-50 transition-colors group">
                  <div className="w-7 h-7 rounded-full bg-teal-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {q.token}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-900 group-hover:text-teal-700">{q.patientName}</div>
                    <div className="text-xs text-slate-500 truncate">{q.reason}</div>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0">
                    <span className={`badge text-[10px] ${q.status === 'in-progress' ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-600'}`}>
                      {q.status === 'in-progress' ? 'In Consult' : 'Waiting'}
                    </span>
                    {q.waitMins != null && <span className="text-[10px] text-slate-400 mt-0.5">{q.waitMins}m wait</span>}
                  </div>
                </Link>
              ))}
              {waitingQueue.length === 0 && (
                <div className="px-5 py-5 text-sm text-slate-400 text-center">Queue empty</div>
              )}
            </div>
          </div>

          {/* Revenue snapshot — only when billing data exists */}
          {bills.length > 0 && (() => {
            const todayStr = localDate();
            const todayBills = bills.filter(b => b.createdAt.slice(0, 10) === todayStr);
            const todayRevenue = todayBills.filter(b => b.status === 'paid').reduce((s, b) => s + b.total, 0);
            const pendingRevenue = bills.filter(b => b.status === 'pending').reduce((s, b) => s + b.total, 0);
            return (
              <div className="card px-5 py-4">
                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  Revenue Snapshot
                </h3>
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Today's collections</span>
                    <span className="font-bold text-emerald-600 text-sm">₹{todayRevenue.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Bills today</span>
                    <span className="font-bold text-slate-900 text-sm">{todayBills.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Pending payment</span>
                    <span className="font-bold text-amber-600 text-sm">₹{pendingRevenue.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Quick stats */}
          <div className="card px-5 py-4">
            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-500" />
              Today's Summary
            </h3>
            <div className="space-y-2.5">
              {[
                { label: 'Discharges today', value: myPatients.filter(p => p.status === 'Discharged').length },
                { label: 'Labs pending', value: Object.values(vitals).flat().length > 0 ? 2 : 0 },
                { label: 'Rx written', value: 4 },
                { label: 'Consult notes', value: 3 },
              ].map(s => (
                <div key={s.label} className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">{s.label}</span>
                  <span className="font-bold text-slate-900 text-sm">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Rx Modal */}
      {showRxModal && <QuickRxModal onClose={() => setShowRxModal(false)} />}
    </div>
  );
}

function StatCard({
  icon, label, value, sub, subColor, bg, to
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub: string;
  subColor: string;
  bg: string;
  to: string;
}) {
  return (
    <Link to={to} className="stat-card hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>{icon}</div>
      </div>
      <div className="text-3xl font-black text-slate-900">{value}</div>
      <div className="text-sm font-medium text-slate-600">{label}</div>
      <div className={`text-xs mt-0.5 font-medium ${subColor}`}>{sub}</div>
    </Link>
  );
}
