import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowLeft, Activity, Pill, FlaskConical, MessageSquare, ClipboardList, FileText, Info, Send, Plus, AlertTriangle, Printer, History, Syringe, Scissors, Camera, Skull, Calendar, MoreVertical, Upload, CheckCircle2, AlertCircle, Eye } from 'lucide-react';
import { useAppStore, uid, nowIso } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { api, isApiEnabled } from '@/lib/api';
import { connectSocket, joinPatientRoom, leavePatientRoom, emitChatMessage } from '@/lib/socket';
import { usePadStore } from '@/store/usePadStore';
import { PrintPreview } from '@/components/PrintPreview';
import { PriorityBadge, StatusBadge, LabStatusBadge } from '@/components/ui/Badge';
import { ScheduleModal } from '@/components/ScheduleModal';
import { Modal } from '@/components/ui/Modal';
import { cn, formatDateTime } from '@/lib/utils';
import type { AppointmentEntry } from '@/types';

type Tab = 'overview' | 'vitals' | 'prescriptions' | 'labs' | 'notes' | 'chat' | 'history' | 'appointments';

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { patients, vitals, prescriptions, labOrders, nursingNotes, chatMessages, visits, appointments, nursingPhotos, addVitals, addPrescription, addLabOrder, updateLabResult, setChatMessages, addNursingPhoto, upsertPatient, updateAppointment, showToast, setVitals, setPrescriptions, setLabOrders, setPatientVisits } = useAppStore();
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>((searchParams.get('tab') as Tab) || 'overview');
  const [chatInput, setChatInput] = useState('');
  const [deathModal, setDeathModal] = useState(false);
  const [deathDate, setDeathDate] = useState(new Date().toISOString().slice(0, 16));
  const [deathCause, setDeathCause] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const [ipdMenuOpen, setIpdMenuOpen] = useState(false);
  const [showTopPrint, setShowTopPrint] = useState(false);
  const { settings: padTop } = usePadStore();

  const patient = patients.find(p => p.id === id);

  // Fetch patient-specific clinical data from backend on mount (vitals/rx/labs are not part of syncFromBackend)
  useEffect(() => {
    if (!id || !isApiEnabled()) return;
    api.get<any[]>(`/vitals/patient/${id}`).then(rows => {
      if (rows.length > 0) setVitals(id, rows);
    }).catch(() => {});
    api.get<any[]>(`/prescriptions/patient/${id}`).then(rows => {
      if (rows.length > 0) setPrescriptions(id, rows.map(r => ({
        id: r.id, patientId: r.patient_id, drug: r.drug, dose: r.dose ?? '',
        route: r.route ?? '', frequency: r.frequency ?? '', duration: r.duration ?? '',
        instructions: r.instructions ?? '', status: r.status ?? 'active',
        time: r.prescribed_at ?? r.created_at, prescribedBy: r.doctor_name ?? '',
      })));
    }).catch(() => {});
    api.get<any[]>(`/labs/patient/${id}`).then(rows => {
      if (rows.length > 0) setLabOrders(id, rows.map(r => ({
        id: r.id, patientId: r.patient_id, testName: r.test_name, panel: r.panel ?? '',
        orderedBy: r.ordered_by ?? '', orderedAt: r.ordered_at ?? r.created_at,
        status: r.status ?? 'ordered', urgency: r.urgency ?? 'routine',
        result: r.result ?? '', unit: r.unit ?? '', refRange: r.ref_range ?? '',
        critical: r.critical ?? false, resultTime: r.result_time ?? '',
        reportDataUrl: r.report_data_url ?? '',
      })));
    }).catch(() => {});
    // Visits for this patient — includes orphaned visits saved with empty clinic_id (solo practice)
    api.get<any[]>(`/visits/patient/${id}`).then(rows => {
      if (rows.length > 0) setPatientVisits(id, rows as any);
    }).catch(() => {});
    // Care-team chat history for this patient
    api.get<any[]>(`/chat/${id}`).then(rows => {
      if (rows.length > 0) setChatMessages(id, rows as any);
    }).catch(() => {});
    // Live updates: join this patient's real-time room (chat + vitals from other staff)
    connectSocket();
    joinPatientRoom(id);
    return () => { leavePatientRoom(id); };
  }, [id]);

  // While the Care Team Chat tab is open, poll so messages/notes from other
  // devices appear without a manual refresh. Merge by id so a just-sent
  // optimistic message is never dropped before it's persisted.
  useEffect(() => {
    if (tab !== 'chat' || !id || !isApiEnabled()) return;
    const iv = setInterval(() => {
      api.get<any[]>(`/chat/${id}`).then(rows => {
        const cur = useAppStore.getState().chatMessages[id] ?? [];
        const serverIds = new Set(rows.map(r => r.id));
        const localOnly = cur.filter(m => !serverIds.has(m.id));
        const merged = [...rows, ...localOnly].sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));
        setChatMessages(id, merged as any);
      }).catch(() => {});
    }, 5000);
    return () => clearInterval(iv);
  }, [id, tab]);

  if (!patient) return (
    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
      <AlertTriangle className="w-10 h-10 mb-3" />
      <p>Patient not found</p>
      <Link to="/app/patients" className="btn-secondary btn-sm mt-4">← Back to patients</Link>
    </div>
  );

  const ptVisits = visits[id!] || [];

  // Merge vitals from visit snapshots (handles cross-device / missing addVitals calls)
  const rawVitals = vitals[id!] || [];
  const snapshotVitals = ptVisits
    .filter(v => v.vitalsSnapshot && Object.values(v.vitalsSnapshot as Record<string, string>).some(Boolean))
    .map(v => {
      const vs = v.vitalsSnapshot as Record<string, string>;
      return {
        id: `snap-${v.id}`, patientId: id!, time: v.date, recordedBy: v.doctorName ?? 'Doctor',
        bp: vs.bp || '', pulse: vs.hr ? +vs.hr : undefined, temp: vs.temp ? +vs.temp : undefined,
        spo2: vs.spo2 ? +vs.spo2 : undefined, rr: vs.rr ? +vs.rr : undefined, weight: vs.weight ? +vs.weight : undefined,
      };
    })
    .filter(s => {
      // Skip if rawVitals already has an entry with same BP within 10 minutes (addVitals called on finalize)
      const snapMs = new Date(s.time).getTime();
      return !rawVitals.some((r: any) =>
        r.bp === s.bp && Math.abs(new Date(r.time).getTime() - snapMs) < 10 * 60 * 1000
      );
    });
  const ptVitals = [...rawVitals, ...snapshotVitals]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  // Merge drugs from visits into Rx tab
  const rawRx = prescriptions[id!] || [];
  const rawRxIds = new Set(rawRx.map((r: any) => r.id));
  const visitDrugs = ptVisits.flatMap(v =>
    (v.drugs ?? []).map((d: any, i: number) => ({
      id: `visit-${v.id}-${i}`, patientId: id!, time: v.date, status: 'active',
      drug: d.drug || '',
      form: d.form || 'Tab',
      dose: d.dose || '', route: d.route || 'Oral', frequency: d.frequency || '',
      duration: d.duration || '', instructions: d.instructions || '',
      prescribedBy: v.doctorName ?? 'Doctor',
    }))
  ).filter(d => !rawRxIds.has(d.id));
  const ptRx = [...rawRx, ...visitDrugs]
    .sort((a: any, b: any) => new Date(b.time).getTime() - new Date(a.time).getTime());

  // Merge investigation text from visits into Labs tab
  const rawLabs = labOrders[id!] || [];
  const rawLabIds = new Set(rawLabs.map((l: any) => l.id));
  const visitLabs = ptVisits
    .filter(v => v.investigation?.trim())
    .flatMap(v =>
      String(v.investigation).split(/[,\n]+/).map((t: string) => t.trim()).filter(Boolean).map((t: string, i: number) => ({
        id: `visit-lab-${v.id}-${i}`, patientId: id!, testName: t, panel: '',
        orderedBy: v.doctorName ?? 'Doctor', orderedAt: v.date, status: 'ordered',
      }))
    )
    .filter(l => !rawLabIds.has(l.id));
  const ptLabs = [...rawLabs, ...visitLabs]
    .sort((a: any, b: any) => new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime());
  const ptNotes = nursingNotes[id!] || [];
  const ptChat = chatMessages[id!] || [];

  const isIPD = patient.status === 'IPD' || patient.status === 'Critical';
  // Nurses are vitals + "given" only — no consult / prescribe / print / discharge.
  const isNurse = user?.role === 'nurse';

  const ALL_TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }>; ipdOnly?: boolean }[] = [
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'history', label: 'Visit History', icon: History },
    { id: 'vitals', label: 'Vitals', icon: Activity },
    { id: 'prescriptions', label: 'Rx', icon: Pill },
    { id: 'labs', label: 'Labs', icon: FlaskConical },
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'notes', label: 'Notes', icon: ClipboardList, ipdOnly: true },
    { id: 'chat', label: 'Care Team Chat', icon: MessageSquare, ipdOnly: true },
  ];
  const TABS = ALL_TABS.filter(t => !t.ipdOnly || isIPD);

  function confirmDeath() {
    upsertPatient({ ...patient!, status: 'Deceased', deathDate: deathDate.replace('T', ' '), deathCause });
    setDeathModal(false);
    showToast('Patient record updated', 'success');
  }

  function sendChat() {
    if (!chatInput.trim() || !user) return;
    // Send over the socket — the backend persists it and echoes to the whole
    // care team (including us), which adds it to the store with a stable id.
    emitChatMessage(id!, chatInput.trim());
    setChatInput('');
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start gap-4 mb-5">
        <Link to="/app/patients" className="btn-ghost btn-sm mt-0.5">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900">{patient.name}</h1>
            <StatusBadge status={patient.status} />
            <PriorityBadge priority={patient.priority} />
            {patient.allergies && patient.allergies.length > 0 && (
              <span className="badge bg-red-100 text-red-700">
                ⚠ Allergy: {patient.allergies.join(', ')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1 text-xs text-slate-500 flex-wrap">
            <span>{patient.age}y · {patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : 'Other'}</span>
            <span>MRN: {patient.mrn}</span>
            {patient.bloodGroup && <span>Blood: {patient.bloodGroup}</span>}
            {isIPD && patient.ward && <span>Ward: {patient.ward} · Bed: {patient.bed}</span>}
            {isIPD && patient.admitDate && <span>Admitted: {patient.admitDate}</span>}
            {patient.status === 'Deceased' && patient.deathDate && <span className="text-red-500">Deceased: {patient.deathDate}</span>}
            {patient.status === 'Deceased' && patient.deathCause && <span className="text-slate-600">Cause: {patient.deathCause}</span>}
            {patient.insurance && <span>Insurance: {patient.insurance}</span>}
          </div>
        </div>
        {!isNurse && (
        <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
          <button onClick={() => setShowTopPrint(true)} className="btn-secondary btn-sm hidden sm:flex">
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
          {patient.status !== 'Deceased' && (
            <button onClick={() => setShowSchedule(true)} className="btn-secondary btn-sm">
              <Calendar className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Schedule</span>
            </button>
          )}
          {patient.status !== 'Deceased' && patient.status !== 'Discharged' && (
            <Link to={`/app/consult/${id}`} className="btn-primary btn-sm">
              <FileText className="w-3.5 h-3.5" /> Consult
            </Link>
          )}
          {/* Desktop: show buttons inline */}
          {isIPD && (
            <Link to={`/app/discharge?pid=${id}`} className="btn-secondary btn-sm hidden sm:flex">
              <FileText className="w-3.5 h-3.5" /> Discharge
            </Link>
          )}
          {patient.status !== 'Deceased' && (
            <button onClick={() => setDeathModal(true)} className="btn-sm bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-200 transition-colors hidden sm:flex">
              <Skull className="w-3.5 h-3.5" />
            </button>
          )}
          {/* Mobile: 3-dot kebab */}
          <div className="relative sm:hidden">
            <button onClick={() => setIpdMenuOpen(o => !o)}
              className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
              <MoreVertical className="w-4 h-4" />
            </button>
            {ipdMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIpdMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden w-48">
                  <button onClick={() => { setShowTopPrint(true); setIpdMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50">
                    <Printer className="w-4 h-4 text-slate-400" />
                    Print Prescription
                  </button>
                  {isIPD && (
                    <Link to={`/app/discharge?pid=${id}`}
                      onClick={() => setIpdMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 border-t border-slate-100">
                      <FileText className="w-4 h-4 text-slate-400" />
                      Discharge Patient
                    </Link>
                  )}
                  {patient.status !== 'Deceased' && (
                    <button onClick={() => { setDeathModal(true); setIpdMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 border-t border-slate-100">
                      <Skull className="w-4 h-4" />
                      Record Death
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        )}
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm -mx-4 md:-mx-5 px-3 md:px-4 mb-5 border-b border-slate-100 shadow-[0_1px_8px_rgba(0,0,0,0.06)]">
        <div className="flex gap-0.5 overflow-x-auto scrollbar-hide py-2">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 cursor-pointer min-h-[40px]',
                tab === t.id
                  ? 'bg-teal-500 text-white shadow-sm shadow-teal-200 font-semibold'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              )}>
              <t.icon className="w-3.5 h-3.5 flex-shrink-0" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === 'overview' && <OverviewTab patient={patient} />}
      {tab === 'history' && <VisitsTab visits={visits[id!] ?? []} patient={patient} />}
      {tab === 'vitals' && <VitalsTab vitals={ptVitals} patientId={id!} onAdd={addVitals} showToast={showToast} />}
      {tab === 'prescriptions' && <PrescriptionsTab rx={ptRx} patientId={id!} doctorName={user?.name || ''} onAdd={addPrescription} showToast={showToast} readOnly={isNurse} />}
      {tab === 'labs' && <LabsTab labs={ptLabs} patientId={id!} doctorName={user?.name || ''} onAdd={addLabOrder} onUpdateResult={updateLabResult} showToast={showToast} readOnly={isNurse} />}
      {tab === 'appointments' && (
        <AppointmentsTab
          appointments={appointments.filter(a => a.patientId === id)}
          onCancel={aptId => updateAppointment(aptId, { status: 'cancelled' })}
          onSchedule={() => setShowSchedule(true)}
        />
      )}
      {tab === 'notes' && <NotesTab notes={ptNotes} patientId={id!} nursePhotos={nursingPhotos[id!] ?? []} onAddPhoto={addNursingPhoto} nurseUser={user} />}
      {tab === 'chat' && (
        <ChatTab
          messages={ptChat}
          currentUser={user!}
          input={chatInput}
          onInputChange={setChatInput}
          onSend={sendChat}
        />
      )}

      {showSchedule && (
        <ScheduleModal
          patientId={id!}
          patientName={patient.name}
          patientAge={patient.age}
          defaultReason={(visits[id!] ?? [])[0]?.chiefComplaint ?? ''}
          onClose={() => setShowSchedule(false)}
        />
      )}

      {/* Mark Deceased modal */}
      <Modal
        open={deathModal}
        onClose={() => setDeathModal(false)}
        title="Record Death"
        footer={
          <>
            <button onClick={() => setDeathModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={confirmDeath} className="btn-sm bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg">Confirm</button>
          </>
        }
      >
        <div className="space-y-4 py-1">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            This will mark <strong>{patient.name}</strong> as deceased. This action updates the patient record permanently.
          </div>
          <div>
            <label className="label">Date &amp; Time of Death</label>
            <input type="datetime-local" value={deathDate} onChange={e => setDeathDate(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Cause of Death</label>
            <input type="text" value={deathCause} onChange={e => setDeathCause(e.target.value)} placeholder="e.g. Cardiac arrest, Sepsis…" className="input" />
          </div>
        </div>
      </Modal>

      {/* Top-level Print button → latest visit on customised PAD */}
      {showTopPrint && (() => {
        const ptVisits = visits[id!] ?? [];
        const latest = [...ptVisits].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        const vs = latest?.vitalsSnapshot ?? {};
        const draft = {
          chiefComplaint: latest?.chiefComplaint ?? '',
          hopi: latest?.hopi ?? '',
          diagnosis: latest?.diagnosis ?? '',
          icdCode: latest?.icdCode ?? '',
          secondaryDx: latest?.secondaryDx ?? '',
          rxRows: (latest?.drugs ?? []).map((d: any, i: number) => ({
            id: String(i), form: d.form ?? 'Tab', drug: d.drug ?? '',
            dose: d.dose ?? '', strength: d.strength ?? '', puffs: d.puffs ?? '',
            route: d.route ?? 'Oral', frequency: d.frequency ?? '',
            duration: d.duration ?? '', instructions: d.instructions ?? '',
          })),
          vitals: { bp: vs.bp ?? '', hr: vs.hr ?? '', temp: vs.temp ?? '',
            spo2: vs.spo2 ?? '', weight: vs.weight ?? '', height: vs.height ?? '', rr: vs.rr ?? '' },
          investigation: latest?.investigation ?? '',
          advice: latest?.advice ?? '',
          followUp: latest?.followUp ?? '',
          referredTo: latest?.referral?.specialty ?? '',
        };
        return (
          <PrintPreview
            pad={padTop}
            patient={patient}
            draft={draft}
            onClose={() => setShowTopPrint(false)}
          />
        );
      })()}
    </div>
  );
}

// ─── Tab: Visit History ───────────────────────────────────────────────────────


function VisitsTab({ visits, patient }: { visits: any[]; patient: any }) {
  const sorted = [...visits].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const [selected, setSelected] = useState<string>(sorted[0]?.id ?? '');
  const visit = sorted.find(v => v.id === selected) ?? sorted[0];
  const { settings: pad, clinics } = usePadStore();
  const [showPrint, setShowPrint] = useState(false);

  // Map a stored visit into the PrintPreview "draft" shape so it prints on the customised PAD
  function visitToDraft(v: any) {
    const vs = v?.vitalsSnapshot ?? {};
    return {
      chiefComplaint: v?.chiefComplaint ?? '',
      hopi: v?.hopi ?? '',
      diagnosis: v?.diagnosis ?? '',
      icdCode: v?.icdCode ?? '',
      secondaryDx: v?.secondaryDx ?? '',
      rxRows: (v?.drugs ?? []).map((d: any, i: number) => ({
        id: String(i),
        form: d.form ?? 'Tab',
        drug: d.drug ?? '',
        dose: d.dose ?? '',
        strength: d.strength ?? '',
        puffs: d.puffs ?? '',
        route: d.route ?? 'Oral',
        frequency: d.frequency ?? '',
        duration: d.duration ?? '',
        instructions: d.instructions ?? '',
      })),
      vitals: {
        bp: vs.bp ?? '', hr: vs.hr ?? '', temp: vs.temp ?? '', spo2: vs.spo2 ?? '',
        weight: vs.weight ?? '', height: vs.height ?? '', rr: vs.rr ?? '',
      },
      investigation: v?.investigation ?? '',
      advice: v?.advice ?? '',
      followUp: v?.followUp ?? '',
      referredTo: v?.referral?.specialty ?? '',
    };
  }

  if (visits.length === 0) {
    return (
      <div className="text-center py-16">
        <History className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">No visit records yet</p>
        <p className="text-slate-400 text-sm mt-1">Consult the patient to record their first visit.</p>
      </div>
    );
  }

  const vDate = (v: any) => new Date(v.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const vTime = (v: any) => new Date(v.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const vs = visit.vitalsSnapshot;
  const hasVitals = vs && Object.values(vs).some(Boolean);

  const hasHistory = visit.hopi || visit.pastMedical || visit.pastSurgical || visit.familyHistory || visit.socialHistory || visit.allergiesNote || visit.currentMeds;
  const hasExam = visit.generalExam || visit.systemicExam || visit.investigation
    || (visit.bodySigns?.length ?? 0) > 0
    || Object.values(visit.bodyNotes ?? {}).some(Boolean);

  /* ── shared label style ── */
  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">{children}</div>
  );

  return (
    <div className="flex flex-col sm:flex-row sm:gap-4 sm:items-start gap-3">

      {/* ── Visit timeline ──────────────────────────────────────────── */}
      {/* Mobile: horizontal scroll chips */}
      <div className="sm:hidden">
        <div className="text-xs font-semibold text-slate-400 mb-2 px-0.5">{sorted.length} visit{sorted.length !== 1 ? 's' : ''}</div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-0.5 px-0.5 scrollbar-hide">
          {sorted.map((v, idx) => {
            const isSelected = v.id === selected;
            const isLatest = idx === 0;
            return (
              <button key={v.id} onClick={() => setSelected(v.id)}
                className={cn(
                  'flex-shrink-0 rounded-2xl px-4 py-2.5 transition-all border text-left min-w-[130px] cursor-pointer',
                  isSelected
                    ? 'bg-teal-500 border-teal-500 shadow-md shadow-teal-100'
                    : 'bg-white border-slate-200 hover:border-teal-300'
                )}>
                <div className={cn('text-xs font-bold', isSelected ? 'text-white' : 'text-slate-800')}>{vDate(v)}</div>
                <div className={cn('text-[10px] mt-0.5 truncate', isSelected ? 'text-teal-100' : 'text-slate-400')}>
                  {v.diagnosis || v.chiefComplaint || 'Consultation'}
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  {isLatest && (
                    <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full', isSelected ? 'bg-white/25 text-white' : 'bg-teal-100 text-teal-700')}>
                      LATEST
                    </span>
                  )}
                  {v.drugs?.length > 0 && (
                    <span className={cn('text-[10px] flex items-center gap-0.5', isSelected ? 'text-teal-100' : 'text-slate-400')}>
                      <Pill className="w-2.5 h-2.5" />{v.drugs.length}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop: vertical sidebar */}
      <div className="hidden sm:block w-52 flex-shrink-0 space-y-1.5">
        <div className="text-xs font-semibold text-slate-400 px-1 mb-2">{sorted.length} visit{sorted.length !== 1 ? 's' : ''}</div>
        {sorted.map((v, idx) => {
          const isSelected = v.id === selected;
          const isLatest = idx === 0;
          return (
            <button key={v.id} onClick={() => setSelected(v.id)}
              className={cn('w-full text-left rounded-xl px-3 py-2.5 transition-all border cursor-pointer',
                isSelected
                  ? 'bg-teal-500 text-white border-teal-500 shadow-sm shadow-teal-100'
                  : 'bg-white border-slate-200 hover:border-teal-300 hover:bg-teal-50'
              )}>
              <div className={cn('text-xs font-bold', isSelected ? 'text-white' : 'text-slate-800')}>{vDate(v)}</div>
              <div className={cn('text-[11px] mt-0.5 truncate', isSelected ? 'text-teal-100' : 'text-slate-400')}>
                {v.diagnosis || v.chiefComplaint || 'Consultation'}
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                {isLatest && (
                  <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full', isSelected ? 'bg-white/25 text-white' : 'bg-teal-100 text-teal-700')}>
                    LATEST
                  </span>
                )}
                {v.drugs?.length > 0 && (
                  <span className={cn('text-[10px] flex items-center gap-0.5', isSelected ? 'text-teal-100' : 'text-slate-400')}>
                    <Pill className="w-2.5 h-2.5" />{v.drugs.length}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Consultation sheet ──────────────────────────────────────── */}
      {visit && (
        <div className="flex-1 min-w-0 rounded-2xl border border-slate-200 overflow-hidden shadow-sm">

          {/* Header */}
          <div className="bg-gradient-to-br from-[#0a7b6e] to-[#0d9488] px-5 py-4 text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-widest text-teal-200/80 mb-1">Consultation Sheet</div>
                <div className="text-base font-bold leading-tight">{vDate(visit)}</div>
                <div className="text-xs text-teal-200 mt-0.5">{vTime(visit)} &nbsp;·&nbsp; Dr. {visit.doctorName}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {visit.drugs?.length > 0 && (
                  <button onClick={() => setShowPrint(true)}
                    className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/20 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer">
                    <Printer className="w-3.5 h-3.5" /> Print Rx
                  </button>
                )}
                {visit.admitted && (
                  <span className="text-[10px] font-semibold bg-white/15 border border-white/20 text-white px-2.5 py-1 rounded-xl">Admitted</span>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 space-y-4 bg-white">

            {/* Chief Complaint */}
            {visit.chiefComplaint && (
              <div className="bg-slate-50 rounded-xl px-4 py-3">
                <SectionLabel>Chief Complaint</SectionLabel>
                <p className="text-sm text-slate-800 font-medium leading-relaxed">{visit.chiefComplaint}</p>
              </div>
            )}

            {/* Diagnosis */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
              <SectionLabel>Diagnosis</SectionLabel>
              <div className="text-sm font-bold text-slate-900 leading-snug">{visit.diagnosis || '—'}</div>
              {visit.icdCode && <div className="text-xs text-slate-400 mt-1">ICD-10: {visit.icdCode}</div>}
              {visit.secondaryDx && <div className="text-xs text-slate-500 mt-1 pt-1 border-t border-emerald-100">Secondary: {visit.secondaryDx}</div>}
            </div>

            {/* Vitals */}
            {hasVitals && (
              <div>
                <SectionLabel>Vitals</SectionLabel>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[
                    { label: 'BP', value: vs.bp, unit: 'mmHg' },
                    { label: 'Pulse', value: vs.hr, unit: 'bpm' },
                    { label: 'Temp', value: vs.temp, unit: '°C' },
                    { label: 'SpO₂', value: vs.spo2, unit: '%' },
                    { label: 'RR', value: vs.rr, unit: '/min' },
                    { label: 'Weight', value: vs.weight, unit: 'kg' },
                  ].filter(i => i.value).map(i => (
                    <div key={i.label} className="bg-slate-50 border border-slate-100 rounded-xl px-2 py-2 text-center">
                      <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">{i.label}</div>
                      <div className="text-sm font-bold text-slate-800 mt-0.5">{i.value}</div>
                      <div className="text-[9px] text-slate-400">{i.unit}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prescription */}
            {visit.drugs?.length > 0 && (
              <div>
                <SectionLabel>Prescription</SectionLabel>
                <div className="space-y-2">
                  {visit.drugs.map((d: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 bg-teal-50 border border-teal-100 rounded-xl px-3 py-2.5">
                      <div className="w-5 h-5 rounded-full bg-teal-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-900 text-sm leading-snug">
                          {d.form && d.form !== 'Tab' ? `${d.form}. ` : 'Tab. '}{d.drug}
                          {d.dose && <span className="font-normal text-slate-600"> · {d.dose}</span>}
                          {(d as any).strength && <span className="text-xs text-slate-400"> ({(d as any).strength})</span>}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {d.frequency}{d.duration ? ` · ${d.duration}` : ''}
                          {d.instructions && <span className="text-slate-400 italic"> · {d.instructions}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Investigations */}
            {visit.investigation && (
              <div className="bg-slate-50 rounded-xl px-4 py-3">
                <SectionLabel>Investigations</SectionLabel>
                <p className="text-sm text-slate-700 leading-relaxed">{visit.investigation}</p>
              </div>
            )}

            {/* History */}
            {hasHistory && (
              <div className="border border-slate-100 rounded-xl px-4 py-3 space-y-2">
                <SectionLabel>History</SectionLabel>
                {visit.hopi && <p className="text-xs text-slate-600 leading-relaxed"><span className="font-semibold text-slate-500">HoPi: </span>{visit.hopi}</p>}
                {visit.pastMedical && <p className="text-xs text-slate-600"><span className="font-semibold text-slate-500">Past Medical: </span>{visit.pastMedical}</p>}
                {visit.pastSurgical && <p className="text-xs text-slate-600"><span className="font-semibold text-slate-500">Surgical: </span>{visit.pastSurgical}</p>}
                {visit.familyHistory && <p className="text-xs text-slate-600"><span className="font-semibold text-slate-500">Family: </span>{visit.familyHistory}</p>}
                {visit.socialHistory && <p className="text-xs text-slate-600"><span className="font-semibold text-slate-500">Social: </span>{visit.socialHistory}</p>}
                {visit.currentMeds && <p className="text-xs text-slate-600"><span className="font-semibold text-slate-500">Current Meds: </span>{visit.currentMeds}</p>}
                {visit.allergiesNote && <p className="text-xs text-red-600 font-medium bg-red-50 rounded-lg px-2 py-1"><span className="font-bold">Allergies: </span>{visit.allergiesNote}</p>}
              </div>
            )}

            {/* Examination */}
            {hasExam && (
              <div className="border border-slate-100 rounded-xl px-4 py-3 space-y-2">
                <SectionLabel>Examination</SectionLabel>
                {visit.generalExam && <p className="text-xs text-slate-600"><span className="font-semibold text-slate-500">General: </span>{visit.generalExam}</p>}
                {visit.systemicExam && <p className="text-xs text-slate-600"><span className="font-semibold text-slate-500">Systemic: </span>{visit.systemicExam}</p>}
                {visit.bodySigns?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {(visit.bodySigns as string[]).map(s => (
                      <span key={s} className="text-xs bg-red-50 border border-red-200 text-red-700 px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                  </div>
                )}
                {visit.bodyNotes && Object.values(visit.bodyNotes).some(Boolean) && (
                  <div className="grid grid-cols-2 gap-1.5 mt-1">
                    {Object.entries(visit.bodyNotes as Record<string, string>).filter(([, v]) => v.trim()).map(([region, note]) => (
                      <div key={region} className="bg-teal-50 rounded-lg px-2.5 py-1.5">
                        <span className="text-[9px] font-bold uppercase text-teal-600 block">{region.replace(/-/g, ' ')}</span>
                        <span className="text-xs text-slate-700">{note}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Advice & Follow-up */}
            {(visit.advice || visit.followUp) && (
              <div className="space-y-2">
                {visit.advice && (
                  <div className="bg-slate-50 rounded-xl px-4 py-3">
                    <SectionLabel>Advice</SectionLabel>
                    <p className="text-sm text-slate-700 leading-relaxed">{visit.advice}</p>
                  </div>
                )}
                {visit.followUp && (
                  <div className="flex items-center gap-2 text-xs text-teal-700 bg-teal-50 border border-teal-100 rounded-xl px-4 py-2.5">
                    <Activity className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Follow-up: <span className="font-bold">{visit.followUp}</span></span>
                  </div>
                )}
              </div>
            )}

            {/* Vaccines */}
            {visit.vaccines?.length > 0 && (
              <div>
                <SectionLabel>Vaccines</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {visit.vaccines.map((v: any) => (
                    <span key={v.id} className="inline-flex items-center gap-1.5 text-xs bg-teal-50 text-teal-700 border border-teal-200 px-3 py-1.5 rounded-full">
                      <Syringe className="w-3 h-3" />
                      {v.name}{v.site ? ` (${v.site})` : ''}{v.nextDueDate ? ` · Next: ${v.nextDueDate}` : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Procedures */}
            {visit.procedures?.length > 0 && (
              <div>
                <SectionLabel>Procedures</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {visit.procedures.map((p: any) => (
                    <span key={p.id} className="inline-flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-full">
                      <Scissors className="w-3 h-3" />
                      {p.name}{p.notes ? ` · ${p.notes}` : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Referral */}
            {visit.referral?.specialty && (
              <div className="bg-violet-50 border border-violet-100 rounded-xl px-4 py-3">
                <SectionLabel>Referral</SectionLabel>
                <div className="text-sm font-semibold text-violet-900">
                  {visit.referral.doctorName ? `Dr. ${visit.referral.doctorName}, ` : ''}{visit.referral.specialty}
                </div>
                {visit.referral.reason && <div className="text-xs text-violet-600 mt-1">{visit.referral.reason}</div>}
                {visit.referral.urgency && (
                  <span className="text-[10px] font-bold bg-violet-200 text-violet-700 px-2 py-0.5 rounded-full mt-1.5 inline-block">{visit.referral.urgency}</span>
                )}
              </div>
            )}

            {/* Attachments */}
            {visit.attachments?.length > 0 && (
              <div>
                <SectionLabel>Attachments</SectionLabel>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {visit.attachments.map((a: any) => (
                    <a key={a.id} href={a.dataUrl} target="_blank" rel="noreferrer"
                      className="rounded-xl overflow-hidden border border-slate-200 hover:border-teal-400 transition-colors cursor-pointer">
                      {a.type === 'photo' || a.type === 'xray' ? (
                        <img src={a.dataUrl} alt={a.label} className="w-full h-16 object-cover" />
                      ) : (
                        <div className="w-full h-16 flex items-center justify-center bg-slate-50">
                          <FileText className="w-5 h-5 text-slate-400" />
                        </div>
                      )}
                      <div className="text-[10px] text-slate-500 px-1.5 py-1 truncate">{a.label}</div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Private note */}
            {visit.privateNote && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                <SectionLabel>Private Note</SectionLabel>
                <p className="text-sm text-amber-900 leading-relaxed">{visit.privateNote}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customised PAD print preview for this visit */}
      {showPrint && visit && (
        <PrintPreview
          patient={patient}
          draft={visitToDraft(visit)}
          pad={pad}
          clinicName={clinics[0]?.name}
          clinicAddress={clinics[0]?.address}
          clinicPhone={clinics[0]?.phone}
          onClose={() => setShowPrint(false)}
        />
      )}
    </div>
  );
}

// ─── Tab: Appointments ───────────────────────────────────────────────────────

const APT_STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-teal-50 text-teal-700 border-teal-200',
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-slate-100 text-slate-400 border-slate-200',
  'no-show': 'bg-rose-50 text-rose-700 border-rose-200',
};

function AppointmentsTab({ appointments, onCancel, onSchedule }: {
  appointments: AppointmentEntry[];
  onCancel: (id: string) => void;
  onSchedule: () => void;
}) {
  const sorted = [...appointments].sort((a, b) => (a.date + a.time) > (b.date + b.time) ? -1 : 1);

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-800">Appointments</h3>
          <p className="text-xs text-slate-400">{appointments.length} total</p>
        </div>
        <button onClick={onSchedule} className="btn-primary btn-sm flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" /> Schedule Visit
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Calendar className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No appointments scheduled</p>
          <button onClick={onSchedule} className="btn-secondary btn-sm mt-3">Schedule first visit</button>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(apt => {
            const upcoming = apt.status === 'scheduled' || apt.status === 'confirmed';
            return (
              <div key={apt.id} className={cn('border rounded-xl px-4 py-3 flex items-start justify-between gap-4', APT_STATUS_COLORS[apt.status] || 'bg-slate-50 border-slate-200')}>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">
                      {apt.date} · {apt.time}
                    </span>
                    <span className={cn('text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border', APT_STATUS_COLORS[apt.status])}>
                      {apt.status}
                    </span>
                  </div>
                  <div className="text-sm text-slate-700">{apt.reason}</div>
                  {apt.clinicName && (
                    <div className="text-xs text-slate-500">{apt.clinicName}</div>
                  )}
                  {apt.notes && (
                    <div className="text-xs text-slate-400 italic">{apt.notes}</div>
                  )}
                </div>
                {upcoming && (
                  <button
                    onClick={() => onCancel(apt.id)}
                    className="flex-shrink-0 text-xs text-rose-500 hover:text-rose-700 font-medium"
                  >
                    Cancel
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────

function OverviewTab({ patient }: { patient: ReturnType<typeof useAppStore.getState>['patients'][0] }) {
  const { vitals, staff, assignNurse, showToast } = useAppStore();
  const latest = vitals[patient.id]?.[0];
  const isIPD = patient.status === 'IPD' || patient.status === 'Critical';
  const nurses = staff.filter(s => s.role === 'nurse' && s.status === 'active');
  const [nurseOpen, setNurseOpen] = useState(false);

  const items = latest ? [
    { label: 'Blood Pressure', value: latest.bp || '—', alert: latest.bp && parseInt(latest.bp) > 160 },
    { label: 'Pulse', value: latest.pulse ? `${latest.pulse} bpm` : '—', alert: latest.pulse && (latest.pulse > 100 || latest.pulse < 50) },
    { label: 'Temperature', value: latest.temp ? `${latest.temp} °F` : '—', alert: latest.temp && latest.temp > 100 },
    { label: 'SpO2', value: latest.spo2 ? `${latest.spo2}%` : '—', alert: latest.spo2 && latest.spo2 < 94 },
    { label: 'Resp. Rate', value: latest.rr ? `${latest.rr} /min` : '—', alert: latest.rr && latest.rr > 24 },
    { label: 'Blood Sugar', value: latest.sugar ? `${latest.sugar} mg/dL` : '—', alert: latest.sugar && latest.sugar > 250 },
  ] : [];

  const infoRows = [
    { l: 'Full Name', v: patient.name },
    { l: 'Age / Gender', v: `${patient.age}y · ${patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : 'Other'}` },
    { l: 'MRN', v: patient.mrn },
    { l: 'Blood Group', v: patient.bloodGroup || '—' },
    { l: 'Phone', v: patient.phone || '—' },
    { l: 'Insurance', v: patient.insurance || '—' },
    { l: 'Attending', v: patient.attendingDoctor || '—' },
  ];

  const visitRows = [
    { l: 'Status',     v: patient.status,               show: true },
    { l: 'Priority',   v: patient.priority,             show: true },
    { l: 'Diagnosis',  v: patient.diagnosis || '—',     show: true },
    { l: 'Ward',       v: patient.ward || '—',          show: isIPD },
    { l: 'Bed',        v: patient.bed || '—',           show: isIPD },
    { l: 'Admit Date', v: patient.admitDate || '—',     show: isIPD },
    { l: 'Attending',  v: patient.attendingDoctor || '—', show: true },
  ].filter(i => i.show);

  return (
    <div className="space-y-4 lg:grid lg:grid-cols-3 lg:gap-5 lg:space-y-0">

      {/* Patient Information */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60">
          <h3 className="text-sm font-bold text-slate-800">Patient Information</h3>
        </div>
        <div className="px-4 py-3 divide-y divide-slate-50">
          {infoRows.map(i => (
            <div key={i.l} className="flex items-center justify-between gap-3 py-2.5">
              <span className="text-xs text-slate-400 font-medium flex-shrink-0">{i.l}</span>
              <span className="text-sm font-semibold text-slate-800 text-right truncate">{i.v}</span>
            </div>
          ))}
          {patient.allergies && patient.allergies.length > 0 && (
            <div className="py-2.5">
              <span className="text-xs font-bold text-red-600 flex items-center gap-1 mb-1.5">
                <AlertTriangle className="w-3 h-3" /> Allergies
              </span>
              <div className="flex flex-wrap gap-1">
                {patient.allergies.map(a => (
                  <span key={a} className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">{a}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Visit / Admission */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60">
          <h3 className="text-sm font-bold text-slate-800">{isIPD ? 'Admission Details' : 'Visit Details'}</h3>
        </div>
        <div className="px-4 py-3 divide-y divide-slate-50">
          {visitRows.map(i => (
            <div key={i.l} className="flex items-center justify-between gap-3 py-2.5">
              <span className="text-xs text-slate-400 font-medium flex-shrink-0">{i.l}</span>
              <span className="text-sm font-semibold text-slate-800 text-right">{i.v}</span>
            </div>
          ))}

          {/* Assigned Nurse — assign so the nurse sees this patient in their portal */}
          <div className="py-2.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-slate-400 font-medium flex-shrink-0">Assigned Nurse</span>
              {patient.assignedNurseName
                ? <span className="text-sm font-semibold text-teal-700 text-right">{patient.assignedNurseName}</span>
                : <span className="text-sm text-slate-400 text-right">Not assigned</span>}
            </div>
            {nurses.length > 0 ? (
              <div className="relative mt-2">
                <button
                  type="button"
                  onClick={() => setNurseOpen(o => !o)}
                  className="text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg px-2.5 py-1.5"
                >
                  {patient.assignedNurseName ? 'Reassign nurse' : 'Assign nurse'}
                </button>
                {nurseOpen && (
                  <div className="absolute z-20 mt-1 left-0 w-56 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg py-1">
                    {nurses.map(n => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => {
                          assignNurse(patient.id, n.id, n.name);
                          showToast(`Assigned to ${n.name}`, 'success');
                          setNurseOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-teal-50 flex items-center justify-between gap-2"
                      >
                        <span>{n.name}</span>
                        {patient.assignedNurseId === n.id && <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 mt-1">No nurses on staff yet — add one in Settings → My Staff.</p>
            )}
          </div>
        </div>
      </div>

      {/* Latest Vitals */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60">
          <h3 className="text-sm font-bold text-slate-800">Latest Vitals</h3>
          {latest && <p className="text-[11px] text-slate-400 mt-0.5">{formatDateTime(latest.time)} · {latest.recordedBy}</p>}
        </div>
        <div className="p-4">
          {latest ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {items.map(v => (
                <div key={v.label} className={cn('rounded-xl p-3 text-center', v.alert ? 'bg-red-50 border border-red-200' : 'bg-slate-50 border border-slate-100')}>
                  <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{v.label}</div>
                  <div className={cn('text-base font-black mt-0.5 leading-tight', v.alert ? 'text-red-600' : 'text-slate-900')}>{v.value}</div>
                  {v.alert && <div className="text-[9px] text-red-500 font-semibold mt-0.5">High</div>}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-400 text-center py-8">No vitals recorded yet</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Vitals ─────────────────────────────────────────────────────────────

function VitalsTab({ vitals, patientId, onAdd, showToast }: { vitals: any[]; patientId: string; onAdd: (v: any) => void; showToast: (m: string, t?: any) => void }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuthStore();
  const [form, setForm] = useState({ bp: '', pulse: '', temp: '', spo2: '', rr: '', sugar: '', notes: '' });

  function submit() {
    onAdd({ id: uid(), patientId, time: nowIso(), recordedBy: user?.name || 'Staff', ...form, pulse: form.pulse ? +form.pulse : undefined, temp: form.temp ? +form.temp : undefined, spo2: form.spo2 ? +form.spo2 : undefined, rr: form.rr ? +form.rr : undefined, sugar: form.sugar ? +form.sugar : undefined });
    showToast('Vitals recorded', 'success');
    setOpen(false);
    setForm({ bp: '', pulse: '', temp: '', spo2: '', rr: '', sugar: '', notes: '' });
  }

  const VITAL_META = [
    { key: 'bp',    label: 'BP',      unit: 'mmHg', alert: (v: any) => v.bp && parseInt(v.bp) > 160 },
    { key: 'pulse', label: 'Pulse',   unit: 'bpm',  alert: (v: any) => v.pulse && (v.pulse > 100 || v.pulse < 50) },
    { key: 'temp',  label: 'Temp',    unit: '°F',   alert: (v: any) => v.temp && v.temp > 100 },
    { key: 'spo2',  label: 'SpO₂',   unit: '%',    alert: (v: any) => v.spo2 && v.spo2 < 94 },
    { key: 'rr',    label: 'RR',      unit: '/min', alert: () => false },
    { key: 'sugar', label: 'Sugar',   unit: 'mg/dL', alert: (v: any) => v.sugar && v.sugar > 250 },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-slate-400">{vitals.length} reading{vitals.length !== 1 ? 's' : ''} recorded</p>
        <button onClick={() => setOpen(true)} className="btn-primary btn-sm">
          <Plus className="w-4 h-4" /> Record Vitals
        </button>
      </div>

      {vitals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-14 text-center">
          <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No vitals recorded yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {vitals.map(v => (
            <div key={v.id} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/80 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-600">{formatDateTime(v.time)}</span>
                <span className="text-[11px] text-slate-400">by {v.recordedBy}</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-0 divide-x divide-slate-100">
                {VITAL_META.map(m => {
                  const val = v[m.key as keyof typeof v];
                  const isAlert = m.alert(v);
                  if (!val) return (
                    <div key={m.key} className="px-3 py-2.5 text-center">
                      <div className="text-[9px] font-bold uppercase text-slate-300 tracking-wide">{m.label}</div>
                      <div className="text-sm text-slate-300 mt-0.5">—</div>
                    </div>
                  );
                  return (
                    <div key={m.key} className={cn('px-3 py-2.5 text-center', isAlert ? 'bg-red-50' : '')}>
                      <div className={cn('text-[9px] font-bold uppercase tracking-wide', isAlert ? 'text-red-400' : 'text-slate-400')}>{m.label}</div>
                      <div className={cn('text-sm font-bold mt-0.5', isAlert ? 'text-red-600' : 'text-slate-800')}>{String(val)}</div>
                      <div className={cn('text-[9px]', isAlert ? 'text-red-400' : 'text-slate-400')}>{m.unit}</div>
                    </div>
                  );
                })}
              </div>
              {v.notes && <div className="px-4 py-2 text-xs text-slate-500 border-t border-slate-100 bg-slate-50/50">{v.notes}</div>}
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Record Vitals"
        footer={<><button onClick={() => setOpen(false)} className="btn-secondary">Cancel</button><button onClick={submit} className="btn-primary">Save</button></>}>
        <div className="grid grid-cols-2 gap-4">
          {[['Blood Pressure', 'bp', '120/80'], ['Pulse (bpm)', 'pulse', '72'], ['Temperature (°F)', 'temp', '98.6'], ['SpO2 (%)', 'spo2', '98'], ['Resp. Rate (/min)', 'rr', '16'], ['Blood Sugar (mg/dL)', 'sugar', '100']].map(([label, key, ph]) => (
            <div key={key}>
              <label className="label">{label}</label>
              <input className="input" placeholder={ph as string} value={(form as any)[key as string]} onChange={e => setForm(f => ({ ...f, [key as string]: e.target.value }))} />
            </div>
          ))}
          <div className="col-span-2">
            <label className="label">Notes</label>
            <textarea className="input resize-none h-16" placeholder="Optional notes…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Tab: Prescriptions ───────────────────────────────────────────────────────

function PrescriptionsTab({ rx, patientId, doctorName, onAdd, showToast, readOnly }: { rx: any[]; patientId: string; doctorName: string; onAdd: (r: any) => void; showToast: (m: string, t?: any) => void; readOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ drug: '', dose: '', route: 'Oral', frequency: 'OD', duration: '', instructions: '' });

  const routes = ['Oral', 'IV', 'IM', 'SC', 'SL', 'Topical', 'Inhaled', 'Rectal'];
  const freqs = ['OD', 'BD', 'TDS', 'QID', 'Q6H', 'Q8H', 'Q12H', 'SOS', 'Stat', 'Per sliding scale'];

  function submit() {
    if (!form.drug || !form.dose) return;
    onAdd({ id: uid(), patientId, ...form, prescribedBy: doctorName, time: nowIso(), status: 'active' });
    showToast('Prescription added', 'success');
    setOpen(false);
    setForm({ drug: '', dose: '', route: 'Oral', frequency: 'OD', duration: '', instructions: '' });
  }

  // Group by date (YYYY-MM-DD)
  const grouped = rx.reduce((acc: Record<string, any[]>, r: any) => {
    const day = (r.time || r.date || '').slice(0, 10);
    (acc[day] = acc[day] || []).push(r);
    return acc;
  }, {});
  const sortedDays = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-slate-400">{rx.length} prescription{rx.length !== 1 ? 's' : ''}</p>
        {!readOnly && (
          <button onClick={() => setOpen(true)} className="btn-primary btn-sm">
            <Plus className="w-4 h-4" /> Add Rx
          </button>
        )}
      </div>

      {rx.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-14 text-center">
          <Pill className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No prescriptions yet</p>
        </div>
      ) : (
        <div className="space-y-5">
          {sortedDays.map(day => (
            <div key={day}>
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-xs font-bold text-slate-600 bg-slate-100 rounded-lg px-2.5 py-1">
                  {new Date(day).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
                <span className="text-[10px] text-slate-400">{grouped[day].length} drug{grouped[day].length !== 1 ? 's' : ''}</span>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden divide-y divide-slate-100">
                {grouped[day].map((r: any, i: number) => (
                  <div key={r.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="w-6 h-6 rounded-full bg-teal-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900">
                          {r.form && r.form !== 'Tab' ? `${r.form}. ` : 'Tab. '}{r.drug}
                          {r.dose && <span className="font-normal text-slate-600"> · {r.dose}</span>}
                        </span>
                        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0', r.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
                          {r.status || 'active'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                        <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">{r.route || 'Oral'}</span>
                        <span className="text-xs text-slate-500">{r.frequency}{r.duration ? ` · ${r.duration}` : ''}</span>
                        {r.instructions && <span className="text-xs text-slate-400 italic">{r.instructions}</span>}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">by {r.prescribedBy}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add Prescription"
        footer={<><button onClick={() => setOpen(false)} className="btn-secondary">Cancel</button><button onClick={submit} className="btn-primary">Add</button></>}>
        <div className="space-y-4">
          <div>
            <label className="label">Drug Name *</label>
            <input className="input" placeholder="e.g. Tab. Amlodipine" value={form.drug} onChange={e => setForm(f => ({ ...f, drug: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Dose *</label>
              <input className="input" placeholder="e.g. 5mg" value={form.dose} onChange={e => setForm(f => ({ ...f, dose: e.target.value }))} />
            </div>
            <div>
              <label className="label">Route</label>
              <select className="input" value={form.route} onChange={e => setForm(f => ({ ...f, route: e.target.value }))}>
                {routes.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Frequency</label>
              <select className="input" value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}>
                {freqs.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Duration</label>
              <input className="input" placeholder="e.g. 5 days, Continued" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Instructions</label>
            <input className="input" placeholder="e.g. With food, After meals" value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} />
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Tab: Labs ────────────────────────────────────────────────────────────────

function LabsTab({ labs, patientId, doctorName, onAdd, onUpdateResult, showToast, readOnly }: {
  labs: any[]; patientId: string; doctorName: string;
  onAdd: (l: any) => void;
  onUpdateResult: (id: string, patientId: string, patch: any) => void;
  showToast: (m: string, t?: any) => void;
  readOnly?: boolean;
}) {
  const [orderOpen, setOrderOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [activeLab, setActiveLab] = useState<any>(null);
  const [orderForm, setOrderForm] = useState({ testName: '', panel: '' });
  const [resultForm, setResultForm] = useState({ result: '', unit: '', refRange: '', critical: false, reportDataUrl: '' });

  const COMMON = ['CBC', 'LFT', 'RFT', 'KFT', 'Blood Sugar (F/PP)', 'HbA1c', 'Lipid Profile', 'Thyroid (T3/T4/TSH)', 'S. Vitamin B12', 'S. Vitamin D', 'Urine R/M', 'Blood Culture', 'ECG', 'Chest X-Ray', 'USG Abdomen', '2D Echo', 'ABG'];

  function submitOrder() {
    if (!orderForm.testName) return;
    onAdd({ id: uid(), patientId, testName: orderForm.testName, panel: orderForm.panel, orderedBy: doctorName, orderedAt: nowIso(), status: 'ordered' });
    showToast('Lab order placed', 'success');
    setOrderOpen(false);
    setOrderForm({ testName: '', panel: '' });
  }

  function openResultModal(lab: any) {
    setActiveLab(lab);
    setResultForm({
      result: lab.result || '',
      unit: lab.unit || '',
      refRange: lab.refRange || '',
      critical: lab.critical || false,
      reportDataUrl: lab.reportDataUrl || '',
    });
    setResultOpen(true);
  }

  function submitResult() {
    if (!activeLab) return;
    onUpdateResult(activeLab.id, patientId, {
      result: resultForm.result || null,
      unit: resultForm.unit || null,
      refRange: resultForm.refRange || null,
      critical: resultForm.critical,
      reportDataUrl: resultForm.reportDataUrl || null,
      resultTime: nowIso(),
      status: 'resulted',
    });
    showToast('Result saved', 'success');
    setResultOpen(false);
    setActiveLab(null);
  }

  function handleReportUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setResultForm(f => ({ ...f, reportDataUrl: reader.result as string }));
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  const pending = labs.filter(l => !l.result);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{labs.length} test{labs.length !== 1 ? 's' : ''}</span>
          {pending.length > 0 && <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">{pending.length} pending</span>}
        </div>
        {!readOnly && (
          <button onClick={() => setOrderOpen(true)} className="btn-primary btn-sm">
            <Plus className="w-4 h-4" /> Order Lab
          </button>
        )}
      </div>

      {labs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-14 text-center">
          <FlaskConical className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No lab orders yet</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {labs.map(l => (
            <div key={l.id} className={cn('rounded-2xl border bg-white overflow-hidden transition-all', l.critical ? 'border-red-200' : 'border-slate-200')}>
              <div className="flex items-start gap-3 px-4 py-3">
                {/* Icon */}
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5',
                  l.result ? (l.critical ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600') : 'bg-slate-100 text-slate-400')}>
                  {l.result ? (l.critical ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />) : <FlaskConical className="w-4 h-4" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <span className="text-sm font-bold text-slate-900">{l.testName}</span>
                      {l.panel && <span className="text-xs text-slate-400 ml-1.5">({l.panel})</span>}
                    </div>
                    <LabStatusBadge status={l.status} />
                  </div>

                  {/* Result display */}
                  {l.result ? (
                    <div className={cn('mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5')}>
                      <span className={cn('text-base font-black', l.critical ? 'text-red-600' : 'text-slate-900')}>
                        {l.result} {l.unit}
                      </span>
                      {l.refRange && <span className="text-xs text-slate-400">Ref: {l.refRange}</span>}
                      {l.critical && <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">CRITICAL</span>}
                      {l.reportDataUrl && (
                        <a href={l.reportDataUrl} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal-600 hover:text-teal-700 cursor-pointer">
                          <Eye className="w-3 h-3" /> View Report
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 mt-1">Awaiting result</p>
                  )}

                  <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
                    <span className="text-[10px] text-slate-400">{l.orderedBy} · {formatDateTime(l.orderedAt)}</span>
                    {!readOnly && (
                      <button onClick={() => openResultModal(l)}
                        className="text-xs font-semibold text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1 rounded-lg transition-colors cursor-pointer">
                        {l.result ? 'Edit Result' : 'Enter Result'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Order modal */}
      <Modal open={orderOpen} onClose={() => setOrderOpen(false)} title="Order Lab Test"
        footer={<><button onClick={() => setOrderOpen(false)} className="btn-secondary">Cancel</button><button onClick={submitOrder} className="btn-primary">Order</button></>}>
        <div className="space-y-4">
          <div>
            <label className="label">Test Name *</label>
            <input className="input" placeholder="e.g. CBC" value={orderForm.testName} onChange={e => setOrderForm(f => ({ ...f, testName: e.target.value }))} />
          </div>
          <div>
            <label className="label">Common Tests</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {COMMON.map(t => (
                <button key={t} onClick={() => setOrderForm(f => ({ ...f, testName: t }))}
                  className={cn('text-xs px-3 py-1.5 rounded-xl border font-medium transition-colors cursor-pointer',
                    orderForm.testName === t ? 'bg-teal-500 text-white border-teal-500' : 'bg-white border-slate-200 text-slate-600 hover:border-teal-300 hover:text-teal-700')}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Panel / Category (optional)</label>
            <input className="input" placeholder="e.g. Haematology" value={orderForm.panel} onChange={e => setOrderForm(f => ({ ...f, panel: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* Result entry modal */}
      <Modal open={resultOpen} onClose={() => setResultOpen(false)} title={`Enter Result — ${activeLab?.testName ?? ''}`}
        footer={<><button onClick={() => setResultOpen(false)} className="btn-secondary">Cancel</button><button onClick={submitResult} className="btn-primary">Save Result</button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Result Value</label>
              <input className="input" placeholder="e.g. 12.5, Normal, Positive" value={resultForm.result} onChange={e => setResultForm(f => ({ ...f, result: e.target.value }))} />
            </div>
            <div>
              <label className="label">Unit</label>
              <input className="input" placeholder="e.g. g/dL, mg/dL" value={resultForm.unit} onChange={e => setResultForm(f => ({ ...f, unit: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Reference Range</label>
            <input className="input" placeholder="e.g. 11.5–16.5 g/dL" value={resultForm.refRange} onChange={e => setResultForm(f => ({ ...f, refRange: e.target.value }))} />
          </div>
          <label className="flex items-center gap-3 cursor-pointer group">
            <input type="checkbox" checked={resultForm.critical}
              onChange={e => setResultForm(f => ({ ...f, critical: e.target.checked }))}
              className="w-4 h-4 accent-red-500" />
            <span className="text-sm font-medium text-slate-700">Mark as Critical / Abnormal</span>
          </label>
          <div>
            <label className="label">Upload Report (optional)</label>
            <label className={cn('flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 cursor-pointer transition-colors',
              resultForm.reportDataUrl ? 'border-teal-300 bg-teal-50' : 'border-slate-200 hover:border-teal-300 bg-slate-50')}>
              {resultForm.reportDataUrl ? (
                <>
                  <CheckCircle2 className="w-6 h-6 text-teal-500" />
                  <span className="text-xs font-semibold text-teal-700">Report uploaded</span>
                  <span className="text-[10px] text-slate-400">Click to replace</span>
                </>
              ) : (
                <>
                  <Upload className="w-6 h-6 text-slate-300" />
                  <span className="text-xs text-slate-500">Upload PDF or image report</span>
                </>
              )}
              <input type="file" accept="image/*,application/pdf" onChange={handleReportUpload} className="hidden" />
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Tab: Notes ───────────────────────────────────────────────────────────────

function NotesTab({ notes, patientId, nursePhotos, onAddPhoto, nurseUser }: {
  notes: any[];
  patientId: string;
  nursePhotos: any[];
  onAddPhoto: (p: any) => void;
  nurseUser: any;
}) {
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onAddPhoto({
        id: `np-${Date.now()}`,
        patientId,
        dataUrl: reader.result as string,
        caption: file.name,
        takenAt: new Date().toISOString(),
        takenBy: nurseUser?.name ?? 'Nurse',
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      {/* Photo upload section */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
            <Camera className="w-4 h-4 text-teal-500" /> Nursing Photos
          </h4>
          <label className="btn-secondary btn-sm cursor-pointer flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5" />
            Add Photo
            <input type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} style={{ display: 'none' }} />
          </label>
        </div>
        {nursePhotos.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">No photos uploaded. Use a mobile device to capture wound/condition photos.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {nursePhotos.map((ph: any) => (
              <div key={ph.id} className="group relative">
                <img src={ph.dataUrl} alt={ph.caption} className="w-full h-24 object-cover rounded-lg border border-slate-200" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-end p-1.5">
                  <span className="text-white text-[10px] truncate">{ph.caption}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Nursing notes */}
      {notes.map(n => (
        <div key={n.id} className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="badge bg-teal-100 text-teal-700">{n.type}</span>
            <span className="text-xs text-slate-500">{formatDateTime(n.time)}</span>
            <span className="text-xs text-slate-400">by {n.by}</span>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">{n.note}</p>
        </div>
      ))}
      {notes.length === 0 && <div className="text-center py-4 text-slate-400 text-sm">No nursing notes</div>}
    </div>
  );
}

// ─── Tab: Chat ────────────────────────────────────────────────────────────────

function ChatTab({ messages, currentUser, input, onInputChange, onSend }: { messages: any[]; currentUser: any; input: string; onInputChange: (v: string) => void; onSend: () => void }) {
  return (
    <div className="flex flex-col h-[500px] card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 bg-slate-50">
        <MessageSquare className="w-4 h-4 text-teal-500" />
        <span className="font-semibold text-slate-900 text-sm">Care Team Chat</span>
        <span className="badge bg-emerald-100 text-emerald-700 ml-auto">Live</span>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map(m => {
          const isMe = m.senderId === currentUser?.id;
          return (
            <div key={m.id} className={cn('flex gap-3', isMe && 'flex-row-reverse')}>
              <div className="w-7 h-7 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-700 text-xs font-bold flex-shrink-0">
                {m.senderName.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
              </div>
              <div className={cn('max-w-[75%]', isMe && 'items-end flex flex-col')}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-slate-700">{m.senderName}</span>
                  <span className="badge bg-slate-100 text-slate-500 text-[10px] capitalize">{m.senderRole}</span>
                </div>
                <div className={cn('px-3 py-2 rounded-2xl text-sm', isMe ? 'bg-teal-500 text-white rounded-tr-sm' : m.type === 'order' ? 'bg-navy-800 text-white' : 'bg-slate-100 text-slate-800 rounded-tl-sm')}>
                  {m.type === 'order' && <div className="text-[10px] font-bold text-teal-400 mb-1 uppercase tracking-wide">⚡ Doctor Order</div>}
                  {m.message}
                </div>
                <span className="text-[10px] text-slate-400 mt-1">{formatDateTime(m.time)}</span>
              </div>
            </div>
          );
        })}
        {messages.length === 0 && <div className="text-center py-8 text-slate-400 text-sm">No messages yet. Start the conversation.</div>}
      </div>
      <div className="px-4 py-3 border-t border-slate-200 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => onInputChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSend()}
          placeholder="Type a message or order…"
          className="input flex-1"
        />
        <button onClick={onSend} disabled={!input.trim()} className="btn-primary">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
