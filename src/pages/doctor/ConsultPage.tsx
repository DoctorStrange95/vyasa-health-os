import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronDown, ChevronUp, CheckCircle2, Printer, Send, Save,
  Plus, Trash2, ArrowLeft, FileText, Loader2,
  Activity, Pill, FlaskConical, ClipboardList, MessageCircle, X,
  BedDouble, Share2, Syringe, Scissors, Upload, Camera, Calculator
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { usePadStore } from '@/store/usePadStore';
import { BodyDiagram } from '@/components/BodyDiagram';
import { ClinicalCalculators } from '@/components/ClinicalCalculators';
import { DrugAutocomplete } from '@/components/prescription/DrugAutocomplete';
import { FrequencyPicker } from '@/components/prescription/FrequencyPicker';
import { DurationPicker } from '@/components/prescription/DurationPicker';
import { FavDrugsPanel } from '@/components/prescription/FavDrugsPanel';
import { cn } from '@/lib/utils';
import type { DrugKB, VaccineEntry, ProcedureEntry, AttachmentEntry } from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────

type RxForm = 'Tab' | 'Cap' | 'Syr' | 'MDI' | 'Drops' | 'Cream' | 'Inj';
interface RxRow {
  id: string;
  form: RxForm;
  drug: string;
  dose: string;
  strength: string;  // e.g. "125mg/5mL" for Syr, "mcg/puff" for MDI
  puffs: string;     // for MDI
  doseML: string;    // auto-calculated mL for Syr
  route: string;
  frequency: string;
  duration: string;
  instructions: string;
}

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
}

const BLANK_RX_ROW = (): RxRow => ({ id: String(Date.now()), form: 'Tab', drug: '', dose: '', strength: '', puffs: '', doseML: '', route: 'Oral', frequency: 'OD', duration: '5 days', instructions: '' });

const BLANK_DRAFT: ConsultDraft = {
  chiefComplaint: '', hopi: '', pastMedical: '', pastSurgical: '',
  familyHistory: '', socialHistory: '', allergiesNote: '', currentMeds: '',
  generalExam: '', systemicExam: '', investigation: '',
  diagnosis: '', icdCode: '', secondaryDx: '',
  rxRows: [{ id: '1', form: 'Tab', drug: '', dose: '', strength: '', puffs: '', doseML: '', route: 'Oral', frequency: 'OD', duration: '5 days', instructions: '' }],
  advice: '', followUp: '1 week', referredTo: '', privateNote: '',
  vitals: { bp: '', hr: '', temp: '', spo2: '', weight: '', height: '', rr: '' },
  bodyNotes: {},
  bodySigns: [],
};

const ROUTES = ['Oral', 'IV', 'IM', 'SC', 'Topical', 'Inhaled', 'Sublingual', 'Rectal', 'Nasal'];
const FORM_ROUTES: Record<RxForm, string> = { Tab: 'Oral', Cap: 'Oral', Syr: 'Oral', MDI: 'Inhaled', Drops: 'Topical', Cream: 'Topical', Inj: 'IM' };
const RX_FORMS: RxForm[] = ['Tab', 'Cap', 'Syr', 'MDI', 'Drops', 'Cream', 'Inj'];
const FOLLOW_UPS = ['2 days', '3 days', '1 week', '2 weeks', '1 month', '3 months', 'As needed', 'No follow-up'];

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
  const { patients, prescriptions, labOrders, vitals, visits, addPrescription, addVitals, upsertPatient, addVisit, updateVisit, showToast } = useAppStore();
  const { user } = useAuthStore();
  const { settings: pad, clinics, recordPrescriptionUsage } = usePadStore();
  const [selectedClinicId, setSelectedClinicId] = useState<string>(clinics[0]?.id ?? '');
  const activeClinic = clinics.find(c => c.id === selectedClinicId) ?? clinics[0];

  const patient = patients.find(p => p.id === patientId);
  const prevRx = prescriptions[patientId ?? ''] ?? [];
  const prevLabs = labOrders[patientId ?? ''] ?? [];
  const prevVitals = (vitals[patientId ?? ''] ?? []).slice(-1)[0];

  const [draft, setDraft] = useState<ConsultDraft>({ ...BLANK_DRAFT });
  const [saving, setSaving] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
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
    setEditVisitId(todayVisit.id);
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
    set('rxRows', draft.rxRows.map(r => r.id === id ? { ...r, form, route: FORM_ROUTES[form] } : r));
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
      chiefComplaint: draft.chiefComplaint,
      hopi: draft.hopi,
      pastMedical: draft.pastMedical,
      pastSurgical: draft.pastSurgical,
      familyHistory: draft.familyHistory,
      socialHistory: draft.socialHistory,
      allergiesNote: draft.allergiesNote,
      currentMeds: draft.currentMeds,
      vitalsSnapshot: draft.vitals,
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
    };

    if (editVisitId) {
      updateVisit(editVisitId, visitPayload);
    } else {
      addVisit({ id: `visit-${Date.now()}`, ...visitPayload });
    }

    showToast(editVisitId ? 'Consultation updated' : 'Consultation saved', 'success');
    setSaving(false);
    // Auto-print consultation sheet, then navigate back
    setTimeout(() => {
      window.print();
      setTimeout(() => navigate(`/app/patients/${patient.id}`), 500);
    }, 300);
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
  };
  const completePct = Math.round((Object.values(filled).filter(Boolean).length / Object.values(filled).length) * 100);

  if (!patient) {
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
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 min-w-0 flex-1">
            <div className="w-7 h-7 rounded-lg bg-navy-800 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {patient.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-auto">
              <div className="font-semibold text-slate-900 text-sm truncate leading-tight">{patient.name}</div>
              <div className="text-[11px] text-slate-500 leading-tight truncate">{patientAge}y · {patient.gender} · {patient.mrn}</div>
            </div>
            {/* Ward / clinic inline on mobile */}
            {isIPD ? (
              <div className="ml-auto flex items-center gap-1 bg-blue-50 rounded-lg px-2 py-0.5 flex-shrink-0">
                <BedDouble className="w-3 h-3 text-blue-600" />
                <span className="text-[11px] font-semibold text-blue-800">{patient.ward || 'Ward'}</span>
              </div>
            ) : clinics.length > 0 && (
              <select value={selectedClinicId} onChange={e => setSelectedClinicId(e.target.value)}
                className="ml-auto hidden sm:block text-[11px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-1.5 py-0.5 outline-none cursor-pointer min-w-0 flex-shrink max-w-28">
                {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>

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
              <button onClick={() => setShowPrint(true)} className="btn-secondary btn-sm p-2">
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
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20">

        {/* Edit-mode banner */}
        {editVisitId && (
          <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-sm text-amber-800">
            <CheckCircle2 className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span><strong>Editing today's consultation</strong> — changes will update the existing record, not create a new one.</span>
          </div>
        )}

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
                    onChange={e => setV(v.key, e.target.value)}
                    placeholder={v.placeholder}
                    className="input text-sm pr-8 text-center" />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">{v.unit}</span>
                </div>
              </div>
            ))}
          </div>
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
                <label className="text-xs font-medium text-slate-600 mb-1 block">{f.label}</label>
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
            {draft.rxRows.map((row, idx) => {
              const isLiquid = row.form === 'Syr' || row.form === 'Drops';
              const isMDI = row.form === 'MDI';
              const isCream = row.form === 'Cream';
              // Pediatric mL calc: if Syr + strength like "125mg/5mL" + dose in mg + weight
              let calcML: string | null = null;
              if (isPediatric && isLiquid && row.strength && row.dose && patientWeightKg) {
                const match = row.strength.match(/([\d.]+)\s*mg\s*\/\s*([\d.]+)\s*mL/i);
                if (match) {
                  const mgPerML = parseFloat(match[1]) / parseFloat(match[2]);
                  const doseMg = parseFloat(row.dose);
                  if (mgPerML && doseMg) calcML = (doseMg / mgPerML).toFixed(1);
                }
              }
              return (
              <div key={row.id} className="border border-slate-200 rounded-xl bg-slate-50 overflow-hidden">
                {/* Form selector row */}
                <div className="flex items-center gap-0 border-b border-slate-200">
                  <div className="px-2.5 py-1.5 text-xs font-bold text-slate-400 flex-shrink-0 w-7 text-center">{idx + 1}</div>
                  <div className="flex gap-0.5 px-1 py-1 flex-wrap">
                    {RX_FORMS.map(f => (
                      <button key={f} type="button" onClick={() => updateRxForm(row.id, f)}
                        className={cn('px-2.5 py-1 text-xs font-bold rounded-md transition-all',
                          row.form === f
                            ? f === 'Syr' ? 'bg-blue-500 text-white'
                              : f === 'MDI' ? 'bg-violet-500 text-white'
                              : f === 'Inj' ? 'bg-red-500 text-white'
                              : f === 'Cream' ? 'bg-pink-500 text-white'
                              : 'bg-teal-500 text-white'
                            : 'text-slate-500 hover:bg-slate-200')}>
                        {f}
                      </button>
                    ))}
                  </div>
                  {draft.rxRows.length > 1 && (
                    <button type="button" onClick={() => removeRx(row.id)}
                      className="ml-auto mr-2 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {/* Fields */}
                <div className="p-2.5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                  <div className="col-span-2 lg:col-span-2">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wide">
                      Drug Name *
                      {isPediatric && <span className="ml-1 text-violet-500">Pediatric</span>}
                    </label>
                    <DrugAutocomplete
                      value={row.drug}
                      onChange={(val, kb?: DrugKB) => {
                        if (kb) {
                          updateRxMulti(row.id, {
                            drug: kb.name,
                            dose: kb.defaultDose,
                            route: kb.defaultRoute,
                            frequency: kb.defaultFrequency,
                            duration: kb.defaultDuration,
                            instructions: kb.defaultInstructions,
                          });
                        } else {
                          updateRx(row.id, 'drug', val);
                        }
                      }}
                      placeholder={
                        row.form === 'Syr' ? 'Amoxicillin Syr' :
                        row.form === 'MDI' ? 'Salbutamol MDI' :
                        row.form === 'Drops' ? 'Otrivin Nasal Drops' :
                        row.form === 'Cream' ? 'Betamethasone Cream' :
                        row.form === 'Inj' ? 'Ceftriaxone Inj' :
                        'Paracetamol'
                      }
                    />
                  </div>

                  {/* Dose */}
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase tracking-wide">
                      {isMDI ? 'Dose (mcg)' : isCream ? 'Amount' : isLiquid ? 'Dose (mg)' : 'Dose'}
                    </label>
                    <input value={row.dose} onChange={e => updateRx(row.id, 'dose', e.target.value)}
                      placeholder={isMDI ? '100 mcg' : isCream ? 'Apply thin layer' : row.form === 'Drops' ? '2 drops' : '500 mg'}
                      className="input text-sm w-full" />
                  </div>

                  {/* Strength / puffs / mL */}
                  {isLiquid && (
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase tracking-wide">Strength</label>
                      <input value={row.strength} onChange={e => updateRx(row.id, 'strength', e.target.value)}
                        placeholder="125mg/5mL" className="input text-sm w-full" />
                    </div>
                  )}
                  {isMDI && (
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase tracking-wide">Puffs</label>
                      <input value={row.puffs} onChange={e => updateRx(row.id, 'puffs', e.target.value)}
                        placeholder="2 puffs" className="input text-sm w-full" />
                    </div>
                  )}

                  {/* Route (hide for forms where it's obvious) */}
                  {!isLiquid && !isMDI && !isCream && (
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase tracking-wide">Route</label>
                      <select value={row.route} onChange={e => updateRx(row.id, 'route', e.target.value)} className="input text-sm w-full">
                        {ROUTES.map(r => <option key={r}>{r}</option>)}
                      </select>
                    </div>
                  )}

                  <div className="col-span-2 sm:col-span-4 lg:col-span-3">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wide">Frequency</label>
                    <FrequencyPicker value={row.frequency} onChange={v => updateRx(row.id, 'frequency', v)} />
                  </div>
                  <div className="col-span-2 sm:col-span-4 lg:col-span-3">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wide">Duration</label>
                    <DurationPicker value={row.duration} onChange={v => updateRx(row.id, 'duration', v)} />
                  </div>
                  <div className={cn('col-span-2', isLiquid || isMDI ? 'sm:col-span-4 lg:col-span-6' : 'sm:col-span-4 lg:col-span-3')}>
                    <label className="text-[10px] text-slate-400 uppercase tracking-wide">Instructions / Notes</label>
                    <input value={row.instructions} onChange={e => updateRx(row.id, 'instructions', e.target.value)}
                      placeholder={
                        isMDI ? 'Shake well, 2 puffs BD with spacer, rinse mouth after' :
                        isLiquid ? 'After food, shake well before use' :
                        isCream ? 'Apply thin layer twice daily, avoid eyes' :
                        'After food, with water'
                      }
                      className="input text-sm w-full" />
                  </div>
                </div>
                {/* Pediatric calc */}
                {isPediatric && isLiquid && (
                  <div className="px-2.5 pb-2 flex items-center gap-3 text-xs">
                    <span className="text-violet-600 font-semibold">Pediatric helper:</span>
                    {patientWeightKg && row.dose && (
                      <span className="text-slate-600">
                        Wt {patientWeightKg} kg · Dose {row.dose}
                        {calcML && <span className="ml-2 font-bold text-blue-700">→ {calcML} mL / dose</span>}
                        {!calcML && <span className="text-slate-400 ml-1">(add strength like 125mg/5mL to get mL)</span>}
                      </span>
                    )}
                    {!patientWeightKg && <span className="text-slate-400">Enter weight in vitals for mL calculation</span>}
                  </div>
                )}
              </div>
              );
            })}
            <button type="button" onClick={addRxRow}
              className="btn-secondary w-full border-dashed">
              <Plus className="w-4 h-4" /> Add Medication
            </button>

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
          <div className="pt-4 space-y-3">
            <div>
              <div className="text-xs font-medium text-slate-500 mb-2">Quick add</div>
              <div className="flex flex-wrap gap-2">
                {['BCG', 'OPV', 'COVID-19', 'Influenza', 'Tetanus (TT)', 'Hepatitis B', 'MMR', 'Typhoid', 'Rabies', 'Varicella'].map(v => (
                  <button key={v} type="button"
                    onClick={() => {
                      if (!vaccines.find(vx => vx.name === v)) {
                        setVaccines(vs => [...vs, {
                          id: `vax-${Date.now()}-${Math.random()}`,
                          name: v, givenDate: new Date().toISOString().slice(0, 10),
                          givenBy: user?.name ?? 'Doctor',
                        }]);
                      }
                    }}
                    className={cn('text-xs px-3 py-1.5 rounded-full border transition-all',
                      vaccines.find(vx => vx.name === v)
                        ? 'bg-teal-500 text-white border-teal-500'
                        : 'border-slate-300 text-slate-600 hover:border-teal-400 hover:text-teal-600')}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
            {/* Custom vaccine */}
            <div className="flex gap-2">
              <input value={customVaxName} onChange={e => setCustomVaxName(e.target.value)}
                placeholder="Other vaccine name…" className="input text-sm flex-1"
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
              }} className="btn-secondary btn-sm">
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
            {/* Added vaccines list */}
            {vaccines.length > 0 && (
              <div className="space-y-2">
                {vaccines.map(vax => (
                  <div key={vax.id} className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-xl px-3 py-2 flex-wrap">
                    <Syringe className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-teal-800 flex-1">{vax.name}</span>
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
                      className="p-1 text-red-400 hover:text-red-600 rounded-lg ml-auto">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>

        {/* 10. Procedures */}
        <Section id="s-proc" title="Procedures Performed" icon={Scissors} filled={procedures.length > 0}>
          <div className="pt-4 space-y-3">
            <div>
              <div className="text-xs font-medium text-slate-500 mb-2">Quick add</div>
              <div className="flex flex-wrap gap-2">
                {['Dressing', 'Suturing', 'IV Cannulation', 'Blood Draw', 'Nebulization', 'ECG', 'Urinary Catheter', 'Splinting', 'Incision & Drainage', 'NG Tube', 'Wound Debridement'].map(p => (
                  <button key={p} type="button"
                    onClick={() => {
                      if (!procedures.find(pr => pr.name === p)) {
                        setProcedures(ps => [...ps, {
                          id: `proc-${Date.now()}-${Math.random()}`,
                          name: p, time: new Date().toISOString(),
                          performedBy: user?.name ?? 'Doctor',
                        }]);
                      }
                    }}
                    className={cn('text-xs px-3 py-1.5 rounded-full border transition-all',
                      procedures.find(pr => pr.name === p)
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'border-slate-300 text-slate-600 hover:border-blue-400 hover:text-blue-600')}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            {/* Custom procedure */}
            <div className="flex gap-2">
              <input value={customProcName} onChange={e => setCustomProcName(e.target.value)}
                placeholder="Other procedure…" className="input text-sm flex-1"
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
              }} className="btn-secondary btn-sm">
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
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
                      className="p-1 text-red-400 hover:text-red-600 rounded-lg">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
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
        <PrintPreview patient={patient} draft={draft} pad={pad} clinicName={activeClinic?.name} clinicAddress={activeClinic?.address} clinicPhone={activeClinic?.phone} onClose={() => setShowPrint(false)} onWhatsApp={sendWhatsApp} />
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
    </div>
  );
}

// ─── Print Preview ─────────────────────────────────────────────────────────────

const THEME_COLORS: Record<string, string> = {
  teal: '#0d9488', navy: '#0a1628', maroon: '#7f1d1d', dark: '#1e293b',
};

interface PrintSections {
  complaint: boolean;
  diagnosis: boolean;
  rx: boolean;
  investigation: boolean;
  advice: boolean;
  followup: boolean;
  vitalsRow: boolean;
  hopi: boolean;
}

function PrintPreview({ patient, draft, pad, clinicName, clinicAddress, clinicPhone, onClose, onWhatsApp }: {
  patient: NonNullable<ReturnType<typeof useAppStore.getState>['patients'][0]>;
  draft: ConsultDraft;
  pad: ReturnType<typeof usePadStore.getState>['settings'];
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  onClose: () => void;
  onWhatsApp: () => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);
  const theme = THEME_COLORS[pad.theme] ?? THEME_COLORS.teal;
  const patientAge = typeof patient.age === 'number' ? patient.age : '';
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const [ps, setPs] = useState<PrintSections>({
    complaint: true,
    diagnosis: true,
    rx: true,
    investigation: true,
    advice: true,
    followup: true,
    vitalsRow: true,
    hopi: false,
  });

  function togglePs(key: keyof PrintSections) {
    setPs(s => ({ ...s, [key]: !s[key] }));
  }

  const SECTION_LABELS: { key: keyof PrintSections; label: string }[] = [
    { key: 'complaint', label: 'C/C' },
    { key: 'hopi', label: 'History' },
    { key: 'diagnosis', label: 'Diagnosis' },
    { key: 'rx', label: 'Rx' },
    { key: 'investigation', label: 'Investigations' },
    { key: 'advice', label: 'Advice' },
    { key: 'followup', label: 'Follow-up' },
    { key: 'vitalsRow', label: 'Vitals Row' },
  ];

  function doPrint() {
    const content = printRef.current?.innerHTML ?? '';
    const w = window.open('', '_blank', 'width=800,height=1100');
    if (!w) return;
    w.document.write(`
      <html><head><title>Prescription</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 20px; }
        .pad-header { border-bottom: 3px solid ${theme}; padding-bottom: 12px; margin-bottom: 12px; }
        .pad-name { color: ${theme}; font-size: 20px; font-weight: bold; }
        .pad-degrees { color: #444; font-size: 12px; }
        .pad-clinic { font-size: 14px; font-weight: 600; margin-top: 4px; }
        .pad-info { color: #555; font-size: 11px; }
        .pad-quote { color: ${theme}; font-style: italic; font-size: 11px; margin-top: 4px; }
        .pt-row { display: flex; gap: 24px; background: #f8f9fa; padding: 8px 12px; border-radius: 6px; margin: 12px 0; font-size: 12px; }
        .pt-row span { font-weight: 600; }
        .section-title { color: ${theme}; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; margin: 12px 0 4px; }
        .rx-symbol { color: ${theme}; font-size: 24px; font-weight: bold; margin: 12px 0 6px; }
        .rx-drug { margin: 6px 0; }
        .rx-drug-name { font-weight: 600; }
        .rx-drug-detail { color: #555; font-size: 12px; padding-left: 16px; }
        .footer { border-top: 1px solid #ddd; margin-top: 20px; padding-top: 8px; font-size: 10px; color: #777; }
        .sig-line { margin-top: 40px; border-top: 1px solid #333; width: 160px; font-size: 11px; color: #555; padding-top: 4px; }
        @page { margin: 10mm; }
      </style></head><body>${content}</body></html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 300);
  }

  const doctorDisplayName = pad.doctorName || 'Dr. ';

  return (
    <div className="fixed inset-0 z-50 flex bg-black/60" onClick={onClose}>
      <div className="ml-auto w-full max-w-2xl bg-white h-full overflow-y-auto shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}>
        {/* Preview toolbar */}
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between z-10">
          <span className="font-semibold text-slate-800">Prescription Preview</span>
          <div className="flex items-center gap-2">
            <button onClick={doPrint} className="btn-primary btn-sm">
              <Printer className="w-3.5 h-3.5" /> Print / PDF
            </button>
            <button onClick={() => { onClose(); onWhatsApp(); }} className="btn-secondary btn-sm text-emerald-700 border-emerald-300 hover:bg-emerald-50">
              <Send className="w-3.5 h-3.5" /> WhatsApp
            </button>
            <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Section toggles */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mr-1">Print sections:</span>
            {SECTION_LABELS.map(({ key, label }) => (
              <button key={key} type="button" onClick={() => togglePs(key)}
                className={cn('text-xs px-2.5 py-1 rounded-full border font-medium transition-all',
                  ps[key]
                    ? 'bg-teal-500 border-teal-500 text-white'
                    : 'bg-white border-slate-300 text-slate-400 line-through')}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* A5 paper preview */}
        <div className="flex-1 p-4 bg-slate-100 overflow-y-auto">
          <div ref={printRef} className="bg-white mx-auto shadow-xl p-6 max-w-lg"
            style={{ minHeight: '700px', fontSize: '13px', fontFamily: 'Arial, sans-serif' }}>

            {/* Pad header */}
            <div className="pad-header pb-3 mb-3" style={{ borderBottom: `3px solid ${theme}` }}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="pad-name" style={{ color: theme, fontSize: '20px', fontWeight: 'bold' }}>
                    {doctorDisplayName}
                  </div>
                  {pad.degrees && <div className="text-slate-600 text-xs">{pad.degrees}</div>}
                  {pad.specialty && <div className="text-slate-600 text-xs font-medium">{pad.specialty}</div>}
                  {pad.regNumber && <div className="text-slate-400 text-xs">Reg: {pad.regNumber}</div>}
                  {pad.showQuote && pad.quote && <div className="italic text-xs mt-1" style={{ color: theme }}>"{pad.quote}"</div>}
                </div>
                <div className="text-right text-xs text-slate-500">
                  {(clinicName || pad.clinicName) && <div className="font-semibold text-slate-700">{clinicName || pad.clinicName}</div>}
                  {(clinicAddress || pad.address) && <div>{clinicAddress || pad.address}</div>}
                  {(clinicPhone || pad.phone) && <div>📞 {clinicPhone || pad.phone}</div>}
                  {pad.email && <div>✉ {pad.email}</div>}
                  {pad.showTimings && pad.timings && <div>⏰ {pad.timings}</div>}
                </div>
              </div>
            </div>

            {/* Patient row */}
            <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded px-3 py-2 text-xs mb-3">
              <div><span className="text-slate-400">Patient: </span><span className="font-semibold">{patient.name}</span></div>
              <div><span className="text-slate-400">Age/Sex: </span><span className="font-semibold">{patientAge}Y/{patient.gender}</span></div>
              <div><span className="text-slate-400">Date: </span><span className="font-semibold">{today}</span></div>
              {patient.mrn && <div><span className="text-slate-400">MRN: </span><span className="font-semibold">{patient.mrn}</span></div>}
              {ps.vitalsRow && draft.vitals.bp && <div><span className="text-slate-400">BP: </span><span className="font-semibold">{draft.vitals.bp}</span></div>}
              {ps.vitalsRow && draft.vitals.weight && <div><span className="text-slate-400">Wt: </span><span className="font-semibold">{draft.vitals.weight}kg</span></div>}
              {ps.vitalsRow && draft.vitals.hr && <div><span className="text-slate-400">HR: </span><span className="font-semibold">{draft.vitals.hr} bpm</span></div>}
              {ps.vitalsRow && draft.vitals.spo2 && <div><span className="text-slate-400">SpO2: </span><span className="font-semibold">{draft.vitals.spo2}%</span></div>}
            </div>

            {/* Complaint */}
            {ps.complaint && draft.chiefComplaint && (
              <div className="mb-2">
                <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: theme }}>C/C</div>
                <div className="text-sm">{draft.chiefComplaint}</div>
              </div>
            )}

            {/* History / HOPI */}
            {ps.hopi && draft.hopi && (
              <div className="mb-2">
                <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: theme }}>History</div>
                <div className="text-sm">{draft.hopi}</div>
              </div>
            )}

            {/* Diagnosis */}
            {ps.diagnosis && draft.diagnosis && (
              <div className="mb-3">
                <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: theme }}>Diagnosis</div>
                <div className="text-sm font-medium">{draft.diagnosis} {draft.icdCode && `(${draft.icdCode})`}</div>
                {draft.secondaryDx && <div className="text-xs text-slate-600 mt-0.5">{draft.secondaryDx}</div>}
              </div>
            )}

            {/* Rx */}
            {ps.rx && draft.rxRows.some(r => r.drug.trim()) && (
              <div className="mb-3">
                <div className="text-xl font-bold mb-2" style={{ color: theme }}>℞</div>
                {draft.rxRows.filter(r => r.drug.trim()).map((r, i) => (
                  <div key={r.id} className="mb-2.5">
                    <div className="font-semibold text-sm">
                      {i + 1}. {r.form && r.form !== 'Tab' ? `${r.form}. ` : 'Tab. '}{r.drug}
                      {r.dose && ` ${r.dose}`}
                      {r.strength && ` (${r.strength})`}
                    </div>
                    <div className="text-xs text-slate-600 pl-4">
                      {r.form === 'MDI' && r.puffs ? `${r.puffs} · ` : ''}
                      {r.route && r.form !== 'MDI' && r.form !== 'Cream' ? `${r.route} · ` : ''}
                      {r.frequency} · {r.duration}
                      {r.instructions && <> · {r.instructions}</>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Investigations */}
            {ps.investigation && draft.investigation && (
              <div className="mb-3">
                <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: theme }}>Investigations</div>
                <div className="text-sm">{draft.investigation}</div>
              </div>
            )}

            {/* Advice */}
            {ps.advice && draft.advice && (
              <div className="mb-3">
                <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: theme }}>Advice</div>
                <div className="text-sm">{draft.advice}</div>
              </div>
            )}

            {/* Follow-up */}
            {ps.followup && draft.followUp && draft.followUp !== 'No follow-up' && (
              <div className="mb-4">
                <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: theme }}>Follow-up</div>
                <div className="text-sm">After <strong>{draft.followUp}</strong>
                  {draft.referredTo && <> · Refer to: {draft.referredTo}</>}
                </div>
              </div>
            )}

            {/* Custom fields */}
            {pad.customFields.map(cf => cf.label && (
              <div key={cf.label} className="mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase">{cf.label}: </span>
                <span className="text-sm">{cf.value}</span>
              </div>
            ))}

            {/* Signature */}
            <div className="mt-8 flex justify-end">
              <div className="text-center">
                <div className="w-36 border-t border-slate-400 pt-1 text-xs text-slate-500">
                  {doctorDisplayName}<br />
                  {pad.degrees && <span className="text-slate-400">{pad.degrees}</span>}
                </div>
              </div>
            </div>

            {/* Footer */}
            {pad.footerNote && (
              <div className="mt-4 pt-2 border-t border-slate-200 text-xs text-slate-400 text-center">
                {pad.footerNote}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
