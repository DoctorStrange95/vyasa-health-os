import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Clock, UserCheck, Stethoscope, Plus, Building2, AlertTriangle,
  User2, UserPlus, CalendarCheck, RefreshCw, CheckCircle2, XCircle, ChevronRight, Phone, PlayCircle,
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { cn, localDate } from '@/lib/utils';
import type { QueueEntry, AppointmentEntry, AppointmentStatus } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type DisplayStatus = 'scheduled' | 'waiting' | 'in-progress' | 'completed' | 'no-show';

interface OPDItem {
  key: string;
  aptId: string | null;
  queueId: string | null;
  patientId: string;
  name: string;
  reason: string;
  time: string | null;
  clinicName: string | null;
  token: number | null;
  status: DisplayStatus;
  assignedDoctor: string | null;
  assignedNurse: string | null;
  phone?: string;
}

const STATUS_CONFIG: Record<DisplayStatus, { label: string; color: string; dot: string }> = {
  scheduled:    { label: 'Scheduled',  color: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-400' },
  waiting:      { label: 'Waiting',    color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400' },
  'in-progress':{ label: 'In Consult', color: 'bg-teal-100 text-teal-700',   dot: 'bg-teal-500 animate-pulse' },
  completed:    { label: 'Done',       color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400' },
  'no-show':    { label: 'No Show',    color: 'bg-red-100 text-red-500',     dot: 'bg-red-400' },
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OPDQueuePage() {
  const {
    queue, patients, appointments, todayAvailability,
    setQueue, staff, assignNurse, showToast, upsertPatient,
    openQuickRegister, refreshAppointments, addAppointment, updateAppointment,
  } = useAppStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [showAddWalkin, setShowAddWalkin] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const todayDateStr = localDate();
  const avail = todayAvailability?.date === todayDateStr ? todayAvailability : null;
  const nurses = useMemo(() => staff.filter(s => s.role === 'nurse' && s.status === 'active'), [staff]);

  // ── Load & auto-refresh ───────────────────────────────────────────────────
  const doRefresh = useCallback(async (silent = true) => {
    if (!silent) setRefreshing(true);
    try { await refreshAppointments(); } finally { if (!silent) setRefreshing(false); }
  }, [refreshAppointments]);

  useEffect(() => {
    doRefresh();
    const t = setInterval(() => doRefresh(), 30000);
    return () => clearInterval(t);
  }, [doRefresh]);

  // ── Build unified OPD item list ───────────────────────────────────────────
  const admittedIds = useMemo(
    () => new Set(patients.filter(p => p.status === 'IPD').map(p => p.id)),
    [patients]
  );

  const todayApts = useMemo(() =>
    appointments
      .filter(a => a.date === todayDateStr && a.status !== 'cancelled' && !admittedIds.has(a.patientId))
      .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '')),
    [appointments, todayDateStr, admittedIds]
  );

  const queueMap = useMemo(() => new Map(queue.map(q => [q.patientId, q])), [queue]);

  // Booking-derived appointments have patient_id = NULL in DB; use 'apt-{id}' as stable key
  const aptDerivedId = (a: { patientId?: string | null; id: string }) =>
    (a.patientId && a.patientId !== 'null') ? a.patientId : `apt-${a.id}`;

  // Walk-ins = queue entries with no matching appointment today (compare using derived keys)
  const walkIns = useMemo(() => {
    const aptIds = new Set(todayApts.map(aptDerivedId));
    return queue.filter(q => !aptIds.has(q.patientId));
  }, [queue, todayApts]);

  const items: OPDItem[] = useMemo(() => {
    const fromApts: OPDItem[] = todayApts.map(a => {
      const pid = aptDerivedId(a);
      const q = queueMap.get(pid);
      // Priority: local queue status > backend appointment status
      let status: DisplayStatus = 'scheduled';
      if (q) {
        status = q.status as DisplayStatus;
      } else if (a.status === 'checked-in') {
        status = 'waiting'; // persisted in backend — survives refresh on any device
      } else if (a.status === 'completed' || a.status === 'no-show') {
        status = a.status as DisplayStatus;
      }
      return {
        key: `apt-${a.id}`,
        aptId: a.id,
        queueId: q?.id ?? null,
        patientId: pid,
        name: a.patientName,
        reason: a.reason ?? '',
        time: a.time ?? null,
        clinicName: a.clinicName ?? null,
        token: q?.token ?? null,
        status,
        assignedDoctor: a.doctorName ?? user?.name ?? null,
        assignedNurse: (q as any)?.assignedNurse ?? null,
      };
    });

    const fromWalkIns: OPDItem[] = walkIns.map(q => ({
      key: `wi-${q.id}`,
      aptId: null,
      queueId: q.id,
      patientId: q.patientId,
      name: q.patientName,
      reason: q.reason ?? '',
      time: null,
      clinicName: null,
      token: q.token ?? null,
      status: q.status as DisplayStatus,
      assignedDoctor: q.assignedDoctor ?? null,
      assignedNurse: (q as any).assignedNurse ?? null,
    }));

    return [...fromApts, ...fromWalkIns];
  }, [todayApts, walkIns, queueMap, user]);

  const scheduled   = items.filter(i => i.status === 'scheduled');
  const waiting     = items.filter(i => i.status === 'waiting');
  const inProgress  = items.filter(i => i.status === 'in-progress');
  const done        = items.filter(i => i.status === 'completed' || i.status === 'no-show');
  const totalActive = waiting.length + inProgress.length;
  const atLimit     = avail ? totalActive >= avail.maxPatients : false;

  // ── Status actions ────────────────────────────────────────────────────────
  function checkIn(item: OPDItem) {
    if (atLimit) { showToast(`Queue full — max ${avail!.maxPatients} patients`, 'warning'); return; }
    if (item.queueId) {
      // Already in queue, just update status
      setQueue(queue.map(q => q.id === item.queueId ? { ...q, status: 'waiting' } : q));
      return;
    }
    const token = queue.length + 1;
    const qEntry: QueueEntry = {
      id: `Q${Date.now()}`,
      patientId: item.patientId,
      patientName: item.name,
      reason: item.reason,
      token,
      status: 'waiting',
      waitMins: 0,
      registeredAt: new Date().toISOString(),
      assignedDoctor: item.assignedDoctor ?? user?.name,
    };
    setQueue([...queue, qEntry]);
    // Persist to backend so status survives refresh / other devices
    if (item.aptId) updateAppointment(item.aptId, { status: 'checked-in' as AppointmentStatus });
    showToast(`${item.name} checked in — Token ${token}`, 'success');
  }

  function markNoShow(item: OPDItem) {
    if (item.queueId) {
      setQueue(queue.map(q => q.id === item.queueId ? { ...q, status: 'no-show' } : q));
    }
    if (item.aptId) updateAppointment(item.aptId, { status: 'no-show' });
    showToast(`Marked as No Show`, 'info');
  }

  function markDone(item: OPDItem) {
    if (item.queueId) {
      setQueue(queue.map(q => q.id === item.queueId ? { ...q, status: 'completed' } : q));
    }
    if (item.aptId) updateAppointment(item.aptId, { status: 'completed' });
    showToast(`${item.name} marked as done`, 'success');
  }

  function addWalkin(info: { name: string; age?: number; gender?: 'M' | 'F' | 'Other'; phone?: string; email?: string; reason: string }) {
    if (atLimit) { showToast(`Queue full — max ${avail!.maxPatients} patients`, 'warning'); return; }
    const token = queue.length + 1;
    const wiId = `WI${Date.now()}`;

    // Create a proper patient record so "Consult" works from anywhere
    upsertPatient({
      id: wiId,
      name: info.name,
      age: info.age ?? 0,
      gender: info.gender ?? 'M',
      mrn: `MRN-OPD-${Date.now().toString().slice(-8)}`,
      phone: info.phone || undefined,
      email: info.email || undefined,
      status: 'OPD',
      priority: 'Stable',
      diagnosis: info.reason || undefined,
      attendingDoctor: user?.name,
      attendingDoctorId: typeof user?.id === 'number' ? user.id : undefined,
      clinicId: avail?.clinicId ?? '',
      allergies: [],
    });

    const qEntry: QueueEntry = {
      id: `Q${Date.now()}`,
      patientId: wiId,
      patientName: info.name,
      reason: info.reason,
      token,
      status: 'waiting',
      waitMins: 0,
      registeredAt: new Date().toISOString(),
      assignedDoctor: user?.name,
    };
    setQueue([...queue, qEntry]);

    addAppointment({
      id: wiId,
      patientId: wiId,
      patientName: info.name,
      patientAge: info.age,
      patientGender: info.gender,
      clinicId: avail?.clinicId ?? '',
      clinicName: avail?.clinicName ?? '',
      doctorId: undefined,
      doctorName: user?.name ?? '',
      date: todayDateStr,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
      reason: info.reason || 'Walk-in',
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    } as AppointmentEntry);
    showToast(`Walk-in added — Token ${token}`, 'success');
    setShowAddWalkin(false);
  }

  function handleAssignNurse(patientId: string, nurseId: number, nurseName: string) {
    assignNurse(patientId, nurseId, nurseName);
    showToast(`Assigned to ${nurseName}`, 'success');
  }

  // If patient doesn't exist yet (booking-derived, no patient record), create one on the fly
  function goConsult(item: OPDItem) {
    const exists = patients.some(p => p.id === item.patientId);
    if (!exists) {
      const apt = appointments.find(a => item.aptId === a.id);
      upsertPatient({
        id: item.patientId,
        name: item.name,
        age: apt?.patientAge ?? 0,
        gender: (apt?.patientGender as 'M' | 'F' | 'Other') ?? 'M',
        mrn: `MRN-OPD-${Date.now()}`,
        phone: '',
        status: 'OPD',
        priority: 'Stable',
        clinicId: avail?.clinicId ?? apt?.clinicId ?? '',
        attendingDoctor: user?.name,
        attendingDoctorId: typeof user?.id === 'number' ? user.id : undefined,
        diagnosis: item.reason,
        allergies: [],
      });
    }
    navigate(`/app/consult/${item.patientId}`);
  }

  // One-tap: check patient in (assigns token) AND opens consult immediately
  function startConsult(item: OPDItem) {
    if (!item.queueId) {
      if (atLimit) { showToast(`Queue full — max ${avail!.maxPatients} patients`, 'warning'); return; }
      const token = queue.length + 1;
      const qEntry: QueueEntry = {
        id: `Q${Date.now()}`,
        patientId: item.patientId,
        patientName: item.name,
        reason: item.reason,
        token,
        status: 'in-progress',
        waitMins: 0,
        registeredAt: new Date().toISOString(),
        assignedDoctor: item.assignedDoctor ?? user?.name,
      };
      setQueue([...queue, qEntry]);
      if (item.aptId) updateAppointment(item.aptId, { status: 'checked-in' as AppointmentStatus });
      showToast(`${item.name} — Token ${token}`, 'success');
    }
    goConsult(item);
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Today's OPD</h1>
          <p className="text-sm text-slate-500">
            {scheduled.length} scheduled · {waiting.length} waiting · {inProgress.length} in consult · {done.length} done
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => doRefresh(false)}
            disabled={refreshing}
            className="btn-secondary btn-sm"
            title="Refresh"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
          </button>
          <button onClick={openQuickRegister} className="btn-secondary btn-sm flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Register Patient
          </button>
          <button
            onClick={() => {
              if (atLimit) { showToast(`Queue full — max ${avail!.maxPatients} patients`, 'warning'); return; }
              setShowAddWalkin(true);
            }}
            className={cn('btn-sm flex items-center gap-2', atLimit ? 'btn-secondary text-amber-600 border-amber-300' : 'btn-primary')}
          >
            {atLimit ? <AlertTriangle className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {atLimit ? 'Queue Full' : 'Add Walk-in'}
          </button>
        </div>
      </div>

      {/* Debug panel — visible only when ?debug=1 in URL */}
      {typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1' && (
        <DebugPanel todayApts={todayApts} queue={queue} items={items} todayDateStr={todayDateStr} />
      )}

      {/* Availability banner */}
      {avail ? (
        <div className="rounded-2xl p-4 flex items-center gap-4 flex-wrap"
          style={{ background: 'linear-gradient(135deg, #0d948815, #0d948805)', border: '1.5px solid #0d948830' }}>
          <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-teal-800 text-sm">{avail.clinicName}</div>
            <div className="text-xs text-teal-600">{avail.startTime} – {avail.endTime}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-2xl font-black text-slate-900 leading-none">
                {totalActive}<span className="text-sm font-normal text-slate-400">/{avail.maxPatients}</span>
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">active</div>
            </div>
            <div className="w-16 h-2 rounded-full bg-slate-200 overflow-hidden">
              <div className={cn('h-full rounded-full transition-all',
                atLimit ? 'bg-red-500' : totalActive / avail.maxPatients > 0.75 ? 'bg-amber-400' : 'bg-teal-500')}
                style={{ width: `${Math.min((totalActive / avail.maxPatients) * 100, 100)}%` }} />
            </div>
          </div>
          {atLimit && (
            <div className="flex items-center gap-1.5 bg-red-50 text-red-700 text-xs font-semibold px-3 py-1.5 rounded-xl border border-red-200">
              <AlertTriangle className="w-3.5 h-3.5" /> Queue full
            </div>
          )}
        </div>
      ) : (
        (user?.role === 'receptionist' || user?.role === 'clinic_admin') && (
          <div className="rounded-2xl p-4 border-2 border-dashed border-amber-200 bg-amber-50 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <div className="text-sm text-amber-700">
              <span className="font-semibold">Doctor hasn't set today's clinic yet.</span>
              {user?.role === 'clinic_admin' && <span> Go to Dashboard → Set Today's Clinic.</span>}
            </div>
          </div>
        )
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Scheduled', value: scheduled.length,  icon: CalendarCheck, color: 'text-blue-600 bg-blue-50' },
          { label: 'Waiting',   value: waiting.length,    icon: Clock,         color: 'text-amber-600 bg-amber-50' },
          { label: 'In Consult',value: inProgress.length, icon: Stethoscope,   color: 'text-teal-600 bg-teal-50' },
          { label: 'Done',      value: done.length,       icon: UserCheck,     color: 'text-emerald-600 bg-emerald-50' },
        ].map(s => (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', s.color)}>
              <s.icon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">{s.value}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Scheduled (not yet checked in) ─────────────────────────────────── */}
      <Section
        title={`Scheduled Today (${scheduled.length})`}
        icon={<CalendarCheck className="w-4 h-4 text-blue-500" />}
        empty={scheduled.length === 0}
        emptyText="No pending scheduled appointments"
      >
        {scheduled.map((item, i) => (
          <ScheduledRow
            key={item.key}
            item={item}
            index={i + 1}
            patient={patients.find(p => p.id === item.patientId)}
            isReceptionist={user?.role === 'receptionist'}
            onCheckIn={() => user?.role === 'receptionist' ? checkIn(item) : startConsult(item)}
            onNoShow={() => markNoShow(item)}
          />
        ))}
      </Section>

      {/* ── In Consultation ─────────────────────────────────────────────────── */}
      {inProgress.length > 0 && (
        <Section
          title={`In Consultation (${inProgress.length})`}
          icon={<span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />}
          titleClass="text-teal-700"
        >
          {inProgress.map(item => (
            <QueueCard
              key={item.key}
              item={item}
              nurses={nurses}
              isReceptionist={user?.role === 'receptionist'}
              onConsult={() => goConsult(item)}
              onAssignNurse={handleAssignNurse}
              onNoShow={() => markNoShow(item)}
              onDone={() => markDone(item)}
            />
          ))}
        </Section>
      )}

      {/* ── Waiting ─────────────────────────────────────────────────────────── */}
      <Section
        title={`Waiting (${waiting.length})`}
        icon={<Clock className="w-4 h-4 text-amber-500" />}
        empty={waiting.length === 0}
        emptyText="No patients waiting"
      >
        {waiting.map(item => (
          <QueueCard
            key={item.key}
            item={item}
            nurses={nurses}
            isReceptionist={user?.role === 'receptionist'}
            onConsult={() => goConsult(item)}
            onAssignNurse={handleAssignNurse}
            onNoShow={() => markNoShow(item)}
            onDone={() => markDone(item)}
          />
        ))}
      </Section>

      {/* ── Done ────────────────────────────────────────────────────────────── */}
      {done.length > 0 && (
        <Section
          title={`Completed Today (${done.length})`}
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          titleClass="text-slate-500"
        >
          {done.map(item => (
            <QueueCard
              key={item.key}
              item={item}
              nurses={nurses}
              isReceptionist={user?.role === 'receptionist'}
              onConsult={() => goConsult(item)}
              onAssignNurse={handleAssignNurse}
              onNoShow={() => {}}
              onDone={() => {}}
            />
          ))}
        </Section>
      )}

      {/* Walk-in modal */}
      {showAddWalkin && <WalkinModal onClose={() => setShowAddWalkin(false)} onAdd={addWalkin} />}
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, icon, children, empty, emptyText, titleClass }: {
  title: string; icon?: React.ReactNode; children?: React.ReactNode;
  empty?: boolean; emptyText?: string; titleClass?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className={cn('text-sm font-bold text-slate-700', titleClass)}>{title}</span>
      </div>
      {empty ? (
        <div className="card p-6 text-center text-slate-400 text-sm">{emptyText}</div>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </div>
  );
}

// ─── Scheduled row (not yet checked in) ──────────────────────────────────────

function ScheduledRow({ item, index, patient, isReceptionist, onCheckIn, onNoShow }: {
  item: OPDItem; index: number; patient?: any;
  isReceptionist?: boolean; onCheckIn: () => void; onNoShow: () => void;
}) {
  const isIPD = patient?.status === 'IPD' || patient?.status === 'Critical';
  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-xl transition-colors',
      isIPD ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50 hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-sm'
    )}>
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold',
        isIPD ? 'bg-blue-100 text-blue-700' : 'bg-teal-100 text-teal-700')}>
        {item.time ?? index}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-slate-800 text-sm">{item.name}</span>
          {isIPD && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white">IPD · {patient?.ward}</span>}
          {item.clinicName && <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{item.clinicName}</span>}
        </div>
        <div className="text-xs text-slate-500 mt-0.5">{item.reason}{item.time ? ` · ${item.time}` : ''}</div>
      </div>
      {!isReceptionist && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onNoShow}
            className="btn-sm text-xs text-red-500 border-red-200 hover:bg-red-50 btn-secondary px-2.5 py-1.5"
            title="Mark No Show"
          >
            <XCircle className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onCheckIn}
            className={cn('btn-sm text-xs flex items-center gap-1.5', isIPD ? 'btn-secondary border-blue-300 text-blue-700' : 'btn-primary')}
          >
            {isIPD ? <CheckCircle2 className="w-3.5 h-3.5" /> : <PlayCircle className="w-3.5 h-3.5" />}
            {isIPD ? 'Round' : 'Start'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Queue card (waiting / in-progress / done) ────────────────────────────────

interface QueueCardProps {
  item: OPDItem;
  nurses: { id: number; name: string }[];
  isReceptionist?: boolean;
  onConsult: () => void;
  onAssignNurse: (patientId: string, nurseId: number, nurseName: string) => void;
  onNoShow: () => void;
  onDone: () => void;
}

function QueueCard({ item, nurses, isReceptionist, onConsult, onAssignNurse, onNoShow, onDone }: QueueCardProps) {
  const cfg = STATUS_CONFIG[item.status];
  const [nurseOpen, setNurseOpen] = useState(false);
  const isDone = item.status === 'completed' || item.status === 'no-show';

  return (
    <div className="card p-4 flex items-start gap-3 hover:shadow-md transition-shadow">
      {/* Token */}
      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0',
        item.status === 'in-progress' ? 'bg-teal-500 text-white' :
        item.status === 'waiting' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500')}>
        {item.token ?? '—'}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-900">{item.name}</span>
          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1', cfg.color)}>
            <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
            {cfg.label}
          </span>
        </div>
        {item.reason && <div className="text-sm text-slate-500 mt-0.5 truncate">{item.reason}</div>}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {item.assignedDoctor && <span className="text-xs text-slate-400">{item.assignedDoctor}</span>}
          {item.time && <span className="text-xs text-slate-400">· {item.time}</span>}
          {item.assignedNurse ? (
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1">
              <User2 className="w-3 h-3" /> {item.assignedNurse}
            </span>
          ) : nurses.length > 0 && !isDone && !isReceptionist && (
            <button onClick={() => setNurseOpen(v => !v)}
              className="text-xs text-slate-400 hover:text-blue-600 flex items-center gap-1 transition-colors">
              <User2 className="w-3 h-3" /> Assign nurse
            </button>
          )}
        </div>
        {nurseOpen && !isDone && (
          <div className="mt-2 flex gap-1.5 flex-wrap">
            {nurses.map(n => (
              <button key={n.id} onClick={() => {
                onAssignNurse(item.patientId, n.id, n.name);
                setNurseOpen(false);
              }} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg hover:bg-blue-100 transition-colors">
                {n.name}
              </button>
            ))}
            <button onClick={() => setNurseOpen(false)} className="text-xs text-slate-400 px-2 py-1">Cancel</button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
        {isDone ? (
          <Link to={`/app/patients/${item.patientId}`} className="btn-secondary btn-sm text-xs">
            View Record
          </Link>
        ) : isReceptionist ? (
          <span className={cn('text-xs font-medium px-3 py-1.5 rounded-full', cfg.color)}>
            Token {item.token}
          </span>
        ) : (
          <>
            {item.status === 'waiting' && (
              <button onClick={onDone} title="Mark Done"
                className="btn-secondary btn-sm text-emerald-600 border-emerald-200 hover:bg-emerald-50 px-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            )}
            {(item.status === 'waiting' || item.status === 'in-progress') && (
              <button onClick={onNoShow} title="No Show"
                className="btn-secondary btn-sm text-red-500 border-red-200 hover:bg-red-50 px-2">
                <XCircle className="w-3.5 h-3.5" />
              </button>
            )}
            <button onClick={onConsult} className="btn-primary btn-sm">
              <Stethoscope className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Consult</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Debug panel (append ?debug=1 to URL) ────────────────────────────────────

function DebugPanel({ todayApts, queue, items, todayDateStr }: {
  todayApts: any[]; queue: any[]; items: OPDItem[]; todayDateStr: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border-2 border-dashed border-purple-300 bg-purple-50 p-3 text-xs font-mono">
      <button onClick={() => setOpen(v => !v)} className="w-full text-left font-bold text-purple-700 flex items-center justify-between">
        <span>🔍 OPD Debug Panel</span>
        <span className="text-[10px] text-purple-400">
          {items.length} items · {todayApts.length} apts · {queue.length} queue · today={todayDateStr}
        </span>
      </button>
      {open && (
        <div className="mt-3 space-y-3 overflow-x-auto">
          <div>
            <div className="text-purple-600 font-bold mb-1">Appointments ({todayApts.length})</div>
            <table className="w-full border-collapse text-[10px]">
              <thead><tr className="bg-purple-100">
                {['id','patientId','name','date','time','status'].map(h => <th key={h} className="p-1 text-left border border-purple-200">{h}</th>)}
              </tr></thead>
              <tbody>
                {todayApts.map((a, i) => (
                  <tr key={i} className={i % 2 ? 'bg-white' : 'bg-purple-50'}>
                    <td className="p-1 border border-purple-100">{a.id}</td>
                    <td className="p-1 border border-purple-100">{a.patientId ?? <span className="text-red-500">NULL</span>}</td>
                    <td className="p-1 border border-purple-100">{a.patientName}</td>
                    <td className="p-1 border border-purple-100">{a.date}</td>
                    <td className="p-1 border border-purple-100">{a.time}</td>
                    <td className="p-1 border border-purple-100">{a.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <div className="text-purple-600 font-bold mb-1">Queue entries ({queue.length})</div>
            <table className="w-full border-collapse text-[10px]">
              <thead><tr className="bg-purple-100">
                {['id','patientId','name','status','token'].map(h => <th key={h} className="p-1 text-left border border-purple-200">{h}</th>)}
              </tr></thead>
              <tbody>
                {queue.map((q, i) => (
                  <tr key={i} className={i % 2 ? 'bg-white' : 'bg-purple-50'}>
                    <td className="p-1 border border-purple-100">{q.id}</td>
                    <td className="p-1 border border-purple-100">{q.patientId}</td>
                    <td className="p-1 border border-purple-100">{q.patientName}</td>
                    <td className="p-1 border border-purple-100">{q.status}</td>
                    <td className="p-1 border border-purple-100">{q.token}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <div className="text-purple-600 font-bold mb-1">Merged items ({items.length})</div>
            <table className="w-full border-collapse text-[10px]">
              <thead><tr className="bg-purple-100">
                {['name','patientId','aptId','queueId','status','token'].map(h => <th key={h} className="p-1 text-left border border-purple-200">{h}</th>)}
              </tr></thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i} className={i % 2 ? 'bg-white' : 'bg-purple-50'}>
                    <td className="p-1 border border-purple-100">{it.name}</td>
                    <td className="p-1 border border-purple-100">{it.patientId}</td>
                    <td className="p-1 border border-purple-100">{it.aptId ?? '—'}</td>
                    <td className="p-1 border border-purple-100">{it.queueId ?? '—'}</td>
                    <td className="p-1 border border-purple-100 font-bold">{it.status}</td>
                    <td className="p-1 border border-purple-100">{it.token ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Walk-in modal ────────────────────────────────────────────────────────────

function WalkinModal({ onClose, onAdd }: {
  onClose: () => void;
  onAdd: (info: { name: string; age?: number; gender?: 'M' | 'F' | 'Other'; phone?: string; email?: string; reason: string }) => void;
}) {
  const [form, setForm] = useState({ name: '', age: '', gender: 'M' as 'M' | 'F' | 'Other', phone: '', email: '', reason: '' });
  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  function submit() {
    if (!form.name.trim()) return;
    onAdd({
      name: form.name.trim(),
      age: form.age ? Number(form.age) : undefined,
      gender: form.gender,
      phone: form.phone || undefined,
      email: form.email || undefined,
      reason: form.reason,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-3">
        <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-teal-500" /> Add Walk-in Patient
        </h3>

        <div>
          <label className="label">Full Name *</label>
          <input className="input" autoFocus value={form.name} onChange={e => set('name', e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="Patient full name" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Age</label>
            <input className="input" type="number" min={0} max={120} value={form.age}
              onChange={e => set('age', e.target.value)} placeholder="e.g. 45" />
          </div>
          <div>
            <label className="label">Gender</label>
            <div className="flex gap-1">
              {(['M', 'F', 'Other'] as const).map(g => (
                <button key={g} type="button" onClick={() => setForm(f => ({ ...f, gender: g }))}
                  className={`flex-1 py-2 rounded-lg border-2 text-xs font-semibold transition-all ${form.gender === g ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-500'}`}>
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="label">Phone</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input className="input pl-9" value={form.phone} onChange={e => set('phone', e.target.value)}
              placeholder="10-digit mobile" type="tel" />
          </div>
        </div>

        <div>
          <label className="label">Email (optional)</label>
          <input className="input" value={form.email} onChange={e => set('email', e.target.value)}
            placeholder="patient@email.com" type="email" />
        </div>

        <div>
          <label className="label">Chief Complaint</label>
          <input className="input" value={form.reason} onChange={e => set('reason', e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="e.g. Fever, follow-up, routine check…" />
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={submit} className="btn-primary flex-1" disabled={!form.name.trim()}>
            Add to Queue
          </button>
        </div>
      </div>
    </div>
  );
}
