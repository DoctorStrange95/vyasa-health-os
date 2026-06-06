import { useState } from 'react';
import { X, Calendar } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { usePadStore } from '@/store/usePadStore';

interface Props {
  patientId: string;
  patientName: string;
  patientAge?: number;
  defaultReason?: string;
  onClose: () => void;
}

export function ScheduleModal({ patientId, patientName, patientAge, defaultReason = '', onClose }: Props) {
  const { addAppointment, showToast } = useAppStore();
  const { user } = useAuthStore();
  const { clinics } = usePadStore();

  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState('09:00');
  const [clinicId, setClinicId] = useState(clinics[0]?.id ?? '');
  const [reason, setReason] = useState(defaultReason);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedClinic = clinics.find(c => c.id === clinicId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !time || !reason.trim()) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 300));

    addAppointment({
      id: `apt-${Date.now()}`,
      patientId,
      patientName,
      patientAge,
      clinicId: clinicId || undefined,
      clinicName: selectedClinic?.name,
      date,
      time,
      reason: reason.trim(),
      notes: notes.trim() || undefined,
      doctorId: user?.id,
      doctorName: user?.name,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    });

    setSaving(false);
    showToast(`Appointment scheduled for ${patientName}`, 'success');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Schedule Visit</h2>
            <p className="text-sm text-slate-500 mt-0.5">{patientName}{patientAge ? `, ${patientAge}y` : ''}</p>
          </div>
          <button type="button" onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date *</label>
              <input
                type="date"
                value={date}
                min={today}
                onChange={e => setDate(e.target.value)}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Time *</label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="input"
                required
              />
            </div>
          </div>

          {clinics.length > 0 && (
            <div>
              <label className="label">Clinic</label>
              <select
                value={clinicId}
                onChange={e => setClinicId(e.target.value)}
                className="input"
              >
                {clinics.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {selectedClinic && (
                <div className="text-[10px] text-slate-400 mt-1">{selectedClinic.address} · ₹{selectedClinic.fee}</div>
              )}
            </div>
          )}

          <div>
            <label className="label">Reason / Chief Complaint *</label>
            <input
              autoFocus={!defaultReason}
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="input"
              placeholder="Purpose of visit"
              required
            />
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="input resize-none text-sm"
              placeholder="Any special instructions…"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button
              type="submit"
              disabled={saving || !date || !time || !reason.trim()}
              className="btn-primary flex-1 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              {saving ? 'Saving…' : 'Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
