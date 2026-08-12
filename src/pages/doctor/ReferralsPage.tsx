import { useState, useEffect, useCallback } from 'react';
import {
  ArrowRightLeft, Send, Inbox, Search, Clock, CheckCircle2,
  XCircle, AlertTriangle, Loader2, User, RefreshCw, ChevronDown,
  Stethoscope, ArrowRight, X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

/* ── Types ──────────────────────────────────────────────────────────────────── */
interface DoctorSearch {
  id: number; name: string; specialty: string;
  qualification: string; profilePhotoUrl: string; city: string; state: string;
}

interface Referral {
  id: number;
  referringDoctorId: number; referringDoctorName: string;
  referringDoctorSpecialty: string; referringDoctorPhoto: string;
  receivingDoctorId: number; receivingDoctorName: string;
  receivingDoctorSpecialty: string; receivingDoctorPhoto: string;
  patientId: string | null; patientName: string;
  patientAge: number | null; patientGender: string; patientPhone: string;
  reason: string; notes: string; clinicalInfo: string;
  urgency: 'routine' | 'urgent' | 'emergency';
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  declinedReason: string;
  createdAt: string; acceptedAt: string | null; declinedAt: string | null;
}

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'https://vyasa-os-backend.onrender.com';

const URGENCY_COLOR = {
  routine: 'bg-slate-100 text-slate-600',
  urgent: 'bg-amber-100 text-amber-700',
  emergency: 'bg-red-100 text-red-700',
};

const STATUS_CONFIG = {
  pending: { icon: Clock, color: 'bg-amber-100 text-amber-700', label: 'Pending' },
  accepted: { icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-700', label: 'Accepted' },
  declined: { icon: XCircle, color: 'bg-red-100 text-red-700', label: 'Declined' },
  cancelled: { icon: X, color: 'bg-slate-100 text-slate-500', label: 'Cancelled' },
};

function DoctorAvatar({ name, photo, size = 36 }: { name: string; photo?: string; size?: number }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  if (photo) return (
    <img src={photo} alt={name} className="rounded-full object-cover flex-shrink-0"
      style={{ width: size, height: size }} />
  );
  return (
    <div className="rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 text-teal-700 font-bold"
      style={{ width: size, height: size, fontSize: size * 0.35 }}>
      {initials}
    </div>
  );
}

/* ── Send Referral Modal ─────────────────────────────────────────────────────── */
function SendReferralModal({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const { patients } = useAppStore();
  const [doctorQuery, setDoctorQuery] = useState('');
  const [doctorResults, setDoctorResults] = useState<DoctorSearch[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorSearch | null>(null);
  const [searchingDocs, setSearchingDocs] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [form, setForm] = useState({
    patientName: '', patientAge: '', patientGender: 'M', patientPhone: '',
    reason: '', notes: '', clinicalInfo: '', urgency: 'routine' as Referral['urgency'],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Auto-fill patient fields when a patient is selected
  useEffect(() => {
    const p = patients.find(p => p.id === selectedPatientId);
    if (p) setForm(f => ({
      ...f,
      patientName: p.name,
      patientAge: String(p.age ?? ''),
      patientGender: p.gender ?? 'M',
      patientPhone: p.phone ?? '',
    }));
  }, [selectedPatientId, patients]);

  // Doctor search with debounce
  useEffect(() => {
    if (doctorQuery.length < 2) { setDoctorResults([]); return; }
    setSearchingDocs(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`${API_BASE}/public/doctors/search?q=${encodeURIComponent(doctorQuery)}`);
        const data = await r.json() as DoctorSearch[];
        setDoctorResults(data);
      } catch { setDoctorResults([]); }
      finally { setSearchingDocs(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [doctorQuery]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDoctor) { setError('Please select a receiving doctor'); return; }
    if (!form.patientName.trim() || !form.reason.trim()) {
      setError('Patient name and referral reason are required'); return;
    }
    setSubmitting(true); setError('');
    try {
      await api.post('/referrals', {
        receivingDoctorId: selectedDoctor.id,
        patientId: selectedPatientId || null,
        patientName: form.patientName.trim(),
        patientAge: form.patientAge ? Number(form.patientAge) : null,
        patientGender: form.patientGender,
        patientPhone: form.patientPhone,
        reason: form.reason.trim(),
        notes: form.notes.trim(),
        clinicalInfo: form.clinicalInfo.trim(),
        urgency: form.urgency,
      });
      onSent();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send referral');
    } finally { setSubmitting(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92svh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Refer a Patient</h2>
            <p className="text-xs text-slate-500 mt-0.5">Send a secure clinical referral to another doctor</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Receiving doctor */}
          <div>
            <label className="label">Receiving Doctor *</label>
            {selectedDoctor ? (
              <div className="flex items-center gap-3 p-3 bg-teal-50 border border-teal-200 rounded-xl">
                <DoctorAvatar name={selectedDoctor.name} photo={selectedDoctor.profilePhotoUrl} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-slate-900">Dr. {selectedDoctor.name}</div>
                  <div className="text-xs text-slate-500">{selectedDoctor.specialty}{selectedDoctor.city ? ` · ${selectedDoctor.city}` : ''}</div>
                </div>
                <button type="button" onClick={() => { setSelectedDoctor(null); setDoctorQuery(''); }}
                  className="p-1.5 rounded-lg hover:bg-teal-100 text-teal-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input className="input pl-9" placeholder="Search by name or specialty…"
                  value={doctorQuery} onChange={e => setDoctorQuery(e.target.value)} autoFocus />
                {(doctorResults.length > 0 || searchingDocs) && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-10 max-h-52 overflow-y-auto">
                    {searchingDocs && <div className="flex items-center justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-teal-500" /></div>}
                    {doctorResults.map(d => (
                      <button key={d.id} type="button"
                        onClick={() => { setSelectedDoctor(d); setDoctorQuery(''); setDoctorResults([]); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-teal-50 transition-colors text-left border-b border-slate-50 last:border-b-0">
                        <DoctorAvatar name={d.name} photo={d.profilePhotoUrl} size={36} />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900">Dr. {d.name}</div>
                          <div className="text-xs text-slate-500 truncate">{d.specialty}{d.city ? ` · ${d.city}` : ''}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Patient selection */}
          <div>
            <label className="label">Patient</label>
            <select className="input" value={selectedPatientId} onChange={e => setSelectedPatientId(e.target.value)}>
              <option value="">— Enter manually —</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.mrn})</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Patient Name *</label>
              <input className="input" placeholder="Full name" value={form.patientName}
                onChange={e => setForm(f => ({ ...f, patientName: e.target.value }))} />
            </div>
            <div>
              <label className="label">Age</label>
              <input className="input" type="number" placeholder="Years" min={0} max={120}
                value={form.patientAge} onChange={e => setForm(f => ({ ...f, patientAge: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Gender</label>
              <select className="input" value={form.patientGender} onChange={e => setForm(f => ({ ...f, patientGender: e.target.value }))}>
                <option value="M">Male</option><option value="F">Female</option><option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" type="tel" placeholder="Mobile number"
                value={form.patientPhone} onChange={e => setForm(f => ({ ...f, patientPhone: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="label">Urgency</label>
            <div className="flex gap-2">
              {(['routine', 'urgent', 'emergency'] as const).map(u => (
                <button key={u} type="button" onClick={() => setForm(f => ({ ...f, urgency: u }))}
                  className={cn('flex-1 py-2 rounded-lg text-xs font-bold border capitalize transition-all',
                    form.urgency === u
                      ? u === 'routine' ? 'bg-slate-700 border-slate-700 text-white'
                        : u === 'urgent' ? 'bg-amber-500 border-amber-500 text-white'
                        : 'bg-red-500 border-red-500 text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')}>
                  {u}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Referral Reason *</label>
            <input className="input" placeholder="e.g. Requires specialist consultation for…"
              value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
          </div>

          <div>
            <label className="label">Clinical Notes</label>
            <textarea className="input min-h-[72px] resize-none" placeholder="Relevant clinical history, investigations, current medications…"
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
          )}
        </form>

        <div className="px-5 py-4 border-t border-slate-100">
          <button onClick={handleSubmit as unknown as React.MouseEventHandler} disabled={submitting}
            className="btn-primary w-full justify-center gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {submitting ? 'Sending…' : 'Send Referral'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Referral Card ───────────────────────────────────────────────────────────── */
function ReferralCard({
  referral, userId, onAction,
}: { referral: Referral; userId: number; onAction: (id: number, action: string, reason?: string) => void }) {
  const isSent = referral.referringDoctorId === userId;
  const otherDoctor = isSent ? referral.receivingDoctorName : referral.referringDoctorName;
  const otherPhoto = isSent ? referral.receivingDoctorPhoto : referral.referringDoctorPhoto;
  const otherSpec = isSent ? referral.receivingDoctorSpecialty : referral.referringDoctorSpecialty;
  const cfg = STATUS_CONFIG[referral.status];
  const StatusIcon = cfg.icon;
  const [declining, setDeclining] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <DoctorAvatar name={otherDoctor} photo={otherPhoto} size={44} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-bold text-slate-900">Dr. {otherDoctor}</span>
            <span className="text-xs text-slate-500">{otherSpec}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={cn('badge text-xs', cfg.color)}>
              <StatusIcon className="w-3 h-3" /> {cfg.label}
            </span>
            <span className={cn('badge text-xs capitalize', URGENCY_COLOR[referral.urgency])}>
              {referral.urgency}
            </span>
            <span className="badge bg-slate-100 text-slate-500 text-xs">
              {isSent ? 'Sent' : 'Received'}
            </span>
          </div>
        </div>
        <div className="text-[11px] text-slate-400 flex-shrink-0">
          {new Date(referral.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </div>
      </div>

      {/* Patient info */}
      <div className="mt-3 bg-slate-50 rounded-xl px-3 py-2.5 flex items-center gap-2">
        <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-slate-800">{referral.patientName}</span>
          {referral.patientAge && <span className="text-xs text-slate-500 ml-1">{referral.patientAge}y · {referral.patientGender}</span>}
          {referral.patientPhone && <span className="text-xs text-slate-500 ml-1">· {referral.patientPhone}</span>}
        </div>
        {isSent && (
          <div className="flex items-center gap-1 text-xs text-teal-600">
            <Send className="w-3 h-3" />
          </div>
        )}
      </div>

      {/* Reason */}
      <div className="mt-2.5">
        <p className="text-sm text-slate-700 font-medium">{referral.reason}</p>
        {referral.notes && (
          <button onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-xs text-teal-600 mt-1 font-medium">
            {expanded ? 'Hide notes' : 'View clinical notes'}
            <ChevronDown className={cn('w-3 h-3 transition-transform', expanded && 'rotate-180')} />
          </button>
        )}
        {expanded && referral.notes && (
          <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
            {referral.notes}
          </div>
        )}
        {referral.status === 'declined' && referral.declinedReason && (
          <div className="mt-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs text-red-700">
            <strong>Reason for decline:</strong> {referral.declinedReason}
          </div>
        )}
      </div>

      {/* Actions for receiving doctor on pending referrals */}
      {!isSent && referral.status === 'pending' && (
        <div className="mt-3">
          {declining ? (
            <div className="space-y-2">
              <input className="input text-sm" placeholder="Reason for declining (optional)"
                value={declineReason} onChange={e => setDeclineReason(e.target.value)} />
              <div className="flex gap-2">
                <button onClick={() => onAction(referral.id, 'decline', declineReason)}
                  className="flex-1 btn-danger text-xs py-1.5 justify-center">Confirm Decline</button>
                <button onClick={() => setDeclining(false)}
                  className="flex-1 btn-secondary text-xs py-1.5 justify-center">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => onAction(referral.id, 'accept')}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl py-2.5 transition-colors">
                <CheckCircle2 className="w-3.5 h-3.5" /> Accept Patient
              </button>
              <button onClick={() => setDeclining(true)}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl py-2.5 transition-colors">
                <XCircle className="w-3.5 h-3.5" /> Decline
              </button>
            </div>
          )}
        </div>
      )}

      {/* Cancel for referring doctor on pending */}
      {isSent && referral.status === 'pending' && (
        <button onClick={() => onAction(referral.id, 'cancel')}
          className="mt-3 w-full text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded-xl py-2 transition-colors">
          Cancel Referral
        </button>
      )}
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────────────────────── */
import { useAuthStore } from '@/store/useAuthStore';

export default function ReferralsPage() {
  const user = useAuthStore(s => s.user);
  return <ReferralsPageInner userId={user?.id ?? 0} />;
}

function ReferralsPageInner({ userId }: { userId: number }) {
  const [tab, setTab] = useState<'received' | 'sent' | 'all'>('received');
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSend, setShowSend] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const { showToast } = useAppStore();

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const qs = tab !== 'all' ? `?direction=${tab}` : '';
      const rows = await api.get<Referral[]>(`/referrals${qs}`);
      setReferrals(rows);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load referrals');
    } finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  async function handleAction(id: number, action: string, declinedReason?: string) {
    setActionLoading(id);
    try {
      await api.patch(`/referrals/${id}`, { action, declinedReason });
      const label = action === 'accept' ? 'Referral accepted' : action === 'decline' ? 'Referral declined' : 'Referral cancelled';
      showToast(label, action === 'accept' ? 'success' : 'info');
      load();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Action failed', 'error');
    } finally { setActionLoading(null); }
  }

  const pending = referrals.filter(r => r.status === 'pending' && r.receivingDoctorId === userId).length;

  return (
    <div className="animate-page-enter">
      {showSend && <SendReferralModal onClose={() => setShowSend(false)} onSent={load} />}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-teal-500" />
            Patient Referrals
          </h1>
          <p className="page-subtitle">Doctor-to-doctor clinical referral network</p>
        </div>
        <button onClick={() => setShowSend(true)} className="btn-primary gap-2">
          <Send className="w-4 h-4" /> Refer a Patient
        </button>
      </div>

      {/* Tabs */}
      <div className="tab-bar mb-4">
        {([
          { key: 'received', label: 'Incoming', icon: Inbox },
          { key: 'sent', label: 'Sent', icon: Send },
          { key: 'all', label: 'All', icon: ArrowRightLeft },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn('tab-btn flex items-center gap-1.5', tab === key && 'active')}>
            <Icon className="w-3.5 h-3.5" />
            {label}
            {key === 'received' && pending > 0 && (
              <span className="ml-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{pending}</span>
            )}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center h-48 gap-3 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading referrals…</span>
        </div>
      )}

      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div className="flex-1 text-sm text-red-700">{error}</div>
          <button onClick={load} className="btn-secondary btn-sm gap-1">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {!loading && !error && referrals.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
          <ArrowRightLeft className="w-10 h-10 opacity-20" />
          <div className="text-center">
            <div className="font-semibold text-slate-600">
              {tab === 'received' ? 'No incoming referrals' : tab === 'sent' ? 'No sent referrals' : 'No referrals yet'}
            </div>
            <div className="text-sm mt-1">
              {tab === 'received' ? 'Patient referrals from other doctors will appear here.' :
               tab === 'sent' ? 'Patients you refer to colleagues will appear here.' :
               'Start by referring a patient to a colleague.'}
            </div>
          </div>
          {tab !== 'received' && (
            <button onClick={() => setShowSend(true)} className="btn-primary gap-2 mt-2">
              <Send className="w-4 h-4" /> Refer a Patient
            </button>
          )}
        </div>
      )}

      {!loading && !error && referrals.length > 0 && (
        <div className="space-y-3">
          {/* Pending first */}
          {referrals.filter(r => r.status === 'pending').length > 0 && (
            <>
              <h3 className="text-xs font-bold uppercase tracking-wide text-amber-600 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> Pending ({referrals.filter(r => r.status === 'pending').length})
              </h3>
              {referrals.filter(r => r.status === 'pending').map(r => (
                <div key={r.id} className={actionLoading === r.id ? 'opacity-50 pointer-events-none' : ''}>
                  <ReferralCard referral={r} userId={userId} onAction={handleAction} />
                </div>
              ))}
            </>
          )}

          {/* Completed */}
          {referrals.filter(r => r.status !== 'pending').length > 0 && (
            <>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 flex items-center gap-2 mt-4">
                <CheckCircle2 className="w-3.5 h-3.5" /> Completed ({referrals.filter(r => r.status !== 'pending').length})
              </h3>
              {referrals.filter(r => r.status !== 'pending').map(r => (
                <ReferralCard key={r.id} referral={r} userId={userId} onAction={handleAction} />
              ))}
            </>
          )}
        </div>
      )}

      {/* Quick tip at bottom */}
      {!loading && !error && (
        <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-start gap-3">
          <Stethoscope className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-700 leading-relaxed">
            <strong>Clinical referrals are private</strong> — only you and the receiving doctor can see the patient information.
            After accepting, the patient can be scheduled for an appointment separately.
            <button onClick={() => setShowSend(true)} className="ml-2 font-bold text-blue-800 underline underline-offset-2">
              Refer a patient <ArrowRight className="w-3 h-3 inline" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
