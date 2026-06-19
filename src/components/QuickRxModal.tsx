import { useState, useRef } from 'react';
import { useAppStore, uid } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import {
  Pencil, Search, UserPlus, X, ArrowRight, Phone,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import type { Patient } from '@/types';

export function QuickRxModal() {
  const { patients, upsertPatient, showToast, closeQuickRxModal } = useAppStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'search' | 'new'>('search');
  const [form, setForm] = useState({
    name: '', age: '', gender: 'M' as 'M' | 'F' | 'Other',
    phone: '', email: '', complaint: '',
  });
  const searchRef = useRef<HTMLInputElement>(null);

  const results = query.trim().length >= 1
    ? patients.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.mrn.toLowerCase().includes(query.toLowerCase()) ||
        (p.phone ?? '').includes(query)
      ).slice(0, 6)
    : patients.slice(0, 5);

  function startConsult(patient: Patient) {
    closeQuickRxModal();
    navigate(`/app/consult/${patient.id}`);
  }

  function handleCreate() {
    if (!form.name.trim() || !form.age) {
      showToast('Name and age are required', 'error');
      return;
    }
    const newPatient: Patient = {
      id: uid(),
      name: form.name.trim(),
      age: Number(form.age),
      gender: form.gender,
      mrn: `MRN-${Date.now().toString().slice(-6)}`,
      phone: form.phone || undefined,
      email: form.email || undefined,
      status: 'OPD',
      priority: 'Stable',
      diagnosis: form.complaint || undefined,
      attendingDoctor: user?.name,
      attendingDoctorId: user?.id,
    };
    upsertPatient(newPatient);
    showToast(`${newPatient.name} registered`, 'success');
    closeQuickRxModal();
    navigate(`/app/consult/${newPatient.id}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[10vh]"
      onClick={closeQuickRxModal}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-teal-600 to-teal-500">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Pencil className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <div className="font-bold text-white">Write Rx / Start Consultation</div>
              <div className="text-teal-100 text-xs">Search patient or register new</div>
            </div>
          </div>
          <button onClick={closeQuickRxModal} className="p-1.5 rounded-lg hover:bg-white/20 text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toggle */}
        <div className="flex border-b border-slate-100">
          <button onClick={() => setMode('search')}
            className={cn('flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors',
              mode === 'search' ? 'text-teal-600 border-b-2 border-teal-500 bg-teal-50' : 'text-slate-500 hover:text-slate-700')}>
            <Search className="w-3.5 h-3.5" /> Existing Patient
          </button>
          <button onClick={() => { setMode('new'); setTimeout(() => (document.getElementById('qrx-name') as HTMLInputElement)?.focus(), 50); }}
            className={cn('flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors',
              mode === 'new' ? 'text-teal-600 border-b-2 border-teal-500 bg-teal-50' : 'text-slate-500 hover:text-slate-700')}>
            <UserPlus className="w-3.5 h-3.5" /> New Patient
          </button>
        </div>

        {mode === 'search' ? (
          <div className="p-4 space-y-3">
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={searchRef}
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by name, MRN or phone…"
                className="input pl-9 w-full"
              />
              {query && (
                <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Patient list */}
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {results.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-sm">
                  No patients found
                  <button onClick={() => setMode('new')} className="block mx-auto mt-2 text-teal-600 font-semibold hover:underline text-sm">
                    Register new patient →
                  </button>
                </div>
              ) : (
                results.map(p => (
                  <button key={p.id} type="button" onClick={() => startConsult(p)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-teal-50 hover:border-teal-200 border border-transparent transition-all group text-left">
                    <div className="w-9 h-9 rounded-full bg-navy-800 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {p.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 text-sm">{p.name}</div>
                      <div className="text-xs text-slate-500">
                        {p.age}y · {p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : 'Other'} · {p.mrn}
                        {p.phone && <> · <Phone className="w-3 h-3 inline mx-0.5" />{p.phone}</>}
                      </div>
                      {p.diagnosis && <div className="text-xs text-slate-400 truncate">{p.diagnosis}</div>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StatusBadge status={p.status} />
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-teal-500 transition-colors" />
                    </div>
                  </button>
                ))
              )}
            </div>

            {!query && patients.length > 5 && (
              <p className="text-xs text-slate-400 text-center">Showing recent patients · type to search all {patients.length}</p>
            )}
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Patient Name *</label>
                <input id="qrx-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Full name" className="input w-full" />
              </div>
              <div>
                <label className="label">Age *</label>
                <input type="number" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
                  placeholder="e.g. 45" className="input w-full" min={0} max={120} />
              </div>
              <div>
                <label className="label">Gender</label>
                <div className="flex gap-2">
                  {(['M', 'F', 'Other'] as const).map(g => (
                    <button key={g} type="button" onClick={() => setForm(f => ({ ...f, gender: g }))}
                      className={cn('flex-1 py-2 rounded-xl border-2 text-sm font-semibold transition-all',
                        form.gender === g ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-500 hover:border-slate-300')}>
                      {g === 'M' ? 'Male' : g === 'F' ? 'Female' : 'Other'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Phone (optional)</label>
                <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="9876543210" className="input w-full" />
              </div>
              <div>
                <label className="label">Email (optional)</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="patient@email.com" className="input w-full" />
              </div>
              <div className="col-span-2">
                <label className="label">Chief Complaint (optional)</label>
                <input value={form.complaint} onChange={e => setForm(f => ({ ...f, complaint: e.target.value }))}
                  placeholder="e.g. Fever, headache, follow-up" className="input w-full" />
              </div>
            </div>
            <button type="button" onClick={handleCreate}
              className="btn-primary w-full py-3 text-base gap-2"
              disabled={!form.name.trim() || !form.age}>
              <ArrowRight className="w-5 h-5" />
              Register & Start Consultation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
