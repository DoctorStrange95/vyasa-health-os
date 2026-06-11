import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  CheckCircle, Clock, MapPin, Phone, Mail, Globe,
  Copy, MessageCircle, Loader2, ChevronRight, ChevronLeft,
  Star, Shield, Calendar
} from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'https://vyasa-os-backend.onrender.com';

interface DoctorProfile {
  id: number; name: string; specialty: string; qualification: string;
  regNumber: string; bio: string; languages: string; acceptingPatients: boolean;
  gbpUrl: string; yearsExperience: number; consultationFee: number | null;
  profileSlug: string; profilePhotoUrl: string;
  clinicName: string; clinicAddress: string; clinicPhone: string; clinicEmail: string; timings: string;
  clinics: { id: string; name: string; address: string; phone: string; timings: string }[];
}

interface SlotDay { date: string; slots: string[]; totalSlots: number; bookedCount: number; }

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function fmtDayLabel(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 1) return 'Tomorrow';
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function fmtTime12(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function fmtFullDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

const NAVY = '#0f2040';
const TEAL = '#0d9488';
const AMBER = '#F0A500';

export default function DoctorPublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [slotDays, setSlotDays] = useState<SlotDay[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  // Booking wizard state
  const [step, setStep] = useState<'select-date' | 'select-time' | 'details' | 'done'>('select-date');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', age: '', reason: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slotError, setSlotError] = useState('');

  useEffect(() => {
    if (!slug) { setNotFound(true); setLoadingProfile(false); return; }
    fetch(`${API_BASE}/public/doctor/${slug}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => {
        setDoctor(data);
        document.title = `Dr. ${data.name} — Book Appointment`;
        if (data.acceptingPatients) {
          setLoadingSlots(true);
          return fetch(`${API_BASE}/public/doctor/${slug}/slots?days=14&interval=15`)
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d?.days) setSlotDays(d.days); })
            .catch(() => {})
            .finally(() => setLoadingSlots(false));
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoadingProfile(false));
  }, [slug]);

  function copyLink() {
    navigator.clipboard.writeText(window.location.href).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = window.location.href; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Full name is required';
    const phone = form.phone.replace(/\D/g, '').slice(-10);
    if (phone.length !== 10) e.phone = 'Enter a valid 10-digit mobile number';
    setErrors(e);
    return !Object.keys(e).length;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    setSlotError('');
    try {
      const res = await fetch(`${API_BASE}/public/doctor/${slug}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_name: form.name.trim(),
          patient_phone: form.phone.replace(/\D/g, '').slice(-10),
          patient_age: form.age ? Number(form.age) : undefined,
          reason: form.reason.trim(),
          preferred_date: selectedDate,
          preferred_time: selectedTime,
        }),
      });
      if (res.status === 409) {
        const e = await res.json();
        setSlotError(e.error ?? 'Slot already taken. Please choose another time.');
        setStep('select-time');
        // Refresh slots
        setLoadingSlots(true);
        fetch(`${API_BASE}/public/doctor/${slug}/slots?days=14&interval=15`)
          .then(r => r.ok ? r.json() : null)
          .then(d => { if (d?.days) setSlotDays(d.days); })
          .finally(() => setLoadingSlots(false));
        return;
      }
      if (!res.ok) { const e = await res.json().catch(() => ({})); alert(e.error ?? 'Failed, try again.'); return; }
      setStep('done');
    } catch { alert('Network error. Please try again.'); }
    finally { setSubmitting(false); }
  }

  const waText = encodeURIComponent(`Book an appointment with Dr. ${doctor?.name ?? ''}: ${window.location.href}`);

  if (loadingProfile) return (
    <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
      <Loader2 style={{ width: 32, height: 32, color: TEAL, animation: 'spin 1s linear infinite' }} />
    </div>
  );

  if (notFound || !doctor) return (
    <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, textAlign: 'center', background: '#f1f5f9' }}>
      <div style={{ fontSize: 56 }}>🔍</div>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b' }}>Profile not found</h2>
      <p style={{ color: '#64748b', fontSize: 14 }}>This link may be incorrect or the profile has been disabled.</p>
      <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 16 }}>Powered by Vyasa Health OS</p>
    </div>
  );

  const selectedDayData = slotDays.find(d => d.date === selectedDate);

  return (
    <div style={{ minHeight: '100svh', background: '#f1f5f9', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      {/* Hero header */}
      <div style={{ background: `linear-gradient(150deg, ${NAVY} 0%, #1B4F8A 60%, #1e6fa8 100%)`, paddingBottom: 60 }}>
        <div style={{ maxWidth: 540, margin: '0 auto', padding: '20px 16px 0' }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14, color: 'white' }}>V</div>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700, fontSize: 13, letterSpacing: 1 }}>VYASA HEALTH OS</span>
          </div>

          {/* Doctor card */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ width: 72, height: 72, borderRadius: 18, background: 'rgba(255,255,255,0.15)', border: '2.5px solid rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800, color: 'white', flexShrink: 0, letterSpacing: -1, overflow: 'hidden' }}>
              {doctor.profilePhotoUrl
                ? <img src={doctor.profilePhotoUrl} alt={doctor.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initials(doctor.name)
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h1 style={{ color: 'white', fontSize: 22, fontWeight: 800, margin: 0 }}>Dr. {doctor.name}</h1>
                {doctor.regNumber && (
                  <span style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', color: '#6ee7b7', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Shield style={{ width: 10, height: 10 }} /> Verified
                  </span>
                )}
              </div>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: '4px 0 6px' }}>
                {[doctor.specialty, doctor.qualification].filter(Boolean).join(' · ') || 'Medical Professional'}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {doctor.yearsExperience > 0 && (
                  <span style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)', fontSize: 11, padding: '3px 9px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Star style={{ width: 10, height: 10, fill: AMBER, color: AMBER }} /> {doctor.yearsExperience}+ yrs
                  </span>
                )}
                {doctor.clinicName && (
                  <span style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)', fontSize: 11, padding: '3px 9px', borderRadius: 16 }}>
                    📍 {doctor.clinicName}
                  </span>
                )}
                <span style={{ background: doctor.acceptingPatients ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', color: doctor.acceptingPatients ? '#6ee7b7' : '#fca5a5', fontSize: 11, padding: '3px 9px', borderRadius: 16 }}>
                  {doctor.acceptingPatients ? '✓ Accepting Patients' : '✗ Not Accepting'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content — overlaps hero */}
      <div style={{ maxWidth: 540, margin: '-44px auto 0', padding: '0 14px 48px', position: 'relative' }}>

        {/* ─── BOOKING CARD ─────────────────────────────────────────────── */}
        {doctor.acceptingPatients && (
          <div style={{ background: 'white', borderRadius: 20, overflow: 'hidden', marginBottom: 12, boxShadow: '0 4px 24px rgba(0,0,0,0.10)' }}>
            {/* Progress header */}
            {step !== 'done' && (
              <div style={{ background: `linear-gradient(135deg, ${NAVY}, #1B4F8A)`, padding: '14px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                  {[['select-date', '1', 'Date'], ['select-time', '2', 'Time'], ['details', '3', 'Details']].map(([s, n, label], i) => {
                    const steps = ['select-date', 'select-time', 'details'];
                    const idx = steps.indexOf(step);
                    const thisIdx = steps.indexOf(s as string);
                    const isActive = step === s;
                    const isDone = thisIdx < idx;
                    return (
                      <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : 0 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: isDone ? '#10B981' : isActive ? AMBER : 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: isDone || isActive ? 'white' : 'rgba(255,255,255,0.4)', transition: 'all 0.2s' }}>
                            {isDone ? '✓' : n}
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 600, color: isActive ? 'white' : isDone ? '#6ee7b7' : 'rgba(255,255,255,0.35)', letterSpacing: '0.5px' }}>{label}</span>
                        </div>
                        {i < 2 && <div style={{ flex: 1, height: 2, background: isDone ? '#10B981' : 'rgba(255,255,255,0.15)', margin: '0 6px 12px', borderRadius: 2, transition: 'background 0.3s' }} />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ padding: '18px 18px 20px' }}>
              {/* STEP 1 — Select Date */}
              {step === 'select-date' && (
                <>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: '0 0 14px' }}>
                    <Calendar style={{ width: 16, height: 16, display: 'inline', marginRight: 6, verticalAlign: '-2px', color: TEAL }} />
                    Select an Available Date
                  </h3>
                  {loadingSlots ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                      <Loader2 style={{ width: 24, height: 24, color: TEAL, animation: 'spin 1s linear infinite' }} />
                    </div>
                  ) : slotDays.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b' }}>
                      <Calendar style={{ width: 36, height: 36, margin: '0 auto 10px', color: '#cbd5e1' }} />
                      <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>No slots available in the next 14 days</p>
                      <p style={{ fontSize: 12, color: '#94a3b8' }}>Please contact the clinic directly to schedule.</p>
                      {doctor.clinicPhone && (
                        <a href={`tel:${doctor.clinicPhone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, background: TEAL, color: 'white', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                          <Phone style={{ width: 14, height: 14 }} /> Call Clinic
                        </a>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
                      {slotDays.map(d => (
                        <button key={d.date} onClick={() => { setSelectedDate(d.date); setSelectedTime(''); setStep('select-time'); }}
                          style={{ padding: '10px 8px', borderRadius: 12, border: '1.5px solid', borderColor: selectedDate === d.date ? TEAL : '#e2e8f0', background: selectedDate === d.date ? `${TEAL}12` : 'white', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: TEAL, marginBottom: 2, letterSpacing: '0.3px' }}>{fmtDayLabel(d.date).toUpperCase()}</div>
                          <div style={{ fontSize: 12, color: '#475569' }}>{d.slots.length} slots</div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* STEP 2 — Select Time */}
              {step === 'select-time' && selectedDayData && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <button onClick={() => setStep('select-date')} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748b' }}>
                      <ChevronLeft style={{ width: 16, height: 16 }} />
                    </button>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: 0 }}>Pick a Time</h3>
                      <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>{fmtFullDate(selectedDate)}</p>
                    </div>
                  </div>
                  {slotError && (
                    <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', borderRadius: 10, padding: '10px 12px', fontSize: 13, marginBottom: 12 }}>
                      ⚠️ {slotError}
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {selectedDayData.slots.map(t => (
                      <button key={t} onClick={() => { setSelectedTime(t); setSlotError(''); setStep('details'); }}
                        style={{ padding: '10px 6px', borderRadius: 10, border: '1.5px solid', borderColor: selectedTime === t ? TEAL : '#e2e8f0', background: selectedTime === t ? `${TEAL}15` : 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: selectedTime === t ? TEAL : '#374151', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                        {fmtTime12(t)}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* STEP 3 — Patient Details */}
              {step === 'details' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <button onClick={() => setStep('select-time')} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748b' }}>
                      <ChevronLeft style={{ width: 16, height: 16 }} />
                    </button>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: 0 }}>Your Details</h3>
                      <p style={{ fontSize: 12, color: TEAL, margin: '2px 0 0', fontWeight: 600 }}>
                        {fmtDayLabel(selectedDate)} at {fmtTime12(selectedTime)}
                      </p>
                    </div>
                  </div>
                  {doctor.consultationFee && (
                    <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '8px 12px', fontSize: 13, color: '#92400E', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>💰</span>
                      <span>Consultation fee: <strong>₹{doctor.consultationFee}</strong></span>
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Full Name *</label>
                      <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Ravi Kumar"
                        style={{ width: '100%', border: `1.5px solid ${errors.name ? '#EF4444' : '#e2e8f0'}`, borderRadius: 10, padding: '10px 12px', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                      {errors.name && <p style={{ color: '#EF4444', fontSize: 11, margin: '3px 0 0' }}>{errors.name}</p>}
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Mobile Number *</label>
                      <input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} placeholder="10-digit number" type="tel" inputMode="numeric"
                        style={{ width: '100%', border: `1.5px solid ${errors.phone ? '#EF4444' : '#e2e8f0'}`, borderRadius: 10, padding: '10px 12px', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                      {errors.phone && <p style={{ color: '#EF4444', fontSize: 11, margin: '3px 0 0' }}>{errors.phone}</p>}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Age</label>
                        <input value={form.age} onChange={e => setForm(f => ({...f, age: e.target.value}))} placeholder="Years" type="number" min={1} max={120}
                          style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '10px 12px', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Reason</label>
                        <input value={form.reason} onChange={e => setForm(f => ({...f, reason: e.target.value}))} placeholder="e.g. Fever"
                          style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '10px 12px', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                      </div>
                    </div>
                    <button onClick={handleSubmit} disabled={submitting}
                      style={{ background: `linear-gradient(135deg, ${TEAL}, #0891b2)`, color: 'white', border: 'none', borderRadius: 12, padding: '13px', fontSize: 15, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: submitting ? 0.7 : 1, fontFamily: 'inherit', marginTop: 2 }}>
                      {submitting ? <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} /> : <ChevronRight style={{ width: 18, height: 18 }} />}
                      {submitting ? 'Booking…' : 'Confirm Appointment'}
                    </button>
                  </div>
                </>
              )}

              {/* DONE */}
              {step === 'done' && (
                <div style={{ textAlign: 'center', padding: '12px 0 4px' }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                    <CheckCircle style={{ width: 36, height: 36, color: '#059669' }} />
                  </div>
                  <h3 style={{ color: '#065F46', fontWeight: 800, fontSize: 18, margin: '0 0 8px' }}>Appointment Requested!</h3>
                  <p style={{ color: '#047857', fontSize: 13, lineHeight: 1.7, margin: '0 0 16px' }}>
                    Dr. {doctor.name}'s team will call <strong>+91 {form.phone.replace(/\D/g,'').slice(-10)}</strong> to confirm.<br />
                    <strong>{fmtFullDate(selectedDate)} at {fmtTime12(selectedTime)}</strong>
                  </p>
                  {doctor.clinicPhone && (
                    <a href={`tel:${doctor.clinicPhone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#F0FDF4', color: '#065F46', border: '1px solid #BBF7D0', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                      <Phone style={{ width: 14, height: 14 }} /> Contact Clinic
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Not accepting patients */}
        {!doctor.acceptingPatients && (
          <div style={{ background: 'white', borderRadius: 16, padding: 18, marginBottom: 12, textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🚫</div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#7C3AED' }}>Not Accepting New Patients</p>
            <p style={{ fontSize: 13, color: '#64748b' }}>Please check back later or contact the clinic directly.</p>
          </div>
        )}

        {/* About */}
        {doctor.bio && (
          <div style={{ background: 'white', borderRadius: 16, padding: 18, marginBottom: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>About</div>
            <p style={{ fontSize: 14, lineHeight: 1.8, color: '#374151', margin: 0 }}>{doctor.bio}</p>
          </div>
        )}

        {/* Details */}
        <div style={{ background: 'white', borderRadius: 16, padding: 18, marginBottom: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Details</div>
          {[
            { icon: '🩺', label: 'Specialty', value: doctor.specialty },
            { icon: '🎓', label: 'Qualification', value: doctor.qualification },
            { icon: '⏳', label: 'Experience', value: doctor.yearsExperience > 0 ? `${doctor.yearsExperience} years` : '' },
            { icon: '🌐', label: 'Languages', value: doctor.languages },
            { icon: '💰', label: 'Consultation Fee', value: doctor.consultationFee ? `₹${doctor.consultationFee}` : '' },
            { icon: '📋', label: 'Reg. No.', value: doctor.regNumber },
          ].filter(r => r.value).map(r => (
            <div key={r.label} style={{ display: 'flex', gap: 10, marginBottom: 10, fontSize: 13, alignItems: 'flex-start' }}>
              <span style={{ flexShrink: 0, width: 22, textAlign: 'center', fontSize: 16 }}>{r.icon}</span>
              <div style={{ color: '#374151' }}><span style={{ fontWeight: 600 }}>{r.label}</span><span style={{ color: '#6B7280', marginLeft: 6 }}>{r.value}</span></div>
            </div>
          ))}
        </div>

        {/* Clinics / Contact */}
        <div style={{ background: 'white', borderRadius: 16, padding: 18, marginBottom: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Clinics & Contact</div>

          {/* Multi-clinic list */}
          {(doctor.clinics?.length > 0 ? doctor.clinics : (doctor.clinicName ? [{ id: '0', name: doctor.clinicName, address: doctor.clinicAddress, phone: doctor.clinicPhone, timings: doctor.timings }] : [])).map((clinic, idx) => (
            <div key={clinic.id} style={{ marginBottom: idx < (doctor.clinics?.length || 1) - 1 ? 14 : 0, paddingBottom: idx < (doctor.clinics?.length || 1) - 1 ? 14 : 0, borderBottom: idx < (doctor.clinics?.length || 1) - 1 ? '1px solid #f1f5f9' : 'none' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b', marginBottom: 6 }}>
                🏥 {clinic.name}
              </div>
              {clinic.address && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 5, fontSize: 13, color: '#374151' }}>
                  <MapPin style={{ width: 14, height: 14, color: '#94a3b8', flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <span>{clinic.address}</span>
                    {clinic.address && (
                      <a href={`https://maps.google.com/?q=${encodeURIComponent(clinic.address)}`} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 8, fontSize: 11, color: TEAL, fontWeight: 600, textDecoration: 'none' }}>
                        Map ↗
                      </a>
                    )}
                  </div>
                </div>
              )}
              {clinic.timings && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 5, fontSize: 12, color: '#64748b' }}>
                  <Clock style={{ width: 13, height: 13, color: '#94a3b8', flexShrink: 0, marginTop: 1 }} />
                  <span>{clinic.timings}</span>
                </div>
              )}
              {clinic.phone && (
                <a href={`tel:${clinic.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#1B4F8A', fontWeight: 600 }}>
                  <Phone style={{ width: 13, height: 13 }} /> {clinic.phone}
                </a>
              )}
            </div>
          ))}

          {doctor.clinicEmail && (
            <div style={{ display: 'flex', gap: 10, marginTop: 10, fontSize: 13 }}>
              <Mail style={{ width: 16, height: 16, color: '#94a3b8', flexShrink: 0, marginTop: 1 }} />
              <a href={`mailto:${doctor.clinicEmail}`} style={{ color: '#1B4F8A' }}>{doctor.clinicEmail}</a>
            </div>
          )}
          {doctor.gbpUrl && (
            <a href={doctor.gbpUrl} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 10, padding: '9px 12px', fontSize: 13, fontWeight: 600, color: '#334155', textDecoration: 'none', marginTop: 12 }}>
              <Globe style={{ width: 15, height: 15 }} /> View on Google Maps <span style={{ marginLeft: 'auto', color: '#94a3b8', fontSize: 12 }}>↗</span>
            </a>
          )}
        </div>

        {/* Share */}
        <div style={{ background: 'white', borderRadius: 16, padding: 18, marginBottom: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Share this Profile</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <a href={`https://wa.me/?text=${waText}`} target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#25D366', color: 'white', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
              <MessageCircle style={{ width: 16, height: 16 }} /> WhatsApp
            </a>
            <button onClick={copyLink}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: copied ? '#F0FDF4' : '#F8FAFC', border: `1.5px solid ${copied ? '#BBF7D0' : '#E2E8F0'}`, borderRadius: 12, padding: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: copied ? '#059669' : '#334155' }}>
              {copied ? <CheckCircle style={{ width: 16, height: 16 }} /> : <Copy style={{ width: 16, height: 16 }} />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8' }}>
          Powered by <a href="https://vyasa-health-os.pages.dev" style={{ color: '#1B4F8A', fontWeight: 700, textDecoration: 'none' }}>Vyasa Health OS</a>
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
