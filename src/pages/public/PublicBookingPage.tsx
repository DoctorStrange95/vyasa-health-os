import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, Clock, User, CheckCircle } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { usePadStore } from '@/store/usePadStore';
import { localDate } from '@/lib/utils';
import type { DaySchedule } from '@/types';

function addDays(d: string, n: number) {
  const [y, mo, day] = d.split('-').map(Number);
  const dt = new Date(y, mo - 1, day + n);
  return localDate(dt);
}
function nowHHMM() {
  const n = new Date();
  return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
}
function hhmm(t: string) {
  return new Date(`2000-01-01T${t}`).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
}

function generateSlots(clinicId: string, date: string, schedule: DaySchedule[]) {
  const dow = new Date(date).getDay();
  const ds = schedule.find((s: DaySchedule) => s.day === dow);
  if (!ds?.open) return [];
  const out: { time: string; id: string }[] = [];
  for (const sess of ds.sessions) {
    let [h, m] = sess.start.split(':').map(Number);
    const [eh, em] = sess.end.split(':').map(Number);
    while (h * 60 + m < eh * 60 + em) {
      const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      out.push({ time, id: `slot-${clinicId}-${date}-${time}` });
      m += 15; if (m >= 60) { h++; m -= 60; }
    }
  }
  return out;
}

export default function PublicBookingPage() {
  const { clinicId } = useParams<{ clinicId: string }>();
  const { bookingSlots, addBookingSlot, updateBookingSlot, addAppointment } = useAppStore();
  const { clinics, settings } = usePadStore();

  const clinic = clinics.find(c => c.id === clinicId);

  const [step, setStep] = useState<'pick-date' | 'pick-time' | 'details' | 'confirm'>('pick-date');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', age: '', gender: '' as 'M' | 'F' | 'Other' | '', reason: '' });

  const todayStr = localDate();

  const availableDays = useMemo(() => {
    if (!clinic) return [];
    const days: string[] = [];
    for (let i = 0; i < 14; i++) {
      const d = addDays(todayStr, i);
      const [y, mo, day] = d.split('-').map(Number);
      const dow = new Date(y, mo - 1, day).getDay();
      const ds = clinic.schedule.find(s => s.day === dow);
      if (!ds?.open) continue;
      // For today, only include if there are future slots remaining
      if (i === 0) {
        const slots = generateSlots(clinicId!, d, clinic.schedule);
        if (slots.some(s => s.time > nowHHMM())) days.push(d);
      } else {
        days.push(d);
      }
    }
    return days;
  }, [clinic, todayStr]);

  const timeSlotsForDate = useMemo(() => {
    if (!clinic || !selectedDate) return [];
    const bookedIds = new Set(
      bookingSlots.filter(s => s.clinicId === clinicId && s.date === selectedDate && s.status === 'booked').map(s => s.id)
    );
    const allSlots = generateSlots(clinicId!, selectedDate, clinic.schedule).map(s => ({
      ...s, status: bookedIds.has(s.id) ? 'booked' as const : 'available' as const,
    }));
    // For today, hide past slots
    if (selectedDate === todayStr) return allSlots.filter(s => s.time > nowHHMM());
    return allSlots;
  }, [clinic, selectedDate, bookingSlots, clinicId, todayStr]);

  const selectedSlot = timeSlotsForDate.find(s => s.id === selectedSlotId);

  const handleConfirm = () => {
    if (!selectedSlot || !form.name.trim() || !form.phone.trim() || !form.age || !form.gender) return;
    const stored = bookingSlots.find(s => s.id === selectedSlot.id);
    if (stored) {
      updateBookingSlot(stored.id, { status: 'booked', patientName: form.name, bookedVia: 'self' });
    } else {
      addBookingSlot({
        id: selectedSlot.id, clinicId: clinicId!, date: selectedDate, time: selectedSlot.time,
        durationMins: 15, status: 'booked', patientName: form.name, bookedVia: 'self', fee: clinic?.fee ?? 0,
      });
    }
    // Always create an appointment so it syncs to backend and shows in doctor's Today's OPD
    addAppointment({
      id: `BOOK-${Date.now()}`,
      patientId: `BOOK-${Date.now()}`,
      patientName: form.name,
      patientAge: form.age ? Number(form.age) : undefined,
      patientGender: form.gender || undefined,
      clinicId: clinicId!,
      clinicName: clinic?.name ?? '',
      date: selectedDate,
      time: selectedSlot.time,
      reason: form.reason || 'OPD Appointment',
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    });
    setStep('confirm');
  };

  if (!clinic) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <h2>Clinic not found</h2>
          <p>This booking link may be incorrect or expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '16px 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#0d9488', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
            <Calendar style={{ width: 22, height: 22, color: 'white' }} />
          </div>
          <h1 style={{ margin: '0 0 2px', fontSize: 18, fontWeight: 700, color: '#1e293b' }}>{clinic.name}</h1>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
            {settings.doctorName && `Dr. ${settings.doctorName} · `}{clinic.address}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>{clinic.timings} · ₹{clinic.fee}</p>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: '24px auto', padding: '0 16px' }}>
        {step === 'confirm' ? (
          <div style={{ background: 'white', borderRadius: 16, padding: 32, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <CheckCircle style={{ width: 52, height: 52, color: '#0d9488', marginBottom: 16 }} />
            <h2 style={{ margin: '0 0 8px', color: '#1e293b' }}>Appointment Confirmed!</h2>
            <p style={{ color: '#64748b', marginBottom: 20 }}>
              {form.name}, your slot at <strong>{hhmm(selectedSlot?.time ?? '')}</strong> on <strong>{fmtDate(selectedDate)}</strong> at <strong>{clinic.name}</strong> has been booked.
            </p>
            <p style={{ fontSize: 12, color: '#94a3b8' }}>Please arrive 10 minutes early. Carry a valid ID.</p>
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            {/* Step indicator */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
              {['Date', 'Time', 'Details'].map((s, i) => (
                <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: ['pick-date', 'pick-time', 'details'].indexOf(step) >= i ? '#0d9488' : '#e2e8f0' }} />
              ))}
            </div>

            {step === 'pick-date' && (
              <div>
                <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Calendar style={{ width: 16, height: 16, color: '#0d9488' }} /> Choose a date
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {availableDays.map(d => (
                    <button
                      key={d}
                      onClick={() => { setSelectedDate(d); setStep('pick-time'); }}
                      style={{
                        padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0',
                        background: 'white', cursor: 'pointer', textAlign: 'left',
                        fontSize: 13, fontWeight: 500, color: '#334155',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { (e.target as HTMLButtonElement).style.borderColor = '#0d9488'; (e.target as HTMLButtonElement).style.background = '#f0fdfa'; }}
                      onMouseLeave={e => { (e.target as HTMLButtonElement).style.borderColor = '#e2e8f0'; (e.target as HTMLButtonElement).style.background = 'white'; }}
                    >
                      {fmtDate(d)}
                    </button>
                  ))}
                  {availableDays.length === 0 && (
                    <p style={{ color: '#94a3b8', gridColumn: '1/-1', textAlign: 'center', padding: 20 }}>No available dates in next 2 weeks.</p>
                  )}
                </div>
              </div>
            )}

            {step === 'pick-time' && (
              <div>
                <button onClick={() => setStep('pick-date')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 12, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                  ← {fmtDate(selectedDate)}
                </button>
                <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock style={{ width: 16, height: 16, color: '#0d9488' }} /> Choose a time
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {timeSlotsForDate.filter(s => s.status === 'available').map(s => (
                    <button
                      key={s.id}
                      onClick={() => { setSelectedSlotId(s.id); setStep('details'); }}
                      style={{
                        padding: '8px 4px', borderRadius: 8, border: '1.5px solid #e2e8f0',
                        background: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#0f766e',
                      }}
                    >
                      {hhmm(s.time)}
                    </button>
                  ))}
                  {timeSlotsForDate.filter(s => s.status === 'available').length === 0 && (
                    <p style={{ color: '#94a3b8', gridColumn: '1/-1', textAlign: 'center', padding: 20 }}>No slots available on this day.</p>
                  )}
                </div>
              </div>
            )}

            {step === 'details' && (
              <div>
                <button onClick={() => setStep('pick-time')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 12, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                  ← {selectedSlot ? hhmm(selectedSlot.time) : ''}
                </button>
                <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <User style={{ width: 16, height: 16, color: '#0d9488' }} /> Your details
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label className="label">Full Name *</label>
                    <input className="input" placeholder="Patient name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Mobile Number *</label>
                    <input className="input" placeholder="10-digit number" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} type="tel" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label className="label">Age *</label>
                      <input className="input" placeholder="Years" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} type="number" min={1} max={120} />
                    </div>
                    <div>
                      <label className="label">Gender *</label>
                      <select className="input" value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value as 'M' | 'F' | 'Other' }))}>
                        <option value="">Select</option>
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="label">Reason for visit</label>
                    <input className="input" placeholder="e.g. Fever, follow-up…" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
                  </div>
                  <button
                    className="btn-primary"
                    style={{ marginTop: 4 }}
                    onClick={handleConfirm}
                    disabled={!form.name.trim() || !form.phone.trim() || !form.age || !form.gender}
                  >
                    Confirm Appointment
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
