import { useState } from 'react';
import { Clock, UserCheck, Users, Stethoscope, CalendarDays, Plus, ChevronRight, Building2, AlertTriangle, User2, UserPlus } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { cn } from '@/lib/utils';
import type { QueueEntry, QueueStatus } from '@/types';

function getDays() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      date: d,
      label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short' }),
      dateStr: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    };
  });
}

const STATUS_CONFIG: Record<QueueStatus, { label: string; color: string; dot: string }> = {
  'waiting':     { label: 'Waiting',    color: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-400' },
  'in-progress': { label: 'In Consult', color: 'bg-teal-100 text-teal-700',    dot: 'bg-teal-500 animate-pulse' },
  'completed':   { label: 'Done',       color: 'bg-slate-100 text-slate-500',  dot: 'bg-slate-400' },
  'no-show':     { label: 'No Show',    color: 'bg-red-100 text-red-500',      dot: 'bg-red-400' },
};

function getMockSchedule(patients: ReturnType<typeof useAppStore.getState>['patients']) {
  const days = getDays();
  const schedule: Record<string, { name: string; reason: string; time: string; patientId: string }[]> = {};
  days.forEach((day, i) => {
    const key = day.date.toDateString();
    const slots = patients.slice(i % patients.length, (i % patients.length) + 3);
    schedule[key] = slots.map((p, j) => ({
      name: p.name,
      reason: p.diagnosis ?? 'Follow-up',
      time: `${9 + j * 2}:00`,
      patientId: p.id,
    }));
  });
  return schedule;
}

export default function OPDQueuePage() {
  const { queue, patients, todayAvailability, setQueue, staff, assignNurse, showToast } = useAppStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [activeDay, setActiveDay] = useState(0);
  const [showAddWalkin, setShowAddWalkin] = useState(false);
  const days = getDays();
  const schedule = getMockSchedule(patients);

  const waiting    = queue.filter(q => q.status === 'waiting');
  const inProgress = queue.filter(q => q.status === 'in-progress');
  const done       = queue.filter(q => q.status === 'completed' || q.status === 'no-show');
  const total      = queue.length;
  const todaySlots = schedule[days[activeDay].date.toDateString()] ?? [];
  const weekTotal  = Object.values(schedule).flat().length;

  // Availability info
  const todayDateStr = new Date().toISOString().slice(0, 10);
  const avail = todayAvailability?.date === todayDateStr ? todayAvailability : null;
  const atLimit = avail ? total >= avail.maxPatients : false;

  const nurses = staff.filter(s => s.role === 'nurse' && s.status === 'active');

  function addWalkin(name: string, reason: string, _phone: string) {
    if (atLimit) { showToast(`Queue full — max ${avail!.maxPatients} patients today`, 'warning'); return; }
    const token = total + 1;
    const qEntry: QueueEntry = {
      id: `Q${Date.now()}`, patientId: `WI${Date.now()}`, patientName: name,
      reason, token, status: 'waiting', waitMins: 0,
      registeredAt: new Date().toISOString(),
      assignedDoctor: user?.name,
    };
    setQueue([...queue, qEntry]);
    showToast(`Walk-in added — Token ${token}`, 'success');
    setShowAddWalkin(false);
  }

  function handleAssignNurse(patientId: string, nurseId: number, nurseName: string) {
    assignNurse(patientId, nurseId, nurseName);
    showToast(`Assigned to ${nurseName}`, 'success');
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">OPD Queue</h1>
          <p className="text-sm text-slate-500">{waiting.length} waiting · {inProgress.length} in consult · {done.length} done today</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/app/patients" className="btn-secondary btn-sm flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Register Patient
          </Link>
          <button onClick={() => {
            if (atLimit) { showToast(`Queue full — max ${avail!.maxPatients} patients for today`, 'warning'); return; }
            setShowAddWalkin(true);
          }} className={cn('btn-sm flex items-center gap-2', atLimit ? 'btn-secondary text-amber-600 border-amber-300' : 'btn-primary')}>
            {atLimit ? <AlertTriangle className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {atLimit ? 'Queue Full' : 'Add Walk-in'}
          </button>
        </div>
      </div>

      {/* ── Today's availability banner (from doctor's check-in) ── */}
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
              <div className="text-2xl font-black text-slate-900 leading-none">{total}<span className="text-sm font-normal text-slate-400">/{avail.maxPatients}</span></div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">patients</div>
            </div>
            <div className="w-16 h-2 rounded-full bg-slate-200 overflow-hidden">
              <div className={cn('h-full rounded-full transition-all', atLimit ? 'bg-red-500' : total / avail.maxPatients > 0.75 ? 'bg-amber-400' : 'bg-teal-500')}
                style={{ width: `${Math.min((total / avail.maxPatients) * 100, 100)}%` }} />
            </div>
          </div>
          {atLimit && (
            <div className="flex items-center gap-1.5 bg-red-50 text-red-700 text-xs font-semibold px-3 py-1.5 rounded-xl border border-red-200">
              <AlertTriangle className="w-3.5 h-3.5" /> Queue full for today
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

      {/* Live stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Today',     value: total,          icon: Users,      color: 'text-slate-800 bg-slate-100' },
          { label: 'Waiting',   value: waiting.length, icon: Clock,      color: 'text-amber-600 bg-amber-50' },
          { label: 'Completed', value: done.length,    icon: UserCheck,  color: 'text-emerald-600 bg-emerald-50' },
          { label: 'This Week', value: weekTotal,      icon: CalendarDays, color: 'text-teal-600 bg-teal-50' },
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

      {/* 7-day calendar strip */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays className="w-4 h-4 text-teal-600" />
          <span className="font-semibold text-slate-800 text-sm">Schedule — Next 7 Days</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {days.map((day, i) => {
            const slots = schedule[day.date.toDateString()] ?? [];
            return (
              <button key={i} onClick={() => setActiveDay(i)}
                className={cn('flex-shrink-0 flex flex-col items-center px-3 py-2.5 rounded-xl border-2 transition-all min-w-16',
                  activeDay === i ? 'border-teal-500 bg-teal-500 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-teal-300')}>
                <span className={cn('text-[10px] font-semibold uppercase', activeDay === i ? 'text-teal-100' : 'text-slate-400')}>{day.label}</span>
                <span className={cn('text-lg font-bold leading-tight', activeDay === i ? 'text-white' : 'text-slate-800')}>{day.date.getDate()}</span>
                <span className={cn('text-[10px]', activeDay === i ? 'text-teal-100' : 'text-slate-400')}>{day.dateStr.split(' ')[1]}</span>
                {slots.length > 0 && (
                  <span className={cn('mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                    activeDay === i ? 'bg-white/20 text-white' : 'bg-teal-100 text-teal-700')}>
                    {slots.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-4 space-y-2">
          {todaySlots.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm">No appointments scheduled</div>
          ) : todaySlots.map((slot, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-teal-50 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-teal-700">{i + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-800 text-sm">{slot.name}</div>
                <div className="text-xs text-slate-500">{slot.reason} · {slot.time}</div>
              </div>
              <button onClick={() => navigate(`/app/consult/${slot.patientId}`)}
                className="btn-primary btn-sm flex-shrink-0">
                <Stethoscope className="w-3.5 h-3.5" /> Consult
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* In progress */}
      {inProgress.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            <span className="text-sm font-bold text-teal-700">In Consultation ({inProgress.length})</span>
          </div>
          <div className="space-y-2">
            {inProgress.map(q => <QueueCard key={q.id} q={q} nurses={nurses} onConsult={id => navigate(`/app/consult/${id}`)} onAssignNurse={handleAssignNurse} />)}
          </div>
        </div>
      )}

      {/* Waiting */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-bold text-slate-700">Waiting ({waiting.length})</span>
        </div>
        {waiting.length === 0 ? (
          <div className="card p-8 text-center text-slate-400 text-sm">Queue is empty — no patients waiting</div>
        ) : (
          <div className="space-y-2">
            {waiting.map(q => <QueueCard key={q.id} q={q} nurses={nurses} onConsult={id => navigate(`/app/consult/${id}`)} onAssignNurse={handleAssignNurse} />)}
          </div>
        )}
      </div>

      {/* Done */}
      {done.length > 0 && (
        <div>
          <div className="text-sm font-bold text-slate-500 mb-3">Completed ({done.length})</div>
          <div className="space-y-2">
            {done.map(q => <QueueCard key={q.id} q={q} nurses={nurses} onConsult={id => navigate(`/app/consult/${id}`)} onAssignNurse={handleAssignNurse} />)}
          </div>
        </div>
      )}

      {/* Walk-in quick add modal */}
      {showAddWalkin && <WalkinModal onClose={() => setShowAddWalkin(false)} onAdd={addWalkin} />}
    </div>
  );
}

// ─── Queue Card ───────────────────────────────────────────────────────────────

interface QueueCardProps {
  q: QueueEntry & { assignedNurse?: string };
  nurses: { id: number; name: string }[];
  onConsult: (patientId: string) => void;
  onAssignNurse: (patientId: string, nurseId: number, nurseName: string) => void;
}

function QueueCard({ q, nurses, onConsult, onAssignNurse }: QueueCardProps) {
  const cfg = STATUS_CONFIG[q.status];
  const [nurseOpen, setNurseOpen] = useState(false);
  const [assigned, setAssigned] = useState(q.assignedNurse ?? '');

  return (
    <div className="card p-4 flex items-center gap-4 group hover:shadow-md transition-shadow">
      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-base font-black flex-shrink-0',
        q.status === 'in-progress' ? 'bg-teal-500 text-white' :
        q.status === 'waiting' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500')}>
        {q.token}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-bold text-slate-900">{q.patientName}</div>
        <div className="text-sm text-slate-500 truncate">{q.reason}</div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {q.assignedDoctor && <span className="text-xs text-slate-400">{q.assignedDoctor}</span>}
          {assigned ? (
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1">
              <User2 className="w-3 h-3" /> {assigned}
            </span>
          ) : nurses.length > 0 && (
            <button onClick={() => setNurseOpen(!nurseOpen)}
              className="text-xs text-slate-400 hover:text-blue-600 flex items-center gap-1 transition-colors">
              <User2 className="w-3 h-3" /> Assign nurse
            </button>
          )}
        </div>
        {nurseOpen && nurses.length > 0 && (
          <div className="mt-2 flex gap-1.5 flex-wrap">
            {nurses.map(n => (
              <button key={n.id} onClick={() => {
                onAssignNurse(q.patientId, n.id, n.name);
                setAssigned(n.name);
                setNurseOpen(false);
              }} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg hover:bg-blue-100 transition-colors">
                {n.name}
              </button>
            ))}
            <button onClick={() => setNurseOpen(false)} className="text-xs text-slate-400 px-2 py-1">Cancel</button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="text-right hidden sm:block">
          <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5', cfg.color)}>
            <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dot)} />
            {cfg.label}
          </span>
          {q.waitMins != null && q.status === 'waiting' && (
            <div className="text-xs text-slate-400 mt-1 text-right">{q.waitMins}m wait</div>
          )}
        </div>
        {q.status === 'completed' || q.status === 'no-show' ? (
          <Link to={`/app/patients/${q.patientId}`} className="btn-secondary btn-sm text-xs">
            View Record
          </Link>
        ) : (
          <button onClick={() => onConsult(q.patientId)} className="btn-primary btn-sm">
            <Stethoscope className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Consult</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Walk-in modal ────────────────────────────────────────────────────────────

function WalkinModal({ onClose, onAdd }: { onClose: () => void; onAdd: (n: string, r: string, ph: string) => void }) {
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');
  const [phone, setPhone] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <h3 className="font-bold text-lg text-slate-900">Add Walk-in Patient</h3>
        <div><label className="label">Name *</label><input className="input" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Patient name" /></div>
        <div><label className="label">Chief Complaint</label><input className="input" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Fever, follow-up…" /></div>
        <div><label className="label">Phone</label><input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="10-digit mobile" /></div>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={() => { if (name.trim()) onAdd(name.trim(), reason, phone); }} className="btn-primary flex-1" disabled={!name.trim()}>Add to Queue</button>
        </div>
      </div>
    </div>
  );
}
