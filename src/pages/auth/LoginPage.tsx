import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  Eye, EyeOff, Loader2, ShieldCheck, X, Clock, ChevronRight,
  Building2, WifiOff, FileText, Users, BarChart2, Shield,
  Stethoscope, UserCircle, Rocket, CheckCircle2, Pill, ClipboardList,
} from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuthStore } from '@/store/useAuthStore';
import { useAppStore } from '@/store/useAppStore';
import { trackEvent } from '@/lib/api';
import { INDIAN_MEDICAL_COUNCILS } from '@/lib/medicalCouncils';
import type { Role } from '@/types';

// ─── Static data ──────────────────────────────────────────────────────────────

const SPECIALTY_GROUPS: { label: string; options: string[] }[] = [
  { label: 'Allopathy — General & Internal Medicine', options: ['General Medicine','Internal Medicine','Family Medicine / General Practice','Geriatrics','Occupational Medicine','Aviation Medicine','Sports Medicine'] },
  { label: 'Allopathy — Cardiology & Chest', options: ['Cardiology','Interventional Cardiology','Cardiac Electrophysiology','Cardiothoracic Surgery','Pulmonology / Respiratory Medicine','Sleep Medicine','Thoracic Surgery'] },
  { label: 'Allopathy — Neurosciences', options: ['Neurology','Neurosurgery','Neuropsychiatry','Epileptology','Stroke Medicine'] },
  { label: 'Allopathy — Gastroenterology & Liver', options: ['Gastroenterology','Hepatology','Colorectal Surgery','Surgical Gastroenterology'] },
  { label: 'Allopathy — Kidneys & Urology', options: ['Nephrology','Urology','Andrology','Renal Transplant Surgery'] },
  { label: 'Allopathy — Oncology', options: ['Medical Oncology','Surgical Oncology','Radiation Oncology','Haematology & BMT','Gynaecological Oncology','Paediatric Oncology'] },
  { label: 'Allopathy — Endocrine & Metabolism', options: ['Endocrinology & Diabetes','Obesity & Metabolic Medicine','Thyroid Surgery'] },
  { label: 'Allopathy — Musculoskeletal', options: ['Orthopaedics & Traumatology','Arthroscopy & Sports Medicine','Spine Surgery','Rheumatology','Physical Medicine & Rehabilitation','Hand Surgery'] },
  { label: 'Allopathy — Obstetrics, Gynaecology', options: ['Obstetrics & Gynaecology','Maternal-Fetal Medicine','Reproductive Medicine & IVF','Urogynaecology','Laparoscopic Gynaecology'] },
  { label: 'Allopathy — Paediatrics & Neonatology', options: ['Paediatrics','Neonatology','Paediatric Surgery','Paediatric Neurology','Paediatric Cardiology','Developmental Paediatrics'] },
  { label: 'Allopathy — Surgery', options: ['General Surgery','Laparoscopic & Minimally Invasive Surgery','Vascular Surgery','Plastic & Reconstructive Surgery','Trauma Surgery','Bariatric Surgery'] },
  { label: 'Allopathy — Critical Care & Emergency', options: ['Critical Care Medicine','Emergency Medicine','Anaesthesiology','Pain Management','Palliative Care & Hospice'] },
  { label: 'Allopathy — Skin, Eye & ENT', options: ['Dermatology','Dermatosurgery','Ophthalmology','ENT (Otorhinolaryngology)','Head & Neck Surgery'] },
  { label: 'Allopathy — Mental Health', options: ['Psychiatry','Addiction Medicine','Child & Adolescent Psychiatry'] },
  { label: 'Allopathy — Diagnostics', options: ['Radiology & Imaging','Interventional Radiology','Nuclear Medicine','Pathology & Lab Medicine','Microbiology','Forensic Medicine','Community Medicine / Public Health'] },
  { label: 'AYUSH', options: ['Ayurveda','Yoga & Naturopathy','Unani','Siddha','Homeopathy'] },
  { label: 'Dental', options: ['General Dentistry','Orthodontics','Oral & Maxillofacial Surgery','Paediatric Dentistry','Periodontology','Endodontics','Prosthodontics & Implantology'] },
  { label: 'Nursing', options: ['General Nursing & Midwifery','Critical Care Nursing','Paediatric Nursing','Psychiatric Nursing','Oncology Nursing','Neonatal Nursing','Cardiac Care Nursing'] },
  { label: 'Allied Health', options: ['Physiotherapy','Occupational Therapy','Speech & Language Therapy','Dietetics & Clinical Nutrition','Clinical Psychology','Pharmacy / Clinical Pharmacology','Medical Laboratory Technology','Radiography & Imaging Technology'] },
];

const STATES = [
  'Andhra Pradesh','Assam','Bihar','Chhattisgarh','Delhi','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal',
];

type SignInAs = 'solo' | 'clinic';

const DEMO_ROLES: { role: Role; label: string; icon: React.ReactNode }[] = [
  { role: 'clinic_admin',   label: 'Solo Doctor',     icon: <Stethoscope size={17} strokeWidth={1.8} /> },
  { role: 'clinic_manager', label: 'Clinic Admin',    icon: <Building2 size={17} strokeWidth={1.8} /> },
  { role: 'doctor',         label: 'Hospital Doctor', icon: <UserCircle size={17} strokeWidth={1.8} /> },
  { role: 'nurse',          label: 'Nurse',           icon: <ClipboardList size={17} strokeWidth={1.8} /> },
  { role: 'pharmacist',     label: 'Pharmacist',      icon: <Pill size={17} strokeWidth={1.8} /> },
  { role: 'receptionist',   label: 'Reception',       icon: <Users size={17} strokeWidth={1.8} /> },
];

const GOOGLE_SVG = (
  <svg width="20" height="20" viewBox="0 0 18 18" aria-hidden="true">
    <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
    <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
    <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18z"/>
    <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.31z"/>
  </svg>
);

// ─── Sub-components ───────────────────────────────────────────────────────────

function SpecialtyCombobox({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery(''); }
    }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const all = SPECIALTY_GROUPS.flatMap(g => g.options);
  const filtered = query.trim() ? all.filter(s => s.toLowerCase().includes(query.toLowerCase())) : all;
  const borderColor = error ? '#f87171' : '#e2e8f0';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        type="text" autoComplete="off"
        value={open ? query : value}
        placeholder={value || 'Type to search specialty…'}
        onFocus={() => { setOpen(true); setQuery(''); }}
        onChange={e => { setQuery(e.target.value); onChange(''); }}
        style={{ width: '100%', border: `1.5px solid ${borderColor}`, borderRadius: 10, padding: '11px 14px', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', color: '#1e293b' }}
      />
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 28px rgba(0,0,0,0.13)', maxHeight: 220, overflowY: 'auto', marginTop: 4 }}>
          {filtered.length === 0
            ? <div style={{ padding: '12px 14px', fontSize: 13, color: '#94a3b8' }}>No matches</div>
            : filtered.map(s => (
              <div key={s}
                onMouseDown={e => { e.preventDefault(); onChange(s); setOpen(false); setQuery(''); }}
                style={{ padding: '9px 14px', fontSize: 13, cursor: 'pointer', color: '#1e293b' }}
                onMouseOver={e => (e.currentTarget.style.background = '#f0fdfa')}
                onMouseOut={e => (e.currentTarget.style.background = 'white')}
              >{s}</div>
            ))}
        </div>
      )}
    </div>
  );
}

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
      {children}
      {error && <p style={{ fontSize: 11, color: '#dc2626', margin: '3px 0 0', fontWeight: 600 }}>{error}</p>}
    </div>
  );
}

function Field({
  label, type = 'text', value, onChange, placeholder,
  required, autoComplete, error, rightEl,
}: {
  label?: string; type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; autoComplete?: string; error?: string;
  rightEl?: React.ReactNode;
}) {
  return (
    <div>
      {label && (
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        <input
          type={type} value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          style={{
            width: '100%',
            border: `1.5px solid ${error ? '#f87171' : '#e5e7eb'}`,
            borderRadius: 10,
            padding: rightEl ? '11px 42px 11px 14px' : '11px 14px',
            fontSize: 14, outline: 'none', fontFamily: 'inherit',
            boxSizing: 'border-box', color: '#111827', background: 'white',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => (e.target.style.borderColor = '#0d9488')}
          onBlur={e => (e.target.style.borderColor = error ? '#f87171' : '#e5e7eb')}
        />
        {rightEl && (
          <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
            {rightEl}
          </div>
        )}
      </div>
      {error && <p style={{ fontSize: 12, color: '#dc2626', margin: '4px 0 0' }}>{error}</p>}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LoginPage() {
  const [params] = useSearchParams();
  const justRegistered = params.get('registered') === '1';

  // "Solo Doctor" vs "Clinic / Staff" — changes the register CTA destination
  const [signInAs, setSignInAs] = useState<SignInAs>('solo');

  // Login form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [slowStart, setSlowStart] = useState(false);
  const [error, setError] = useState('');
  const [showDemo, setShowDemo] = useState(false);

  // Google OAuth
  const [googleLoading, setGoogleLoading] = useState(false);
  const [geoPos, setGeoPos] = useState<{ lat: number; lng: number } | null>(null);

  // Google new-user registration modal
  const [googleNewUser, setGoogleNewUser] = useState<{ email: string; name: string } | null>(null);
  const [gRegForm, setGRegForm] = useState({
    name: '', specialty: '', degrees: '', phone: '',
    medicalCouncil: '', otherCouncil: '', licenseNumber: '',
    registrationState: '', city: '', practiceState: '', hospital: '',
  });
  const [gRegErrors, setGRegErrors] = useState<Record<string, string>>({});

  const { login, loginWithGoogle, completeGoogleRegister, loginAsDemo } = useAuthStore();
  const { loadDemo } = useAppStore();
  const navigate = useNavigate();

  // Analytics + geolocation on mount
  useEffect(() => { trackEvent('login_page_view'); }, []);
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => setGeoPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 8000, maximumAge: 300000 },
    );
  }, []);

  const googleLogin = useGoogleLogin({
    flow: 'implicit',
    onSuccess: t => handleGoogleToken(t.access_token),
    onError: () => setError('Google sign-in failed. Try again.'),
    onNonOAuthError: err =>
      setError(
        err.type === 'popup_closed'
          ? 'Sign-in window was closed.'
          : 'Google sign-in popup was blocked — please allow popups for this site.',
      ),
  });

  function afterLogin() {
    const status = useAuthStore.getState().approvalStatus;
    navigate(status === 'pending' ? '/pending-approval' : '/app/dashboard');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setError(''); setSlowStart(false); setLoading(true);
    trackEvent('login_attempt', { method: 'email' });
    const wakeTimer = setTimeout(() => setSlowStart(true), 6000);
    try {
      await login(email.trim(), password, geoPos ?? undefined);
      afterLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'backend');
    } finally {
      clearTimeout(wakeTimer); setSlowStart(false); setLoading(false);
    }
  }

  async function handleGoogleToken(accessToken: string) {
    setGoogleLoading(true); setError('');
    try {
      let result;
      try {
        result = await loginWithGoogle(accessToken, geoPos ?? undefined);
      } catch (firstErr) {
        // Render cold-start: retry once after a delay
        if (firstErr instanceof Error && firstErr.message === 'Failed to fetch') {
          await new Promise(r => setTimeout(r, 5000));
          result = await loginWithGoogle(accessToken, geoPos ?? undefined);
        } else { throw firstErr; }
      }
      if (result.isNewUser) {
        setGoogleNewUser({ email: result.googleEmail, name: result.googleName });
        setGRegForm(f => ({ ...f, name: result.googleName }));
      } else {
        afterLogin();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'backend');
    } finally {
      setGoogleLoading(false);
    }
  }

  function validateGReg() {
    const e: Record<string, string> = {};
    if (!gRegForm.name.trim())                                         e.name = 'Required';
    if (!gRegForm.specialty)                                           e.specialty = 'Required';
    if (!gRegForm.degrees.trim())                                      e.degrees = 'Required';
    if (!gRegForm.phone || gRegForm.phone.replace(/\D/g,'').length < 10) e.phone = 'Enter a valid 10-digit number';
    if (!gRegForm.medicalCouncil)                                      e.medicalCouncil = 'Required';
    if (gRegForm.medicalCouncil === 'other' && !gRegForm.otherCouncil.trim()) e.otherCouncil = 'Please specify';
    if (!gRegForm.registrationState)                                   e.registrationState = 'Required';
    if (!gRegForm.licenseNumber.trim())                                e.licenseNumber = 'Required';
    return e;
  }

  function gSet(k: string, v: string) {
    setGRegForm(f => ({ ...f, [k]: v }));
    setGRegErrors(e => ({ ...e, [k]: '' }));
  }

  async function handleGReg(e: React.FormEvent) {
    e.preventDefault();
    if (!googleNewUser) return;
    const errs = validateGReg();
    if (Object.keys(errs).length) { setGRegErrors(errs); return; }
    setLoading(true);
    try {
      await completeGoogleRegister({
        name: gRegForm.name, email: googleNewUser.email,
        specialty: gRegForm.specialty, degrees: gRegForm.degrees,
        phone: gRegForm.phone,
        medicalCouncil: gRegForm.medicalCouncil === 'other' ? gRegForm.otherCouncil : gRegForm.medicalCouncil,
        licenseNumber: gRegForm.licenseNumber,
        regState: gRegForm.registrationState,
        city: gRegForm.city, state: gRegForm.practiceState,
        clinicName: gRegForm.hospital,
      });
      afterLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  function handleDemo(role: Role) {
    loginAsDemo(role);
    const u = useAuthStore.getState().user;
    loadDemo(u?.name, u?.id);
    navigate('/app/dashboard');
  }

  // Register destination depends on which portal is selected
  const registerPath = signInAs === 'clinic' ? '/org-register' : '/register';
  const registerLabel = signInAs === 'clinic' ? 'Register clinic / hospital' : 'Create doctor account';

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#eef4f7', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .lp-fade { animation: fadeIn 0.35s ease both; }
        .lp-card { background: white; border-radius: 20px; box-shadow: 0 4px 24px rgba(15,32,64,0.10); }
      `}</style>

      {/* ── LEFT PANEL ── */}
      <div
        className="hidden lg:flex"
        style={{ width: '44%', minHeight: '100vh', background: 'linear-gradient(170deg, #f0f9f8 0%, #e6f4f1 50%, #ddf0ec 100%)', flexDirection: 'column', padding: '48px 52px', position: 'relative', overflow: 'hidden' }}
      >
        <div style={{ position: 'absolute', top: -100, right: -100, width: 380, height: 380, borderRadius: '50%', background: 'rgba(13,148,136,0.08)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -80, width: 280, height: 280, borderRadius: '50%', background: 'rgba(13,148,136,0.06)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
            <img src="/logo.svg" alt="Vyasa" style={{ width: 36, height: 36, borderRadius: 10 }} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#0f2040', lineHeight: 1.1 }}>Vyasa</div>
              <div style={{ fontSize: 11, color: '#0d9488', fontWeight: 600 }}>Integrated Healthcare OS</div>
            </div>
          </div>

          {/* Headline */}
          <div style={{ marginBottom: 36 }}>
            <h1 style={{ fontSize: 38, fontWeight: 900, color: '#0f2040', lineHeight: 1.15, letterSpacing: '-1px', margin: '0 0 14px' }}>
              Built for Doctors.<br />
              <span style={{ color: '#0d9488' }}>Designed for Care.</span>
            </h1>
            <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.6, maxWidth: 340, margin: 0 }}>
              One integrated platform to manage your practice, prescriptions, staff, and clinic operations seamlessly.
            </p>
          </div>

          {/* Feature list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {[
              { icon: <FileText size={16} strokeWidth={2} />, label: 'Digital Prescriptions', desc: 'Create, print & share in seconds' },
              { icon: <Users size={16} strokeWidth={2} />, label: 'Clinic & Staff Management', desc: 'Manage your clinic and team effortlessly' },
              { icon: <BarChart2 size={16} strokeWidth={2} />, label: 'Smart Insights', desc: 'Track performance & improve patient outcomes' },
              { icon: <Shield size={16} strokeWidth={2} />, label: 'Secure & Compliant', desc: 'Your data is safe, private & protected' },
            ].map(f => (
              <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0d9488', boxShadow: '0 2px 8px rgba(13,148,136,0.12)', flexShrink: 0 }}>
                  {f.icon}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f2040' }}>{f.label}</div>
                  <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 1 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', overflowY: 'auto' }}>
        <div className="lp-fade" style={{ width: '100%', maxWidth: 460 }}>

          {/* Mobile logo */}
          <div className="lg:hidden" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, justifyContent: 'center' }}>
            <img src="/logo.svg" alt="Vyasa" style={{ width: 32, height: 32, borderRadius: 9 }} />
            <span style={{ fontSize: 18, fontWeight: 800, color: '#0f2040' }}>Vyasa</span>
          </div>

          {/* Post-registration banner */}
          {justRegistered && (
            <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10 }}>
              <CheckCircle2 size={16} style={{ color: '#059669', flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#065f46' }}>Registration submitted!</div>
                <div style={{ fontSize: 12, color: '#047857', marginTop: 2 }}>Your account is under review. You'll receive an email once approved.</div>
              </div>
            </div>
          )}

          {/* ── MAIN CARD ── */}
          <div className="lp-card" style={{ padding: '32px 32px 28px' }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>Welcome back</h2>
            <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 22px' }}>Sign in to your Vyasa workspace</p>

            {/* Portal selector */}
            <p style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.4px' }}>I want to sign in as</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {([
                { key: 'solo' as SignInAs, Icon: Stethoscope, title: 'Solo Doctor', desc: 'Personal workspace' },
                { key: 'clinic' as SignInAs, Icon: Building2, title: 'Clinic / Staff', desc: 'Clinic dashboard & team' },
              ] as const).map(({ key, Icon, title, desc }) => (
                <button
                  key={key} type="button"
                  onClick={() => setSignInAs(key)}
                  style={{
                    border: `2px solid ${signInAs === key ? '#0d9488' : '#e5e7eb'}`,
                    borderRadius: 14, padding: '14px 16px',
                    background: signInAs === key ? '#f0fdfa' : 'white',
                    cursor: 'pointer', textAlign: 'left', position: 'relative', transition: 'all 0.15s',
                  }}
                >
                  {signInAs === key && (
                    <div style={{ position: 'absolute', top: 10, right: 10, width: 18, height: 18, borderRadius: '50%', background: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><polyline points="1.5,5 4,7.5 8.5,2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  )}
                  <div style={{ marginBottom: 7, color: signInAs === key ? '#0d9488' : '#9ca3af' }}>
                    <Icon size={20} strokeWidth={1.8} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{title}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2, lineHeight: 1.4 }}>{desc}</div>
                </button>
              ))}
            </div>

            {/* Errors */}
            {error === 'backend' && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '11px 14px', marginBottom: 14, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <WifiOff style={{ width: 14, height: 14, color: '#d97706', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>Server is waking up…</div>
                  <div style={{ fontSize: 12, color: '#78350f', marginTop: 2 }}>Render free tier takes 30–60 s on first request. Please wait.</div>
                </div>
              </div>
            )}
            {error && error !== 'backend' && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '11px 14px', marginBottom: 14 }}>
                <p style={{ fontSize: 13, color: '#dc2626', fontWeight: 600, margin: 0 }}>{error}</p>
                {error.includes('rejected') && (
                  <Link to="/register" style={{ display: 'inline-block', marginTop: 6, fontSize: 12, color: '#dc2626', fontWeight: 700 }}>
                    ↻ Reapply with correct information
                  </Link>
                )}
              </div>
            )}

            {/* Login form */}
            <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field
                label="Email or Phone"
                value={email} onChange={setEmail}
                placeholder="doctor@clinic.com"
                required autoComplete="username"
              />
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Password</label>
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>Forgot? Contact support@vyasaa.com</span>
                </div>
                <Field
                  type={showPw ? 'text' : 'password'}
                  value={password} onChange={setPassword}
                  placeholder="Enter your password"
                  required autoComplete="current-password"
                  rightEl={
                    <button type="button" aria-label={showPw ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPw(v => !v)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#9ca3af', display: 'flex' }}>
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />
              </div>

              {slowStart && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 9, padding: '9px 12px' }}>
                  <Loader2 style={{ width: 13, height: 13, color: '#3b82f6', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                  <p style={{ fontSize: 12, color: '#1d4ed8', margin: 0 }}>Server is waking up — please wait up to 60 s on first login.</p>
                </div>
              )}

              <button
                type="submit" disabled={loading}
                style={{ width: '100%', background: loading ? '#5eead4' : '#0d9488', color: 'white', border: 'none', borderRadius: 12, padding: '13px', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.2s', boxShadow: loading ? 'none' : '0 4px 14px rgba(13,148,136,0.3)' }}
              >
                {loading && <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />}
                {loading ? 'Signing in…' : 'Sign in →'}
              </button>
            </form>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
              <div style={{ flex: 1, height: 1, background: '#f3f4f6' }} />
              <span style={{ fontSize: 12, color: '#9ca3af' }}>or</span>
              <div style={{ flex: 1, height: 1, background: '#f3f4f6' }} />
            </div>

            {/* Google sign-in */}
            <button
              type="button"
              aria-label="Continue with Google"
              onClick={() => { setError(''); googleLogin(); }}
              disabled={googleLoading}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '12px', background: 'white', cursor: googleLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: '#374151', transition: 'border-color 0.15s', opacity: googleLoading ? 0.7 : 1 }}
              onMouseOver={e => { if (!googleLoading) (e.currentTarget as HTMLButtonElement).style.borderColor = '#d1d5db'; }}
              onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e7eb'; }}
            >
              {googleLoading
                ? <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite', color: '#9ca3af' }} />
                : GOOGLE_SVG}
              {googleLoading ? 'Connecting…' : 'Continue with Google'}
            </button>
          </div>

          {/* ── NEW TO VYASA ── */}
          <div className="lp-card" style={{ marginTop: 12, padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0d9488', flexShrink: 0 }}>
                <UserCircle size={20} strokeWidth={1.8} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>New to Vyasa?</div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 1 }}>Get started in minutes.</div>
              </div>
            </div>
            <Link
              to={registerPath}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#0d9488', color: 'white', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0, boxShadow: '0 2px 8px rgba(13,148,136,0.3)' }}
            >
              {registerLabel} <ChevronRight size={14} />
            </Link>
          </div>

          {/* ── TRY DEMO ── */}
          <div className="lp-card" style={{ marginTop: 10, padding: '16px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', flexShrink: 0 }}>
                  <Rocket size={18} strokeWidth={1.8} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Explore without an account</div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 1 }}>Try a live demo — no sign-in needed</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDemo(v => !v)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'white', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all 0.15s', flexShrink: 0 }}
                onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#0d9488'; (e.currentTarget as HTMLButtonElement).style.color = '#0d9488'; }}
                onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e7eb'; (e.currentTarget as HTMLButtonElement).style.color = '#374151'; }}
              >
                Try Demo <ChevronRight size={14} />
              </button>
            </div>

            {showDemo && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #f3f4f6' }}>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 10px' }}>Pick a role — full app, sample data:</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {DEMO_ROLES.map(({ role, label, icon }) => (
                    <button
                      key={role} onClick={() => handleDemo(role)}
                      style={{ padding: '10px 6px', borderRadius: 11, border: '1.5px solid #e5e7eb', background: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: '#374151', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}
                      onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#0d9488'; (e.currentTarget as HTMLButtonElement).style.background = '#f0fdfa'; (e.currentTarget as HTMLButtonElement).style.color = '#0d9488'; }}
                      onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e7eb'; (e.currentTarget as HTMLButtonElement).style.background = 'white'; (e.currentTarget as HTMLButtonElement).style.color = '#374151'; }}
                    >
                      <span style={{ color: '#0d9488' }}>{icon}</span>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <p style={{ textAlign: 'center', fontSize: 11, color: '#d1d5db', marginTop: 18 }}>
            Vyasa Integrated Healthcare Pvt. Ltd.
          </p>
        </div>
      </div>

      {/* ── Google New-User Modal ── */}
      {googleNewUser && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(15,32,64,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 20, boxShadow: '0 24px 80px rgba(15,32,64,0.3)', width: '100%', maxWidth: 540, maxHeight: '92vh', overflowY: 'auto', fontFamily: "'Inter', sans-serif" }}>
            {/* Modal header */}
            <div style={{ background: 'linear-gradient(135deg, #0f2040, #163560)', padding: '18px 22px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderRadius: '20px 20px 0 0', position: 'sticky', top: 0, zIndex: 1 }}>
              <div>
                <h3 style={{ color: 'white', fontWeight: 800, fontSize: 17, margin: '0 0 3px' }}>Complete your profile</h3>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, margin: 0 }}>
                  Signing in as <span style={{ color: '#2dd4bf', fontWeight: 600 }}>{googleNewUser.email}</span>
                </p>
              </div>
              <button
                onClick={() => setGoogleNewUser(null)}
                aria-label="Close"
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: 'rgba(255,255,255,0.7)', display: 'flex' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleGReg} style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Personal */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Personal Details</div>
                <FormField label="Full Name (as per MCI) *" error={gRegErrors.name}>
                  <input type="text" value={gRegForm.name} onChange={e => gSet('name', e.target.value)}
                    style={{ width: '100%', border: `1.5px solid ${gRegErrors.name ? '#f87171' : '#e2e8f0'}`, borderRadius: 9, padding: '10px 13px', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    placeholder="Dr. Arjun Mehta" />
                </FormField>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <FormField label="Mobile *" error={gRegErrors.phone}>
                    <input type="tel" value={gRegForm.phone} onChange={e => gSet('phone', e.target.value)}
                      style={{ width: '100%', border: `1.5px solid ${gRegErrors.phone ? '#f87171' : '#e2e8f0'}`, borderRadius: 9, padding: '10px 13px', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                      placeholder="9876543210" />
                  </FormField>
                  <FormField label="City">
                    <input type="text" value={gRegForm.city} onChange={e => gSet('city', e.target.value)}
                      style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 9, padding: '10px 13px', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                      placeholder="Mumbai" />
                  </FormField>
                </div>
              </div>

              {/* Professional */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Professional Details</div>
                <FormField label="Specialty *" error={gRegErrors.specialty}>
                  <SpecialtyCombobox value={gRegForm.specialty} onChange={v => gSet('specialty', v)} error={gRegErrors.specialty} />
                </FormField>
                <FormField label="Degrees / Qualifications *" error={gRegErrors.degrees}>
                  <input type="text" value={gRegForm.degrees} onChange={e => gSet('degrees', e.target.value)}
                    style={{ width: '100%', border: `1.5px solid ${gRegErrors.degrees ? '#f87171' : '#e2e8f0'}`, borderRadius: 9, padding: '10px 13px', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    placeholder="e.g. MBBS, MD" />
                </FormField>
                <FormField label="Medical Council *" error={gRegErrors.medicalCouncil}>
                  <select value={gRegForm.medicalCouncil} onChange={e => gSet('medicalCouncil', e.target.value)}
                    style={{ width: '100%', border: `1.5px solid ${gRegErrors.medicalCouncil ? '#f87171' : '#e2e8f0'}`, borderRadius: 9, padding: '10px 13px', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', background: 'white' }}>
                    <option value="">Select council…</option>
                    {INDIAN_MEDICAL_COUNCILS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </FormField>
                {gRegForm.medicalCouncil === 'other' && (
                  <FormField label="Specify Council *" error={gRegErrors.otherCouncil}>
                    <input type="text" value={gRegForm.otherCouncil} onChange={e => gSet('otherCouncil', e.target.value)}
                      style={{ width: '100%', border: `1.5px solid ${gRegErrors.otherCouncil ? '#f87171' : '#e2e8f0'}`, borderRadius: 9, padding: '10px 13px', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                      placeholder="Council name" />
                  </FormField>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <FormField label="Registration Number *" error={gRegErrors.licenseNumber}>
                    <input type="text" value={gRegForm.licenseNumber} onChange={e => gSet('licenseNumber', e.target.value)}
                      style={{ width: '100%', border: `1.5px solid ${gRegErrors.licenseNumber ? '#f87171' : '#e2e8f0'}`, borderRadius: 9, padding: '10px 13px', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                      placeholder="MH-12345" />
                  </FormField>
                  <FormField label="State of Registration *" error={gRegErrors.registrationState}>
                    <select value={gRegForm.registrationState} onChange={e => gSet('registrationState', e.target.value)}
                      style={{ width: '100%', border: `1.5px solid ${gRegErrors.registrationState ? '#f87171' : '#e2e8f0'}`, borderRadius: 9, padding: '10px 13px', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', background: 'white' }}>
                      <option value="">State…</option>
                      {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </FormField>
                </div>
              </div>

              {error && <p style={{ fontSize: 13, color: '#dc2626', fontWeight: 600, margin: 0 }}>{error}</p>}

              <button type="submit" disabled={loading}
                style={{ background: loading ? '#94a3b8' : 'linear-gradient(135deg, #0d9488, #0891b2)', color: 'white', border: 'none', borderRadius: 12, padding: '13px', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {loading ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : <ShieldCheck size={16} />}
                {loading ? 'Submitting…' : 'Submit for Approval'}
              </button>

              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 9, padding: '10px 13px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <Clock style={{ width: 13, height: 13, color: '#d97706', flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12, color: '#78350f', margin: 0, lineHeight: 1.5 }}>
                  We verify your license number. Full access is granted after approval — usually within a few hours.
                </p>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
