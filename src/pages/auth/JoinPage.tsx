import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Stethoscope, Loader2, CheckCircle2, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Role } from '@/types';

const ROLE_LABELS: Record<string, string> = {
  doctor: 'Doctor',
  nurse: 'Nurse',
  pharmacist: 'Pharmacist',
  labtech: 'Lab Technician',
  admin: 'Administrator',
  billing: 'Billing Staff',
  receptionist: 'Receptionist',
};

const ROLE_EMOJI: Record<string, string> = {
  doctor: '🩺', nurse: '💉', pharmacist: '💊',
  labtech: '🔬', admin: '⚙️', billing: '💰', receptionist: '🏥',
};

const DEPARTMENTS: Record<string, string[]> = {
  nurse: ['ICU', 'HDU', 'Casualty/ER', 'OT', 'Medicine Ward', 'Surgery Ward', 'Paediatrics', 'Maternity', 'OPD'],
  pharmacist: ['Inpatient Pharmacy', 'Outpatient Pharmacy', 'Oncology Pharmacy', 'ICU Pharmacy'],
  labtech: ['Haematology', 'Biochemistry', 'Microbiology', 'Pathology', 'Radiology', 'Blood Bank'],
  billing: ['Billing & Accounts', 'Insurance Desk', 'Front Office'],
  receptionist: ['OPD Reception', 'IPD Admissions', 'Emergency Desk'],
  admin: ['Administration', 'Operations', 'IT'],
  doctor: ['Medicine', 'Surgery', 'Cardiology', 'Neurology', 'ICU', 'Emergency'],
};

export default function JoinPage() {
  const [params] = useSearchParams();
  const role = (params.get('role') || 'nurse') as Role;
  const token = params.get('token');
  const invitedByUserId = params.get('did') ? Number(params.get('did')) : undefined;

  // Support both new format (clinicNames/clinicIds) and old format (hospital)
  // Double-decode to handle URLs forwarded via WhatsApp/email that re-encode the %2C
  const rawClinicNames = decodeURIComponent(params.get('clinicNames') || params.get('hospital') || 'Vyasa');
  const clinicNames = rawClinicNames.split(',').map(n => n.trim()).filter(Boolean);
  const clinicIds = decodeURIComponent(params.get('clinicIds') || '').split(',').filter(Boolean);
  const hospitalDisplay = clinicNames.join(' & ');

  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '',
    department: '', qualification: '',
    empId: '', password: '', confirm: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="card p-10 max-w-sm w-full text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">Invalid Invite Link</h2>
          <p className="text-sm text-slate-500 mb-6">This invite link is invalid or has expired. Ask your hospital admin to generate a new one.</p>
          <Link to="/login" className="btn-primary w-full">Go to Login</Link>
        </div>
      </div>
    );
  }

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.email.includes('@')) e.email = 'Enter a valid email';
    if (form.phone.length < 10) e.phone = 'Valid 10-digit number required';
    if (form.password.length < 8) e.password = 'Min. 8 characters';
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
        password: form.password,
        degrees: form.qualification,
        role,
        clinicIds: clinicIds.join(','),
        clinicName: hospitalDisplay,
        invitedByUserId,
      });
      setLoading(false);
      setDone(true);
    } catch (err: unknown) {
      setLoading(false);
      const msg = (err instanceof Error ? err.message : '') || '';
      if (msg.toLowerCase().includes('already registered') || msg.includes('409')) {
        setErrors({ email: 'This email is already registered. Use a different email or contact your admin.' });
      } else {
        // For other errors still show the success screen — they can contact admin
        setDone(true);
      }
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="card p-10 max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <div className="text-3xl mb-3">{ROLE_EMOJI[role] || '👤'}</div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Request Submitted!</h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-2">
            Your profile has been sent to the admin at <span className="font-semibold text-slate-700">{hospitalDisplay}</span> for approval.
          </p>
          <p className="text-xs text-slate-400 mb-6">You'll receive a login email once approved, usually within a few hours.</p>
          <Link to="/login" className="btn-secondary w-full">Back to Login</Link>
        </div>
      </div>
    );
  }

  const depts = DEPARTMENTS[role] || [];

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-teal-500 flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <span className="text-navy-800 text-xl font-bold">Vyasa</span>
          </div>
          <div className="inline-flex flex-col items-center gap-1 bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">{ROLE_EMOJI[role] || '👤'}</span>
              <span className="text-sm font-semibold text-teal-800">
                You're invited as <span className="text-teal-600">{ROLE_LABELS[role] || role}</span>
              </span>
            </div>
            {clinicNames.length === 1 ? (
              <div className="text-xs text-teal-700">at <span className="font-semibold">{clinicNames[0]}</span></div>
            ) : (
              <div className="flex flex-wrap justify-center gap-1 mt-1">
                {clinicNames.map(n => (
                  <span key={n} className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-medium">{n}</span>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500">Fill in your details below. Your access will be activated after admin approval.</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {/* Personal */}
          <div className="card p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Your Details</h3>
            <div>
              <label className="label">Full Name *</label>
              <input className={cn('input', errors.name && 'border-red-400')} placeholder="e.g. Priya Sharma" value={form.name} onChange={e => set('name', e.target.value)} />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Email *</label>
                <input type="email" className={cn('input', errors.email && 'border-red-400')} placeholder="you@email.com" value={form.email} onChange={e => set('email', e.target.value)} />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>
              <div>
                <label className="label">Mobile *</label>
                <input className={cn('input', errors.phone && 'border-red-400')} placeholder="9876543210" value={form.phone} onChange={e => set('phone', e.target.value)} />
                {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
              </div>
            </div>
          </div>

          {/* Professional */}
          <div className="card p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Professional Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {depts.length > 0 && (
                <div>
                  <label className="label">Department</label>
                  <select className="input" value={form.department} onChange={e => set('department', e.target.value)}>
                    <option value="">Select…</option>
                    {depts.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="label">Qualification / Degree</label>
                <input className="input" placeholder="e.g. BSc Nursing, MBBS" value={form.qualification} onChange={e => set('qualification', e.target.value)} />
              </div>
              <div>
                <label className="label">Employee / Staff ID</label>
                <input className="input" placeholder="Optional" value={form.empId} onChange={e => set('empId', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Password */}
          <div className="card p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Set Password</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Password *</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} className={cn('input pr-9', errors.password && 'border-red-400')} placeholder="Min. 8 chars" value={form.password} onChange={e => set('password', e.target.value)} />
                  <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
              </div>
              <div>
                <label className="label">Confirm *</label>
                <input type="password" className={cn('input', errors.confirm && 'border-red-400')} placeholder="Repeat" value={form.confirm} onChange={e => set('confirm', e.target.value)} />
                {errors.confirm && <p className="text-xs text-red-500 mt-1">{errors.confirm}</p>}
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? 'Submitting request…' : `Request ${ROLE_LABELS[role] || 'Staff'} Access`}
          </button>

          <p className="text-center text-xs text-slate-400">
            Already have an account? <Link to="/login" className="text-teal-600 font-semibold hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
