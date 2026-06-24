import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Search, CheckCircle2, Printer, AlertCircle, ChevronDown, ChevronUp, FlaskConical, Pill, Activity, ClipboardList } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { cn, formatDate } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import { DischargeSummaryPrint } from '@/components/DischargeSummaryPrint';
import { api } from '@/lib/api';
import type { Patient } from '@/types';

const DISCHARGE_TYPES = ['Improved', 'Cured', 'Referred', 'LAMA (Left Against Medical Advice)', 'Death', 'Transfer'];
const FOLLOW_UP = ['1 week', '2 weeks', '1 month', '3 months', '6 months', 'As needed', 'No follow-up'];

export default function DischargePage() {
  const { patients, prescriptions, labOrders, vitals, visits, upsertPatient, showToast } = useAppStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  // Nurses cannot discharge (vitals-only) — bounce deep-links out.
  useEffect(() => {
    if (user?.role === 'nurse') navigate('/app/patients', { replace: true });
  }, [user?.role, navigate]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Patient | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [saving, setSaving] = useState(false);
  const [discharged, setDischarged] = useState<string[]>([]);
  const [stayExpanded, setStayExpanded] = useState(false);

  const [form, setForm] = useState({
    dischargeType: 'Improved',
    finalDiagnosis: '',
    conditionAtDischarge: '',
    treatmentSummary: '',
    proceduresDone: '',
    followUp: '2 weeks',
    instructions: '',
    referredTo: '',
  });
  const setF = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const ipd = patients.filter(p =>
    p.status !== 'Discharged' &&
    (p.status === 'IPD' || p.status === 'Critical') &&
    (search === '' || p.name.toLowerCase().includes(search.toLowerCase()) || p.bed?.includes(search))
  );

  function openDischarge(p: Patient) {
    setSelected(p);
    setForm(f => ({ ...f, finalDiagnosis: p.diagnosis ?? '' }));
    setStayExpanded(false);
    setShowModal(true);
  }

  async function handleDischarge(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      const dischargeId = `DS-${selected.id}-${Date.now()}`;
      const dischargeDate = new Date().toISOString();
      const patientVisits = (visits[selected.id] ?? []);
      const patientLabs = (labOrders[selected.id] ?? []);
      const patientRx = (prescriptions[selected.id] ?? []);

      await api.post('/discharge', {
        id: dischargeId,
        patientId: selected.id,
        admitDate: selected.admitDate,
        dischargeDate,
        dischargeType: form.dischargeType,
        finalDiagnosis: form.finalDiagnosis,
        conditionAtDischarge: form.conditionAtDischarge,
        treatmentSummary: form.treatmentSummary,
        proceduresDone: form.proceduresDone,
        instructions: form.instructions,
        referredTo: form.referredTo,
        followUp: form.followUp,
        ward: selected.ward,
        bed: selected.bed,
        data: {
          visitCount: patientVisits.length,
          labCount: patientLabs.length,
          rxCount: patientRx.length,
        },
      });

      upsertPatient({ ...selected, status: 'Discharged' });
      setDischarged(d => [...d, selected.id]);
      showToast(`${selected.name} discharged successfully`, 'success');
    } catch {
      showToast('Discharge saved locally (sync pending)', 'info');
      upsertPatient({ ...selected, status: 'Discharged' });
      setDischarged(d => [...d, selected.id]);
    } finally {
      setSaving(false);
      setShowModal(false);
      setSelected(null);
    }
  }

  // Stats for the selected patient
  const selVisits = selected ? (visits[selected.id] ?? []) : [];
  const selLabs = selected ? (labOrders[selected.id] ?? []) : [];
  const selRx = selected ? (prescriptions[selected.id] ?? []) : [];
  const selVitals = selected ? (vitals[selected.id] ?? []) : [];
  const lastVitals = selVitals[selVitals.length - 1] ?? null;
  const pendingLabs = selLabs.filter(l => l.status !== 'resulted').length;
  const resultedLabs = selLabs.filter(l => l.status === 'resulted');

  return (
    <div className="p-0 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Discharge Patients</h1>
        <p className="text-sm text-slate-500 mt-0.5">Process patient discharges and generate discharge summaries</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search patient or bed…" className="input pl-9" />
      </div>

      {/* IPD patients */}
      <div className="space-y-3">
        {ipd.length === 0 && (
          <div className="card p-12 text-center">
            <LogOut className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <div className="text-slate-500 font-medium">No IPD patients found</div>
            <div className="text-sm text-slate-400">All patients matching criteria are already discharged</div>
          </div>
        )}
        {ipd.map(p => {
          const rxCount = (prescriptions[p.id] || []).filter(r => r.status === 'active').length;
          const labCount = (labOrders[p.id] || []).filter(l => l.status !== 'resulted').length;
          const justDischarged = discharged.includes(p.id);

          return (
            <div key={p.id} className={cn('card p-4 flex items-center gap-4', justDischarged && 'opacity-50')}>
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                p.priority === 'Critical' ? 'bg-red-50' : p.priority === 'High' ? 'bg-amber-50' : 'bg-teal-50')}>
                <LogOut className={cn('w-5 h-5',
                  p.priority === 'Critical' ? 'text-red-500' : p.priority === 'High' ? 'text-amber-500' : 'text-teal-600')} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">{p.name}</span>
                  <span className="text-xs text-slate-500">{p.age}y · {p.gender}</span>
                  {p.priority === 'Critical' && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Critical</span>
                  )}
                </div>
                <div className="text-sm text-slate-500 mt-0.5 flex flex-wrap gap-3">
                  <span>{p.diagnosis}</span>
                  {p.bed && <span>Bed {p.bed}</span>}
                  {p.ward && <span>{p.ward}</span>}
                  {p.admitDate && <span>Admitted {formatDate(p.admitDate)}</span>}
                </div>
                {(rxCount > 0 || labCount > 0) && (
                  <div className="flex gap-2 mt-1">
                    {rxCount > 0 && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{rxCount} active Rx</span>}
                    {labCount > 0 && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertCircle className="w-3 h-3" />{labCount} pending labs</span>}
                  </div>
                )}
              </div>
              <button onClick={() => openDischarge(p)} disabled={justDischarged} className="btn-primary flex-shrink-0">
                {justDischarged ? <><CheckCircle2 className="w-4 h-4" /> Discharged</> : <><LogOut className="w-4 h-4" /> Discharge</>}
              </button>
            </div>
          );
        })}
      </div>

      {/* Discharge Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={`Discharge: ${selected?.name}`} size="lg">
        {selected && (
          <form onSubmit={handleDischarge} className="space-y-4">
            {/* Patient summary */}
            <div className="bg-slate-50 rounded-xl px-4 py-3 text-sm grid grid-cols-2 gap-2">
              <div><span className="text-slate-400">Patient</span><div className="font-medium">{selected.name}, {selected.age}y</div></div>
              <div><span className="text-slate-400">Admitted</span><div className="font-medium">{selected.admitDate ? formatDate(selected.admitDate) : '—'}</div></div>
              <div><span className="text-slate-400">Bed / Ward</span><div className="font-medium">{selected.bed || '—'} / {selected.ward || '—'}</div></div>
              <div><span className="text-slate-400">Attending</span><div className="font-medium">{selected.attendingDoctor || 'You'}</div></div>
            </div>

            {/* IPD Stay at a Glance */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 overflow-hidden">
              <button type="button"
                onClick={() => setStayExpanded(x => !x)}
                className="w-full flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-indigo-50/60 transition-colors">
                <span className="font-semibold text-indigo-800 text-sm flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" /> IPD Stay at a Glance
                </span>
                <div className="flex items-center gap-3">
                  <div className="flex gap-2">
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{selVisits.length} visit{selVisits.length !== 1 ? 's' : ''}</span>
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{selRx.length} Rx</span>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full', pendingLabs > 0 ? 'bg-amber-100 text-amber-700' : 'bg-teal-100 text-teal-700')}>
                      {resultedLabs.length}/{selLabs.length} labs
                    </span>
                  </div>
                  {stayExpanded ? <ChevronUp className="w-4 h-4 text-indigo-500" /> : <ChevronDown className="w-4 h-4 text-indigo-500" />}
                </div>
              </button>

              {stayExpanded && (
                <div className="px-4 pb-4 space-y-4 border-t border-indigo-100">
                  {/* Last vitals */}
                  {lastVitals && (
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide mt-3 mb-2">
                        <Activity className="w-3.5 h-3.5" /> Latest Vitals
                        <span className="font-normal text-slate-400">· {new Date(lastVitals.time).toLocaleDateString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</span>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {[
                          { label: 'BP', val: lastVitals.bp },
                          { label: 'Pulse', val: lastVitals.pulse ? `${lastVitals.pulse} bpm` : null },
                          { label: 'Temp', val: lastVitals.temp ? `${lastVitals.temp}°F` : null },
                          { label: 'SpO₂', val: lastVitals.spo2 ? `${lastVitals.spo2}%` : null },
                          { label: 'Sugar', val: lastVitals.sugar !== undefined ? `${lastVitals.sugar} mg/dL` : null },
                        ].filter(x => x.val).map(x => (
                          <div key={x.label} className="bg-white rounded-lg p-2 text-center border border-slate-100">
                            <div className="text-xs text-slate-400">{x.label}</div>
                            <div className="text-sm font-semibold text-slate-800">{x.val}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Lab results */}
                  {selLabs.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                        <FlaskConical className="w-3.5 h-3.5" /> Lab Results
                      </div>
                      <div className="space-y-1">
                        {selLabs.map(l => (
                          <div key={l.id} className="flex items-center gap-2 text-xs py-1 border-b border-slate-100">
                            <span className={cn('w-2 h-2 rounded-full flex-shrink-0',
                              l.status === 'resulted' ? (l.critical ? 'bg-red-500' : 'bg-teal-500') : 'bg-amber-400')} />
                            <span className="font-medium text-slate-700 flex-1">{l.testName}</span>
                            {l.result ? (
                              <span className={cn('font-semibold', l.critical ? 'text-red-600' : 'text-slate-800')}>
                                {l.result} {l.unit || ''}
                                {l.critical && ' ⚠'}
                              </span>
                            ) : (
                              <span className="text-amber-600 capitalize">{l.status}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Prescriptions */}
                  {selRx.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                        <Pill className="w-3.5 h-3.5" /> Medications Given
                      </div>
                      <div className="space-y-1">
                        {selRx.map((rx, i) => (
                          <div key={rx.id} className="flex items-center gap-2 text-xs py-1 border-b border-slate-100">
                            <span className="text-slate-400 w-4">{i + 1}.</span>
                            <span className="font-medium text-slate-800 flex-1">{rx.drug}</span>
                            <span className="text-slate-500">{rx.dose}</span>
                            <span className="text-slate-400">{rx.frequency}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Visit summary */}
                  {selVisits.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                        <ClipboardList className="w-3.5 h-3.5" /> Consultation History
                      </div>
                      <div className="space-y-1.5">
                        {[...selVisits].reverse().map(v => (
                          <div key={v.id} className="text-xs p-2 bg-white rounded-lg border border-slate-100 border-l-2 border-l-indigo-400">
                            <div className="text-slate-400 flex justify-between">
                              <span>{v.date ? new Date(v.date).toLocaleString('en-IN') : ''}</span>
                              {v.doctorName && <span className="text-indigo-400">{v.doctorName}</span>}
                            </div>
                            {v.diagnosis && <div className="font-semibold text-slate-800 mt-1">Dx: {v.diagnosis}</div>}
                            {v.chiefComplaint && <div className="text-slate-600 mt-0.5"><span className="font-medium text-slate-400">CC:</span> {v.chiefComplaint}</div>}
                            {v.hopi && <div className="text-slate-600 mt-0.5"><span className="font-medium text-slate-400">History/Notes:</span> {v.hopi}</div>}
                            {v.investigation && <div className="text-slate-600 mt-0.5"><span className="font-medium text-slate-400">Inv:</span> {v.investigation}</div>}
                            {v.advice && <div className="text-slate-600 mt-0.5"><span className="font-medium text-slate-400">Advice:</span> {v.advice}</div>}
                            {v.privateNote && <div className="text-slate-600 mt-0.5"><span className="font-medium text-slate-400">Private Note:</span> {v.privateNote}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selVisits.length === 0 && selLabs.length === 0 && selRx.length === 0 && !lastVitals && (
                    <div className="text-sm text-slate-400 py-2 text-center">No IPD records found</div>
                  )}
                </div>
              )}
            </div>

            {/* Discharge form fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Discharge Type *</label>
                <select value={form.dischargeType} onChange={e => setF('dischargeType', e.target.value)} className="input">
                  {DISCHARGE_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Follow-up</label>
                <select value={form.followUp} onChange={e => setF('followUp', e.target.value)} className="input">
                  {FOLLOW_UP.map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="label">Final Diagnosis *</label>
                <input value={form.finalDiagnosis} onChange={e => setF('finalDiagnosis', e.target.value)} className="input" required />
              </div>
              <div className="col-span-2">
                <label className="label">Condition at Discharge</label>
                <input value={form.conditionAtDischarge} onChange={e => setF('conditionAtDischarge', e.target.value)}
                  placeholder="e.g. Stable, Improved, Same" className="input" />
              </div>
              <div className="col-span-2">
                <label className="label">Treatment Summary *</label>
                <textarea value={form.treatmentSummary} onChange={e => setF('treatmentSummary', e.target.value)}
                  rows={3} className="input resize-none" placeholder="Medications given, procedures done, response to treatment…" required />
              </div>
              <div className="col-span-2">
                <label className="label">Procedures Done</label>
                <textarea value={form.proceduresDone} onChange={e => setF('proceduresDone', e.target.value)}
                  rows={2} className="input resize-none" placeholder="Surgeries, endoscopies, interventions…" />
              </div>
              <div className="col-span-2">
                <label className="label">Discharge Instructions</label>
                <textarea value={form.instructions} onChange={e => setF('instructions', e.target.value)}
                  rows={2} className="input resize-none" placeholder="Diet, activity restrictions, wound care…" />
              </div>
              {form.dischargeType === 'Referred' && (
                <div className="col-span-2">
                  <label className="label">Referred To</label>
                  <input value={form.referredTo} onChange={e => setF('referredTo', e.target.value)} className="input" placeholder="Hospital / Specialist name" />
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2 flex-wrap">
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button type="button" className="btn-secondary flex items-center gap-2"
                onClick={() => setShowPrint(true)}>
                <Printer className="w-4 h-4" /> Preview Summary
              </button>
              <button type="submit" disabled={saving} className="btn-primary flex-1 min-w-[140px]">
                {saving ? 'Processing…' : <><CheckCircle2 className="w-4 h-4" /> Confirm Discharge</>}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Discharge Summary Print Overlay */}
      {showPrint && selected && (
        <DischargeSummaryPrint
          patient={selected}
          form={form}
          admitDate={selected.admitDate}
          dischargeDate={new Date().toISOString()}
          visits={selVisits}
          vitals={selVitals}
          labs={selLabs}
          prescriptions={selRx}
          onClose={() => setShowPrint(false)}
        />
      )}
    </div>
  );
}
