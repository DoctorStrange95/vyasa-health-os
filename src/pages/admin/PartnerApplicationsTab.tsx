import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Building2, CheckCircle2, Clock, Mail, MapPin, Phone, RefreshCw, XCircle } from 'lucide-react';

type Status = 'new' | 'reviewing' | 'approved' | 'rejected';

interface PartnerApplication {
  id: number;
  partner_type: 'lab' | 'pharmacy';
  organisation: string;
  contact_name: string;
  email: string;
  phone: string;
  location: string;
  note: string;
  status: Status;
  reviewer_note: string;
  created_at: string;
}

const statusStyle: Record<Status, string> = {
  new: 'bg-amber-50 text-amber-700 border-amber-200',
  reviewing: 'bg-sky-50 text-sky-700 border-sky-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
};

export function PartnerApplicationsTab() {
  const [rows, setRows] = useState<PartnerApplication[]>([]);
  const [filter, setFilter] = useState<Status | 'all'>('new');
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<number, string>>({});

  const load = useCallback(() => {
    setLoading(true);
    const query = filter === 'all' ? '' : `?status=${filter}`;
    api.get<PartnerApplication[]>(`/admin/partner-applications${query}`)
      .then(items => { setRows(items); setNotes(Object.fromEntries(items.map(item => [item.id, item.reviewer_note || '']))); })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function update(id: number, status: Status) {
    const reviewerNote = notes[id] || '';
    try {
      await api.patch(`/admin/partner-applications/${id}`, { status, reviewerNote });
      if (filter === 'all' || filter === status) setRows(items => items.map(item => item.id === id ? { ...item, status, reviewer_note: reviewerNote } : item));
      else setRows(items => items.filter(item => item.id !== id));
    } catch { load(); }
  }

  return <div className="space-y-4">
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div><h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Building2 className="w-5 h-5 text-teal-500" /> Partner applications</h2><p className="text-xs text-slate-400">Laboratory and pharmacy interest forms submitted from vyasaa.com.</p></div>
      <div className="flex items-center gap-2"><div className="flex gap-1 bg-slate-100 rounded-xl p-1">{(['new', 'reviewing', 'approved', 'rejected', 'all'] as const).map(item => <button key={item} onClick={() => setFilter(item)} className={cn('px-3 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all', filter === item ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700')}>{item}</button>)}</div><button onClick={load} className="p-2 rounded-lg border border-slate-200 text-slate-500"><RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} /></button></div>
    </div>
    {!loading && rows.length === 0 && <div className="card p-12 text-center text-slate-400"><Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />No {filter === 'all' ? '' : filter} partner applications.</div>}
    <div className="grid gap-3 md:grid-cols-2">{rows.map(item => <article key={item.id} className="card p-4 space-y-3"><div className="flex items-start justify-between gap-2"><div><div className="font-bold text-slate-800">{item.organisation}</div><div className="text-sm text-slate-500">{item.contact_name}</div></div><span className={cn('text-[10px] font-bold uppercase px-2 py-1 rounded-full border', statusStyle[item.status])}>{item.status}</span></div><div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500"><span className="font-semibold capitalize text-slate-700">{item.partner_type}</span><span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{item.email}</span><span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{item.phone}</span><span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{item.location}</span></div>{item.note && <p className="text-sm text-slate-700 whitespace-pre-wrap">{item.note}</p>}<textarea value={notes[item.id] ?? ''} onChange={e => setNotes(current => ({ ...current, [item.id]: e.target.value }))} placeholder="Private review note (optional)" rows={2} className="input w-full text-sm" /><div className="flex flex-wrap gap-2 justify-end"><button onClick={() => update(item.id, 'reviewing')} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-sky-200 text-sky-700 bg-sky-50"><Clock className="w-3.5 h-3.5 inline mr-1" />Review</button><button onClick={() => update(item.id, 'approved')} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 bg-emerald-50"><CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />Approve</button><button onClick={() => update(item.id, 'rejected')} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 bg-rose-50"><XCircle className="w-3.5 h-3.5 inline mr-1" />Reject</button></div></article>)}</div>
  </div>;
}
