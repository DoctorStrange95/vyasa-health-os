import { useState } from 'react';
import { Activity, Plus, Users, BedDouble } from 'lucide-react';
import { useAppStore, uid, nowIso } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Modal } from '@/components/ui/Modal';
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge';
import { formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function VitalsPage() {
  const { patients, vitals, addVitals, queue, showToast } = useAppStore();
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [selPid, setSelPid] = useState('');
  const [selName, setSelName] = useState('');
  const [form, setForm] = useState({ bp: '', pulse: '', temp: '', spo2: '', rr: '', sugar: '', notes: '' });
  const [tab, setTab] = useState<'ipd' | 'opd'>('ipd');

  // IPD = admitted patients
  const ipdPatients = patients.filter(p => p.status === 'IPD' || p.status === 'Critical');

  // OPD = patients currently in the queue (waiting or in-progress)
  const opdQueueIds = new Set(
    queue.filter(q => q.status === 'waiting' || q.status === 'in-progress').map(q => q.patientId)
  );
  const opdPatients = patients.filter(p => opdQueueIds.has(p.id) || p.status === 'OPD');

  const displayList = tab === 'ipd' ? ipdPatients : opdPatients;

  function openFor(pid: string, name: string) {
    setSelPid(pid); setSelName(name); setOpen(true);
  }
  function submit() {
    addVitals({
      id: uid(), patientId: selPid, time: nowIso(),
      recordedBy: user?.name || 'Nurse',
      bp: form.bp || undefined,
      pulse: form.pulse ? +form.pulse : undefined,
      temp: form.temp ? +form.temp : undefined,
      spo2: form.spo2 ? +form.spo2 : undefined,
      rr: form.rr ? +form.rr : undefined,
      sugar: form.sugar ? +form.sugar : undefined,
      notes: form.notes || undefined,
    });
    showToast('Vitals saved', 'success');
    setOpen(false);
    setForm({ bp: '', pulse: '', temp: '', spo2: '', rr: '', sugar: '', notes: '' });
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="page-title">Vitals Entry</h1>
        <p className="page-subtitle">Record vitals for IPD or OPD patients</p>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setTab('ipd')}
          className={cn('flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all',
            tab === 'ipd' ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
          )}>
          <BedDouble className="w-4 h-4" /> IPD / Admitted ({ipdPatients.length})
        </button>
        <button
          onClick={() => setTab('opd')}
          className={cn('flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all',
            tab === 'opd' ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
          )}>
          <Users className="w-4 h-4" /> OPD Queue ({opdPatients.length})
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {displayList.map(p => {
          const latest = vitals[p.id]?.[0];
          const hasAlert = latest?.alert;
          return (
            <div key={p.id} className={cn('card p-5', hasAlert && 'border-red-300 bg-red-50/30')}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-bold text-slate-900">{p.name}</div>
                  <div className="text-xs text-slate-500">
                    {p.age}y
                    {tab === 'ipd' && p.ward ? ` · ${p.ward} · Bed ${p.bed}` : ` · OPD`}
                  </div>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <StatusBadge status={p.status} />
                  <PriorityBadge priority={p.priority} />
                </div>
              </div>
              {latest ? (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    ['BP', latest.bp],
                    ['Pulse', latest.pulse ? `${latest.pulse}bpm` : null],
                    ['SpO2', latest.spo2 ? `${latest.spo2}%` : null],
                    ['Temp', latest.temp ? `${latest.temp}°F` : null],
                    ['RR', latest.rr ? `${latest.rr}/m` : null],
                    ['Sugar', latest.sugar ? `${latest.sugar}` : null],
                  ].map(([l, v]) => (
                    <div key={l as string} className="bg-white rounded-lg p-2 border border-slate-100">
                      <div className="text-[10px] text-slate-400">{l}</div>
                      <div className="text-sm font-bold text-slate-800">{v || '—'}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-400 mb-3 py-2 bg-slate-50 rounded-lg text-center">No vitals yet today</div>
              )}
              {latest && <div className="text-[10px] text-slate-400 mb-3">{formatDateTime(latest.time)}</div>}
              <button onClick={() => openFor(p.id, p.name)} className="btn-primary w-full btn-sm">
                <Plus className="w-3.5 h-3.5" /> Record Vitals
              </button>
            </div>
          );
        })}
        {displayList.length === 0 && (
          <div className="col-span-3 text-center py-12 text-slate-400">
            <Activity className="w-10 h-10 mx-auto mb-2 text-slate-200" />
            {tab === 'ipd' ? 'No admitted patients' : 'No patients in OPD queue'}
          </div>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Record Vitals — ${selName}`}
        footer={
          <>
            <button onClick={() => setOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={submit} className="btn-primary">Save Vitals</button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          {[
            ['Blood Pressure', 'bp', '120/80'],
            ['Pulse (bpm)', 'pulse', '72'],
            ['Temperature (°F)', 'temp', '98.6'],
            ['SpO2 (%)', 'spo2', '98'],
            ['Resp. Rate (/min)', 'rr', '16'],
            ['Blood Sugar', 'sugar', '—'],
          ].map(([label, key, ph]) => (
            <div key={key as string}>
              <label className="label">{label}</label>
              <input
                className="input"
                placeholder={ph as string}
                value={(form as Record<string, string>)[key as string]}
                onChange={e => setForm(f => ({ ...f, [key as string]: e.target.value }))}
              />
            </div>
          ))}
          <div className="col-span-2">
            <label className="label">Notes</label>
            <textarea className="input resize-none h-16" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
