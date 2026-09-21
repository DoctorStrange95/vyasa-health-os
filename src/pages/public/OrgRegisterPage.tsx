import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, ChevronRight, ChevronLeft, CheckCircle2, Loader2, Eye, EyeOff, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

// Uses the global api client for the unauthenticated registration POST
// (raw fetch is needed here because api client requires a Bearer token,
//  but /org/register is a public endpoint — we use BASE directly)
const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'https://vyasa-os-backend.onrender.com';

type OrgType = 'clinic' | 'hospital';
type Step = 'type' | 'org' | 'admin' | 'done';

const STEPS: Step[] = ['type', 'org', 'admin', 'done'];

export default function OrgRegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('type');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [adminEmail, setAdminEmail] = useState(''); // stored separately for success screen

  const [orgType, setOrgType] = useState<OrgType | ''>('');
  const [org, setOrg] = useState({ name: '', address: '', city: '', state: '', phone: '', email: '', gstin: '' });
  const [admin, setAdmin] = useState({ name: '', email: '', phone: '', specialty: '', password: '', confirm: '' });

  const stepIndex = STEPS.indexOf(step);

  function validateOrg(): string | null {
    if (!org.name.trim()) return 'Facility name is required';
    return null;
  }

  function validateAdmin(): string | null {
    if (!admin.name.trim()) return 'Full name is required';
    if (!admin.email.trim() || !admin.email.includes('@')) return 'Valid email is required';
    if (admin.password.length < 6) return 'Password must be at least 6 characters';
    if (admin.password !== admin.confirm) return 'Passwords do not match';
    return null;
  }

  async function submit() {
    const err = validateAdmin();
    if (err) { setError(err); return; }
    setSubmitting(true); setError('');
    try {
      const res = await fetch(`${BASE}/org/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_name: org.name.trim(), org_type: orgType,
          address: org.address, city: org.city, state: org.state,
          phone: org.phone, email: org.email, gstin: org.gstin,
          admin_name: admin.name.trim(), admin_email: admin.email.trim().toLowerCase(),
          admin_password: admin.password, admin_phone: admin.phone,
          admin_specialty: admin.specialty,
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error ?? 'Registration failed'); return; }
      setAdminEmail(admin.email.trim().toLowerCase());
      setStep('done');
    } catch {
      setError('Network error — please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-teal-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-teal-500/30">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">Vyasa Integrated Healthcare</h1>
          <p className="text-slate-500 text-sm mt-1">Clinic & Hospital Registration</p>
        </div>

        {/* Step progress */}
        {step !== 'done' && (
          <div className="flex items-center gap-2 mb-8 px-2">
            {['Choose Type', 'Organisation', 'Admin Account'].map((label, i) => (
              <div key={label} className="flex items-center gap-2 flex-1">
                <div className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all',
                  i < stepIndex ? 'bg-teal-500 text-white' :
                  i === stepIndex ? 'bg-teal-600 text-white shadow-md shadow-teal-300' :
                  'bg-slate-200 text-slate-400',
                )}>
                  {i < stepIndex ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span className={cn('text-xs font-medium flex-1', i === stepIndex ? 'text-teal-700' : 'text-slate-400')}>
                  {label}
                </span>
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
                {[
                  { type: 'clinic' as OrgType, icon: <Building2 className="w-7 h-7 text-teal-600" />, title: 'Clinic', desc: 'OPD, 1–5 doctors, day-care procedures' },
                  { type: 'hospital' as OrgType, icon: <Building2 className="w-7 h-7 text-indigo-600" />, title: 'Hospital', desc: 'IPD, multiple departments, pharmacy, lab' },
                ].map(o => (
                  <button key={o.type} type="button" onClick={() => setOrgType(o.type)}
                    className={cn(
                      'p-5 rounded-2xl border-2 text-left transition-all hover:shadow-md',
                      orgType === o.type ? 'border-teal-500 bg-teal-50 shadow-md' : 'border-slate-200 hover:border-teal-300',
                    )}>
                    <div className="mb-3">{o.icon}</div>
                    <div className="font-bold text-slate-900">{o.title}</div>
                    <div className="text-xs text-slate-500 mt-1">{o.desc}</div>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => { if (orgType) setStep('org'); }}
                disabled={!orgType}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
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
                  <input
                    className="input"
                    placeholder={orgType === 'hospital' ? 'e.g. City General Hospital' : 'e.g. Apollo Family Clinic'}
                    value={org.name}
                    onChange={e => setOrg(o => ({ ...o, name: e.target.value }))}
                  />
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
                    <label className="label">GSTIN <span className="text-slate-400 font-normal">(optional)</span></label>
                    <input className="input" placeholder="e.g. 27AAAAA0000A1Z5"
                      value={org.gstin} onChange={e => setOrg(o => ({ ...o, gstin: e.target.value }))} />
                  </div>
                </div>
              </div>
              {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => { setError(''); setStep('type'); }} className="btn-secondary flex items-center gap-1">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="button"
                  onClick={() => { const err = validateOrg(); if (err) setError(err); else { setError(''); setStep('admin'); } }}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Admin account ── */}
          {step === 'admin' && (
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Admin Account</h2>
              <p className="text-sm text-slate-500 mb-5">This will be the primary administrator login for <strong>{org.name}</strong>.</p>
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
                    <input className="input pr-10" placeholder="Min. 6 characters"
                      type={showPass ? 'text' : 'password'}
                      value={admin.password} onChange={e => setAdmin(a => ({ ...a, password: e.target.value }))} />
                    <button type="button" aria-label={showPass ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPass(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label">Confirm Password *</label>
                  <div className="relative">
                    <input className="input pr-10" placeholder="Re-enter password"
                      type={showConfirm ? 'text' : 'password'}
                      value={admin.confirm} onChange={e => setAdmin(a => ({ ...a, confirm: e.target.value }))} />
                    <button type="button" aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                      onClick={() => setShowConfirm(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mt-3">
                  <p className="text-red-600 text-sm font-medium">{error}</p>
                </div>
              )}
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => { setError(''); setStep('org'); }} className="btn-secondary flex items-center gap-1">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={submitting || !admin.name || !admin.email || !admin.password}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {submitting ? 'Creating account…' : 'Create Account'}
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
              <h2 className="text-xl font-bold text-slate-900 mb-2">Account created!</h2>
              <p className="text-slate-500 text-sm mb-6">
                <strong>{org.name}</strong> is registered. You can now log in and set up your clinic.
              </p>

              {/* Show email, NOT the password */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left mb-6 space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Mail className="w-4 h-4 text-teal-500 flex-shrink-0" />
                  <span>Log in with: <strong className="select-all">{adminEmail}</strong></span>
                </div>
                <p className="text-xs text-slate-400 pl-6">Use the password you just set. You can change it after login in Settings.</p>
              </div>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                Go to Login <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>

        {step !== 'done' && (
          <p className="text-center text-sm text-slate-400 mt-6">
            Solo doctor?{' '}
            <Link to="/register" className="text-teal-600 font-semibold hover:underline">
              Register as individual
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
