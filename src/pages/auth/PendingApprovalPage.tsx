import { Clock, Stethoscope, LogOut, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { api } from '@/lib/api';

export default function PendingApprovalPage() {
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [statusType, setStatusType] = useState<'info' | 'success' | 'error'>('info');

  async function checkStatus() {
    setChecking(true);
    setStatusMsg('');
    try {
      const data = await api.get<{ approvalStatus: string }>('/auth/me');
      if (data.approvalStatus === 'approved') {
        useAuthStore.setState({ approvalStatus: 'approved' });
        navigate('/app/dashboard');
      } else {
        setStatusType('info');
        setStatusMsg('Still pending. Our team will notify you by email once approved.');
      }
    } catch {
      setStatusType('error');
      setStatusMsg('Could not check status — please check your connection and try again.');
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900">Vyasa Integrated Healthcare</span>
        </div>

        <div className="card p-8 shadow-xl text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <Clock className="w-8 h-8 text-amber-500" />
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-2">Account Pending Approval</h1>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">
            Hello <span className="font-semibold text-slate-800">{user?.name ?? 'Doctor'}</span>, your account has been created successfully.
            <br /><br />
            Our team is verifying your <strong>Medical Council license number</strong>. Once approved, you'll have full access to write prescriptions and consult patients.
            This usually takes <strong>a few hours</strong> during business hours.
          </p>

          <div className="space-y-3 bg-slate-50 rounded-xl p-4 text-left text-sm mb-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
              <span className="text-slate-600">Account created and email registered</span>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <span className="text-slate-600">License number submitted for verification</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-4 h-4 rounded-full border-2 border-slate-300 flex-shrink-0 mt-0.5" />
              <span className="text-slate-400">Full access to clinical workspace</span>
            </div>
          </div>

          {/* Inline status message (replaces alert()) */}
          {statusMsg && (
            <div className={`flex items-start gap-3 rounded-xl px-4 py-3 mb-4 text-left text-sm ${
              statusType === 'error' ? 'bg-red-50 border border-red-200 text-red-700' :
              statusType === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' :
              'bg-amber-50 border border-amber-200 text-amber-700'
            }`}>
              {statusType === 'error'
                ? <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                : <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
              }
              {statusMsg}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button onClick={checkStatus} disabled={checking} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
              <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
              {checking ? 'Checking…' : 'Check Approval Status'}
            </button>
            <button onClick={() => { logout(); navigate('/login'); }} className="btn-secondary w-full py-3 flex items-center justify-center gap-2">
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>

          <p className="text-xs text-slate-400 mt-4">
            Questions? Email us at{' '}
            <a href="mailto:support@vyasaa.com" className="text-teal-600 underline">support@vyasaa.com</a>
          </p>
        </div>

        <div className="mt-5 card p-4 text-center">
          <p className="text-sm text-slate-600 mb-2">Want to explore the app now?</p>
          <button onClick={() => {
            const { loginAsDemo } = useAuthStore.getState();
            loginAsDemo('clinic_admin');
            import('@/store/useAppStore').then(({ useAppStore }) =>
              useAppStore.getState().loadDemo()
            );
            navigate('/app/dashboard');
          }} className="text-teal-600 font-semibold text-sm hover:underline">
            Try Demo Mode →
          </button>
        </div>
      </div>
    </div>
  );
}
