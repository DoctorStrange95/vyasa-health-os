import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { ArrowLeft, Activity, Pill, FlaskConical, MessageSquare, ClipboardList, FileText, Info, Send, Plus, AlertTriangle, Printer, History, Syringe, Scissors, Camera, Skull, Calendar } from 'lucide-react';
import { useAppStore, uid, nowIso } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
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
  const { patients, vitals, prescriptions, labOrders, nursingNotes, chatMessages, visits, appointments, nursingPhotos, addVitals, addPrescription, addLabOrder, addChatMessage, addNursingPhoto, upsertPatient, updateAppointment, showToast } = useAppStore();
  const { user } = useAuthStore();
  const [tab, setTab] = useState<Tab>('overview');
  const [chatInput, setChatInput] = useState('');
  const [deathModal, setDeathModal] = useState(false);
  const [deathDate, setDeathDate] = useState(new Date().toISOString().slice(0, 16));
  const [deathCause, setDeathCause] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const [showTopPrint, setShowTopPrint] = useState(false);
  const { settings: padTop } = usePadStore();

  const patient = patients.find(p => p.id === id);
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
    addChatMessage({ id: uid(), patientId: id!, senderId: user.id, senderName: user.name, senderRole: user.role, message: chatInput.trim(), time: nowIso() });
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
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={cn('tab-btn flex items-center gap-1.5', tab === t.id && 'active')}>
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && <OverviewTab patient={patient} />}
      {tab === 'history' && <VisitsTab visits={visits[id!] ?? []} patient={patient} />}
      {tab === 'vitals' && <VitalsTab vitals={ptVitals} patientId={id!} onAdd={addVitals} showToast={showToast} />}
      {tab === 'prescriptions' && <PrescriptionsTab rx={ptRx} patientId={id!} doctorName={user?.name || ''} onAdd={addPrescription} showToast={showToast} />}
      {tab === 'labs' && <LabsTab labs={ptLabs} patientId={id!} doctorName={user?.name || ''} onAdd={addLabOrder} showToast={showToast} />}
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

  return (
    <div className="flex gap-4 items-start">
      {/* ── Visit timeline ── */}
      <div className="w-52 flex-shrink-0 space-y-1.5">
        <div className="text-xs font-semibold text-slate-500 px-1 mb-2">{sorted.length} visit{sorted.length !== 1 ? 's' : ''}</div>
        {sorted.map((v, idx) => {
          const isSelected = v.id === selected;
          const isLatest = idx === 0;
          return (
            <button key={v.id} onClick={() => setSelected(v.id)}
              className={cn('w-full text-left rounded-xl px-3 py-2.5 transition-all border',
                isSelected
                  ? 'bg-teal-500 text-white border-teal-500 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-teal-300 hover:bg-teal-50'
              )}>
              <div className={cn('text-xs font-semibold', isSelected ? 'text-white' : 'text-slate-800')}>
                {vDate(v)}
              </div>
              <div className={cn('text-[11px] mt-0.5 truncate', isSelected ? 'text-teal-100' : 'text-slate-400')}>
                {v.chiefComplaint || v.diagnosis || 'Consultation'}
              </div>
              <div className="flex items-center gap-2 mt-1">
                {isLatest && (
                  <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full', isSelected ? 'bg-white/20 text-white' : 'bg-teal-100 text-teal-700')}>
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

      {/* ── Consultation sheet ── */}
      {visit && (
        <div className="flex-1 min-w-0 card overflow-hidden">
          {/* Sheet header */}
          <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-4 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-teal-200 mb-1">Consultation Sheet</div>
                <div className="text-lg font-bold">{vDate(visit)} &nbsp;·&nbsp; {vTime(visit)}</div>
                <div className="text-sm text-teal-200 mt-0.5">Dr. {visit.doctorName}</div>
              </div>
              <div className="text-right flex-shrink-0 flex items-center gap-3">
                {visit.drugs?.length > 0 && (
                  <button
                    onClick={() => setShowPrint(true)}
                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors">
                    <Printer className="w-4 h-4" /> Print Rx
                  </button>
                )}
                {visit.admitted && (
                  <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">Admitted</span>
                )}
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">

            {/* Chief Complaint */}
            {visit.chiefComplaint && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Chief Complaint</div>
                <p className="text-sm text-slate-800 font-medium">{visit.chiefComplaint}</p>
              </div>
            )}

            {/* Diagnosis */}
            <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-orange-400 mb-1">Diagnosis</div>
              <div className="text-sm font-bold text-slate-900">{visit.diagnosis || '—'}</div>
              {visit.icdCode && <div className="text-xs text-slate-400 mt-0.5">ICD: {visit.icdCode}</div>}
              {visit.secondaryDx && <div className="text-xs text-slate-500 mt-1">Secondary: {visit.secondaryDx}</div>}
            </div>

            {/* Vitals */}
            {hasVitals && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Vitals</div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'BP', value: vs.bp, unit: 'mmHg' },
                    { label: 'Pulse', value: vs.hr, unit: 'bpm' },
                    { label: 'Temp', value: vs.temp, unit: '°F' },
                    { label: 'SpO2', value: vs.spo2, unit: '%' },
                    { label: 'RR', value: vs.rr, unit: '/min' },
                    { label: 'Weight', value: vs.weight, unit: 'kg' },
                  ].filter(i => i.value).map(i => (
                    <div key={i.label} className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 text-center min-w-[60px]">
                      <div className="text-[9px] text-slate-400 font-semibold uppercase">{i.label}</div>
                      <div className="text-sm font-bold text-slate-800">{i.value}</div>
                      <div className="text-[9px] text-slate-400">{i.unit}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prescription */}
            {visit.drugs?.length > 0 && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Prescription</div>
                <div className="space-y-1.5">
                  {visit.drugs.map((d: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2">
                      <div className="text-teal-500 font-bold text-xs flex-shrink-0 mt-0.5 w-8">Rx {i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-900 text-sm">
                          {d.form && d.form !== 'Tab' ? `${d.form}. ` : 'Tab. '}{d.drug}
                          {d.dose && <span className="font-normal text-slate-600"> {d.dose}</span>}
                          {(d as any).strength && <span className="text-xs text-slate-400"> ({(d as any).strength})</span>}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {d.frequency}{d.duration ? ` · ${d.duration}` : ''}
                          {d.instructions && <span className="text-slate-400 italic ml-1">· {d.instructions}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Investigations */}
            {visit.investigation && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Investigations</div>
                <p className="text-sm text-slate-700">{visit.investigation}</p>
              </div>
            )}

            {/* History (collapsed by default — show only if present) */}
            {hasHistory && (
              <div className="border border-slate-100 rounded-xl px-4 py-3 space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">History</div>
                {visit.hopi && <p className="text-xs text-slate-600"><span className="font-semibold text-slate-500">HoPi: </span>{visit.hopi}</p>}
                {visit.pastMedical && <p className="text-xs text-slate-600"><span className="font-semibold text-slate-500">Past Medical: </span>{visit.pastMedical}</p>}
                {visit.pastSurgical && <p className="text-xs text-slate-600"><span className="font-semibold text-slate-500">Surgical: </span>{visit.pastSurgical}</p>}
                {visit.familyHistory && <p className="text-xs text-slate-600"><span className="font-semibold text-slate-500">Family: </span>{visit.familyHistory}</p>}
                {visit.socialHistory && <p className="text-xs text-slate-600"><span className="font-semibold text-slate-500">Social: </span>{visit.socialHistory}</p>}
                {visit.currentMeds && <p className="text-xs text-slate-600"><span className="font-semibold text-slate-500">Current Meds: </span>{visit.currentMeds}</p>}
                {visit.allergiesNote && <p className="text-xs text-red-600 font-medium"><span className="font-bold">Allergies: </span>{visit.allergiesNote}</p>}
              </div>
            )}

            {/* Examination */}
            {hasExam && (
              <div className="border border-slate-100 rounded-xl px-4 py-3 space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Examination</div>
                {visit.generalExam && <p className="text-xs text-slate-600"><span className="font-semibold text-slate-500">General: </span>{visit.generalExam}</p>}
                {visit.systemicExam && <p className="text-xs text-slate-600"><span className="font-semibold text-slate-500">Systemic: </span>{visit.systemicExam}</p>}
                {visit.bodySigns?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {(visit.bodySigns as string[]).map(s => (
                      <span key={s} className="text-xs bg-red-50 border border-red-200 text-red-700 px-2 py-0.5 rounded-full">● {s}</span>
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
              <div>
                {visit.advice && (
                  <div className="mb-2">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Advice</div>
                    <p className="text-sm text-slate-700">{visit.advice}</p>
                  </div>
                )}
                {visit.followUp && (
                  <div className="flex items-center gap-2 text-xs text-teal-700 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2 w-fit">
                    <Activity className="w-3 h-3 flex-shrink-0" />
                    Follow-up: <span className="font-semibold">{visit.followUp}</span>
                  </div>
                )}
              </div>
            )}

            {/* Vaccines */}
            {visit.vaccines?.length > 0 && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Vaccines</div>
                <div className="flex flex-wrap gap-2">
                  {visit.vaccines.map((v: any) => (
                    <span key={v.id} className="text-xs bg-teal-50 text-teal-700 border border-teal-200 px-3 py-1.5 rounded-full">
                      <Syringe className="w-3 h-3 inline mr-1" />
                      {v.name}{v.site ? ` (${v.site})` : ''}{v.nextDueDate ? ` · Next: ${v.nextDueDate}` : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Procedures */}
            {visit.procedures?.length > 0 && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Procedures</div>
                <div className="flex flex-wrap gap-2">
                  {visit.procedures.map((p: any) => (
                    <span key={p.id} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-full">
                      <Scissors className="w-3 h-3 inline mr-1" />
                      {p.name}{p.notes ? ` · ${p.notes}` : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Referral */}
            {visit.referral?.specialty && (
              <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3">
                <div className="text-[10px] font-bold uppercase tracking-widest text-violet-400 mb-1">Referral</div>
                <div className="text-sm font-semibold text-violet-900">
                  {visit.referral.doctorName ? `Dr. ${visit.referral.doctorName}, ` : ''}{visit.referral.specialty}
                </div>
                {visit.referral.reason && <div className="text-xs text-violet-600 mt-0.5">{visit.referral.reason}</div>}
                {visit.referral.urgency && (
                  <span className="text-[10px] font-bold bg-violet-200 text-violet-700 px-2 py-0.5 rounded-full mt-1 inline-block">{visit.referral.urgency}</span>
                )}
              </div>
            )}

            {/* Attachments */}
            {visit.attachments?.length > 0 && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Attachments</div>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {visit.attachments.map((a: any) => (
                    <a key={a.id} href={a.dataUrl} target="_blank" rel="noreferrer"
                      className="rounded-xl overflow-hidden border border-slate-200 hover:border-teal-400 transition-colors">
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
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <div className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-1">Private Note</div>
                <p className="text-sm text-amber-900">{visit.privateNote}</p>
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
  const { vitals } = useAppStore();
  const latest = vitals[patient.id]?.[0];
  const isIPD = patient.status === 'IPD' || patient.status === 'Critical';

  const items = latest ? [
    { label: 'Blood Pressure', value: latest.bp || '—', alert: latest.bp && parseInt(latest.bp) > 160 },
    { label: 'Pulse', value: latest.pulse ? `${latest.pulse} bpm` : '—', alert: latest.pulse && (latest.pulse > 100 || latest.pulse < 50) },
    { label: 'Temperature', value: latest.temp ? `${latest.temp} °F` : '—', alert: latest.temp && latest.temp > 100 },
    { label: 'SpO2', value: latest.spo2 ? `${latest.spo2}%` : '—', alert: latest.spo2 && latest.spo2 < 94 },
    { label: 'Resp. Rate', value: latest.rr ? `${latest.rr} /min` : '—', alert: latest.rr && latest.rr > 24 },
    { label: 'Blood Sugar', value: latest.sugar ? `${latest.sugar} mg/dL` : '—', alert: latest.sugar && latest.sugar > 250 },
  ] : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Patient info card */}
      <div className="card p-5">
        <h3 className="font-bold text-slate-900 mb-4">Patient Information</h3>
        <div className="space-y-3">
          {[
            { l: 'Full Name', v: patient.name },
            { l: 'Age / Gender', v: `${patient.age} years · ${patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : 'Other'}` },
            { l: 'MRN', v: patient.mrn },
            { l: 'Blood Group', v: patient.bloodGroup || '—' },
            { l: 'Phone', v: patient.phone || '—' },
            { l: 'Insurance', v: patient.insurance || '—' },
            { l: 'Attending', v: patient.attendingDoctor || '—' },
          ].map(i => (
            <div key={i.l} className="flex justify-between gap-4">
              <span className="text-xs text-slate-500">{i.l}</span>
              <span className="text-sm font-medium text-slate-900 text-right">{i.v}</span>
            </div>
          ))}
          {patient.allergies && patient.allergies.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <span className="text-xs text-red-600 font-semibold">⚠ Allergies:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {patient.allergies.map(a => (
                  <span key={a} className="badge bg-red-100 text-red-700">{a}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Visit / Admission details — OPD vs IPD */}
      <div className="card p-5">
        <h3 className="font-bold text-slate-900 mb-4">
          {isIPD ? 'Admission Details' : 'Visit Details'}
        </h3>
        <div className="space-y-3">
          {[
            { l: 'Status',    v: patient.status,                    show: true },
            { l: 'Priority',  v: patient.priority,                  show: true },
            { l: 'Diagnosis', v: patient.diagnosis || '—',          show: true },
            { l: 'Ward',      v: patient.ward || '—',               show: isIPD },
            { l: 'Bed',       v: patient.bed || '—',                show: isIPD },
            { l: 'Admit Date', v: patient.admitDate || '—',         show: isIPD },
            { l: 'Attending', v: patient.attendingDoctor || '—',    show: true },
            { l: 'Insurance', v: patient.insurance || '—',          show: isIPD },
          ].filter(i => i.show).map(i => (
            <div key={i.l} className="flex justify-between gap-4">
              <span className="text-xs text-slate-500">{i.l}</span>
              <span className="text-sm font-medium text-slate-900 text-right">{i.v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Latest vitals */}
      <div className="card p-5">
        <h3 className="font-bold text-slate-900 mb-4">Latest Vitals</h3>
        {latest ? (
          <>
            <p className="text-xs text-slate-400 mb-3">{formatDateTime(latest.time)} · by {latest.recordedBy}</p>
            <div className="grid grid-cols-2 gap-3">
              {items.map(v => (
                <div key={v.label} className={cn('rounded-xl p-3', v.alert ? 'bg-red-50 border border-red-200' : 'bg-slate-50')}>
                  <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">{v.label}</div>
                  <div className={cn('text-lg font-black mt-0.5', v.alert ? 'text-red-600' : 'text-slate-900')}>{v.value}</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-sm text-slate-400 text-center py-6">No vitals recorded yet</div>
        )}
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

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => setOpen(true)} className="btn-primary btn-sm">
          <Plus className="w-4 h-4" /> Record Vitals
        </button>
      </div>
      <div className="table-wrapper">
        <table className="data-table">
          <thead><tr><th>Time</th><th>BP</th><th>Pulse</th><th>Temp</th><th>SpO2</th><th>RR</th><th>Sugar</th><th>By</th></tr></thead>
          <tbody>
            {vitals.map(v => (
              <tr key={v.id}>
                <td className="whitespace-nowrap text-xs">{formatDateTime(v.time)}</td>
                <td className={cn('font-semibold', v.alert ? 'text-red-600' : '')}>{v.bp || '—'}</td>
                <td>{v.pulse ? `${v.pulse} bpm` : '—'}</td>
                <td>{v.temp ? `${v.temp}°F` : '—'}</td>
                <td className={cn(v.spo2 && v.spo2 < 94 ? 'text-red-600 font-semibold' : '')}>{v.spo2 ? `${v.spo2}%` : '—'}</td>
                <td>{v.rr ? `${v.rr}/min` : '—'}</td>
                <td className={cn(v.sugar && v.sugar > 250 ? 'text-red-600 font-semibold' : '')}>{v.sugar ? `${v.sugar} mg/dL` : '—'}</td>
                <td className="text-xs text-slate-500">{v.recordedBy}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {vitals.length === 0 && <div className="text-center py-8 text-slate-400 text-sm">No vitals recorded</div>}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Record Vitals" footer={<><button onClick={() => setOpen(false)} className="btn-secondary">Cancel</button><button onClick={submit} className="btn-primary">Save</button></>}>
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

function PrescriptionsTab({ rx, patientId, doctorName, onAdd, showToast }: { rx: any[]; patientId: string; doctorName: string; onAdd: (r: any) => void; showToast: (m: string, t?: any) => void }) {
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
      <div className="flex justify-end mb-4">
        <button onClick={() => setOpen(true)} className="btn-primary btn-sm">
          <Plus className="w-4 h-4" /> Add Rx
        </button>
      </div>
      {rx.length === 0 && <div className="text-center py-8 text-slate-400 text-sm">No prescriptions yet</div>}
      <div className="space-y-5">
        {sortedDays.map(day => (
          <div key={day}>
            <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
              <span>{new Date(day).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              <span className="text-[10px] text-slate-300">({grouped[day].length} drug{grouped[day].length !== 1 ? 's' : ''})</span>
            </div>
            <div className="table-wrapper">
              <table className="data-table">
                <thead><tr><th>Drug</th><th>Dose</th><th>Route</th><th>Frequency</th><th>Duration</th><th>Instructions</th><th>By</th><th>Status</th></tr></thead>
                <tbody>
                  {grouped[day].map((r: any) => (
                    <tr key={r.id}>
                      <td className="font-semibold text-slate-900">
                        {r.form && r.form !== 'Tab' ? `${r.form}. ` : 'Tab. '}{r.drug}
                      </td>
                      <td>{r.dose || '—'}</td>
                      <td><span className="badge bg-blue-100 text-blue-700">{r.route || 'Oral'}</span></td>
                      <td>{r.frequency || '—'}</td>
                      <td>{r.duration || '—'}</td>
                      <td className="text-xs text-slate-500">{r.instructions || '—'}</td>
                      <td className="text-xs text-slate-500">{r.prescribedBy}</td>
                      <td><span className={cn('badge', r.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500')}>{r.status || 'active'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Add Prescription" footer={<><button onClick={() => setOpen(false)} className="btn-secondary">Cancel</button><button onClick={submit} className="btn-primary">Add</button></>}>
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

function LabsTab({ labs, patientId, doctorName, onAdd, showToast }: { labs: any[]; patientId: string; doctorName: string; onAdd: (l: any) => void; showToast: (m: string, t?: any) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ testName: '', panel: '' });

  const COMMON = ['CBC', 'LFT', 'RFT', 'KFT', 'Blood Sugar (F/PP)', 'HbA1c', 'Lipid Profile', 'Thyroid (T3/T4/TSH)', 'Urine R/M', 'Blood Culture', 'ECG', 'Chest X-Ray', 'USG Abdomen', '2D Echo', 'ABG'];

  function submit() {
    if (!form.testName) return;
    onAdd({ id: uid(), patientId, testName: form.testName, panel: form.panel, orderedBy: doctorName, orderedAt: nowIso(), status: 'ordered' });
    showToast('Lab order placed', 'success');
    setOpen(false);
    setForm({ testName: '', panel: '' });
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => setOpen(true)} className="btn-primary btn-sm">
          <Plus className="w-4 h-4" /> Order Lab
        </button>
      </div>
      <div className="table-wrapper">
        <table className="data-table">
          <thead><tr><th>Test</th><th>Panel</th><th>Ordered By</th><th>Ordered At</th><th>Status</th><th>Result</th></tr></thead>
          <tbody>
            {labs.map(l => (
              <tr key={l.id}>
                <td className="font-semibold text-slate-900">{l.testName}</td>
                <td className="text-xs text-slate-500">{l.panel || '—'}</td>
                <td className="text-xs text-slate-500">{l.orderedBy}</td>
                <td className="text-xs whitespace-nowrap">{formatDateTime(l.orderedAt)}</td>
                <td><LabStatusBadge status={l.status} /></td>
                <td>
                  {l.result ? (
                    <span className={cn('text-sm font-medium', l.critical ? 'text-red-600' : 'text-slate-700')}>
                      {l.result} {l.unit || ''} {l.critical && <span className="badge bg-red-100 text-red-700 ml-1">Critical</span>}
                    </span>
                  ) : <span className="text-slate-400 text-xs">Pending</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {labs.length === 0 && <div className="text-center py-8 text-slate-400 text-sm">No lab orders</div>}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Order Lab Test" footer={<><button onClick={() => setOpen(false)} className="btn-secondary">Cancel</button><button onClick={submit} className="btn-primary">Order</button></>}>
        <div className="space-y-4">
          <div>
            <label className="label">Test Name *</label>
            <input className="input" placeholder="e.g. CBC" value={form.testName} onChange={e => setForm(f => ({ ...f, testName: e.target.value }))} />
          </div>
          <div>
            <label className="label">Or select common test</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {COMMON.map(t => (
                <button key={t} onClick={() => setForm(f => ({ ...f, testName: t }))} className={cn('badge cursor-pointer', form.testName === t ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
                  {t}
                </button>
              ))}
            </div>
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
