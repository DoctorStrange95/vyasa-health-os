import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Stethoscope, Eye, EyeOff, Loader2, Building2, User, UserPlus, CheckCircle2, Info, WifiOff } from 'lucide-react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { useAuthStore } from '@/store/useAuthStore';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import type { Role } from '@/types';

type Portal = 'staff' | 'patient';

const DEMO_ROLES: { role: Role; label: string; emoji: string }[] = [
  { role: 'clinic_admin', label: 'Solo Doctor / Clinic', emoji: '🏥' },
  { role: 'doctor', label: 'Hospital Doctor', emoji: '🩺' },
  { role: 'nurse', label: 'Nurse', emoji: '💉' },
  { role: 'pharmacist', label: 'Pharmacist', emoji: '💊' },
  { role: 'labtech', label: 'Lab Tech', emoji: '🔬' },
  { role: 'admin', label: 'Hospital Admin', emoji: '⚙️' },
  { role: 'billing', label: 'Billing', emoji: '💰' },
  { role: 'receptionist', label: 'Reception', emoji: '🎫' },
  { role: 'patient', label: 'Patient', emoji: '👤' },
];

export default function LoginPage() {
  const [params] = useSearchParams();
  const justRegistered = params.get('registered') === '1';

  const [portal, setPortal] = useState<Portal>('staff');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDemo, setShowDemo] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const { login, loginWithGoogle, loginAsDemo } = useAuthStore();
  const { loadDemo } = useAppStore();
  const navigate = useNavigate();
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password, portal);
      navigate('/app/dashboard');
    } catch {
      setAttempt(a => a + 1);
      setError('backend');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSuccess(response: CredentialResponse) {
    if (!response.credential) return;
    setGoogleLoading(true);
    setError('');
    try {
      await loginWithGoogle(response.credential);
      navigate('/app/dashboard');
    } catch {
      setAttempt(a => a + 1);
      setError('backend');
    } finally {
      setGoogleLoading(false);
    }
  }

  function handleDemo(role: Role) {
    loginAsDemo(role);
    // Pass the demo user's name so demo data is personalized to them
    const demoUser = useAuthStore.getState().user;
    loadDemo(demoUser?.name, demoUser?.id);
    navigate('/app/dashboard');
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-navy-800 p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: `linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px)`, backgroundSize: '48px 48px' }}
        />
        <div className="absolute top-20 left-20 w-64 h-64 bg-teal-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-48 h-48 bg-teal-400/10 rounded-full blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <span className="text-white text-2xl font-bold tracking-tight">Vyasa</span>
          </div>
          <h1 className="text-4xl font-bold text-white leading-snug mb-4">
            India's Clinical<br />
            <span className="text-teal-400">Healthcare OS</span>
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed max-w-sm">
            Full HMIS + prescription platform + hospital marketplace — one integrated system for doctors, nurses, and hospitals.
          </p>
        </div>

        <div className="relative space-y-5">
          {[
            { icon: '🩺', title: 'Multi-specialty Rx', desc: 'Write, print & WhatsApp prescriptions' },
            { icon: '🏥', title: 'Hospital Marketplace', desc: 'Book beds & infrastructure like Airbnb' },
            { icon: '⚡', title: 'Real-time HMIS', desc: 'Live vitals, orders, nurse-doctor chat' },
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

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-md py-6">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-9 h-9 rounded-xl bg-teal-500 flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <span className="text-navy-800 text-xl font-bold">Vyasa Health OS</span>
          </div>

          {/* Registration success banner */}
          {justRegistered && (
            <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-emerald-800">Registration submitted!</div>
                <div className="text-xs text-emerald-700 mt-0.5">
                  Your account is under review. You'll receive an email with login credentials once approved — usually within a few hours. Meanwhile, explore using demo mode below.
                </div>
              </div>
            </div>
          )}

          <div className="card p-8 shadow-xl">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Sign in</h2>
            <p className="text-sm text-slate-500 mb-6">Access the clinical workspace</p>

            {/* Portal toggle */}
            <div className="flex rounded-lg overflow-hidden border border-slate-200 mb-6">
              <button onClick={() => setPortal('staff')}
                className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors',
                  portal === 'staff' ? 'bg-navy-800 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
                )}>
                <Building2 className="w-4 h-4" /> Hospital Staff
              </button>
              <button onClick={() => setPortal('patient')}
                className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors',
                  portal === 'patient' ? 'bg-navy-800 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
                )}>
                <User className="w-4 h-4" /> Patient
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="label">Username or Email</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                  placeholder="staff@hospital.com" className="input" required autoComplete="username" />
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" className="input pr-10" required autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error block */}
              {error === 'backend' && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <WifiOff className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span className="text-sm font-semibold text-amber-800">Couldn't connect to server</span>
                  </div>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    The backend server is hosted on Render's free tier — it sleeps after inactivity and takes <strong>30–60 seconds</strong> to wake up on first login. Try again in a moment.
                  </p>
                  {attempt >= 2 && (
                    <p className="text-xs text-amber-700">
                      Still failing? Your account may still be <strong>pending approval</strong> if you just registered. Use demo mode below to explore the full app now.
                    </p>
                  )}
                  <button type="button" onClick={handleLogin as any}
                    className="btn-secondary btn-sm w-full mt-1">
                    <Loader2 className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
                    {loading ? 'Retrying…' : 'Retry login'}
                  </button>
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400 font-medium">or continue with</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Google login */}
            <div className={cn('flex justify-center', googleLoading && 'opacity-60 pointer-events-none')}>
              {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError('backend')}
                  theme="outline"
                  size="large"
                  shape="rectangular"
                  text="signin_with"
                  width="368"
                />
              ) : (
                <div className="w-full border border-dashed border-slate-200 rounded-lg py-3 px-4 text-center">
                  <p className="text-xs text-slate-400">
                    Google Sign-In not configured —{' '}
                    <span className="text-teal-600 font-medium">add VITE_GOOGLE_CLIENT_ID to .env</span>
                  </p>
                </div>
              )}
            </div>

            {/* Info note */}
            <div className="flex items-start gap-2 mt-4 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
              <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-500 leading-relaxed">
                Just registered? Your account requires admin approval before it's activated. You'll get an email once approved.
              </p>
            </div>

            {/* Demo section */}
            <div className="mt-5 pt-5 border-t border-slate-200">
              <button onClick={() => setShowDemo(v => !v)}
                className="w-full text-center text-sm text-teal-600 hover:text-teal-700 font-semibold">
                {showDemo ? 'Hide demo ↑' : '🚀 Explore without an account — demo mode ↓'}
              </button>

              {showDemo && (
                <>
                  <p className="text-xs text-slate-400 text-center mt-2 mb-3">
                    Full app with sample patient data. No sign-in needed.
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {DEMO_ROLES.map(({ role, label, emoji }) => (
                      <button key={role} onClick={() => handleDemo(role)}
                        className="flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 border-slate-200 bg-white hover:border-teal-400 hover:bg-teal-50 active:scale-95 transition-all cursor-pointer">
                        <span className="text-xl">{emoji}</span>
                        <span className="text-[10px] font-semibold text-slate-600">{label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Create account */}
          <div className="mt-4 card p-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-slate-800">New to Vyasa?</div>
              <div className="text-xs text-slate-500">Register as a doctor or hospital</div>
            </div>
            <Link to="/register" className="btn-secondary flex-shrink-0">
              <UserPlus className="w-4 h-4" />
              Create Account
            </Link>
          </div>

          <p className="text-center text-xs text-slate-400 mt-5">
            Vyasa Health Technologies Pvt. Ltd. · All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
}
