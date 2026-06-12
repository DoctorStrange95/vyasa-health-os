import { useState, useRef } from 'react';
import { X, User, Calendar, CreditCard, Printer, CheckCircle2, Stethoscope } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { usePadStore } from '@/store/usePadStore';
import { cn } from '@/lib/utils';
import type { Patient, AppointmentEntry, QueueEntry, PaymentMode } from '@/types';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

function timeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 8; h < 21; h++) {
    for (const m of [0, 15, 30, 45]) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return slots;
}

function fmtTime(t: string) {
  return new Date(`2000-01-01T${t}`).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function QuickRegisterModal() {
  const { patients, queue, closeQuickRegister, upsertPatient, setQueue, addAppointment, showToast } = useAppStore();
  const { user } = useAuthStore();
  const { clinics, settings } = usePadStore();
  const navigate = useNavigate();

  const todayStr = new Date().toISOString().slice(0, 10);
  const defaultFee = clinics[0]?.fee ?? 300;

  // Patient fields
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'M' | 'F' | 'Other'>('M');
  const [phone, setPhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');

  // Appointment fields
  const [dateType, setDateType] = useState<'today' | 'scheduled'>('today');
  const [schedDate, setSchedDate] = useState(todayStr);
  const [apptTime, setApptTime] = useState('09:00');
  const [clinicId, setClinicId] = useState(clinics[0]?.id ?? '');
  const [reason, setReason] = useState('');

  // Payment fields
  const [fee, setFee] = useState(defaultFee);
  const [amountPaid, setAmountPaid] = useState(defaultFee);
  const [payMode, setPayMode] = useState<PaymentMode>('cash');

  // Post-registration state
  const [registered, setRegistered] = useState<{ patient: Patient; apt: AppointmentEntry } | null>(null);
  const slipRef = useRef<HTMLDivElement>(null);

  const selectedClinic = clinics.find(c => c.id === clinicId);
  const balance = fee - amountPaid;
  const appointmentDate = dateType === 'today' ? todayStr : schedDate;

  function handleClinicChange(cid: string) {
    setClinicId(cid);
    const c = clinics.find(x => x.id === cid);
    if (c) { setFee(c.fee); setAmountPaid(c.fee); }
  }

  function handleRegister() {
    if (!name.trim() || !age) return;

    const newId = `P-${Date.now()}`;
    const mrn = `MRN-${String(patients.length + 1).padStart(3, '0')}`;
    const todayQueueCount = queue.filter(q => q.status !== 'no-show').length;
    const token = todayQueueCount + 1;

    const patient: Patient = {
      id: newId,
      name: name.trim(),
      age: Number(age),
      gender,
      mrn,
      phone: phone || undefined,
      bloodGroup: bloodGroup || undefined,
      status: 'OPD',
      priority: 'Stable',
      allergies: [],
      diagnosis: reason || undefined,
      attendingDoctor: user?.name ?? '',
      attendingDoctorId: user?.id,
      clinicId: clinicId || undefined,
    };

    const apt: AppointmentEntry = {
      id: `APT-${Date.now()}`,
      patientId: newId,
      patientName: name.trim(),
      patientAge: Number(age),
      clinicId,
      clinicName: selectedClinic?.name,
      date: appointmentDate,
      time: apptTime,
      reason: reason || 'OPD Visit',
      doctorId: user?.id,
      doctorName: user?.name,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      consultationFee: fee,
      amountPaid,
      paymentMode: payMode,
      token,
    };

    upsertPatient(patient);
    addAppointment(apt);

    // Add to today's live queue only if appointment is for today
    if (appointmentDate === todayStr) {
      const qEntry: QueueEntry = {
        id: `Q-${Date.now()}`,
        patientId: newId,
        patientName: name.trim(),
        token,
        reason: reason || 'OPD Visit',
        status: 'waiting',
        registeredAt: new Date().toISOString(),
        assignedDoctor: user?.name,
      };
      setQueue([...queue, qEntry]);
    }

    showToast(`${name.trim()} registered — Token ${token}`, 'success');
    setRegistered({ patient, apt });
  }

  function handlePrint() {
    if (!slipRef.current) return;
    const w = window.open('', '_blank', 'width=420,height=640');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Registration Slip</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; font-size: 12px; padding: 24px; color: #1e293b; }
      .title { font-size: 17px; font-weight: 700; text-align: center; margin-bottom: 2px; }
      .sub { text-align: center; color: #64748b; font-size: 11px; margin-bottom: 14px; }
      .token-box { text-align: center; background: #f0fdfc; border: 2px solid #0d9488; border-radius: 12px; padding: 12px; margin-bottom: 14px; }
      .token-num { font-size: 52px; font-weight: 900; color: #0d9488; line-height: 1; }
      .token-lbl { font-size: 11px; color: #64748b; margin-top: 2px; }
      hr { border: none; border-top: 1px dashed #cbd5e1; margin: 10px 0; }
      .sec-title { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
      .row { display: flex; justify-content: space-between; margin-bottom: 3px; }
      .lbl { color: #64748b; }
      .val { font-weight: 600; }
      .paid { color: #0d9488; }
      .due { color: #dc2626; }
      .footer { text-align: center; color: #94a3b8; font-size: 10px; margin-top: 14px; border-top: 1px solid #e2e8f0; padding-top: 10px; }
    </style></head><body>${slipRef.current.innerHTML}</body></html>`);
    w.document.close();
    w.print();
  }

  // ── Success / Slip Screen ─────────────────────────────────────────────────
  if (registered) {
    const { patient, apt } = registered;
    const aptDateFmt = new Date(apt.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const clinicDisplay = apt.clinicName ?? selectedClinic?.name ?? settings.clinicName;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
          <div className="bg-teal-500 p-5 text-center">
            <CheckCircle2 className="w-10 h-10 text-white mx-auto mb-1" />
            <div className="text-white font-bold text-lg">Registered!</div>
            <div className="text-teal-100 text-sm">{patient.name} · {patient.mrn}</div>
          </div>

          {/* Printable slip */}
          <div ref={slipRef} className="p-4 text-[12px] text-slate-800">
            <div className="title">Vyasa Health OS</div>
            <div className="sub">{clinicDisplay}{settings.phone ? ` · ${settings.phone}` : ''}</div>

            <div className="token-box">
              <div className="token-num">{apt.token}</div>
              <div className="token-lbl">Token Number</div>
            </div>

            <hr />
            <div className="sec-title">Patient</div>
            <div className="row"><span className="lbl">Name</span><span className="val">{patient.name}</span></div>
            <div className="row"><span className="lbl">Age / Sex</span><span className="val">{patient.age}y / {patient.gender}</span></div>
            <div className="row"><span className="lbl">MRN</span><span className="val">{patient.mrn}</span></div>
            {patient.phone && <div className="row"><span className="lbl">Phone</span><span className="val">{patient.phone}</span></div>}

            <hr />
            <div className="sec-title">Appointment</div>
            <div className="row"><span className="lbl">Date</span><span className="val">{aptDateFmt}</span></div>
            <div className="row"><span className="lbl">Time</span><span className="val">{fmtTime(apt.time)}</span></div>
            <div className="row"><span className="lbl">Clinic</span><span className="val">{apt.clinicName}</span></div>
            <div className="row"><span className="lbl">Doctor</span><span className="val">{apt.doctorName}</span></div>
            {apt.reason && <div className="row"><span className="lbl">Reason</span><span className="val">{apt.reason}</span></div>}

            <hr />
            <div className="sec-title">Payment</div>
            <div className="row"><span className="lbl">Consultation Fee</span><span className="val">₹{apt.consultationFee}</span></div>
            <div className="row"><span className="lbl">Amount Paid</span><span className="val paid">₹{apt.amountPaid}</span></div>
            {balance > 0 && <div className="row"><span className="lbl">Balance Due</span><span className="val due">₹{balance}</span></div>}
            <div className="row"><span className="lbl">Payment Mode</span><span className="val" style={{ textTransform: 'capitalize' }}>{apt.paymentMode}</span></div>

            <div className="footer">
              Please arrive 15 minutes before your appointment<br />
              {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>

          <div className="p-4 flex flex-col gap-2 border-t border-slate-100">
            <button
              onClick={() => { closeQuickRegister(); navigate(`/app/consult/${registered.patient.id}`); }}
              className="btn-primary w-full"
            >
              <Stethoscope className="w-4 h-4" /> Start Consultation
            </button>
            <div className="flex gap-2">
              <button onClick={handlePrint} className="btn-secondary flex-1">
                <Printer className="w-4 h-4" /> Print Slip
              </button>
              <button onClick={closeQuickRegister} className="btn-secondary flex-1">Done</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Registration Form ─────────────────────────────────────────────────────
  const slots = timeSlots();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] flex flex-col">
        {/* Sticky header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <div>
            <h2 className="font-bold text-slate-900 text-base">Register Patient</h2>
            <p className="text-xs text-slate-500">New OPD registration</p>
          </div>
          <button onClick={closeQuickRegister} className="btn-ghost p-2 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-5">
          {/* ── Patient Details ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-teal-600" />
              <span className="font-semibold text-slate-800 text-sm">Patient Details</span>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Full Name *</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  placeholder="Patient's full name" className="input" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Age *</label>
                  <input type="number" value={age} onChange={e => setAge(e.target.value)}
                    placeholder="Years" min={1} max={120} className="input" />
                </div>
                <div>
                  <label className="label">Gender</label>
                  <div className="flex rounded-lg overflow-hidden border border-slate-200 h-9">
                    {(['M', 'F', 'Other'] as const).map(g => (
                      <button key={g} type="button" onClick={() => setGender(g)}
                        className={cn('flex-1 text-xs font-semibold transition-colors',
                          gender === g ? 'bg-navy-800 text-white' : 'bg-white text-slate-500 hover:bg-slate-50')}>
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Phone</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="Mobile number" className="input" />
                </div>
                <div>
                  <label className="label">Blood Group</label>
                  <select value={bloodGroup} onChange={e => setBloodGroup(e.target.value)} className="input">
                    <option value="">Unknown</option>
                    {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* ── Appointment ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-teal-600" />
              <span className="font-semibold text-slate-800 text-sm">Appointment</span>
            </div>
            <div className="space-y-3">
              <div className="flex rounded-lg overflow-hidden border border-slate-200">
                <button type="button" onClick={() => setDateType('today')}
                  className={cn('flex-1 py-2 text-sm font-semibold transition-colors',
                    dateType === 'today' ? 'bg-navy-800 text-white' : 'bg-white text-slate-500 hover:bg-slate-50')}>
                  Today
                </button>
                <button type="button" onClick={() => setDateType('scheduled')}
                  className={cn('flex-1 py-2 text-sm font-semibold transition-colors',
                    dateType === 'scheduled' ? 'bg-navy-800 text-white' : 'bg-white text-slate-500 hover:bg-slate-50')}>
                  Scheduled Date
                </button>
              </div>
              {dateType === 'scheduled' && (
                <div>
                  <label className="label">Date</label>
                  <input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)}
                    min={todayStr} className="input" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Time</label>
                  <select value={apptTime} onChange={e => setApptTime(e.target.value)} className="input">
                    {slots.map(t => <option key={t} value={t}>{fmtTime(t)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Clinic</label>
                  <select value={clinicId} onChange={e => handleClinicChange(e.target.value)} className="input">
                    {clinics.length === 0 && <option value="">Default Clinic</option>}
                    {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Chief Complaint</label>
                <input value={reason} onChange={e => setReason(e.target.value)}
                  placeholder="e.g. Fever, Headache, Routine follow-up" className="input" />
              </div>
            </div>
          </div>

          {/* ── Payment ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-4 h-4 text-teal-600" />
              <span className="font-semibold text-slate-800 text-sm">Payment</span>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Consultation Fee</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">₹</span>
                    <input type="number" value={fee} onChange={e => setFee(Number(e.target.value))}
                      min={0} className="input pl-7" />
                  </div>
                </div>
                <div>
                  <label className="label">Amount Paid</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">₹</span>
                    <input type="number" value={amountPaid} onChange={e => setAmountPaid(Number(e.target.value))}
                      min={0} className="input pl-7" />
                  </div>
                </div>
              </div>

              <div className={cn(
                'flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold border',
                balance > 0
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-teal-50 text-teal-700 border-teal-200'
              )}>
                <span>Balance Due</span>
                <span>₹{Math.max(balance, 0)}</span>
              </div>

              <div>
                <label className="label">Payment Mode</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['cash', 'upi', 'card', 'insurance'] as PaymentMode[]).map(mode => (
                    <button key={mode} type="button" onClick={() => setPayMode(mode)}
                      className={cn(
                        'py-2 rounded-lg text-xs font-semibold border-2 transition-all',
                        payMode === mode
                          ? 'border-teal-500 bg-teal-50 text-teal-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      )}>
                      {mode === 'upi' ? 'UPI' : mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky footer */}
        <div className="flex-shrink-0 border-t border-slate-200 p-4 flex gap-2 bg-white">
          <button onClick={closeQuickRegister} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleRegister} disabled={!name.trim() || !age}
            className="btn-primary flex-1">
            <CheckCircle2 className="w-4 h-4" />
            Register &amp; Print Slip
          </button>
        </div>
      </div>
    </div>
  );
}
