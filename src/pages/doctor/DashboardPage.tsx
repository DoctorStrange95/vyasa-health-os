import { useState, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import NurseHome from '@/pages/nurse/NurseHome';
import ClinicAdminDashboard from '@/pages/admin/ClinicAdminDashboard';
import { useAuthStore } from '@/store/useAuthStore';
import { usePadStore } from '@/store/usePadStore';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import {
  Users, BedDouble, Bell, Clock, Activity,
  CheckCircle2, Pencil, X, UserPlus,
  Building2, ChevronDown, Edit2, Calendar, CalendarDays, BarChart3, ChevronRight, PlayCircle, FileText
} from 'lucide-react';
import React from 'react';
import { cn, localDate } from '@/lib/utils';
import { api, isApiEnabled } from '@/lib/api';
import type { AppointmentEntry, QueueEntry } from '@/types';

// ─── Today's Clinic Widget ─────────────────────────────────────────────────────

function TodayClinicWidget() {
  const { todayAvailability, setTodayAvailability, queue } = useAppStore();
  const { clinics } = usePadStore();
  const [open, setOpen] = useState(false);

  const todayStr = localDate();
  const avail = todayAvailability?.date === todayStr ? todayAvailability : null;
  const todayCount = queue.filter(q => q.status !== 'no-show').length;

  const todayDow = new Date().getDay();
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

  if (!open) {
    if (avail) {
      const pct = Math.min((todayCount / avail.maxPatients) * 100, 100);
      const atLimit = todayCount >= avail.maxPatients;
      return (
        <div className="rounded-2xl p-4 flex items-center gap-4 flex-wrap mb-6 cursor-pointer hover:shadow-md transition-shadow animate-fade-up"
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
        className="w-full rounded-2xl p-4 border-2 border-dashed border-teal-200 bg-teal-50 flex items-center gap-3 hover:border-teal-400 transition-colors mb-6 text-left animate-fade-up">
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

  return (
    <div className="rounded-2xl p-5 border-2 border-teal-300 bg-teal-50 space-y-4 mb-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div className="font-bold text-teal-800 flex items-center gap-2"><Building2 className="w-4 h-4" /> Today's Clinic Setup</div>
        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
      </div>
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

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { patients, alerts, queue, setQueue, visits, appointments, openQuickRxModal, updateAppointment, showToast, refreshAppointments, upsertPatient } = useAppStore();
  const navigate = useNavigate();

  // One-click: confirm (if pending booking) + check in + open consult
  const startConsult = useCallback((apt: AppointmentEntry) => {
    const isBR = apt.id.startsWith('BR-');
    const bookingId = isBR ? apt.id.slice(3) : null;
    // Stable patient ID: BR-{n} for booking patients, real patientId for registered patients
    const stablePatientId = isBR ? `BR-${bookingId}` : (apt.patientId || `apt-${apt.id}`);
    const consultPath = `/app/consult/${stablePatientId}`;

    if (isBR && bookingId) {
      // Create patient record from booking data so ConsultPage finds it directly
      upsertPatient({
        id: `BR-${bookingId}`,
        name: apt.patientName,
        age: apt.patientAge ?? 0,
        gender: (apt.patientGender as 'M' | 'F' | 'Other') ?? 'M',
        mrn: `BK-${bookingId}`,
        phone: apt.patientPhone ?? '',
        status: 'OPD',
        priority: 'Stable',
        diagnosis: apt.reason,
        attendingDoctor: user?.name,
        attendingDoctorId: typeof user?.id === 'number' ? user.id : undefined,
        clinicId: apt.clinicId ?? '',
        allergies: [],
      });
      if (isApiEnabled()) {
        api.patch(`/booking-requests/${bookingId}`, { status: 'confirmed' })
          .then(() => refreshAppointments())
          .catch(() => {});
      }
    }

    const alreadyInQueue = queue.some(q => q.patientId === stablePatientId);
    if (!alreadyInQueue) {
      const token = queue.length + 1;
      setQueue([...queue, {
        id: `Q${Date.now()}`,
        patientId: stablePatientId,
        patientName: apt.patientName,
        reason: apt.reason ?? 'OPD Appointment',
        token,
        status: 'in-progress',
        waitMins: 0,
        registeredAt: new Date().toISOString(),
        assignedDoctor: user?.name,
      } as QueueEntry]);
      if (!isBR) updateAppointment(apt.id, { status: 'checked-in' as never });
      showToast(`${apt.patientName} — Token ${token}`, 'success');
    }
    navigate(consultPath);
  }, [queue, setQueue, updateAppointment, showToast, navigate, user, refreshAppointments, upsertPatient]);

  const myPatients = patients
    .filter(p => p.attendingDoctorId === user?.id)
    .sort((a, b) => {
      const aDate = (visits[a.id] ?? [])[0]?.date ?? '';
      const bDate = (visits[b.id] ?? [])[0]?.date ?? '';
      if (bDate && !aDate) return 1;
      if (aDate && !bDate) return -1;
      return bDate.localeCompare(aDate);
    });
  const ipd = myPatients.filter(p => p.status === 'IPD');
  const critical = myPatients.filter(p => p.priority === 'Critical');
  const unackAlerts = alerts.filter(a => !a.acknowledged);
  const waitingQueue = queue.filter(q => q.status === 'waiting' || q.status === 'in-progress');

  const todayStr = localDate();
  const todayAppointments = appointments
    .filter(a => a.date === todayStr && a.status !== 'cancelled')
    .sort((a, b) => a.time > b.time ? 1 : -1);
  const upcomingCount = appointments.filter(a => a.date >= todayStr && a.status === 'scheduled').length;

  // Patient IDs tied to today's appointments (so we don't show them twice in OPD Queue)
  const aptLinkedPatientIds = new Set<string>();
  todayAppointments.forEach(apt => {
    if (apt.patientId) aptLinkedPatientIds.add(apt.patientId);
    aptLinkedPatientIds.add(`apt-${apt.id}`);
    if (apt.id.startsWith('BR-')) aptLinkedPatientIds.add(`BR-${apt.id.slice(3)}`);
  });
  // Walk-in queue: only patients NOT tied to a today's appointment
  const walkinQueue = waitingQueue.filter(q => !aptLinkedPatientIds.has(q.patientId));

  // Helper: find the queue entry for a given appointment (so we can show token/status on the appointment card)
  function aptQueueEntry(apt: AppointmentEntry) {
    const pid = apt.patientId || `apt-${apt.id}`;
    const brPid = apt.id.startsWith('BR-') ? `BR-${apt.id.slice(3)}` : null;
    return queue.find(q => q.patientId === pid || (brPid && q.patientId === brPid));
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Nurses get a simplified Home (summary cards), not the doctor dashboard.
  if (user?.role === 'nurse') return <NurseHome />;

  // clinic_manager role = non-doctor clinic owner/admin → operations dashboard
  // clinic_admin (solo doctor) ALWAYS gets the doctor dashboard regardless of specialty
  if (user?.role === 'clinic_manager') return <ClinicAdminDashboard />;

  // Non-clinical roles — redirect to their proper home instead of showing doctor dashboard
  if (user?.role === 'labtech')    return <Navigate to="/app/labtech" replace />;
  if (user?.role === 'pharmacist') return <Navigate to="/app/pharmacy" replace />;
  if (user?.role === 'billing')    return <Navigate to="/app/billing" replace />;
  if (user?.role === 'admin')      return <Navigate to="/app/staff" replace />;

  // Stats
  const totalPatients = myPatients.length;
  const totalVisits = Object.values(visits).flat().length;
  const totalRx = Object.values(useAppStore.getState().prescriptions).flat().length;
  const followUpsDue = appointments.filter(a => a.date >= todayStr && a.status === 'scheduled').length;

  // Recent activity feed
  const recentActivity: { icon: React.ReactNode; text: string; time: string }[] = [];
  Object.values(visits).flat().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 2).forEach(v => {
    const p = patients.find(pt => pt.id === v.patientId);
    if (p) recentActivity.push({ icon: <FileText style={{ width: 14, height: 14, color: '#0d9488' }} />, text: `New prescription created for ${p.name}`, time: v.date });
  });
  [...todayAppointments].reverse().slice(0, 2).forEach(a => {
    recentActivity.push({ icon: <Calendar style={{ width: 14, height: 14, color: '#7c3aed' }} />, text: `Appointment booked for ${a.patientName}`, time: a.time });
  });

  const firstNameOnly = user?.name?.split(' ').find(w => !/^dr\.?$/i.test(w)) ?? user?.name?.split(' ')[0] ?? '';

  return (
    <div className="w-full space-y-4">

      {/* ── Greeting + primary CTA ── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">
            {greeting}, {['doctor','clinic_admin','superadmin'].includes(user?.role ?? '') ? `Dr. ${firstNameOnly}` : firstNameOnly} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {todayAppointments.length > 0
              ? `${todayAppointments.length} appointment${todayAppointments.length > 1 ? 's' : ''} scheduled today`
              : waitingQueue.length > 0
              ? `${waitingQueue.length} patient${waitingQueue.length > 1 ? 's' : ''} waiting in queue`
              : 'No appointments yet today — start by registering a patient'}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={() => navigate('/app/queue')}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold hover:border-teal-300 transition-all">
            <Users className="w-4 h-4 text-teal-500" /> OPD Queue
          </button>
          <button onClick={openQuickRxModal}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm shadow-teal-200 transition-all">
            <Pencil className="w-4 h-4" /> Write Prescription
          </button>
        </div>
      </div>

      {/* Clinic widget */}
      {user?.role === 'clinic_admin' && <TodayClinicWidget />}

      {/* ── Stat tiles: 2×2 on mobile, 4 on desktop ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { to: '/app/patients', bg: 'bg-blue-50', iconBg: 'bg-blue-100', icon: <BedDouble size={18} className="text-blue-500" />, value: ipd.length, label: 'IPD Patients', badge: critical.length > 0 ? { text: `${critical.length} critical`, color: 'text-red-500' } : null },
          { to: '/app/queue', bg: 'bg-teal-50', iconBg: 'bg-teal-100', icon: <Clock size={18} className="text-teal-500" />, value: waitingQueue.length, label: 'OPD Queue', badge: waitingQueue.length > 0 ? { text: 'Waiting now', color: 'text-teal-600' } : { text: 'Queue empty', color: 'text-slate-400' } },
          { to: '/app/alerts', bg: 'bg-red-50', iconBg: 'bg-red-100', icon: <Bell size={18} className="text-red-400" />, value: unackAlerts.length, label: 'Active Alerts', badge: unackAlerts.length > 0 ? { text: 'Need attention', color: 'text-red-500' } : { text: 'All clear', color: 'text-emerald-500' } },
          { to: '/app/schedule', bg: 'bg-violet-50', iconBg: 'bg-violet-100', icon: <CalendarDays size={18} className="text-violet-500" />, value: upcomingCount, label: 'Upcoming Appts', badge: { text: `${todayAppointments.length} today`, color: 'text-slate-500' } },
        ].map(s => (
          <Link key={s.label} to={s.to} className={`${s.bg} rounded-2xl p-4 flex flex-col gap-3 hover:shadow-md transition-all no-underline`}>
            <div className="flex items-center justify-between">
              <div className={`${s.iconBg} w-9 h-9 rounded-xl flex items-center justify-center`}>{s.icon}</div>
              <ChevronRight size={14} className="text-slate-400" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 leading-none">{s.value}</div>
              <div className="text-xs font-semibold text-slate-600 mt-1">{s.label}</div>
              {s.badge && <div className={`text-[11px] font-semibold mt-0.5 ${s.badge.color}`}>{s.badge.text}</div>}
            </div>
          </Link>
        ))}
      </div>

      {/* ── Quick actions: 3 on mobile, 5 on desktop ── */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
        {[
          { icon: <UserPlus size={18} className="text-teal-600" />, bg: 'bg-teal-50', label: 'Register Patient', action: () => navigate('/app/register') },
          { icon: <CalendarDays size={18} className="text-violet-600" />, bg: 'bg-violet-50', label: 'New Appointment', action: () => navigate('/app/schedule') },
          { icon: <Pencil size={18} className="text-blue-600" />, bg: 'bg-blue-50', label: 'Write Rx', action: openQuickRxModal },
          { icon: <Activity size={18} className="text-amber-600" />, bg: 'bg-amber-50', label: 'Lab Orders', action: () => navigate('/app/labs') },
          { icon: <BarChart3 size={18} className="text-indigo-600" />, bg: 'bg-indigo-50', label: 'Analytics', action: () => navigate('/app/analytics') },
        ].map(q => (
          <button key={q.label} onClick={q.action}
            className={`${q.bg} flex flex-col items-center justify-center gap-2 rounded-2xl p-3 hover:shadow-md transition-all border border-transparent hover:border-slate-200 cursor-pointer`}>
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">{q.icon}</div>
            <span className="text-[11px] font-semibold text-slate-600 text-center leading-tight">{q.label}</span>
          </button>
        ))}
      </div>

      {/* ── Main content: stacks on mobile, side-by-side on desktop ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">

        {/* LEFT: Today's schedule — the most important section */}
        <div style={{ background: 'white', borderRadius: 14, border: '1.5px solid #f3f4f6', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={15} color="#0d9488" />
              <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>Today's Schedule</span>
              {todayAppointments.length > 0 && (
                <span style={{ background: '#0d9488', color: 'white', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{todayAppointments.length}</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => navigate('/app/register')}
                style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#f0fdfa', color: '#0d9488', border: '1.5px solid #99f6e4', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                <UserPlus size={12} /> Walk-in
              </button>
              <Link to="/app/schedule" style={{ fontSize: 12, color: '#0d9488', fontWeight: 600, textDecoration: 'none' }}>View all</Link>
            </div>
          </div>

          {todayAppointments.length === 0 && walkinQueue.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <Calendar size={24} color="#d1d5db" />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 }}>No patients yet today</div>
              <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>Register a walk-in or schedule an appointment</div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button onClick={() => navigate('/app/register')}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#0d9488', color: 'white', border: 'none', borderRadius: 9, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <UserPlus size={14} /> Register Walk-in
                </button>
                <Link to="/app/schedule"
                  style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'white', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 9, padding: '9px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                  <CalendarDays size={14} /> Schedule Appointment
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Walk-ins at top if any */}
              {walkinQueue.length > 0 && walkinQueue.map(q => (
                <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px', borderBottom: '1px solid #f3f4f6', background: '#fffbeb' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: q.status === 'in-progress' ? '#0d9488' : '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>{q.token}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{q.patientName}</div>
                    <div style={{ fontSize: 12, color: '#92400e', fontWeight: 500 }}>Walk-in · {q.reason || 'OPD'}</div>
                  </div>
                  <span style={{ background: q.status === 'in-progress' ? '#f0fdfa' : '#fffbeb', color: q.status === 'in-progress' ? '#0d9488' : '#d97706', border: `1.5px solid ${q.status === 'in-progress' ? '#99f6e4' : '#fde68a'}`, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
                    {q.status === 'in-progress' ? '● Consulting' : '○ Waiting'}
                  </span>
                  <Link to={`/app/consult/${q.patientId}`}
                    style={{ background: '#0d9488', color: 'white', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, textDecoration: 'none', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <PlayCircle size={13} /> Start
                  </Link>
                </div>
              ))}

              {/* Scheduled appointments */}
              {todayAppointments.map(apt => {
                const isBR = apt.id.startsWith('BR-');
                const qEntry = aptQueueEntry(apt);
                const inProgress = qEntry?.status === 'in-progress';
                const done = apt.status === 'completed';
                return (
                  <div key={apt.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px', borderBottom: '1px solid #f9fafb', opacity: done ? 0.6 : 1 }}>
                    {/* Time block */}
                    <div style={{ minWidth: 44, textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: inProgress ? '#0d9488' : '#374151' }}>{apt.time}</div>
                      {isBR && <div style={{ fontSize: 10, color: '#f59e0b', fontWeight: 700 }}>ONLINE</div>}
                    </div>
                    {/* Avatar */}
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: inProgress ? '#0d9488' : '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: inProgress ? 'white' : '#6b7280', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                      {apt.patientName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{apt.patientName}</span>
                        {apt.patientAge && <span style={{ fontSize: 12, color: '#6b7280' }}>{apt.patientAge}y</span>}
                        {apt.patientGender && <span style={{ fontSize: 12, color: '#9ca3af' }}>· {apt.patientGender === 'M' ? 'Male' : 'Female'}</span>}
                        {apt.consultationType === 'video' && (
                          <span style={{ background: '#eef2ff', color: '#6366f1', border: '1px solid #c7d2fe', borderRadius: 20, padding: '1px 7px', fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                            Video
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{apt.reason || 'OPD visit'}</div>
                    </div>
                    {/* Status + action */}
                    {done ? (
                      <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={13} /> Done</span>
                    ) : apt.consultationType === 'video' && apt.googleMeetLink ? (
                      <a href={apt.googleMeetLink} target="_blank" rel="noopener noreferrer"
                        style={{ background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5, textDecoration: 'none' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                        Join Meet
                      </a>
                    ) : (
                      <button onClick={() => startConsult(apt)}
                        style={{ background: inProgress ? '#0d9488' : 'white', color: inProgress ? 'white' : '#0d9488', border: `1.5px solid ${inProgress ? '#0d9488' : '#99f6e4'}`, borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <PlayCircle size={13} /> {inProgress ? 'Resume' : 'Start'}
                      </button>
                    )}
                  </div>
                );
              })}
              <div style={{ padding: '12px 18px', textAlign: 'center', borderTop: '1px solid #f9fafb' }}>
                <Link to="/app/schedule" style={{ fontSize: 13, color: '#0d9488', fontWeight: 600, textDecoration: 'none' }}>See full schedule →</Link>
              </div>
            </>
          )}
        </div>

        {/* RIGHT: stacked panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* My Patients — compact list */}
          <div style={{ background: 'white', borderRadius: 14, border: '1.5px solid #f3f4f6', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Users size={14} color="#6366f1" />
                <span style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>My Patients</span>
                <span style={{ background: '#eef2ff', color: '#6366f1', borderRadius: 20, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{myPatients.length}</span>
              </div>
              <Link to="/app/patients" style={{ fontSize: 12, color: '#0d9488', fontWeight: 600, textDecoration: 'none' }}>View all</Link>
            </div>
            {myPatients.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 10 }}>No patients assigned yet</div>
                <button onClick={() => navigate('/app/register')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#f0fdfa', color: '#0d9488', border: '1.5px solid #99f6e4', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <UserPlus size={12} /> Register first patient
                </button>
              </div>
            ) : myPatients.slice(0, 5).map(p => (
              <Link key={p.id} to={`/app/patients/${p.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid #f9fafb', textDecoration: 'none', transition: 'background 0.1s' }}
                onMouseOver={e => (e.currentTarget as HTMLElement).style.background = '#f9fafb'}
                onMouseOut={e => (e.currentTarget as HTMLElement).style.background = 'white'}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: p.priority === 'Critical' ? '#fef2f2' : '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center', color: p.priority === 'Critical' ? '#ef4444' : '#0d9488', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                  {p.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{p.age}y · {p.status}</div>
                </div>
                {p.priority === 'Critical' && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />}
              </Link>
            ))}
          </div>

          {/* Active Alerts */}
          <div style={{ background: 'white', borderRadius: 14, border: `1.5px solid ${unackAlerts.length > 0 ? '#fecaca' : '#f3f4f6'}`, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #f3f4f6', background: unackAlerts.length > 0 ? '#fef2f2' : '#fafafa' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Bell size={14} color={unackAlerts.length > 0 ? '#ef4444' : '#9ca3af'} />
                <span style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>Alerts</span>
                {unackAlerts.length > 0 && <span style={{ background: '#ef4444', color: 'white', borderRadius: 20, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{unackAlerts.length}</span>}
              </div>
              <Link to="/app/alerts" style={{ fontSize: 12, color: '#0d9488', fontWeight: 600, textDecoration: 'none' }}>View all</Link>
            </div>
            {unackAlerts.length === 0 ? (
              <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={14} color="#10b981" />
                <span style={{ fontSize: 13, color: '#10b981', fontWeight: 500 }}>All clear</span>
              </div>
            ) : unackAlerts.slice(0, 3).map(a => (
              <div key={a.id} style={{ padding: '10px 16px', borderBottom: '1px solid #fef2f2' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', flexShrink: 0, marginTop: 5 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{a.patientName}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>{a.message}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Stats strip */}
          <div style={{ background: 'white', borderRadius: 14, border: '1.5px solid #f3f4f6', padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>This Month</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Patients', value: totalPatients, color: '#0d9488' },
                { label: 'Consultations', value: totalVisits, color: '#6366f1' },
                { label: 'Prescriptions', value: totalRx, color: '#f59e0b' },
                { label: 'Follow-ups', value: followUpsDue, color: '#ef4444' },
              ].map(s => (
                <div key={s.label} style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#111827' }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: s.color, fontWeight: 600, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );


}
