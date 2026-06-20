import { useState, useEffect, useRef } from 'react';
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
  regNumber: string; nmcVerified?: boolean; bio: string; languages: string; acceptingPatients: boolean;
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

const ITEM_H = 58;
const PAD = 2; // items above/below centre

function fmt12(t: string) {
  if (!t) return { time: '', period: '' };
  const [h, m] = t.split(':').map(Number);
  return { time: `${h % 12 || 12}:${String(m).padStart(2, '0')}`, period: h >= 12 ? 'PM' : 'AM' };
}

// ── Scroll-triggered reveal card ──────────────────────────────────────────────
function RevealCard({ children, delay = 0, style = {} }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ transition: `opacity 0.6s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.6s cubic-bezier(0.22,1,0.36,1) ${delay}ms`, opacity: vis ? 1 : 0, transform: vis ? 'translateY(0) scale(1)' : 'translateY(32px) scale(0.97)', ...style }}>
      {children}
    </div>
  );
}

function TimeDrumPicker({ slots, date, error, onBack, onSelect }: {
  slots: string[]; date: string; error: string;
  onBack: () => void; onSelect: (t: string) => void;
}) {
  const nowIST = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' });
  const initIdx = Math.max(0, (() => { const i = slots.findIndex(t => t >= nowIST); return i < 0 ? 0 : i; })());

  const [idx, setIdx] = useState(initIdx);
  const drumRef = useRef<HTMLDivElement>(null);
  const snapTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const didMount = useRef(false);

  // Set initial scroll position instantly (no animation on mount)
  useEffect(() => {
    if (drumRef.current) drumRef.current.scrollTop = initIdx * ITEM_H;
    didMount.current = true;
  }, []);

  function handleScroll() {
    if (!drumRef.current) return;
    const raw = drumRef.current.scrollTop / ITEM_H;
    const clamped = Math.max(0, Math.min(slots.length - 1, Math.round(raw)));
    setIdx(clamped);
    clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => {
      const snapped = Math.max(0, Math.min(slots.length - 1, Math.round((drumRef.current?.scrollTop ?? 0) / ITEM_H)));
      setIdx(snapped);
      drumRef.current?.scrollTo({ top: snapped * ITEM_H, behavior: 'smooth' });
    }, 100);
  }

  function nudge(dir: -1 | 1) {
    const next = Math.max(0, Math.min(slots.length - 1, idx + dir));
    setIdx(next);
    drumRef.current?.scrollTo({ top: next * ITEM_H, behavior: 'smooth' });
  }

  const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const selected = slots[idx] ?? '';
  const { time: selTime, period: selPeriod } = fmt12(selected);

  return (
    <div style={{ fontFamily: '"Inter", -apple-system, sans-serif' }}>
      <style>{`
        .drum-wrap::-webkit-scrollbar { display: none; }
        @keyframes drum-in { from { opacity: 0; transform: translateY(12px) scale(0.97); } to { opacity: 1; transform: none; } }
        @keyframes btn-pulse { 0%,100% { box-shadow: 0 6px 24px rgba(13,148,136,0.38); } 50% { box-shadow: 0 6px 32px rgba(13,148,136,0.55); } }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={onBack} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 11, cursor: 'pointer', color: '#64748b', flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <ChevronLeft style={{ width: 16, height: 16 }} />
        </button>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f2040', margin: 0, letterSpacing: '-0.3px' }}>Pick a Time</h3>
          <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0', fontWeight: 500 }}>{fmtDate(date)}</p>
        </div>
        <div style={{ marginLeft: 'auto', background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, color: TEAL }}>
          {slots.length} slots
        </div>
      </div>

      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', borderRadius: 12, padding: '10px 14px', fontSize: 13, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {error}
        </div>
      )}

      {/* Drum picker card */}
      <div style={{ background: 'white', borderRadius: 22, border: '1.5px solid #e2e8f0', boxShadow: '0 4px 28px rgba(15,32,64,0.08)', overflow: 'hidden', marginBottom: 14, animation: 'drum-in 0.32s cubic-bezier(0.22,1,0.36,1) both' }}>

        {/* Up nudge */}
        <button onClick={() => nudge(-1)} disabled={idx === 0}
          style={{ width: '100%', padding: '10px 0', background: 'transparent', border: 'none', borderBottom: '1px solid #f1f5f9', cursor: idx === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: idx === 0 ? '#cbd5e1' : '#94a3b8', transition: 'color 0.15s' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
        </button>

        {/* Drum scroll area */}
        <div style={{ position: 'relative' }}>
          {/* Top fade */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: ITEM_H * PAD, background: 'linear-gradient(to bottom, rgba(255,255,255,1) 10%, rgba(255,255,255,0.85) 60%, transparent)', zIndex: 2, pointerEvents: 'none' }} />
          {/* Selection highlight strip */}
          <div style={{ position: 'absolute', top: ITEM_H * PAD, left: 14, right: 14, height: ITEM_H, background: 'linear-gradient(135deg, rgba(13,148,136,0.07), rgba(8,145,178,0.07))', border: '1.5px solid rgba(13,148,136,0.22)', borderRadius: 16, zIndex: 1, pointerEvents: 'none', boxShadow: '0 2px 14px rgba(13,148,136,0.1)' }} />
          {/* Bottom fade */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: ITEM_H * PAD, background: 'linear-gradient(to top, rgba(255,255,255,1) 10%, rgba(255,255,255,0.85) 60%, transparent)', zIndex: 2, pointerEvents: 'none' }} />

          <div ref={drumRef} onScroll={handleScroll} className="drum-wrap"
            style={{ height: ITEM_H * (PAD * 2 + 1), overflowY: 'scroll', scrollbarWidth: 'none', paddingTop: ITEM_H * PAD, paddingBottom: ITEM_H * PAD }}>
            {slots.map((t, i) => {
              const dist = Math.abs(i - idx);
              const { time, period } = fmt12(t);
              const isActive = dist === 0;
              const isNear = dist === 1;
              return (
                <div key={t}
                  onClick={() => { setIdx(i); drumRef.current?.scrollTo({ top: i * ITEM_H, behavior: 'smooth' }); }}
                  style={{
                    height: ITEM_H,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    cursor: isActive ? 'default' : 'pointer',
                    transition: 'transform 0.18s cubic-bezier(0.22,1,0.36,1), opacity 0.18s ease',
                    transform: `scale(${isActive ? 1 : isNear ? 0.84 : 0.7})`,
                    opacity: isActive ? 1 : isNear ? 0.42 : 0.18,
                    position: 'relative', zIndex: 3,
                    userSelect: 'none',
                  }}>
                  <span style={{ fontSize: isActive ? 28 : isNear ? 20 : 16, fontWeight: isActive ? 900 : 600, color: isActive ? TEAL : '#0f2040', letterSpacing: '-0.8px', fontVariantNumeric: 'tabular-nums', lineHeight: 1, transition: 'font-size 0.18s, color 0.18s' }}>
                    {time}
                  </span>
                  <span style={{ fontSize: isActive ? 14 : 11, fontWeight: 700, color: isActive ? '#0891b2' : '#94a3b8', letterSpacing: '0.5px', alignSelf: 'flex-end', paddingBottom: isActive ? 4 : 2, transition: 'font-size 0.18s, color 0.18s' }}>
                    {period}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Down nudge */}
        <button onClick={() => nudge(1)} disabled={idx === slots.length - 1}
          style={{ width: '100%', padding: '10px 0', background: 'transparent', border: 'none', borderTop: '1px solid #f1f5f9', cursor: idx === slots.length - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: idx === slots.length - 1 ? '#cbd5e1' : '#94a3b8', transition: 'color 0.15s' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
      </div>

      {/* Confirm button */}
      <button onClick={() => onSelect(selected)}
        style={{ width: '100%', background: `linear-gradient(135deg, ${TEAL} 0%, #0891b2 100%)`, color: 'white', border: 'none', borderRadius: 16, padding: '15px 20px', fontSize: 16, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, letterSpacing: '-0.3px', animation: 'btn-pulse 2.4s ease-in-out infinite', transition: 'transform 0.15s, opacity 0.15s' }}
        onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
        onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
        <Calendar style={{ width: 17, height: 17, opacity: 0.85 }} />
        Book {selTime} {selPeriod}
        <ChevronRight style={{ width: 17, height: 17, opacity: 0.7 }} />
      </button>
    </div>
  );
}

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
  const [form, setForm] = useState({ name: '', phone: '', email: '', age: '', gender: '', reason: '' });
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
    if (!form.age || Number(form.age) < 1) e.age = 'Age is required';
    if (!form.gender) e.gender = 'Please select gender';
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
          patient_gender: form.gender,
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
    <div style={{ minHeight: '100svh', background: '#f0f4f8', fontFamily: '"Inter", -apple-system, sans-serif', backgroundImage: 'radial-gradient(circle, rgba(13,148,136,0.04) 1px, transparent 1px)', backgroundSize: '28px 28px' }}>

      {/* ─── HERO BANNER ─────────────────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(160deg, ${NAVY} 0%, #163560 55%, #0d4b6e 100%)`,
        paddingBottom: 88, position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative orbs */}
        <div style={{ position: 'absolute', top: -60, right: -60, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(13,148,136,0.18) 0%, transparent 70%)', pointerEvents: 'none', animation: 'orb-float 6s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: 30, left: -80, width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)', pointerEvents: 'none', animation: 'orb-float 8s ease-in-out infinite reverse' }} />
        <div style={{ position: 'absolute', top: '40%', right: '15%', width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.02)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 580, margin: '0 auto', padding: '20px 18px 0', position: 'relative' }}>
          {/* Brand bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36, animation: 'slide-down 0.4s cubic-bezier(0.22,1,0.36,1) both' }}>
            <a href="https://vyasaa.com" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
              <img src="/logo.svg" alt="Vyasa" style={{ width: 30, height: 30, borderRadius: 8 }} />
              <span style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 700, fontSize: 12, letterSpacing: '1.2px' }}>VYASA INTEGRATED HEALTHCARE</span>
            </a>
            <span style={{
              background: bookingOpen ? 'rgba(16,185,129,0.15)' : doctor.acceptingPatients ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
              border: `1px solid ${bookingOpen ? 'rgba(16,185,129,0.4)' : doctor.acceptingPatients ? 'rgba(245,158,11,0.4)' : 'rgba(239,68,68,0.4)'}`,
              color: bookingOpen ? '#6ee7b7' : doctor.acceptingPatients ? '#fcd34d' : '#fca5a5',
              fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 20,
              display: 'flex', alignItems: 'center', gap: 5,
              animation: bookingOpen ? 'badge-breathe 3s ease-in-out 0.6s infinite' : 'none',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: bookingOpen ? '#10B981' : doctor.acceptingPatients ? '#F59E0B' : '#EF4444', display: 'inline-block' }} />
              {bookingOpen ? 'Accepting Patients' : doctor.acceptingPatients ? 'Bookings Opening Soon' : 'Not Accepting'}
            </span>
          </div>

          {/* Doctor identity */}
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', animation: 'hero-reveal 0.6s cubic-bezier(0.22,1,0.36,1) 0.1s both' }}>
            {/* Photo with glow ring */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                width: 104, height: 104, borderRadius: 26,
                background: 'linear-gradient(135deg, rgba(13,148,136,0.4), rgba(6,182,212,0.3))',
                border: '3px solid rgba(255,255,255,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 34, fontWeight: 800, color: 'white',
                overflow: 'hidden', letterSpacing: -1,
                boxShadow: '0 12px 40px rgba(0,0,0,0.35), 0 0 0 6px rgba(13,148,136,0.15)',
                animation: 'photo-ring 3s ease-in-out 1s infinite',
              }}>
                {doctor.profilePhotoUrl
                  ? <img src={doctor.profilePhotoUrl} alt={`Dr. ${doctor.name}`} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }} />
                  : initials(doctor.name)
                }
              </div>
              {/* Small verified dot */}
              {doctor.nmcVerified && (
                <div style={{ position: 'absolute', bottom: -4, right: -4, width: 22, height: 22, borderRadius: '50%', background: '#10B981', border: '2px solid rgba(15,32,64,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield style={{ width: 11, height: 11, color: 'white' }} />
                </div>
              )}
            </div>

            {/* Name / specialty */}
            <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                <h1 style={{ color: 'white', fontSize: 24, fontWeight: 900, margin: 0, letterSpacing: '-0.5px', lineHeight: 1.2 }}>
                  Dr. {doctor.name}
                </h1>
                {doctor.nmcVerified && (
                  <span style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.35)', color: '#6ee7b7', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Shield style={{ width: 9, height: 9 }} /> NMC Verified
                  </span>
                )}
              </div>

              <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: 14, margin: '0 0 12px', fontWeight: 500, lineHeight: 1.5 }}>
                {doctor.specialty || 'Medical Professional'}
                {doctor.qualification ? <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}> · {doctor.qualification}</span> : null}
              </p>

              {/* Stat chips with stagger */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {doctor.yearsExperience > 0 && (
                  <div style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', color: 'rgba(255,255,255,0.95)', fontSize: 12, padding: '5px 11px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600, border: '1px solid rgba(255,255,255,0.1)', animation: 'chip-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.3s both' }}>
                    <Star style={{ width: 11, height: 11, fill: AMBER, color: AMBER }} />
                    {doctor.yearsExperience}+ yrs exp
                  </div>
                )}
                {doctor.consultationFee && (
                  <div style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', color: 'rgba(255,255,255,0.95)', fontSize: 12, padding: '5px 11px', borderRadius: 20, fontWeight: 600, border: '1px solid rgba(255,255,255,0.1)', animation: 'chip-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.4s both' }}>
                    ₹{doctor.consultationFee} fee
                  </div>
                )}
                {doctor.languages && (
                  <div style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', color: 'rgba(255,255,255,0.75)', fontSize: 12, padding: '5px 11px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)', animation: 'chip-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.5s both' }}>
                    {doctor.languages}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── CONTENT (overlaps hero) ──────────────────────────────────────── */}
      <div style={{ maxWidth: 580, margin: '-64px auto 0', padding: '0 16px 60px', position: 'relative' }}>

        {/* ─── NO SCHEDULE YET — accepting flag on but nothing bookable ──── */}
        {doctor.acceptingPatients && !bookingOpen && (
          <div style={{ background: 'white', borderRadius: 20, padding: '24px 20px', marginBottom: 14, textAlign: 'center', boxShadow: '0 8px 40px rgba(15,32,64,0.15)', animation: 'card-reveal 0.5s cubic-bezier(0.22,1,0.36,1) 0.2s both' }}>
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
          <div style={{ background: 'white', borderRadius: 24, overflow: 'hidden', marginBottom: 14, boxShadow: '0 8px 40px rgba(15,32,64,0.18)', animation: 'card-reveal 0.55s cubic-bezier(0.22,1,0.36,1) 0.2s both' }}>
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
                    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6, marginRight: -20, paddingRight: 20, scrollbarWidth: 'none' }}>
                      {slotDays.map((d, i) => {
                        const dt = new Date(d.date + 'T00:00:00');
                        const dayName = dt.toLocaleDateString('en-IN', { weekday: 'short' });
                        const dayNum = dt.getDate();
                        const month = dt.toLocaleDateString('en-IN', { month: 'short' });
                        const isSelected = selectedDate === d.date;
                        const todayStr = new Date().toLocaleDateString('en-CA');
                        const isToday = d.date === todayStr;
                        const count = Math.min(d.slots.length, d.totalSlots - d.bookedCount);
                        return (
                          <button key={d.date} onClick={() => { setSelectedDate(d.date); setSelectedTime(''); setStep('select-time'); }}
                            style={{ flexShrink: 0, width: 72, padding: '14px 6px 12px', borderRadius: 20, border: '1.5px solid', borderColor: isSelected ? TEAL : '#e8edf3', background: isSelected ? `linear-gradient(155deg, #0d9488 0%, #0891b2 100%)` : 'white', cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit', transition: 'all 0.22s cubic-bezier(0.22,1,0.36,1)', boxShadow: isSelected ? '0 8px 24px rgba(13,148,136,0.35)' : '0 1px 6px rgba(15,32,64,0.06)', animation: `chip-pop 0.38s cubic-bezier(0.34,1.56,0.64,1) ${i * 40}ms both` }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: isSelected ? 'rgba(255,255,255,0.7)' : '#94a3b8', marginBottom: 6, letterSpacing: '0.6px' }}>
                              {isToday ? 'TODAY' : dayName.toUpperCase()}
                            </div>
                            <div style={{ fontSize: 28, fontWeight: 900, color: isSelected ? 'white' : '#0f2040', lineHeight: 1, marginBottom: 2, letterSpacing: '-1px' }}>
                              {dayNum}
                            </div>
                            <div style={{ fontSize: 10, fontWeight: 600, color: isSelected ? 'rgba(255,255,255,0.65)' : '#94a3b8', marginBottom: 10, letterSpacing: '0.3px' }}>
                              {month.toUpperCase()}
                            </div>
                            <div style={{ background: isSelected ? 'rgba(255,255,255,0.18)' : 'linear-gradient(135deg,#f0fdfa,#e0f9f5)', borderRadius: 10, padding: '4px 2px', border: isSelected ? '1px solid rgba(255,255,255,0.15)' : '1px solid #b2f5ea' }}>
                              <div style={{ fontSize: 15, fontWeight: 900, color: isSelected ? 'white' : TEAL, lineHeight: 1.1 }}>{count}</div>
                              <div style={{ fontSize: 9, fontWeight: 700, color: isSelected ? 'rgba(255,255,255,0.65)' : '#0f766e', letterSpacing: '0.4px', marginTop: 1 }}>SLOTS</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* STEP 2 — Time */}
              {step === 'select-time' && selectedDayData && (
                <TimeDrumPicker
                  slots={selectedDayData.slots}
                  date={selectedDate}
                  error={slotError}
                  onBack={() => setStep('select-date')}
                  onSelect={(t) => { setSelectedTime(t); setSlotError(''); setStep('details'); }}
                />
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
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.7px' }}>Age *</label>
                        <input value={form.age} onChange={e => setForm(f => ({...f, age: e.target.value}))} placeholder="Years" type="number" min={1} max={120}
                          style={{ width: '100%', border: `1.5px solid ${errors.age ? '#EF4444' : '#e2e8f0'}`, borderRadius: 12, padding: '11px 14px', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                        {errors.age && <p style={{ color: '#EF4444', fontSize: 11, margin: '4px 0 0' }}>{errors.age}</p>}
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.7px' }}>Gender *</label>
                        <div style={{ display: 'flex', gap: 6, height: 44 }}>
                          {(['M', 'F', 'Other'] as const).map(g => (
                            <button key={g} type="button" onClick={() => setForm(f => ({...f, gender: g}))}
                              style={{ flex: 1, borderRadius: 12, border: '1.5px solid', borderColor: form.gender === g ? TEAL : errors.gender ? '#EF4444' : '#e2e8f0', background: form.gender === g ? '#f0fdfa' : 'white', color: form.gender === g ? TEAL : '#64748b', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                              {g === 'M' ? '♂ M' : g === 'F' ? '♀ F' : '⚧'}
                            </button>
                          ))}
                        </div>
                        {errors.gender && <p style={{ color: '#EF4444', fontSize: 11, margin: '4px 0 0' }}>{errors.gender}</p>}
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.7px' }}>Reason</label>
                      <input value={form.reason} onChange={e => setForm(f => ({...f, reason: e.target.value}))} placeholder="e.g. Fever"
                        style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '11px 14px', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
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
                    <button onClick={() => { setStep('select-date'); setSelectedDate(''); setSelectedTime(''); setForm({ name: '', phone: '', email: '', age: '', gender: '', reason: '' }); fetchSlots(selectedClinic?.id); }}
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
          <RevealCard style={{ marginBottom: 12 }}>
            <div style={{ background: 'white', borderRadius: 22, overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,32,64,0.06), 0 8px 28px rgba(15,32,64,0.09)', borderTop: '3px solid #0d9488' }}>
              <div style={{ padding: '18px 20px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 13, background: 'linear-gradient(135deg,#f0fdfa,#99f6e4)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 10px rgba(13,148,136,0.2)' }}>
                    <BookOpen style={{ width: 19, height: 19, color: TEAL }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#0f2040', letterSpacing: '-0.2px' }}>About</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Professional overview</div>
                  </div>
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.9, color: '#475569', margin: 0 }}>{doctor.bio}</p>
              </div>
            </div>
          </RevealCard>
        )}

        {/* ─── SERVICES OFFERED ──────────────────────────────────────────── */}
        {doctor.services && (
          <RevealCard style={{ marginBottom: 12 }}>
            <div style={{ background: 'white', borderRadius: 22, overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,32,64,0.06), 0 8px 28px rgba(15,32,64,0.09)', borderTop: '3px solid #06b6d4' }}>
              <div style={{ padding: '18px 20px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 13, background: 'linear-gradient(135deg,#ecfeff,#a5f3fc)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 10px rgba(6,182,212,0.2)' }}>
                    <Stethoscope style={{ width: 19, height: 19, color: '#0891b2' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#0f2040', letterSpacing: '-0.2px' }}>Services Offered</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{doctor.services.split(/[,\n]/).filter(s => s.trim()).length} specialties</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {(() => {
                    const palettes = [
                      { bg: 'linear-gradient(135deg,#f0fdfa,#ccfbf1)', border: '#5eead4', color: '#0f766e' },
                      { bg: 'linear-gradient(135deg,#eff6ff,#dbeafe)', border: '#93c5fd', color: '#1d4ed8' },
                      { bg: 'linear-gradient(135deg,#fdf4ff,#f3e8ff)', border: '#d8b4fe', color: '#7e22ce' },
                      { bg: 'linear-gradient(135deg,#fff7ed,#fed7aa)', border: '#fdba74', color: '#c2410c' },
                      { bg: 'linear-gradient(135deg,#f0fdf4,#bbf7d0)', border: '#6ee7b7', color: '#065f46' },
                      { bg: 'linear-gradient(135deg,#fefce8,#fef08a)', border: '#fde047', color: '#854d0e' },
                    ];
                    return doctor.services.split(/[,\n]/).map(s => s.trim()).filter(Boolean).map((s, i) => {
                      const p = palettes[i % palettes.length];
                      return (
                        <span key={s} style={{ background: p.bg, border: `1px solid ${p.border}`, color: p.color, fontSize: 12.5, fontWeight: 700, padding: '6px 13px', borderRadius: 24, display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'default', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', transition: 'transform 0.15s', whiteSpace: 'nowrap' }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: p.color, opacity: 0.5, flexShrink: 0 }} />
                          {s}
                        </span>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          </RevealCard>
        )}

        {/* ─── EDUCATION & TRAINING ──────────────────────────────────────── */}
        {doctor.education && (
          <RevealCard style={{ marginBottom: 12 }}>
            <div style={{ background: 'white', borderRadius: 22, overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,32,64,0.06), 0 8px 28px rgba(15,32,64,0.09)', borderTop: '3px solid #6366f1' }}>
              <div style={{ padding: '18px 20px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 13, background: 'linear-gradient(135deg,#eef2ff,#c7d2fe)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 10px rgba(99,102,241,0.2)' }}>
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#0f2040', letterSpacing: '-0.2px' }}>Education & Training</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{doctor.education.split('\n').filter(l => l.trim()).length} qualifications</div>
                  </div>
                </div>
                <div style={{ position: 'relative', paddingLeft: 20 }}>
                  <div style={{ position: 'absolute', left: 7, top: 4, bottom: 4, width: 2, background: 'linear-gradient(to bottom, #c7d2fe, #e0e7ff 80%, transparent)', borderRadius: 2 }} />
                  {doctor.education.split('\n').map(l => l.trim()).filter(Boolean).map((line, i) => {
                    const parts = line.split(/\s*[—–-]{1,2}\s*/);
                    const degree = parts[0]?.trim() ?? line;
                    const institution = parts.slice(1).join(' — ').trim();
                    return (
                      <div key={i} style={{ position: 'relative', marginBottom: i < doctor.education.split('\n').filter(l=>l.trim()).length - 1 ? 18 : 0 }}>
                        <div style={{ position: 'absolute', left: -17, top: 5, width: 10, height: 10, borderRadius: '50%', background: 'white', border: '2.5px solid #6366f1', boxShadow: '0 0 0 3px rgba(99,102,241,0.12)' }} />
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', lineHeight: 1.4 }}>{degree}</div>
                        {institution && <div style={{ fontSize: 12.5, color: '#6366f1', fontWeight: 600, marginTop: 2 }}>{institution}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </RevealCard>
        )}

        {/* ─── AWARDS & MEMBERSHIPS ──────────────────────────────────────── */}
        {doctor.awards && (
          <RevealCard style={{ marginBottom: 12 }}>
            <div style={{ background: 'linear-gradient(160deg,#fffbeb,#fef9ef)', borderRadius: 22, overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,32,64,0.06), 0 8px 28px rgba(245,158,11,0.12)', borderTop: `3px solid ${AMBER}` }}>
              <div style={{ padding: '18px 20px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 13, background: 'linear-gradient(135deg,#fef3c7,#fde68a)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 10px rgba(245,158,11,0.25)' }}>
                    <Award style={{ width: 20, height: 20, color: '#b45309' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#0f2040', letterSpacing: '-0.2px' }}>Awards & Memberships</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{doctor.awards.split('\n').filter(l => l.trim()).length} achievements</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {doctor.awards.split('\n').map(l => l.trim()).filter(Boolean).map((line, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'rgba(255,255,255,0.7)', borderRadius: 12, padding: '10px 12px', border: '1px solid rgba(245,158,11,0.15)' }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#fef3c7,#fde68a)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Star style={{ width: 13, height: 13, color: '#d97706', fill: '#d97706' }} />
                      </div>
                      <p style={{ fontSize: 13.5, color: '#374151', margin: 0, lineHeight: 1.55, fontWeight: 500 }}>{line}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </RevealCard>
        )}

        {/* ─── CREDENTIALS ───────────────────────────────────────────────── */}
        {(doctor.specialty || doctor.qualification || doctor.yearsExperience > 0 || doctor.languages || doctor.consultationFee || doctor.regNumber) && (
          <RevealCard style={{ marginBottom: 12 }}>
            <div style={{ background: 'white', borderRadius: 22, overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,32,64,0.06), 0 8px 28px rgba(15,32,64,0.09)', borderTop: '3px solid #0284c7' }}>
              <div style={{ padding: '18px 20px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 13, background: 'linear-gradient(135deg,#f0f9ff,#bae6fd)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 10px rgba(2,132,199,0.2)' }}>
                    <Shield style={{ width: 19, height: 19, color: '#0284c7' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#0f2040', letterSpacing: '-0.2px' }}>Credentials</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Verified professional info</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { icon: <Stethoscope style={{ width: 16, height: 16, color: TEAL }} />, label: 'Specialty', value: doctor.specialty, bg: 'linear-gradient(135deg,#f0fdfa,#ccfbf1)', border: '#a7f3d0', accent: TEAL },
                    { icon: <Award style={{ width: 16, height: 16, color: '#0284c7' }} />, label: 'Qualification', value: doctor.qualification, bg: 'linear-gradient(135deg,#f0f9ff,#dbeafe)', border: '#93c5fd', accent: '#0284c7' },
                    { icon: <Star style={{ width: 16, height: 16, color: AMBER, fill: AMBER }} />, label: 'Experience', value: doctor.yearsExperience > 0 ? `${doctor.yearsExperience} yrs` : '', bg: 'linear-gradient(135deg,#fffbeb,#fef3c7)', border: '#fde68a', accent: '#d97706' },
                    { icon: <Globe style={{ width: 16, height: 16, color: '#8b5cf6' }} />, label: 'Languages', value: doctor.languages, bg: 'linear-gradient(135deg,#faf5ff,#ede9fe)', border: '#ddd6fe', accent: '#7c3aed' },
                    { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8"/><line x1="12" y1="6" x2="12" y2="8"/><line x1="12" y1="16" x2="12" y2="18"/></svg>, label: 'Fee', value: doctor.consultationFee ? `₹${doctor.consultationFee}` : '', bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '#a7f3d0', accent: '#059669' },
                    { icon: <Shield style={{ width: 16, height: 16, color: '#64748b' }} />, label: 'Reg. No.', value: doctor.regNumber, bg: 'linear-gradient(135deg,#f8fafc,#f1f5f9)', border: '#e2e8f0', accent: '#475569' },
                  ].filter(r => r.value).map(r => (
                    <div key={r.label} style={{ background: r.bg, border: `1.5px solid ${r.border}`, borderRadius: 16, padding: '12px 13px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        {r.icon}
                        <div style={{ fontSize: 10.5, color: r.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{r.label}</div>
                      </div>
                      <div style={{ fontSize: 13.5, color: '#1e293b', fontWeight: 700, lineHeight: 1.3 }}>{r.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </RevealCard>
        )}

        {/* ─── CLINICS & CONTACT ─────────────────────────────────────────── */}
        {allClinics.length > 0 && (
          <RevealCard style={{ marginBottom: 12 }}>
            <div style={{ background: 'white', borderRadius: 22, overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,32,64,0.06), 0 8px 28px rgba(15,32,64,0.09)', borderTop: '3px solid #d97706' }}>
              <div style={{ padding: '18px 20px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 13, background: 'linear-gradient(135deg,#fffbeb,#fde68a)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 10px rgba(217,119,6,0.22)' }}>
                    <MapPin style={{ width: 20, height: 20, color: '#d97706' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#0f2040', letterSpacing: '-0.2px' }}>{allClinics.length === 1 ? 'Clinic & Contact' : `${allClinics.length} Clinics`}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Visit or call to book</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {allClinics.map((clinic) => (
                  <div key={clinic.id} style={{ background: 'linear-gradient(135deg,#fffbf0,#fffdf8)', border: '1.5px solid #fde68a', borderRadius: 18, overflow: 'hidden' }}>
                    <div style={{ background: 'linear-gradient(135deg,#fef3c7,#fde68a)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                      <span style={{ fontSize: 13.5, fontWeight: 800, color: '#92400e' }}>{clinic.name}</span>
                    </div>
                    <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {clinic.address && (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <MapPin style={{ width: 13, height: 13, color: '#d97706', flexShrink: 0, marginTop: 2 }} />
                          <div style={{ fontSize: 12.5, color: '#475569', flex: 1, lineHeight: 1.5 }}>
                            {clinic.address}
                            <a href={`https://maps.google.com/?q=${encodeURIComponent(clinic.address)}`} target="_blank" rel="noopener noreferrer"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginLeft: 6, fontSize: 11, color: TEAL, fontWeight: 700, textDecoration: 'none', background: '#f0fdfa', padding: '2px 7px', borderRadius: 5 }}>
                              Maps ↗
                            </a>
                          </div>
                        </div>
                      )}
                      {clinic.timings && (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <Clock style={{ width: 13, height: 13, color: '#d97706', flexShrink: 0 }} />
                          <span style={{ fontSize: 12.5, color: '#64748b', fontWeight: 600 }}>{clinic.timings}</span>
                        </div>
                      )}
                      {clinic.phone && (
                        <a href={`tel:${clinic.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'linear-gradient(135deg,#f0fdfa,#ccfbf1)', border: '1.5px solid #5eead4', color: '#0f766e', borderRadius: 12, padding: '8px 14px', fontSize: 13, fontWeight: 800, textDecoration: 'none', alignSelf: 'flex-start', boxShadow: '0 2px 8px rgba(13,148,136,0.12)', transition: 'all 0.15s' }}>
                          <Phone style={{ width: 13, height: 13 }} /> {clinic.phone}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
                </div>

                {(doctor.clinicEmail || doctor.gbpUrl) && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {doctor.clinicEmail && (
                      <a href={`mailto:${doctor.clinicEmail}`} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, color: '#1B4F8A', fontWeight: 600, textDecoration: 'none' }}>
                        <Mail style={{ width: 14, height: 14, color: '#94a3b8', flexShrink: 0 }} />
                        {doctor.clinicEmail}
                      </a>
                    )}
                    {doctor.gbpUrl && (
                      <a href={doctor.gbpUrl} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#334155', textDecoration: 'none' }}>
                        <Globe style={{ width: 14, height: 14, color: '#64748b' }} />
                        <span style={{ flex: 1 }}>View on Google Maps</span>
                        <span style={{ color: '#94a3b8', fontSize: 12 }}>↗</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </RevealCard>
        )}

        {/* ─── SHARE ─────────────────────────────────────────────────────── */}
        <RevealCard style={{ marginBottom: 12 }}>
        <div style={{ background: 'linear-gradient(135deg, #0f2040, #163560)', borderRadius: 22, padding: '20px', boxShadow: '0 8px 32px rgba(15,32,64,0.25)' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 4px' }}>Share this Profile</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.85)', margin: '0 0 14px' }}>Help others find Dr. {doctor.name}</p>
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
        </RevealCard>

        <div style={{ textAlign: 'center', paddingBottom: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <img src="/logo.svg" alt="Vyasa" style={{ width: 18, height: 18, borderRadius: 5, opacity: 0.6 }} />
            <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Powered by</span>
            <a href="https://vyasaa.com" style={{ color: '#0d9488', fontWeight: 700, textDecoration: 'none', fontSize: 12 }}>Vyasa Integrated Healthcare</a>
          </div>
          <p style={{ fontSize: 11, color: '#cbd5e1', margin: 0 }}>© 2026 Vyasa Health Technologies Pvt. Ltd.</p>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        input:focus { border-color: #0d9488 !important; box-shadow: 0 0 0 3px rgba(13,148,136,0.15); }
        button:active { transform: scale(0.96) !important; opacity: 0.92; }

        @keyframes spin { to { transform: rotate(360deg); } }

        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes hero-reveal {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes card-reveal {
          from { opacity: 0; transform: translateY(22px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes chip-pop {
          from { opacity: 0; transform: scale(0.78); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes orb-float {
          0%, 100% { transform: translateY(0) scale(1); }
          50%       { transform: translateY(-18px) scale(1.04); }
        }
        @keyframes photo-ring {
          0%, 100% { box-shadow: 0 12px 40px rgba(0,0,0,0.35), 0 0 0 0 rgba(13,148,136,0); }
          50%       { box-shadow: 0 12px 40px rgba(0,0,0,0.35), 0 0 0 8px rgba(13,148,136,0.18); }
        }
        @keyframes badge-breathe {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
          50%       { box-shadow: 0 0 0 5px rgba(16,185,129,0.12); }
        }
        @keyframes float-up {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .date-strip::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
