import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Activity, Stethoscope, AlertTriangle, Clock, ChevronRight, User2, HeartPulse, CheckCircle2, Circle, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Patient } from '@/types';

function priorityColor(p: string) {
  if (p === 'Critical') return 'bg-red-100 text-red-700 border-red-200';
  if (p === 'High') return 'bg-orange-100 text-orange-700 border-orange-200';
  if (p === 'Medium') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-emerald-100 text-emerald-700 border-emerald-200';
}

function TaskChecklist({ patientId, vitalsRecent, hasMar, hasNote }: {
  patientId: string; vitalsRecent: boolean; hasMar: boolean; hasNote: boolean;
}) {
  const [open, setOpen] = useState(false);
  const tasks = [
    { label: 'Vitals recorded (last 4h)', done: vitalsRecent, link: '/app/vitals' },
    { label: 'MAR checked', done: hasMar, link: '/app/mar' },
    { label: 'Nursing note added', done: hasNote, link: '/app/notes' },
    { label: 'Photo documentation', done: false, link: `/app/patients/${patientId}` },
  ];
  const doneCount = tasks.filter(t => t.done).length;

  return (
    <div style={{ borderTop: '1px solid #f1f5f9', marginTop: 10, paddingTop: 8 }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: 0 }}
      >
        <div style={{ display: 'flex', gap: 2 }}>
          {tasks.map((t, i) => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: 2, background: t.done ? '#0d9488' : '#e2e8f0' }} />
          ))}
        </div>
        <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>{doneCount}/{tasks.length} tasks done</span>
        {open ? <ChevronUp style={{ width: 12, height: 12, color: '#94a3b8', marginLeft: 'auto' }} /> : <ChevronDown style={{ width: 12, height: 12, color: '#94a3b8', marginLeft: 'auto' }} />}
      </button>
      {open && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {tasks.map((t, i) => (
            <Link key={i} to={t.link} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', padding: '4px 6px', borderRadius: 6, background: t.done ? '#f0fdfa' : '#fff8f0' }}>
              {t.done
                ? <CheckCircle2 style={{ width: 13, height: 13, color: '#0d9488', flexShrink: 0 }} />
                : <Circle style={{ width: 13, height: 13, color: '#f59e0b', flexShrink: 0 }} />}
              <span style={{ fontSize: 12, color: t.done ? '#0f766e' : '#b45309', fontWeight: t.done ? 400 : 500 }}>{t.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NursePatientsPage() {
  const { user } = useAuthStore();
  const { patients, vitals, queue, nursingNotes, marEntries } = useAppStore();
  const [tab, setTab] = useState<'assigned' | 'queue'>('assigned');

  const assigned = patients.filter(p => p.assignedNurseId === user?.id);
  const myQueue   = queue.filter(q => (q as { assignedNurse?: string }).assignedNurse === user?.name);

  const activeList: Patient[] = tab === 'assigned' ? assigned : myQueue.map(q => patients.find(p => p.id === q.patientId)).filter(Boolean) as Patient[];

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <HeartPulse className="w-6 h-6 text-pink-500" /> My Patients
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Patients assigned to you by the doctor</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Assigned',     value: assigned.length,                                  color: 'bg-teal-50 text-teal-700', icon: User2 },
          { label: 'In Queue Today', value: myQueue.length,                                  color: 'bg-amber-50 text-amber-700', icon: Clock },
          { label: 'Critical',    value: assigned.filter(p => p.priority === 'Critical').length, color: 'bg-red-50 text-red-700', icon: AlertTriangle },
        ].map(s => (
          <div key={s.label} className={cn('rounded-2xl p-4 flex items-center gap-3', s.color, 'border border-current/10')}>
            <s.icon className="w-5 h-5 flex-shrink-0" />
            <div>
              <div className="text-2xl font-black">{s.value}</div>
              <div className="text-xs opacity-70">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab switch */}
      <div className="flex gap-2">
        {(['assigned', 'queue'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-4 py-2 rounded-xl text-sm font-semibold transition-all',
              tab === t ? 'bg-teal-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
            {t === 'assigned' ? `Assigned (${assigned.length})` : `Queue (${myQueue.length})`}
          </button>
        ))}
      </div>

      {/* Patient list */}
      {activeList.length === 0 ? (
        <div className="card p-10 text-center">
          <User2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="font-semibold text-slate-600">No patients {tab === 'assigned' ? 'assigned' : 'in queue'} yet</p>
          <p className="text-sm text-slate-400 mt-1">Ask the doctor or receptionist to assign patients to you</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activeList.map(p => {
            const latestVitals = (vitals[p.id] ?? []).at(0);
            const needsVitals = !latestVitals || new Date(latestVitals.time).getTime() < Date.now() - 4 * 60 * 60 * 1000;
            const vitalsRecent = !needsVitals;
            const todayStr = new Date().toISOString().slice(0, 10);
            const hasNote = (nursingNotes[p.id] ?? []).some(n => n.time.slice(0, 10) === todayStr);
            const hasMar = (marEntries[p.id] ?? []).some(m => m.scheduledTime.slice(0, 10) === todayStr && m.status === 'given');
            return (
              <div key={p.id} className={cn('card p-4 hover:shadow-md transition-shadow border-l-4',
                p.priority === 'Critical' ? 'border-l-red-500' :
                p.priority === 'High' ? 'border-l-orange-400' :
                p.priority === 'Medium' ? 'border-l-amber-400' : 'border-l-emerald-400')}>
                <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center font-bold text-teal-700 flex-shrink-0">
                  {p.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900">{p.name}</span>
                    <span className="text-xs text-slate-400">{p.age}Y/{p.gender}</span>
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border', priorityColor(p.priority))}>
                      {p.priority}
                    </span>
                  </div>
                  <div className="text-sm text-slate-500 truncate mt-0.5">{p.diagnosis ?? 'No diagnosis yet'}</div>
                  {latestVitals ? (
                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                      <span>BP {latestVitals.bp}</span>
                      {latestVitals.pulse && <span>Pulse {latestVitals.pulse}</span>}
                      {latestVitals.spo2 && <span>SpO₂ {latestVitals.spo2}%</span>}
                      {latestVitals.temp && <span>Temp {latestVitals.temp}°F</span>}
                    </div>
                  ) : (
                    <div className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> No vitals recorded
                    </div>
                  )}
                  {p.ward && <div className="text-xs text-slate-400">{p.ward}{p.bed ? ` · Bed ${p.bed}` : ''}</div>}
                </div>

                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <Link to={`/app/vitals`}
                    className={cn('btn-sm text-xs flex items-center gap-1', needsVitals ? 'btn-primary animate-pulse' : 'btn-secondary')}>
                    <Activity className="w-3 h-3" /> Vitals
                  </Link>
                  <Link to={`/app/patients/${p.id}`}
                    className="btn-secondary btn-sm text-xs flex items-center gap-1">
                    <Stethoscope className="w-3 h-3" /> View <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
                </div>
              <TaskChecklist patientId={p.id} vitalsRecent={vitalsRecent} hasMar={hasMar} hasNote={hasNote} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
