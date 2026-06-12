import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Phone, MessageCircle, CheckCircle, XCircle, Clock, CalendarDays, Loader2, RefreshCw, ClipboardCheck } from 'lucide-react';
import SchedulerPage from './SchedulerPage';

interface BookingRequest {
  id: number;
  patient_name: string;
  patient_phone: string;
  patient_email?: string;
  patient_age: number | null;
  clinic_name?: string | null;
  reason: string;
  preferred_date: string | null;
  preferred_time: string | null;
  status: 'pending' | 'confirmed' | 'cancelled';
  notes: string;
  created_at: string;
  confirmed_at: string | null;
}

type FilterTab = 'pending' | 'confirmed' | 'cancelled' | 'all';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  pending:   { bg: '#FFFBEB', text: '#B45309', dot: '#F59E0B' },
  confirmed: { bg: '#F0FDF4', text: '#065F46', dot: '#10B981' },
  cancelled: { bg: '#FEF2F2', text: '#991B1B', dot: '#EF4444' },
};

type PageView = 'requests' | 'schedule';

function ViewToggle({ view, setView, pendingCount }: { view: PageView; setView: (v: PageView) => void; pendingCount: number }) {
  return (
    <div className="flex gap-1 bg-slate-200/70 rounded-xl p-1 mb-6">
      <button onClick={() => setView('requests')}
        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-bold transition-all ${view === 'requests' ? 'bg-white shadow text-teal-700' : 'text-slate-500 hover:text-slate-700'}`}>
        <ClipboardCheck className="w-4 h-4" /> Requests
        {pendingCount > 0 && (
          <span className="bg-amber-400 text-white text-xs font-bold rounded-full px-1.5 py-0.5">{pendingCount}</span>
        )}
      </button>
      <button onClick={() => setView('schedule')}
        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-bold transition-all ${view === 'schedule' ? 'bg-white shadow text-teal-700' : 'text-slate-500 hover:text-slate-700'}`}>
        <CalendarDays className="w-4 h-4" /> My Schedule
      </button>
    </div>
  );
}

export default function BookingRequestsPage() {
  const [view, setView] = useState<PageView>('requests');
  const [tab, setTab] = useState<FilterTab>('pending');
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [notesModal, setNotesModal] = useState<{ id: number; notes: string; status: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = tab !== 'all' ? `?status=${tab}` : '';
      const rows = await api.get<BookingRequest[]>(`/booking-requests${params}`);
      setRequests(rows);
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id: number, status: string, notes?: string) {
    setUpdating(id);
    try {
      const updated = await api.patch<Partial<BookingRequest>>(`/booking-requests/${id}`, { status, notes });
      setRequests(prev => prev.map(r => r.id === id ? { ...r, ...updated } : r));
    } catch (e) {
      alert(`Could not update booking: ${e instanceof Error ? e.message : 'unknown error'}`);
    } finally {
      setUpdating(null);
      setNotesModal(null);
    }
  }

  const TABS: { id: FilterTab; label: string }[] = [
    { id: 'pending', label: 'Pending' },
    { id: 'confirmed', label: 'Confirmed' },
    { id: 'cancelled', label: 'Cancelled' },
    { id: 'all', label: 'All' },
  ];

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  // Schedule view renders the full Scheduler inside this page
  if (view === 'schedule') {
    return (
      <div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
          <ViewToggle view={view} setView={setView} pendingCount={pendingCount} />
        </div>
        <SchedulerPage />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      <ViewToggle view={view} setView={setView} pendingCount={pendingCount} />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Booking Requests</h1>
          <p className="text-sm text-slate-500 mt-1">Patient appointment requests from your public profile</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" title="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${tab === t.id ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.label}
            {t.id === 'pending' && pendingCount > 0 && (
              <span className="ml-1.5 bg-amber-400 text-white text-xs font-bold rounded-full px-1.5 py-0.5">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-teal-500" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16">
          <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No {tab !== 'all' ? tab : ''} requests</p>
          <p className="text-slate-400 text-sm mt-1">Share your public profile link to start receiving bookings</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => {
            const colors = STATUS_COLORS[req.status] ?? STATUS_COLORS.pending;
            const isUpdating = updating === req.id;
            return (
              <div key={req.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-4">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{req.patient_name}</span>
                        {req.patient_age && <span className="text-xs text-slate-400">{req.patient_age} yrs</span>}
                      </div>
                      <a href={`tel:${req.patient_phone}`} className="text-sm text-teal-600 font-medium hover:underline">
                        {req.patient_phone}
                      </a>
                      {req.patient_email && (
                        <div className="text-xs text-slate-400 mt-0.5">{req.patient_email}</div>
                      )}
                      {req.clinic_name && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-semibold text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-2 py-0.5">
                          {req.clinic_name}
                        </span>
                      )}
                    </div>
                    <span style={{ background: colors.bg, color: colors.text }}
                      className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0">
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: colors.dot, display: 'inline-block', flexShrink: 0 }} />
                      {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mb-3">
                    {req.reason && (
                      <div className="col-span-2">
                        <span className="font-medium text-slate-600">Reason: </span>{req.reason}
                      </div>
                    )}
                    {req.preferred_date && (
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {fmtDate(req.preferred_date)}{req.preferred_time ? ` · ${req.preferred_time}` : ''}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Received {fmtDate(req.created_at)} at {fmtTime(req.created_at)}
                    </div>
                    {req.notes && (
                      <div className="col-span-2 mt-1 bg-slate-50 rounded-lg px-3 py-2">
                        <span className="font-medium text-slate-600">Note: </span>{req.notes}
                      </div>
                    )}
                    {req.confirmed_at && (
                      <div className="col-span-2 text-emerald-600">
                        <CheckCircle className="w-3.5 h-3.5 inline mr-1" />
                        Confirmed on {fmtDate(req.confirmed_at)}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap">
                    <a href={`tel:${req.patient_phone}`}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-slate-100 rounded-lg hover:bg-slate-200 text-slate-700 no-underline">
                      <Phone className="w-3.5 h-3.5" /> Call
                    </a>
                    <a href={`https://wa.me/91${req.patient_phone.replace(/\D/g,'').slice(-10)}?text=${encodeURIComponent(`Hello ${req.patient_name}, regarding your appointment request...`)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg no-underline"
                      style={{ background: '#DCF8C6', color: '#1A7C41' }}>
                      <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                    </a>

                    {req.status === 'pending' && (
                      <>
                        <button disabled={isUpdating} onClick={() => setNotesModal({ id: req.id, notes: '', status: 'confirmed' })}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg ml-auto"
                          style={{ background: '#D1FAE5', color: '#065F46' }}>
                          {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                          Confirm
                        </button>
                        <button disabled={isUpdating} onClick={() => updateStatus(req.id, 'cancelled')}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                          style={{ background: '#FEE2E2', color: '#991B1B' }}>
                          {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                          Cancel
                        </button>
                      </>
                    )}
                    {req.status === 'confirmed' && (
                      <button disabled={isUpdating} onClick={() => updateStatus(req.id, 'cancelled')}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg ml-auto"
                        style={{ background: '#FEE2E2', color: '#991B1B' }}>
                        <XCircle className="w-3.5 h-3.5" /> Cancel
                      </button>
                    )}
                    {req.status === 'cancelled' && (
                      <button disabled={isUpdating} onClick={() => updateStatus(req.id, 'pending')}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg ml-auto"
                        style={{ background: '#FFFBEB', color: '#B45309' }}>
                        <Clock className="w-3.5 h-3.5" /> Restore
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm with notes modal */}
      {notesModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5">
            <h3 className="font-bold text-slate-800 mb-1">Confirm Appointment</h3>
            <p className="text-sm text-slate-500 mb-4">Add an optional note for the patient (e.g. confirmation time, prep instructions)</p>
            <textarea value={notesModal.notes} onChange={e => setNotesModal(m => m ? { ...m, notes: e.target.value } : m)}
              className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-400"
              rows={3} placeholder="e.g. Confirmed for 10am, please arrive 15 mins early" />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setNotesModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={() => updateStatus(notesModal.id, 'confirmed', notesModal.notes)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
