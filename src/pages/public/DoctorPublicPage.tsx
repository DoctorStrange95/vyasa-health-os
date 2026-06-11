import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, Clock, MapPin, Phone, Mail, Globe, Copy, MessageCircle, Loader2 } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'https://vyasa-os-backend.onrender.com';

interface DoctorProfile {
  id: number;
  name: string;
  specialty: string;
  qualification: string;
  regNumber: string;
  bio: string;
  languages: string;
  acceptingPatients: boolean;
  gbpUrl: string;
  yearsExperience: number;
  consultationFee: number | null;
  profileSlug: string;
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  clinicEmail: string;
  timings: string;
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function DoctorPublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<'form' | 'done'>('form');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', age: '', reason: '', date: '', time: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!slug) { setNotFound(true); setLoading(false); return; }
    fetch(`${API_BASE}/public/doctor/${slug}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => { setDoctor(data); document.title = `Dr. ${data.name} — Vyasa Health`; })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    const phone = form.phone.replace(/\D/g, '').slice(-10);
    if (phone.length !== 10) e.phone = 'Enter a valid 10-digit mobile number';
    setErrors(e);
    return !Object.keys(e).length;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/public/doctor/${slug}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_name: form.name.trim(),
          patient_phone: form.phone.replace(/\D/g, '').slice(-10),
          patient_age: form.age ? Number(form.age) : undefined,
          reason: form.reason.trim(),
          preferred_date: form.date || undefined,
          preferred_time: form.time || undefined,
        }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); alert(e.error ?? 'Failed, please try again.'); return; }
      setStep('done');
    } catch {
      alert('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = window.location.href; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const today = new Date().toISOString().split('T')[0];
  const waText = encodeURIComponent(`Book an appointment with Dr. ${doctor?.name ?? ''}: ${window.location.href}`);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  if (notFound || !doctor) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="text-5xl">🔍</div>
        <h2 className="text-xl font-bold text-slate-700">Doctor profile not found</h2>
        <p className="text-slate-500 text-sm">This link may be incorrect or the profile has been disabled.</p>
        <p className="text-xs text-slate-400 mt-4">Powered by Vyasa Health OS</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: 'Inter, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0a1628 0%, #1B4F8A 100%)', padding: '24px 20px 64px' }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F0A500', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14, color: 'white' }}>V</div>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 700, fontSize: 15 }}>Vyasa Health OS</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '3px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 800, color: 'white', margin: '0 auto 14px' }}>
              {initials(doctor.name)}
            </div>
            <h1 style={{ color: 'white', fontSize: 24, fontWeight: 800, margin: '0 0 4px' }}>Dr. {doctor.name}</h1>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, margin: '0 0 4px' }}>
              {[doctor.specialty, doctor.qualification].filter(Boolean).join(' · ') || 'Medical Professional'}
            </p>
            {doctor.clinicName && <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, margin: 0 }}>📍 {doctor.clinicName}</p>}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              {doctor.regNumber && <span style={{ background: '#F0FDF4', color: '#059669', fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>✓ Verified</span>}
              <span style={{ background: doctor.acceptingPatients ? '#F0FDF4' : '#FFF7ED', color: doctor.acceptingPatients ? '#059669' : '#C2410C', fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>
                {doctor.acceptingPatients ? '✓ Accepting Patients' : '✗ Not Accepting New Patients'}
              </span>
              {doctor.yearsExperience > 0 && <span style={{ background: '#FFFBEB', color: '#B45309', fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>{doctor.yearsExperience}+ yrs experience</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 520, margin: '-44px auto 0', padding: '0 14px 40px', position: 'relative', zIndex: 1 }}>
        {/* Book button */}
        {doctor.acceptingPatients && !bookingOpen && (
          <button onClick={() => setBookingOpen(true)}
            style={{ width: '100%', background: '#F0A500', color: 'white', border: 'none', padding: '16px', fontSize: 16, fontWeight: 700, borderRadius: 14, cursor: 'pointer', marginBottom: 12, boxShadow: '0 4px 14px rgba(240,165,0,0.4)', fontFamily: 'inherit' }}>
            📅 Book an Appointment
          </button>
        )}
        {!doctor.acceptingPatients && (
          <div style={{ background: '#FFF7ED', border: '1.5px solid #FED7AA', borderRadius: 12, padding: '12px 16px', color: '#C2410C', textAlign: 'center', fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
            Dr. {doctor.name} is currently not accepting new appointment requests.
          </div>
        )}

        {/* Booking form */}
        {bookingOpen && (
          <div style={{ background: 'white', borderRadius: 16, padding: 20, marginBottom: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1e293b' }}>Book Appointment</h3>
              <button onClick={() => { setBookingOpen(false); setStep('form'); setForm({ name:'',phone:'',age:'',reason:'',date:'',time:'' }); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 18 }}>✕</button>
            </div>

            {step === 'done' ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <CheckCircle style={{ width: 48, height: 48, color: '#059669', margin: '0 auto 12px' }} />
                <h3 style={{ color: '#065F46', fontWeight: 800, fontSize: 17, margin: '0 0 6px' }}>Request Sent!</h3>
                <p style={{ color: '#047857', fontSize: 13, lineHeight: 1.6 }}>
                  Dr. {doctor.name}'s team will contact you at <strong>+91 {form.phone.replace(/\D/g,'').slice(-10)}</strong> to confirm your appointment.
                  {form.date && <><br />Requested: <strong>{fmtDate(form.date)}{form.time ? ` at ${form.time}` : ''}</strong></>}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Full Name <span style={{ color: '#EF4444' }}>*</span></label>
                  <input className="input" placeholder="Your full name" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} style={errors.name ? { borderColor: '#EF4444' } : {}} />
                  {errors.name && <p style={{ color: '#EF4444', fontSize: 12, margin: '3px 0 0' }}>{errors.name}</p>}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Mobile Number <span style={{ color: '#EF4444' }}>*</span></label>
                  <input className="input" type="tel" placeholder="10-digit number" value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} inputMode="numeric" style={errors.phone ? { borderColor: '#EF4444' } : {}} />
                  {errors.phone && <p style={{ color: '#EF4444', fontSize: 12, margin: '3px 0 0' }}>{errors.phone}</p>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Age</label>
                    <input className="input" type="number" min={1} max={120} placeholder="Years" value={form.age} onChange={e => setForm(f => ({...f, age: e.target.value}))} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Reason for Visit</label>
                    <input className="input" placeholder="e.g. Fever" value={form.reason} onChange={e => setForm(f => ({...f, reason: e.target.value}))} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Preferred Date</label>
                    <input className="input" type="date" min={today} value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Preferred Time</label>
                    <input className="input" type="time" value={form.time} onChange={e => setForm(f => ({...f, time: e.target.value}))} />
                  </div>
                </div>
                {doctor.consultationFee && (
                  <div style={{ background: '#FFFBEB', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#92400E' }}>
                    💰 Consultation fee: <strong>₹{doctor.consultationFee}</strong>
                  </div>
                )}
                <button onClick={handleSubmit} disabled={submitting}
                  className="btn-primary" style={{ marginTop: 4 }}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {submitting ? 'Sending…' : 'Send Appointment Request'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* About */}
        {doctor.bio && (
          <div style={{ background: 'white', borderRadius: 14, padding: 18, marginBottom: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 10 }}>About</div>
            <p style={{ fontSize: 14, lineHeight: 1.75, color: '#374151', margin: 0 }}>{doctor.bio}</p>
          </div>
        )}

        {/* Details */}
        <div style={{ background: 'white', borderRadius: 14, padding: 18, marginBottom: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 12 }}>Details</div>
          {[
            { icon: '🩺', label: 'Specialty', value: doctor.specialty },
            { icon: '🎓', label: 'Qualification', value: doctor.qualification },
            { icon: '⏳', label: 'Experience', value: doctor.yearsExperience > 0 ? `${doctor.yearsExperience} years` : '' },
            { icon: '🌐', label: 'Languages', value: doctor.languages },
            { icon: '💰', label: 'Consultation Fee', value: doctor.consultationFee ? `₹${doctor.consultationFee}` : '' },
            { icon: '📋', label: 'Reg. No.', value: doctor.regNumber },
          ].filter(r => r.value).map(r => (
            <div key={r.label} style={{ display: 'flex', gap: 10, marginBottom: 10, fontSize: 14 }}>
              <span style={{ flexShrink: 0, width: 20, textAlign: 'center' }}>{r.icon}</span>
              <div><strong>{r.label}</strong><span style={{ color: '#6B7280', marginLeft: 6 }}>{r.value}</span></div>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div style={{ background: 'white', borderRadius: 14, padding: 18, marginBottom: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 12 }}>Contact</div>
          {doctor.clinicAddress && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 10, fontSize: 14 }}>
              <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" /><span>{doctor.clinicAddress}</span>
            </div>
          )}
          {doctor.timings && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 10, fontSize: 14 }}>
              <Clock className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" /><span>{doctor.timings}</span>
            </div>
          )}
          {doctor.clinicPhone && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 10, fontSize: 14 }}>
              <Phone className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
              <a href={`tel:${doctor.clinicPhone}`} style={{ color: '#1B4F8A', fontWeight: 600 }}>{doctor.clinicPhone}</a>
            </div>
          )}
          {doctor.clinicEmail && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 10, fontSize: 14 }}>
              <Mail className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
              <a href={`mailto:${doctor.clinicEmail}`} style={{ color: '#1B4F8A' }}>{doctor.clinicEmail}</a>
            </div>
          )}
          {doctor.gbpUrl && (
            <a href={doctor.gbpUrl} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 8, padding: '9px 12px', fontSize: 13, fontWeight: 600, color: '#334155', textDecoration: 'none', marginTop: 4 }}>
              <Globe className="w-4 h-4" /> View on Google Business <span style={{ marginLeft: 'auto', color: '#94a3b8', fontSize: 11 }}>↗</span>
            </a>
          )}
        </div>

        {/* Share */}
        <div style={{ background: 'white', borderRadius: 14, padding: 18, marginBottom: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 12 }}>Share this Profile</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <a href={`https://wa.me/?text=${waText}`} target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#25D366', color: 'white', borderRadius: 10, padding: '11px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </a>
            <button onClick={copyLink}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 10, padding: '11px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {copied ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>
          Powered by <a href="https://vyasa-health-os.pages.dev" style={{ color: '#1B4F8A', fontWeight: 600, textDecoration: 'none' }}>Vyasa Health OS</a>
        </p>
      </div>
    </div>
  );
}
