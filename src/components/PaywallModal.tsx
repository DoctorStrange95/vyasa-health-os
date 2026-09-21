import { useEffect, useRef, useState } from 'react';
import {
  X, CheckCircle2, Zap, Shield, Smartphone, Users, FileText,
  Activity, FlaskConical, MessageCircle, Lock, Star,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

// ─── Razorpay types ───────────────────────────────────────────────────────────
declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}
interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  image?: string;
  prefill?: { name?: string; email?: string };
  theme?: { color?: string };
  handler: (response: { razorpay_payment_id: string }) => void;
  modal?: { ondismiss?: () => void };
}
interface RazorpayInstance { open(): void; }

const FEATURES = [
  { icon: FileText,      label: 'Smart prescription builder',   sub: 'Drug autocomplete, favourites, ready-mix' },
  { icon: Users,         label: 'Unlimited patients & staff',   sub: 'OPD, IPD, nurses, receptionists — all roles' },
  { icon: Activity,      label: 'Live vitals & IPD rounds',     sub: 'Nurse-recorded vitals sync in real time' },
  { icon: Smartphone,    label: 'Works on any device',          sub: 'Phone, tablet, desktop — fully synced' },
  { icon: FlaskConical,  label: 'Lab orders & results',         sub: 'Order tests, track results, flag criticals' },
  { icon: MessageCircle, label: 'WhatsApp PDF sharing',         sub: 'Send prescriptions directly to patients' },
  { icon: Shield,        label: 'HIPAA-style security',         sub: 'End-to-end encrypted, enterprise cloud' },
  { icon: Zap,           label: 'OPD queue & appointments',     sub: 'Token mgmt, online bookings, scheduling' },
];

interface Props {
  onClose?: () => void;
}

export function PaywallModal({ onClose }: Props) {
  const { user, setSubscriptionPaid } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const scriptLoaded = useRef(false);

  useEffect(() => {
    if (scriptLoaded.current || document.getElementById('razorpay-sdk')) return;
    scriptLoaded.current = true;
    const s = document.createElement('script');
    s.id = 'razorpay-sdk';
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    document.head.appendChild(s);
  }, []);

  function openRazorpay() {
    if (!window.Razorpay) {
      setError('Payment gateway is loading, please try again in a moment.');
      return;
    }
    setLoading(true);
    setError('');
    const rzp = new window.Razorpay({
      key: 'rzp_test_Td6PjTDt1lP7Pd',
      amount: 99900,
      currency: 'INR',
      name: 'Vyasa Health OS',
      description: 'Monthly Subscription — ₹999/month',
      image: `${window.location.origin}/logos/vyasa-logo.svg`,
      prefill: { name: user?.name ?? '', email: user?.email ?? '' },
      theme: { color: '#0d9488' },
      handler: (response) => {
        setSubscriptionPaid(response.razorpay_payment_id);
        setLoading(false);
      },
      modal: { ondismiss: () => setLoading(false) },
    });
    rzp.open();
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
              <img src="/logos/vyasa-logo.svg" alt="Vyasa" className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-base leading-tight">Vyasa Pro</div>
              <div className="text-xs text-slate-400">Full access to all features</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="text-xs font-bold text-amber-700">₹999<span className="font-medium text-amber-600">/mo</span></span>
            </div>
            {onClose && (
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* ── Body (scrollable) ── */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* What's included label */}
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">What's included</p>

          {/* Feature grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {FEATURES.map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex items-start gap-3 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-3.5 h-3.5 text-teal-600" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-800 leading-tight">{label}</div>
                  <div className="text-xs text-slate-500 mt-0.5 leading-snug">{sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap gap-2 pt-1">
            {['Cancel anytime', 'Instant activation', 'Secure payment', 'No setup fees'].map(b => (
              <div key={b} className="flex items-center gap-1.5 text-xs font-medium text-teal-700 bg-teal-50 rounded-full px-3 py-1 border border-teal-100">
                <CheckCircle2 className="w-3 h-3 text-teal-500" />
                {b}
              </div>
            ))}
          </div>
        </div>

        {/* ── Footer CTA ── */}
        <div className="px-5 pb-6 pt-3 border-t border-slate-100 flex-shrink-0 space-y-2">
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 text-xs text-red-600 font-medium">
              {error}
            </div>
          )}
          <button
            onClick={openRazorpay}
            disabled={loading}
            className="btn-primary w-full py-3 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Lock className="w-4 h-4" />
            {loading ? 'Opening payment…' : 'Subscribe for ₹999/month'}
          </button>
          <p className="text-center text-xs text-slate-400">
            Powered by <strong className="text-slate-500">Razorpay</strong> · 256-bit SSL · Auto-renews monthly
          </p>
        </div>

      </div>
    </div>
  );
}
