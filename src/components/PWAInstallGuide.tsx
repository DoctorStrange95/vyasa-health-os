import { useState } from 'react';
import { Download, Smartphone, Monitor, RefreshCw, CheckCircle2, Share, MoreVertical, PlusSquare } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { cn } from '@/lib/utils';

type Platform = 'android' | 'ios' | 'desktop';

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'desktop';
}

const STEPS: Record<Platform, { icon: React.ReactNode; title: string; desc: string }[]> = {
  android: [
    { icon: <MoreVertical className="w-5 h-5" />, title: 'Open browser menu', desc: 'Tap the ⋮ (three-dot) menu in Chrome' },
    { icon: <Download className="w-5 h-5" />, title: 'Tap "Add to Home screen"', desc: 'Or "Install app" — same thing' },
    { icon: <CheckCircle2 className="w-5 h-5" />, title: 'Confirm install', desc: 'Tap "Install" in the dialog' },
    { icon: <Smartphone className="w-5 h-5" />, title: 'Open from Home screen', desc: 'Vyasa appears as a full app — no browser bar' },
  ],
  ios: [
    { icon: <Share className="w-5 h-5" />, title: 'Tap Share button', desc: 'The box-with-arrow icon at the bottom of Safari' },
    { icon: <PlusSquare className="w-5 h-5" />, title: '"Add to Home Screen"', desc: 'Scroll down in the share sheet and tap it' },
    { icon: <CheckCircle2 className="w-5 h-5" />, title: 'Tap "Add"', desc: 'Confirm in the top-right corner' },
    { icon: <Smartphone className="w-5 h-5" />, title: 'Open from Home screen', desc: 'Vyasa launches in full-screen mode like a native app' },
  ],
  desktop: [
    { icon: <Download className="w-5 h-5" />, title: 'Click install icon', desc: 'Look for the install icon (⊕) in the address bar in Chrome/Edge' },
    { icon: <CheckCircle2 className="w-5 h-5" />, title: 'Click "Install"', desc: 'In the dialog that appears' },
    { icon: <Monitor className="w-5 h-5" />, title: 'Open as desktop app', desc: 'Vyasa opens in its own window — no browser UI' },
  ],
};

const PLATFORM_LABELS: Record<Platform, string> = {
  android: 'Android',
  ios: 'iPhone / iPad',
  desktop: 'Desktop (Chrome / Edge)',
};

export function PWAInstallGuide({ compact = false }: { compact?: boolean }) {
  const { canInstall, isInstalled, triggerInstall, needRefresh, updateServiceWorker } = usePWAInstall();
  const [platform, setPlatform] = useState<Platform>(detectPlatform());

  const steps = STEPS[platform];

  // Compact mode: slim banner for Settings page
  if (compact) {
    if (isInstalled) return (
      <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 mt-2">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
        <span className="text-sm font-medium text-emerald-800">Vyasa is installed on this device</span>
        {needRefresh && (
          <button onClick={() => updateServiceWorker(true)} className="ml-auto btn-primary btn-sm whitespace-nowrap">
            Update now
          </button>
        )}
      </div>
    );
    return (
      <div
        className="flex items-center gap-4 rounded-2xl px-5 py-4 mt-2"
        style={{ background: 'linear-gradient(135deg,#0a1628 0%,#0e7490 100%)' }}
      >
        <img src="/logo.svg" alt="Vyasa" className="w-10 h-10 rounded-xl flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-white text-sm">Install Vyasa as an app</div>
          <div className="text-xs text-white/60 mt-0.5">Works offline · Opens instantly · Full screen</div>
        </div>
        {canInstall ? (
          <button
            onClick={triggerInstall}
            className="flex items-center gap-1.5 bg-white text-slate-900 font-bold text-xs px-4 py-2 rounded-xl hover:bg-white/90 active:scale-95 transition-all cursor-pointer flex-shrink-0"
          >
            <Download className="w-3.5 h-3.5" /> Install
          </button>
        ) : (
          <span className="text-xs text-white/50 flex-shrink-0">Profile → Install tab for guide</span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Update banner */}
      {needRefresh && (
        <div className="flex items-center justify-between gap-3 bg-teal-50 border border-teal-200 rounded-2xl px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-teal-800">
            <RefreshCw className="w-4 h-4 flex-shrink-0" />
            <span>A new version of Vyasa is ready.</span>
          </div>
          <button
            onClick={() => updateServiceWorker(true)}
            className="btn-primary btn-sm whitespace-nowrap"
          >
            Update now
          </button>
        </div>
      )}

      {/* Already installed */}
      {isInstalled ? (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-4">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
          <div>
            <div className="font-semibold text-emerald-800 text-sm">Vyasa is installed on this device</div>
            <div className="text-xs text-emerald-600 mt-0.5">You can open it directly from your home screen or app drawer.</div>
          </div>
        </div>
      ) : canInstall ? (
        /* One-tap install (Chrome/Edge Android/Desktop) */
        <div
          className="rounded-2xl p-5 text-white"
          style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0e7490 100%)' }}
        >
          <div className="flex items-start gap-4">
            <img src="/logo.svg" alt="Vyasa" className="w-14 h-14 rounded-2xl flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-lg leading-tight">Vyasa Health OS</div>
              <div className="text-sm text-white/70 mt-0.5">Install as an app — works offline, opens instantly</div>
              <button
                onClick={triggerInstall}
                className="mt-3 flex items-center gap-2 bg-white text-slate-900 font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-white/90 active:scale-95 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" /> Install App
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Manual guide (always show if not installed, for iOS + fallback) */}
      {!isInstalled && (
        <div className="card p-5 space-y-4">
          <div>
            <h3 className="font-bold text-slate-900">How to install on your device</h3>
            <p className="text-xs text-slate-500 mt-0.5">Once installed, Vyasa works like a native app — faster, full-screen, no browser bar.</p>
          </div>

          {/* Platform selector */}
          <div className="flex gap-2 flex-wrap">
            {(['android', 'ios', 'desktop'] as Platform[]).map(p => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer',
                  platform === p
                    ? 'bg-teal-500 text-white border-teal-500'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
                )}
              >
                {PLATFORM_LABELS[p]}
              </button>
            ))}
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {steps.map((s, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0">
                  {s.icon}
                </div>
                <div className="pt-1">
                  <div className="text-sm font-semibold text-slate-800">{i + 1}. {s.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Benefits */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: '⚡', label: 'Instant launch', desc: 'Opens in under a second from home screen' },
          { icon: '📵', label: 'Works offline', desc: 'View records and write Rx without internet' },
          { icon: '🔔', label: 'Full screen', desc: 'No browser bar — feels like a native app' },
        ].map(b => (
          <div key={b.label} className="card p-4 text-center">
            <div className="text-2xl mb-1">{b.icon}</div>
            <div className="text-sm font-bold text-slate-800">{b.label}</div>
            <div className="text-xs text-slate-500 mt-0.5">{b.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
