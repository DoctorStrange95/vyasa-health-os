import { useState, useRef } from 'react';
import { Save, Plus, Trash2, CheckCircle2, RefreshCw, Printer, Upload, X, Image } from 'lucide-react';
import { usePadStore } from '@/store/usePadStore';
import { useAuthStore } from '@/store/useAuthStore';
import { cn } from '@/lib/utils';

const THEMES = [
  { id: 'teal',   label: 'Teal',   color: '#0d9488' },
  { id: 'navy',   label: 'Navy',   color: '#0a1628' },
  { id: 'maroon', label: 'Maroon', color: '#7f1d1d' },
  { id: 'dark',   label: 'Slate',  color: '#1e293b' },
] as const;

export default function PadSettingsPage() {
  const { settings, setSettings, resetSettings } = usePadStore();
  const { user } = useAuthStore();
  const [saved, setSaved] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const stampRef = useRef<HTMLInputElement>(null);

  const S = settings;
  const set = (k: string, v: unknown) => setSettings({ [k]: v } as never);

  function handleImageUpload(key: 'logoUrl' | 'stampUrl', file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image file'); return; }
    if (file.size > 2 * 1024 * 1024) { alert('Image must be under 2 MB'); return; }
    const reader = new FileReader();
    reader.onload = e => set(key, e.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function addCustomField() {
    setSettings({ customFields: [...S.customFields, { label: '', value: '' }] });
  }

  function updateCustomField(i: number, field: 'label' | 'value', val: string) {
    const next = S.customFields.map((cf, idx) => idx === i ? { ...cf, [field]: val } : cf);
    setSettings({ customFields: next });
  }

  function removeCustomField(i: number) {
    setSettings({ customFields: S.customFields.filter((_, idx) => idx !== i) });
  }

  const theme = THEMES.find(t => t.id === S.theme)?.color ?? '#0d9488';
  const displayName = S.doctorName || user?.name || 'Dr. Your Name';
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Prescription Pad Settings</h1>
          <p className="text-sm text-slate-500 mt-0.5">Configure your custom prescription pad — this appears on every printed prescription</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={resetSettings} className="btn-secondary btn-sm">
            <RefreshCw className="w-3.5 h-3.5" /> Reset
          </button>
          <button onClick={handleSave} className="btn-primary btn-sm">
            {saved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ─── Left: Settings Form ─────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Doctor Details */}
          <div className="card p-5 space-y-3">
            <h2 className="font-semibold text-slate-800 text-sm uppercase tracking-wide text-teal-600">Doctor Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: 'doctorName', label: 'Full Name', placeholder: 'Dr. Nilanjan Roy', span: 2 },
                { key: 'degrees',    label: 'Degrees / Qualifications', placeholder: 'MBBS, MD (Internal Medicine)', span: 2 },
                { key: 'specialty',  label: 'Specialty', placeholder: 'Internal Medicine / Cardiology…' },
                { key: 'regNumber',  label: 'Reg. No (MCI/NMC)', placeholder: 'NMC-12345' },
              ].map(f => (
                <div key={f.key} className={f.span === 2 ? 'sm:col-span-2' : ''}>
                  <label className="label">{f.label}</label>
                  <input value={(S as never)[f.key]} onChange={e => set(f.key, e.target.value)}
                    placeholder={f.placeholder} className="input" />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="label">Tagline / Quote <span className="text-slate-400 font-normal">(shown on pad if enabled)</span></label>
                <input value={S.quote} onChange={e => set('quote', e.target.value)}
                  placeholder="Your health, our priority" className="input" />
              </div>
            </div>
          </div>

          {/* Clinic Details */}
          <div className="card p-5 space-y-3">
            <h2 className="font-semibold text-slate-800 text-sm uppercase tracking-wide text-teal-600">Clinic / Hospital</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: 'clinicName', label: 'Clinic / Hospital Name', placeholder: 'Vyasa General Hospital', span: 2 },
                { key: 'address',    label: 'Address', placeholder: '123 Main St, New Delhi - 110001', span: 2 },
                { key: 'phone',      label: 'Phone', placeholder: '+91 98765 43210' },
                { key: 'email',      label: 'Email', placeholder: 'doctor@clinic.com' },
                { key: 'timings',    label: 'Clinic Timings', placeholder: 'Mon–Sat  9am–5pm', span: 2 },
              ].map(f => (
                <div key={f.key} className={f.span === 2 ? 'sm:col-span-2' : ''}>
                  <label className="label">{f.label}</label>
                  <input value={(S as never)[f.key]} onChange={e => set(f.key, e.target.value)}
                    placeholder={f.placeholder} className="input" />
                </div>
              ))}
            </div>
          </div>

          {/* Logo & Stamp Uploads */}
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-slate-800 text-sm uppercase tracking-wide text-teal-600">Logo & Stamp</h2>

            {/* Clinic Logo */}
            <div>
              <label className="label">Clinic / Hospital Logo</label>
              <p className="text-xs text-slate-400 mb-2">Appears in the top-left of the prescription header. PNG/JPG, max 2 MB.</p>
              <div className="flex items-center gap-3">
                {S.logoUrl ? (
                  <div className="relative flex-shrink-0">
                    <img src={S.logoUrl} alt="Logo" className="h-16 max-w-[120px] object-contain rounded-lg border border-slate-200 bg-white p-1" />
                    <button type="button" onClick={() => set('logoUrl', '')}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-16 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 bg-slate-50">
                    <Image className="w-6 h-6" />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <button type="button" onClick={() => logoRef.current?.click()}
                    className="btn-secondary btn-sm flex items-center gap-2">
                    <Upload className="w-3.5 h-3.5" />
                    {S.logoUrl ? 'Replace Logo' : 'Upload Logo'}
                  </button>
                  {S.logoUrl && (
                    <button type="button" onClick={() => set('logoUrl', '')}
                      className="text-xs text-red-500 hover:underline text-left">
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <input ref={logoRef} type="file" accept="image/*" className="hidden"
                onChange={e => handleImageUpload('logoUrl', e.target.files?.[0])} />
            </div>

            {/* Doctor's Stamp */}
            <div>
              <label className="label">Doctor's Stamp / Seal</label>
              <p className="text-xs text-slate-400 mb-2">Appears below the signature on the prescription. PNG with transparent background recommended.</p>
              <div className="flex items-center gap-3">
                {S.stampUrl ? (
                  <div className="relative flex-shrink-0">
                    <img src={S.stampUrl} alt="Stamp" className="h-16 max-w-[120px] object-contain rounded-lg border border-slate-200 bg-white p-1" />
                    <button type="button" onClick={() => set('stampUrl', '')}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-16 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 bg-slate-50">
                    <Image className="w-6 h-6" />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <button type="button" onClick={() => stampRef.current?.click()}
                    className="btn-secondary btn-sm flex items-center gap-2">
                    <Upload className="w-3.5 h-3.5" />
                    {S.stampUrl ? 'Replace Stamp' : 'Upload Stamp'}
                  </button>
                  {S.stampUrl && (
                    <button type="button" onClick={() => set('stampUrl', '')}
                      className="text-xs text-red-500 hover:underline text-left">
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <input ref={stampRef} type="file" accept="image/*" className="hidden"
                onChange={e => handleImageUpload('stampUrl', e.target.files?.[0])} />
            </div>
          </div>

          {/* Theme & Options */}
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-slate-800 text-sm uppercase tracking-wide text-teal-600">Theme & Display</h2>

            <div>
              <label className="label">Colour Theme</label>
              <div className="flex gap-3 mt-1">
                {THEMES.map(t => (
                  <button key={t.id} type="button" onClick={() => set('theme', t.id)}
                    className={cn('flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all',
                      S.theme === t.id ? 'border-current shadow-md' : 'border-slate-200 text-slate-600 hover:border-slate-300')}
                    style={S.theme === t.id ? { color: t.color, borderColor: t.color, background: t.color + '15' } : {}}>
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: t.color }} />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {[
                { key: 'showLogo',    label: 'Show logo placeholder' },
                { key: 'showQuote',   label: 'Show tagline / quote on pad' },
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
              <input value={S.footerNote} onChange={e => set('footerNote', e.target.value)}
                placeholder="This prescription is valid for 30 days…" className="input" />
            </div>
          </div>

          {/* Custom Fields */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-800 text-sm uppercase tracking-wide text-teal-600">Custom Fields</h2>
              <button type="button" onClick={addCustomField} className="btn-secondary btn-sm">
                <Plus className="w-3.5 h-3.5" /> Add Field
              </button>
            </div>
            {S.customFields.length === 0 && (
              <p className="text-sm text-slate-400">No custom fields. Add any field you want to show on your pad (e.g. Visiting Hours, UPI, etc.)</p>
            )}
            {S.customFields.map((cf, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input value={cf.label} onChange={e => updateCustomField(i, 'label', e.target.value)}
                  placeholder="Label (e.g. UPI)" className="input flex-1 text-sm" />
                <input value={cf.value} onChange={e => updateCustomField(i, 'value', e.target.value)}
                  placeholder="Value (e.g. 9876543210@upi)" className="input flex-2 text-sm" />
                <button type="button" onClick={() => removeCustomField(i)}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Right: Live Preview ─────────────────────────────────────────── */}
        <div className="lg:sticky lg:top-6 self-start">
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Live Preview</span>
              <button className="btn-secondary btn-sm">
                <Printer className="w-3.5 h-3.5" /> Print Sample
              </button>
            </div>
            <div className="p-4 bg-slate-50 overflow-auto max-h-[70vh]">
              <div className="bg-white shadow-sm p-5 max-w-sm mx-auto text-sm" style={{ fontFamily: 'Arial, sans-serif' }}>

                {/* Pad header */}
                <div className="pb-3 mb-3" style={{ borderBottom: `3px solid ${theme}` }}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div style={{ color: theme, fontSize: '18px', fontWeight: 'bold' }}>{displayName}</div>
                      {S.degrees && <div className="text-slate-600 text-xs">{S.degrees}</div>}
                      {S.specialty && <div className="text-slate-600 text-xs font-medium">{S.specialty}</div>}
                      {S.regNumber && <div className="text-slate-400 text-xs">Reg: {S.regNumber}</div>}
                      {S.showQuote && S.quote && <div className="italic text-xs mt-1" style={{ color: theme }}>"{S.quote}"</div>}
                    </div>
                    <div className="text-right text-xs text-slate-500 min-w-0">
                      {S.clinicName && <div className="font-semibold text-slate-700">{S.clinicName}</div>}
                      {S.address && <div className="text-xs">{S.address}</div>}
                      {S.phone && <div>📞 {S.phone}</div>}
                      {S.showTimings && S.timings && <div>⏰ {S.timings}</div>}
                    </div>
                  </div>
                </div>

                {/* Patient row sample */}
                <div className="grid grid-cols-3 gap-1 bg-slate-50 rounded px-2 py-1.5 text-xs mb-3">
                  <div><span className="text-slate-400">Patient: </span><span className="font-semibold">Ravi Patel</span></div>
                  <div><span className="text-slate-400">Age: </span><span className="font-semibold">45Y/M</span></div>
                  <div><span className="text-slate-400">Date: </span><span className="font-semibold">{today}</span></div>
                </div>

                <div className="text-xs mb-1" style={{ color: theme }}>C/C</div>
                <div className="text-xs mb-3 text-slate-700">Chest pain since 2 hours</div>
                <div className="text-xs font-bold mb-1" style={{ color: theme }}>Diagnosis</div>
                <div className="text-xs font-medium mb-3">Acute Coronary Syndrome</div>

                <div className="text-lg font-bold mb-2" style={{ color: theme }}>℞</div>
                {[
                  { n: 'Tab. Aspirin', d: '325mg', r: 'Oral · OD · 30 days · After food' },
                  { n: 'Tab. Atorvastatin', d: '40mg', r: 'Oral · OD · Continued · At bedtime' },
                ].map((r, i) => (
                  <div key={i} className="mb-2">
                    <div className="text-xs font-semibold">{i+1}. {r.n} {r.d}</div>
                    <div className="text-xs text-slate-500 pl-3">{r.r}</div>
                  </div>
                ))}

                <div className="text-xs font-bold mt-3 mb-1" style={{ color: theme }}>Advice</div>
                <div className="text-xs text-slate-700">Low salt diet · Avoid strenuous activity</div>
                <div className="text-xs font-bold mt-2 mb-1" style={{ color: theme }}>Follow-up</div>
                <div className="text-xs">After 1 week</div>

                {S.customFields.filter(cf => cf.label).map((cf, i) => (
                  <div key={i} className="text-xs mt-1">
                    <span className="text-slate-400">{cf.label}: </span>{cf.value}
                  </div>
                ))}

                <div className="mt-6 flex justify-end">
                  <div className="text-center">
                    <div className="w-28 border-t border-slate-400 pt-1 text-xs text-slate-500">
                      {displayName}
                    </div>
                  </div>
                </div>

                {S.footerNote && (
                  <div className="mt-3 pt-2 border-t border-slate-200 text-xs text-slate-400 text-center">
                    {S.footerNote}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-3 justify-end">
        <button onClick={resetSettings} className="btn-secondary">
          <RefreshCw className="w-4 h-4" /> Reset to Default
        </button>
        <button onClick={handleSave} className="btn-primary px-8">
          {saved ? <><CheckCircle2 className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Settings</>}
        </button>
      </div>
    </div>
  );
}
