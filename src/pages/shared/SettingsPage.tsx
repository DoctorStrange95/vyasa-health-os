import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Pill, Users, Building2, Save, Plus, Trash2, CheckCircle2,
  RefreshCw, Printer, Mail, Phone, Link2, Copy, Check,
  UserCheck, UserX, Settings, Edit2, MapPin, X, QrCode, PenLine, Upload
} from 'lucide-react';
import { usePadStore } from '@/store/usePadStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useAppStore } from '@/store/useAppStore';
import { api, isApiEnabled } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { PWAInstallGuide } from '@/components/PWAInstallGuide';
import { cn } from '@/lib/utils';
import type { Role, Staff, Clinic, ClinicBed } from '@/types';

type Tab = 'rxpad' | 'staff' | 'clinics';

// ─── Rx Pad tab ───────────────────────────────────────────────────────────────

const THEMES = [
  { id: 'teal',   label: 'Teal',   color: '#0d9488' },
  { id: 'navy',   label: 'Navy',   color: '#0a1628' },
  { id: 'maroon', label: 'Maroon', color: '#7f1d1d' },
  { id: 'dark',   label: 'Slate',  color: '#1e293b' },
] as const;

function RxPadTab() {
  const { settings: S, setSettings, resetSettings, eSignUrl, setESign } = usePadStore();
  const { user } = useAuthStore();
  const [saved, setSaved] = useState(false);
  const [eSignUploading, setESignUploading] = useState(false);
  const set = (k: string, v: unknown) => setSettings({ [k]: v } as never);
  const theme = THEMES.find(t => t.id === S.theme)?.color ?? '#0d9488';

  // Autofill from backend if pad is still at defaults (never configured)
  useEffect(() => {
    if (S.doctorName) return; // Already configured by user — don't overwrite
    const fromUser = () => {
      if (user?.name) setSettings({ doctorName: user.name, specialty: user.specialty || S.specialty });
    };
    if (isApiEnabled()) {
      api.get<Record<string, unknown>>('/auth/me').then(data => {
        setSettings({
          doctorName: (data.doctor_name as string) || (data.name as string) || user?.name || '',
          degrees: (data.pad_degrees as string) || (data.degrees as string) || '',
          specialty: (data.pad_specialty as string) || (data.specialty as string) || user?.specialty || '',
          regNumber: (data.pad_reg as string) || (data.reg_number as string) || '',
          clinicName: (data.clinic_name as string) || '',
          phone: (data.pad_phone as string) || (data.phone as string) || '',
          address: (data.address as string) || '',
          timings: (data.timings as string) || S.timings,
        });
      }).catch(fromUser);
    } else {
      fromUser();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const displayName = S.doctorName || user?.name || 'Dr. Your Name';
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  async function handleSave() {
    // Explicit save — push all current settings + esign to backend right now
    if (isApiEnabled()) {
      try {
        await api.put('/clinics/pad', {
          doctorName: S.doctorName, degrees: S.degrees, specialty: S.specialty,
          regNumber: S.regNumber, address: S.address, phone: S.phone,
          email: S.email, timings: S.timings, clinicName: S.clinicName,
          footerNote: S.footerNote, quote: S.quote, showQuote: S.showQuote,
          showTimings: S.showTimings, theme: S.theme,
          customFields: JSON.stringify(S.customFields),
          eSignUrl,
        });
      } catch (e) { console.warn('Save failed:', e); }
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Prescription Pad</h2>
          <p className="text-sm text-slate-500">Configure your letterhead — appears on every printed prescription</p>
        </div>
        <div className="flex gap-2">
          <button onClick={resetSettings} className="btn-secondary btn-sm"><RefreshCw className="w-3.5 h-3.5" /> Reset</button>
          <button onClick={handleSave} className="btn-primary btn-sm">
            {saved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {saved ? 'Saved!' : 'Save'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Form */}
        <div className="space-y-4">
          <div className="card p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-teal-600">Doctor Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: 'doctorName', label: 'Full Name', placeholder: 'Dr. Nilanjan Roy', span: 2 },
                { key: 'degrees', label: 'Degrees / Qualifications', placeholder: 'MBBS, MD (Internal Medicine)', span: 2 },
                { key: 'specialty', label: 'Specialty', placeholder: 'General Medicine' },
                { key: 'regNumber', label: 'Reg. No (NMC)', placeholder: 'NMC-12345' },
              ].map(f => (
                <div key={f.key} className={f.span === 2 ? 'sm:col-span-2' : ''}>
                  <label className="label">{f.label}</label>
                  <input value={(S as never)[f.key]} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder} className="input" />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="label">Tagline / Quote</label>
                <input value={S.quote} onChange={e => set('quote', e.target.value)} placeholder="Your health, our priority" className="input" />
              </div>
            </div>
          </div>

          <div className="card p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-teal-600">Clinic Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: 'clinicName', label: 'Clinic Name', placeholder: 'Roy Clinic', span: 2 },
                { key: 'address', label: 'Address', placeholder: '123 Main St, Kolkata - 700001', span: 2 },
                { key: 'phone', label: 'Phone', placeholder: '+91 98765 43210' },
                { key: 'email', label: 'Email', placeholder: 'nilanjan@royclinic.in' },
                { key: 'timings', label: 'Clinic Timings', placeholder: 'Mon–Sat  9am–1pm, 5pm–8pm', span: 2 },
              ].map(f => (
                <div key={f.key} className={f.span === 2 ? 'sm:col-span-2' : ''}>
                  <label className="label">{f.label}</label>
                  <input value={(S as never)[f.key]} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder} className="input" />
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-teal-600">Payment Collection</h3>
            <p className="text-xs text-slate-500">Your receptionist uses this QR to collect payments on your behalf at the front desk.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
              <div>
                <label className="label">Consultation Fee (₹)</label>
                <input type="number" className="input" value={S.fee ?? ''} onChange={e => set('fee', e.target.value ? Number(e.target.value) : undefined)} placeholder="e.g. 500" />
              </div>
              <div>
                <label className="label">UPI / Payment QR Code</label>
                {S.qrCodeUrl ? (
                  <div className="flex items-center gap-3">
                    <img src={S.qrCodeUrl} alt="QR" className="w-16 h-16 rounded-xl border border-slate-200 object-contain" />
                    <div className="space-y-1.5">
                      <p className="text-xs text-emerald-600 font-medium">✓ QR uploaded</p>
                      <button type="button" onClick={() => set('qrCodeUrl', '')} className="text-xs text-red-500 hover:underline">Remove</button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-4 cursor-pointer hover:border-teal-400 hover:bg-teal-50/50 transition-colors">
                    <QrCode className="w-8 h-8 text-slate-300 mb-1.5" />
                    <span className="text-xs text-slate-500 font-medium">Upload QR Image</span>
                    <span className="text-xs text-slate-400 mt-0.5">PNG, JPG — max 2MB</span>
                    <input type="file" accept="image/*" className="hidden" onChange={e => {
                      const file = e.target.files?.[0]; if (!file) return;
                      const reader = new FileReader();
                      reader.onload = ev => set('qrCodeUrl', ev.target?.result as string);
                      reader.readAsDataURL(file);
                    }} />
                  </label>
                )}
              </div>
            </div>
          </div>

          <div className="card p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-teal-600">Theme & Display</h3>
            <div className="flex gap-2 flex-wrap">
              {THEMES.map(t => (
                <button key={t.id} type="button" onClick={() => set('theme', t.id)}
                  className={cn('flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all',
                    S.theme === t.id ? 'border-current shadow-sm' : 'border-slate-200 text-slate-600 hover:border-slate-300')}
                  style={S.theme === t.id ? { color: t.color, borderColor: t.color, background: t.color + '15' } : {}}>
                  <span className="w-3 h-3 rounded-full" style={{ background: t.color }} />
                  {t.label}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {[
                { key: 'showQuote', label: 'Show tagline on pad' },
                { key: 'showTimings', label: 'Show clinic timings' },
              ].map(o => (
                <label key={o.key} className="flex items-center gap-3 cursor-pointer">
                  <button type="button" onClick={() => set(o.key, !(S as never)[o.key])}
                    className={cn('relative w-10 h-5 rounded-full transition-colors flex-shrink-0',
                      (S as never)[o.key] ? 'bg-teal-500' : 'bg-slate-200')}>
                    <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                      (S as never)[o.key] ? 'translate-x-5' : 'translate-x-0.5')} />
                  </button>
                  <span className="text-sm text-slate-700">{o.label}</span>
                </label>
              ))}
            </div>
            <div>
              <label className="label">Footer Note</label>
              <input value={S.footerNote} onChange={e => set('footerNote', e.target.value)} placeholder="Prescription valid for 30 days…" className="input" />
            </div>
            <div>
              <label className="label flex items-center gap-1.5"><PenLine className="w-3.5 h-3.5 text-teal-500" /> E-Signature</label>
              <p className="text-xs text-slate-400 mb-2">Upload your signature image (PNG/JPG with transparent background works best). It will appear above your name when printing.</p>
              {eSignUrl && (
                <div className="mb-2 flex items-center gap-3">
                  <img src={eSignUrl} alt="E-Signature" className="h-12 object-contain border border-slate-200 rounded-lg px-3 bg-white" />
                  <button type="button" onClick={() => setESign('')} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"><Trash2 className="w-3 h-3" /> Remove</button>
                </div>
              )}
              <label className={cn('flex items-center gap-2 cursor-pointer btn-secondary btn-sm w-fit', eSignUploading && 'opacity-60 pointer-events-none')}>
                {eSignUploading
                  ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Processing…</>
                  : <><Upload className="w-3.5 h-3.5" />{eSignUrl ? 'Change Signature' : 'Upload Signature'}</>
                }
                <input type="file" accept="image/*" className="hidden" disabled={eSignUploading} onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setESignUploading(true);
                  const reader = new FileReader();
                  reader.onload = ev => {
                    const src = ev.target?.result as string;
                    const img = new Image();
                    img.onload = () => {
                      const MAX_W = 400, MAX_H = 150;
                      const scale = Math.min(MAX_W / img.width, MAX_H / img.height, 1);
                      const canvas = document.createElement('canvas');
                      canvas.width = Math.round(img.width * scale);
                      canvas.height = Math.round(img.height * scale);
                      const ctx = canvas.getContext('2d')!;
                      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                      const compressed = canvas.toDataURL('image/png', 0.9);
                      setESign(compressed);
                      setESignUploading(false);
                    };
                    img.onerror = () => setESignUploading(false);
                    img.src = src;
                  };
                  reader.onerror = () => setESignUploading(false);
                  reader.readAsDataURL(file);
                  e.target.value = '';
                }} />
              </label>
            </div>
          </div>

          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-teal-600">Custom Fields</h3>
              <button type="button" onClick={() => setSettings({ customFields: [...S.customFields, { label: '', value: '' }] })}
                className="btn-secondary btn-sm"><Plus className="w-3.5 h-3.5" /> Add Field</button>
            </div>
            {S.customFields.length === 0 && (
              <p className="text-xs text-slate-400">Add any field you want on your pad (e.g. UPI, Visiting hours)</p>
            )}
            {S.customFields.map((cf, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input value={cf.label}
                  onChange={e => setSettings({ customFields: S.customFields.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })}
                  placeholder="Label (e.g. UPI)" className="input flex-1 text-sm" />
                <input value={cf.value}
                  onChange={e => setSettings({ customFields: S.customFields.map((x, j) => j === i ? { ...x, value: e.target.value } : x) })}
                  placeholder="Value (e.g. 9876543210@upi)" className="input flex-1 text-sm" />
                <button type="button" onClick={() => setSettings({ customFields: S.customFields.filter((_, j) => j !== i) })}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>

        {/* Live preview */}
        <div className="lg:sticky lg:top-4 self-start">
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700 flex items-center gap-2"><Printer className="w-4 h-4 text-teal-500" /> Live Preview</span>
            </div>
            <div className="p-4 bg-slate-50 overflow-auto max-h-[60vh]">
              <div className="bg-white shadow-sm p-5 max-w-sm mx-auto text-sm" style={{ fontFamily: 'Arial, sans-serif' }}>
                <div className="pb-3 mb-3" style={{ borderBottom: `3px solid ${theme}` }}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div style={{ color: theme, fontSize: '17px', fontWeight: 'bold' }}>{displayName}</div>
                      {S.degrees && <div className="text-slate-600 text-xs">{S.degrees}</div>}
                      {S.specialty && <div className="text-slate-600 text-xs font-medium">{S.specialty}</div>}
                      {S.regNumber && <div className="text-slate-400 text-xs">Reg: {S.regNumber}</div>}
                      {S.showQuote && S.quote && <div className="italic text-xs mt-0.5" style={{ color: theme }}>"{S.quote}"</div>}
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      {S.clinicName && <div className="font-semibold text-slate-700">{S.clinicName}</div>}
                      {S.address && <div>{S.address}</div>}
                      {S.phone && <div>📞 {S.phone}</div>}
                      {S.showTimings && S.timings && <div>⏰ {S.timings}</div>}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1 bg-slate-50 rounded px-2 py-1.5 text-xs mb-3">
                  <div><span className="text-slate-400">Patient: </span><strong>Ravi Patel</strong></div>
                  <div><span className="text-slate-400">Age: </span><strong>45Y/M</strong></div>
                  <div><span className="text-slate-400">Date: </span><strong>{today}</strong></div>
                </div>
                <div className="text-xs font-bold mb-1" style={{ color: theme }}>Diagnosis</div>
                <div className="text-xs font-medium mb-2">Hypertension, T2DM</div>
                <div className="text-lg font-bold mb-2" style={{ color: theme }}>℞</div>
                {[
                  { n: 'Tab. Amlodipine', d: '5mg', r: 'Oral · OD · 30 days · After food' },
                  { n: 'Tab. Metformin', d: '500mg', r: 'Oral · BD · Continued · With meals' },
                ].map((r, i) => (
                  <div key={i} className="mb-1.5">
                    <div className="text-xs font-semibold">{i+1}. {r.n} {r.d}</div>
                    <div className="text-xs text-slate-500 pl-3">{r.r}</div>
                  </div>
                ))}
                <div className="text-xs font-bold mt-2 mb-0.5" style={{ color: theme }}>Follow-up</div>
                <div className="text-xs">After 1 week</div>
                {S.customFields.filter(cf => cf.label).map((cf, i) => (
                  <div key={i} className="text-xs mt-1"><span className="text-slate-400">{cf.label}: </span>{cf.value}</div>
                ))}
                <div className="mt-5 flex justify-end">
                  <div className="text-center min-w-[112px]">
                    {eSignUrl && (
                      <img src={eSignUrl} alt="Signature" className="max-h-10 max-w-[112px] object-contain mx-auto mb-1" />
                    )}
                    <div className="border-t border-slate-400 pt-1 text-xs text-slate-500">{displayName}</div>
                  </div>
                </div>
                {(S.footerNote || true) && (
                  <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between gap-1 text-[9px] text-slate-400">
                    <span>QR</span>
                    <span className="flex-1 text-center">{S.footerNote}</span>
                    <span>Vyasa</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Staff tab ────────────────────────────────────────────────────────────────

const ROLE_COLOR: Record<string, string> = {
  doctor: 'bg-teal-100 text-teal-700', nurse: 'bg-blue-100 text-blue-700',
  pharmacist: 'bg-purple-100 text-purple-700', labtech: 'bg-indigo-100 text-indigo-700',
  admin: 'bg-slate-100 text-slate-700', billing: 'bg-yellow-100 text-yellow-700',
  receptionist: 'bg-pink-100 text-pink-700',
};
const CLINIC_ROLES: Role[] = ['nurse', 'receptionist', 'doctor', 'labtech', 'pharmacist'];
const ROLE_EMOJI: Record<string, string> = {
  doctor: '🩺', nurse: '💉', pharmacist: '💊', labtech: '🔬',
  admin: '⚙️', billing: '💰', receptionist: '🏥',
};
const ROLE_DESC: Record<string, string> = {
  nurse: 'Assists with vitals, medication admin', receptionist: 'Manages appointments & queue',
  doctor: 'Associate / visiting doctor', labtech: 'Runs lab tests & reports', pharmacist: 'Dispenses medications',
};

interface PendingStaff {
  id: string; name: string; email: string; phone: string; role: Role; department?: string; qualification?: string; degrees?: string; requestedAt: string; invited_clinic_name?: string; created_at?: string;
}

function StaffTab() {
  const { staff, setStaff, showToast } = useAppStore();
  const [addOpen, setAddOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [pending, setPending] = useState<PendingStaff[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null);

  // Fetch real pending staff from backend
  useEffect(() => {
    if (!isApiEnabled()) return;
    setLoadingPending(true);
    api.get<PendingStaff[]>('/staff/pending')
      .then(data => setPending(data.map(u => ({
        ...u,
        requestedAt: u.created_at ?? new Date().toISOString(),
        qualification: u.degrees ?? u.qualification,
      }))))
      .catch(() => {})
      .finally(() => setLoadingPending(false));
  }, []);

  async function approveStaff(ps: PendingStaff) {
    try {
      if (isApiEnabled()) {
        await api.post(`/staff/${ps.id}/approve`, {});
      }
      const newStaff: Staff = { id: Number(ps.id), name: ps.name, role: ps.role, email: ps.email, phone: ps.phone, department: ps.department, shift: 'Day', status: 'active' };
      setStaff([...staff, newStaff]);
      setPending(p => p.filter(x => x.id !== ps.id));
      showToast(`${ps.name} approved`, 'success');
    } catch {
      showToast('Failed to approve — try again', 'error');
    }
  }

  async function rejectStaff(ps: PendingStaff) {
    try {
      if (isApiEnabled()) {
        await api.post(`/staff/${ps.id}/reject`, {});
      }
      setPending(p => p.filter(x => x.id !== ps.id));
      showToast(`${ps.name} rejected`, 'info');
    } catch {
      showToast('Failed to reject — try again', 'error');
    }
  }

  async function removeStaff(id: number) {
    const member = staff.find(s => s.id === id);
    try {
      if (isApiEnabled()) {
        await api.del(`/staff/${id}`);
      }
      setStaff(staff.filter(s => s.id !== id));
      setConfirmRemoveId(null);
      showToast(`${member?.name ?? 'Staff'} removed from team`, 'info');
    } catch {
      showToast('Failed to remove — try again', 'error');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">My Clinic Staff</h2>
          <p className="text-sm text-slate-500">{staff.length} staff · {pending.length} pending approval</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setInviteOpen(true)} className="btn-secondary"><Link2 className="w-4 h-4" /> Invite Link</button>
          <button onClick={() => setAddOpen(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Staff</button>
        </div>
      </div>

      {/* Role guide */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {CLINIC_ROLES.map(r => (
          <div key={r} className="card p-3 text-center hover:border-teal-200 transition-colors cursor-pointer" onClick={() => setAddOpen(true)}>
            <div className="text-2xl mb-1">{ROLE_EMOJI[r]}</div>
            <div className="text-xs font-bold text-slate-800 capitalize">{r}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{ROLE_DESC[r]}</div>
          </div>
        ))}
      </div>

      {/* Pending approvals */}
      {(pending.length > 0 || loadingPending) && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-bold text-slate-900 text-sm">Pending Approvals</span>
            {loadingPending
              ? <span className="text-xs text-slate-400">Loading…</span>
              : <span className="badge bg-amber-100 text-amber-700">{pending.length}</span>
            }
          </div>
          <div className="space-y-2">
            {pending.map(ps => (
              <div key={ps.id} className="card p-4 border-l-4 border-l-amber-400">
                <div className="flex items-start gap-4 flex-wrap">
                  <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-xl flex-shrink-0">
                    {ROLE_EMOJI[ps.role]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900">{ps.name}</span>
                      <span className={cn('badge', ROLE_COLOR[ps.role] || 'bg-slate-100 text-slate-600')}>{ps.role}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{ps.email} · {ps.phone}{ps.qualification ? ` · ${ps.qualification}` : ''}</div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => rejectStaff(ps)} className="btn-secondary btn-sm text-red-600 border-red-200 hover:bg-red-50">
                      <UserX className="w-3.5 h-3.5" /> Reject
                    </button>
                    <button onClick={() => void approveStaff(ps)} className="btn-primary btn-sm">
                      <UserCheck className="w-3.5 h-3.5" /> Approve
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Staff grid */}
      {staff.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map(s => (
            <div key={s.id} className={cn('card p-4 transition-shadow', confirmRemoveId === s.id ? 'border-red-300' : 'hover:shadow-md')}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center font-bold text-teal-700 flex-shrink-0">
                  {s.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900 text-sm">{s.name}</div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <span className={cn('badge', ROLE_COLOR[s.role] || 'bg-slate-100 text-slate-600')}>
                      {ROLE_EMOJI[s.role]} {s.role}
                    </span>
                    <span className={cn('badge', s.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
                      {s.status}
                    </span>
                  </div>
                  {s.department && <div className="text-xs text-slate-400 mt-1">{s.department}{s.shift ? ` · ${s.shift} shift` : ''}</div>}
                  {s.email && <a href={`mailto:${s.email}`} className="text-xs text-teal-600 flex items-center gap-1 hover:underline mt-1"><Mail className="w-3 h-3" />{s.email}</a>}
                  {s.phone && <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5"><Phone className="w-3 h-3" />{s.phone}</div>}
                </div>
                {confirmRemoveId !== s.id && (
                  <button
                    onClick={() => setConfirmRemoveId(s.id)}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                    title="Remove from team"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {confirmRemoveId === s.id && (
                <div className="mt-3 pt-3 border-t border-red-100 flex items-center justify-between gap-3">
                  <p className="text-xs text-red-600 font-medium">Remove {s.name}?</p>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => setConfirmRemoveId(null)} className="btn-secondary btn-sm">Cancel</button>
                    <button onClick={() => removeStaff(s.id)} className="btn-sm bg-red-500 hover:bg-red-600 text-white rounded-lg px-3 py-1.5 text-xs font-semibold">
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-10 text-center">
          <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="font-semibold text-slate-600">No staff added yet</p>
          <p className="text-sm text-slate-400 mt-1">Add your receptionist, nurse, or assistant to get started</p>
          <div className="flex gap-3 justify-center mt-4">
            <button onClick={() => setInviteOpen(true)} className="btn-secondary"><Link2 className="w-4 h-4" /> Send Invite Link</button>
            <button onClick={() => setAddOpen(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Manually</button>
          </div>
        </div>
      )}

      <AddStaffModal open={addOpen} onClose={() => setAddOpen(false)} />
      <InviteLinkModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}

function AddStaffModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { staff, setStaff, showToast } = useAppStore();
  const [form, setFormState] = useState({ name: '', role: 'nurse' as Role, email: '', phone: '', department: '', specialty: '', shift: 'Day' });
  const set = (k: string, v: string) => setFormState(f => ({ ...f, [k]: v }));

  function submit() {
    if (!form.name.trim() || !form.email) { showToast('Name and email are required', 'error'); return; }
    const newStaff: Staff = { id: Date.now(), name: form.name, role: form.role, email: form.email, phone: form.phone, department: form.department, specialty: form.specialty || undefined, shift: form.shift, status: 'active' };
    setStaff([...staff, newStaff]);
    showToast(`${form.name} added as ${form.role}`, 'success');
    onClose();
    setFormState({ name: '', role: 'nurse', email: '', phone: '', department: '', specialty: '', shift: 'Day' });
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Staff Member" size="md"
      footer={<><button onClick={onClose} className="btn-secondary">Cancel</button><button onClick={submit} className="btn-primary">Add Staff</button></>}>
      <div className="space-y-4">
        <div>
          <label className="label">Full Name *</label>
          <input className="input" placeholder="e.g. Priya Sharma" value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div>
          <label className="label">Role *</label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {CLINIC_ROLES.map(r => (
              <button key={r} onClick={() => set('role', r)}
                className={cn('flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 text-xs font-semibold transition-all',
                  form.role === r ? 'border-teal-400 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-500 hover:border-slate-300')}>
                <span className="text-lg">{ROLE_EMOJI[r]}</span>
                <span className="capitalize">{r}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Email *</label><input type="email" className="input" placeholder="staff@clinic.com" value={form.email} onChange={e => set('email', e.target.value)} /></div>
          <div><label className="label">Mobile</label><input className="input" placeholder="9876543210" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Department</label>
            <input className="input" placeholder="e.g. OPD, ICU" value={form.department} onChange={e => set('department', e.target.value)} />
          </div>
          <div>
            <label className="label">Shift</label>
            <select className="input" value={form.shift} onChange={e => set('shift', e.target.value)}>
              <option>Day</option><option>Evening</option><option>Night</option><option>Rotational</option>
            </select>
          </div>
        </div>
        {form.role === 'doctor' && (
          <div><label className="label">Specialty</label><input className="input" placeholder="e.g. Cardiology" value={form.specialty} onChange={e => set('specialty', e.target.value)} /></div>
        )}
      </div>
    </Modal>
  );
}

function InviteLinkModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { clinics } = usePadStore();
  const [selectedRole, setSelectedRole] = useState<Role>('nurse');
  const [selectedClinicIds, setSelectedClinicIds] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  // Default-select all clinics when modal opens
  useState(() => { if (clinics.length > 0 && selectedClinicIds.length === 0) setSelectedClinicIds(clinics.map(c => c.id)); });

  function toggleClinic(id: string) {
    setSelectedClinicIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    setCopied(false);
  }

  const selectedClinics = clinics.filter(c => selectedClinicIds.includes(c.id));
  const clinicIdsParam = selectedClinics.map(c => c.id).join(',');
  const clinicNamesParam = selectedClinics.map(c => c.name).join(',');
  const TOKEN = btoa(`${selectedRole}-${clinicIdsParam}-${Date.now()}`).slice(0, 16);
  const link = selectedClinics.length > 0
    ? `${window.location.origin}/join?role=${selectedRole}&clinicIds=${encodeURIComponent(clinicIdsParam)}&clinicNames=${encodeURIComponent(clinicNamesParam)}&token=${TOKEN}`
    : '';

  function copy() {
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
  }

  return (
    <Modal open={open} onClose={onClose} title="Invite Staff via Link" size="md"
      footer={<button onClick={onClose} className="btn-secondary">Close</button>}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">Share this link with your staff member. They fill in their details, and you approve their access.</p>

        <div>
          <label className="label">Role for this invite</label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {CLINIC_ROLES.map(r => (
              <button key={r} onClick={() => { setSelectedRole(r); setCopied(false); }}
                className={cn('flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 text-xs font-semibold transition-all',
                  selectedRole === r ? 'border-teal-400 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-500 hover:border-slate-300')}>
                <span className="text-xl">{ROLE_EMOJI[r]}</span>
                <span className="capitalize">{r}</span>
              </button>
            ))}
          </div>
        </div>

        {clinics.length > 0 && (
          <div>
            <label className="label">Clinic(s) this staff will work at</label>
            <p className="text-xs text-slate-400 mb-2">Select all that apply — a nurse can work across multiple locations.</p>
            <div className="space-y-2">
              {clinics.map(c => (
                <label key={c.id} className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all',
                  selectedClinicIds.includes(c.id) ? 'border-teal-400 bg-teal-50' : 'border-slate-200 hover:border-slate-300'
                )}>
                  <input type="checkbox" className="w-4 h-4 accent-teal-500"
                    checked={selectedClinicIds.includes(c.id)}
                    onChange={() => toggleClinic(c.id)} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800">{c.name}</div>
                    {c.address && <div className="text-xs text-slate-500 truncate">{c.address}</div>}
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {selectedClinics.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
            Select at least one clinic to generate the invite link.
          </div>
        ) : (
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="text-xs text-slate-500 mb-2 font-medium">Invite link for {selectedClinics.map(c => c.name).join(' + ')}</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 font-mono truncate">{link}</code>
              <button onClick={copy} className={cn('btn btn-sm flex-shrink-0', copied ? 'btn-primary' : 'btn-secondary')}>
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-xs text-teal-700 space-y-1">
          <p className="font-semibold">How it works:</p>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>Share this link via WhatsApp or email</li>
            <li>They open it, enter their name & create a password</li>
            <li>You see their request in Pending Approvals → click Approve</li>
          </ol>
        </div>
      </div>
    </Modal>
  );
}

// ─── Clinics tab ─────────────────────────────────────────────────────────────

const CLINIC_COLORS = ['#0d9488', '#0a3d62', '#7f1d1d', '#1e293b', '#7c3aed', '#b45309'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

function fmt12(t: string) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'pm' : 'am';
  const hh = h % 12 || 12;
  return m === 0 ? `${hh}${ampm}` : `${hh}:${String(m).padStart(2, '0')}${ampm}`;
}

function buildTimingsString(schedule: import('@/types').DaySchedule[]): string {
  const open = schedule.filter(d => d.open && d.sessions.length > 0);
  if (open.length === 0) return 'Closed';
  const groups: string[] = [];
  let i = 0;
  while (i < open.length) {
    let j = i;
    while (j + 1 < open.length &&
      open[j + 1].day === open[j].day + 1 &&
      JSON.stringify(open[j].sessions) === JSON.stringify(open[j + 1].sessions)) j++;
    const dayLabel = i === j
      ? DAY_NAMES[open[i].day]
      : `${DAY_NAMES[open[i].day]}–${DAY_NAMES[open[j].day]}`;
    const timePart = open[i].sessions.map(s => `${fmt12(s.start)}–${fmt12(s.end)}`).join(', ');
    groups.push(`${dayLabel} ${timePart}`);
    i = j + 1;
  }
  return groups.join(' · ');
}

function emptySchedule(): import('@/types').DaySchedule[] {
  return Array.from({ length: 7 }, (_, d) => ({
    day: d,
    open: d >= 1 && d <= 6,
    sessions: d >= 1 && d <= 6 ? [{ start: '09:00', end: '13:00' }] : [],
    maxPatients: 20,
  }));
}

// ─── Clinic add/edit modal ────────────────────────────────────────────────────

function ClinicModal({ clinic: init, onSave, onClose }: {
  clinic: Clinic;
  onSave: (c: Clinic) => void;
  onClose: () => void;
}) {
  const [c, setC] = useState<Clinic>({ ...init, schedule: init.schedule?.length ? init.schedule : emptySchedule() });
  const [locLoading, setLocLoading] = useState(false);
  const set = (k: keyof Clinic, v: unknown) => setC(prev => ({ ...prev, [k]: v }));

  // GPS → Nominatim reverse geocode (no API key)
  async function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(async pos => {
      try {
        const { latitude: lat, longitude: lon } = pos.coords;
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        const a = data.address ?? {};
        const parts = [a.road, a.suburb ?? a.neighbourhood, a.city ?? a.town ?? a.village, a.postcode].filter(Boolean);
        setC(prev => ({
          ...prev,
          address: parts.join(', '),
          lat, lng: lon,
          state: a.state ?? prev.state ?? '',
          city: a.city ?? a.town ?? a.village ?? prev.city ?? '',
          pincode: a.postcode ?? prev.pincode ?? '',
        }));
      } finally {
        setLocLoading(false);
      }
    }, () => setLocLoading(false));
  }

  function updateDay(day: number, patch: Partial<import('@/types').DaySchedule>) {
    setC(prev => ({
      ...prev,
      schedule: prev.schedule.map(d => d.day === day ? { ...d, ...patch } : d),
    }));
  }

  function addSession(day: number) {
    const d = c.schedule.find(x => x.day === day)!;
    if (d.sessions.length >= 3) return;
    const defaults = [{ start: '17:00', end: '20:00' }, { start: '21:00', end: '23:30' }];
    const def = defaults[d.sessions.length - 1] ?? { start: '17:00', end: '20:00' };
    updateDay(day, { sessions: [...d.sessions, def] });
  }

  function removeSession(day: number, idx: number) {
    const d = c.schedule.find(x => x.day === day)!;
    const next = d.sessions.filter((_, i) => i !== idx);
    updateDay(day, { sessions: next, open: next.length > 0 });
  }

  function updateSession(day: number, idx: number, k: 'start' | 'end', v: string) {
    const d = c.schedule.find(x => x.day === day)!;
    updateDay(day, { sessions: d.sessions.map((s, i) => i === idx ? { ...s, [k]: v } : s) });
  }

  function toggleDay(day: number) {
    const d = c.schedule.find(x => x.day === day)!;
    const nowOpen = !d.open;
    updateDay(day, { open: nowOpen, sessions: nowOpen && d.sessions.length === 0 ? [{ start: '09:00', end: '13:00' }] : d.sessions });
  }

  function save() {
    const timings = buildTimingsString(c.schedule);
    const maxPat = Math.max(...c.schedule.filter(d => d.open).map(d => d.maxPatients), c.maxPatients ?? 20);
    onSave({ ...c, timings, maxPatients: maxPat });
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/50 overflow-y-auto p-4 py-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-lg text-slate-900">{init.name ? 'Edit Clinic' : 'Add New Clinic'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Name + colour */}
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="label">Clinic Name *</label>
              <input className="input" value={c.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Roy Clinic" autoFocus />
            </div>
            <div className="flex gap-1.5 pb-1">
              {CLINIC_COLORS.map(col => (
                <button key={col} type="button" onClick={() => set('color', col)}
                  className={cn('w-7 h-7 rounded-full border-2 transition-all', c.color === col ? 'border-slate-800 scale-110' : 'border-transparent')}
                  style={{ background: col }} />
              ))}
            </div>
          </div>

          {/* Address + location picker */}
          <div>
            <label className="label">Address</label>
            <div className="flex gap-2">
              <input className="input flex-1" value={c.address} onChange={e => set('address', e.target.value)} placeholder="Street, Area, City – PIN" />
              <button type="button" onClick={useMyLocation} disabled={locLoading}
                className="btn-secondary flex-shrink-0 flex items-center gap-1.5 text-teal-600 border-teal-200 hover:bg-teal-50">
                {locLoading
                  ? <span className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                  : <MapPin className="w-4 h-4" />}
                {locLoading ? 'Locating…' : 'Use GPS'}
              </button>
            </div>
            {c.lat && <p className="text-[11px] text-teal-600 mt-1">📍 {c.lat.toFixed(5)}, {c.lng?.toFixed(5)}</p>}
          </div>

          {/* State / City / Pincode — patients search & pick chambers by location */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="label">State</label>
              <input className="input" value={c.state ?? ''} onChange={e => set('state', e.target.value)} placeholder="West Bengal" />
            </div>
            <div>
              <label className="label">City</label>
              <input className="input" value={c.city ?? ''} onChange={e => set('city', e.target.value)} placeholder="Kolkata" />
            </div>
            <div>
              <label className="label">Pincode</label>
              <input className="input" value={c.pincode ?? ''} onChange={e => set('pincode', e.target.value)} placeholder="700059" inputMode="numeric" maxLength={6} />
            </div>
          </div>

          {/* Phone + fee */}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Phone / WhatsApp</label><input className="input" value={c.phone ?? ''} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" /></div>
            <div><label className="label">Consult Fee (₹)</label><input type="number" className="input" value={c.fee} onChange={e => set('fee', Number(e.target.value))} /></div>
          </div>

          {/* Day-by-day schedule */}
          <div>
            <label className="label mb-2">Weekly Schedule & Patient Caps</label>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              {c.schedule.map((d, _i) => (
                <div key={d.day} className={cn('px-4 py-3 border-b border-slate-100 last:border-0', d.open ? 'bg-white' : 'bg-slate-50')}>
                  <div className="flex items-start gap-3">
                    {/* Day toggle */}
                    <button type="button" onClick={() => toggleDay(d.day)}
                      className={cn('flex items-center gap-1.5 w-14 flex-shrink-0 mt-0.5 text-xs font-bold rounded-lg px-2 py-1.5 transition-colors',
                        d.open ? 'bg-teal-100 text-teal-700' : 'bg-slate-200 text-slate-400')}>
                      <span className={cn('w-2 h-2 rounded-full flex-shrink-0', d.open ? 'bg-teal-500' : 'bg-slate-300')} />
                      {DAY_NAMES[d.day]}
                    </button>

                    {d.open ? (
                      <div className="flex-1 space-y-2">
                        {d.sessions.map((s, si) => (
                          <div key={si} className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] text-slate-400 w-14 text-right flex-shrink-0">
                              {['Morning', 'Evening', 'Night'][si] ?? `Slot ${si + 1}`}
                            </span>
                            <select value={s.start} onChange={e => updateSession(d.day, si, 'start', e.target.value)}
                              className="input py-1.5 text-sm w-24 flex-shrink-0">
                              {TIME_SLOTS.map(t => <option key={t}>{t}</option>)}
                            </select>
                            <span className="text-slate-400 text-sm">–</span>
                            <select value={s.end} onChange={e => updateSession(d.day, si, 'end', e.target.value)}
                              className="input py-1.5 text-sm w-24 flex-shrink-0">
                              {TIME_SLOTS.map(t => <option key={t}>{t}</option>)}
                            </select>
                            <button type="button" onClick={() => removeSession(d.day, si)} className="text-slate-300 hover:text-red-400 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        <div className="flex items-center gap-4">
                          {d.sessions.length < 3 && !(d.sessions.length === 1 && d.sessions[0].start === '00:00' && d.sessions[0].end === '23:30') && (
                            <button type="button" onClick={() => addSession(d.day)}
                              className="text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1">
                              <Plus className="w-3 h-3" /> Add {['evening', 'night'][d.sessions.length - 1] ?? 'another'} session
                            </button>
                          )}
                          <label className="flex items-center gap-1.5 cursor-pointer select-none">
                            <input type="checkbox"
                              checked={d.sessions.length === 1 && d.sessions[0].start === '00:00' && d.sessions[0].end === '23:30'}
                              onChange={e => {
                                updateDay(d.day, { sessions: e.target.checked ? [{ start: '00:00', end: '23:30' }] : [{ start: '09:00', end: '13:00' }] });
                              }}
                              className="w-3.5 h-3.5 accent-teal-600 cursor-pointer"
                            />
                            <span className="text-xs text-slate-500 font-medium">24 hrs</span>
                          </label>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 mt-1.5 italic">Closed · tap day to open</span>
                    )}

                    {/* Cap */}
                    {d.open && (
                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">
                        <span className="text-[10px] text-slate-400">Max</span>
                        <input type="number" min={1} max={999} value={d.maxPatients}
                          onChange={e => updateDay(d.day, { maxPatients: Number(e.target.value) })}
                          className="w-20 text-center input py-1.5 text-sm font-semibold" />
                        <span className="text-[10px] text-slate-400">pts</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* IPD Beds */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">IPD Beds (optional)</label>
              <button type="button"
                onClick={() => {
                  const newBed: ClinicBed = { id: `bed-${Date.now()}`, number: String((c.beds?.length ?? 0) + 1), ward: 'General' };
                  set('beds', [...(c.beds ?? []), newBed]);
                }}
                className="btn-secondary btn-sm text-xs">
                <Plus className="w-3 h-3" /> Add Bed
              </button>
            </div>
            {(!c.beds || c.beds.length === 0) ? (
              <p className="text-xs text-slate-400">No beds configured. Add beds if this clinic has an IPD setup.</p>
            ) : (
              <div className="space-y-2">
                {c.beds.map((bed, bi) => (
                  <div key={bed.id} className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 w-6 text-right flex-shrink-0">#{bi + 1}</span>
                    <input
                      value={bed.number}
                      onChange={e => set('beds', c.beds!.map((b, i) => i === bi ? { ...b, number: e.target.value } : b))}
                      placeholder="Bed No."
                      className="input text-sm py-1.5 w-20 flex-shrink-0"
                    />
                    <input
                      value={bed.ward}
                      onChange={e => set('beds', c.beds!.map((b, i) => i === bi ? { ...b, ward: e.target.value } : b))}
                      placeholder="Ward"
                      className="input text-sm py-1.5 flex-1"
                    />
                    <select
                      value={bed.type ?? 'General'}
                      onChange={e => set('beds', c.beds!.map((b, i) => i === bi ? { ...b, type: e.target.value } : b))}
                      className="input text-sm py-1.5 w-32 flex-shrink-0"
                    >
                      <option>General</option>
                      <option>ICU</option>
                      <option>Private</option>
                      <option>Semi-Private</option>
                    </select>
                    <button type="button"
                      onClick={() => set('beds', c.beds!.filter((_, i) => i !== bi))}
                      className="text-slate-300 hover:text-red-400 transition-colors flex-shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={save} disabled={!c.name.trim()} className="btn-primary flex-1">Save Clinic</button>
        </div>
      </div>
    </div>
  );
}

function ClinicsTab() {
  const { clinics, addClinic, updateClinic, removeClinic } = usePadStore();
  const { showToast } = useAppStore();
  const [editClinic, setEditClinic] = useState<Clinic | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  function openAdd() {
    setEditClinic({ id: `C${Date.now()}`, name: '', address: '', phone: '', fee: 500, maxPatients: 20, timings: '', schedule: emptySchedule(), color: CLINIC_COLORS[clinics.length % CLINIC_COLORS.length] });
  }
  function openEdit(c: Clinic) { setEditClinic({ ...c }); }
  function save(updated: Clinic) {
    const exists = clinics.find(c => c.id === updated.id);
    exists ? updateClinic(updated) : addClinic(updated);
    showToast(exists ? 'Clinic updated' : 'Clinic added', 'success');
    setEditClinic(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">My Clinics</h2>
          <p className="text-sm text-slate-500">Practice locations — set schedule & patient cap per day</p>
        </div>
        <button onClick={openAdd} className="btn-primary"><Plus className="w-4 h-4" /> Add Clinic</button>
      </div>

      {clinics.length === 0 ? (
        <div className="card p-10 text-center">
          <Building2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="font-semibold text-slate-600">No clinics added yet</p>
          <p className="text-sm text-slate-400 mt-1 mb-4">Add your primary clinic or nursing home first</p>
          <button onClick={openAdd} className="btn-primary"><Plus className="w-4 h-4" /> Add First Clinic</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {clinics.map(c => {
            const openDays = c.schedule?.filter(d => d.open) ?? [];
            return (
              <div key={c.id} className="card p-5 hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full rounded-l-2xl" style={{ background: c.color ?? '#0d9488' }} />
                <div className="pl-3">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: (c.color ?? '#0d9488') + '20' }}>
                        <Building2 className="w-4 h-4" style={{ color: c.color ?? '#0d9488' }} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{c.name}</div>
                        {c.address && <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{c.address}</div>}
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button onClick={() => openEdit(c)} className="btn-secondary btn-sm"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setConfirmDelete(c.id)} className="btn-secondary btn-sm text-red-500 border-red-200 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>

                  {/* Day chips */}
                  <div className="flex gap-1 flex-wrap mb-3">
                    {Array.from({ length: 7 }, (_, d) => {
                      const ds = c.schedule?.find(x => x.day === d);
                      return (
                        <span key={d} className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full',
                          ds?.open ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-400')}>
                          {DAY_NAMES[d]}
                          {ds?.open && <span className="ml-1 opacity-60">{ds.maxPatients}</span>}
                        </span>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-slate-50 rounded-xl px-2 py-2">
                      <div className="text-sm font-bold text-slate-900">₹{c.fee}</div>
                      <div className="text-[10px] text-slate-400">Fee</div>
                    </div>
                    <div className="bg-slate-50 rounded-xl px-2 py-2">
                      <div className="text-sm font-bold text-slate-900">{openDays.length}d</div>
                      <div className="text-[10px] text-slate-400">Open days</div>
                    </div>
                    <div className="bg-slate-50 rounded-xl px-2 py-2">
                      <div className="text-sm font-bold text-slate-900">{openDays.length > 0 ? Math.max(...openDays.map(d => d.maxPatients)) : '—'}</div>
                      <div className="text-[10px] text-slate-400">Max cap</div>
                    </div>
                    <div className="bg-slate-50 rounded-xl px-2 py-2">
                      <div className="text-sm font-bold text-slate-900">{c.beds?.length ?? 0}</div>
                      <div className="text-[10px] text-slate-400">Beds</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editClinic && <ClinicModal clinic={editClinic} onSave={save} onClose={() => setEditClinic(null)} />}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="font-bold text-slate-900">Remove clinic?</h3>
            <p className="text-sm text-slate-500">This won't delete any patient data.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={async () => {
                const id = confirmDelete;
                setConfirmDelete(null);
                try {
                  await removeClinic(id);
                  showToast('Clinic removed', 'info');
                } catch {
                  showToast('Could not remove clinic — server error. Please try again.', 'error');
                }
              }}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-xl">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: typeof Settings; desc: string }[] = [
  { id: 'rxpad',   label: 'Rx Pad',     icon: Pill,      desc: 'Letterhead & prescription format' },
  { id: 'staff',   label: 'My Staff',   icon: Users,     desc: 'Add & manage clinic team' },
  { id: 'clinics', label: 'My Clinics', icon: Building2, desc: 'Locations · schedule · patient caps' },
];

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') as Tab | null;
  const activeTab: Tab = (rawTab && TABS.some(t => t.id === rawTab)) ? rawTab : 'rxpad';

  function setTab(t: Tab) { setSearchParams({ tab: t }); }

  return (
    <div className="p-0 md:p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-teal-500" /> Settings
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Rx pad, staff, and clinic configuration</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all',
              activeTab === t.id ? 'border-teal-500 bg-teal-50' : 'border-slate-200 bg-white hover:border-teal-200 hover:bg-slate-50')}>
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
              activeTab === t.id ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-500')}>
              <t.icon className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <div className={cn('text-sm font-bold', activeTab === t.id ? 'text-teal-700' : 'text-slate-800')}>{t.label}</div>
              <div className="text-xs text-slate-400 truncate hidden sm:block">{t.desc}</div>
            </div>
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'rxpad'   && <RxPadTab />}
        {activeTab === 'staff'   && <StaffTab />}
        {activeTab === 'clinics' && <ClinicsTab />}
      </div>

      {/* Install App banner — always visible at the bottom of Settings */}
      <PWAInstallGuide compact />
    </div>
  );
}
