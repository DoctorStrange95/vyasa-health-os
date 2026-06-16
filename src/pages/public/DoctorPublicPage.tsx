import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  CheckCircle, Clock, MapPin, Phone, Mail, Globe,
  Copy, MessageCircle, Loader2, ChevronRight, ChevronLeft,
  Star, Shield, Calendar, Award, BookOpen, Stethoscope, Users
} from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'https://vyasa-os-backend.onrender.com';

interface PublicClinic {
  id: string; name: string; address: string; phone: string; timings: string;
  state?: string; city?: string; pincode?: string;
  lat?: number | null; lng?: number | null; hasSchedule?: boolean;
}

interface DoctorProfile {
  id: number; name: string; specialty: string; qualification: string;
  regNumber: string; bio: string; languages: string; acceptingPatients: boolean;
  gbpUrl: string; yearsExperience: number; consultationFee: number | null;
  profileSlug: string; profilePhotoUrl: string;
  education: string; services: string; awards: string;
  advancePayment?: boolean; advanceAmount?: number | null; paymentQrUrl?: string;
  clinicName: string; clinicAddress: string; clinicPhone: string; clinicEmail: string; timings: string;
  clinics: PublicClinic[];
}

interface SlotDay { date: string; slots: string[]; totalSlots: number; bookedCount: number; }

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function fmtDayLabel(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Today';
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
const AMBER = '#F59E0B';

export default function DoctorPublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [slotDays, setSlotDays] = useState<SlotDay[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  const [step, setStep] = useState<'select-clinic' | 'select-date' | 'select-time' | 'details' | 'payment' | 'done'>('select-date');
  const [selectedClinic, setSelectedClinic] = useState<PublicClinic | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', age: '', reason: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slotError, setSlotError] = useState('');

  function fetchSlots(clinicId?: string) {
    setLoadingSlots(true);
    const q = clinicId ? `&clinic_id=${encodeURIComponent(clinicId)}` : '';
    return fetch(`${API_BASE}/public/doctor/${slug}/slots?days=14&interval=15${q}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setSlotDays(d?.days ?? []); })
      .catch(() => setSlotDays([]))
      .finally(() => setLoadingSlots(false));
  }

  useEffect(() => {
    if (!slug) { setNotFound(true); setLoadingProfile(false); return; }
    fetch(`${API_BASE}/public/doctor/${slug}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: DoctorProfile) => {
        setDoctor(data);
        document.title = `Dr. ${data.name} — Book Appointment | Vyasa Health`;
        if (data.acceptingPatients) {
          // Chambers a patient can book: those with a weekly schedule set.
          const bookable = (data.clinics ?? []).filter(c => c.hasSchedule);
          if (bookable.length > 1) {
            // Patient picks the chamber (by location) first
            setStep('select-clinic');
          } else {
            const only = bookable[0] ?? data.clinics?.[0] ?? null;
            setSelectedClinic(only);
            setStep('select-date');
            return fetchSlots(only?.id);
          }
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoadingProfile(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = 'Enter a valid email';
    setErrors(e);
    return !Object.keys(e).length;
  }

  const advanceDue = Boolean(doctor?.advancePayment && doctor?.advanceAmount && doctor?.paymentQrUrl);
  // Online booking is only real when at least one clinic has a published schedule
  const bookingOpen = Boolean(doctor?.acceptingPatients && (doctor?.clinics ?? []).some(c => c.hasSchedule));

  // From the details form: go to payment step if the doctor requires an advance,
  // otherwise submit the booking directly.
  function handleDetailsNext() {
    if (!validate()) return;
    if (advanceDue) setStep('payment');
    else handleSubmit();
  }

  async function handleSubmit() {
    setSubmitting(true); setSlotError('');
    try {
      const res = await fetch(`${API_BASE}/public/doctor/${slug}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_name: form.name.trim(),
          patient_phone: form.phone.replace(/\D/g, '').slice(-10),
          patient_email: form.email.trim() || undefined,
          patient_age: form.age ? Number(form.age) : undefined,
          reason: form.reason.trim(),
          preferred_date: selectedDate,
          preferred_time: selectedTime,
          clinic_id: selectedClinic?.id,
        }),
      });
      if (res.status === 409) {
        const e = await res.json();
        setSlotError(e.error ?? 'Slot already taken. Please choose another time.');
        setStep('select-time');
        fetchSlots(selectedClinic?.id);
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
      <div style={{ textAlign: 'center' }}>
        <Loader2 style={{ width: 32, height: 32, color: TEAL, animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: '#94a3b8', fontSize: 13, fontFamily: 'Inter, sans-serif' }}>Loading profile…</p>
      </div>
    </div>
  );

  if (notFound || !doctor) return (
    <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, textAlign: 'center', background: '#f1f5f9', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ width: 64, height: 64, borderRadius: 16, background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
        <Stethoscope style={{ width: 28, height: 28, color: '#94a3b8' }} />
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: '4px 0 0' }}>Profile not found</h2>
      <p style={{ color: '#64748b', fontSize: 14, maxWidth: 280 }}>This link may be incorrect or the doctor's profile has been disabled.</p>
      <p style={{ color: '#cbd5e1', fontSize: 12, marginTop: 12 }}>Powered by Vyasa Integrated Healthcare</p>
    </div>
  );

  const selectedDayData = slotDays.find(d => d.date === selectedDate);
  const allClinics = doctor.clinics?.length > 0
    ? doctor.clinics
    : (doctor.clinicName ? [{ id: '0', name: doctor.clinicName, address: doctor.clinicAddress, phone: doctor.clinicPhone, timings: doctor.timings }] : []);

  return (
    <div style={{ minHeight: '100svh', background: '#EEF2F7', fontFamily: '"Inter", -apple-system, sans-serif' }}>

      {/* ─── HERO BANNER ─────────────────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(160deg, ${NAVY} 0%, #163560 55%, #0d4b6e 100%)`,
        paddingBottom: 80, position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 240, height: 240, borderRadius: '50%', background: 'rgba(13,148,136,0.12)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 20, left: -60, width: 180, height: 180, borderRadius: '50%', background: 'rgba(6,182,212,0.08)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 580, margin: '0 auto', padding: '20px 18px 0', position: 'relative' }}>
          {/* Brand bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img src="/logo.svg" alt="Vyasa" style={{ width: 30, height: 30, borderRadius: 8 }} />
              <span style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 700, fontSize: 12, letterSpacing: '1.2px' }}>VYASA INTEGRATED HEALTHCARE</span>
            </div>
            <span style={{
              background: bookingOpen ? 'rgba(16,185,129,0.15)' : doctor.acceptingPatients ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
              border: `1px solid ${bookingOpen ? 'rgba(16,185,129,0.4)' : doctor.acceptingPatients ? 'rgba(245,158,11,0.4)' : 'rgba(239,68,68,0.4)'}`,
              color: bookingOpen ? '#6ee7b7' : doctor.acceptingPatients ? '#fcd34d' : '#fca5a5',
              fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: bookingOpen ? '#10B981' : doctor.acceptingPatients ? '#F59E0B' : '#EF4444', display: 'inline-block' }} />
              {bookingOpen ? 'Accepting Patients' : doctor.acceptingPatients ? 'Bookings Opening Soon' : 'Not Accepting'}
            </span>
          </div>

          {/* Doctor identity */}
          <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
            {/* Photo */}
            <div style={{
              width: 96, height: 96, borderRadius: 24,
              background: 'linear-gradient(135deg, rgba(13,148,136,0.4), rgba(6,182,212,0.3))',
              border: '3px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, fontWeight: 800, color: 'white',
              flexShrink: 0, overflow: 'hidden', letterSpacing: -1,
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}>
              {doctor.profilePhotoUrl
                ? <img src={doctor.profilePhotoUrl} alt={`Dr. ${doctor.name}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initials(doctor.name)
              }
            </div>

            {/* Name / specialty */}
            <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                <h1 style={{ color: 'white', fontSize: 24, fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>
                  Dr. {doctor.name}
                </h1>
                {doctor.regNumber && (
                  <span style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.35)', color: '#6ee7b7', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Shield style={{ width: 9, height: 9 }} /> MCI Verified
                  </span>
                )}
              </div>

              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, margin: '0 0 10px', fontWeight: 500 }}>
                {doctor.specialty || 'Medical Professional'}
                {doctor.qualification ? <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}> · {doctor.qualification}</span> : null}
              </p>

              {/* Stat chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {doctor.yearsExperience > 0 && (
                  <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)', color: 'rgba(255,255,255,0.9)', fontSize: 12, padding: '4px 10px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600 }}>
                    <Star style={{ width: 11, height: 11, fill: AMBER, color: AMBER }} />
                    {doctor.yearsExperience}+ yrs exp
                  </div>
                )}
                {doctor.consultationFee && (
                  <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)', color: 'rgba(255,255,255,0.9)', fontSize: 12, padding: '4px 10px', borderRadius: 20, fontWeight: 600 }}>
                    ₹{doctor.consultationFee} fee
                  </div>
                )}
                {doctor.languages && (
                  <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)', color: 'rgba(255,255,255,0.75)', fontSize: 12, padding: '4px 10px', borderRadius: 20 }}>
                    {doctor.languages}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── CONTENT (overlaps hero) ──────────────────────────────────────── */}
      <div style={{ maxWidth: 580, margin: '-56px auto 0', padding: '0 16px 60px', position: 'relative' }}>

        {/* ─── NO SCHEDULE YET — accepting flag on but nothing bookable ──── */}
        {doctor.acceptingPatients && !bookingOpen && (
          <div style={{ background: 'white', borderRadius: 20, padding: '24px 20px', marginBottom: 14, textAlign: 'center', boxShadow: '0 4px 24px rgba(15,32,64,0.1)' }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Calendar style={{ width: 24, height: 24, color: '#D97706' }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#92400E', margin: '0 0 5px' }}>Online booking opening soon</p>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 14px', lineHeight: 1.6 }}>
              Dr. {doctor.name} hasn't published an appointment schedule yet.<br />Please contact the clinic directly to schedule a visit.
            </p>
            {doctor.clinicPhone && (
              <a href={`tel:${doctor.clinicPhone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: TEAL, color: 'white', borderRadius: 12, padding: '10px 18px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                <Phone style={{ width: 14, height: 14 }} /> Call Clinic
              </a>
            )}
          </div>
        )}

        {/* ─── BOOKING CARD ──────────────────────────────────────────────── */}
        {bookingOpen ? (
          <div style={{ background: 'white', borderRadius: 24, overflow: 'hidden', marginBottom: 14, boxShadow: '0 8px 40px rgba(15,32,64,0.15)' }}>
            {step !== 'done' && (() => {
              const multiClinic = (doctor.clinics ?? []).filter(c => c.hasSchedule).length > 1;
              const wizardSteps: [string, string][] = [
                ...(multiClinic ? [['select-clinic', 'Clinic'] as [string, string]] : []),
                ['select-date', 'Date'], ['select-time', 'Time'], ['details', 'Your Info'],
                ...(advanceDue ? [['payment', 'Payment'] as [string, string]] : []),
              ];
              const idx = wizardSteps.findIndex(([s]) => s === step);
              return (
                <div style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1B4F8A 100%)`, padding: '16px 20px 14px' }}>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700, letterSpacing: '1px', margin: '0 0 12px', textTransform: 'uppercase' }}>Book an Appointment</p>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {wizardSteps.map(([s, label], i) => {
                      const isActive = step === s;
                      const isDone = i < idx;
                      return (
                        <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < wizardSteps.length - 1 ? 1 : 0 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: isDone ? '#10B981' : isActive ? TEAL : 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: isDone || isActive ? 'white' : 'rgba(255,255,255,0.3)', transition: 'all 0.2s' }}>
                              {isDone ? <CheckCircle style={{ width: 14, height: 14 }} /> : i + 1}
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 600, color: isActive ? 'white' : isDone ? '#6ee7b7' : 'rgba(255,255,255,0.3)', letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>{label}</span>
                          </div>
                          {i < wizardSteps.length - 1 && <div style={{ flex: 1, height: 2, background: isDone ? '#10B981' : 'rgba(255,255,255,0.12)', margin: '0 6px 14px', borderRadius: 2, transition: 'background 0.3s' }} />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            <div style={{ padding: '20px 20px 22px' }}>
              {/* STEP 0 — Pick Clinic (only when the doctor has multiple chambers) */}
              {step === 'select-clinic' && (
                <>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 7 }}>
                    <MapPin style={{ width: 16, height: 16, color: TEAL }} /> Choose a Clinic
                  </h3>
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 14px' }}>Dr. {doctor.name} consults at multiple locations — pick the one nearest to you.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {(doctor.clinics ?? []).filter(c => c.hasSchedule).map(c => (
                      <button key={c.id}
                        onClick={() => { setSelectedClinic(c); setSelectedDate(''); setSelectedTime(''); setStep('select-date'); fetchSlots(c.id); }}
                        style={{ textAlign: 'left', padding: '14px 16px', borderRadius: 14, border: '1.5px solid', borderColor: selectedClinic?.id === c.id ? TEAL : '#e2e8f0', background: selectedClinic?.id === c.id ? '#f0fdfa' : 'white', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#0f2040' }}>{c.name}</span>
                          <ChevronRight style={{ width: 16, height: 16, color: TEAL, flexShrink: 0 }} />
                        </div>
                        {(c.city || c.pincode) && (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#f0fdfa', border: '1px solid #99f6e4', color: '#0f766e', fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 16, marginTop: 6 }}>
                            <MapPin style={{ width: 10, height: 10 }} />
                            {[c.city, c.state, c.pincode].filter(Boolean).join(', ')}
                          </div>
                        )}
                        {c.address && <p style={{ fontSize: 12, color: '#64748b', margin: '6px 0 0', lineHeight: 1.5 }}>{c.address}</p>}
                        {c.timings && <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0' }}>{c.timings}</p>}
                        {(c.lat != null && c.lng != null) ? (
                          <span style={{ display: 'inline-block', fontSize: 11, color: TEAL, fontWeight: 700, marginTop: 6 }}
                            onClick={e => { e.stopPropagation(); window.open(`https://maps.google.com/?q=${c.lat},${c.lng}`, '_blank'); }}>
                            View on map ↗
                          </span>
                        ) : c.address ? (
                          <span style={{ display: 'inline-block', fontSize: 11, color: TEAL, fontWeight: 700, marginTop: 6 }}
                            onClick={e => { e.stopPropagation(); window.open(`https://maps.google.com/?q=${encodeURIComponent(c.address)}`, '_blank'); }}>
                            View on map ↗
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* STEP 1 — Date */}
              {step === 'select-date' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    {(doctor.clinics ?? []).filter(c => c.hasSchedule).length > 1 && (
                      <button onClick={() => setStep('select-clinic')} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '6px 9px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748b' }}>
                        <ChevronLeft style={{ width: 16, height: 16 }} />
                      </button>
                    )}
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 7 }}>
                        <Calendar style={{ width: 16, height: 16, color: TEAL }} /> Select a Date
                      </h3>
                      {selectedClinic && (
                        <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>
                          at <strong>{selectedClinic.name}</strong>{selectedClinic.city ? ` · ${selectedClinic.city}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  {loadingSlots ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '28px 0' }}>
                      <Loader2 style={{ width: 26, height: 26, color: TEAL, animation: 'spin 1s linear infinite' }} />
                    </div>
                  ) : slotDays.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '28px 0', color: '#64748b' }}>
                      <Calendar style={{ width: 40, height: 40, margin: '0 auto 10px', color: '#cbd5e1' }} />
                      <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 4px', color: '#374151' }}>No slots in the next 14 days</p>
                      <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 14px' }}>Please contact the clinic to schedule directly.</p>
                      {doctor.clinicPhone && (
                        <a href={`tel:${doctor.clinicPhone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: TEAL, color: 'white', borderRadius: 12, padding: '10px 18px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                          <Phone style={{ width: 14, height: 14 }} /> Call Clinic
                        </a>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 9 }}>
                      {slotDays.map(d => (
                        <button key={d.date} onClick={() => { setSelectedDate(d.date); setSelectedTime(''); setStep('select-time'); }}
                          style={{ padding: '11px 8px', borderRadius: 14, border: '1.5px solid', borderColor: selectedDate === d.date ? TEAL : '#e2e8f0', background: selectedDate === d.date ? '#f0fdfa' : 'white', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s', fontFamily: 'inherit', boxShadow: selectedDate === d.date ? `0 0 0 3px ${TEAL}20` : 'none' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: TEAL, marginBottom: 3, letterSpacing: '0.3px' }}>{fmtDayLabel(d.date).toUpperCase()}</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{d.slots.length}</div>
                          <div style={{ fontSize: 10, color: '#94a3b8' }}>slots</div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* STEP 2 — Time */}
              {step === 'select-time' && selectedDayData && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <button onClick={() => setStep('select-date')} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '6px 9px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748b' }}>
                      <ChevronLeft style={{ width: 16, height: 16 }} />
                    </button>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: 0 }}>Pick a Time</h3>
                      <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>{fmtFullDate(selectedDate)}</p>
                    </div>
                  </div>
                  {slotError && (
                    <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', borderRadius: 10, padding: '10px 12px', fontSize: 13, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      {slotError}
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {selectedDayData.slots.map(t => (
                      <button key={t} onClick={() => { setSelectedTime(t); setSlotError(''); setStep('details'); }}
                        style={{ padding: '11px 6px', borderRadius: 12, border: '1.5px solid', borderColor: selectedTime === t ? TEAL : '#e2e8f0', background: selectedTime === t ? '#f0fdfa' : 'white', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: selectedTime === t ? TEAL : '#374151', transition: 'all 0.15s', fontFamily: 'inherit', boxShadow: selectedTime === t ? `0 0 0 3px ${TEAL}20` : 'none' }}>
                        {fmtTime12(t)}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* STEP 3 — Details */}
              {step === 'details' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <button onClick={() => setStep('select-time')} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '6px 9px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748b' }}>
                      <ChevronLeft style={{ width: 16, height: 16 }} />
                    </button>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: 0 }}>Your Details</h3>
                      <p style={{ fontSize: 12, color: TEAL, margin: '2px 0 0', fontWeight: 600 }}>
                        {fmtDayLabel(selectedDate)} · {fmtTime12(selectedTime)}
                      </p>
                    </div>
                  </div>

                  {doctor.consultationFee && (
                    <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#92400E', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      Consultation fee: <strong>₹{doctor.consultationFee}</strong> (payable at clinic)
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.7px' }}>Full Name *</label>
                      <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Ravi Kumar"
                        style={{ width: '100%', border: `1.5px solid ${errors.name ? '#EF4444' : '#e2e8f0'}`, borderRadius: 12, padding: '11px 14px', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.15s' }} />
                      {errors.name && <p style={{ color: '#EF4444', fontSize: 11, margin: '4px 0 0' }}>{errors.name}</p>}
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.7px' }}>Mobile Number *</label>
                      <input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} placeholder="10-digit number" type="tel" inputMode="numeric"
                        style={{ width: '100%', border: `1.5px solid ${errors.phone ? '#EF4444' : '#e2e8f0'}`, borderRadius: 12, padding: '11px 14px', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                      {errors.phone && <p style={{ color: '#EF4444', fontSize: 11, margin: '4px 0 0' }}>{errors.phone}</p>}
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.7px' }}>Email <span style={{ color: '#cbd5e1', textTransform: 'none' }}>(for booking confirmation)</span></label>
                      <input value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="you@example.com" type="email" inputMode="email"
                        style={{ width: '100%', border: `1.5px solid ${errors.email ? '#EF4444' : '#e2e8f0'}`, borderRadius: 12, padding: '11px 14px', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                      {errors.email && <p style={{ color: '#EF4444', fontSize: 11, margin: '4px 0 0' }}>{errors.email}</p>}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.7px' }}>Age</label>
                        <input value={form.age} onChange={e => setForm(f => ({...f, age: e.target.value}))} placeholder="Years" type="number" min={1} max={120}
                          style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '11px 14px', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.7px' }}>Reason</label>
                        <input value={form.reason} onChange={e => setForm(f => ({...f, reason: e.target.value}))} placeholder="e.g. Fever"
                          style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '11px 14px', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                      </div>
                    </div>
                    <button onClick={handleDetailsNext} disabled={submitting}
                      style={{ background: submitting ? '#94a3b8' : `linear-gradient(135deg, ${TEAL}, #0891b2)`, color: 'white', border: 'none', borderRadius: 14, padding: '14px', fontSize: 15, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit', marginTop: 2, transition: 'all 0.2s', boxShadow: submitting ? 'none' : '0 4px 16px rgba(13,148,136,0.3)' }}>
                      {submitting ? <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} /> : <ChevronRight style={{ width: 18, height: 18 }} />}
                      {submitting ? 'Booking…' : advanceDue ? `Continue to Payment (₹${doctor.advanceAmount})` : 'Confirm Appointment'}
                    </button>
                  </div>
                </>
              )}

              {/* STEP — Advance Payment (only when the doctor requires it) */}
              {step === 'payment' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <button onClick={() => setStep('details')} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '6px 9px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748b' }}>
                      <ChevronLeft style={{ width: 16, height: 16 }} />
                    </button>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: 0 }}>Advance Payment</h3>
                      <p style={{ fontSize: 12, color: TEAL, margin: '2px 0 0', fontWeight: 600 }}>
                        {fmtDayLabel(selectedDate)} · {fmtTime12(selectedTime)}
                      </p>
                    </div>
                  </div>

                  <div style={{ textAlign: 'center', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 16, padding: '20px 16px', marginBottom: 14 }}>
                    <p style={{ fontSize: 13, color: '#475569', margin: '0 0 4px' }}>Dr. {doctor.name} requires an advance of</p>
                    <p style={{ fontSize: 28, fontWeight: 900, color: '#0f2040', margin: '0 0 14px' }}>₹{doctor.advanceAmount}</p>
                    {doctor.paymentQrUrl && (
                      <img src={doctor.paymentQrUrl} alt="Scan to pay via UPI"
                        style={{ width: 200, height: 200, objectFit: 'contain', background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: 8 }} />
                    )}
                    <p style={{ fontSize: 12, color: '#64748b', margin: '12px 0 0' }}>Scan with any UPI app — GPay, PhonePe, Paytm</p>
                  </div>

                  <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '10px 14px', fontSize: 12, color: '#92400E', marginBottom: 14, lineHeight: 1.6 }}>
                    After paying, tap the button below. The clinic will verify your payment when confirming the appointment — keep your payment screenshot handy.
                  </div>

                  <button onClick={handleSubmit} disabled={submitting}
                    style={{ width: '100%', background: submitting ? '#94a3b8' : `linear-gradient(135deg, ${TEAL}, #0891b2)`, color: 'white', border: 'none', borderRadius: 14, padding: '14px', fontSize: 15, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit', boxShadow: submitting ? 'none' : '0 4px 16px rgba(13,148,136,0.3)' }}>
                    {submitting ? <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} /> : <CheckCircle style={{ width: 18, height: 18 }} />}
                    {submitting ? 'Booking…' : "I've Paid — Confirm Booking"}
                  </button>
                </>
              )}

              {/* DONE */}
              {step === 'done' && (
                <div style={{ textAlign: 'center', padding: '12px 0 4px' }}>
                  <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #D1FAE5, #A7F3D0)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 4px 24px rgba(16,185,129,0.2)' }}>
                    <CheckCircle style={{ width: 40, height: 40, color: '#059669' }} />
                  </div>
                  <h3 style={{ color: '#065F46', fontWeight: 800, fontSize: 20, margin: '0 0 8px' }}>Appointment Requested!</h3>
                  <p style={{ color: '#047857', fontSize: 13, lineHeight: 1.8, margin: '0 0 18px' }}>
                    Dr. {doctor.name}'s team will call <strong>+91 {form.phone.replace(/\D/g,'').slice(-10)}</strong> to confirm.<br />
                    <strong>{fmtFullDate(selectedDate)}</strong> at <strong>{fmtTime12(selectedTime)}</strong>
                  </p>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {doctor.clinicPhone && (
                      <a href={`tel:${doctor.clinicPhone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#F0FDF4', color: '#065F46', border: '1.5px solid #BBF7D0', borderRadius: 12, padding: '10px 16px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                        <Phone style={{ width: 14, height: 14 }} /> Call Clinic
                      </a>
                    )}
                    <button onClick={() => { setStep('select-date'); setSelectedDate(''); setSelectedTime(''); setForm({ name: '', phone: '', email: '', age: '', reason: '' }); fetchSlots(selectedClinic?.id); }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'white', color: '#475569', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Book Another Slot
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : !doctor.acceptingPatients ? (
          /* Not accepting */
          <div style={{ background: 'white', borderRadius: 20, padding: '20px 20px', marginBottom: 14, textAlign: 'center', boxShadow: '0 4px 24px rgba(15,32,64,0.1)' }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Users style={{ width: 24, height: 24, color: '#DC2626' }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#7C3AED', margin: '0 0 5px' }}>Not Accepting New Patients</p>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Please check back later or contact the clinic directly.</p>
          </div>
        ) : null}

        {/* ─── ABOUT ─────────────────────────────────────────────────────── */}
        {doctor.bio && (
          <div style={{ background: 'white', borderRadius: 20, padding: '20px', marginBottom: 12, boxShadow: '0 2px 16px rgba(15,32,64,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BookOpen style={{ width: 18, height: 18, color: TEAL }} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>About</span>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.85, color: '#374151', margin: 0 }}>{doctor.bio}</p>
          </div>
        )}

        {/* ─── SERVICES OFFERED ──────────────────────────────────────────── */}
        {doctor.services && (
          <div style={{ background: 'white', borderRadius: 20, padding: '20px', marginBottom: 12, boxShadow: '0 2px 16px rgba(15,32,64,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Stethoscope style={{ width: 18, height: 18, color: TEAL }} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>Services Offered</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {doctor.services.split(/[,\n]/).map(s => s.trim()).filter(Boolean).map(s => (
                <span key={s} style={{ background: '#f0fdfa', border: '1px solid #99f6e4', color: '#0f766e', fontSize: 13, fontWeight: 600, padding: '6px 13px', borderRadius: 20 }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ─── EDUCATION & TRAINING ──────────────────────────────────────── */}
        {doctor.education && (
          <div style={{ background: 'white', borderRadius: 20, padding: '20px', marginBottom: 12, boxShadow: '0 2px 16px rgba(15,32,64,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>Education & Training</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {doctor.education.split('\n').map(l => l.trim()).filter(Boolean).map((line, i, arr) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  {/* Timeline dot + line */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 5 }}>
                    <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#6366f1', flexShrink: 0 }} />
                    {i < arr.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 22, background: '#e0e7ff', marginTop: 3 }} />}
                  </div>
                  <p style={{ fontSize: 14, color: '#374151', fontWeight: 500, margin: '0 0 14px', lineHeight: 1.5 }}>{line}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── AWARDS & MEMBERSHIPS ──────────────────────────────────────── */}
        {doctor.awards && (
          <div style={{ background: 'white', borderRadius: 20, padding: '20px', marginBottom: 12, boxShadow: '0 2px 16px rgba(15,32,64,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Award style={{ width: 18, height: 18, color: AMBER }} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>Awards & Memberships</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {doctor.awards.split('\n').map(l => l.trim()).filter(Boolean).map((line, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <Star style={{ width: 14, height: 14, color: AMBER, fill: AMBER, flexShrink: 0, marginTop: 3 }} />
                  <p style={{ fontSize: 14, color: '#374151', margin: 0, lineHeight: 1.5 }}>{line}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── CREDENTIALS ───────────────────────────────────────────────── */}
        {(doctor.specialty || doctor.qualification || doctor.yearsExperience > 0 || doctor.languages || doctor.consultationFee || doctor.regNumber) && (
          <div style={{ background: 'white', borderRadius: 20, padding: '20px', marginBottom: 12, boxShadow: '0 2px 16px rgba(15,32,64,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Award style={{ width: 18, height: 18, color: '#0284c7' }} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>Credentials</span>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {[
                { icon: <Stethoscope style={{ width: 15, height: 15, color: TEAL }} />, label: 'Specialty', value: doctor.specialty, bg: '#f0fdfa' },
                { icon: <Award style={{ width: 15, height: 15, color: '#0284c7' }} />, label: 'Qualification', value: doctor.qualification, bg: '#f0f9ff' },
                { icon: <Star style={{ width: 15, height: 15, color: AMBER, fill: AMBER }} />, label: 'Experience', value: doctor.yearsExperience > 0 ? `${doctor.yearsExperience} years` : '', bg: '#fffbeb' },
                { icon: <Globe style={{ width: 15, height: 15, color: '#8b5cf6' }} />, label: 'Languages', value: doctor.languages, bg: '#faf5ff' },
                { icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8"/><line x1="12" y1="6" x2="12" y2="8"/><line x1="12" y1="16" x2="12" y2="18"/></svg>, label: 'Consultation Fee', value: doctor.consultationFee ? `₹${doctor.consultationFee}` : '', bg: '#f0fdf4' },
                { icon: <Shield style={{ width: 15, height: 15, color: '#64748b' }} />, label: 'Registration No.', value: doctor.regNumber, bg: '#f8fafc' },
              ].filter(r => r.value).map(r => (
                <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: r.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {r.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{r.label}</div>
                    <div style={{ fontSize: 14, color: '#1e293b', fontWeight: 600, marginTop: 1 }}>{r.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── CLINICS & CONTACT ─────────────────────────────────────────── */}
        {allClinics.length > 0 && (
          <div style={{ background: 'white', borderRadius: 20, padding: '20px', marginBottom: 12, boxShadow: '0 2px 16px rgba(15,32,64,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MapPin style={{ width: 18, height: 18, color: '#d97706' }} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                {allClinics.length === 1 ? 'Clinic & Contact' : `${allClinics.length} Clinics`}
              </span>
            </div>

            {allClinics.map((clinic, idx) => (
              <div key={clinic.id} style={{ marginBottom: idx < allClinics.length - 1 ? 18 : 0, paddingBottom: idx < allClinics.length - 1 ? 18 : 0, borderBottom: idx < allClinics.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f2040', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  {clinic.name}
                </div>
                {clinic.address && (
                  <div style={{ display: 'flex', gap: 9, marginBottom: 8, fontSize: 13, color: '#475569', alignItems: 'flex-start' }}>
                    <MapPin style={{ width: 14, height: 14, color: '#94a3b8', flexShrink: 0, marginTop: 2 }} />
                    <div style={{ flex: 1 }}>
                      {clinic.address}
                      <a href={`https://maps.google.com/?q=${encodeURIComponent(clinic.address)}`} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 8, fontSize: 11, color: TEAL, fontWeight: 700, textDecoration: 'none', background: '#f0fdfa', padding: '2px 7px', borderRadius: 6 }}>
                        Maps ↗
                      </a>
                    </div>
                  </div>
                )}
                {clinic.timings && (
                  <div style={{ display: 'flex', gap: 9, marginBottom: 8, fontSize: 13, color: '#64748b', alignItems: 'center' }}>
                    <Clock style={{ width: 14, height: 14, color: '#94a3b8', flexShrink: 0 }} />
                    <span>{clinic.timings}</span>
                  </div>
                )}
                {clinic.phone && (
                  <a href={`tel:${clinic.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#f0fdfa', border: '1px solid #99f6e4', color: '#0f766e', borderRadius: 10, padding: '8px 13px', fontSize: 13, fontWeight: 700, textDecoration: 'none', marginTop: 4 }}>
                    <Phone style={{ width: 13, height: 13 }} /> {clinic.phone}
                  </a>
                )}
              </div>
            ))}

            {(doctor.clinicEmail || doctor.gbpUrl) && (
              <div style={{ marginTop: allClinics.length > 0 ? 14 : 0, paddingTop: allClinics.length > 0 ? 14 : 0, borderTop: allClinics.length > 0 ? '1px solid #f1f5f9' : 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {doctor.clinicEmail && (
                  <a href={`mailto:${doctor.clinicEmail}`} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, color: '#1B4F8A', fontWeight: 500, textDecoration: 'none' }}>
                    <Mail style={{ width: 15, height: 15, color: '#94a3b8', flexShrink: 0 }} />
                    {doctor.clinicEmail}
                  </a>
                )}
                {doctor.gbpUrl && (
                  <a href={doctor.gbpUrl} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#334155', textDecoration: 'none' }}>
                    <Globe style={{ width: 15, height: 15, color: '#64748b' }} />
                    <span style={{ flex: 1 }}>View on Google Maps</span>
                    <span style={{ color: '#94a3b8', fontSize: 12 }}>↗</span>
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── SHARE ─────────────────────────────────────────────────────── */}
        <div style={{ background: 'white', borderRadius: 20, padding: '18px 20px', marginBottom: 12, boxShadow: '0 2px 16px rgba(15,32,64,0.08)' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 12px' }}>Share this Profile</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <a href={`https://wa.me/?text=${waText}`} target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#25D366', color: 'white', borderRadius: 14, padding: '13px', fontSize: 14, fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 12px rgba(37,211,102,0.3)' }}>
              <MessageCircle style={{ width: 17, height: 17 }} /> WhatsApp
            </a>
            <button onClick={copyLink}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: copied ? '#f0fdf4' : '#f8fafc', border: `1.5px solid ${copied ? '#bbf7d0' : '#e2e8f0'}`, borderRadius: 14, padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: copied ? '#059669' : '#334155', transition: 'all 0.2s' }}>
              {copied ? <CheckCircle style={{ width: 17, height: 17 }} /> : <Copy style={{ width: 17, height: 17 }} />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#cbd5e1', paddingBottom: 8 }}>
          Powered by <a href="https://vyasaa.com" style={{ color: '#0d9488', fontWeight: 700, textDecoration: 'none' }}>Vyasa Integrated Healthcare</a>
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        input:focus { border-color: #0d9488 !important; box-shadow: 0 0 0 3px rgba(13,148,136,0.15); }
        button:active { opacity: 0.88; }
      `}</style>
    </div>
  );
}
