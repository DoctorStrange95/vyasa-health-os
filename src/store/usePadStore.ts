import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Clinic, DaySchedule, FavDrug, FavPrescription, Medication } from '@/types';
import { api, isApiEnabled } from '@/lib/api';

export interface PadSettings {
  doctorName: string;
  degrees: string;
  specialty: string;
  regNumber: string;
  clinicName: string;
  address: string;
  phone: string;
  email: string;
  timings: string;
  quote: string;
  logoUrl: string;       // clinic/hospital logo (data URL or hosted URL)
  stampUrl: string;      // doctor's rubber stamp image
  footerNote: string;
  theme: 'teal' | 'navy' | 'maroon' | 'dark';
  showLogo: boolean;
  showQuote: boolean;
  showTimings: boolean;
  customFields: { label: string; value: string }[];
  qrCodeUrl?: string;
  fee?: number;
}

const DEFAULT: PadSettings = {
  doctorName: '',
  degrees: '',
  specialty: '',
  regNumber: '',
  clinicName: '',
  address: '',
  phone: '',
  email: '',
  timings: 'Mon–Sat  9am–5pm',
  quote: '',
  logoUrl: '',
  stampUrl: '',
  footerNote: 'This prescription is valid for 30 days from the date of issue.',
  theme: 'teal',
  showLogo: true,
  showQuote: true,
  showTimings: true,
  customFields: [],
  qrCodeUrl: '',
  fee: undefined,
};

function makeSchedule(
  openDays: number[],
  morning: { start: string; end: string },
  evening?: { start: string; end: string },
  cap = 20,
): DaySchedule[] {
  return Array.from({ length: 7 }, (_, d) => ({
    day: d,
    open: openDays.includes(d),
    sessions: openDays.includes(d)
      ? (evening ? [morning, evening] : [morning])
      : [],
    maxPatients: cap,
  }));
}

const DEMO_CLINICS: Clinic[] = [
  {
    id: 'C1', name: 'Roy Clinic', address: '12 Baguiati Rd, Kolkata – 700059',
    phone: '+91 98765 43210', fee: 500, maxPatients: 25, color: '#0d9488',
    timings: 'Mon–Sat  9am–1pm · 5pm–8pm',
    schedule: makeSchedule([1, 2, 3, 4, 5, 6], { start: '09:00', end: '13:00' }, { start: '17:00', end: '20:00' }, 25),
  },
  {
    id: 'C2', name: 'City Nursing Home OPD', address: '45 VIP Rd, Kolkata – 700052',
    phone: '+91 98123 45678', fee: 300, maxPatients: 15, color: '#0a3d62',
    timings: 'Mon  Wed  Fri  4pm–7pm',
    schedule: makeSchedule([1, 3, 5], { start: '16:00', end: '19:00' }, undefined, 15),
  },
];

interface PadStore {
  settings: PadSettings;
  eSignUrl: string;
  clinics: Clinic[];
  favDrugs: FavDrug[];
  favPrescriptions: FavPrescription[];
  setSettings: (s: Partial<PadSettings>) => void;
  setESign: (url: string) => void;
  resetSettings: () => void;
  addClinic: (c: Clinic) => void;
  updateClinic: (c: Clinic) => void;
  removeClinic: (id: string) => Promise<void>;
  syncClinicsFromApi: () => Promise<void>;
  syncPadFromApi: () => Promise<void>;
  recordPrescriptionUsage: (drugs: Partial<Medication>[], diagnosis: string) => void;
  saveFavBundle: (label: string, drugs: Partial<Medication>[], tags: string[]) => void;
  deleteFavBundle: (id: string) => void;
}

export const usePadStore = create<PadStore>()(
  persist(
    (set, get) => ({
      settings: DEFAULT,
      eSignUrl: '',
      clinics: DEMO_CLINICS,
      favDrugs: [],
      favPrescriptions: [],
      setESign: (url) => {
        set({ eSignUrl: url });
        // Persist to backend so the signature survives across devices
        import('@/lib/api').then(({ isApiEnabled, api }) => {
          if (isApiEnabled()) {
            const { settings: s } = get();
            api.put('/clinics/pad', {
              doctorName: s.doctorName, degrees: s.degrees, specialty: s.specialty,
              regNumber: s.regNumber, address: s.address, phone: s.phone,
              email: s.email, timings: s.timings, clinicName: s.clinicName,
              footerNote: s.footerNote, quote: s.quote, showQuote: s.showQuote,
              showTimings: s.showTimings, theme: s.theme,
              customFields: JSON.stringify(s.customFields),
              eSignUrl: url,
            }).catch(e => console.warn('eSign sync failed:', e));
          }
        });
      },
      setSettings: (s) => {
        set(state => {
          const updated = { ...state.settings, ...s };
          // Sync to backend
          import('@/lib/api').then(({ isApiEnabled, api }) => {
            if (isApiEnabled()) {
              api.put('/clinics/pad', {
                doctorName: updated.doctorName,
                degrees: updated.degrees,
                specialty: updated.specialty,
                regNumber: updated.regNumber,
                address: updated.address,
                phone: updated.phone,
                email: updated.email,
                timings: updated.timings,
                clinicName: updated.clinicName,
                footerNote: updated.footerNote,
                quote: updated.quote,
                showQuote: updated.showQuote,
                showTimings: updated.showTimings,
                theme: updated.theme,
                customFields: JSON.stringify(updated.customFields),
                eSignUrl: get().eSignUrl,
              }).catch((e) => console.warn('PAD sync failed:', e));
            }
          });
          return { settings: updated };
        });
      },
      resetSettings: () => set({ settings: DEFAULT }),
      addClinic: (c) => {
        set(state => ({ clinics: [...state.clinics, c] }));
        if (isApiEnabled()) api.post('/clinics', c).catch(() => {});
      },
      updateClinic: (c) => {
        set(state => ({ clinics: state.clinics.map(x => x.id === c.id ? c : x) }));
        // POST upserts on the backend, so it works for clinics not yet synced
        if (isApiEnabled()) api.post('/clinics', c).catch(() => {});
      },
      removeClinic: async (id) => {
        const prev = get().clinics;
        // Optimistic remove
        set(state => ({ clinics: state.clinics.filter(x => x.id !== id) }));
        if (isApiEnabled()) {
          try {
            await api.del(`/clinics/${id}`);
          } catch (err) {
            // 404 = not on server (was only local) — keep the local removal
            if (err instanceof Error && err.message.includes('404')) return;
            if (err instanceof Error && err.message.includes('not found')) return;
            // Any other error — revert so we don't silently lose a real clinic
            set({ clinics: prev });
            throw new Error('Failed to delete clinic from server', { cause: err });
          }
        }
      },

      // Pull the doctor's real clinics from the backend; replaces local/demo data
      syncClinicsFromApi: async () => {
        if (!isApiEnabled()) return;
        try {
          const rows = await api.get<Clinic[]>('/clinics');
          if (Array.isArray(rows)) {
            set({ clinics: rows.map(r => ({ ...r, schedule: r.schedule ?? [] })) });
          }
        } catch { /* offline / demo — keep local clinics */ }
      },

      syncPadFromApi: async () => {
        if (!isApiEnabled()) return;
        try {
          const d = await api.get<Record<string, unknown>>('/clinics/pad');
          if (!d || typeof d !== 'object') return;

          const localESign = get().eSignUrl;
          const remoteESign = (d.eSignUrl as string) || '';

          set(state => {
            const s = state.settings;
            let cf = s.customFields;
            if (d.customFields !== undefined) {
              cf = Array.isArray(d.customFields)
                ? d.customFields as PadSettings['customFields']
                : typeof d.customFields === 'string'
                  ? JSON.parse(d.customFields as string) as PadSettings['customFields']
                  : cf;
            }
            const merged: PadSettings = {
              ...s,
              doctorName:  d.doctorName  !== undefined ? String(d.doctorName)  : s.doctorName,
              degrees:     d.degrees     !== undefined ? String(d.degrees)     : s.degrees,
              specialty:   d.specialty   !== undefined ? String(d.specialty)   : s.specialty,
              regNumber:   d.regNumber   !== undefined ? String(d.regNumber)   : s.regNumber,
              address:     d.address     !== undefined ? String(d.address)     : s.address,
              phone:       d.phone       !== undefined ? String(d.phone)       : s.phone,
              email:       d.email       !== undefined ? String(d.email)       : s.email,
              timings:     d.timings     !== undefined ? String(d.timings)     : s.timings,
              clinicName:  d.clinicName  !== undefined ? String(d.clinicName)  : s.clinicName,
              footerNote:  d.footerNote  !== undefined ? String(d.footerNote)  : s.footerNote,
              quote:       d.quote       !== undefined ? String(d.quote)       : s.quote,
              showQuote:   d.showQuote   !== undefined ? Boolean(d.showQuote)  : s.showQuote,
              showTimings: d.showTimings !== undefined ? Boolean(d.showTimings): s.showTimings,
              theme:       d.theme       !== undefined ? (d.theme as PadSettings['theme']) : s.theme,
              customFields: cf,
            };
            // Backend wins if it has an esign; otherwise keep local
            return { eSignUrl: remoteESign || state.eSignUrl, settings: merged };
          });

          // If backend has no esign but this device does, push it up so other devices get it
          if (!remoteESign && localESign) {
            const s = get().settings;
            api.put('/clinics/pad', {
              doctorName: s.doctorName, degrees: s.degrees, specialty: s.specialty,
              regNumber: s.regNumber, address: s.address, phone: s.phone,
              email: s.email, timings: s.timings, clinicName: s.clinicName,
              footerNote: s.footerNote, quote: s.quote, showQuote: s.showQuote,
              showTimings: s.showTimings, theme: s.theme,
              customFields: JSON.stringify(s.customFields),
              eSignUrl: localESign,
            }).catch(() => {});
          }
        } catch { /* offline — keep local */ }
      },

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      recordPrescriptionUsage: (drugs, _diagnosis) => {
        const now = new Date().toISOString();
        set(state => {
          const updated = [...state.favDrugs];
          for (const d of drugs) {
            if (!d.drug) continue;
            const idx = updated.findIndex(f => f.name === d.drug);
            if (idx >= 0) {
              updated[idx] = { ...updated[idx], usageCount: updated[idx].usageCount + 1 };
            } else {
              updated.push({
                id: `fd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                name: d.drug,
                dose: d.dose ?? '',
                route: d.route ?? '',
                frequency: d.frequency ?? '',
                duration: d.duration ?? '',
                instructions: d.instructions ?? '',
                usageCount: 1,
              });
            }
          }
          return { favDrugs: updated.sort((a, b) => b.usageCount - a.usageCount).slice(0, 30) };
        });
        // Auto-save bundles with 3+ drugs as a favourite if it doesn't already exist
        if (drugs.length >= 3) {
          const existing = get().favPrescriptions;
          const key = drugs.map(d => d.drug).sort().join('|');
          const alreadySaved = existing.some(p => p.drugs.map(d => d.drug).sort().join('|') === key);
          if (!alreadySaved) {
            set(state => ({
              favPrescriptions: [...state.favPrescriptions, {
                id: `fp-${Date.now()}`,
                label: drugs.slice(0, 2).map(d => d.drug).join(' + '),
                drugs,
                usageCount: 1,
                lastUsed: now,
                tags: [],
              }],
            }));
          } else {
            set(state => ({
              favPrescriptions: state.favPrescriptions.map(p =>
                p.drugs.map(d => d.drug).sort().join('|') === key
                  ? { ...p, usageCount: p.usageCount + 1, lastUsed: now }
                  : p
              ),
            }));
          }
        }
      },

      saveFavBundle: (label, drugs, tags) => {
        set(state => ({
          favPrescriptions: [...state.favPrescriptions, {
            id: `fp-${Date.now()}`,
            label,
            drugs,
            usageCount: 0,
            lastUsed: new Date().toISOString(),
            tags,
          }],
        }));
      },

      deleteFavBundle: (id) => {
        set(state => ({ favPrescriptions: state.favPrescriptions.filter(p => p.id !== id) }));
      },
    }),
    { name: 'vyasa-pad-settings' }
  )
);
