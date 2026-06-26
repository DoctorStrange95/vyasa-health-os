// ─── SuperAdmin: user feedback ── shows submissions by name, resolve issues ──
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Star, CheckCircle2, RotateCcw, MessageSquare, RefreshCw, X } from 'lucide-react';

interface Feedback {
  id: number;
  user_id: number;
  user_name: string;
  user_role: string;
  clinic_id: string;
  rating: number | null;
  category: string | null;
  message: string;
  screenshot: string | null;
  status: string;
  resolved_at: string | null;
  created_at: string;
}

const fmt = (t?: string | null) => (t ? new Date(t).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
const ROLE_COLOR: Record<string, string> = {
  doctor: 'bg-teal-100 text-teal-700', clinic_admin: 'bg-indigo-100 text-indigo-700',
  nurse: 'bg-rose-100 text-rose-700', pharmacist: 'bg-amber-100 text-amber-700',
  labtech: 'bg-violet-100 text-violet-700', receptionist: 'bg-sky-100 text-sky-700',
};
const CAT_COLOR: Record<string, string> = {
  Bug: 'bg-rose-50 text-rose-600 border-rose-200',
  Suggestion: 'bg-teal-50 text-teal-600 border-teal-200',
  Praise: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  Other: 'bg-slate-50 text-slate-500 border-slate-200',
};

export function FeedbackTab() {
  const [rows, setRows] = useState<Feedback[]>([]);
  const [filter, setFilter] = useState<'open' | 'resolved' | 'all'>('open');
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const q = filter === 'all' ? '' : `?status=${filter}`;
    api.get<Feedback[]>(`/admin/feedback${q}`).then(setRows).catch(() => setRows([])).finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function setStatus(id: number, status: 'resolved' | 'open') {
    setRows(rs => rs.map(r => r.id === id ? { ...r, status } : r));
    try { await api.patch(`/admin/feedback/${id}`, { status }); } catch { load(); }
    if (filter !== 'all') setRows(rs => rs.filter(r => r.status === filter));
  }

  const openCount = rows.filter(r => r.status === 'open').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><MessageSquare className="w-5 h-5 text-teal-500" /> User Feedback</h2>
          <p className="text-xs text-slate-400">What your users are saying — ratings, ideas, and bugs to fix.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {(['open', 'resolved', 'all'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={cn('px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all',
                  filter === f ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700')}>
                {f}{f === 'open' && openCount > 0 ? ` (${openCount})` : ''}
              </button>
            ))}
          </div>
          <button onClick={load} className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:border-slate-300">
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {rows.length === 0 && !loading && (
        <div className="card p-12 text-center text-slate-400">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          No {filter !== 'all' ? filter : ''} feedback yet.
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {rows.map(f => (
          <div key={f.id} className={cn('card p-4 space-y-3', f.status === 'resolved' && 'opacity-70')}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">{f.user_name || `User ${f.user_id}`}</span>
                  <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded uppercase', ROLE_COLOR[f.user_role] ?? 'bg-slate-100 text-slate-600')}>{f.user_role || '—'}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">{fmt(f.created_at)}{f.clinic_id ? ` · ${f.clinic_id}` : ''}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {f.category && <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', CAT_COLOR[f.category] ?? CAT_COLOR.Other)}>{f.category}</span>}
                {f.status === 'resolved' && <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" /> Resolved</span>}
              </div>
            </div>

            {f.rating ? (
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map(n => (
                  <Star key={n} className={cn('w-4 h-4', n <= (f.rating ?? 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-200')} />
                ))}
              </div>
            ) : null}

            {f.message && <p className="text-sm text-slate-700 whitespace-pre-wrap">{f.message}</p>}

            {f.screenshot && (
              <img src={f.screenshot} alt="screenshot" onClick={() => setZoom(f.screenshot)}
                className="max-h-40 rounded-lg border border-slate-200 cursor-zoom-in" />
            )}

            <div className="flex justify-end pt-1">
              {f.status === 'open' ? (
                <button onClick={() => setStatus(f.id, 'resolved')}
                  className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 hover:bg-emerald-100">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Mark resolved
                </button>
              ) : (
                <button onClick={() => setStatus(f.id, 'open')}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-100">
                  <RotateCcw className="w-3.5 h-3.5" /> Reopen
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {zoom && (
        <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-6" onClick={() => setZoom(null)}>
          <button className="absolute top-4 right-4 text-white"><X className="w-6 h-6" /></button>
          <img src={zoom} alt="screenshot" className="max-h-[90vh] max-w-full rounded-lg" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
