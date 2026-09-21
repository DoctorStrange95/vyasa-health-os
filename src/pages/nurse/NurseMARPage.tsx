import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { emitChatMessage } from '@/lib/socket';
import { Pill, CheckCircle2, ChevronRight, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Patient } from '@/types';

// Medication Administration Record — nurse sees the doctor's active meds per
// patient and taps "Given". That logs to the care-team chat (real-time to the
// doctor) so administration is visible without a separate backend table.
export default function NurseMARPage() {
  const { patients, prescriptions, showToast } = useAppStore();
  const [posting, setPosting] = useState<string>('');
  const [given, setGiven] = useState<Record<string, string>>({}); // medId -> time given (this session)

  useEffect(() => {
    import('@/lib/api').then(({ isApiEnabled, api }) => {
      if (isApiEnabled()) api.get<{ department?: string }>('/auth/me').then(me => setPosting(me.department || '')).catch(() => {});
    });
  }, []);

  const isIpd = (p: Patient) => p.status === 'IPD' || p.status === 'Critical';
  const inPosting = (p: Patient) => {
    if (posting === 'OPD') return p.status === 'OPD';
    if (posting === 'IPD') return isIpd(p);
    return true;
  };
  const mine = patients.filter(inPosting);

  function markGiven(p: Patient, med: { id: string; drug: string; dose?: string }) {
    const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    setGiven(g => ({ ...g, [med.id]: time }));
    emitChatMessage(p.id, `💊 Administered ${med.drug}${med.dose ? ` ${med.dose}` : ''}`);
    showToast(`Marked ${med.drug} given`, 'success');
  }

  const withMeds = mine
    .map(p => ({ p, meds: (prescriptions[p.id] ?? []).filter((m: { status?: string }) => (m.status ?? 'active') === 'active') }))
    .filter(x => x.meds.length > 0);

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-teal-600" /> Medication MAR
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Tap a medicine to record it as administered</p>
      </div>

      {withMeds.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-14 text-center">
          <Pill className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No active medications for your patients</p>
        </div>
      ) : (
        <div className="space-y-4">
          {withMeds.map(({ p, meds }) => (
            <div key={p.id} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-slate-900 truncate">{p.name}</span>
                  <span className="text-xs text-slate-400">{p.age}Y/{p.gender}</span>
                  {p.ward && <span className="text-xs text-slate-400">· {p.ward}{p.bed ? ` ${p.bed}` : ''}</span>}
                </div>
                <Link to={`/app/patients/${p.id}`} className="text-xs text-teal-600 font-semibold flex items-center gap-0.5 flex-shrink-0">
                  View <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y divide-slate-50">
                {meds.map((m: { id: string; drug: string; dose?: string; frequency?: string; route?: string }) => {
                  const at = given[m.id];
                  return (
                    <div key={m.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                          <Pill className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> {m.drug}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {[m.dose, m.route, m.frequency].filter(Boolean).join(' · ') || '—'}
                        </div>
                      </div>
                      {at ? (
                        <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 flex-shrink-0">
                          <CheckCircle2 className="w-4 h-4" /> Given {at}
                        </span>
                      ) : (
                        <button
                          onClick={() => markGiven(p, m)}
                          className={cn('btn-primary btn-sm flex items-center gap-1 flex-shrink-0')}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Given
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
