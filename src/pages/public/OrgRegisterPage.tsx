import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, ChevronRight, ChevronLeft, CheckCircle2, Loader2, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

const API = import.meta.env.VITE_API_URL ?? 'https://vyasa-os-backend.onrender.com';

type OrgType = 'clinic' | 'hospital';
type Step = 'type' | 'org' | 'admin' | 'done';

const STEPS: Step[] = ['type', 'org', 'admin', 'done'];

export default function OrgRegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('type');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [tempPassword, setTempPassword] = useState('');

  const [orgType, setOrgType] = useState<OrgType | ''>('');
  const [org, setOrg] = useState({ name: '', address: '', city: '', state: '', phone: '', email: '', gstin: '' });
  const [admin, setAdmin] = useState({ name: '', email: '', phone: '', specialty: '', password: '', confirm: '' });

  const stepIndex = STEPS.indexOf(step);

  async function submit() {
    if (admin.password !== admin.confirm) { setError('Passwords do not match'); return; }
    if (admin.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setSubmitting(true); setError('');
    try {
      const res = await fetch(`${API}/org/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_name: org.name, org_type: orgType,
          address: org.address, city: org.city, state: org.state,
          phone: org.phone, email: org.email, gstin: org.gstin,
          admin_name: admin.name, admin_email: admin.email,
          admin_password: admin.password, admin_phone: admin.phone,
          admin_specialty: admin.specialty,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Registration failed'); return; }
      setTempPassword(admin.password);
      setStep('done');
    } catch { setError('Network error. Please try again.'); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-teal-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-teal-500/30">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">Vyasa Health OS</h1>
          <p className="text-slate-500 text-sm mt-1">Clinic & Hospital Registration</p>
        </div>

        {/* Progress bar */}
        {step !== 'done' && (
          <div className="flex items-center gap-2 mb-8 px-2">
            {['Choose Type', 'Organisation', 'Admin Account'].map((label, i) => (
              <div key={label} className="flex items-center gap-2 flex-1">
                <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all',
                  i < stepIndex ? 'bg-teal-500 text-white' :
                  i === stepIndex ? 'bg-teal-600 text-white shadow-md shadow-teal-300' :
                  'bg-slate-200 text-slate-400')}>
                  {i < stepIndex ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span className={cn('text-xs font-medium flex-1', i === stepIndex ? 'text-teal-700' : 'text-slate-400')}>{label}</span>
                {i < 2 && <div className={cn('h-0.5 w-4 flex-shrink-0', i < stepIndex ? 'bg-teal-400' : 'bg-slate-200')} />}
              </div>
            ))}
          </div>
        )}

        <div className="card p-6 shadow-xl">

          {/* ── Step 1: Type ── */}
          {step === 'type' && (
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">What are you registering?</h2>
              <p className="text-sm text-slate-500 mb-6">Choose the type that best describes your facility.</p>
              <div className="grid grid-cols-2 gap-4 mb-6">
                {([
                  { type: 'clinic' as OrgType, icon: '🏥', title: 'Clinic', desc: 'OPD, 1-5 doctors, day-care procedures' },
                  { type: 'hospital' as OrgType, icon: '🏨', title: 'Hospital', desc: 'IPD, multiple departments, pharmacy, lab' },
                ] as const).map(o => (
                  <button key={o.type} onClick={() => setOrgType(o.type)}
                    className={cn('p-5 rounded-2xl border-2 text-left transition-all hover:shadow-md',
                      orgType === o.type ? 'border-teal-500 bg-teal-50 shadow-md' : 'border-slate-200 hover:border-teal-300')}>
                    <div className="text-3xl mb-3">{o.icon}</div>
                    <div className="font-bold text-slate-900">{o.title}</div>
                    <div className="text-xs text-slate-500 mt-1">{o.desc}</div>
                  </button>
                ))}
              </div>
              <button onClick={() => { if (orgType) setStep('org'); }}
                disabled={!orgType}
                className="btn-primary w-full flex items-center justify-center gap-2">
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── Step 2: Org info ── */}
          {step === 'org' && (
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">
                {orgType === 'hospital' ? 'Hospital' : 'Clinic'} Details
              </h2>
              <p className="text-sm text-slate-500 mb-5">Basic information about your facility.</p>
              <div className="space-y-3">
                <div>
                  <label className="label">{orgType === 'hospital' ? 'Hospital' : 'Clinic'} Name *</label>
                  <input className="input" placeholder={`e.g. ${orgType === 'hospital' ? 'City General Hospital' : 'Apollo Family Clinic'}`}
                    value={org.name} onChange={e => setOrg(o => ({ ...o, name: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Address</label>
                  <input className="input" placeholder="Street address"
                    value={org.address} onChange={e => setOrg(o => ({ ...o, address: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">City</label>
                    <input className="input" placeholder="City"
                      value={org.city} onChange={e => setOrg(o => ({ ...o, city: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">State</label>
                    <input className="input" placeholder="State"
                      value={org.state} onChange={e => setOrg(o => ({ ...o, state: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Phone</label>
                    <input className="input" placeholder="Contact number" type="tel"
                      value={org.phone} onChange={e => setOrg(o => ({ ...o, phone: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">GSTIN</label>
                    <input className="input" placeholder="Optional"
                      value={org.gstin} onChange={e => setOrg(o => ({ ...o, gstin: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep('type')} className="btn-secondary flex items-center gap-1">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={() => { if (org.name.trim()) { setError(''); setStep('admin'); } else setError('Facility name is required'); }}
                  className="btn-primary flex-1 flex items-center justify-center gap-2">
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Admin account ── */}
          {step === 'admin' && (
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Admin Account</h2>
              <p className="text-sm text-slate-500 mb-5">This will be the primary administrator login.</p>
              <div className="space-y-3">
                <div>
                  <label className="label">Full Name *</label>
                  <input className="input" placeholder="Dr. Ramesh Kumar"
                    value={admin.name} onChange={e => setAdmin(a => ({ ...a, name: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Specialty</label>
                    <input className="input" placeholder="e.g. General Medicine"
                      value={admin.specialty} onChange={e => setAdmin(a => ({ ...a, specialty: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Phone</label>
                    <input className="input" placeholder="Mobile number" type="tel"
                      value={admin.phone} onChange={e => setAdmin(a => ({ ...a, phone: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="label">Email *</label>
                  <input className="input" placeholder="admin@yourclinic.com" type="email"
                    value={admin.email} onChange={e => setAdmin(a => ({ ...a, email: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Password *</label>
                  <div className="relative">
                    <input className="input pr-10" placeholder="Min. 6 characters" type={showPass ? 'text' : 'password'}
                      value={admin.password} onChange={e => setAdmin(a => ({ ...a, password: e.target.value }))} />
                    <button type="button" onClick={() => setShowPass(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label">Confirm Password *</label>
                  <input className="input" placeholder="Re-enter password" type="password"
                    value={admin.confirm} onChange={e => setAdmin(a => ({ ...a, confirm: e.target.value }))} />
                </div>
              </div>
              {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
              <div className="flex gap-3 mt-6">
                <button onClick={() => { setError(''); setStep('org'); }} className="btn-secondary flex items-center gap-1">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={submit} disabled={submitting || !admin.name || !admin.email || !admin.password}
                  className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {submitting ? 'Creating…' : 'Create Account'}
                </button>
              </div>
            </div>
          )}

          {/* ── Done ── */}
          {step === 'done' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-teal-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">You're all set!</h2>
              <p className="text-slate-500 text-sm mb-6">
                <strong>{org.name}</strong> has been registered. Log in with your admin credentials to get started.
              </p>
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-left mb-6">
                <p className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-2">Your Login Details</p>
                <p className="text-sm text-slate-700"><span className="font-medium">Email:</span> {admin.email}</p>
                <p className="text-sm text-slate-700 mt-1"><span className="font-medium">Password:</span> {tempPassword}</p>
                <p className="text-xs text-slate-400 mt-2">Save this — you can change your password after login.</p>
              </div>
              <button onClick={() => navigate('/login')} className="btn-primary w-full">
                Go to Login
              </button>
            </div>
          )}

        </div>

        {step !== 'done' && (
          <p className="text-center text-sm text-slate-400 mt-6">
            Solo doctor?{' '}
            <Link to="/login" className="text-teal-600 font-semibold hover:underline">Register as individual</Link>
          </p>
        )}
      </div>
    </div>
  );
}
