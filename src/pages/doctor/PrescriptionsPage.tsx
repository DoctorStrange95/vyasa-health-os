import { useState, useMemo } from 'react';
import { FileText, Plus, Search, Printer, Send, Pill, Calendar, User, ChevronDown, ChevronUp, Clock, CheckCircle2, Lock } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { cn, formatDate } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import { RxSection, type RxRow } from '@/components/prescription/RxSection';
import type { Medication, Patient } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  discontinued: 'bg-red-100 text-red-700',
  completed: 'bg-slate-100 text-slate-600',
};

const BLANK_RX_ROW = (): RxRow => ({ id: String(Date.now()), form: 'Tab', drug: '', dose: '', strength: '', puffs: '', doseML: '', route: 'Oral', frequency: 'OD', duration: '5 days', instructions: '' });

export default function PrescriptionsPage() {
  const { patients, prescriptions, addPrescription } = useAppStore();
  const { user, isDemo } = useAuthStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('active');
  const [showNew, setShowNew] = useState(false);
  const [expandedRx, setExpandedRx] = useState<string | null>(null);

  // New Rx form state
  const [selectedPatient, setSelectedPatient] = useState('');
  const [rxRows, setRxRows] = useState<RxRow[]>([BLANK_RX_ROW()]);
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [showAddPatient, setShowAddPatient] = useState(false);

  // Quick patient registration state
  const [newPtName, setNewPtName] = useState('');
  const [newPtAge, setNewPtAge] = useState('');
  const [newPtGender, setNewPtGender] = useState<'M' | 'F' | 'Other'>('M');
  const [newPtPhone, setNewPtPhone] = useState('');
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

  function updateRxForm(id: string, form: RxRow['form']) {
    const FORM_ROUTES: Record<RxRow['form'], string> = { Tab: 'Oral', Cap: 'Oral', Syr: 'Oral', MDI: 'Inhaled', Drops: 'Topical', Cream: 'Topical', Inj: 'IM' };
    setRxRows(rows => rows.map(r => r.id === id ? { ...r, form, route: FORM_ROUTES[form] } : r));
  }

  function updateRx(id: string, field: keyof RxRow, val: string) {
    setRxRows(rows => rows.map(r => r.id === id ? { ...r, [field]: val } : r));
  }

  function removeRx(id: string) {
    setRxRows(rows => rows.filter(r => r.id !== id));
  }

  function updateRxMulti(id: string, fields: Partial<RxRow>) {
    setRxRows(rows => rows.map(r => r.id === id ? { ...r, ...fields } : r));
  }

  function addRxRow() {
    setRxRows(rows => [...rows, BLANK_RX_ROW()]);
  }

  function handleQuickAddPatient() {
    if (!newPtName.trim() || !newPtAge) return;
    const { upsertPatient } = useAppStore.getState();
    const newPatientId = `p-${Date.now()}`;
    const mrn = `MRN-${String(patients.length + 1).padStart(3, '0')}`;

    upsertPatient({
      id: newPatientId,
      name: newPtName.trim(),
      age: Number(newPtAge),
      gender: newPtGender,
      mrn,
      phone: newPtPhone || undefined,
      status: 'OPD',
      priority: 'Stable',
      allergies: [],
      attendingDoctor: user?.name ?? '',
      attendingDoctorId: user?.id,
    });

    setSelectedPatient(newPatientId);
    setShowAddPatient(false);
    setNewPtName('');
    setNewPtAge('');
    setNewPtPhone('');
    setNewPtGender('M');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isDemo) {
      alert('Writing prescriptions is not available in demo mode');
      return;
    }
    const activeDrugs = rxRows.filter(r => r.drug.trim());
    if (!selectedPatient || activeDrugs.length === 0) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    activeDrugs.forEach(d => {
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
    setRxRows([BLANK_RX_ROW()]);
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
      {/* Demo Mode Banner */}
      {isDemo && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3">
          <Lock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-amber-900">Demo Mode - Read Only</div>
            <div className="text-sm text-amber-800 mt-0.5">You cannot write, print, or share prescriptions in demo mode. This is a demonstration account only.</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Prescriptions</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage and write prescriptions for your patients</p>
        </div>
        {isDemo ? (
          <button disabled className="btn-primary opacity-50 cursor-not-allowed" title="Not available in demo mode">
            <Lock className="w-4 h-4" /> Write Prescription (Demo)
          </button>
        ) : (
          <button onClick={() => setShowNew(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Write Prescription
          </button>
        )}
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
            <div key={rx.id} className={cn("card overflow-hidden", isDemo && "relative")}>
              {isDemo && (
                <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center opacity-10">
                  <div className="text-8xl font-bold text-slate-900 transform -rotate-45">DEMO</div>
                </div>
              )}
              <div className="p-4 flex flex-wrap items-center gap-3 sm:gap-4 cursor-pointer hover:bg-slate-50"
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
                <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end">
                  {!isDemo && (
                    <>
                      <button className="btn-secondary btn-sm" onClick={e => { e.stopPropagation(); window.print(); }}>
                        <Printer className="w-3.5 h-3.5" /> Print
                      </button>
                      <button className="btn-secondary btn-sm" onClick={e => e.stopPropagation()}>
                        <Send className="w-3.5 h-3.5" /> WhatsApp
                      </button>
                    </>
                  )}
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
          {/* Patient selection or quick add */}
          {!showAddPatient ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Patient *</label>
                <button type="button" onClick={() => setShowAddPatient(true)} className="btn-secondary btn-sm text-xs">
                  <Plus className="w-3 h-3" /> Add New
                </button>
              </div>
              <select value={selectedPatient} onChange={e => setSelectedPatient(e.target.value)} className="input" required>
                <option value="">Select patient…</option>
                {patients.filter(p => p.status !== 'Discharged').map(p => (
                  <option key={p.id} value={p.id}>{p.name} · {p.status} · {p.diagnosis}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="border border-teal-200 bg-teal-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-teal-900">Register New Patient</h3>
                <button type="button" onClick={() => setShowAddPatient(false)} className="text-teal-600 hover:text-teal-800 text-xl">×</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Patient name" value={newPtName} onChange={e => setNewPtName(e.target.value)} className="input text-sm" required />
                <input type="number" placeholder="Age" value={newPtAge} onChange={e => setNewPtAge(e.target.value)} className="input text-sm" required />
                <select value={newPtGender} onChange={e => setNewPtGender(e.target.value as 'M' | 'F' | 'Other')} className="input text-sm">
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="Other">Other</option>
                </select>
                <input type="tel" placeholder="Phone (optional)" value={newPtPhone} onChange={e => setNewPtPhone(e.target.value)} className="input text-sm" />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={handleQuickAddPatient} className="btn-primary btn-sm flex-1">Register</button>
                <button type="button" onClick={() => setShowAddPatient(false)} className="btn-secondary btn-sm flex-1">Cancel</button>
              </div>
            </div>
          )}

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

          {/* Drug rows - using unified RxSection */}
          <div>
            <label className="label mb-2">Medications *</label>
            <RxSection
              rxRows={rxRows}
              onUpdateRxForm={updateRxForm}
              onUpdateRx={updateRx}
              onUpdateRxMulti={updateRxMulti}
              onRemoveRx={removeRx}
              onAddRx={addRxRow}
              showAddButton={true}
              compact={true}
            />
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
