import { useState } from 'react';
import { Shield } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

export function ConsentModal() {
  const { consentGivenAt, approvalStatus, isDemo, recordConsent } = useAuthStore();
  const [accepting, setAccepting] = useState(false);

  // Show only when: logged in, approved, and consent not yet recorded
  if (isDemo || approvalStatus !== 'approved' || consentGivenAt) return null;

  async function handleAccept() {
    setAccepting(true);
    await recordConsent();
    setAccepting(false);
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-lg">Terms & Privacy</h2>
            <p className="text-xs text-slate-400">Vyasa Integrated Healthcare Pvt. Ltd.</p>
          </div>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed">
          Before you continue, please review and accept our updated policies. By using Vyasa Health OS,
          you agree that patient data you create is managed responsibly in accordance with Indian healthcare law.
        </p>

        <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
          <a
            href="https://vyasaa.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between text-teal-600 hover:text-teal-700 font-medium"
          >
            Privacy Policy <span className="text-xs">↗</span>
          </a>
          <div className="border-t border-slate-200" />
          <a
            href="https://vyasaa.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between text-teal-600 hover:text-teal-700 font-medium"
          >
            Terms of Service <span className="text-xs">↗</span>
          </a>
          <div className="border-t border-slate-200" />
          <a
            href="https://vyasaa.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between text-teal-600 hover:text-teal-700 font-medium"
          >
            Cookie Policy <span className="text-xs">↗</span>
          </a>
        </div>

        <p className="text-xs text-slate-400">
          Your acceptance is recorded with a timestamp and linked to your account. You can review
          these policies anytime in <strong>Settings → Legal</strong>.
        </p>

        <button
          onClick={handleAccept}
          disabled={accepting}
          className="btn-primary w-full py-3 text-base font-semibold"
        >
          {accepting ? 'Saving…' : 'I Accept — Continue to Dashboard'}
        </button>
      </div>
    </div>
  );
}
