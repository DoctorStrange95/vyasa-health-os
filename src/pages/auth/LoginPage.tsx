import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Loader2, UserPlus, CheckCircle2, WifiOff, ShieldCheck, X, Clock, ChevronRight, Building2 } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuthStore } from '@/store/useAuthStore';
import { useAppStore } from '@/store/useAppStore';
import { trackEvent } from '@/lib/api';
import { INDIAN_MEDICAL_COUNCILS } from '@/lib/medicalCouncils';
import type { Role } from '@/types';

const SPECIALTY_GROUPS: { label: string; options: string[] }[] = [
  { label: 'Allopathy — General & Internal Medicine', options: [
    'General Medicine', 'Internal Medicine', 'Family Medicine / General Practice',
    'Geriatrics', 'Occupational Medicine', 'Aviation Medicine', 'Sports Medicine',
  ]},
  { label: 'Allopathy — Cardiology & Chest', options: [
    'Cardiology', 'Interventional Cardiology', 'Cardiac Electrophysiology',
    'Cardiothoracic Surgery', 'Pulmonology / Respiratory Medicine',
    'Sleep Medicine', 'Thoracic Surgery',
  ]},
  { label: 'Allopathy — Neurosciences', options: [
    'Neurology', 'Neurosurgery', 'Neuropsychiatry', 'Epileptology', 'Stroke Medicine',
  ]},
  { label: 'Allopathy — Gastroenterology & Liver', options: [
    'Gastroenterology', 'Hepatology', 'Colorectal Surgery', 'Surgical Gastroenterology',
  ]},
  { label: 'Allopathy — Kidneys & Urology', options: [
    'Nephrology', 'Urology', 'Andrology', 'Renal Transplant Surgery',
  ]},
  { label: 'Allopathy — Oncology', options: [
    'Medical Oncology', 'Surgical Oncology', 'Radiation Oncology',
    'Haematology & BMT', 'Gynaecological Oncology', 'Paediatric Oncology',
  ]},
  { label: 'Allopathy — Endocrine & Metabolism', options: [
    'Endocrinology & Diabetes', 'Obesity & Metabolic Medicine', 'Thyroid Surgery',
  ]},
  { label: 'Allopathy — Musculoskeletal', options: [
    'Orthopaedics & Traumatology', 'Arthroscopy & Sports Medicine', 'Spine Surgery',
    'Rheumatology', 'Physical Medicine & Rehabilitation', 'Hand Surgery',
  ]},
  { label: 'Allopathy — Obstetrics, Gynaecology & Reproductive Medicine', options: [
    'Obstetrics & Gynaecology', 'Maternal-Fetal Medicine', 'Reproductive Medicine & IVF',
    'Urogynaecology', 'Laparoscopic Gynaecology',
  ]},
  { label: 'Allopathy — Paediatrics & Neonatology', options: [
    'Paediatrics', 'Neonatology', 'Paediatric Surgery', 'Paediatric Neurology',
    'Paediatric Cardiology', 'Paediatric Haematology-Oncology', 'Developmental Paediatrics',
  ]},
  { label: 'Allopathy — Surgery', options: [
    'General Surgery', 'Laparoscopic & Minimally Invasive Surgery', 'Vascular Surgery',
    'Plastic & Reconstructive Surgery', 'Burns & Wound Care', 'Transplant Surgery',
    'Trauma Surgery', 'Bariatric Surgery',
  ]},
  { label: 'Allopathy — Critical Care & Emergency', options: [
    'Critical Care Medicine', 'Emergency Medicine', 'Anaesthesiology',
    'Pain Management', 'Palliative Care & Hospice',
  ]},
  { label: 'Allopathy — Skin, Eye & ENT', options: [
    'Dermatology', 'Dermatosurgery', 'Venereology & STD',
    'Ophthalmology', 'Vitreoretinal Surgery',
    'ENT (Otorhinolaryngology)', 'Head & Neck Surgery',
  ]},
  { label: 'Allopathy — Mental Health', options: [
    'Psychiatry', 'Addiction Medicine', 'Child & Adolescent Psychiatry', 'Liaison Psychiatry',
  ]},
  { label: 'Allopathy — Diagnostics & Support', options: [
    'Radiology & Imaging', 'Interventional Radiology', 'Nuclear Medicine',
    'Pathology & Lab Medicine', 'Transfusion Medicine', 'Microbiology',
    'Biochemistry', 'Forensic Medicine', 'Community Medicine / Public Health',
  ]},
  { label: 'Allopathy — Other Specialties', options: [
    'Immunology & Allergy', 'Infectious Diseases & HIV Medicine', 'Haematology',
    'Transplant Medicine', 'Hyperbaric Medicine',
  ]},
  { label: 'AYUSH', options: [
    'Ayurveda', 'Yoga & Naturopathy', 'Unani', 'Siddha', 'Homeopathy',
    'Panchakarma (Ayurveda)', 'Ksharasutra (Ayurvedic Surgery)',
  ]},
  { label: 'Dental', options: [
    'General Dentistry', 'Orthodontics & Dentofacial Orthopaedics',
    'Oral & Maxillofacial Surgery', 'Paediatric Dentistry', 'Periodontology',
    'Endodontics', 'Prosthodontics & Implantology',
    'Oral Medicine & Radiology', 'Oral Pathology & Microbiology',
    'Public Health Dentistry', 'Cosmetic Dentistry',
  ]},
  { label: 'Nursing', options: [
    'General Nursing & Midwifery', 'Critical Care Nursing', 'Paediatric Nursing',
    'Psychiatric & Mental Health Nursing', 'Community Health Nursing',
    'Oncology Nursing', 'Neonatal Nursing', 'Cardiac Care Nursing',
    'Nurse Practitioner / Advanced Practice Nursing',
  ]},
  { label: 'Allied Health & Paramedical', options: [
    'Physiotherapy & Rehabilitation', 'Occupational Therapy',
    'Speech & Language Therapy', 'Dietetics & Clinical Nutrition',
    'Clinical Psychology', 'Medical Social Work', 'Audiology & Hearing Sciences',
    'Optometry & Vision Science', 'Pharmacy / Clinical Pharmacology',
    'Medical Laboratory Technology', 'Radiography & Imaging Technology',
    'Operation Theatre Technology', 'Perfusion Technology',
    'Cardiac Technology', 'Respiratory Therapy',
    'Prosthetics & Orthotics', 'Health Information Management',
  ]},
];

const STATES = [
  'Andhra Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim',
  'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
  'West Bengal',
];

type Portal = 'staff' | 'patient';

const DEMO_ROLES: { role: Role; label: string }[] = [
  { role: 'clinic_admin', label: 'Solo Doctor' },
  { role: 'doctor',       label: 'Hospital Doctor' },
  { role: 'nurse',        label: 'Nurse' },
  { role: 'pharmacist',   label: 'Pharmacist' },
  { role: 'labtech',      label: 'Lab Tech' },
  { role: 'admin',        label: 'Hospital Admin' },
  { role: 'billing',      label: 'Billing' },
  { role: 'receptionist', label: 'Reception' },
  { role: 'patient',      label: 'Patient' },
];

const GOOGLE_SVG = (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
    <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
    <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18z"/>
    <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.31z"/>
  </svg>
);

function roleLabel(role: Role, specialty?: string) {
  if (role === 'clinic_admin') return specialty ?? 'Solo Practice';
  if (role === 'doctor') return specialty ?? 'Hospital Doctor';
  if (role === 'nurse') return 'Nurse';
  if (role === 'pharmacist') return 'Pharmacist';
  if (role === 'labtech') return 'Lab Technician';
  if (role === 'admin') return 'Hospital Admin';
  if (role === 'billing') return 'Billing';
  if (role === 'receptionist') return 'Receptionist';
  return role;
}

function GSpecialtyCombobox({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery(''); }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const allOptions = SPECIALTY_GROUPS.flatMap(g => g.options);
  const filtered = query.trim()
    ? allOptions.filter(s => s.toLowerCase().includes(query.toLowerCase()))
    : allOptions;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        type="text"
        autoComplete="off"
        value={open ? query : value}
        placeholder={value || 'Type to search specialty…'}
        onFocus={() => { setOpen(true); setQuery(''); }}
        onChange={e => { setQuery(e.target.value); onChange(''); }}
        style={{ width: '100%', border: `1.5px solid ${error ? '#f87171' : '#e2e8f0'}`, borderRadius: 11, padding: '11px 14px', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
      />
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 28px rgba(0,0,0,0.13)', maxHeight: 240, overflowY: 'auto', marginTop: 4 }}>
          {filtered.length === 0
            ? <div style={{ padding: '12px 14px', fontSize: 13, color: '#94a3b8' }}>No matches</div>
            : filtered.map(s => (
              <div key={s}
                onMouseDown={e => { e.preventDefault(); onChange(s); setOpen(false); setQuery(''); }}
                style={{ padding: '9px 14px', fontSize: 13, cursor: 'pointer', color: '#1e293b', background: s === value ? '#f0fdfa' : 'white' }}
                onMouseOver={e => (e.currentTarget.style.background = '#f0fdfa')}
                onMouseOut={e => (e.currentTarget.style.background = s === value ? '#f0fdfa' : 'white')}
              >{s}</div>
            ))
          }
        </div>
      )}
    </div>
  );
}

function GField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
      {children}
      {error && <p style={{ fontSize: 11, color: '#DC2626', margin: '3px 0 0', fontWeight: 600 }}>{error}</p>}
    </div>
  );
}

export default function LoginPage() {
  const [params] = useSearchParams();
  const justRegistered = params.get('registered') === '1';

  const [portal, setPortal] = useState<Portal>('staff');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [slowStart, setSlowStart] = useState(false);
  const [error, setError] = useState('');
  const [showDemo, setShowDemo] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  const [googleNewUser, setGoogleNewUser] = useState<{ email: string; name: string } | null>(null);
  const [gRegForm, setGRegForm] = useState({ name: '', specialty: '', degrees: '', phone: '', medicalCouncil: '', otherCouncil: '', licenseNumber: '', registrationState: '', city: '', practiceState: '', hospital: '' });
  const [gRegErrors, setGRegErrors] = useState<Record<string, string>>({});

  const { login, loginWithGoogle, completeGoogleRegister, loginAsDemo, recentAccount } = useAuthStore();
  const { loadDemo } = useAppStore();
  const navigate = useNavigate();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [geoPos, setGeoPos] = useState<{ lat: number; lng: number } | null>(null);
  const [ignoreRecent, setIgnoreRecent] = useState(false);
  const [quickLoginMode, setQuickLoginMode] = useState(false);

  const showQuickLogin = !!recentAccount && !ignoreRecent && portal === 'staff';

  useEffect(() => {
    trackEvent('login_page_view');
  }, []);

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
    onSuccess: (tokenResponse) => handleGoogleAccessToken(tokenResponse.access_token),
    onError: () => setError('Google sign-in failed. Try again.'),
    onNonOAuthError: (err) => setError(err.type === 'popup_closed' ? 'Sign-in window was closed.' : 'Google sign-in popup was blocked — please allow popups for this site.'),
  });

  function afterLogin() {
    const status = useAuthStore.getState().approvalStatus;
    navigate(status === 'pending' ? '/pending-approval' : '/app/dashboard');
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSlowStart(false); setLoading(true);
    trackEvent('login_attempt', { method: 'email', email: username });
    const wakeTimer = setTimeout(() => setSlowStart(true), 6000);
    try {
      await login(username, password, geoPos ?? undefined);
      afterLogin();
    } catch (err) {
      trackEvent('login_failed', { method: 'email', email: username, reason: err instanceof Error ? err.message : 'unknown' });
      setError(err instanceof Error ? err.message : 'backend');
    } finally {
      clearTimeout(wakeTimer); setSlowStart(false); setLoading(false);
    }
  }

  async function handleGoogleAccessToken(accessToken: string) {
    setGoogleLoading(true); setError('');
    trackEvent('login_attempt', { method: 'google' });
    const tryLogin = async () => loginWithGoogle(accessToken, geoPos ?? undefined);
    try {
      let result;
      try {
        result = await tryLogin();
      } catch (firstErr) {
        if (firstErr instanceof Error && firstErr.message === 'Failed to fetch') {
          await new Promise(r => setTimeout(r, 5000));
          result = await tryLogin();
        } else { throw firstErr; }
      }
      if (result.isNewUser) {
        setGoogleNewUser({ email: result.googleEmail, name: result.googleName });
        setGRegForm(f => ({ ...f, name: result.googleName }));
        trackEvent('login_attempt', { method: 'google', email: result.googleEmail, status: 'new_user' });
      } else { afterLogin(); }
    } catch (err) {
      trackEvent('login_failed', { method: 'google', reason: err instanceof Error ? err.message : 'unknown' });
      setError(err instanceof Error ? err.message : 'backend');
    } finally { setGoogleLoading(false); }
  }

  function validateGoogleForm() {
    const e: Record<string, string> = {};
    if (!gRegForm.name.trim()) e.name = 'Required';
    if (!gRegForm.specialty) e.specialty = 'Required';
    if (!gRegForm.degrees.trim()) e.degrees = 'Required';
    if (!gRegForm.phone || gRegForm.phone.replace(/\D/g, '').length < 10) e.phone = 'Enter a valid 10-digit number';
    if (!gRegForm.medicalCouncil) e.medicalCouncil = 'Required';
    if (gRegForm.medicalCouncil === 'other' && !gRegForm.otherCouncil.trim()) e.otherCouncil = 'Please specify your council';
    if (!gRegForm.registrationState) e.registrationState = 'Required';
    if (!gRegForm.licenseNumber.trim()) e.licenseNumber = 'Required';
    return e;
  }

  function gSet(k: string, v: string) { setGRegForm(f => ({ ...f, [k]: v })); setGRegErrors(e => ({ ...e, [k]: '' })); }

  async function handleGoogleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!googleNewUser) return;
    const errs = validateGoogleForm();
    if (Object.keys(errs).length) { setGRegErrors(errs); return; }
    setLoading(true);
    try {
      await completeGoogleRegister({
        name: gRegForm.name,
        email: googleNewUser.email,
        specialty: gRegForm.specialty,
        degrees: gRegForm.degrees,
        phone: gRegForm.phone,
        medicalCouncil: gRegForm.medicalCouncil === 'other' ? gRegForm.otherCouncil : gRegForm.medicalCouncil,
        licenseNumber: gRegForm.licenseNumber,
        regState: gRegForm.registrationState,
        city: gRegForm.city,
        state: gRegForm.practiceState,
        clinicName: gRegForm.hospital,
      });
      afterLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally { setLoading(false); }
  }

  function handleDemo(role: Role) {
    loginAsDemo(role);
    const demoUser = useAuthStore.getState().user;
    loadDemo(demoUser?.name, demoUser?.id);
    navigate('/app/dashboard');
  }

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'Figtree', 'Inter', -apple-system, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800;900&display=swap');`}</style>

      {/* ── LEFT BRANDING PANEL ── */}
      <div className="hidden lg:flex flex-col w-[46%] relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0f2040 0%, #163560 50%, #0d4b6e 100%)' }}>
        {/* Decorative blobs */}
        <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: 'rgba(13,148,136,0.15)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 240, height: 240, borderRadius: '50%', background: 'rgba(6,182,212,0.1)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '40%', left: '60%', width: 160, height: 160, borderRadius: '50%', background: 'rgba(99,102,241,0.08)', pointerEvents: 'none' }} />

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: `linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px)`, backgroundSize: '40px 40px' }}
        />

        <div className="relative flex flex-col h-full p-12">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-auto">
            <img src="/logo.svg" alt="Vyasa" style={{ width: 40, height: 40, borderRadius: 12, boxShadow: '0 4px 16px rgba(13,148,136,0.4)' }} />
            <div>
              <div style={{ color: 'white', fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.1 }}>Vyasa</div>
              <div style={{ color: '#2dd4bf', fontSize: 10, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' }}>Integrated Healthcare</div>
            </div>
          </div>

          {/* Headline */}
          <div style={{ margin: '40px 0 48px' }}>
            <h1 style={{ color: 'white', fontSize: 40, fontWeight: 900, lineHeight: 1.15, letterSpacing: '-1px', margin: '0 0 16px' }}>
              India's Clinical<br />
              <span style={{ color: '#2dd4bf' }}>Healthcare OS</span>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 16, lineHeight: 1.7, maxWidth: 320, margin: 0 }}>
              Full HMIS + prescriptions + hospital marketplace — one integrated system for every healthcare professional.
            </p>
          </div>

          {/* Feature list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 48 }}>
            {[
              { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>, label: 'Multi-specialty Prescriptions', desc: 'Write, print & WhatsApp Rx in seconds', color: '#0d9488', bg: 'rgba(13,148,136,0.15)' },
              { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>, label: 'Hospital Marketplace', desc: 'Book beds & infrastructure on demand', color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
              { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>, label: 'Real-time HMIS', desc: 'Live vitals, orders, nurse-doctor chat', color: '#06b6d4', bg: 'rgba(6,182,212,0.15)' },
            ].map(f => (
              <div key={f.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: f.color, flexShrink: 0 }}>
                  {f.icon}
                </div>
                <div>
                  <div style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>{f.label}</div>
                  <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 0, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 24 }}>
            {[
              { n: '10,000+', label: 'Patients served' },
              { n: '10+',     label: 'Healthcare Modules' },
              { n: '36',      label: 'States' },
            ].map((s, i) => (
              <div key={s.label} style={{ flex: 1, paddingRight: i < 2 ? 16 : 0, borderRight: i < 2 ? '1px solid rgba(255,255,255,0.1)' : 'none', paddingLeft: i > 0 ? 16 : 0 }}>
                <div style={{ color: '#2dd4bf', fontSize: 20, fontWeight: 900 }}>{s.n}</div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT FORM PANEL ── */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto" style={{ background: '#f8fafc' }}>
        <div className="w-full max-w-[420px] py-6">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <img src="/logo.svg" alt="Vyasa" style={{ width: 36, height: 36, borderRadius: 10 }} />
            <span style={{ color: '#0f2040', fontSize: 20, fontWeight: 800 }}>Vyasa Integrated Healthcare</span>
          </div>

          {justRegistered && (
            <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-emerald-800">Registration submitted!</div>
                <div className="text-xs text-emerald-700 mt-0.5">Your account is under review. You'll get an email once approved. Meanwhile, try demo mode below.</div>
              </div>
            </div>
          )}

          {/* Main card */}
          <div style={{ background: 'white', borderRadius: 20, boxShadow: '0 4px 32px rgba(15,32,64,0.1)', overflow: 'hidden' }}>
            {/* Card header */}
            <div style={{ padding: '28px 28px 0' }}>
              <h2 style={{ fontSize: 24, fontWeight: 900, color: '#0f2040', margin: '0 0 4px', letterSpacing: '-0.5px' }}>Welcome back</h2>
              <p style={{ fontSize: 14, color: '#94a3b8', margin: '0 0 22px' }}>Sign in to your clinical workspace</p>

              {/* Portal toggle */}
              <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 12, padding: 4, marginBottom: 22 }}>
                {(['staff', 'patient'] as Portal[]).map(p => (
                  <button key={p} onClick={() => setPortal(p)}
                    style={{ flex: 1, padding: '9px 8px', borderRadius: 9, border: 'none', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                      background: portal === p ? 'white' : 'transparent',
                      color: portal === p ? '#0f2040' : '#94a3b8',
                      boxShadow: portal === p ? '0 2px 8px rgba(15,32,64,0.12)' : 'none',
                    }}>
                    {p === 'staff' ? 'For Doctors & Staff' : 'For Patients'}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ padding: '0 28px 28px' }}>
              {/* ── QUICK LOGIN (returning user) ── */}
              {showQuickLogin && recentAccount ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 16, padding: '16px 18px', marginBottom: 14 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #0d9488, #0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 18, fontWeight: 800, flexShrink: 0 }}>
                      {recentAccount.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#0f2040', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{recentAccount.name}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>{roleLabel(recentAccount.role, recentAccount.specialty)}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      if (recentAccount.loginMethod === 'google') {
                        googleLogin();
                      } else {
                        setUsername(recentAccount.email);
                        setShowEmailForm(true);
                        setQuickLoginMode(true);
                        setIgnoreRecent(true);
                      }
                    }}
                    disabled={googleLoading}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'linear-gradient(135deg, #0d9488, #0891b2)', color: 'white', border: 'none', borderRadius: 13, padding: '13px 16px', cursor: googleLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, boxShadow: '0 4px 14px rgba(13,148,136,0.35)', marginBottom: 12, opacity: googleLoading ? 0.7 : 1 }}
                  >
                    {googleLoading ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : null}
                    {googleLoading ? 'Signing in…' : 'Continue'}
                    {!googleLoading && <ChevronRight style={{ width: 16, height: 16 }} />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIgnoreRecent(true)}
                    style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, color: '#94a3b8', padding: '4px 0', marginBottom: 4 }}
                  >
                    Use a different account
                  </button>

                  {error && error !== 'backend' && (
                    <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 11, padding: '12px 14px', marginTop: 10 }}>
                      <p style={{ fontSize: 13, color: '#DC2626', fontWeight: 700, margin: 0 }}>{error}</p>
                    </div>
                  )}
                </div>
              ) : (
              <>
              {/* ── GOOGLE BUTTON (primary CTA) ── */}
              <button
                type="button"
                onClick={() => { setError(''); googleLogin(); }}
                disabled={googleLoading}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, border: '1.5px solid #e2e8f0', borderRadius: 13, padding: '13px 16px', background: 'white', cursor: googleLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, color: '#1e293b', transition: 'all 0.2s', marginBottom: 14, boxShadow: '0 2px 8px rgba(15,32,64,0.06)', opacity: googleLoading ? 0.7 : 1 }}
                className="hover:border-slate-300 hover:shadow-md active:scale-[0.99]"
              >
                {googleLoading ? <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite', color: '#94a3b8' }} /> : GOOGLE_SVG}
                {googleLoading ? 'Continuing with Google…' : 'Sign in with Google'}
              </button>

              {/* ── ERROR MESSAGES (visible for Google + Email) ── */}
              {error === 'backend' && (
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 11, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <WifiOff style={{ width: 14, height: 14, color: '#D97706', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>Server is waking up…</span>
                  </div>
                  <p style={{ fontSize: 12, color: '#78350F', lineHeight: 1.5, margin: 0 }}>
                    Backend is on Render's free tier — takes <strong>30–60 s</strong> to wake on first request.
                  </p>
                </div>
              )}
              {error && error !== 'backend' && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 11, padding: '14px', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: error.includes('rejected') ? 14 : 0 }}>
                    <div style={{ color: '#DC2626', fontSize: 20, fontWeight: 700, flexShrink: 0 }}>⚠️</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, color: '#DC2626', fontWeight: 700, margin: '0 0 6px', lineHeight: 1.4 }}>{error}</p>
                      <p style={{ fontSize: 12, color: '#991B1B', margin: 0, lineHeight: 1.5 }}>
                        {error.includes('rejected')
                          ? 'Please update your information with correct details and reapply.'
                          : 'Please correct the information and try again, or contact support at support@vyasaa.com'}
                      </p>
                    </div>
                  </div>
                  {error.includes('rejected') && (
                    <Link to="/register"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#DC2626', color: 'white', border: 'none', borderRadius: 9, padding: '10px 16px', fontSize: 13, fontWeight: 700, textDecoration: 'none', cursor: 'pointer', transition: 'all 0.2s', marginTop: 8 }}
                      onMouseOver={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#991B1B'; }}
                      onMouseOut={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#DC2626'; }}>
                      ↻ Reapply with correct information
                    </Link>
                  )}
                </div>
              )}

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1, height: 1, background: '#f1f5f9' }} />
                <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>or use email</span>
                <div style={{ flex: 1, height: 1, background: '#f1f5f9' }} />
              </div>

              {/* Toggle email form */}
              {!showEmailForm ? (
                <button type="button" onClick={() => setShowEmailForm(true)}
                  style={{ width: '100%', border: '1.5px dashed #e2e8f0', borderRadius: 13, padding: '12px', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: '#64748b', transition: 'all 0.2s' }}
                  className="hover:border-slate-300 hover:text-slate-700">
                  Sign in with email / password
                </button>
              ) : (
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {quickLoginMode && recentAccount ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 11, padding: '10px 14px' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #0d9488, #0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                        {recentAccount.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f2040' }}>{recentAccount.name}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{recentAccount.email}</div>
                      </div>
                    </div>
                  ) : (
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email or Username</label>
                    <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                      placeholder="doctor@clinic.com" required autoComplete="username"
                      style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 11, padding: '11px 14px', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.15s', color: '#0f2040' }}
                      onFocus={e => (e.target.style.borderColor = '#0d9488')}
                      onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                    />
                  </div>
                  )}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Password</label>
                    <div style={{ position: 'relative' }}>
                      <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••" required autoComplete="current-password"
                        style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 11, padding: '11px 40px 11px 14px', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', color: '#0f2040' }}
                        onFocus={e => (e.target.style.borderColor = '#0d9488')}
                        onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                      />
                      <button type="button" onClick={() => setShowPw(v => !v)}
                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#94a3b8' }}>
                        {showPw ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                      </button>
                    </div>
                  </div>

                  {/* Only show slow start message inside email form */}
                  {slowStart && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '9px 12px' }}>
                      <Loader2 style={{ width: 13, height: 13, color: '#3B82F6', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                      <p style={{ fontSize: 12, color: '#1D4ED8', margin: 0 }}>Server is waking up — up to 60 s on first login.</p>
                    </div>
                  )}

                  <button type="submit" disabled={loading}
                    style={{ background: loading ? '#94a3b8' : 'linear-gradient(135deg, #0d9488, #0891b2)', color: 'white', border: 'none', borderRadius: 13, padding: '13px', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: loading ? 'none' : '0 4px 14px rgba(13,148,136,0.35)', transition: 'all 0.2s' }}>
                    {loading && <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />}
                    {loading ? 'Signing in…' : 'Sign In'}
                  </button>
                </form>
              )}
              </>
              )}

              {/* Demo mode */}
              <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid #f1f5f9' }}>
                <button onClick={() => setShowDemo(v => !v)}
                  style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#0d9488', padding: '4px 0' }}>
                  {showDemo ? 'Hide demo mode ↑' : 'Explore without account — demo mode ↓'}
                </button>
                {showDemo && (
                  <>
                    <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', margin: '10px 0 12px' }}>Full app with sample data. No sign-in needed.</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      {DEMO_ROLES.map(({ role, label }) => (
                        <button key={role} onClick={() => handleDemo(role)}
                          style={{ padding: '11px 6px', borderRadius: 12, border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 700, color: '#475569', transition: 'all 0.15s', textAlign: 'center', lineHeight: 1.3 }}
                          onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#0d9488'; (e.currentTarget as HTMLButtonElement).style.background = '#f0fdfa'; (e.currentTarget as HTMLButtonElement).style.color = '#0d9488'; }}
                          onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLButtonElement).style.background = 'white'; (e.currentTarget as HTMLButtonElement).style.color = '#475569'; }}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Create account card */}
          <div style={{ marginTop: 14, background: 'white', borderRadius: 16, padding: '16px 20px', boxShadow: '0 2px 12px rgba(15,32,64,0.07)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f2040', marginBottom: 10 }}>New to Vyasa?</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Link to="/register"
                style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#f1f5f9', border: '1.5px solid #e2e8f0', borderRadius: 11, padding: '9px 12px', fontSize: 12, fontWeight: 700, color: '#0f2040', textDecoration: 'none', transition: 'all 0.2s' }}
                onMouseOver={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = '#0d9488'; (e.currentTarget as HTMLAnchorElement).style.color = '#0d9488'; }}
                onMouseOut={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLAnchorElement).style.color = '#0f2040'; }}>
                <UserPlus style={{ width: 14, height: 14 }} />
                Solo Doctor
              </Link>
              <Link to="/org-register"
                style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#f0fdfa', border: '1.5px solid #99f6e4', borderRadius: 11, padding: '9px 12px', fontSize: 12, fontWeight: 700, color: '#0f766e', textDecoration: 'none', transition: 'all 0.2s' }}
                onMouseOver={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = '#0d9488'; (e.currentTarget as HTMLAnchorElement).style.background = '#ccfbf1'; }}
                onMouseOut={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = '#99f6e4'; (e.currentTarget as HTMLAnchorElement).style.background = '#f0fdfa'; }}>
                <Building2 style={{ width: 14, height: 14 }} />
                Clinic / Hospital
              </Link>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, padding: '14px 16px', background: '#f0fdf4', border: '1.5px solid #dcfce7', borderRadius: 11 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f2040' }}>Looking for a Doctor?</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Browse our verified doctors network</div>
            </div>
            <Link to="/doctors"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'white', border: '1.5px solid #dcfce7', borderRadius: 11, padding: '9px 16px', fontSize: 13, fontWeight: 700, color: '#0d9488', textDecoration: 'none', whiteSpace: 'nowrap', transition: 'all 0.2s' }}
              onMouseOver={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = '#0d9488'; (e.currentTarget as HTMLAnchorElement).style.background = '#f0fdf4'; }}
              onMouseOut={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = '#dcfce7'; (e.currentTarget as HTMLAnchorElement).style.background = 'white'; }}>
              Browse
            </Link>
          </div>

          <p style={{ textAlign: 'center', fontSize: 12, color: '#cbd5e1', marginTop: 18 }}>
            Vyasa Health Technologies Pvt. Ltd.
          </p>
        </div>
      </div>

      {/* ── Google New-User Modal ── */}
      {googleNewUser && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(15,32,64,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 24, boxShadow: '0 24px 80px rgba(15,32,64,0.3)', width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto', fontFamily: "'Figtree', Inter, sans-serif" }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #0f2040, #163560)', padding: '20px 24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 1 }}>
              <div>
                <h3 style={{ color: 'white', fontWeight: 800, fontSize: 18, margin: '0 0 4px' }}>Complete your profile</h3>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, margin: 0 }}>Signing in as <span style={{ color: '#2dd4bf', fontWeight: 600 }}>{googleNewUser.email}</span></p>
              </div>
              <button onClick={() => setGoogleNewUser(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: 'rgba(255,255,255,0.6)', display: 'flex' }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <form onSubmit={handleGoogleRegister} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* ── Personal Details ── */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 14, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Personal Details</div>

                <GField label="Full Name (as per MCI) *" error={gRegErrors.name}>
                  <input type="text" value={gRegForm.name} onChange={e => gSet('name', e.target.value)}
                    style={{ width: '100%', border: `1.5px solid ${gRegErrors.name ? '#f87171' : '#e2e8f0'}`, borderRadius: 11, padding: '11px 14px', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    placeholder="Dr. Arjun Mehta" />
                </GField>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <GField label="Mobile *" error={gRegErrors.phone}>
                    <input type="tel" value={gRegForm.phone} onChange={e => gSet('phone', e.target.value)}
                      style={{ width: '100%', border: `1.5px solid ${gRegErrors.phone ? '#f87171' : '#e2e8f0'}`, borderRadius: 11, padding: '11px 14px', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                      placeholder="9876543210" />
                  </GField>
                  <GField label="City">
                    <input type="text" value={gRegForm.city} onChange={e => gSet('city', e.target.value)}
                      style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 11, padding: '11px 14px', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                      placeholder="Mumbai" />
                  </GField>
                </div>
              </div>

              {/* ── Professional Details ── */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 14, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Professional Details</div>

                <GField label="Specialty *" error={gRegErrors.specialty}>
                  <GSpecialtyCombobox value={gRegForm.specialty} onChange={v => gSet('specialty', v)} error={gRegErrors.specialty} />
                </GField>

                <GField label="Degrees / Qualifications *" error={gRegErrors.degrees}>
                  <input type="text" value={gRegForm.degrees} onChange={e => gSet('degrees', e.target.value)}
                    style={{ width: '100%', border: `1.5px solid ${gRegErrors.degrees ? '#f87171' : '#e2e8f0'}`, borderRadius: 11, padding: '11px 14px', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    placeholder="e.g. MBBS, MD" />
                </GField>

                <GField label="Medical Council / Registration Body *" error={gRegErrors.medicalCouncil}>
                  <select value={gRegForm.medicalCouncil} onChange={e => gSet('medicalCouncil', e.target.value)}
                    style={{ width: '100%', border: `1.5px solid ${gRegErrors.medicalCouncil ? '#f87171' : '#e2e8f0'}`, borderRadius: 11, padding: '11px 14px', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', background: 'white' }}>
                    <option value="">Select your medical council…</option>
                    {INDIAN_MEDICAL_COUNCILS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </GField>

                {gRegForm.medicalCouncil === 'other' && (
                  <GField label="Specify Council Name *" error={gRegErrors.otherCouncil}>
                    <input type="text" value={gRegForm.otherCouncil} onChange={e => gSet('otherCouncil', e.target.value)}
                      style={{ width: '100%', border: `1.5px solid ${gRegErrors.otherCouncil ? '#f87171' : '#e2e8f0'}`, borderRadius: 11, padding: '11px 14px', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                      placeholder="Enter your council or board name" />
                  </GField>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <GField label="Council Registration Number *" error={gRegErrors.licenseNumber}>
                    <input type="text" inputMode="text" value={gRegForm.licenseNumber} onChange={e => gSet('licenseNumber', e.target.value)}
                      style={{ width: '100%', border: `1.5px solid ${gRegErrors.licenseNumber ? '#f87171' : '#e2e8f0'}`, borderRadius: 11, padding: '11px 14px', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                      placeholder="e.g. MH-12345 or 123456" />
                  </GField>
                  <GField label="State of Registration *" error={gRegErrors.registrationState}>
                    <select value={gRegForm.registrationState} onChange={e => gSet('registrationState', e.target.value)}
                      style={{ width: '100%', border: `1.5px solid ${gRegErrors.registrationState ? '#f87171' : '#e2e8f0'}`, borderRadius: 11, padding: '11px 14px', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', background: 'white' }}>
                      <option value="">Which state issued it?</option>
                      {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </GField>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <GField label="State of Practice">
                    <select value={gRegForm.practiceState} onChange={e => gSet('practiceState', e.target.value)}
                      style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 11, padding: '11px 14px', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', background: 'white' }}>
                      <option value="">Which state do you practice in?</option>
                      {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </GField>
                  <GField label="Primary Hospital / Clinic">
                    <input type="text" value={gRegForm.hospital} onChange={e => gSet('hospital', e.target.value)}
                      style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 11, padding: '11px 14px', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                      placeholder="e.g. Apollo, own clinic…" />
                  </GField>
                </div>

                <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Registration number required for prescription access. Verified within a few hours.</p>
              </div>

              {error && <p style={{ fontSize: 13, color: '#DC2626', fontWeight: 600, margin: 0 }}>{error}</p>}

              <button type="submit" disabled={loading}
                style={{ background: loading ? '#94a3b8' : 'linear-gradient(135deg, #0d9488, #0891b2)', color: 'white', border: 'none', borderRadius: 13, padding: '14px', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: loading ? 'none' : '0 4px 14px rgba(13,148,136,0.3)' }}>
                {loading ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : <ShieldCheck style={{ width: 16, height: 16 }} />}
                {loading ? 'Submitting…' : 'Submit for Approval'}
              </button>

              <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 11, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 4 }}>
                <Clock style={{ width: 13, height: 13, color: '#D97706', flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12, color: '#78350F', margin: 0, lineHeight: 1.5 }}>Our team will verify your license number. Full access is granted after approval — usually within a few hours.</p>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
