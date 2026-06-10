import { useState, useMemo } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, UserPlus, Stethoscope, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { usePadStore } from '@/store/usePadStore';
import { cn } from '@/lib/utils';
import type { AppointmentStatus } from '@/types';

function todayStr() { return new Date().toISOString().slice(0, 10); }

function addDays(base: Date, n: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function fmtTime(t: string) {
  return new Date(`2000-01-01T${t}`).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function dateStr(d: Date) { return d.toISOString().slice(0, 10); }

const STATUS_STYLES: Record<AppointmentStatus, { label: string; chip: string; dot: string }> = {
  scheduled:  { label: 'Scheduled',   chip: 'bg-teal-100 text-teal-700',    dot: 'bg-teal-500' },
  confirmed:  { label: 'Confirmed',   chip: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500' },
  completed:  { label: 'Completed',   chip: 'bg-slate-100 text-slate-500',  dot: 'bg-slate-400' },
  cancelled:  { label: 'Cancelled',   chip: 'bg-red-100 text-red-600',      dot: 'bg-red-400' },
  'no-show':  { label: 'No Show',     chip: 'bg-orange-100 text-orange-600', dot: 'bg-orange-400' },
};

export default function SchedulerPage() {
  const { appointments, updateAppointment, openQuickRegister, showToast, patients } = useAppStore();
  const { clinics } = usePadStore();
  const [selectedClinicId, setSelectedClinicId] = useState<string>('all');
  const [weekOffset, setWeekOffset] = useState(0);

  // Start of current displayed week (Monday-aligned)
  const weekStart = useMemo(() => {
    const base = new Date();
    base.setDate(base.getDate() + weekOffset * 7);
    // align to Monday
    const dow = base.getDay();
    const diff = dow === 0 ? -6 : 1 - dow;
    base.setDate(base.getDate() + diff);
    base.setHours(0, 0, 0, 0);
    return base;
  }, [weekOffset]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  // Filter appointments for this week + clinic
  const weekAppointments = useMemo(() => {
    const from = dateStr(days[0]);
    const to = dateStr(days[6]);
    return appointments.filter(a => {
      if (a.date < from || a.date > to) return false;
      if (selectedClinicId !== 'all' && a.clinicId !== selectedClinicId) return false;
      return true;
    });
  }, [appointments, days, selectedClinicId]);

  // Group by date
  const byDay = useMemo(() => {
    const map: Record<string, typeof appointments> = {};
    days.forEach(d => { map[dateStr(d)] = []; });
    weekAppointments.forEach(a => {
      if (map[a.date]) map[a.date].push(a);
    });
    // sort each day by time
    Object.values(map).forEach(arr => arr.sort((a, b) => a.time.localeCompare(b.time)));
    return map;
  }, [weekAppointments, days]);

  const todayDate = todayStr();
  const weekLabel = `${fmtDate(days[0])} — ${fmtDate(days[6])}`;

  const totalThisWeek = weekAppointments.filter(a => a.status !== 'cancelled').length;
  const todayCount = (byDay[todayDate] ?? []).filter(a => a.status !== 'cancelled').length;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center flex-shrink-0">
            <CalendarDays className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Scheduler</h1>
            <p className="text-sm text-slate-500">{todayCount} today · {totalThisWeek} this week</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedClinicId}
            onChange={e => setSelectedClinicId(e.target.value)}
            className="input text-sm py-1.5 w-auto"
          >
            <option value="all">All Clinics</option>
            {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={openQuickRegister} className="btn-primary btn-sm">
            <UserPlus className="w-3.5 h-3.5" /> Book Appointment
          </button>
        </div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-2">
        <button onClick={() => setWeekOffset(o => o - 1)} className="btn-secondary btn-sm p-2">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="flex-1 text-center text-sm font-semibold text-slate-700">{weekLabel}</span>
        <button onClick={() => setWeekOffset(o => o + 1)} className="btn-secondary btn-sm p-2">
          <ChevronRight className="w-4 h-4" />
        </button>
        <button onClick={() => setWeekOffset(0)} className="btn-secondary btn-sm">Today</button>
      </div>

      {/* Day cards */}
      <div className="space-y-3">
        {days.map(day => {
          const ds = dateStr(day);
          const dayAppts = byDay[ds] ?? [];
          const isToday = ds === todayDate;
          const isPast = ds < todayDate;
          const active = dayAppts.filter(a => a.status !== 'cancelled');

          return (
            <div key={ds} className={cn(
              'card overflow-hidden',
              isToday && 'ring-2 ring-teal-500'
            )}>
              {/* Day header */}
              <div className={cn(
                'flex items-center justify-between px-4 py-2.5',
                isToday ? 'bg-teal-500' : isPast ? 'bg-slate-50' : 'bg-white',
                'border-b border-slate-200'
              )}>
                <div className="flex items-center gap-2">
                  {isToday && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
                  <span className={cn(
                    'font-bold text-sm',
                    isToday ? 'text-white' : 'text-slate-800'
                  )}>
                    {isToday ? 'Today · ' : ''}{fmtDate(day)}
                  </span>
                </div>
                <span className={cn(
                  'text-xs font-semibold px-2 py-0.5 rounded-full',
                  active.length > 0
                    ? isToday ? 'bg-white/20 text-white' : 'bg-teal-100 text-teal-700'
                    : isToday ? 'bg-white/10 text-teal-100' : 'text-slate-400'
                )}>
                  {active.length === 0 ? 'No appointments' : `${active.length} appointment${active.length > 1 ? 's' : ''}`}
                </span>
              </div>

              {/* Appointments */}
              {active.length === 0 ? (
                <div className="px-4 py-5 text-center">
                  <p className="text-sm text-slate-400">No appointments scheduled</p>
                  <button
                    onClick={openQuickRegister}
                    className="mt-2 text-xs text-teal-600 hover:text-teal-700 font-medium"
                  >
                    + Add appointment
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {dayAppts.map(apt => {
                    const st = STATUS_STYLES[apt.status];
                    const pt = patients.find(p => p.id === apt.patientId);
                    const isIPD = pt?.status === 'IPD';
                    const balance = (apt.consultationFee ?? 0) - (apt.amountPaid ?? 0);

                    return (
                      <div key={apt.id} className={cn(
                        'flex items-center gap-3 px-4 py-3',
                        apt.status === 'cancelled' && 'opacity-50',
                        apt.status === 'completed' && 'bg-slate-50/60'
                      )}>
                        {/* Time */}
                        <div className="flex-shrink-0 text-center w-16">
                          <div className="text-sm font-bold text-slate-800">{fmtTime(apt.time)}</div>
                          {apt.token && (
                            <div className="text-[10px] text-slate-400 font-medium">Token {apt.token}</div>
                          )}
                        </div>

                        {/* Dot */}
                        <div className={cn('w-2 h-2 rounded-full flex-shrink-0', st.dot)} />

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-900 text-sm">{apt.patientName}</span>
                            {isIPD && (
                              <span className="badge bg-blue-100 text-blue-700 text-[10px]">IPD · {pt?.ward}</span>
                            )}
                            {apt.clinicName && selectedClinicId === 'all' && (
                              <span className="text-[10px] text-slate-400">{apt.clinicName}</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 truncate">{apt.reason}</div>
                          {/* Payment summary */}
                          {apt.consultationFee !== undefined && (
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-slate-400">
                                ₹{apt.amountPaid ?? 0} paid
                                {balance > 0 && <span className="text-red-500 ml-1">· ₹{balance} due</span>}
                              </span>
                              {apt.paymentMode && (
                                <span className="text-[10px] text-slate-400 capitalize">· {apt.paymentMode}</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Status chip */}
                        <span className={cn('badge text-[10px] flex-shrink-0 hidden sm:inline-flex', st.chip)}>
                          {st.label}
                        </span>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {(apt.status === 'scheduled' || apt.status === 'confirmed') && !isIPD && (
                            <Link
                              to={`/app/consult/${apt.patientId}`}
                              className="btn-primary btn-sm px-2.5 py-1.5 text-xs"
                            >
                              <Stethoscope className="w-3 h-3" />
                              <span className="hidden sm:inline">Consult</span>
                            </Link>
                          )}
                          {(apt.status === 'scheduled' || apt.status === 'confirmed') && isIPD && (
                            <Link
                              to={`/app/consult/${apt.patientId}`}
                              className="btn-secondary btn-sm px-2.5 py-1.5 text-xs border-blue-300 text-blue-700"
                            >
                              <Stethoscope className="w-3 h-3" />
                              <span className="hidden sm:inline">Round</span>
                            </Link>
                          )}
                          {apt.status === 'scheduled' && (
                            <button
                              onClick={() => { updateAppointment(apt.id, { status: 'completed' }); showToast('Marked completed', 'success'); }}
                              title="Mark completed"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          {apt.status !== 'cancelled' && apt.status !== 'completed' && (
                            <button
                              onClick={() => { updateAppointment(apt.id, { status: 'cancelled' }); showToast('Appointment cancelled', 'info'); }}
                              title="Cancel"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {/* Cancelled ones — collapsed */}
                  {dayAppts.filter(a => a.status === 'cancelled').length > 0 && (
                    <div className="px-4 py-2 flex items-center gap-1.5 bg-slate-50">
                      <AlertCircle className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-400">
                        {dayAppts.filter(a => a.status === 'cancelled').length} cancelled
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty week state */}
      {weekAppointments.length === 0 && (
        <div className="card p-10 text-center">
          <CalendarDays className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No appointments this week</p>
          <p className="text-slate-400 text-sm mt-1 mb-4">Use Register Patient to schedule appointments</p>
          <button onClick={openQuickRegister} className="btn-primary mx-auto">
            <UserPlus className="w-4 h-4" /> Book Appointment
          </button>
        </div>
      )}
    </div>
  );
}
