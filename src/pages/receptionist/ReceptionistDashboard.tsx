import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus, CalendarDays, Users, CheckCircle2, Clock,
  QrCode, IndianRupee, Phone, Search, ChevronRight,
  ClipboardList, X,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { usePadStore } from '@/store/usePadStore';
import { cn, localDate } from '@/lib/utils';
import type { AppointmentEntry } from '@/types';

const STATUS_STYLE: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-teal-100 text-teal-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-600',
  'no-show': 'bg-slate-100 text-slate-500',
};
const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Scheduled', confirmed: 'Arrived',
  completed: 'Done', cancelled: 'Cancelled', 'no-show': 'No Show',
};

export default function ReceptionistDashboard() {
  const { user } = useAuthStore();
  const { patients, appointments, updateAppointment, queue, showToast } = useAppStore();
  const { settings: pad } = usePadStore();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [payPatient, setPayPatient] = useState<AppointmentEntry | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState<'cash' | 'upi' | 'card'>('cash');

  const today = localDate();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const todayAppts = useMemo(() =>
    appointments
      .filter(a => a.date === today)
      .sort((a, b) => a.time.localeCompare(b.time)),
    [appointments, today]);

  const registeredToday = patients.filter(p => {
    const d = (p as any).createdAt ? (p as any).createdAt.slice(0, 10) : '';
    return d === today;
  }).length;

  const seenToday = todayAppts.filter(a => a.status === 'completed').length;
  const waitingCount = queue.filter(q => q.status === 'waiting').length;

  const filtered = todayAppts.filter(a =>
    !search || a.patientName.toLowerCase().includes(search.toLowerCase())
  );

  function markArrived(apt: AppointmentEntry) {
    updateAppointment(apt.id, { status: 'confirmed' });
    showToast(`${apt.patientName} marked as arrived`, 'success');
  }

  function markNoShow(apt: AppointmentEntry) {
    updateAppointment(apt.id, { status: 'no-show' });
    showToast(`${apt.patientName} marked as no-show`, 'info');
  }

  function collectPayment() {
    if (!payPatient) return;
    updateAppointment(payPatient.id, {
      amountPaid: Number(payAmount) || payPatient.consultationFee || 0,
      paymentMode: payMode,
    });
    showToast(`Payment recorded for ${payPatient.patientName}`, 'success');
    setPayPatient(null);
    setPayAmount('');
  }

  return (
    <div className="p-0 md:p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{greeting}, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-sm text-slate-500 mt-0.5">Front Desk · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <button onClick={() => navigate('/app/register')}
          className="btn-primary flex items-center gap-2 px-5 py-2.5">
          <UserPlus className="w-4 h-4" /> Register New Patient
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Registered Today', value: registeredToday, icon: UserPlus, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: 'Seen Today', value: seenToday, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Waiting in Queue', value: waitingCount, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: "Today's Appointments", value: todayAppts.length, icon: CalendarDays, color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', s.bg)}>
              <s.icon className={cn('w-5 h-5', s.color)} />
            </div>
            <div className={cn('text-3xl font-bold', s.color)}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Today's Schedule + Payment side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Appointment list — takes 2/3 */}
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-teal-600" />
              <span className="font-semibold text-slate-800">Today's Appointments</span>
              <span className="badge bg-slate-100 text-slate-600">{todayAppts.length}</span>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search patient…" className="input pl-7 py-1.5 text-sm w-40" />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              <CalendarDays className="w-10 h-10 mx-auto mb-2 text-slate-200" />
              <p className="text-sm">No appointments scheduled for today</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map(apt => (
                <div key={apt.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                  <div className="w-14 text-center flex-shrink-0">
                    <div className="text-sm font-bold text-slate-800">{apt.time}</div>
                    {apt.token && <div className="text-xs text-slate-400">#{apt.token}</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-800 text-sm">{apt.patientName}</div>
                    <div className="text-xs text-slate-500 truncate mt-0.5">{apt.reason || 'OPD Visit'}</div>
                    {apt.clinicName && <div className="text-xs text-teal-600 mt-0.5">{apt.clinicName}</div>}
                  </div>
                  <span className={cn('badge flex-shrink-0 text-xs', STATUS_STYLE[apt.status] || STATUS_STYLE.scheduled)}>
                    {STATUS_LABEL[apt.status] || apt.status}
                  </span>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {apt.status === 'scheduled' && (
                      <>
                        <button onClick={() => markArrived(apt)}
                          className="btn-sm btn-primary text-xs px-2.5 py-1">
                          Arrived
                        </button>
                        <button onClick={() => { setPayPatient(apt); setPayAmount(String(apt.consultationFee || '')); }}
                          className="btn-sm btn-secondary text-xs px-2.5 py-1">
                          <IndianRupee className="w-3 h-3" />
                        </button>
                      </>
                    )}
                    {apt.status === 'confirmed' && (
                      <button onClick={() => { setPayPatient(apt); setPayAmount(String(apt.consultationFee || '')); }}
                        className="btn-sm btn-primary text-xs px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600">
                        <IndianRupee className="w-3 h-3" /> Collect
                      </button>
                    )}
                    {apt.status === 'scheduled' && (
                      <button onClick={() => markNoShow(apt)}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                        title="Mark no-show">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column: Quick actions + QR */}
        <div className="space-y-4">
          {/* Quick actions */}
          <div className="card p-4 space-y-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Quick Actions</h3>
            {[
              { icon: UserPlus, label: 'Register New Patient', sub: 'Add to OPD', color: 'text-teal-600 bg-teal-50', action: () => navigate('/app/register') },
              { icon: ClipboardList, label: 'View OPD Queue', sub: `${waitingCount} waiting`, color: 'text-amber-600 bg-amber-50', action: () => navigate('/app/queue') },
              { icon: Users, label: 'All Patients', sub: `${patients.length} total`, color: 'text-blue-600 bg-blue-50', action: () => navigate('/app/patients') },
            ].map(a => (
              <button key={a.label} onClick={a.action}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left group">
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', a.color)}>
                  <a.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-800">{a.label}</div>
                  <div className="text-xs text-slate-400">{a.sub}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />
              </button>
            ))}
          </div>

          {/* Payment / QR */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Payment Collection</h3>
              {pad.qrCodeUrl && (
                <span className="text-xs text-teal-600 font-medium flex items-center gap-1">
                  <QrCode className="w-3.5 h-3.5" /> Ready
                </span>
              )}
            </div>
            {pad.qrCodeUrl ? (
              <div className="text-center">
                <img src={pad.qrCodeUrl} alt="Payment QR" className="w-32 h-32 mx-auto rounded-xl border border-slate-200 object-contain" />
                <p className="text-xs text-slate-500 mt-2">Doctor's UPI QR — show to patient</p>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <QrCode className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500">No QR uploaded yet.</p>
                <p className="text-xs text-slate-400 mt-0.5">Doctor can upload in Settings → Rx Pad</p>
              </div>
            )}
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-500 text-center">
                Fee: <span className="font-semibold text-slate-700">₹{pad.fee ?? '—'}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent patients registered today */}
      {registeredToday > 0 && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500" />
            <span className="font-semibold text-slate-800 text-sm">Patients Registered Today</span>
            <span className="badge bg-teal-100 text-teal-700">{registeredToday}</span>
          </div>
          <div className="divide-y divide-slate-100">
            {patients.filter(p => (p as any).createdAt?.slice(0, 10) === today).slice(0, 8).map(p => (
              <div key={p.id} className="px-4 py-3 flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-700 font-bold text-xs flex-shrink-0">
                  {p.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-800">{p.name}</div>
                  <div className="text-xs text-slate-400">{p.age}y · {p.gender} · {p.mrn}</div>
                </div>
                {p.phone && (
                  <a href={`tel:${p.phone}`} className="text-xs text-teal-600 flex items-center gap-1 hover:underline">
                    <Phone className="w-3 h-3" />{p.phone}
                  </a>
                )}
                <span className={cn('badge text-xs', p.status === 'OPD' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600')}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment collection modal */}
      {payPatient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Collect Payment</h3>
              <button onClick={() => setPayPatient(null)} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="font-semibold text-slate-800">{payPatient.patientName}</div>
              <div className="text-xs text-slate-500 mt-0.5">{payPatient.time} · {payPatient.reason}</div>
            </div>
            <div>
              <label className="label">Amount (₹)</label>
              <input type="number" className="input" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                placeholder={`₹${payPatient.consultationFee || 0}`} />
            </div>
            <div>
              <label className="label">Payment Mode</label>
              <div className="flex gap-2">
                {(['cash', 'upi', 'card'] as const).map(m => (
                  <button key={m} onClick={() => setPayMode(m)}
                    className={cn('flex-1 py-2 rounded-xl border-2 text-sm font-semibold capitalize transition-all',
                      payMode === m ? 'border-teal-400 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-500')}>
                    {m === 'upi' ? 'UPI / QR' : m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            {payMode === 'upi' && pad.qrCodeUrl && (
              <img src={pad.qrCodeUrl} alt="QR" className="w-40 h-40 mx-auto rounded-xl border border-slate-200 object-contain" />
            )}
            <button onClick={collectPayment} className="btn-primary w-full py-3">
              <CheckCircle2 className="w-4 h-4" /> Mark as Paid
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
