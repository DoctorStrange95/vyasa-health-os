import { useState, useMemo } from 'react';
import { FileText, Plus, Search, Printer, Send, Pill, Calendar, User, ChevronDown, ChevronUp, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { cn, formatDate } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import type { Medication, Patient } from '@/types';

const ROUTES = ['Oral', 'IV', 'IM', 'SC', 'Topical', 'Inhaled', 'Sublingual', 'Rectal', 'Nasal'];
const FREQUENCIES = ['Once daily', 'Twice daily', 'Three times daily', 'Four times daily', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours', 'As needed', 'Stat (immediately)', 'Bedtime'];
const DURATIONS = ['1 day', '3 days', '5 days', '7 days', '10 days', '14 days', '21 days', '30 days', '60 days', 'Ongoing'];

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  discontinued: 'bg-red-100 text-red-700',
  completed: 'bg-slate-100 text-slate-600',
};

interface RxDrug { drug: string; dose: string; route: string; frequency: string; duration: string; instructions: string; }

export default function PrescriptionsPage() {
  const { patients, prescriptions, addPrescription } = useAppStore();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('active');
  const [showNew, setShowNew] = useState(false);
  const [expandedRx, setExpandedRx] = useState<string | null>(null);

  // New Rx form state
  const [selectedPatient, setSelectedPatient] = useState('');
  const [drugs, setDrugs] = useState<RxDrug[]>([{ drug: '', dose: '', route: 'Oral', frequency: 'Twice daily', duration: '7 days', instructions: '' }]);
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Flatten all prescriptions with patient info
  const allRx = useMemo(() => {
    const rows: (Medication & { patient: Patient })[] = [];
    patients.forEach(p => {
      const rxList = prescriptions[p.id] || [];
      rxList.forEach(rx => rows.push({ ...rx, patient: p }));
    });
    return rows;
  }, [patients, prescriptions]);

  const filtered = useMemo(() => {
    return allRx.filter(rx => {
      const matchSearch = !search ||
        rx.drug.toLowerCase().includes(search.toLowerCase()) ||
        rx.patient.name.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || rx.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [allRx, search, statusFilter]);

  function addDrug() {
    setDrugs(d => [...d, { drug: '', dose: '', route: 'Oral', frequency: 'Twice daily', duration: '7 days', instructions: '' }]);
  }

  function updateDrug(i: number, field: keyof RxDrug, val: string) {
    setDrugs(d => d.map((drug, idx) => idx === i ? { ...drug, [field]: val } : drug));
  }

  function removeDrug(i: number) {
    setDrugs(d => d.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatient || drugs.some(d => !d.drug || !d.dose)) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    drugs.forEach(d => {
      addPrescription({
        id: `rx-${Date.now()}-${Math.random()}`,
        patientId: selectedPatient,
        drug: d.drug,
        dose: d.dose,
        route: d.route,
        frequency: d.frequency,
        duration: d.duration,
        instructions: d.instructions || diagnosis,
        prescribedBy: user?.name || 'Doctor',
        time: new Date().toISOString(),
        status: 'active',
      });
    });
    setSaving(false);
    setShowNew(false);
    setSelectedPatient('');
    setDrugs([{ drug: '', dose: '', route: 'Oral', frequency: 'Twice daily', duration: '7 days', instructions: '' }]);
    setDiagnosis('');
    setNotes('');
  }

  const activePt = patients.find(p => p.id === selectedPatient);

  const statCounts = {
    active: allRx.filter(r => r.status === 'active').length,
    today: allRx.filter(r => r.time?.startsWith(new Date().toISOString().slice(0, 10))).length,
    patients: new Set(allRx.filter(r => r.status === 'active').map(r => r.patientId)).size,
  };

  return (
    <div className="p-0 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Prescriptions</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage and write prescriptions for your patients</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Write Prescription
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        {[
          { label: 'Active Rx', value: statCounts.active, icon: Pill, color: 'text-teal-600 bg-teal-50' },
          { label: 'Written Today', value: statCounts.today, icon: Calendar, color: 'text-blue-600 bg-blue-50' },
          { label: 'Patients on Rx', value: statCounts.patients, icon: User, color: 'text-violet-600 bg-violet-50' },
        ].map(s => (
          <div key={s.label} className="card p-4 flex items-center gap-4">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', s.color)}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{s.value}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search drug or patient…" className="input pl-9" />
        </div>
        <div className="tab-bar">
          {(['active', 'all', 'completed'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn('tab-btn', statusFilter === s && 'active')}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Rx List */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="card p-12 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <div className="text-slate-500 font-medium">No prescriptions found</div>
            <div className="text-sm text-slate-400 mt-1">Write a new prescription to get started</div>
          </div>
        )}
        {filtered.map(rx => {
          const isExpanded = expandedRx === rx.id;
          return (
            <div key={rx.id} className="card overflow-hidden">
              <div className="p-4 flex items-center gap-4 cursor-pointer hover:bg-slate-50"
                onClick={() => setExpandedRx(isExpanded ? null : rx.id)}>
                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                  <Pill className="w-5 h-5 text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900">{rx.drug}</span>
                    <span className="text-slate-500 text-sm">{rx.dose} · {rx.route}</span>
                    <span className={cn('badge text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[rx.status ?? 'active'])}>{rx.status}</span>
                  </div>
                  <div className="text-sm text-slate-500 mt-0.5 flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{rx.patient.name}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{rx.frequency}</span>
                    <span>{rx.duration}</span>
                    {rx.time && <span className="text-slate-400">{formatDate(rx.time)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button className="btn-secondary btn-sm" onClick={e => { e.stopPropagation(); window.print(); }}>
                    <Printer className="w-3.5 h-3.5" /> Print
                  </button>
                  <button className="btn-secondary btn-sm" onClick={e => e.stopPropagation()}>
                    <Send className="w-3.5 h-3.5" /> WhatsApp
                  </button>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </div>
              {isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div><span className="text-slate-400 text-xs uppercase tracking-wide">Patient</span><div className="font-medium">{rx.patient.name}, {rx.patient.age}y</div></div>
                  <div><span className="text-slate-400 text-xs uppercase tracking-wide">Prescribed By</span><div className="font-medium">{rx.prescribedBy}</div></div>
                  <div><span className="text-slate-400 text-xs uppercase tracking-wide">Instructions</span><div className="font-medium">{rx.instructions || '—'}</div></div>
                  <div><span className="text-slate-400 text-xs uppercase tracking-wide">Date</span><div className="font-medium">{rx.time ? formatDate(rx.time) : '—'}</div></div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Write Rx Modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Write Prescription" size="lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Patient select */}
          <div>
            <label className="label">Patient *</label>
            <select value={selectedPatient} onChange={e => setSelectedPatient(e.target.value)} className="input" required>
              <option value="">Select patient…</option>
              {patients.filter(p => p.status !== 'Discharged').map(p => (
                <option key={p.id} value={p.id}>{p.name} · {p.status} · {p.diagnosis}</option>
              ))}
            </select>
          </div>

          {activePt && (
            <div className="flex items-center gap-3 bg-teal-50 rounded-xl px-4 py-2.5 text-sm">
              <User className="w-4 h-4 text-teal-600 flex-shrink-0" />
              <span className="font-medium text-teal-800">{activePt.name}</span>
              <span className="text-teal-600">{activePt.age}y · {activePt.gender} · {activePt.diagnosis}</span>
            </div>
          )}

          <div>
            <label className="label">Diagnosis / Indication</label>
            <input value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="e.g. Hypertension, Type 2 DM" className="input" />
          </div>

          {/* Drug rows */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Medications *</label>
              <button type="button" onClick={addDrug} className="btn-secondary btn-sm">
                <Plus className="w-3.5 h-3.5" /> Add Drug
              </button>
            </div>
            <div className="space-y-3">
              {drugs.map((drug, i) => (
                <div key={i} className="border border-slate-200 rounded-xl p-3 space-y-3 bg-slate-50">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-slate-500 font-medium mb-1 block">Drug Name *</label>
                        <input value={drug.drug} onChange={e => updateDrug(i, 'drug', e.target.value)}
                          placeholder="e.g. Amlodipine" className="input text-sm" required />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 font-medium mb-1 block">Dose *</label>
                        <input value={drug.dose} onChange={e => updateDrug(i, 'dose', e.target.value)}
                          placeholder="e.g. 5mg" className="input text-sm" required />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 font-medium mb-1 block">Route</label>
                        <select value={drug.route} onChange={e => updateDrug(i, 'route', e.target.value)} className="input text-sm">
                          {ROUTES.map(r => <option key={r}>{r}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 font-medium mb-1 block">Frequency</label>
                        <select value={drug.frequency} onChange={e => updateDrug(i, 'frequency', e.target.value)} className="input text-sm">
                          {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 font-medium mb-1 block">Duration</label>
                        <select value={drug.duration} onChange={e => updateDrug(i, 'duration', e.target.value)} className="input text-sm">
                          {DURATIONS.map(d => <option key={d}>{d}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 font-medium mb-1 block">Instructions</label>
                        <input value={drug.instructions} onChange={e => updateDrug(i, 'instructions', e.target.value)}
                          placeholder="After food, with water…" className="input text-sm" />
                      </div>
                    </div>
                    {drugs.length > 1 && (
                      <button type="button" onClick={() => removeDrug(i)}
                        className="mt-6 text-red-400 hover:text-red-600 flex-shrink-0">
                        <XCircle className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Additional Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              rows={2} placeholder="Special instructions, allergies noted, follow-up…" className="input resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowNew(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : <><CheckCircle2 className="w-4 h-4" /> Save Prescription</>}
            </button>
            <button type="submit" disabled={saving} className="btn-secondary">
              <Printer className="w-4 h-4" /> Save & Print
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
