import { useState, useMemo } from 'react';
import { FileText, Pill, ChevronDown, ChevronUp, CheckCircle2, Lock, Eye, Pencil, X, Printer } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { cn, formatDate } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { RxSection, type RxRow } from '@/components/prescription/RxSection';
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge';
import { PrintPreview } from '@/components/PrintPreview';
import { usePadStore } from '@/store/usePadStore';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  discontinued: 'bg-red-100 text-red-700',
  completed: 'bg-slate-100 text-slate-600',
};

const BLANK_RX_ROW = (): RxRow => ({ id: String(Date.now()), form: 'Tab', drug: '', dose: '', strength: '', puffs: '', doseML: '', route: 'Oral', frequency: 'OD', duration: '5 days', instructions: '' });

export default function PrescriptionsPage() {
  const { patients, prescriptions, addPrescription, vitals, visits } = useAppStore();
  const { user, isDemo } = useAuthStore();
  const { settings: pad, clinics } = usePadStore();
  const [expandedRx, setExpandedRx] = useState<string | null>(null);
  const [printRx, setPrintRx] = useState<any | null>(null);

  // Rx form state - keyed by patient ID
  const [selectedPatientForRx, setSelectedPatientForRx] = useState<string | null>(null);
  const [rxRows, setRxRows] = useState<RxRow[]>([BLANK_RX_ROW()]);
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // My Patients - filter doctor's assigned patients
  const myPatients = patients.filter(p => p.attendingDoctorId === user?.id);
  const critical = myPatients.filter(p => p.priority === 'Critical');

  // All prescriptions for history view
  const allPrescriptions = useMemo(() => {
    const rows: any[] = [];
    patients.forEach(p => {
      const rxList = prescriptions[p.id] || [];
      rxList.forEach(rx => rows.push({ ...rx, patient: p }));
    });
    return rows;
  }, [patients, prescriptions]);

  function updateRxForm(id: string, form: RxRow['form']) {
    const FORM_ROUTES: Record<RxRow['form'], string> = { Tab: 'Oral', Cap: 'Oral', Syr: 'Oral', MDI: 'Inhaled', Drops: 'Topical', Cream: 'Topical', Inj: 'IM', Sachet: 'Oral' };
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

  function openRxForm(patientId: string) {
    setSelectedPatientForRx(patientId);
    setRxRows([BLANK_RX_ROW()]);
    setDiagnosis('');
    setNotes('');
  }

  function closeRxForm() {
    setSelectedPatientForRx(null);
    setRxRows([BLANK_RX_ROW()]);
    setDiagnosis('');
    setNotes('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isDemo) {
      alert('Writing prescriptions is not available in demo mode');
      return;
    }
    const activeDrugs = rxRows.filter(r => r.drug.trim());
    if (!selectedPatientForRx || activeDrugs.length === 0) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    activeDrugs.forEach(d => {
      addPrescription({
        id: `rx-${Date.now()}-${Math.random()}`,
        patientId: selectedPatientForRx,
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
    closeRxForm();
  }

  const activePt = selectedPatientForRx ? patients.find(p => p.id === selectedPatientForRx) : null;


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
      </div>


      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Left Column: My Patients (matches Dashboard) */}
        <div className="xl:col-span-2 card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900">My Patients</h3>
              <p className="text-xs text-slate-500">{myPatients.length} total · {critical.length} critical</p>
            </div>
            <Link to="/app/patients" className="btn-secondary btn-sm">View all</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {myPatients.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-slate-400 text-sm mb-3">No patients assigned yet</p>
              </div>
            ) : (
              myPatients.slice(0, 8).map(p => {
                const latest = vitals[p.id]?.[0];
                const hasConsultations = visits[p.id]?.length > 0;
                return (
                  <div key={p.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors group">
                    <Link to={`/app/patients/${p.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-700 font-bold text-sm flex-shrink-0">
                        {p.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 text-sm">{p.name}</span>
                          <span className="text-xs text-slate-400">{p.age}y {p.gender}</span>
                        </div>
                        <div className="text-xs text-slate-500 truncate">{p.diagnosis || 'No diagnosis'}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {latest && (
                          <span className="text-xs text-slate-500 hidden md:inline">
                            BP {latest.bp} · SpO2 {latest.spo2}%
                          </span>
                        )}
                        <StatusBadge status={p.status} />
                        <PriorityBadge priority={p.priority} />
                      </div>
                    </Link>
                    {/* Action button: View for consulted, Rx for new */}
                    {hasConsultations ? (
                      <Link to={`/app/patients/${p.id}`}
                        className="btn-secondary btn-sm text-teal-600 border-teal-200 hover:bg-teal-50 flex-shrink-0">
                        <Eye className="w-3 h-3" /> View
                      </Link>
                    ) : (
                      <button onClick={() => openRxForm(p.id)}
                        className="btn-secondary btn-sm text-teal-600 border-teal-200 hover:bg-teal-50 flex-shrink-0">
                        <Pencil className="w-3 h-3" /> Rx
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Prescription Form (when Rx button clicked) or History */}
        <div className="space-y-5">
          {selectedPatientForRx ? (
            /* Rx Form Panel */
            <div className="card">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-teal-600" />
                  Write Prescription
                </h3>
                <button onClick={closeRxForm} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {activePt && (
                  <div className="flex items-center gap-3 bg-teal-50 rounded-xl px-3 py-2.5 text-sm">
                    <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-700 font-bold text-xs flex-shrink-0">
                      {activePt.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-teal-900">{activePt.name}</div>
                      <div className="text-teal-600 text-xs">{activePt.age}y · {activePt.gender} · {activePt.mrn}</div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="label text-sm">Diagnosis / Indication</label>
                  <input value={diagnosis} onChange={e => setDiagnosis(e.target.value)}
                    placeholder="e.g. Hypertension, Type 2 DM" className="input text-sm" />
                </div>

                <div>
                  <label className="label text-sm mb-2">Medications *</label>
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
                  <label className="label text-sm">Notes</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)}
                    rows={2} placeholder="Special instructions, allergies…" className="input text-sm resize-none" />
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={closeRxForm} className="btn-secondary flex-1 btn-sm">Cancel</button>
                  <button type="submit" disabled={saving || isDemo} className="btn-primary flex-1 btn-sm">
                    {saving ? 'Saving…' : <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Save
                    </>}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Prescription History */
            <>
              <div className="card">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Pill className="w-4 h-4 text-teal-600" />
                    Recent Prescriptions
                  </h3>
                </div>
                <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                  {allPrescriptions.length === 0 ? (
                    <div className="px-5 py-6 text-center">
                      <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-400 text-xs">No prescriptions yet</p>
                    </div>
                  ) : (
                    allPrescriptions.slice(0, 5).map(rx => (
                      <div key={rx.id} className="px-5 py-3 hover:bg-slate-50 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-slate-900 text-sm">{rx.drug}</span>
                              <span className={cn('badge text-[10px] px-1.5 py-0.5 rounded', STATUS_COLORS[rx.status ?? 'active'])}>{rx.status}</span>
                            </div>
                            <div className="text-xs text-slate-500 mt-1">{rx.patient.name}</div>
                            <div className="text-xs text-slate-400">{rx.dose} · {rx.frequency} · {rx.duration}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Full Prescription History (when not showing Rx form) */}
      {!selectedPatientForRx && (
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900">All Prescriptions</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {allPrescriptions.length === 0 && (
              <div className="px-5 py-12 text-center">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <div className="text-slate-500 font-medium">No prescriptions found</div>
              </div>
            )}
            {allPrescriptions.map(rx => {
              const isExpanded = expandedRx === rx.id;
              return (
                <div key={rx.id} className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => setExpandedRx(isExpanded ? null : rx.id)}>
                  <div className="flex items-center gap-3 justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900">{rx.drug}</span>
                        <span className="text-slate-500 text-sm">{rx.dose} · {rx.route}</span>
                        <span className={cn('badge text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[rx.status ?? 'active'])}>{rx.status}</span>
                      </div>
                      <div className="text-sm text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                        <span>{rx.patient.name}</span>
                        <span className="text-slate-400">·</span>
                        <span>{rx.frequency}</span>
                        <span className="text-slate-400">·</span>
                        <span>{rx.duration}</span>
                        {rx.time && <span className="text-slate-400">{formatDate(rx.time)}</span>}
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                  </div>
                  {isExpanded && (
                    <div className="border-t border-slate-100 mt-3 pt-3 space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div><span className="text-slate-400 text-xs uppercase tracking-wide">Patient</span><div className="font-medium text-sm">{rx.patient.name}, {rx.patient.age}y</div></div>
                        <div><span className="text-slate-400 text-xs uppercase tracking-wide">Prescribed By</span><div className="font-medium text-sm">{rx.prescribedBy}</div></div>
                        <div><span className="text-slate-400 text-xs uppercase tracking-wide">Instructions</span><div className="font-medium text-sm">{rx.instructions || '—'}</div></div>
                        <div><span className="text-slate-400 text-xs uppercase tracking-wide">Date</span><div className="font-medium text-sm">{rx.time ? formatDate(rx.time) : '—'}</div></div>
                      </div>
                      {!isDemo && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPrintRx(rx);
                          }}
                          className="btn-primary btn-sm w-full text-white flex items-center justify-center gap-2">
                          <Printer className="w-3.5 h-3.5" /> Print Prescription
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Customised PAD print preview for a single prescription */}
      {printRx && (
        <PrintPreview
          patient={printRx.patient}
          draft={{
            chiefComplaint: '',
            hopi: '',
            diagnosis: printRx.instructions || '',
            icdCode: '',
            secondaryDx: '',
            rxRows: [{
              id: '0',
              form: 'Tab',
              drug: printRx.drug ?? '',
              dose: printRx.dose ?? '',
              strength: '',
              puffs: '',
              route: printRx.route ?? 'Oral',
              frequency: printRx.frequency ?? '',
              duration: printRx.duration ?? '',
              instructions: printRx.instructions ?? '',
            }],
            vitals: { bp: '', hr: '', temp: '', spo2: '', weight: '', height: '', rr: '' },
            investigation: '',
            advice: '',
            followUp: '',
            referredTo: '',
          }}
          pad={pad}
          clinicName={clinics[0]?.name}
          clinicAddress={clinics[0]?.address}
          clinicPhone={clinics[0]?.phone}
          onClose={() => setPrintRx(null)}
        />
      )}
    </div>
  );
}
