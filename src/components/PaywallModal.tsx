import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2, X, Zap, Shield, Smartphone, Users, FileText,
  Activity, FlaskConical, MessageCircle, Star, Lock,
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
  amount: number;         // paise
  currency: string;
  name: string;
  description: string;
  image?: string;
  order_id?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  handler: (response: { razorpay_payment_id: string; razorpay_order_id?: string; razorpay_signature?: string }) => void;
  modal?: { ondismiss?: () => void };
}
interface RazorpayInstance { open(): void; }

// ─── Features list ────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: FileText,      label: 'Smart prescription builder',    sub: 'Drug autocomplete, favourites, ready-mix bundles' },
  { icon: Users,         label: 'Unlimited patients & staff',    sub: 'OPD, IPD, nurses, receptionists — all in one place' },
  { icon: Activity,      label: 'Live vitals & IPD rounds',      sub: 'Nurse-recorded vitals appear on doctor\'s screen in real time' },
  { icon: Smartphone,    label: 'Works on any device',           sub: 'Phone, tablet, desktop — fully synced across all' },
  { icon: FlaskConical,  label: 'Lab orders & results',          sub: 'Order tests, track results, flag criticals automatically' },
  { icon: MessageCircle, label: 'WhatsApp prescription sharing', sub: 'Send PDF prescriptions directly to patients' },
  { icon: Shield,        label: 'HIPAA-style data security',     sub: 'End-to-end encrypted, hosted on enterprise cloud' },
  { icon: Zap,           label: 'OPD queue & appointments',      sub: 'Token management, online bookings, slot scheduling' },
];

interface Props {
  onClose?: () => void; // optional — modal is blocking but can be dismissed to "remind later"
}

export function PaywallModal({ onClose }: Props) {
  const { user, setSubscriptionPaid } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const scriptLoaded = useRef(false);

  // Load Razorpay script once
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
      setError('Payment gateway not loaded yet. Please wait a moment and try again.');
      return;
    }
    setLoading(true);
    setError('');

    const options: RazorpayOptions = {
      key: 'rzp_test_Td6PjTDt1lP7Pd',
      amount: 99900,          // ₹999 in paise
      currency: 'INR',
      name: 'Vyasa Health OS',
      description: 'Monthly Subscription — ₹999/month',
      image: `${window.location.origin}/logos/vyasa-logo.svg`,
      prefill: {
        name: user?.name ?? '',
        email: user?.email ?? '',
      },
      theme: { color: '#0d9488' },
      handler: (response) => {
        // Payment successful — store payment ID and timestamp
        setSubscriptionPaid(response.razorpay_payment_id);
        setLoading(false);
      },
      modal: {
        ondismiss: () => setLoading(false),
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(2, 6, 23, 0.72)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          background: '#fff', borderRadius: 24, width: '100%', maxWidth: 560,
          boxShadow: '0 32px 80px rgba(2,6,23,0.32)',
          overflow: 'hidden', position: 'relative',
          fontFamily: "'Inter', -apple-system, sans-serif",
        }}
        onClick={e => e.stopPropagation()}
      >

        {/* Dismiss link (non-blocking — just reminds later) */}
        {onClose && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 14, right: 14, zIndex: 2,
              background: 'rgba(255,255,255,0.9)', border: '1px solid #e2e8f0',
              borderRadius: 8, cursor: 'pointer', padding: '4px 6px',
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 11, color: '#94a3b8', fontWeight: 600,
            }}
            title="Remind me later"
          >
            <X size={13} />
            Later
          </button>
        )}

        {/* ── Hero gradient header ── */}
        <div style={{
          background: 'linear-gradient(135deg, #0a1628 0%, #0d4f47 50%, #0a1628 100%)',
          padding: '32px 28px 28px',
          textAlign: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* decorative circles */}
          <div style={{ position:'absolute', top:-40, right:-40, width:160, height:160, borderRadius:'50%', background:'rgba(13,148,136,0.12)' }} />
          <div style={{ position:'absolute', bottom:-30, left:-30, width:120, height:120, borderRadius:'50%', background:'rgba(13,148,136,0.08)' }} />

          <div style={{ position:'relative', zIndex:1 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:12 }}>
              <img src="/logos/vyasa-logo.svg" alt="Vyasa" style={{ width:36, height:36, borderRadius:10 }} />
              <span style={{ fontSize:20, fontWeight:800, color:'#fff', letterSpacing:-0.5 }}>Vyasa Health OS</span>
            </div>
            <div style={{
              display:'inline-flex', alignItems:'center', gap:6,
              background:'rgba(13,148,136,0.3)', border:'1px solid rgba(13,148,136,0.5)',
              borderRadius:20, padding:'4px 14px', marginBottom:16,
            }}>
              <Star size={12} fill="#fbbf24" color="#fbbf24" />
              <span style={{ fontSize:12, fontWeight:700, color:'#6ee7e7', letterSpacing:0.5 }}>FULL ACCESS</span>
            </div>
            <div style={{ fontSize:38, fontWeight:900, color:'#fff', lineHeight:1 }}>
              ₹999<span style={{ fontSize:16, fontWeight:500, color:'#94d9d9' }}>/month</span>
            </div>
            <div style={{ fontSize:13, color:'#94d9d9', marginTop:6 }}>
              Everything you need to run your practice — on any device
            </div>
          </div>
        </div>

        {/* ── Benefits grid ── */}
        <div style={{ padding:'24px 28px 0' }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#0f172a', marginBottom:14, textTransform:'uppercase', letterSpacing:0.6, opacity:0.5 }}>
            What's included
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {FEATURES.map(({ icon: Icon, label, sub }) => (
              <div key={label} style={{
                display:'flex', alignItems:'flex-start', gap:10,
                background:'#f8fafc', borderRadius:12, padding:'10px 12px',
                border:'1px solid #e2e8f0',
              }}>
                <div style={{
                  width:30, height:30, borderRadius:8,
                  background:'linear-gradient(135deg,#0d9488,#0a766e)',
                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                }}>
                  <Icon size={14} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:'#0f172a', lineHeight:1.3 }}>{label}</div>
                  <div style={{ fontSize:11, color:'#64748b', marginTop:2, lineHeight:1.35 }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Trust badges ── */}
        <div style={{ padding:'16px 28px 0', display:'flex', gap:8, flexWrap:'wrap' as const }}>
          {['Cancel anytime', 'Instant activation', 'Secure payment', 'No setup fees'].map(badge => (
            <div key={badge} style={{
              display:'flex', alignItems:'center', gap:5,
              fontSize:11, fontWeight:600, color:'#059669',
              background:'#ecfdf5', borderRadius:20, padding:'3px 10px',
              border:'1px solid #a7f3d0',
            }}>
              <CheckCircle2 size={11} />
              {badge}
            </div>
          ))}
        </div>

        {/* ── CTA ── */}
        <div style={{ padding:'20px 28px 28px' }}>
          {error && (
            <div style={{
              background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10,
              padding:'10px 14px', marginBottom:12, fontSize:12, color:'#b91c1c',
            }}>
              {error}
            </div>
          )}
          <button
            onClick={openRazorpay}
            disabled={loading}
            style={{
              width:'100%', padding:'15px 24px',
              background: loading ? '#94a3b8' : 'linear-gradient(135deg, #0d9488, #0a766e)',
              color:'#fff', border:'none', borderRadius:14, cursor: loading ? 'not-allowed' : 'pointer',
              fontSize:16, fontWeight:800, letterSpacing:-0.3,
              boxShadow: loading ? 'none' : '0 4px 20px rgba(13,148,136,0.45)',
              transition:'all 0.15s',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            }}
          >
            <Lock size={16} />
            {loading ? 'Opening payment…' : 'Subscribe for ₹999/month'}
          </button>
          <div style={{ textAlign:'center', marginTop:10, fontSize:11, color:'#94a3b8' }}>
            Powered by <strong>Razorpay</strong> · 256-bit SSL · Auto-renews monthly
          </div>
        </div>
      </div>
    </div>
  );
}
