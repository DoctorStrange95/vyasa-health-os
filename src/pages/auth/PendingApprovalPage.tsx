import { Clock, Stethoscope, LogOut, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { api } from '@/lib/api';

export default function PendingApprovalPage() {
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  async function checkStatus() {
    setChecking(true);
    try {
      const data = await api.get<{ approvalStatus: string }>('/auth/me');
      if (data.approvalStatus === 'approved') {
        useAuthStore.setState({ approvalStatus: 'approved' });
        navigate('/app/dashboard');
      } else {
        alert('Still pending. Our team will notify you by email once approved.');
      }
    } catch {
      alert('Could not check status. Please try again later.');
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
          <span className="text-navy-800 text-xl font-bold">Vyasa Health OS</span>
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
              <span className="text-teal-500 font-bold mt-0.5">✓</span>
              <span className="text-slate-600">Account created and email registered</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-amber-500 font-bold mt-0.5">⏳</span>
              <span className="text-slate-600">License number submitted for verification</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-slate-300 font-bold mt-0.5">○</span>
              <span className="text-slate-400">Full access to clinical workspace</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button onClick={checkStatus} disabled={checking} className="btn-primary w-full py-3">
              {checking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {checking ? 'Checking…' : 'Check Approval Status'}
            </button>
            <button onClick={() => { logout(); navigate('/login'); }} className="btn-secondary w-full py-3">
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>

          <p className="text-xs text-slate-400 mt-4">
            Questions? Contact us at <a href="mailto:support@vyasa.health" className="text-teal-600 underline">support@vyasa.health</a>
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
