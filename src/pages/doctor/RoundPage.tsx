import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore, uid, nowIso } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { api, isApiEnabled } from '@/lib/api';
import { ArrowLeft, Activity, CheckCircle2, RotateCcw, FileText, AlertTriangle } from 'lucide-react';
import { cn, formatDateTime } from '@/lib/utils';
import type { Vitals, VisitRecord } from '@/types';

// IPD daily Round. Charts the nurse-recorded vitals over time, lets the doctor
// log today's complaint + treatment (with "continue same treatment"), and SAVES
// A ROUND ONLY — it does NOT generate a prescription. Discharge builds the summary.
export default function RoundPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { patients, vitals, visits, addVisit, setVitals, setPatientVisits, showToast } = useAppStore();
  const { user } = useAuthStore();

  const patient = patients.find(p => p.id === id);
  const [complaint, setComplaint] = useState('');
  const [treatment, setTreatment] = useState('');
  const [saving, setSaving] = useState(false);

  // Pull fresh vitals + visit history for this patient.
  useEffect(() => {
    if (!id || !isApiEnabled()) return;
    api.get<Vitals[]>(`/vitals/patient/${id}`).then(rows => { if (rows.length) setVitals(id, rows); }).catch(() => {});
    api.get<VisitRecord[]>(`/visits/patient/${id}`).then(rows => { if (rows.length) setPatientVisits(id, rows as any); }).catch(() => {});
  }, [id]);

  const rounds = useMemo(
    () => (visits[id!] ?? []).filter(v => (v as any).type === 'round'),
    [visits, id],
  );
  const lastRound = rounds[0] as any;

  function continueTreatment() {
    if (lastRound?.treatment) { setTreatment(lastRound.treatment); showToast('Loaded last treatment', 'success'); }
    else showToast('No previous round to continue from', 'info');
  }

  async function saveRound() {
    if (!patient) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 300));
    // A round is stored as a visit of type "round" — NO prescription is generated.
    addVisit({
      id: `round-${uid()}`,
      patientId: patient.id,
      date: nowIso(),
      doctorName: user?.name ?? 'Doctor',
      doctorId: user?.id,
      type: 'round',
      chiefComplaint: complaint,
      complaint,
      treatment,
      diagnosis: patient.diagnosis ?? '',
      drugs: [], vaccines: [], procedures: [], attachments: [],
      advice: '', followUp: '',
    } as any);
    showToast('Round saved', 'success');
    setSaving(false);
    navigate('/app/patients');
  }

  if (!patient) return (
    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
      <AlertTriangle className="w-10 h-10 mb-3" /><p>Patient not found</p>
    </div>
  );

  const ptVitals = (vitals[id!] ?? []).slice(0, 24); // newest first
  // Charting columns — Urine/Drain show once recorded (added to vitals later).
  const cols: { key: keyof Vitals; label: string; unit?: string; crit?: (v: Vitals) => boolean }[] = [
    { key: 'bp', label: 'BP', crit: v => !!v.bp && (parseInt(v.bp) > 160 || parseInt(v.bp) < 90) },
    { key: 'pulse', label: 'PR', crit: v => v.pulse != null && (v.pulse > 100 || v.pulse < 50) },
    { key: 'spo2', label: 'SpO₂', crit: v => v.spo2 != null && v.spo2 < 94 },
    { key: 'temp', label: 'Temp', crit: v => v.temp != null && v.temp > 100 },
    { key: 'rr', label: 'RR', crit: v => v.rr != null && v.rr > 24 },
    { key: 'sugar', label: 'Sugar', crit: v => v.sugar != null && (v.sugar > 250 || v.sugar < 60) },
    { key: 'urineOutput' as keyof Vitals, label: 'Urine' },
    { key: 'drainOutput' as keyof Vitals, label: 'Drain' },
  ];
  const activeCols = cols.filter(c => ptVitals.some(v => (v as any)[c.key] != null && (v as any)[c.key] !== ''));

  return (
    <div className="p-0 md:p-6 space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate(-1)} className="btn-ghost btn-sm mt-0.5"><ArrowLeft className="w-4 h-4" /></button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2 flex-wrap">
            {patient.name}
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">IPD Round</span>
          </h1>
          <p className="text-sm text-slate-500">{patient.age}Y/{patient.gender} · {patient.ward}{patient.bed ? ` · Bed ${patient.bed}` : ''} · {rounds.length} round{rounds.length !== 1 ? 's' : ''} so far</p>
        </div>
        <button onClick={saveRound} disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : <><CheckCircle2 className="w-4 h-4" /> Save Round</>}
        </button>
        <button onClick={() => navigate(`/app/discharge?pid=${id}`)} className="btn-secondary btn-sm">
          <FileText className="w-3.5 h-3.5" /> Discharge
        </button>
      </div>

      {/* Vitals charting (table grid) */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2">
          <Activity className="w-4 h-4 text-teal-600" /><h3 className="text-sm font-bold text-slate-800">Charting</h3>
          <span className="text-xs text-slate-400 ml-auto">latest first · recorded by nursing</span>
        </div>
        {ptVitals.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">No vitals recorded yet — nursing will chart BP, PR, SpO₂, sugar, urine/drain output.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table text-sm">
              <thead>
                <tr><th className="text-left">Time</th>{activeCols.map(c => <th key={String(c.key)} className="text-center">{c.label}</th>)}<th className="text-left">By</th></tr>
              </thead>
              <tbody>
                {ptVitals.map(v => (
                  <tr key={v.id}>
                    <td className="whitespace-nowrap text-xs text-slate-500">{formatDateTime(v.time)}</td>
                    {activeCols.map(c => {
                      const val = (v as any)[c.key];
                      const isCrit = c.crit?.(v);
                      return <td key={String(c.key)} className={cn('text-center font-semibold', isCrit ? 'text-red-600' : 'text-slate-800')}>{val ?? '—'}</td>;
                    })}
                    <td className="text-xs text-slate-400 whitespace-nowrap">{v.recordedBy || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Complaint + Treatment */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <label className="label">Complaint / Progress today</label>
          <textarea value={complaint} onChange={e => setComplaint(e.target.value)} rows={5}
            className="input resize-none" placeholder="Symptoms today, response to treatment, examination findings…" />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between mb-1">
            <label className="label mb-0">Treatment</label>
            <button onClick={continueTreatment} className="text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg px-2.5 py-1 flex items-center gap-1">
              <RotateCcw className="w-3 h-3" /> Continue same treatment
            </button>
          </div>
          <textarea value={treatment} onChange={e => setTreatment(e.target.value)} rows={5}
            className="input resize-none" placeholder="IV fluids, antibiotics, monitoring orders, diet…" />
        </div>
      </div>

      {/* Previous rounds */}
      {rounds.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60"><h3 className="text-sm font-bold text-slate-800">Previous Rounds</h3></div>
          <div className="divide-y divide-slate-50">
            {rounds.slice(0, 8).map((r: any) => (
              <div key={r.id} className="px-4 py-3">
                <div className="text-xs text-slate-400 mb-1">{formatDateTime(r.date)} · {r.doctorName}</div>
                {r.complaint && <div className="text-sm text-slate-700"><span className="text-slate-400">Complaint: </span>{r.complaint}</div>}
                {r.treatment && <div className="text-sm text-slate-700"><span className="text-slate-400">Treatment: </span>{r.treatment}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
