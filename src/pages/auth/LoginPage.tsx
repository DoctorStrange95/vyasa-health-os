import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Stethoscope, Eye, EyeOff, Loader2, User, UserPlus, CheckCircle2, Info, WifiOff, Clock, ShieldCheck, X } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
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
  const [slowStart, setSlowStart] = useState(false);
  const [error, setError] = useState('');
  const [showDemo, setShowDemo] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // Google new-user registration flow
  const [googleNewUser, setGoogleNewUser] = useState<{ email: string; name: string } | null>(null);
  const [gRegForm, setGRegForm] = useState({ name: '', specialty: '', degrees: '', phone: '', licenseNumber: '' });

  const { login, loginWithGoogle, completeGoogleRegister, loginAsDemo } = useAuthStore();
  const { loadDemo } = useAppStore();
  const navigate = useNavigate();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [geoPos, setGeoPos] = useState<{ lat: number; lng: number } | null>(null);

  // Silently request GPS on mount so it's ready when the doctor logs in
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => setGeoPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}, // denied or unavailable — silent fail
      { timeout: 8000, maximumAge: 300000 },
    );
  }, []);

  const googleLogin = useGoogleLogin({
    flow: 'implicit',
    onSuccess: (tokenResponse) => handleGoogleAccessToken(tokenResponse.access_token),
    onError: () => setError('Google sign-in failed. Try again.'),
    onNonOAuthError: (err) => setError(err.type === 'popup_closed' ? 'Sign-in window was closed.' : 'Google sign-in popup was blocked — please allow popups for this site.'),
  });

  // After login, check if pending approval
  function afterLogin() {
    const status = useAuthStore.getState().approvalStatus;
    if (status === 'pending') {
      navigate('/pending-approval');
    } else {
      navigate('/app/dashboard');
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSlowStart(false);
    setLoading(true);
    // After 6 seconds, show "server waking up" hint
    const wakeTimer = setTimeout(() => setSlowStart(true), 6000);
    try {
      await login(username, password, geoPos ?? undefined);
      afterLogin();
    } catch (err) {
      setAttempt(a => a + 1);
      setError(err instanceof Error ? err.message : 'backend');
    } finally {
      clearTimeout(wakeTimer);
      setSlowStart(false);
      setLoading(false);
    }
  }

  async function handleGoogleAccessToken(accessToken: string) {
    setGoogleLoading(true);
    setError('');
    const tryLogin = async () => loginWithGoogle(accessToken, geoPos ?? undefined);
    try {
      let result;
      try {
        result = await tryLogin();
      } catch (firstErr) {
        if (firstErr instanceof Error && firstErr.message === 'Failed to fetch') {
          await new Promise(r => setTimeout(r, 5000));
          result = await tryLogin();
        } else {
          throw firstErr;
        }
      }
      if (result.isNewUser) {
        setGoogleNewUser({ email: result.googleEmail, name: result.googleName });
        setGRegForm(f => ({ ...f, name: result.googleName }));
      } else {
        afterLogin();
      }
    } catch (err) {
      setAttempt(a => a + 1);
      setError(err instanceof Error ? err.message : 'backend');
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleGoogleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!googleNewUser) return;
    setLoading(true);
    try {
      await completeGoogleRegister({ ...gRegForm, email: googleNewUser.email });
      afterLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
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
                <Stethoscope className="w-4 h-4" /> Doctor Login
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
                  placeholder="doctor@clinic.com" className="input" required autoComplete="username" />
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
              {error && error !== 'backend' && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 space-y-1">
                  <p className="text-sm text-red-600 font-medium">{error}</p>
                  {(error.toLowerCase().includes('email') || error.toLowerCase().includes('password') || error.toLowerCase().includes('invalid')) && (
                    <p className="text-xs text-red-500">No account yet? Use <strong>demo mode</strong> below to explore, or <strong>Create Account</strong> to register.</p>
                  )}
                </div>
              )}

              {slowStart && (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin flex-shrink-0" />
                  <p className="text-xs text-blue-700">Server is waking up — this can take up to 60 seconds on first login.</p>
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
            <button
              type="button"
              onClick={() => { setError(''); googleLogin(); }}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 border border-slate-300 rounded-lg py-2.5 px-4 bg-white hover:bg-slate-50 active:bg-slate-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed font-medium text-slate-700 text-sm"
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/><path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/><path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18z"/><path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.31z"/></svg>
              )}
              {googleLoading ? 'Continuing with Google…' : 'Sign in / Sign up with Google'}
            </button>

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
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {DEMO_ROLES.map(({ role, label, emoji }) => (
                      <button key={role} onClick={() => handleDemo(role)}
                        className="flex flex-col items-center gap-1 p-3 rounded-xl border-2 border-slate-200 bg-white hover:border-teal-400 hover:bg-teal-50 active:scale-95 transition-all cursor-pointer min-h-[72px] justify-center">
                        <span className="text-2xl">{emoji}</span>
                        <span className="text-[10px] font-semibold text-slate-600 text-center leading-tight">{label}</span>
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

      {/* ── Google New-User Registration Modal ── */}
      {googleNewUser && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900">Complete your profile</h3>
                <p className="text-xs text-slate-500 mt-0.5">Signing in as <span className="font-semibold">{googleNewUser.email}</span></p>
              </div>
              <button onClick={() => setGoogleNewUser(null)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleGoogleRegister} className="p-6 space-y-4">
              <div>
                <label className="label">Full Name *</label>
                <input type="text" value={gRegForm.name} onChange={e => setGRegForm(f => ({ ...f, name: e.target.value }))}
                  className="input" required placeholder="Dr. John Smith" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Specialty</label>
                  <input type="text" value={gRegForm.specialty} onChange={e => setGRegForm(f => ({ ...f, specialty: e.target.value }))}
                    className="input" placeholder="General Medicine" />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input type="tel" value={gRegForm.phone} onChange={e => setGRegForm(f => ({ ...f, phone: e.target.value }))}
                    className="input" placeholder="+91 98765 43210" />
                </div>
              </div>
              <div>
                <label className="label">Degrees / Qualifications</label>
                <input type="text" value={gRegForm.degrees} onChange={e => setGRegForm(f => ({ ...f, degrees: e.target.value }))}
                  className="input" placeholder="MBBS, MD" />
              </div>
              <div>
                <label className="label">MCI / State Council License Number *</label>
                <input type="text" value={gRegForm.licenseNumber} onChange={e => setGRegForm(f => ({ ...f, licenseNumber: e.target.value }))}
                  className="input" required placeholder="MH-12345" />
                <p className="text-[11px] text-slate-400 mt-1">Required for prescription access. Verified by our team within a few hours.</p>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                {loading ? 'Submitting…' : 'Submit for Approval'}
              </button>
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">After submitting, our team will verify your license number. Full access is granted after approval — usually within a few hours.</p>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
