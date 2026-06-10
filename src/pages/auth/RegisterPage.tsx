import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Stethoscope, Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type Mode = 'choose' | 'doctor' | 'hospital';

const SPECIALTIES = [
  'General Medicine', 'Internal Medicine', 'Cardiology', 'Pulmonology',
  'Neurology', 'Neurosurgery', 'Orthopaedics', 'General Surgery',
  'Gastroenterology', 'Nephrology', 'Endocrinology', 'Oncology',
  'Obstetrics & Gynaecology', 'Paediatrics', 'Neonatology',
  'Psychiatry', 'Dermatology', 'Ophthalmology', 'ENT',
  'Radiology', 'Pathology', 'Anaesthesiology', 'Emergency Medicine',
  'Critical Care', 'Urology', 'Plastic Surgery', 'Vascular Surgery',
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

export default function RegisterPage() {
  const [mode, setMode] = useState<Mode>('choose');
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
            <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
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
            { icon: '🩺', title: 'Free for doctors', desc: 'Full Rx + patient management, zero cost' },
            { icon: '🏥', title: 'Hospital plans from ₹999/mo', desc: 'Full HMIS, unlimited staff, pharmacy + lab' },
            { icon: '🔗', title: 'Marketplace access', desc: 'List beds/OTs — earn on idle infrastructure' },
          ].map(f => (
            <div key={f.title} className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-teal-500/15 flex items-center justify-center text-lg flex-shrink-0">{f.icon}</div>
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
            <div className="w-9 h-9 rounded-xl bg-teal-500 flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <span className="text-navy-800 text-xl font-bold">Vyasa Health OS</span>
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
          <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center text-3xl flex-shrink-0 group-hover:bg-teal-100 transition-colors">
            🩺
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
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-3xl flex-shrink-0 group-hover:bg-blue-100 transition-colors">
            🏥
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
    name: '', email: '', phone: '', specialty: '',
    mciNumber: '', regState: '', hospital: '', city: '', state: '',
    password: '', confirm: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.email.includes('@')) e.email = 'Enter a valid email';
    if (form.phone.length < 10) e.phone = 'Enter a valid 10-digit number';
    if (!form.specialty) e.specialty = 'Required';
    if (!form.mciNumber.trim()) e.mciNumber = 'Required';
    if (!form.regState) e.regState = 'Required';
    if (form.password.length < 8) e.password = 'At least 8 characters';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    return e;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const { api } = await import('@/lib/api');
      await api.post('/auth/register', {
        name: form.name,
        email: form.email,
        phone: form.phone,
        specialty: form.specialty,
        password: form.password,
        licenseNumber: form.mciNumber,
        regState: form.regState,
        state: form.state,
        city: form.city,
        role: 'clinic_admin',
      });
      setDone(true);
      setTimeout(onSuccess, 2000);
    } catch (err) {
      setErrors({ email: err instanceof Error ? err.message : 'Registration failed. Please try again.' });
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
        <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-2xl">🩺</div>
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
            <select className={cn('input', errors.specialty && 'border-red-400')} value={form.specialty} onChange={e => set('specialty', e.target.value)}>
              <option value="">Select specialty…</option>
              {SPECIALTIES.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="MCI / State Reg. No. *" error={errors.mciNumber}>
              <input className={cn('input', errors.mciNumber && 'border-red-400')} placeholder="e.g. MH-12345" value={form.mciNumber} onChange={e => set('mciNumber', e.target.value)} />
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

        <p className="text-xs text-slate-400">
          By registering you agree to Vyasa's <span className="text-teal-600 cursor-pointer">Terms of Service</span> and <span className="text-teal-600 cursor-pointer">Privacy Policy</span>.
        </p>

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
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-2xl">🏥</div>
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
          <div className="grid grid-cols-3 gap-3">
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

        <p className="text-xs text-slate-400">
          By registering you agree to Vyasa's <span className="text-teal-600 cursor-pointer">Terms of Service</span> and <span className="text-teal-600 cursor-pointer">Privacy Policy</span>.
        </p>

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
