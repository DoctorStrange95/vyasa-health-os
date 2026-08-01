import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2, ChevronRight, Stethoscope, Building2, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { INDIAN_MEDICAL_COUNCILS } from '@/lib/medicalCouncils';

type Mode = 'choose' | 'doctor' | 'hospital';

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

const HOSPITAL_TYPES = [
  'Private Hospital', 'Government Hospital', 'Trust / Charitable Hospital',
  'Clinic', 'Nursing Home', 'Super Speciality Hospital', 'Multi-Speciality Hospital',
  'Diagnostic Centre', 'Day Care Centre',
];

const STATES = [
  'Andhra Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim',
  'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
  'West Bengal',
];

function SpecialtyCombobox({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
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
        className={cn('input', error && 'border-red-400')}
        value={open ? query : value}
        placeholder={value || 'Type to search specialty…'}
        onFocus={() => { setOpen(true); setQuery(''); }}
        onChange={e => { setQuery(e.target.value); onChange(''); }}
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

export default function RegisterPage() {
  const [mode, setMode] = useState<Mode>('doctor');
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col justify-between w-5/12 bg-navy-800 p-12 relative overflow-hidden flex-shrink-0">
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: `linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px)`, backgroundSize: '48px 48px' }}
        />
        <div className="absolute top-20 left-20 w-64 h-64 bg-teal-500/20 rounded-full blur-3xl" />

        <div className="relative">
          <Link to="/login" className="flex items-center gap-3 mb-12 group">
            <img src="/logo.svg" alt="Vyasa" className="w-10 h-10 rounded-xl" />
            <span className="text-white text-2xl font-bold tracking-tight">Vyasa</span>
          </Link>

          <h1 className="text-4xl font-bold text-white leading-snug mb-4">
            Join India's<br />
            <span className="text-teal-400">Healthcare Network</span>
          </h1>
          <p className="text-slate-400 text-base leading-relaxed max-w-sm">
            Doctors get a full clinical workspace. Hospitals get a complete HMIS and access to India's doctor marketplace.
          </p>
        </div>

        <div className="relative space-y-4">
          {[
            { icon: <Stethoscope className="w-4 h-4 text-teal-400" />, title: 'Free for doctors', desc: 'Full Rx + patient management, zero cost' },
            { icon: <Building2 className="w-4 h-4 text-teal-400" />, title: 'Hospital plans from ₹999/mo', desc: 'Full HMIS, unlimited staff, pharmacy + lab' },
            { icon: <Link2 className="w-4 h-4 text-teal-400" />, title: 'Marketplace access', desc: 'List beds/OTs — earn on idle infrastructure' },
          ].map(f => (
            <div key={f.title} className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-teal-500/15 flex items-center justify-center flex-shrink-0">{f.icon}</div>
              <div>
                <div className="text-white font-semibold text-sm">{f.title}</div>
                <div className="text-slate-400 text-xs">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-lg py-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <img src="/logo.svg" alt="Vyasa" className="w-9 h-9 rounded-xl" />
            <span className="text-navy-800 text-xl font-bold">Vyasa Integrated Healthcare</span>
          </div>

          {mode === 'choose' && <ChooseMode onSelect={setMode} />}
          {mode === 'doctor' && <DoctorForm onBack={() => setMode('choose')} onSuccess={() => navigate('/login?registered=1')} />}
          {mode === 'hospital' && <HospitalForm onBack={() => setMode('choose')} onSuccess={() => navigate('/login?registered=1')} />}

          <p className="text-center text-xs text-slate-400 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-teal-600 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Choose mode card ─────────────────────────────────────────────────────────

function ChooseMode({ onSelect }: { onSelect: (m: 'doctor' | 'hospital') => void }) {
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Create your account</h2>
        <p className="text-sm text-slate-500 mt-1">Who are you registering as?</p>
      </div>
      <div className="space-y-4">
        <button
          onClick={() => onSelect('doctor')}
          className="w-full card p-5 flex items-center gap-5 hover:border-teal-400 hover:shadow-md active:scale-[.99] transition-all text-left group"
        >
          <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center flex-shrink-0 group-hover:bg-teal-100 transition-colors text-teal-600">
            <Stethoscope className="w-7 h-7" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-slate-900 text-base">I'm a Doctor</div>
            <div className="text-sm text-slate-500 mt-0.5">Register as an individual clinician</div>
            <div className="flex flex-wrap gap-2 mt-2">
              {['Free plan', 'Rx + OPD', 'Patient history', 'Print & WhatsApp'].map(t => (
                <span key={t} className="text-[10px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-medium">{t}</span>
              ))}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-teal-500 flex-shrink-0" />
        </button>

        <button
          onClick={() => onSelect('hospital')}
          className="w-full card p-5 flex items-center gap-5 hover:border-teal-400 hover:shadow-md active:scale-[.99] transition-all text-left group"
        >
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors text-blue-600">
            <Building2 className="w-7 h-7" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-slate-900 text-base">Register a Hospital / Clinic</div>
            <div className="text-sm text-slate-500 mt-0.5">Set up your facility on Vyasa HMIS</div>
            <div className="flex flex-wrap gap-2 mt-2">
              {['Full HMIS', 'Multi-staff', 'Beds & Labs', 'Marketplace listing'].map(t => (
                <span key={t} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{t}</span>
              ))}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-teal-500 flex-shrink-0" />
        </button>
      </div>
    </div>
  );
}

// ─── Doctor Registration Form ─────────────────────────────────────────────────

function DoctorForm({ onBack, onSuccess }: { onBack: () => void; onSuccess: () => void }) {
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', specialty: '', degrees: '',
    mciNumber: '', medicalCouncil: '', otherCouncil: '', regState: '', hospital: '', city: '', state: '',
    password: '', confirm: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); }

  function validate() {
    const e: Record<string, string> = {};
    const nameClean = form.name.trim();
    const emailClean = form.email.trim().toLowerCase();
    const phoneDigits = form.phone.replace(/\D/g, '');

    if (!nameClean)                                      e.name = 'Required';
    else if (nameClean.length > 100)                     e.name = 'Name too long (max 100 chars)';
    // RFC-compliant basic email check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailClean)) e.email = 'Enter a valid email address';
    if (phoneDigits.length < 10)                         e.phone = 'Enter a valid 10-digit number';
    else if (phoneDigits.length > 15)                    e.phone = 'Phone number too long';
    if (!form.specialty)                                 e.specialty = 'Required';
    if (!form.degrees.trim())                            e.degrees = 'Required';
    else if (form.degrees.trim().length > 200)           e.degrees = 'Too long (max 200 chars)';
    if (!form.medicalCouncil)                            e.medicalCouncil = 'Required';
    if (form.medicalCouncil === 'other' && !form.otherCouncil.trim()) e.otherCouncil = 'Please specify your council';
    if (!form.mciNumber.trim())                          e.mciNumber = 'Required';
    else if (!/^[A-Za-z0-9\-\/\s]{3,30}$/.test(form.mciNumber.trim())) e.mciNumber = 'Enter a valid registration number';
    if (!form.regState)                                  e.regState = 'Required';
    if (form.password.length < 8)                        e.password = 'At least 8 characters required';
    else if (form.password.length > 128)                 e.password = 'Password too long';
    else if (!/[A-Z]/.test(form.password) && !/[0-9]/.test(form.password))
                                                         e.password = 'Include at least one uppercase letter or number';
    if (form.password !== form.confirm)                  e.confirm = 'Passwords do not match';
    return e;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return; // prevent duplicate submission
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const { api } = await import('@/lib/api');
      await api.post('/auth/register', {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.replace(/\D/g, '').slice(0, 15),
        specialty: form.specialty,
        degrees: form.degrees.trim(),
        password: form.password,
        medicalCouncil: form.medicalCouncil === 'other' ? form.otherCouncil.trim() : form.medicalCouncil,
        licenseNumber: form.mciNumber.trim(),
        regState: form.regState,
        state: form.state,
        city: form.city?.trim(),
        role: 'clinic_admin',
      });
      setDone(true);
      setTimeout(onSuccess, 2000);
    } catch (err) {
      // Never display raw server messages to prevent info leakage
      const msg = err instanceof Error ? err.message : '';
      if (msg.toLowerCase().includes('already registered') || msg.includes('409')) {
        setErrors({ email: 'This email is already registered. Try logging in instead.' });
      } else if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('required')) {
        setErrors({ email: 'Please check your details and try again.' });
      } else {
        setErrors({ email: 'Registration failed. Please try again in a moment.' });
      }
    } finally {
      setLoading(false);
    }
  }

  if (done) return <SuccessCard title="Registration submitted!" message="Your doctor profile is under review. You'll receive a login link on your email within 24 hours." />;

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
          <Stethoscope className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Doctor Registration</h2>
          <p className="text-xs text-slate-500">Free — takes 2 minutes</p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4">
        {/* Personal */}
        <div className="card p-4 space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Personal Details</h3>
          <Field label="Full Name (as per MCI)" error={errors.name}>
            <input className={cn('input', errors.name && 'border-red-400')} placeholder="Dr. Arjun Mehta" value={form.name} onChange={e => set('name', e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email" error={errors.email}>
              <input type="email" className={cn('input', errors.email && 'border-red-400')} placeholder="you@hospital.com" value={form.email} onChange={e => set('email', e.target.value)} />
            </Field>
            <Field label="Mobile" error={errors.phone}>
              <input className={cn('input', errors.phone && 'border-red-400')} placeholder="9876543210" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </Field>
          </div>
        </div>

        {/* Professional */}
        <div className="card p-4 space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Professional Details</h3>
          <Field label="Specialty *" error={errors.specialty}>
            <SpecialtyCombobox value={form.specialty} onChange={v => set('specialty', v)} error={errors.specialty} />
          </Field>
          <Field label="Degrees / Qualifications *" error={errors.degrees}>
            <input className={cn('input', errors.degrees && 'border-red-400')} placeholder="e.g. MBBS, MD" value={form.degrees} onChange={e => set('degrees', e.target.value)} />
          </Field>
          <Field label="Medical Council / Registration Body *" error={errors.medicalCouncil}>
            <select className={cn('input', errors.medicalCouncil && 'border-red-400')} value={form.medicalCouncil} onChange={e => set('medicalCouncil', e.target.value)}>
              <option value="">Select your medical council…</option>
              {INDIAN_MEDICAL_COUNCILS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          {form.medicalCouncil === 'other' && (
            <Field label="Specify Council Name *" error={errors.otherCouncil}>
              <input className={cn('input', errors.otherCouncil && 'border-red-400')} placeholder="Enter your council or board name" value={form.otherCouncil} onChange={e => set('otherCouncil', e.target.value)} />
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Council Registration Number *" error={errors.mciNumber}>
              <input className={cn('input', errors.mciNumber && 'border-red-400')} placeholder="e.g. MH-12345 or 123456" value={form.mciNumber} onChange={e => set('mciNumber', e.target.value)} />
            </Field>
            <Field label="State of Registration (Medical Council) *" error={errors.regState}>
              <select className={cn('input', errors.regState && 'border-red-400')} value={form.regState} onChange={e => set('regState', e.target.value)}>
                <option value="">Which state issued it?</option>
                {STATES.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="City">
              <input className="input" placeholder="Mumbai" value={form.city} onChange={e => set('city', e.target.value)} />
            </Field>
            <Field label="State of Practice">
              <select className="input" value={form.state} onChange={e => set('state', e.target.value)}>
                <option value="">Which state do you practice in?</option>
                {STATES.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Primary Hospital / Clinic">
            <input className="input" placeholder="e.g. Apollo, Fortis, or your own clinic name" value={form.hospital} onChange={e => set('hospital', e.target.value)} />
          </Field>
        </div>

        {/* Password */}
        <div className="card p-4 space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Set Password</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Password *" error={errors.password}>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} className={cn('input pr-9', errors.password && 'border-red-400')} placeholder="Min. 8 chars" value={form.password} onChange={e => set('password', e.target.value)} />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>
            <Field label="Confirm Password *" error={errors.confirm}>
              <input type="password" className={cn('input', errors.confirm && 'border-red-400')} placeholder="Repeat password" value={form.confirm} onChange={e => set('confirm', e.target.value)} />
            </Field>
          </div>
        </div>

        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            required
            className="mt-0.5 w-4 h-4 accent-teal-600 flex-shrink-0 cursor-pointer"
          />
          <span className="text-xs text-slate-500 leading-relaxed">
            I have read and agree to Vyasa Integrated Healthcare Pvt. Ltd.'s{' '}
            <a href="https://vyasaa.com/privacy" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">Privacy Policy</a>
            {' '}and{' '}
            <a href="https://vyasaa.com/privacy" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">Terms of Service</a>.
            {' '}I understand my patient data will be stored securely and processed in accordance with Indian healthcare law.
          </span>
        </label>

        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {loading ? 'Submitting…' : 'Create Doctor Account'}
        </button>
      </form>
    </div>
  );
}

// ─── Hospital Registration Form ───────────────────────────────────────────────

function HospitalForm({ onBack, onSuccess }: { onBack: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    hospitalName: '', type: '', regNumber: '',
    address: '', city: '', state: '', pincode: '',
    beds: '', contactName: '', contactEmail: '', contactPhone: '',
    password: '', confirm: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPw, setShowPw] = useState(false);

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.hospitalName.trim()) e.hospitalName = 'Required';
    if (!form.type) e.type = 'Required';
    if (!form.contactEmail.includes('@')) e.contactEmail = 'Enter a valid email';
    if (form.contactPhone.length < 10) e.contactPhone = 'Valid 10-digit number required';
    if (form.password.length < 8) e.password = 'Min. 8 characters';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    return e;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 1400));
    setLoading(false);
    setDone(true);
    setTimeout(onSuccess, 2000);
  }

  if (done) return <SuccessCard title="Hospital registered!" message="Your HMIS workspace is being set up. Your admin login credentials will be sent to your email within a few hours." />;

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Register your Hospital</h2>
          <p className="text-xs text-slate-500">Full HMIS workspace in minutes</p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4">
        {/* Facility */}
        <div className="card p-4 space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Facility Details</h3>
          <Field label="Hospital / Clinic Name *" error={errors.hospitalName}>
            <input className={cn('input', errors.hospitalName && 'border-red-400')} placeholder="City General Hospital" value={form.hospitalName} onChange={e => set('hospitalName', e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Facility Type *" error={errors.type}>
              <select className={cn('input', errors.type && 'border-red-400')} value={form.type} onChange={e => set('type', e.target.value)}>
                <option value="">Select type…</option>
                {HOSPITAL_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Registration / NABH No.">
              <input className="input" placeholder="Optional" value={form.regNumber} onChange={e => set('regNumber', e.target.value)} />
            </Field>
          </div>
          <Field label="Total Beds">
            <input type="number" className="input" placeholder="e.g. 50" value={form.beds} onChange={e => set('beds', e.target.value)} />
          </Field>
        </div>

        {/* Address */}
        <div className="card p-4 space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Address</h3>
          <Field label="Street Address">
            <input className="input" placeholder="123, MG Road" value={form.address} onChange={e => set('address', e.target.value)} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="City">
              <input className="input" placeholder="Mumbai" value={form.city} onChange={e => set('city', e.target.value)} />
            </Field>
            <Field label="State">
              <select className="input" value={form.state} onChange={e => set('state', e.target.value)}>
                <option value="">Select…</option>
                {STATES.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="PIN Code">
              <input className="input" placeholder="400001" value={form.pincode} onChange={e => set('pincode', e.target.value)} />
            </Field>
          </div>
        </div>

        {/* Admin contact */}
        <div className="card p-4 space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Admin Contact (You)</h3>
          <Field label="Contact Person Name">
            <input className="input" placeholder="Your full name" value={form.contactName} onChange={e => set('contactName', e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email *" error={errors.contactEmail}>
              <input type="email" className={cn('input', errors.contactEmail && 'border-red-400')} placeholder="admin@hospital.com" value={form.contactEmail} onChange={e => set('contactEmail', e.target.value)} />
            </Field>
            <Field label="Mobile *" error={errors.contactPhone}>
              <input className={cn('input', errors.contactPhone && 'border-red-400')} placeholder="9876543210" value={form.contactPhone} onChange={e => set('contactPhone', e.target.value)} />
            </Field>
          </div>
        </div>

        {/* Password */}
        <div className="card p-4 space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Admin Password</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Password *" error={errors.password}>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} className={cn('input pr-9', errors.password && 'border-red-400')} placeholder="Min. 8 chars" value={form.password} onChange={e => set('password', e.target.value)} />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>
            <Field label="Confirm *" error={errors.confirm}>
              <input type="password" className={cn('input', errors.confirm && 'border-red-400')} placeholder="Repeat" value={form.confirm} onChange={e => set('confirm', e.target.value)} />
            </Field>
          </div>
        </div>

        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            required
            className="mt-0.5 w-4 h-4 accent-teal-600 flex-shrink-0 cursor-pointer"
          />
          <span className="text-xs text-slate-500 leading-relaxed">
            I have read and agree to Vyasa Integrated Healthcare Pvt. Ltd.'s{' '}
            <a href="https://vyasaa.com/privacy" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">Privacy Policy</a>
            {' '}and{' '}
            <a href="https://vyasaa.com/privacy" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">Terms of Service</a>.
            {' '}I understand my patient data will be stored securely and processed in accordance with Indian healthcare law.
          </span>
        </label>

        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {loading ? 'Setting up workspace…' : 'Register Hospital & Get HMIS Access'}
        </button>
      </form>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function SuccessCard({ title, message }: { title: string; message: string }) {
  return (
    <div className="card p-10 text-center">
      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">{title}</h2>
      <p className="text-sm text-slate-500 leading-relaxed">{message}</p>
    </div>
  );
}
