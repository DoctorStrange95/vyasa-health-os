import { useState, useMemo } from 'react';
import { CalendarDays, Plus, ChevronLeft, ChevronRight, Clock, User, CheckCircle, XCircle } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { usePadStore } from '@/store/usePadStore';
import type { BookingSlot, Clinic, DaySchedule } from '@/types';

function today() { return new Date().toISOString().slice(0, 10); }
function addDays(d: string, n: number) {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().slice(0, 10);
}
function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}
function hhmm(t: string) {
  const d = new Date(`2000-01-01T${t}`);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function generateSlots(clinicId: string, date: string, clinics: Clinic[], fee: number): Omit<BookingSlot, 'id'>[] {
  const clinic = clinics.find(c => c.id === clinicId);
  if (!clinic) return [];
  const dow = new Date(date).getDay();
  const daySched = clinic.schedule.find((s: DaySchedule) => s.day === dow);
  if (!daySched?.open) return [];
  const slots: Omit<BookingSlot, 'id'>[] = [];
  for (const sess of daySched.sessions) {
    let [h, m] = sess.start.split(':').map(Number);
    const [eh, em] = sess.end.split(':').map(Number);
    while (h * 60 + m < eh * 60 + em) {
      const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      slots.push({ clinicId, date, time, durationMins: 15, status: 'available', bookedVia: 'walkin', fee });
      m += 15;
      if (m >= 60) { h += 1; m -= 60; }
    }
  }
  return slots;
}

interface BookModalProps { slot: BookingSlot; onClose: () => void; }
function BookModal({ slot, onClose }: BookModalProps) {
  const { patients, updateBookingSlot, showToast } = useAppStore();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const filtered = search.length >= 2
    ? patients.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.mrn.toLowerCase().includes(search.toLowerCase())).slice(0, 8)
    : [];

  const book = () => {
    if (!selected) return;
    const p = patients.find(px => px.id === selected)!;
    updateBookingSlot(slot.id, { status: 'booked', patientId: p.id, patientName: p.name, bookedVia: 'receptionist' });
    showToast(`Slot booked for ${p.name}`, 'success');
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 12, padding: 24, width: 380, maxWidth: '95vw' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700 }}>Book Slot — {hhmm(slot.time)}</h3>
        <p style={{ color: '#64748b', fontSize: 12, marginBottom: 14 }}>{slot.date}</p>
        <input
          className="input"
          placeholder="Search patient name or MRN…"
          value={search}
          onChange={e => { setSearch(e.target.value); setSelected(null); }}
          autoFocus
        />
        {filtered.length > 0 && (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, marginTop: 6, overflow: 'hidden' }}>
            {filtered.map(p => (
              <div
                key={p.id}
                onClick={() => setSelected(p.id)}
                style={{ padding: '8px 12px', cursor: 'pointer', background: selected === p.id ? '#f0fdfa' : 'white', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}
              >
                <span style={{ fontWeight: 600 }}>{p.name}</span>
                <span style={{ color: '#94a3b8', marginLeft: 8 }}>{p.mrn} · {p.age}Y/{p.gender}</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button onClick={onClose} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
          <button onClick={book} className="btn-primary" style={{ flex: 1 }} disabled={!selected}>Book</button>
        </div>
      </div>
    </div>
  );
}

export default function SchedulerPage() {
  const { bookingSlots, addBookingSlot, updateBookingSlot, showToast } = useAppStore();
  const { clinics } = usePadStore();
  const [selectedClinicId, setSelectedClinicId] = useState(clinics[0]?.id ?? '');
  const [weekStart, setWeekStart] = useState(today());
  const [bookingSlot, setBookingSlot] = useState<BookingSlot | null>(null);

  const clinic = clinics.find(c => c.id === selectedClinicId);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const slotsForDay = (date: string) => {
    const stored = bookingSlots.filter(s => s.clinicId === selectedClinicId && s.date === date);
    if (stored.length > 0) return stored;
    return generateSlots(selectedClinicId, date, clinics, clinic?.fee ?? 0).map(s => ({
      ...s,
      id: `slot-${selectedClinicId}-${date}-${s.time}`,
    }));
  };

  const ensureSlots = (date: string) => {
    const stored = bookingSlots.filter(s => s.clinicId === selectedClinicId && s.date === date);
    if (stored.length === 0) {
      const generated = generateSlots(selectedClinicId, date, clinics, clinic?.fee ?? 0);
      generated.forEach(s => addBookingSlot({ ...s, id: `slot-${selectedClinicId}-${date}-${s.time}` }));
    }
  };

  const statusColor = (status: BookingSlot['status']) =>
    status === 'booked' ? '#dcfce7' :
    status === 'blocked' ? '#fee2e2' :
    status === 'completed' ? '#f1f5f9' : '#f0fdfa';

  const statusText = (status: BookingSlot['status']) =>
    status === 'booked' ? '#166534' :
    status === 'blocked' ? '#991b1b' :
    status === 'completed' ? '#64748b' : '#0f766e';

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <CalendarDays style={{ width: 22, height: 22, color: '#0d9488' }} />
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Scheduler</h1>
          <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Clinic appointment schedule</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={selectedClinicId}
            onChange={e => setSelectedClinicId(e.target.value)}
            className="input"
            style={{ width: 200, fontSize: 13 }}
          >
            {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Week navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={() => setWeekStart(d => addDays(d, -7))} className="btn-secondary btn-sm">
          <ChevronLeft style={{ width: 14, height: 14 }} />
        </button>
        <span style={{ fontWeight: 600, fontSize: 14 }}>
          {fmt(weekStart)} — {fmt(addDays(weekStart, 6))}
        </span>
        <button onClick={() => setWeekStart(d => addDays(d, 7))} className="btn-secondary btn-sm">
          <ChevronRight style={{ width: 14, height: 14 }} />
        </button>
        <button onClick={() => setWeekStart(today())} className="btn-secondary btn-sm">Today</button>
      </div>

      {/* Day columns */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${days.length}, minmax(120px, 1fr))`, gap: 8, overflowX: 'auto' }}>
        {days.map(date => {
          const daySlots = slotsForDay(date);
          const dow = new Date(date).getDay();
          const daySched = clinic?.schedule.find(s => s.day === dow);
          const isOpen = daySched?.open;
          const isToday = date === today();

          return (
            <div key={date} style={{ minHeight: 300 }}>
              <div style={{
                background: isToday ? '#0d9488' : '#f1f5f9',
                color: isToday ? 'white' : '#334155',
                padding: '6px 8px', borderRadius: '8px 8px 0 0',
                fontSize: 12, fontWeight: 600, textAlign: 'center',
              }}>
                {fmt(date)}
                {!isOpen && <div style={{ fontSize: 10, opacity: 0.7 }}>Closed</div>}
              </div>
              <div style={{ border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 8px 8px', minHeight: 200, padding: 6, background: 'white' }}>
                {!isOpen && (
                  <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', paddingTop: 20 }}>No clinic</div>
                )}
                {isOpen && daySlots.length === 0 && (
                  <button
                    onClick={() => ensureSlots(date)}
                    className="btn-secondary btn-sm"
                    style={{ width: '100%', marginTop: 8, fontSize: 11 }}
                  >
                    <Plus style={{ width: 11, height: 11 }} /> Generate slots
                  </button>
                )}
                {daySlots.map(slot => (
                  <div
                    key={slot.id}
                    style={{
                      marginBottom: 4, borderRadius: 6, padding: '4px 6px',
                      background: statusColor(slot.status),
                      border: `1px solid ${slot.status === 'booked' ? '#86efac' : slot.status === 'blocked' ? '#fca5a5' : '#99f6e4'}`,
                      fontSize: 11,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 600, color: statusText(slot.status) }}>
                        <Clock style={{ width: 9, height: 9, display: 'inline', marginRight: 2 }} />
                        {hhmm(slot.time)}
                      </span>
                      {slot.status === 'available' && (
                        <button
                          onClick={() => { ensureSlots(date); setBookingSlot(slot); }}
                          style={{ background: '#0d9488', color: 'white', border: 'none', borderRadius: 4, padding: '1px 5px', fontSize: 10, cursor: 'pointer' }}
                        >
                          +
                        </button>
                      )}
                      {slot.status === 'booked' && (
                        <button
                          onClick={() => { updateBookingSlot(slot.id, { status: 'available', patientId: undefined, patientName: undefined }); showToast('Slot freed', 'info'); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                          title="Cancel booking"
                        >
                          <XCircle style={{ width: 11, height: 11 }} />
                        </button>
                      )}
                    </div>
                    {slot.patientName && (
                      <div style={{ color: '#166534', fontSize: 10, marginTop: 1 }}>
                        <User style={{ width: 8, height: 8, display: 'inline', marginRight: 2 }} />
                        {slot.patientName}
                      </div>
                    )}
                    {slot.status === 'completed' && (
                      <div style={{ color: '#64748b', fontSize: 10 }}>
                        <CheckCircle style={{ width: 8, height: 8, display: 'inline' }} /> Done
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, marginTop: 20 }}>
        {[
          { label: 'Booked', color: '#dcfce7', textColor: '#166534', count: bookingSlots.filter(s => s.clinicId === selectedClinicId && s.status === 'booked').length },
          { label: 'Available', color: '#f0fdfa', textColor: '#0f766e', count: bookingSlots.filter(s => s.clinicId === selectedClinicId && s.status === 'available').length },
          { label: 'Completed', color: '#f1f5f9', textColor: '#64748b', count: bookingSlots.filter(s => s.clinicId === selectedClinicId && s.status === 'completed').length },
        ].map(st => (
          <div key={st.label} style={{ background: st.color, borderRadius: 8, padding: '8px 14px', fontSize: 13 }}>
            <span style={{ color: st.textColor, fontWeight: 600 }}>{st.count}</span>
            <span style={{ color: '#64748b', marginLeft: 6 }}>{st.label}</span>
          </div>
        ))}
      </div>

      {bookingSlot && <BookModal slot={bookingSlot} onClose={() => setBookingSlot(null)} />}
    </div>
  );
}
