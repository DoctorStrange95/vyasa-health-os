import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { emitChatMessage } from '@/lib/socket';
import { ScrollText, Send, CheckCircle2 } from 'lucide-react';
import type { Patient } from '@/types';

// Nursing Notes — a quick note per patient. Posts to the patient's care-team
// chat (real-time + persisted) so the doctor sees nursing observations.
export default function NurseNotesPage() {
  const { patients, showToast } = useAppStore();
  const [posting, setPosting] = useState<string>('');
  const [patientId, setPatientId] = useState('');
  const [note, setNote] = useState('');
  const [sentFor, setSentFor] = useState('');

  useEffect(() => {
    import('@/lib/api').then(({ isApiEnabled, api }) => {
      if (isApiEnabled()) api.get<{ department?: string }>('/auth/me').then(me => setPosting(me.department || '')).catch(() => {});
    });
  }, []);

  const isIpd = (p: Patient) => p.status === 'IPD' || p.status === 'Critical';
  const mine = patients.filter(p => {
    if (posting === 'OPD') return p.status === 'OPD';
    if (posting === 'IPD') return isIpd(p);
    return true;
  });

  function send() {
    if (!patientId || !note.trim()) return;
    emitChatMessage(patientId, `📝 ${note.trim()}`);
    showToast('Note sent to care team', 'success');
    setSentFor(patientId);
    setNote('');
    setTimeout(() => setSentFor(''), 2500);
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ScrollText className="w-6 h-6 text-teal-600" /> Nursing Notes
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Record an observation — it reaches the doctor in the care-team chat</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
        <div>
          <label className="label">Patient</label>
          <select className="input" value={patientId} onChange={e => setPatientId(e.target.value)}>
            <option value="">Select patient…</option>
            {mine.map(p => (
              <option key={p.id} value={p.id}>{p.name} · {p.status}{p.ward ? ` · ${p.ward}` : ''}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Note</label>
          <textarea
            className="input resize-none"
            rows={4}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. Patient resting comfortably, took oral feeds, no fresh complaints…"
          />
        </div>
        <div className="flex items-center justify-between">
          {sentFor === patientId && patientId ? (
            <span className="text-sm text-emerald-600 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Sent
            </span>
          ) : <span />}
          <button onClick={send} disabled={!patientId || !note.trim()} className="btn-primary">
            <Send className="w-4 h-4" /> Send Note
          </button>
        </div>
      </div>
    </div>
  );
}
