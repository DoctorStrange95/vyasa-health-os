import { useState } from 'react';
import { LogOut, Search, CheckCircle2, Printer, AlertCircle } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { cn, formatDate } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import type { Patient } from '@/types';

const DISCHARGE_TYPES = ['Improved', 'Cured', 'Referred', 'LAMA (Left Against Medical Advice)', 'Death', 'Transfer'];
const FOLLOW_UP = ['1 week', '2 weeks', '1 month', '3 months', '6 months', 'As needed', 'No follow-up'];

export default function DischargePage() {
  const { patients, prescriptions, labOrders, upsertPatient, showToast } = useAppStore();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Patient | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [discharged, setDischarged] = useState<string[]>([]);

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
    setShowModal(true);
  }

  async function handleDischarge(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    upsertPatient({ ...selected, status: 'Discharged' });
    setDischarged(d => [...d, selected.id]);
    showToast(`${selected.name} discharged`, 'success');
    setSaving(false);
    setShowModal(false);
    setSelected(null);
  }

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

      {/* IPD patients ready for discharge */}
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
            <div className="bg-slate-50 rounded-xl px-4 py-3 text-sm grid grid-cols-2 gap-2">
              <div><span className="text-slate-400">Patient</span><div className="font-medium">{selected.name}, {selected.age}y</div></div>
              <div><span className="text-slate-400">Admitted</span><div className="font-medium">{selected.admitDate ? formatDate(selected.admitDate) : '—'}</div></div>
              <div><span className="text-slate-400">Bed / Ward</span><div className="font-medium">{selected.bed || '—'} / {selected.ward || '—'}</div></div>
              <div><span className="text-slate-400">Attending</span><div className="font-medium">{selected.attendingDoctor || 'You'}</div></div>
            </div>

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

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="button" className="btn-secondary" onClick={() => window.print()}>
                <Printer className="w-4 h-4" /> Preview Summary
              </button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Processing…' : <><CheckCircle2 className="w-4 h-4" /> Confirm Discharge</>}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
