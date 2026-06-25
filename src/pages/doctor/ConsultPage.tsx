import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronDown, ChevronUp, CheckCircle2, Printer, Send, Save,
  Plus, ArrowLeft, FileText, Loader2,
  Activity, Pill, FlaskConical, ClipboardList, MessageCircle, X,
  BedDouble, Share2, Syringe, Scissors, Upload, Camera, Calculator, Pencil
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { usePadStore } from '@/store/usePadStore';
import { BodyDiagram } from '@/components/BodyDiagram';
import { ClinicalCalculators } from '@/components/ClinicalCalculators';
import { PrintPreview } from '@/components/PrintPreview';
import { RxSection, type RxRow, type RxForm } from '@/components/prescription/RxSection';
import { FavDrugsPanel } from '@/components/prescription/FavDrugsPanel';
import { ReadyMixPanel } from '@/components/prescription/ReadyMixPanel';
import { SpecialtyExamSection, detectSpecialty, specialtyLabel, ALL_SPECIALTY_MODULES, MODULE_META, SPECIALTY_COLORS } from '@/components/prescription/SpecialtyExamSection';
import type { SpecialtyKey } from '@/components/prescription/SpecialtyExamSection';
import { cn, formatDateTime } from '@/lib/utils';
import { api, isApiEnabled } from '@/lib/api';
import type { VaccineEntry, ProcedureEntry, AttachmentEntry, VisitRecord, LabOrder, Vitals } from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ConsultDraft {
  chiefComplaint: string;
  hopi: string;
  pastMedical: string;
  pastSurgical: string;
  familyHistory: string;
  socialHistory: string;
  allergiesNote: string;
  currentMeds: string;
  generalExam: string;
  systemicExam: string;
  investigation: string;
  diagnosis: string;
  icdCode: string;
  secondaryDx: string;
  rxRows: RxRow[];
  bodyNotes: Record<string, string>;
  bodySigns: string[];
  advice: string;
  followUp: string;
  referredTo: string;
  privateNote: string;
  vitals: { bp: string; hr: string; temp: string; spo2: string; weight: string; height: string; rr: string; };
  comorbidities: string[];
  specialtyExam: Record<string, string>;
}

const COMORBIDITY_OPTIONS = ['Diabetes (DM)', 'Hypertension (HTN)', 'Thyroid disorder', 'Asthma / COPD', 'Cardiac disease', 'CKD', 'Cancer', 'Epilepsy', 'Tuberculosis', 'Hepatitis B/C', 'HIV'];

const BLANK_RX_ROW = (): RxRow => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, form: 'Tab', drug: '', dose: '', strength: '', puffs: '', doseML: '', route: 'Oral', frequency: 'OD', duration: '5 days', instructions: '' });

const BLANK_DRAFT: ConsultDraft = {
  chiefComplaint: '', hopi: '', pastMedical: '', pastSurgical: '',
  familyHistory: '', socialHistory: '', allergiesNote: '', currentMeds: '',
  generalExam: '', systemicExam: '', investigation: '',
  diagnosis: '', icdCode: '', secondaryDx: '',
  rxRows: [{ id: '1', form: 'Tab', drug: '', dose: '', strength: '', puffs: '', doseML: '', route: 'Oral', frequency: 'OD', duration: '5 days', instructions: '' }],
  advice: '', followUp: '1 week', referredTo: '', privateNote: '',
  vitals: { bp: '', hr: '', temp: '', spo2: '', weight: '', height: '', rr: '' },
  comorbidities: [],
  bodyNotes: {},
  bodySigns: [],
  specialtyExam: {},
};

const FORM_ROUTES: Record<RxForm, string> = { Tab: 'Oral', Cap: 'Oral', Syr: 'Oral', MDI: 'Inhaled', Drops: 'Topical', Cream: 'Topical', Inj: 'IM', Sachet: 'Oral' };
const FOLLOW_UPS = ['2 days', '3 days', '1 week', '2 weeks', '1 month', '3 months', 'As needed', 'No follow-up'];

// ─── Previous Visits panel ────────────────────────────────────────────────────

function PreviousVisitsPanel({ visits, labs }: { patientId: string; visits: VisitRecord[]; labs: LabOrder[] }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const past = visits.filter(v => !v.date.startsWith(today));
  if (past.length === 0) return null;

  return (
    <div className="card overflow-hidden border-l-4 border-l-indigo-400">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors">
        <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
          <ClipboardList className="w-3.5 h-3.5" />
        </div>
        <span className="font-semibold text-slate-800 text-sm flex-1 text-left">
          Previous Visits
          <span className="ml-2 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-full px-2 py-0.5">{past.length}</span>
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-slate-100">
          {past.slice(0, 6).map(v => {
            const isExp = expanded === v.id;
            const dateLabel = new Date(v.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
            return (
              <div key={v.id} className="rounded-xl border border-slate-200 overflow-hidden mt-2">
                <button type="button" onClick={() => setExpanded(isExp ? null : v.id)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 rounded px-1.5 py-0.5">{dateLabel}</span>
                      {v.diagnosis && <span className="text-xs font-medium text-slate-700 truncate">{v.diagnosis}</span>}
                    </div>
                    {v.chiefComplaint && <p className="text-xs text-slate-500 mt-0.5 truncate">{v.chiefComplaint}</p>}
                  </div>
                  {isExp ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />}
                </button>
                {isExp && (() => {
                  const visitDate = v.date.slice(0, 10);
                  const visitLabs = labs.filter(l => (l.orderedAt || '').slice(0, 10) === visitDate);
                  return (
                    <div className="px-4 pb-3 border-t border-slate-100 text-xs space-y-1.5 text-slate-600">
                      {v.vitalsSnapshot && Object.values(v.vitalsSnapshot).some(Boolean) && (
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-slate-500 bg-slate-50 rounded px-2 py-1.5">
                          {v.vitalsSnapshot.bp && <span>BP: <b>{v.vitalsSnapshot.bp}</b></span>}
                          {v.vitalsSnapshot.hr && <span>Pulse: <b>{v.vitalsSnapshot.hr}</b></span>}
                          {v.vitalsSnapshot.temp && <span>Temp: <b>{v.vitalsSnapshot.temp}°C</b></span>}
                          {v.vitalsSnapshot.spo2 && <span>SpO₂: <b>{v.vitalsSnapshot.spo2}%</b></span>}
                          {v.vitalsSnapshot.weight && <span>Wt: <b>{v.vitalsSnapshot.weight}kg</b></span>}
                        </div>
                      )}
                      {v.hopi && <p><span className="font-medium text-slate-500">History: </span>{v.hopi}</p>}
                      {v.investigation && <p><span className="font-medium text-slate-500">Investigations: </span>{v.investigation}</p>}
                      {visitLabs.length > 0 && (
                        <div>
                          <span className="font-medium text-slate-500 block mb-1">Lab Results: </span>
                          <div className="flex flex-wrap gap-1.5">
                            {visitLabs.map(l => (
                              <span key={l.id} className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                                l.critical ? 'bg-red-50 border-red-200 text-red-700' : l.result ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500')}>
                                {l.testName}{l.result ? `: ${l.result}${l.unit ? ' ' + l.unit : ''}` : ' (pending)'}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {v.advice && <p><span className="font-medium text-slate-500">Advice: </span>{v.advice}</p>}
                      {v.followUp && <p><span className="font-medium text-slate-500">Follow-up: </span>{v.followUp}</p>}
                    </div>
                  );
                })()}
              </div>
            );
          })}
          {past.length > 6 && (
            <p className="text-xs text-slate-400 text-center pt-1">Showing last 6 of {past.length} visits</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ id, title, icon: Icon, filled, children }: {
  id: string; title: string; icon: typeof Activity; filled: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="card overflow-hidden" id={id}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors">
        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
          filled ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-400')}>
          {filled ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
        </div>
        <span className="font-semibold text-slate-800 text-sm flex-1 text-left">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && <div className="px-5 pb-5 border-t border-slate-100">{children}</div>}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ConsultPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { patients, appointments, queue, prescriptions, labOrders, vitals, visits, addPrescription, addVitals, upsertPatient, addVisit, updateVisit, updateAppointment, showToast, setVitals } = useAppStore();
  const { user } = useAuthStore();
  const { settings: pad, clinics, recordPrescriptionUsage } = usePadStore();
  const [selectedClinicId, setSelectedClinicId] = useState<string>(clinics[0]?.id ?? '');
  const activeClinic = clinics.find(c => c.id === selectedClinicId) ?? clinics[0];

  // Nurses cannot open the consultation (vitals-only) — bounce deep-links out.
  useEffect(() => {
    if (user?.role === 'nurse') navigate('/app/patients', { replace: true });
  }, [user?.role, navigate]);

  // Load the nurse-recorded vitals so the IPD round trend chart has data.
  useEffect(() => {
    if (!patientId || !isApiEnabled()) return;
    api.get<Vitals[]>(`/vitals/patient/${patientId}`).then(rows => { if (rows.length) setVitals(patientId, rows); }).catch(() => {});
  }, [patientId]);

  const patient = patients.find(p => p.id === patientId);

  // For booking-derived (apt-) or walk-in (WI) patients, the patient record may not exist yet.
  // Recreate from the queue/appointment so the doctor never sees "Patient not found".
  useEffect(() => {
    if (patient || !patientId) return;

    // Walk-in: look up the queue entry or appointment
    if (patientId.startsWith('WI')) {
      const qEntry = queue.find(q => q.patientId === patientId);
      const apt = appointments.find(a => a.patientId === patientId);
      const name = qEntry?.patientName ?? apt?.patientName ?? 'Walk-in Patient';
      upsertPatient({
        id: patientId,
        name,
        age: (apt as any)?.patientAge ?? 0,
        gender: ((apt as any)?.patientGender as 'M' | 'F' | 'Other') ?? 'M',
        mrn: `MRN-OPD-${patientId.slice(2)}`,
        phone: '',
        status: 'OPD',
        priority: 'Stable',
        clinicId: apt?.clinicId ?? '',
        attendingDoctor: user?.name,
        attendingDoctorId: typeof user?.id === 'number' ? user.id : undefined,
        diagnosis: qEntry?.reason ?? apt?.reason ?? '',
        allergies: [],
      });
      return;
    }

    // Online booking patient (BR- prefix) — created from booking request
    if (patientId.startsWith('BR-')) {
      const bookingApt = appointments.find(a => a.id === patientId);
      if (bookingApt) {
        upsertPatient({
          id: patientId,
          name: bookingApt.patientName,
          age: bookingApt.patientAge ?? 0,
          gender: (bookingApt.patientGender as 'M' | 'F' | 'Other') ?? 'M',
          mrn: `BK-${patientId.slice(3)}`,
          phone: bookingApt.patientPhone ?? '',
          status: 'OPD',
          priority: 'Stable',
          clinicId: bookingApt.clinicId ?? '',
          attendingDoctor: bookingApt.doctorName ?? user?.name,
          attendingDoctorId: typeof user?.id === 'number' ? user.id : undefined,
          diagnosis: bookingApt.reason ?? '',
          allergies: [],
        });
      }
      return;
    }

    // Booking-derived patient (apt- prefix)
    const aptId = patientId.startsWith('apt-') ? patientId.slice(4) : null;
    if (!aptId) return;
    const apt = appointments.find(a => a.id === aptId);
    if (apt) {
      upsertPatient({
        id: patientId,
        name: apt.patientName,
        age: apt.patientAge ?? 0,
        gender: 'M',
        mrn: `MRN-BOOK-${aptId}`,
        phone: '',
        status: 'OPD',
        priority: 'Stable',
        clinicId: apt.clinicId ?? '',
        attendingDoctor: apt.doctorName ?? user?.name,
        attendingDoctorId: typeof apt.doctorId === 'number' ? apt.doctorId : undefined,
        diagnosis: apt.reason ?? '',
        allergies: [],
      });
    }
  }, [patientId, patient, appointments]);
  const prevRx = prescriptions[patientId ?? ''] ?? [];
  const prevLabs = labOrders[patientId ?? ''] ?? [];
  const prevVitals = (vitals[patientId ?? ''] ?? []).slice(-1)[0];

  const [draft, setDraft] = useState<ConsultDraft>({ ...BLANK_DRAFT });
  const [editingPatient, setEditingPatient] = useState(false);
  const [patientEdit, setPatientEdit] = useState({ name: '', age: '', gender: 'M' as 'M' | 'F' | 'Other' });
  const [saving, setSaving] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [printFromSave, setPrintFromSave] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const [showAdmit, setShowAdmit] = useState(false);
  const [showRefer, setShowRefer] = useState(false);
  const [admitTab, setAdmitTab] = useState<'admit'|'refer'>('admit');
  const [admitForm, setAdmitForm] = useState({ type: 'Medical' as 'Medical'|'Surgical'|'Day Care'|'Emergency', ward: '', bed: '', duration: '', instructions: '' });
  const [referForm, setReferForm] = useState({ specialty: '', doctorName: '', reason: '', urgency: 'Routine' as 'Routine'|'Urgent'|'Emergency', notes: '' });
  const [referHigher, setReferHigher] = useState({ hospital: '', dept: '', doctor: '', reason: '', urgency: 'Routine' as 'Routine'|'Urgent'|'Emergency' });
  const [vaccines, setVaccines] = useState<VaccineEntry[]>([]);
  const [procedures, setProcedures] = useState<ProcedureEntry[]>([]);
  const [attachments, setAttachments] = useState<AttachmentEntry[]>([]);
  const [customVaxName, setCustomVaxName] = useState('');
  const [customProcName, setCustomProcName] = useState('');
  const [vaxDropOpen, setVaxDropOpen] = useState(false);
  const [vaxSearch, setVaxSearch] = useState('');
  const [procDropOpen, setProcDropOpen] = useState(false);
  const [procSearch, setProcSearch] = useState('');
  const [editVisitId, setEditVisitId] = useState<string | null>(null);
  const autoSaveTimer = useRef<number>(0);

  // Pre-fill from patient data
  useEffect(() => {
    if (patient) {
      setDraft(d => ({
        ...d,
        allergiesNote: patient.allergies?.join(', ') ?? '',
        diagnosis: patient.diagnosis ?? '',
        vitals: prevVitals ? {
          bp: prevVitals.bp ?? '', hr: String(prevVitals.pulse ?? ''),
          temp: String(prevVitals.temp ?? ''), spo2: String(prevVitals.spo2 ?? ''),
          weight: String(prevVitals.weight ?? ''), height: String(prevVitals.height ?? ''),
          rr: String(prevVitals.rr ?? ''),
        } : d.vitals,
      }));
    }
  }, [patientId]);

  // Detect and load today's existing visit (edit mode)
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayVisit = (visits[patientId ?? ''] ?? []).find(v => v.date.startsWith(today));
    if (!todayVisit) { setEditVisitId(null); return; }
    const p = useAppStore.getState().patients.find(p => p.id === patientId);
    const isIPDPatient = p?.status === 'IPD' || p?.status === 'Critical';
    if (!isIPDPatient) {
      setEditVisitId(todayVisit.id);
    } else {
      setEditVisitId(null);
    }
    setDraft(d => ({
      ...d,
      chiefComplaint: todayVisit.chiefComplaint,
      hopi: todayVisit.hopi ?? '',
      pastMedical: todayVisit.pastMedical ?? '',
      pastSurgical: todayVisit.pastSurgical ?? '',
      familyHistory: todayVisit.familyHistory ?? '',
      socialHistory: todayVisit.socialHistory ?? '',
      allergiesNote: todayVisit.allergiesNote ?? d.allergiesNote,
      currentMeds: todayVisit.currentMeds ?? '',
      generalExam: todayVisit.generalExam ?? '',
      systemicExam: todayVisit.systemicExam ?? '',
      bodyNotes: todayVisit.bodyNotes ?? {},
      bodySigns: todayVisit.bodySigns ?? [],
      investigation: todayVisit.investigation ?? '',
      diagnosis: todayVisit.diagnosis,
      icdCode: todayVisit.icdCode ?? '',
      secondaryDx: todayVisit.secondaryDx ?? '',
      rxRows: todayVisit.drugs.length > 0
        ? todayVisit.drugs.map((rx, i) => ({
            id: String(Date.now() + i),
            form: (rx.form as RxForm) ?? 'Tab',
            drug: rx.drug, dose: rx.dose,
            strength: rx.strength ?? '', puffs: rx.puffs ?? '', doseML: '',
            route: rx.route, frequency: rx.frequency, duration: rx.duration,
            instructions: rx.instructions ?? '',
          }))
        : d.rxRows,
      advice: todayVisit.advice,
      followUp: todayVisit.followUp,
      privateNote: todayVisit.privateNote ?? '',
      comorbidities: todayVisit.comorbidities ?? [],
      specialtyExam: todayVisit.specialtyExam ?? {},
      vitals: todayVisit.vitalsSnapshot ? {
        bp: todayVisit.vitalsSnapshot.bp ?? '',
        hr: todayVisit.vitalsSnapshot.hr ?? '',
        temp: todayVisit.vitalsSnapshot.temp ?? '',
        spo2: todayVisit.vitalsSnapshot.spo2 ?? '',
        weight: todayVisit.vitalsSnapshot.weight ?? '',
        height: todayVisit.vitalsSnapshot.height ?? '',
        rr: todayVisit.vitalsSnapshot.rr ?? '',
      } : d.vitals,
    }));
    if (todayVisit.referral) {
      setReferForm({
        specialty: todayVisit.referral.specialty,
        doctorName: todayVisit.referral.doctorName,
        reason: todayVisit.referral.reason,
        urgency: todayVisit.referral.urgency as 'Routine' | 'Urgent' | 'Emergency',
        notes: '',
      });
    }
    if (todayVisit.vaccines?.length) setVaccines(todayVisit.vaccines);
    if (todayVisit.procedures?.length) setProcedures(todayVisit.procedures);
  }, [patientId]);

  const set = useCallback(<K extends keyof ConsultDraft>(key: K, val: ConsultDraft[K]) => {
    setDraft(d => ({ ...d, [key]: val }));
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = window.setTimeout(() => {
      setAutoSaved(true);
      setTimeout(() => setAutoSaved(false), 2000);
    }, 1500);
  }, []);

  const setV = useCallback((key: keyof ConsultDraft['vitals'], val: string) => {
    setDraft(d => ({ ...d, vitals: { ...d.vitals, [key]: val } }));
  }, []);

  // Keyboard shortcuts: Shift+A = add drug row, Shift+S = save/finalise, Shift+P = print
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.shiftKey) return;
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
      if (e.key === 'A') { e.preventDefault(); addRxRow(); }
      if (e.key === 'S') { e.preventDefault(); handleFinalize(); }
      if (e.key === 'P') { e.preventDefault(); setShowPrint(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [draft]);

  function addRxRow() {
    set('rxRows', [...draft.rxRows, BLANK_RX_ROW()]);
  }

  function updateRxForm(id: string, form: RxForm) {
    // Strip any stale form prefix from drug name when switching form type
    const FORM_PREFIXES = /^(tab\.?|cap\.?|syr\.?|syrup|mdi\.?|drops?\.?|cream\.?|inj\.?|injection\.?|sachet\.?)\s+/i;
    set('rxRows', draft.rxRows.map(r => {
      if (r.id !== id) return r;
      return { ...r, form, route: FORM_ROUTES[form], drug: r.drug.replace(FORM_PREFIXES, '') };
    }));
  }

  function updateRx(id: string, field: keyof RxRow, val: string) {
    set('rxRows', draft.rxRows.map(r => r.id === id ? { ...r, [field]: val } : r));
  }

  function removeRx(id: string) {
    set('rxRows', draft.rxRows.filter(r => r.id !== id));
  }

  function updateRxMulti(id: string, fields: Partial<RxRow>) {
    set('rxRows', draft.rxRows.map(r => r.id === id ? { ...r, ...fields } : r));
  }

  function sendWhatsApp() {
    if (!patient) return;
    const { settings: p } = usePadStore.getState();
    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const doc = p.doctorName || user?.name || 'Doctor';
    const drugs = draft.rxRows.filter(r => r.drug.trim());

    let msg = `*${doc}*\n`;
    if (p.clinicName) msg += `${p.clinicName}\n`;
    if (p.phone) msg += `📞 ${p.phone}\n`;
    msg += `\n*Patient:* ${patient.name}, ${patientAge}Y/${patient.gender}\n`;
    msg += `*Date:* ${today}\n`;
    if (draft.diagnosis) msg += `*Diagnosis:* ${draft.diagnosis}\n`;
    if (drugs.length) {
      msg += `\n*℞ Prescription:*\n`;
      drugs.forEach((r, i) => {
        msg += `${i + 1}. ${r.drug} ${r.dose} — ${r.route}, ${r.frequency}, ${r.duration}`;
        if (r.instructions) msg += ` (${r.instructions})`;
        msg += '\n';
      });
    }
    if (draft.advice) msg += `\n*Advice:* ${draft.advice}\n`;
    if (draft.followUp && draft.followUp !== 'No follow-up') msg += `*Follow-up:* After ${draft.followUp}\n`;
    msg += `\n_Sent via Vyasa Health OS_`;

    const phone = patient.phone?.replace(/\D/g, '') ?? '';
    const url = `https://wa.me/${phone ? `91${phone}` : ''}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  }

  async function handleFinalize() {
    if (!patient || !draft.diagnosis.trim()) {
      showToast('Please enter at least a diagnosis before finalising', 'error');
      return;
    }
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));

    // Save vitals
    if (Object.values(draft.vitals).some(Boolean)) {
      addVitals({
        id: `v-${Date.now()}`, patientId: patient.id,
        time: new Date().toISOString(), recordedBy: user?.name ?? 'Doctor',
        bp: draft.vitals.bp, pulse: Number(draft.vitals.hr) || undefined,
        temp: Number(draft.vitals.temp) || undefined, spo2: Number(draft.vitals.spo2) || undefined,
        rr: Number(draft.vitals.rr) || undefined, weight: Number(draft.vitals.weight) || undefined,
        height: Number(draft.vitals.height) || undefined,
      });
    }

    // Save prescriptions
    const activeDrugs = draft.rxRows.filter(r => r.drug.trim());
    activeDrugs.forEach(r => {
      addPrescription({
        id: `rx-${Date.now()}-${Math.random()}`, patientId: patient.id,
        drug: r.drug, dose: r.dose, route: r.route,
        frequency: r.frequency, duration: r.duration,
        instructions: r.instructions,
        prescribedBy: user?.name ?? 'Doctor',
        time: new Date().toISOString(), status: 'active',
      });
    });
    if (activeDrugs.length > 0) {
      recordPrescriptionUsage(activeDrugs.map(r => ({ drug: r.drug, dose: r.dose, route: r.route, frequency: r.frequency, duration: r.duration, instructions: r.instructions })), draft.diagnosis);
    }

    // Save full visit record for longitudinal tracking
    const visitPayload = {
      patientId: patient.id,
      date: new Date().toISOString(),
      doctorName: user?.name ?? 'Doctor',
      doctorId: user?.id,
      chiefComplaint: draft.chiefComplaint,
      hopi: draft.hopi,
      pastMedical: draft.pastMedical,
      pastSurgical: draft.pastSurgical,
      familyHistory: draft.familyHistory,
      socialHistory: draft.socialHistory,
      allergiesNote: draft.allergiesNote,
      currentMeds: draft.currentMeds,
      vitalsSnapshot: draft.vitals,
      comorbidities: draft.comorbidities.length ? draft.comorbidities : undefined,
      generalExam: draft.generalExam,
      systemicExam: draft.systemicExam,
      bodyNotes: Object.keys(draft.bodyNotes).length ? draft.bodyNotes : undefined,
      bodySigns: draft.bodySigns.length ? draft.bodySigns : undefined,
      investigation: draft.investigation,
      diagnosis: draft.diagnosis,
      icdCode: draft.icdCode,
      secondaryDx: draft.secondaryDx,
      drugs: draft.rxRows.filter(r => r.drug.trim()).map(r => ({ form: r.form, drug: r.drug, dose: r.dose, strength: r.strength, puffs: r.puffs, route: r.route, frequency: r.frequency, duration: r.duration, instructions: r.instructions })),
      vaccines,
      procedures,
      attachments,
      advice: draft.advice,
      followUp: draft.followUp,
      referral: referForm.specialty || referForm.reason ? referForm : undefined,
      privateNote: draft.privateNote,
      specialtyExam: Object.keys(draft.specialtyExam).length ? draft.specialtyExam : undefined,
    };

    if (editVisitId) {
      updateVisit(editVisitId, visitPayload);
    } else {
      addVisit({ id: `visit-${Date.now()}`, ...visitPayload });
    }

    showToast(editVisitId ? 'Consultation updated' : 'Consultation saved', 'success');
    setSaving(false);
    
    const p = useAppStore.getState().patients.find(pt => pt.id === patientId);
    const isIPDPatient = p?.status === 'IPD' || p?.status === 'Critical';
    
    if (!isIPDPatient) {
      // Show the customised PAD print preview (NOT the raw page print)
      setPrintFromSave(true);
      setShowPrint(true);
    } else {
      // For IPD patients, return to the patients list directly
      navigate('/app/patients');
    }
  }

  function handleAdmit() {
    if (!patient) return;
    upsertPatient({
      ...patient,
      status: 'IPD',
      ward: admitForm.ward || 'General Ward',
      bed: admitForm.bed || undefined,
      admitDate: new Date().toISOString().slice(0, 10),
      diagnosis: draft.diagnosis || patient.diagnosis,
    });
    showToast(`${patient.name} admitted to ${admitForm.ward || 'General Ward'}`, 'success');
    setShowAdmit(false);
    handleFinalize();
  }

  function handleReferHigher() {
    if (!patient) return;
    upsertPatient({
      ...patient,
      status: 'Referred',
      referredHospital: referHigher.hospital,
      referredDept: referHigher.dept,
      referredDoctor: referHigher.doctor,
      referralReason: referHigher.reason,
      referralUrgency: referHigher.urgency,
      diagnosis: draft.diagnosis || patient.diagnosis,
    });
    showToast(`${patient.name} referred to ${referHigher.hospital || 'higher centre'}`, 'success');
    setShowAdmit(false);
    handleFinalize();
  }

  function printReferral() {
    if (!patient) return;
    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const w = window.open('', '_blank', 'width=700,height=900');
    if (!w) return;
    w.document.write(`<html><head><title>Referral Letter</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 13px; padding: 32px; color: #111; }
      h2 { font-size: 18px; margin-bottom: 4px; }
      .sub { color: #555; font-size: 12px; margin-bottom: 24px; }
      .to { background: #f1f5f9; padding: 12px; border-radius: 6px; margin-bottom: 20px; }
      label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.05em; }
      .val { font-weight: 600; margin-bottom: 12px; }
      .urgency { display:inline-block; padding: 2px 10px; border-radius: 20px; font-size: 12px; font-weight: bold;
        background: ${referForm.urgency === 'Emergency' ? '#fee2e2' : referForm.urgency === 'Urgent' ? '#fef3c7' : '#dcfce7'};
        color: ${referForm.urgency === 'Emergency' ? '#b91c1c' : referForm.urgency === 'Urgent' ? '#b45309' : '#166534'}; }
      .sig { margin-top: 48px; border-top: 1px solid #333; width: 200px; padding-top: 4px; font-size: 12px; }
      @page { margin: 12mm; }
    </style></head><body>
    <h2>Referral Letter</h2>
    <div class="sub">${today}</div>
    <div class="to">
      <label>To</label>
      <div class="val">${referForm.doctorName ? `Dr. ${referForm.doctorName}` : 'Consultant'} ${referForm.specialty ? `(${referForm.specialty})` : ''}</div>
    </div>
    <label>Patient</label>
    <div class="val">${patient.name}, ${patient.age}Y/${patient.gender} · MRN: ${patient.mrn}</div>
    <label>Urgency</label>
    <div class="val"><span class="urgency">${referForm.urgency}</span></div>
    <label>Reason for Referral</label>
    <div class="val">${referForm.reason || draft.diagnosis || '—'}</div>
    <label>Diagnosis</label>
    <div class="val">${draft.diagnosis || '—'}</div>
    ${referForm.notes ? `<label>Clinical Notes</label><div class="val">${referForm.notes}</div>` : ''}
    ${draft.rxRows.some(r=>r.drug.trim()) ? `<label>Current Medications</label><div class="val">${draft.rxRows.filter(r=>r.drug.trim()).map(r=>`${r.drug} ${r.dose} ${r.frequency}`).join(', ')}</div>` : ''}
    <div class="sig">Referring Doctor<br/><small>${user?.name || 'Doctor'}</small></div>
    </body></html>`);
    w.document.close(); w.focus();
    setTimeout(() => { w.print(); }, 300);
  }

  // ─── BMI ───────────────────────────────────────────────────────────────────
  const bmiVal = draft.vitals.height && draft.vitals.weight
    ? parseFloat(draft.vitals.weight) / Math.pow(parseFloat(draft.vitals.height) / 100, 2)
    : null;
  const bmi = bmiVal ? bmiVal.toFixed(1) : null;
  const bmiCategory = bmiVal
    ? bmiVal < 18.5 ? { label: 'Underweight', color: 'text-blue-600' }
    : bmiVal < 25   ? { label: 'Normal', color: 'text-green-600' }
    : bmiVal < 30   ? { label: 'Overweight', color: 'text-amber-600' }
    : bmiVal < 35   ? { label: 'Obese I', color: 'text-orange-600' }
    : { label: 'Obese II+', color: 'text-red-600' }
    : null;

  const isPediatric = typeof patient?.age === 'number' && patient.age < 12;
  const patientWeightKg = parseFloat(draft.vitals.weight) || null;

  // ─── Completeness ──────────────────────────────────────────────────────────
  // Specialists auto-open their own module; GPs / family / general medicine start
  // fully collapsed (nothing open) until the doctor taps a chip.
  const specialtyKey = detectSpecialty(user?.specialty || pad.specialty);
  const defaultModules = () =>
    specialtyKey && specialtyKey !== 'general_medicine'
      ? new Set<SpecialtyKey>([specialtyKey])
      : new Set<SpecialtyKey>();

  const [openModules, setOpenModules] = useState<Set<SpecialtyKey>>(defaultModules);
  // Track whether the doctor has manually toggled any module this session
  const [modulesManuallySet, setModulesManuallySet] = useState(false);

  // If specialty resolves after first render (profile loads from API), sync the
  // default open module — but only if the doctor hasn't touched the toggles.
  useEffect(() => {
    if (!modulesManuallySet) setOpenModules(defaultModules());
  }, [specialtyKey]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleModule(key: SpecialtyKey) {
    setModulesManuallySet(true);
    setOpenModules(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const filled = {
    vitals: Object.values(draft.vitals).some(Boolean),
    complaint: draft.chiefComplaint.trim().length > 0,
    history: draft.hopi.trim().length > 0,
    pastHistory: [draft.pastMedical, draft.familyHistory].some(s => s.trim().length > 0),
    exam: draft.generalExam.trim().length > 0,
    labs: draft.investigation.trim().length > 0,
    diagnosis: draft.diagnosis.trim().length > 0,
    rx: draft.rxRows.some(r => r.drug.trim().length > 0),
    advice: draft.advice.trim().length > 0,
    specialty: Object.values(draft.specialtyExam).some(v => v.trim().length > 0),
  };
  const completePct = Math.round((Object.values(filled).filter(Boolean).length / Object.values(filled).length) * 100);

  if (!patient) {
    // For auto-createable IDs, show a loading spinner while the useEffect creates the patient record
    const isAutoCreate = patientId?.startsWith('BR-') || patientId?.startsWith('WI') || patientId?.startsWith('apt-');
    if (isAutoCreate) {
      return (
        <div className="p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Loading patient...</p>
        </div>
      );
    }
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">Patient not found</p>
        <button onClick={() => navigate('/app/patients')} className="btn-secondary mt-4">← Back to patients</button>
      </div>
    );
  }

  const patientAge = typeof patient.age === 'number' ? patient.age : '';
  const isIPD = patient.status === 'IPD' || patient.status === 'Critical';

  return (
    <div className="flex flex-col h-full">
      {/* ─── Sticky header ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="px-3 py-2.5 flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="btn-ghost p-1.5 rounded-lg flex-shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Patient chip */}
          {editingPatient ? (
            <div className="flex items-center gap-1.5 bg-teal-50 border border-teal-300 rounded-xl px-2.5 py-1.5 min-w-0 flex-1 flex-wrap">
              <input autoFocus value={patientEdit.name}
                onChange={e => setPatientEdit(p => ({ ...p, name: e.target.value }))}
                placeholder="Name" className="text-sm font-semibold text-slate-900 bg-transparent outline-none w-28 min-w-0" />
              <input value={patientEdit.age} type="number" min={0} max={120}
                onChange={e => setPatientEdit(p => ({ ...p, age: e.target.value }))}
                placeholder="Age" className="text-xs text-slate-600 bg-transparent outline-none w-10 min-w-0" />
              <select value={patientEdit.gender}
                onChange={e => setPatientEdit(p => ({ ...p, gender: e.target.value as 'M' | 'F' | 'Other' }))}
                className="text-xs text-slate-600 bg-transparent outline-none">
                <option value="M">M</option>
                <option value="F">F</option>
                <option value="Other">Other</option>
              </select>
              <button onClick={() => {
                if (patientEdit.name.trim()) {
                  upsertPatient({ ...patient, name: patientEdit.name.trim(), age: Number(patientEdit.age) || patient.age, gender: patientEdit.gender });
                }
                setEditingPatient(false);
              }} className="ml-auto text-teal-700 font-semibold text-xs bg-teal-100 rounded-lg px-2 py-0.5 hover:bg-teal-200">Save</button>
              <button onClick={() => setEditingPatient(false)} className="text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 min-w-0 flex-1">
              <div className="w-7 h-7 rounded-lg bg-navy-800 flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background: '#0a1628' }}>
                {patient.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-auto">
                <div className="font-semibold text-slate-900 text-sm truncate leading-tight">{patient.name}</div>
                <div className="text-[11px] text-slate-500 leading-tight truncate">{patientAge}y · {patient.gender} · {patient.mrn}</div>
              </div>
              <button onClick={() => { setPatientEdit({ name: patient.name, age: String(patientAge), gender: (patient.gender as 'M'|'F'|'Other') ?? 'M' }); setEditingPatient(true); }}
                className="ml-auto p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex-shrink-0" title="Edit patient details">
                <Pencil className="w-3 h-3" />
              </button>
              {isIPD ? (
                <div className="flex items-center gap-1 bg-blue-50 rounded-lg px-2 py-0.5 flex-shrink-0">
                  <BedDouble className="w-3 h-3 text-blue-600" />
                  <span className="text-[11px] font-semibold text-blue-800">{patient.ward || 'Ward'}</span>
                </div>
              ) : clinics.length > 0 && (
                <select value={selectedClinicId} onChange={e => setSelectedClinicId(e.target.value)}
                  className="hidden sm:block text-[11px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-1.5 py-0.5 outline-none cursor-pointer min-w-0 flex-shrink max-w-28">
                  {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
            </div>
          )}

          {/* Auto-save indicator */}
          {autoSaved && (
            <span className="text-[11px] text-teal-600 flex items-center gap-1 flex-shrink-0">
              <CheckCircle2 className="w-3 h-3" />
              <span className="hidden sm:inline">Saved</span>
            </span>
          )}

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button onClick={() => setShowCalc(true)} className="btn-secondary btn-sm p-2" title="Clinical Calculators">
              <Calculator className="w-3.5 h-3.5" />
            </button>
            {!isIPD && (
              <button onClick={() => setShowPrint(true)} className="hidden sm:flex btn-secondary btn-sm p-2" title="Print Prescription">
                <Printer className="w-3.5 h-3.5" />
              </button>
            )}
            <button type="button" onClick={handleFinalize} disabled={saving} className="btn-primary btn-sm px-3 py-2">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{saving ? 'Saving…' : editVisitId ? 'Update' : isIPD ? 'Save' : 'Save'}</span>
            </button>
          </div>
        </div>

        {/* Mobile clinic selector (header chip hides it below sm) */}
        {!isIPD && clinics.length > 1 && (
          <div className="sm:hidden px-3 pb-2 flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-medium flex-shrink-0">Clinic</span>
            <select value={selectedClinicId} onChange={e => setSelectedClinicId(e.target.value)}
              className="flex-1 min-w-0 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-2 py-1 outline-none">
              {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}

        {/* Progress bar */}
        <div className="px-4 pb-2 flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full bg-teal-500 transition-all duration-500" style={{ width: `${completePct}%` }} />
          </div>
          <span className="text-xs text-slate-500 flex-shrink-0">{completePct}%</span>
        </div>
      </div>

      {/* ─── Body ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-32 sm:pb-20">

        {/* Edit-mode banner */}
        {editVisitId && (
          <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-sm text-amber-800">
            <CheckCircle2 className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span><strong>Editing today's consultation</strong> — changes will update the existing record, not create a new one.</span>
          </div>
        )}

        {/* 0. Previous Visits */}
        <PreviousVisitsPanel patientId={patientId ?? ''} visits={visits[patientId ?? ''] ?? []} labs={labOrders[patientId ?? ''] ?? []} />

        {/* 1. Vitals */}
        <Section id="s-vitals" title="Vitals" icon={Activity} filled={filled.vitals}>
          <div className="pt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            {([
              { key: 'bp',     label: 'BP',      placeholder: '120/80', unit: 'mmHg' },
              { key: 'hr',     label: 'Pulse',   placeholder: '72',     unit: '/min' },
              { key: 'temp',   label: 'Temp',    placeholder: '37.0',   unit: '°C' },
              { key: 'spo2',   label: 'SpO₂',    placeholder: '98',     unit: '%' },
              { key: 'rr',     label: 'RR',      placeholder: '16',     unit: '/min' },
              { key: 'weight', label: 'Weight',  placeholder: '70',     unit: 'kg' },
              { key: 'height', label: 'Height',  placeholder: '170',    unit: 'cm' },
            ] as const).map(v => (
              <div key={v.key} className="flex flex-col">
                <label className="text-xs text-slate-500 font-medium mb-1">{v.label}</label>
                <div className="relative">
                  <input value={draft.vitals[v.key]}
                    onChange={e => {
                      let val = e.target.value;
                      // BP: auto-insert "/" once the systolic is complete — 3 digits if it
                      // starts 1/2 (100–250), or 2 digits if it starts 3–9 (30–99, e.g. 90/60).
                      if (v.key === 'bp' && val.length > draft.vitals.bp.length && (/^[12]\d{2}$/.test(val) || /^[3-9]\d$/.test(val))) val += '/';
                      setV(v.key, val);
                    }}
                    placeholder={v.placeholder}
                    className="input text-sm pr-8 text-center" />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">{v.unit}</span>
                </div>
              </div>
            ))}
          </div>

          {/* IPD Round — nursing vitals trend chart (BP/PR/SpO₂/Temp/RR/Sugar/Urine/Drain over time) */}
          {(patient?.status === 'IPD' || patient?.status === 'Critical') && (vitals[patientId ?? ''] ?? []).length > 0 && (() => {
            const rows = (vitals[patientId ?? ''] ?? []).slice(0, 14);
            const cols: { key: keyof typeof rows[number]; label: string; crit?: (v: typeof rows[number]) => boolean }[] = [
              { key: 'bp', label: 'BP', crit: v => !!v.bp && (parseInt(v.bp) > 160 || parseInt(v.bp) < 90) },
              { key: 'pulse', label: 'PR', crit: v => v.pulse != null && (v.pulse > 100 || v.pulse < 50) },
              { key: 'spo2', label: 'SpO₂', crit: v => v.spo2 != null && v.spo2 < 94 },
              { key: 'temp', label: 'Temp', crit: v => v.temp != null && v.temp > 100 },
              { key: 'rr', label: 'RR' },
              { key: 'sugar', label: 'Sugar', crit: v => v.sugar != null && (v.sugar > 250 || v.sugar < 60) },
              { key: 'urineOutput', label: 'Urine' },
              { key: 'drainOutput', label: 'Drain' },
            ];
            const active = cols.filter(c => rows.some(v => (v as any)[c.key] != null && (v as any)[c.key] !== ''));
            return (
              <div className="mt-4 rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-3 py-2 bg-teal-50/50 text-xs font-bold text-teal-700 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" /> Nursing Vitals Trend (latest first)
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-100 bg-slate-50/50">
                        <th className="text-left px-3 py-1.5 font-semibold">Time</th>
                        {active.map(c => <th key={String(c.key)} className="px-2 py-1.5 text-center font-semibold">{c.label}</th>)}
                        <th className="text-left px-3 py-1.5 font-semibold">By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(v => (
                        <tr key={v.id} className="border-b border-slate-50">
                          <td className="px-3 py-1.5 text-slate-500 whitespace-nowrap">{formatDateTime(v.time)}</td>
                          {active.map(c => {
                            const val = (v as any)[c.key];
                            return <td key={String(c.key)} className={cn('px-2 py-1.5 text-center font-semibold', c.crit?.(v) ? 'text-red-600' : 'text-slate-700')}>{val ?? '—'}</td>;
                          })}
                          <td className="px-3 py-1.5 text-slate-400 whitespace-nowrap">{v.recordedBy || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* BMI auto-calc */}
          {bmi && (
            <div className="mt-3 flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">BMI</span>
                <span className="text-base font-black text-slate-900">{bmi}</span>
                <span className={cn('text-xs font-bold', bmiCategory?.color)}>{bmiCategory?.label}</span>
              </div>
              {isPediatric && patientWeightKg && (
                <div className="ml-4 text-xs text-violet-700 bg-violet-50 border border-violet-200 px-2.5 py-1 rounded-lg">
                  <span className="font-semibold">Pediatric:</span> {patientWeightKg} kg · Use weight-based dosing
                </div>
              )}
            </div>
          )}

          {/* Known comorbidities / chronic diseases — tick all that apply, printed on Rx */}
          <div className="mt-4">
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Known Comorbidities / Chronic Diseases</label>
            <div className="flex flex-wrap gap-2">
              {COMORBIDITY_OPTIONS.map(c => {
                const on = draft.comorbidities.includes(c);
                return (
                  <button key={c} type="button"
                    onClick={() => set('comorbidities',
                      on ? draft.comorbidities.filter(x => x !== c) : [...draft.comorbidities, c])}
                    className={cn('px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors',
                      on ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-600 hover:border-slate-300')}>
                    {on ? '✓ ' : ''}{c}
                  </button>
                );
              })}
            </div>
          </div>
        </Section>

        {/* 2. Chief Complaint / Progress Note */}
        <Section id="s-cc" title={isIPD ? 'Progress Note — Today\'s Findings' : 'Chief Complaint'} icon={MessageCircle} filled={filled.complaint}>
          <div className="pt-4">
            {isIPD && (
              <div className="mb-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                Ward round note — how is the patient today? Any new complaints or changes since last round?
              </div>
            )}
            <textarea value={draft.chiefComplaint}
              onChange={e => set('chiefComplaint', e.target.value)}
              rows={isIPD ? 3 : 2} className="input resize-none w-full"
              placeholder={isIPD
                ? 'e.g. Patient is conscious and comfortable. No fresh complaints. Fever subsided. Accepting oral feeds…'
                : "Patient's chief complaint in their own words (e.g. 'Chest pain radiating to left arm, since 2 hours')"
              } />
          </div>
        </Section>

        {/* 3. HOPI / Round Note */}
        <Section id="s-hopi" title={isIPD ? 'Detailed Round Note' : 'History of Present Illness (HOPI)'} icon={ClipboardList} filled={filled.history}>
          <div className="pt-4">
            <textarea value={draft.hopi}
              onChange={e => set('hopi', e.target.value)}
              rows={4} className="input resize-none w-full"
              placeholder={isIPD
                ? 'Detailed progress: response to treatment, input/output, vitals trend, pain score, specific system findings, clinical changes…'
                : 'Onset, duration, character, radiation, associated symptoms, aggravating/relieving factors, progression…'
              } />
          </div>
        </Section>

        {/* 4. Past History — OPD only (IPD history already taken on admission) */}
        {!isIPD && <Section id="s-past" title="Past & Family History" icon={FileText} filled={filled.pastHistory}>
          <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {([
              { key: 'pastMedical',   label: 'Past Medical History', placeholder: 'HTN, DM, Asthma, TB, Epilepsy…' },
              { key: 'pastSurgical',  label: 'Past Surgical History', placeholder: 'Previous surgeries, hospitalizations…' },
              { key: 'familyHistory', label: 'Family History',       placeholder: 'DM, IHD, Cancer in family…' },
              { key: 'socialHistory', label: 'Social History',       placeholder: 'Smoker, alcohol, occupation, travel…' },
              { key: 'allergiesNote', label: 'Known Allergies',      placeholder: 'Penicillin, Sulpha, NSAIDs, food…' },
              { key: 'currentMeds',   label: 'Current Medications',  placeholder: 'Medications patient is already on…' },
            ] as const).map(f => (
              <div key={f.key}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-600 block">{f.label}</label>
                  <button type="button" onClick={() => set(f.key, 'Nil significant')}
                    className="text-[10px] font-semibold text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded px-1.5 py-0.5">
                    Nil significant
                  </button>
                </div>
                <textarea value={draft[f.key]}
                  onChange={e => set(f.key, e.target.value)}
                  rows={2} className="input resize-none text-sm w-full" placeholder={f.placeholder} />
              </div>
            ))}
          </div>
        </Section>}

        {/* 5. Examination */}
        <Section id="s-exam" title="Examination Findings" icon={Activity} filled={filled.exam}>
          <div className="pt-4 space-y-3">
            <BodyDiagram
              notes={draft.bodyNotes}
              checks={draft.bodySigns}
              onChange={(region, text) => set('bodyNotes', { ...draft.bodyNotes, [region]: text })}
              onCheckToggle={c => set('bodySigns',
                draft.bodySigns.includes(c) ? draft.bodySigns.filter(s => s !== c) : [...draft.bodySigns, c]
              )}
            />
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">General Examination</label>
              <textarea value={draft.generalExam}
                onChange={e => set('generalExam', e.target.value)}
                rows={2} className="input resize-none text-sm w-full"
                placeholder="Conscious, cooperative. Well-built, well-nourished. Afebrile. No pallor/icterus/clubbing/cyanosis/edema/lymphadenopathy…" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Systemic Examination (CVS / RS / Abd / CNS)</label>
              <textarea value={draft.systemicExam}
                onChange={e => set('systemicExam', e.target.value)}
                rows={3} className="input resize-none text-sm w-full"
                placeholder="CVS: S1S2 heard, no murmurs | RS: Clear | Abd: Soft, non-tender | CNS: Intact…" />
            </div>

            {/* ── Specialty Exam Modules ──────────────────────────────────────── */}
            <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Specialty Exam Modules</span>
                {openModules.size > 0 && (
                  <span className="text-[10px] font-bold bg-indigo-500 text-white px-2 py-0.5 rounded-full">
                    {openModules.size} open
                  </span>
                )}
              </div>
              {/* Horizontally scrollable chip row */}
              <div className="px-3 py-2.5 bg-white overflow-x-auto">
                <div className="flex gap-2 min-w-max sm:min-w-0 sm:flex-wrap">
                  {ALL_SPECIALTY_MODULES.map(key => {
                    const m = MODULE_META[key];
                    const isOpen = openModules.has(key);
                    const color = SPECIALTY_COLORS[key];
                    return (
                      <button key={key} type="button" onClick={() => toggleModule(key)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all duration-150 whitespace-nowrap"
                        style={isOpen
                          ? { borderColor: color, background: `${color}15`, color }
                          : { borderColor: '#e2e8f0', color: '#64748b' }}>
                        <span className="w-2 h-2 rounded-full flex-shrink-0 transition-colors"
                          style={{ background: isOpen ? color : '#cbd5e1' }} />
                        {m.short}
                        {isOpen
                          ? <span className="ml-0.5 text-[10px] opacity-70">✕</span>
                          : <span className="ml-0.5 text-[10px] opacity-40">+</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Expanded module panels */}
              {openModules.size > 0 && (
                <div className="divide-y divide-slate-100">
                  {ALL_SPECIALTY_MODULES.filter(key => openModules.has(key)).map(key => {
                    const color = SPECIALTY_COLORS[key];
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between px-4 py-2.5"
                          style={{ borderLeft: `3px solid ${color}`, background: `${color}08` }}>
                          <span className="text-xs font-bold text-slate-700 tracking-wide">
                            {MODULE_META[key].icon} {specialtyLabel(key)}
                          </span>
                          <button type="button" onClick={() => toggleModule(key)}
                            className="text-slate-400 hover:text-slate-700 text-[11px] px-2 py-0.5 rounded-md border border-slate-200 hover:border-slate-300 transition-colors">
                            Close ✕
                          </button>
                        </div>
                        <div className="px-4 py-4 bg-white">
                          <SpecialtyExamSection
                            specialtyKey={key}
                            data={draft.specialtyExam}
                            onChange={(k, val) => set('specialtyExam', { ...draft.specialtyExam, [k]: val })}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </Section>

        {/* 6. Investigations */}
        <Section id="s-inv" title="Investigations" icon={FlaskConical} filled={filled.labs}>
          <div className="pt-4 space-y-3">
            {prevLabs.length > 0 && (
              <div>
                <div className="text-xs font-medium text-slate-500 mb-2">Previous Results</div>
                <div className="flex flex-wrap gap-2">
                  {prevLabs.slice(0, 6).map(l => (
                    <span key={l.id} className={cn('text-xs px-2.5 py-1 rounded-full font-medium',
                      l.status === 'critical' ? 'bg-red-100 text-red-700' :
                      l.status === 'resulted' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
                      {l.testName} {l.result ? `→ ${l.result}` : `(${l.status})`}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Investigation Plan / Orders</label>
              <textarea value={draft.investigation}
                onChange={e => set('investigation', e.target.value)}
                rows={2} className="input resize-none text-sm w-full"
                placeholder="CBC, BMP, LFT, ECG, Echo, CXR, USG Abdomen… (ordered investigations)" />
            </div>
          </div>
        </Section>

        {/* 7. Diagnosis */}
        <Section id="s-dx" title="Diagnosis" icon={CheckCircle2} filled={filled.diagnosis}>
          <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-600 mb-1 block">Primary Diagnosis *</label>
              <input value={draft.diagnosis} onChange={e => set('diagnosis', e.target.value)}
                className="input w-full" placeholder="e.g. Type 2 Diabetes Mellitus with Hypertension" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">ICD-10 Code</label>
              <input value={draft.icdCode} onChange={e => set('icdCode', e.target.value)}
                className="input w-full" placeholder="e.g. E11, I10" />
            </div>
            <div className="sm:col-span-3">
              <label className="text-xs font-medium text-slate-600 mb-1 block">Secondary / Co-morbid Diagnoses</label>
              <input value={draft.secondaryDx} onChange={e => set('secondaryDx', e.target.value)}
                className="input w-full" placeholder="e.g. CKD Stage 3, Hypothyroidism" />
            </div>
          </div>
        </Section>


        {/* 8. Prescription */}
        <Section id="s-rx" title="Prescription" icon={Pill} filled={filled.rx}>
          <div className="pt-4 space-y-3">
            <ReadyMixPanel
              onAddDrug={(drug) => {
                set('rxRows', [...draft.rxRows.filter(r => r.drug.trim()), { ...BLANK_RX_ROW(), drug: drug.drug ?? '', dose: drug.dose ?? '', route: drug.route ?? 'Oral', frequency: drug.frequency ?? 'OD', duration: drug.duration ?? '5 days', instructions: drug.instructions ?? '' }]);
              }}
              onLoadBundle={(drugs) => {
                const newRows = drugs.map(d => ({ ...BLANK_RX_ROW(), drug: d.drug ?? '', dose: d.dose ?? '', route: d.route ?? 'Oral', frequency: d.frequency ?? 'OD', duration: d.duration ?? '5 days', instructions: d.instructions ?? '' }));
                set('rxRows', [...draft.rxRows.filter(r => r.drug.trim()), ...newRows]);
              }}
            />
            <FavDrugsPanel
              diagnosis={draft.diagnosis}
              onAddDrug={(drug) => {
                const row = BLANK_RX_ROW();
                set('rxRows', [...draft.rxRows, { ...row, drug: drug.drug ?? '', dose: drug.dose ?? '', route: drug.route ?? row.route, frequency: drug.frequency ?? row.frequency, duration: drug.duration ?? row.duration, instructions: drug.instructions ?? '' }]);
              }}
              onLoadBundle={(drugs) => {
                const newRows = drugs.map(d => ({ ...BLANK_RX_ROW(), drug: d.drug ?? '', dose: d.dose ?? '', route: d.route ?? 'Oral', frequency: d.frequency ?? 'OD', duration: d.duration ?? '5 days', instructions: d.instructions ?? '' }));
                set('rxRows', [...draft.rxRows.filter(r => r.drug.trim()), ...newRows]);
              }}
            />
            <RxSection
              rxRows={draft.rxRows}
              onUpdateRxForm={updateRxForm}
              onUpdateRx={updateRx}
              onUpdateRxMulti={updateRxMulti}
              onRemoveRx={removeRx}
              onAddRx={addRxRow}
              isPediatric={isPediatric}
              patientWeightKg={patientWeightKg}
              showAddButton={true}
            />

            {prevRx.length > 0 && (
              <div className="mt-2">
                <div className="text-xs font-medium text-slate-500 mb-2">Active from previous visits</div>
                <div className="flex flex-wrap gap-2">
                  {prevRx.filter(r => r.status === 'active').map(r => (
                    <span key={r.id} className="text-xs bg-teal-50 text-teal-700 border border-teal-200 px-2.5 py-1 rounded-full">
                      {r.drug} {r.dose} {r.frequency}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* 9. Vaccines Given */}
        <Section id="s-vax" title="Vaccines Given" icon={Syringe} filled={vaccines.length > 0}>
          {(() => {
            const VAX_LIST = [
              // Neonatal / Infants
              { name: 'BCG', schedule: '1 dose at birth', route: 'ID', nextDue: '' },
              { name: 'OPV (Oral Polio)', schedule: '4 doses: birth + 6w + 10w + 14w; boosters at 18m, 5y', route: 'Oral', nextDue: '' },
              { name: 'IPV (Inactivated Polio)', schedule: '2 doses: 6w + 14w', route: 'IM', nextDue: '' },
              { name: 'Hepatitis B (0)', schedule: '1st dose at birth; total 3 doses (0-6w-14w)', route: 'IM', nextDue: '' },
              { name: 'Pentavalent (DPT+HiB+HepB)', schedule: '3 primary doses: 6w, 10w, 14w', route: 'IM', nextDue: '' },
              { name: 'PCV (Pneumococcal)', schedule: '3 doses: 6w, 10w, 14w + booster at 15m', route: 'IM', nextDue: '' },
              { name: 'Rotavirus', schedule: '2-3 doses starting at 6w (brand-dependent)', route: 'Oral', nextDue: '' },
              // Older infants
              { name: 'MMR', schedule: '2 doses: 9–12m + 15–18m; catch-up up to 12y', route: 'SC', nextDue: '' },
              { name: 'Varicella', schedule: '2 doses: 15–18m + 4–6y', route: 'SC', nextDue: '' },
              { name: 'Hepatitis A', schedule: '2 doses: from 1y, 2nd dose 6–18m later', route: 'IM', nextDue: '' },
              { name: 'Typhoid (Vi conjugate)', schedule: '1 dose from 6m; booster every 3y', route: 'IM', nextDue: '' },
              { name: 'JE (Japanese Encephalitis)', schedule: '2 doses: 28 days apart (from 1y in endemic areas)', route: 'IM', nextDue: '' },
              // DPT Boosters
              { name: 'DPT Booster 1', schedule: '1st booster at 18 months', route: 'IM', nextDue: '' },
              { name: 'DPT Booster 2', schedule: '2nd booster at 5 years', route: 'IM', nextDue: '' },
              // Pre-adolescent / Adult
              { name: 'HPV', schedule: '2 doses 9–14y (0, 6m); 3 doses 15+y (0, 1–2m, 6m)', route: 'IM', nextDue: '' },
              { name: 'Meningococcal (MCV4)', schedule: '1 dose at 11–12y; booster at 16y', route: 'IM', nextDue: '' },
              { name: 'Td (Tetanus + Diphtheria)', schedule: 'Booster every 10 years', route: 'IM', nextDue: '' },
              { name: 'Tdap', schedule: 'Once (replaces 1 Td dose); 1 dose in each pregnancy', route: 'IM', nextDue: '' },
              { name: 'Tetanus Toxoid (TT)', schedule: 'Wound prophylaxis: 1–2 doses; Pregnancy: 2 doses', route: 'IM', nextDue: '' },
              { name: 'Influenza', schedule: 'Annual; children < 9y: 2 doses first time', route: 'IM', nextDue: '' },
              { name: 'COVID-19', schedule: '2 primary doses (4–8w apart) + booster', route: 'IM', nextDue: '' },
              { name: 'Rabies (post-exposure)', schedule: '4 doses: Day 0, 3, 7, 14 (+ immunoglobulin if needed)', route: 'IM', nextDue: '' },
              { name: 'Rabies (pre-exposure)', schedule: '3 doses: Day 0, 7, 28; booster after 1–3y (titre-based)', route: 'IM', nextDue: '' },
              { name: 'Typhoid Vi (Polysaccharide)', schedule: '1 dose from 2y; booster every 3y', route: 'IM', nextDue: '' },
              { name: 'Cholera (Oral)', schedule: '2 doses: 1–6 weeks apart; booster every 2y', route: 'Oral', nextDue: '' },
              { name: 'Yellow Fever', schedule: '1 dose; lifetime protection (10y certificate)', route: 'SC', nextDue: '' },
            ];
            const vaxFiltered = VAX_LIST.filter(v =>
              v.name.toLowerCase().includes(vaxSearch.toLowerCase()) ||
              v.schedule.toLowerCase().includes(vaxSearch.toLowerCase())
            );
            return (
              <div className="pt-4 space-y-3">
                {/* Inline panel trigger */}
                <button type="button"
                  onClick={() => setVaxDropOpen(o => !o)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-medium transition-all duration-100',
                    vaxDropOpen
                      ? 'border-teal-400 bg-teal-50 text-teal-700'
                      : 'border-slate-300 bg-white text-slate-600 hover:border-teal-300 hover:bg-teal-50/40'
                  )}>
                  <span className="flex items-center gap-2">
                    <Syringe className="w-4 h-4 text-teal-500" />
                    Select vaccine to add
                  </span>
                  <ChevronDown className={cn('w-4 h-4 transition-transform duration-200', vaxDropOpen && 'rotate-180')} />
                </button>

                {/* Inline expanding panel — no absolute, no overflow-hidden conflict */}
                {vaxDropOpen && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <div className="p-2 border-b border-slate-100">
                      <input
                        autoFocus
                        value={vaxSearch}
                        onChange={e => setVaxSearch(e.target.value)}
                        placeholder="Search vaccine…"
                        className="input text-sm py-1.5 w-full"
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-50">
                      {vaxFiltered.map(v => {
                        const already = !!vaccines.find(vx => vx.name === v.name);
                        return (
                          <button key={v.name} type="button"
                            onClick={() => {
                              if (!already) {
                                setVaccines(vs => [...vs, {
                                  id: `vax-${Date.now()}-${Math.random()}`,
                                  name: v.name,
                                  givenDate: new Date().toISOString().slice(0, 10),
                                  givenBy: user?.name ?? 'Doctor',
                                  site: v.route === 'Oral' ? 'Oral' : '',
                                }]);
                              } else {
                                setVaccines(vs => vs.filter(vx => vx.name !== v.name));
                              }
                            }}
                            className={cn(
                              'w-full text-left px-3 py-2.5 flex items-start gap-3 transition-colors',
                              already ? 'bg-teal-50/80' : 'hover:bg-slate-50'
                            )}>
                            <span className={cn('mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center',
                              already ? 'bg-teal-500 border-teal-500' : 'border-slate-300')}>
                              {already && <CheckCircle2 className="w-3 h-3 text-white" />}
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-medium text-slate-800">{v.name}</span>
                              <span className="block text-xs text-slate-400 mt-0.5">{v.schedule} · {v.route}</span>
                            </span>
                          </button>
                        );
                      })}
                      {vaxFiltered.length === 0 && (
                        <div className="text-xs text-slate-400 py-4 text-center">No vaccine found</div>
                      )}
                    </div>
                    {/* Custom vaccine footer */}
                    <div className="p-2 border-t border-slate-100 flex gap-2 bg-slate-50">
                      <input value={customVaxName} onChange={e => setCustomVaxName(e.target.value)}
                        placeholder="Other vaccine (type + Enter)…" className="input text-xs py-1.5 flex-1"
                        onKeyDown={e => {
                          if (e.key === 'Enter' && customVaxName.trim()) {
                            setVaccines(vs => [...vs, { id: `vax-${Date.now()}`, name: customVaxName.trim(), givenDate: new Date().toISOString().slice(0, 10), givenBy: user?.name ?? 'Doctor' }]);
                            setCustomVaxName('');
                          }
                        }} />
                      <button type="button" onClick={() => {
                        if (customVaxName.trim()) {
                          setVaccines(vs => [...vs, { id: `vax-${Date.now()}`, name: customVaxName.trim(), givenDate: new Date().toISOString().slice(0, 10), givenBy: user?.name ?? 'Doctor' }]);
                          setCustomVaxName('');
                        }
                      }} className="btn-secondary btn-sm px-3">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => { setVaxDropOpen(false); setVaxSearch(''); }}
                        className="btn-ghost btn-sm px-2 text-xs">Done</button>
                    </div>
                  </div>
                )}

                {/* Added vaccines list */}
                {vaccines.length > 0 && (
                  <div className="space-y-2">
                    {vaccines.map(vax => (
                      <div key={vax.id} className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-xl px-3 py-2 flex-wrap">
                        <Syringe className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                        <span className="text-sm font-medium text-teal-800 flex-1 min-w-0">{vax.name}</span>
                        <input value={vax.batchNo ?? ''} onChange={e => setVaccines(vs => vs.map(v => v.id === vax.id ? { ...v, batchNo: e.target.value } : v))}
                          placeholder="Batch no." className="input text-xs w-28 py-1" />
                        <select value={vax.site ?? ''} onChange={e => setVaccines(vs => vs.map(v => v.id === vax.id ? { ...v, site: e.target.value } : v))}
                          className="input text-xs py-1 w-36">
                          <option value="">Site…</option>
                          <option>IM – Left arm</option>
                          <option>IM – Right arm</option>
                          <option>SC – Left arm</option>
                          <option>SC – Right arm</option>
                          <option>Oral</option>
                          <option>Intradermal – Left arm</option>
                        </select>
                        <input type="date" value={vax.nextDueDate ?? ''} onChange={e => setVaccines(vs => vs.map(v => v.id === vax.id ? { ...v, nextDueDate: e.target.value } : v))}
                          title="Next due date" className="input text-xs py-1 w-36" />
                        <button type="button" onClick={() => setVaccines(vs => vs.filter(v => v.id !== vax.id))}
                          className="p-1 text-red-400 hover:text-red-600 active:scale-90 transition-transform rounded-lg ml-auto">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </Section>

        {/* 10. Procedures */}
        <Section id="s-proc" title="Procedures Performed" icon={Scissors} filled={procedures.length > 0}>
          {(() => {
            const PROC_LIST = [
              { name: 'Wound Dressing', category: 'Wound Care' },
              { name: 'Suturing / Wound Closure', category: 'Wound Care' },
              { name: 'Incision & Drainage (I&D)', category: 'Wound Care' },
              { name: 'Wound Debridement', category: 'Wound Care' },
              { name: 'Wound Packing', category: 'Wound Care' },
              { name: 'IV Cannulation', category: 'Vascular Access' },
              { name: 'Blood Draw (Venepuncture)', category: 'Vascular Access' },
              { name: 'Arterial Blood Gas (ABG)', category: 'Vascular Access' },
              { name: 'Central Line Insertion', category: 'Vascular Access' },
              { name: 'Nebulization', category: 'Respiratory' },
              { name: 'Oxygen Therapy', category: 'Respiratory' },
              { name: 'Intubation / Intubation Assistance', category: 'Respiratory' },
              { name: 'Spirometry', category: 'Respiratory' },
              { name: 'ECG (12-lead)', category: 'Cardiac' },
              { name: 'Cardioversion / Defibrillation', category: 'Cardiac' },
              { name: 'Urinary Catheterisation', category: 'Urological' },
              { name: 'Bladder Irrigation', category: 'Urological' },
              { name: 'NG Tube Insertion', category: 'GI' },
              { name: 'Ryle\'s Tube Feeding', category: 'GI' },
              { name: 'Splinting / Slab Application', category: 'Orthopaedic' },
              { name: 'Plaster of Paris (POP) Cast', category: 'Orthopaedic' },
              { name: 'Joint Aspiration', category: 'Orthopaedic' },
              { name: 'Lumbar Puncture (LP)', category: 'Neurological' },
              { name: 'Circumcision', category: 'Surgical' },
              { name: 'Ear Syringing / Wax Removal', category: 'ENT' },
              { name: 'Nasal Packing', category: 'ENT' },
              { name: 'Foreign Body Removal (Ear/Nose/Eye)', category: 'ENT' },
              { name: 'Laceration Repair', category: 'Emergency' },
              { name: 'CPR', category: 'Emergency' },
              { name: 'Burn Dressing', category: 'Emergency' },
              { name: 'Reduction (Fracture/Dislocation)', category: 'Emergency' },
            ];
            const procFiltered = PROC_LIST.filter(p =>
              p.name.toLowerCase().includes(procSearch.toLowerCase()) ||
              p.category.toLowerCase().includes(procSearch.toLowerCase())
            );
            return (
              <div className="pt-4 space-y-3">
                {/* Inline panel trigger */}
                <button type="button"
                  onClick={() => setProcDropOpen(o => !o)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-medium transition-all duration-100',
                    procDropOpen
                      ? 'border-blue-400 bg-blue-50 text-blue-700'
                      : 'border-slate-300 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50/40'
                  )}>
                  <span className="flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-blue-500" />
                    Select procedure to add
                  </span>
                  <ChevronDown className={cn('w-4 h-4 transition-transform duration-200', procDropOpen && 'rotate-180')} />
                </button>

                {/* Inline expanding panel */}
                {procDropOpen && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <div className="p-2 border-b border-slate-100">
                      <input
                        autoFocus
                        value={procSearch}
                        onChange={e => setProcSearch(e.target.value)}
                        placeholder="Search procedure…"
                        className="input text-sm py-1.5 w-full"
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-50">
                      {procFiltered.map(p => {
                        const already = !!procedures.find(pr => pr.name === p.name);
                        return (
                          <button key={p.name} type="button"
                            onClick={() => {
                              if (!already) {
                                setProcedures(ps => [...ps, {
                                  id: `proc-${Date.now()}-${Math.random()}`,
                                  name: p.name, time: new Date().toISOString(),
                                  performedBy: user?.name ?? 'Doctor',
                                }]);
                              } else {
                                setProcedures(ps => ps.filter(pr => pr.name !== p.name));
                              }
                            }}
                            className={cn(
                              'w-full text-left px-3 py-2.5 flex items-start gap-3 transition-colors',
                              already ? 'bg-blue-50/80' : 'hover:bg-slate-50'
                            )}>
                            <span className={cn('mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center',
                              already ? 'bg-blue-500 border-blue-500' : 'border-slate-300')}>
                              {already && <CheckCircle2 className="w-3 h-3 text-white" />}
                            </span>
                            <span>
                              <span className="block text-sm font-medium text-slate-800">{p.name}</span>
                              <span className="block text-xs text-slate-400">{p.category}</span>
                            </span>
                          </button>
                        );
                      })}
                      {procFiltered.length === 0 && (
                        <div className="text-xs text-slate-400 py-4 text-center">No procedure found</div>
                      )}
                    </div>
                    <div className="p-2 border-t border-slate-100 flex gap-2 bg-slate-50">
                      <input value={customProcName} onChange={e => setCustomProcName(e.target.value)}
                        placeholder="Other procedure (type + Enter)…" className="input text-xs py-1.5 flex-1"
                        onKeyDown={e => {
                          if (e.key === 'Enter' && customProcName.trim()) {
                            setProcedures(ps => [...ps, { id: `proc-${Date.now()}`, name: customProcName.trim(), time: new Date().toISOString(), performedBy: user?.name ?? 'Doctor' }]);
                            setCustomProcName('');
                          }
                        }} />
                      <button type="button" onClick={() => {
                        if (customProcName.trim()) {
                          setProcedures(ps => [...ps, { id: `proc-${Date.now()}`, name: customProcName.trim(), time: new Date().toISOString(), performedBy: user?.name ?? 'Doctor' }]);
                          setCustomProcName('');
                        }
                      }} className="btn-secondary btn-sm px-3">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => { setProcDropOpen(false); setProcSearch(''); }}
                        className="btn-ghost btn-sm px-2 text-xs">Done</button>
                    </div>
                  </div>
                )}

                {/* Added procedures list */}
                {procedures.length > 0 && (
                  <div className="space-y-2">
                    {procedures.map(proc => (
                      <div key={proc.id} className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
                        <Scissors className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                        <span className="text-sm font-medium text-blue-800 flex-1">{proc.name}</span>
                        <input value={proc.notes ?? ''} onChange={e => setProcedures(ps => ps.map(p => p.id === proc.id ? { ...p, notes: e.target.value } : p))}
                          placeholder="Notes (optional)…" className="input text-xs py-1 flex-1 max-w-48" />
                        <button type="button" onClick={() => setProcedures(ps => ps.filter(p => p.id !== proc.id))}
                          className="p-1 text-red-400 hover:text-red-600 active:scale-90 transition-transform rounded-lg">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </Section>

        {/* 11. Photos & Attachments */}
        <Section id="s-attach" title="Photos & Attachments" icon={Camera} filled={attachments.length > 0}>
          <div className="pt-4 space-y-3">
            {attachments.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {attachments.map(att => (
                  <div key={att.id} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                    {(att.type === 'photo' || att.type === 'xray') ? (
                      <img src={att.dataUrl} alt={att.label} className="w-full h-24 object-cover" />
                    ) : (
                      <div className="w-full h-24 flex flex-col items-center justify-center gap-1">
                        <FileText className="w-8 h-8 text-slate-400" />
                        <span className="text-xs text-slate-400">PDF</span>
                      </div>
                    )}
                    <div className="px-2 py-1 text-xs text-slate-600 truncate border-t border-slate-100">{att.label}</div>
                    <button type="button" onClick={() => setAttachments(as => as.filter(a => a.id !== att.id))}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-red-500 text-white rounded-full">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className="flex items-center gap-3 justify-center border-2 border-dashed border-slate-300 rounded-xl py-5 cursor-pointer hover:border-teal-400 hover:bg-teal-50 transition-all group">
              <Upload className="w-5 h-5 text-slate-400 group-hover:text-teal-500" />
              <div className="text-center">
                <div className="text-sm text-slate-600 font-medium group-hover:text-teal-700">Upload photo, X-ray or report</div>
                <div className="text-xs text-slate-400">Wound photos, X-rays, ECG strips, lab reports</div>
              </div>
              <input type="file" accept="image/*,application/pdf" multiple className="hidden"
                onChange={e => {
                  const files = Array.from(e.target.files ?? []);
                  files.forEach(file => {
                    const reader = new FileReader();
                    reader.onload = ev => {
                      const dataUrl = ev.target?.result as string;
                      const isImage = file.type.startsWith('image/');
                      setAttachments(as => [...as, {
                        id: `att-${Date.now()}-${Math.random()}`,
                        label: file.name,
                        type: isImage ? 'photo' : 'report',
                        dataUrl,
                        uploadedAt: new Date().toISOString(),
                      }]);
                    };
                    reader.readAsDataURL(file);
                  });
                  e.target.value = '';
                }} />
            </label>
          </div>
        </Section>

        {/* 12. Advice & Follow-up (OPD) / Nursing Instructions (IPD) */}
        <Section id="s-advice"
          title={isIPD ? 'Instructions & Nursing Orders' : 'Advice & Follow-up'}
          icon={ClipboardList} filled={filled.advice}>
          <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-600 mb-1 block">
                {isIPD ? 'Nursing Instructions / Diet / Activity Orders' : 'Patient Advice'}
              </label>
              <textarea value={draft.advice} onChange={e => set('advice', e.target.value)}
                rows={3} className="input resize-none w-full text-sm"
                placeholder={isIPD
                  ? 'Nursing: monitor BP Q4H, strict I/O charting, NPO… | Diet: soft diet, IV fluids 1L NS over 8h… | Activity: bed rest, mobilise with support…'
                  : 'Diet: low salt, low sugar… | Activity: light walking… | Wound care… | Red flags to watch for…'
                } />
            </div>
            {!isIPD && (
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Follow-up In</label>
                <select value={draft.followUp} onChange={e => set('followUp', e.target.value)} className="input w-full">
                  {FOLLOW_UPS.map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
            )}
            {!isIPD && (
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Refer to Specialist</label>
                <button type="button" onClick={() => setShowRefer(true)}
                  className={cn('w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm transition-all',
                    referForm.specialty || referForm.doctorName
                      ? 'border-violet-400 bg-violet-50 text-violet-700 font-medium'
                      : 'border-dashed border-slate-300 text-slate-400 hover:border-violet-300 hover:text-violet-500')}>
                  <Share2 className="w-4 h-4 flex-shrink-0" />
                  {referForm.specialty || referForm.doctorName
                    ? `Referring to ${referForm.doctorName ? `Dr. ${referForm.doctorName}` : referForm.specialty}`
                    : 'Add referral…'}
                </button>
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-600 mb-1 block">
                Private Note <span className="text-slate-400 font-normal">(not printed)</span>
              </label>
              <textarea value={draft.privateNote} onChange={e => set('privateNote', e.target.value)}
                rows={2} className="input resize-none w-full text-sm bg-amber-50 border-amber-200"
                placeholder="Internal notes for yourself or team…" />
            </div>
          </div>
        </Section>

        {/* Action row */}
        <div className="space-y-2 pb-4">
          {/* OPD secondary actions */}
          {!isIPD && (
            <div className="grid grid-cols-3 gap-2">
              <button type="button" onClick={() => setShowPrint(true)} className="btn-secondary text-sm py-3">
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Print Rx</span>
                <span className="sm:hidden">Print</span>
              </button>
              <button type="button" onClick={sendWhatsApp} className="btn-secondary text-sm text-emerald-700 border-emerald-300 hover:bg-emerald-50 py-3">
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">WhatsApp</span>
                <span className="sm:hidden">WA</span>
              </button>
              <button type="button" onClick={() => setShowRefer(true)}
                className={cn('text-sm py-3', referForm.specialty || referForm.doctorName ? 'btn-primary bg-violet-600 hover:bg-violet-700 border-violet-600' : 'btn-secondary')}>
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">{referForm.specialty || referForm.doctorName ? 'Edit Referral' : 'Refer Patient'}</span>
                <span className="sm:hidden">Refer</span>
              </button>
            </div>
          )}
          {/* Primary actions */}
          <div className="flex gap-2">
            {!isIPD && (
              <button type="button" onClick={() => { setAdmitTab('admit'); setShowAdmit(true); }}
                className="btn-secondary flex-1 text-sm border-amber-300 text-amber-700 hover:bg-amber-50 py-3">
                <BedDouble className="w-4 h-4" />
                <span className="hidden sm:inline">Admit / Refer</span>
                <span className="sm:hidden">Admit</span>
              </button>
            )}
            <button type="button" onClick={handleFinalize} disabled={saving} className="btn-primary flex-1 py-3 text-base">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving…' : isIPD ? 'Save Round Note' : editVisitId ? 'Update & Save' : 'Finalise & Save'}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Unified Admit / Refer to Higher Centre Modal ─────────────────── */}
      {showAdmit && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4" onClick={() => setShowAdmit(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-900">Admit / Refer — {patient.name}</div>
                <div className="text-xs text-slate-500">{patient.age}y · {draft.diagnosis || patient.diagnosis || 'Diagnosis not set'}</div>
              </div>
              <button onClick={() => setShowAdmit(false)} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100">
              <button onClick={() => setAdmitTab('admit')}
                className={cn('flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2',
                  admitTab === 'admit' ? 'text-amber-700 border-b-2 border-amber-500 bg-amber-50' : 'text-slate-500 hover:text-slate-700')}>
                <BedDouble className="w-4 h-4" /> Admit to Ward
              </button>
              <button onClick={() => setAdmitTab('refer')}
                className={cn('flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2',
                  admitTab === 'refer' ? 'text-violet-700 border-b-2 border-violet-500 bg-violet-50' : 'text-slate-500 hover:text-slate-700')}>
                <Share2 className="w-4 h-4" /> Refer to Higher Centre
              </button>
            </div>

            {admitTab === 'admit' && (
              <div className="p-5 space-y-4">
                <div>
                  <label className="label">Admission Type</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {(['Medical', 'Surgical', 'Day Care', 'Emergency'] as const).map(t => (
                      <button key={t} type="button" onClick={() => setAdmitForm(f => ({ ...f, type: t }))}
                        className={cn('py-2 px-3 rounded-xl border-2 text-sm font-medium transition-all',
                          admitForm.type === t
                            ? t === 'Emergency' ? 'border-red-500 bg-red-50 text-red-700'
                              : t === 'Surgical' ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-teal-500 bg-teal-50 text-teal-700'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300')}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Ward / Room *</label>
                    {activeClinic?.beds && activeClinic.beds.length > 0 ? (
                      <select value={admitForm.ward} onChange={e => setAdmitForm(f => ({ ...f, ward: e.target.value }))} className="input">
                        <option value="">Select ward…</option>
                        {[...new Set(activeClinic.beds.map(b => b.ward))].map(w => (
                          <option key={w} value={w}>{w}</option>
                        ))}
                        <option value="__custom">Other…</option>
                      </select>
                    ) : (
                      <input value={admitForm.ward} onChange={e => setAdmitForm(f => ({ ...f, ward: e.target.value }))}
                        placeholder="General Ward, ICU…" className="input" />
                    )}
                  </div>
                  <div>
                    <label className="label">Bed No.</label>
                    {activeClinic?.beds && activeClinic.beds.length > 0 ? (
                      <select value={admitForm.bed} onChange={e => setAdmitForm(f => ({ ...f, bed: e.target.value }))} className="input">
                        <option value="">Select bed…</option>
                        {activeClinic.beds
                          .filter(b => !admitForm.ward || b.ward === admitForm.ward)
                          .map(b => (
                            <option key={b.id} value={b.number}>{b.number} — {b.ward}</option>
                          ))}
                        <option value="__custom">Other…</option>
                      </select>
                    ) : (
                      <input value={admitForm.bed} onChange={e => setAdmitForm(f => ({ ...f, bed: e.target.value }))}
                        placeholder="B-12" className="input" />
                    )}
                  </div>
                </div>
                <div>
                  <label className="label">Expected Duration</label>
                  <input value={admitForm.duration} onChange={e => setAdmitForm(f => ({ ...f, duration: e.target.value }))}
                    placeholder="3 days, 1 week…" className="input" />
                </div>
                <div>
                  <label className="label">Special Instructions</label>
                  <textarea value={admitForm.instructions} onChange={e => setAdmitForm(f => ({ ...f, instructions: e.target.value }))}
                    rows={2} placeholder="NPO, hourly vitals, IV fluids…" className="input resize-none" />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowAdmit(false)} className="btn-secondary flex-1">Cancel</button>
                  <button type="button" onClick={handleAdmit} className="flex-1 py-2 px-4 rounded-xl font-semibold text-sm bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center gap-2">
                    <BedDouble className="w-4 h-4" /> Confirm Admission
                  </button>
                </div>
              </div>
            )}

            {admitTab === 'refer' && (
              <div className="p-5 space-y-4">
                <div>
                  <label className="label">Urgency *</label>
                  <div className="flex gap-2 mt-1">
                    {(['Routine', 'Urgent', 'Emergency'] as const).map(u => (
                      <button key={u} type="button" onClick={() => setReferHigher(f => ({ ...f, urgency: u }))}
                        className={cn('flex-1 py-2 px-3 rounded-xl border-2 text-sm font-medium transition-all',
                          referHigher.urgency === u
                            ? u === 'Emergency' ? 'border-red-500 bg-red-50 text-red-700'
                              : u === 'Urgent' ? 'border-amber-500 bg-amber-50 text-amber-700'
                              : 'border-teal-500 bg-teal-50 text-teal-700'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300')}>
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">Hospital / Centre *</label>
                  <input value={referHigher.hospital} onChange={e => setReferHigher(f => ({ ...f, hospital: e.target.value }))}
                    placeholder="AIIMS, Apollo, SSKM…" className="input" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Department</label>
                    <input value={referHigher.dept} onChange={e => setReferHigher(f => ({ ...f, dept: e.target.value }))}
                      placeholder="Cardiology, ICU…" className="input" />
                  </div>
                  <div>
                    <label className="label">Doctor (optional)</label>
                    <input value={referHigher.doctor} onChange={e => setReferHigher(f => ({ ...f, doctor: e.target.value }))}
                      placeholder="Dr. Sharma" className="input" />
                  </div>
                </div>
                <div>
                  <label className="label">Reason for Referral *</label>
                  <textarea value={referHigher.reason} onChange={e => setReferHigher(f => ({ ...f, reason: e.target.value }))}
                    rows={2} placeholder="Needs ICU care, specialist intervention, advanced investigations…" className="input resize-none" />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowAdmit(false)} className="btn-secondary flex-1">Cancel</button>
                  <button type="button" onClick={handleReferHigher}
                    disabled={!referHigher.hospital.trim()}
                    className="flex-1 py-2 px-4 rounded-xl font-semibold text-sm bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white flex items-center justify-center gap-2">
                    <Share2 className="w-4 h-4" /> Confirm Referral
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Refer to Specialist Modal (intra-visit specialist referral) ───── */}
      {showRefer && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4" onClick={() => setShowRefer(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                  <Share2 className="w-4 h-4 text-violet-600" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">Refer to Specialist</div>
                  <div className="text-xs text-slate-500">{patient.name} · added to consultation record</div>
                </div>
              </div>
              <button onClick={() => setShowRefer(false)} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">Urgency</label>
                <div className="flex gap-2 mt-1">
                  {(['Routine', 'Urgent', 'Emergency'] as const).map(u => (
                    <button key={u} type="button" onClick={() => setReferForm(f => ({ ...f, urgency: u }))}
                      className={cn('flex-1 py-2 px-3 rounded-xl border-2 text-sm font-medium transition-all',
                        referForm.urgency === u
                          ? u === 'Emergency' ? 'border-red-500 bg-red-50 text-red-700'
                            : u === 'Urgent' ? 'border-amber-500 bg-amber-50 text-amber-700'
                            : 'border-teal-500 bg-teal-50 text-teal-700'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300')}>
                      {u}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Specialty</label>
                  <input value={referForm.specialty} onChange={e => setReferForm(f => ({ ...f, specialty: e.target.value }))}
                    placeholder="Cardiology, Neurology…" className="input" />
                </div>
                <div>
                  <label className="label">Doctor (optional)</label>
                  <input value={referForm.doctorName} onChange={e => setReferForm(f => ({ ...f, doctorName: e.target.value }))}
                    placeholder="Dr. Sharma" className="input" />
                </div>
              </div>
              <div>
                <label className="label">Reason *</label>
                <textarea value={referForm.reason} onChange={e => setReferForm(f => ({ ...f, reason: e.target.value }))}
                  rows={2} placeholder="Echo + cardiology opinion for chest pain, ACS workup…" className="input resize-none" />
              </div>
              <div>
                <label className="label">Clinical Notes for Specialist</label>
                <textarea value={referForm.notes} onChange={e => setReferForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} placeholder="ECG findings, history, current medications…" className="input resize-none" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowRefer(false)} className="btn-secondary flex-1">Done</button>
                <button type="button" onClick={() => { setShowRefer(false); printReferral(); }}
                  className="flex-1 py-2 px-4 rounded-xl font-semibold text-sm bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center gap-2">
                  <Printer className="w-4 h-4" /> Print Referral Letter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Print Preview Modal ────────────────────────────────────────────── */}
      {showPrint && (
        <PrintPreview
          patient={patient} draft={draft} pad={pad}
          clinicName={activeClinic?.name} clinicAddress={activeClinic?.address} clinicPhone={activeClinic?.phone}
          onClose={() => { setShowPrint(false); setPrintFromSave(false); }}
          onWhatsApp={sendWhatsApp}
          specialtyExam={Object.keys(draft.specialtyExam).length ? draft.specialtyExam : undefined}
          doctorSpecialty={user?.specialty}
          vaccines={vaccines}
          procedures={procedures}
          onEndConsult={printFromSave ? () => {
            const aptId = patientId?.startsWith('apt-') ? patientId.slice(4) : null;
            if (aptId) updateAppointment(aptId, { status: 'completed' });
            setShowPrint(false);
            setPrintFromSave(false);
            navigate('/app/queue');
          } : undefined}
        />
      )}

      {/* ─── Clinical Calculators ──────────────────────────────────────────── */}
      {showCalc && (
        <ClinicalCalculators
          onClose={() => setShowCalc(false)}
          patientAge={typeof patient.age === 'number' ? patient.age : undefined}
          patientWeight={parseFloat(draft.vitals.weight) || undefined}
          patientSex={patient.gender === 'M' ? 'M' : patient.gender === 'F' ? 'F' : undefined}
        />
      )}

      {/* ─── Mobile bottom action bar ──────────────────────────────────────── */}
      {!isIPD && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-slate-200 px-4 py-2.5 flex gap-3 safe-bottom">
          <button
            onClick={() => setShowPrint(true)}
            className="flex-1 btn-secondary py-2.5 flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span className="text-sm font-semibold">Print Rx</span>
          </button>
          <button
            type="button"
            onClick={handleFinalize}
            disabled={saving}
            className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span className="text-sm font-semibold">{saving ? 'Saving…' : editVisitId ? 'Update' : 'Save'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
