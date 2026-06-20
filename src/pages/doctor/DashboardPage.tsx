import { useState, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { usePadStore } from '@/store/usePadStore';
import { Link, useNavigate } from 'react-router-dom';
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge';
import {
  Users, BedDouble, Bell, Clock, TrendingUp, AlertTriangle, Activity,
  CheckCircle2, Pencil, X, UserPlus,
  Building2, ChevronDown, Edit2, Calendar, CalendarDays, Settings2, BarChart3, DollarSign, ChevronRight, PlayCircle
} from 'lucide-react';
import { formatDateTime, cn, localDate } from '@/lib/utils';
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
  const { patients, alerts, queue, setQueue, vitals, appointments, bills, openQuickRxModal, updateAppointment, showToast, refreshAppointments, upsertPatient } = useAppStore();
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

  const myPatients = patients.filter(p => p.attendingDoctorId === user?.id);
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

  return (
    <div>
      {/* Greeting + CTAs */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {greeting}, {user?.name?.split(' ').slice(0, 2).join(' ')} 👋
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Here's your clinical overview for today.</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={openQuickRxModal}
            className="flex-shrink-0 flex items-center gap-2.5 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold px-5 py-3 rounded-2xl shadow-lg shadow-teal-500/30 transition-all text-sm"
          >
            <Pencil className="w-4 h-4" />
            Write Rx
          </button>
        </div>
      </div>

      {user?.role === 'clinic_admin' && <TodayClinicWidget />}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon: <BedDouble className="w-5 h-5 text-blue-500" />, label: 'IPD Patients', value: ipd.length, sub: `${critical.length} critical`, subColor: 'text-red-500', bg: 'bg-blue-50', to: '/app/patients', delay: 'delay-0' },
          { icon: <Users className="w-5 h-5 text-teal-500" />, label: 'OPD Queue', value: waitingQueue.length, sub: 'waiting now', subColor: waitingQueue.length > 0 ? 'text-teal-600' : 'text-slate-400', bg: 'bg-teal-50', to: '/app/queue', delay: 'delay-50' },
          { icon: <Bell className="w-5 h-5 text-red-500" />, label: 'Active Alerts', value: unackAlerts.length, sub: 'Unacknowledged', subColor: unackAlerts.length > 0 ? 'text-red-500' : 'text-slate-500', bg: 'bg-red-50', to: '/app/alerts', delay: 'delay-100' },
          { icon: <Activity className="w-5 h-5 text-emerald-500" />, label: 'Upcoming Appts', value: upcomingCount, sub: `${todayAppointments.length} today`, subColor: 'text-slate-500', bg: 'bg-emerald-50', to: '/app/schedule', delay: 'delay-150' },
        ].map(s => (
          <Link key={s.label} to={s.to} className={cn('stat-card hover:shadow-md transition-all duration-200 animate-fade-up', s.delay)}>
            <div className="flex items-center justify-between mb-2">
              <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center`}>{s.icon}</div>
            </div>
            <div className="text-3xl font-black text-slate-900">{s.value}</div>
            <div className="text-sm font-medium text-slate-600">{s.label}</div>
            <div className={`text-xs mt-0.5 font-medium ${s.subColor}`}>{s.sub}</div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 animate-fade-up delay-200">
        {[
          { icon: UserPlus, label: 'New Patient', color: '#0d9488', bg: '#f0fdfa', action: openQuickRxModal },
          { icon: CalendarDays, label: "Today's Schedule", color: '#7c3aed', bg: '#f5f3ff', to: '/app/schedule' },
          { icon: Settings2, label: 'Pad Settings', color: '#0369a1', bg: '#f0f9ff', to: '/app/pad-settings' },
          { icon: BarChart3, label: 'Analytics', color: '#b45309', bg: '#fffbeb', to: '/app/analytics' },
        ].map(q => (
          q.to ? (
            <Link key={q.label} to={q.to}
              className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:shadow-sm hover:border-slate-300 transition-all group">
              <div style={{ width: 36, height: 36, borderRadius: 10, background: q.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <q.icon style={{ width: 16, height: 16, color: q.color }} />
              </div>
              <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">{q.label}</span>
            </Link>
          ) : (
            <button key={q.label} onClick={q.action}
              className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:shadow-sm hover:border-slate-300 transition-all group text-left">
              <div style={{ width: 36, height: 36, borderRadius: 10, background: q.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <q.icon style={{ width: 16, height: 16, color: q.color }} />
              </div>
              <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">{q.label}</span>
            </button>
          )
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* ── Left column (2/3) ── */}
        <div className="xl:col-span-2 space-y-5">

          {/* Today's Appointments — primary action center */}
          <div className="card animate-fade-up delay-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-teal-500" />
                  Today's Appointments
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {todayAppointments.length > 0
                    ? `${todayAppointments.length} scheduled — tap Start to consult`
                    : 'No appointments today'}
                </p>
              </div>
              <Link to="/app/schedule" className="btn-secondary btn-sm flex items-center gap-1.5">
                Schedule <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {todayAppointments.map((apt, i) => {
                const isBR = apt.id.startsWith('BR-');
                const qEntry = aptQueueEntry(apt);
                const inProgress = qEntry?.status === 'in-progress';
                const inQueue = !!qEntry;
                return (
                  <div key={apt.id}
                    className={cn('flex items-center gap-4 px-5 py-4 hover:bg-teal-50/40 transition-colors animate-fade-up',
                      i === 0 ? 'delay-50' : i === 1 ? 'delay-100' : 'delay-150',
                      isBR && !inQueue && 'bg-amber-50/30')}>

                    {/* Time chip / Token */}
                    <div className={cn('w-11 h-11 rounded-xl flex flex-col items-center justify-center flex-shrink-0',
                      inProgress ? 'bg-teal-500 shadow-sm' : isBR ? 'bg-amber-50 border border-amber-200' : 'bg-teal-50 border border-teal-100')}>
                      {inProgress && qEntry ? (
                        <>
                          <span className="text-[9px] font-bold text-white leading-tight">TOKEN</span>
                          <span className="text-sm font-black text-white leading-tight">{qEntry.token}</span>
                        </>
                      ) : (
                        <span className={cn('text-[10px] font-bold leading-tight', isBR ? 'text-amber-600' : 'text-teal-700')}>{apt.time}</span>
                      )}
                    </div>

                    {/* Patient info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-900">{apt.patientName}</span>
                        {apt.patientAge ? <span className="text-xs text-slate-500">{apt.patientAge}y</span> : null}
                        {apt.patientGender ? <span className="text-xs text-slate-400">{apt.patientGender}</span> : null}
                        {isBR && !inQueue && <span className="badge text-[10px] bg-amber-100 text-amber-700">Online Booking</span>}
                        {inProgress && <span className="badge text-[10px] bg-teal-100 text-teal-700">In Consult</span>}
                        {inQueue && !inProgress && <span className="badge text-[10px] bg-blue-100 text-blue-700">Queued</span>}
                      </div>
                      <div className="text-xs text-slate-500 truncate mt-0.5">{apt.reason}</div>
                      {apt.patientPhone && (
                        <div className="text-[11px] text-slate-400 mt-0.5">{apt.patientPhone}</div>
                      )}
                    </div>

                    {/* Single action button */}
                    {apt.status !== 'completed' && apt.status !== 'cancelled' && (
                      <button
                        onClick={() => startConsult(apt)}
                        className={cn('btn-sm flex-shrink-0 flex items-center gap-1.5 !px-4',
                          inProgress
                            ? 'btn-primary'
                            : 'bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold')}
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        {inProgress ? 'Resume' : 'Start'}
                      </button>
                    )}
                    {apt.status === 'completed' && (
                      <span className="text-xs text-emerald-600 font-medium flex-shrink-0">Done</span>
                    )}
                  </div>
                );
              })}

              {todayAppointments.length === 0 && (
                <div className="px-5 py-10 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <Calendar className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="text-sm text-slate-400 mb-2">No appointments today</p>
                  <Link to="/app/schedule" className="text-xs font-semibold text-teal-600 hover:underline">
                    Go to schedule
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Walk-in Queue — only shows patients NOT tied to a today's appointment */}
          {walkinQueue.length > 0 && (
            <div className="card animate-fade-up delay-200">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-teal-500" />
                    Walk-in Queue
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {walkinQueue.length} walk-in{walkinQueue.length > 1 ? 's' : ''} waiting
                  </p>
                </div>
                <Link to="/app/queue" className="btn-secondary btn-sm flex items-center gap-1.5">
                  Manage <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="divide-y divide-slate-100">
                {walkinQueue.map((q, i) => (
                  <div key={q.id}
                    className={cn('flex items-center gap-4 px-5 py-3.5 hover:bg-teal-50/60 transition-colors group animate-fade-up',
                      i === 0 ? 'delay-50' : 'delay-100')}>
                    <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0 shadow-sm',
                      q.status === 'in-progress' ? 'bg-teal-500' : 'bg-slate-400')}>
                      {q.token}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 text-sm group-hover:text-teal-800">{q.patientName}</div>
                      <div className="text-xs text-slate-500 truncate">{q.reason || 'Walk-in'}</div>
                    </div>
                    <span className={cn('badge text-[11px] flex-shrink-0',
                      q.status === 'in-progress' ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700')}>
                      {q.status === 'in-progress' ? 'In Consult' : 'Waiting'}
                    </span>
                    <Link to={`/app/consult/${q.patientId}`} className="btn-primary btn-sm flex-shrink-0">
                      Consult <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* My Patients — compact */}
          <div className="card animate-fade-up delay-250">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">My Patients</h3>
                <p className="text-xs text-slate-400">{myPatients.length} total · {critical.length} critical</p>
              </div>
              <Link to="/app/patients"
                className="btn-primary btn-sm">
                View all {myPatients.length > 0 ? `(${myPatients.length})` : ''}
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {myPatients.slice(0, 6).map(p => (
                <div key={p.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50 transition-colors group">
                  <div className="w-7 h-7 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-700 font-bold text-xs flex-shrink-0">
                    {p.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
                  </div>
                  <Link to={`/app/patients/${p.id}`} className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 group-hover:text-teal-700 truncate">{p.name}</div>
                    <div className="text-xs text-slate-400 truncate">{p.age}y {p.gender} · {p.diagnosis || 'No diagnosis'}</div>
                  </Link>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={p.status} />
                    <PriorityBadge priority={p.priority} />
                  </div>
                  <Link to={`/app/consult/${p.id}`}
                    className="btn-ghost btn-sm !px-2 !py-1 text-teal-600 hover:bg-teal-50 flex-shrink-0">
                    <Pencil className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
              {myPatients.length === 0 && (
                <div className="px-5 py-8 text-center">
                  <p className="text-slate-400 text-sm mb-3">No patients assigned yet</p>
                  <button onClick={openQuickRxModal} className="btn-primary btn-sm gap-2">
                    <UserPlus className="w-3.5 h-3.5" /> Register first patient
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right column (1/3) ── */}
        <div className="space-y-5">

          {/* Active Alerts */}
          <div className="card animate-fade-up delay-250">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                Active Alerts
              </h3>
              <Link to="/app/alerts" className="text-xs text-teal-600 hover:underline">View all</Link>
            </div>
            <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
              {unackAlerts.slice(0, 5).map(a => (
                <div key={a.id} className="px-5 py-2.5">
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-red-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900">{a.patientName}</div>
                      <div className="text-xs text-slate-500 truncate">{a.message}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{formatDateTime(a.time)}</div>
                    </div>
                  </div>
                </div>
              ))}
              {unackAlerts.length === 0 && (
                <div className="px-5 py-4 flex items-center gap-2 text-xs text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" /> All clear
                </div>
              )}
            </div>
          </div>

          {/* Revenue snapshot */}
          {bills.length > 0 && (() => {
            const todayBills = bills.filter(b => b.createdAt.slice(0, 10) === todayStr);
            const todayRevenue = todayBills.filter(b => b.status === 'paid').reduce((s, b) => s + b.total, 0);
            const pendingRevenue = bills.filter(b => b.status === 'pending').reduce((s, b) => s + b.total, 0);
            return (
              <div className="card px-5 py-4 animate-fade-up delay-300">
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2 text-sm">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                  Revenue
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-600">Today's collections</span>
                    <span className="font-bold text-emerald-600 text-sm">₹{todayRevenue.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-600">Bills today</span>
                    <span className="font-bold text-slate-900 text-sm">{todayBills.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-600">Pending</span>
                    <span className="font-bold text-amber-600 text-sm">₹{pendingRevenue.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Today's summary */}
          <div className="card px-5 py-4 animate-fade-up delay-300">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2 text-sm">
              <TrendingUp className="w-3.5 h-3.5 text-teal-500" />
              Today's Summary
            </h3>
            <div className="space-y-2">
              {[
                { label: 'Discharges today', value: myPatients.filter(p => p.status === 'Discharged').length },
                { label: 'Labs pending', value: Object.values(vitals).flat().length > 0 ? 2 : 0 },
                { label: 'Rx written', value: 4 },
                { label: 'Consult notes', value: 3 },
              ].map(s => (
                <div key={s.label} className="flex justify-between items-center">
                  <span className="text-xs text-slate-600">{s.label}</span>
                  <span className="font-bold text-slate-900 text-sm">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
