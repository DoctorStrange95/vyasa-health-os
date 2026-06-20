import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export function PWAUpdateBanner() {
  const { needRefresh, updateServiceWorker } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [updating, setUpdating] = useState(false);

  if (!needRefresh || dismissed) return null;

  async function handleUpdate() {
    setUpdating(true);
    await updateServiceWorker(true);
    // Page reloads automatically after SW activates — if not, force it
    setTimeout(() => window.location.reload(), 1500);
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-sm">
      <div className="bg-[#060d1a] text-white rounded-2xl shadow-2xl px-4 py-4 border border-white/10">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <RefreshCw className={`w-4 h-4 text-teal-400 ${updating ? 'animate-spin' : ''}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight">New version available</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {updating ? 'Updating… page will reload shortly' : 'Update now to get the latest features and fixes'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleUpdate}
            disabled={updating}
            className="flex-1 bg-teal-500 hover:bg-teal-400 disabled:opacity-60 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors"
          >
            {updating ? 'Updating…' : 'Update Now'}
          </button>
          <button
            onClick={() => setDismissed(true)}
            disabled={updating}
            className="flex-1 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
