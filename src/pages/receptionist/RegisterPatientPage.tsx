import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Calendar, Clock, CheckCircle2, ChevronRight, ChevronLeft, SkipForward, Building2, Users, AlertCircle } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { usePadStore } from '@/store/usePadStore';
import type { AppointmentEntry } from '@/types';

// ─── Slot utilities ───────────────────────────────────────────────────────────

function generateSlots(start: string, end: string, stepMins = 15): string[] {
  const slots: string[] = [];
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let total = sh * 60 + sm;
  const endTotal = eh * 60 + em;
  while (total < endTotal) {
    const h = Math.floor(total / 60).toString().padStart(2, '0');
    const m = (total % 60).toString().padStart(2, '0');
    slots.push(`${h}:${m}`);
    total += stepMins;
  }
  return slots;
}

function getSlotsForDate(clinicSchedule: { day: number; open: boolean; sessions: { start: string; end: string }[]; maxPatients: number }[], date: string) {
  const dow = new Date(date + 'T12:00:00').getDay();
  const day = clinicSchedule.find(d => d.day === dow);
  if (!day?.open || !day.sessions.length) return { slots: [] as string[], maxPerSlot: 1, dayMax: 0 };
  const slots = day.sessions.flatMap(s => generateSlots(s.start, s.end));
  const dayMax = day.maxPatients;
  const maxPerSlot = Math.max(1, Math.ceil(dayMax / Math.max(slots.length, 1)));
  return { slots, maxPerSlot, dayMax };
}

function slotColor(booked: number, max: number) {
  if (booked === 0) return 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100';
  const pct = booked / max;
  if (pct < 0.5) return 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100';
  if (pct < 0.8) return 'bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100';
  if (booked >= max) return 'bg-red-50 border-red-200 text-red-400 cursor-not-allowed opacity-60';
  return 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100';
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface PatientForm {
  name: string;
  age: string;
  gender: 'M' | 'F' | 'Other';
  phone: string;
  bloodGroup: string;
  locality: string;
  reason: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RegisterPatientPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { patients, appointments, addAppointment, upsertPatient } = useAppStore();
  const { clinics } = usePadStore();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<PatientForm>({
    name: '', age: '', gender: 'M', phone: '', bloodGroup: '', locality: '', reason: '',
  });
  const [errors, setErrors] = useState<Partial<PatientForm>>({});

  // Step 2: appointment booking
  const [selectedClinicId, setSelectedClinicId] = useState(clinics[0]?.id ?? '');
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const selectedClinic = clinics.find(c => c.id === selectedClinicId);

  // Generate slots for selected date and clinic
  const { slots, maxPerSlot, dayMax } = useMemo(() => {
    if (!selectedClinic?.schedule?.length) {
      // Fallback: use timings string parsing or default 09:00-13:00
      return { slots: generateSlots('09:00', '13:00'), maxPerSlot: 3, dayMax: 30 };
    }
    return getSlotsForDate(selectedClinic.schedule, selectedDate);
  }, [selectedClinic, selectedDate]);

  // Count bookings per slot
  const bookingsBySlot = useMemo(() => {
    const counts: Record<string, number> = {};
    appointments.forEach(a => {
      if (a.clinicId === selectedClinicId && a.date === selectedDate &&
          a.status !== 'cancelled' && a.status !== 'no-show') {
        counts[a.time] = (counts[a.time] ?? 0) + 1;
      }
    });
    return counts;
  }, [appointments, selectedClinicId, selectedDate]);

  const totalBooked = Object.values(bookingsBySlot).reduce((s, n) => s + n, 0);

  function validateStep1() {
    const e: Partial<PatientForm> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.age || Number(form.age) < 0 || Number(form.age) > 130) e.age = 'Valid age required';
    if (!form.phone.trim()) e.phone = 'Phone is required';
    if (!form.reason.trim()) e.reason = 'Chief complaint is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleStep1Next() {
    if (validateStep1()) setStep(2);
  }

  function doRegisterAndBook(slotTime: string | null) {
    const patientId = `p-${Date.now()}`;
    const mrn = `MRN-${String(patients.length + 1).padStart(4, '0')}`;

    upsertPatient({
      id: patientId,
      clinicId: selectedClinicId || clinics[0]?.id || '',
      name: form.name.trim(),
      age: Number(form.age),
      gender: form.gender,
      mrn,
      phone: form.phone.trim(),
      bloodGroup: form.bloodGroup || undefined,
      locality: form.locality.trim() || undefined,
      diagnosis: form.reason.trim(),
      status: 'OPD',
      priority: 'Stable',
      allergies: [],
      attendingDoctor: user?.name ?? '',
      attendingDoctorId: user?.id,
    });

    if (slotTime && selectedClinic) {
      const apt: AppointmentEntry = {
        id: `apt-${Date.now()}`,
        patientId,
        patientName: form.name.trim(),
        patientAge: Number(form.age),
        clinicId: selectedClinicId,
        clinicName: selectedClinic.name,
        date: selectedDate,
        time: slotTime,
        reason: form.reason.trim(),
        doctorId: user?.id,
        doctorName: user?.name ?? '',
        status: 'scheduled',
        token: totalBooked + 1,
        createdAt: new Date().toISOString(),
      };
      addAppointment(apt);
    }

    setStep(3);
  }

  // ─── Step 1: Patient Info ──────────────────────────────────────────────────

  if (step === 1) {
    return (
      <div className="max-w-xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Register Patient</h1>
            <p className="text-sm text-gray-500">Step 1 of 2 — Patient information</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-teal-500" />
          <div className="flex-1 h-1.5 rounded-full bg-gray-200" />
        </div>

        <div className="card p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="label">Full Name <span className="text-red-500">*</span></label>
            <input
              className={`input mt-1 ${errors.name ? 'border-red-400 focus:ring-red-400' : ''}`}
              placeholder="Patient's full name"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              autoFocus
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Age + Gender */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Age <span className="text-red-500">*</span></label>
              <input
                className={`input mt-1 ${errors.age ? 'border-red-400' : ''}`}
                type="number" min="0" max="130"
                placeholder="Years"
                value={form.age}
                onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
              />
              {errors.age && <p className="text-xs text-red-500 mt-1">{errors.age}</p>}
            </div>
            <div>
              <label className="label">Gender</label>
              <div className="flex gap-2 mt-1">
                {(['M', 'F', 'Other'] as const).map(g => (
                  <button
                    key={g}
                    onClick={() => setForm(f => ({ ...f, gender: g }))}
                    className={`flex-1 py-2 px-2 text-sm rounded-lg border font-medium transition-colors ${
                      form.gender === g
                        ? 'bg-teal-600 border-teal-600 text-white'
                        : 'border-gray-300 text-gray-600 hover:border-teal-400'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Phone + Blood Group */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Phone <span className="text-red-500">*</span></label>
              <input
                className={`input mt-1 ${errors.phone ? 'border-red-400' : ''}`}
                type="tel"
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              />
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
            </div>
            <div>
              <label className="label">Blood Group</label>
              <select
                className="input mt-1"
                value={form.bloodGroup}
                onChange={e => setForm(f => ({ ...f, bloodGroup: e.target.value }))}
              >
                <option value="">Unknown</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Locality */}
          <div>
            <label className="label">Locality / Area</label>
            <input
              className="input mt-1"
              placeholder="e.g. Kalighat, Salt Lake, Howrah"
              value={form.locality}
              onChange={e => setForm(f => ({ ...f, locality: e.target.value }))}
            />
          </div>

          {/* Chief complaint */}
          <div>
            <label className="label">Chief Complaint / Reason for Visit <span className="text-red-500">*</span></label>
            <input
              className={`input mt-1 ${errors.reason ? 'border-red-400' : ''}`}
              placeholder="e.g. Fever and cough, Follow-up, BP check"
              value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
            />
            {errors.reason && <p className="text-xs text-red-500 mt-1">{errors.reason}</p>}
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={handleStep1Next} className="btn-primary flex items-center gap-2 px-6">
            Next: Book Appointment
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ─── Step 2: Appointment Booking ───────────────────────────────────────────

  if (step === 2) {
    const today = new Date().toISOString().split('T')[0];
    const maxDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
            <Calendar className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Schedule Appointment</h1>
            <p className="text-sm text-gray-500">Step 2 of 2 — for {form.name}</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-teal-500" />
          <div className="flex-1 h-1.5 rounded-full bg-teal-500" />
        </div>

        <div className="card p-6 space-y-5">
          {/* Clinic tabs */}
          {clinics.length > 0 && (
            <div>
              <label className="label mb-2 flex items-center gap-1.5"><Building2 className="w-4 h-4" /> Clinic</label>
              <div className="flex flex-wrap gap-2">
                {clinics.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { setSelectedClinicId(c.id); setSelectedSlot(null); }}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      selectedClinicId === c.id
                        ? 'bg-teal-600 border-teal-600 text-white'
                        : 'border-gray-300 text-gray-600 hover:border-teal-400'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Date */}
          <div>
            <label className="label mb-1 flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Date</label>
            <input
              type="date"
              className="input"
              value={selectedDate}
              min={today}
              max={maxDate}
              onChange={e => { setSelectedDate(e.target.value); setSelectedSlot(null); }}
            />
          </div>

          {/* Booking load summary */}
          {dayMax > 0 && (
            <div className={`flex items-center gap-3 p-3 rounded-lg text-sm ${
              totalBooked >= dayMax ? 'bg-red-50 border border-red-200 text-red-700' :
              totalBooked >= dayMax * 0.8 ? 'bg-orange-50 border border-orange-200 text-orange-700' :
              'bg-teal-50 border border-teal-200 text-teal-700'
            }`}>
              <Users className="w-4 h-4 flex-shrink-0" />
              <span>
                <strong>{totalBooked}</strong> of <strong>{dayMax}</strong> patients booked for this date
                {totalBooked >= dayMax && ' — Day is full'}
                {totalBooked >= dayMax * 0.8 && totalBooked < dayMax && ' — Nearly full'}
              </span>
            </div>
          )}

          {/* Slot grid */}
          {slots.length > 0 ? (
            <div>
              <label className="label mb-2 flex items-center gap-1.5"><Clock className="w-4 h-4" /> Select Time Slot</label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {slots.map(slot => {
                  const booked = bookingsBySlot[slot] ?? 0;
                  const isFull = booked >= maxPerSlot;
                  const isSelected = selectedSlot === slot;
                  return (
                    <button
                      key={slot}
                      disabled={isFull}
                      onClick={() => setSelectedSlot(isSelected ? null : slot)}
                      className={`relative p-2 rounded-lg border text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-teal-600 border-teal-600 text-white ring-2 ring-teal-300'
                          : slotColor(booked, maxPerSlot)
                      }`}
                    >
                      <div className="font-semibold">{slot}</div>
                      {booked > 0 && (
                        <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-teal-100' : ''}`}>
                          {booked}/{maxPerSlot}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-teal-100 border border-teal-300 inline-block" /> Available</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300 inline-block" /> Filling up</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-300 inline-block" /> Full</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              Clinic is closed on this day. Please select a different date.
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setStep(1)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex gap-3">
            <button
              onClick={() => doRegisterAndBook(null)}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              <SkipForward className="w-4 h-4" />
              Register without appointment
            </button>
            <button
              disabled={!selectedSlot || slots.length === 0}
              onClick={() => doRegisterAndBook(selectedSlot)}
              className="btn-primary px-6 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Calendar className="w-4 h-4" />
              Book {selectedSlot ? `@ ${selectedSlot}` : 'Appointment'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Step 3: Success ──────────────────────────────────────────────────────

  return (
    <div className="max-w-md mx-auto p-6 text-center space-y-6 mt-10">
      <div className="flex items-center justify-center">
        <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center">
          <CheckCircle2 className="w-9 h-9 text-teal-600" />
        </div>
      </div>
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Patient Registered!</h2>
        <p className="text-gray-500 mt-1">{form.name} has been added to the system.</p>
        {selectedSlot && (
          <p className="text-teal-600 font-medium mt-2">
            Appointment scheduled: {selectedDate} at {selectedSlot} — {selectedClinic?.name}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <button
          onClick={() => {
            setStep(1);
            setForm({ name: '', age: '', gender: 'M', phone: '', bloodGroup: '', locality: '', reason: '' });
            setSelectedSlot(null);
            setErrors({});
          }}
          className="btn-primary w-full"
        >
          Register Another Patient
        </button>
        <button
          onClick={() => navigate('/app/reception')}
          className="w-full py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 text-sm font-medium"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
