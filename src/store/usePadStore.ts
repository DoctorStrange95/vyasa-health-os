import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Clinic, DaySchedule, FavDrug, FavPrescription, Medication } from '@/types';

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
  logoUrl: string;
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
  clinics: Clinic[];
  favDrugs: FavDrug[];
  favPrescriptions: FavPrescription[];
  setSettings: (s: Partial<PadSettings>) => void;
  resetSettings: () => void;
  addClinic: (c: Clinic) => void;
  updateClinic: (c: Clinic) => void;
  removeClinic: (id: string) => void;
  recordPrescriptionUsage: (drugs: Partial<Medication>[], diagnosis: string) => void;
  saveFavBundle: (label: string, drugs: Partial<Medication>[], tags: string[]) => void;
  deleteFavBundle: (id: string) => void;
}

export const usePadStore = create<PadStore>()(
  persist(
    (set, get) => ({
      settings: DEFAULT,
      clinics: DEMO_CLINICS,
      favDrugs: [],
      favPrescriptions: [],
      setSettings: (s) => set(state => ({ settings: { ...state.settings, ...s } })),
      resetSettings: () => set({ settings: DEFAULT }),
      addClinic: (c) => set(state => ({ clinics: [...state.clinics, c] })),
      updateClinic: (c) => set(state => ({ clinics: state.clinics.map(x => x.id === c.id ? c : x) })),
      removeClinic: (id) => set(state => ({ clinics: state.clinics.filter(x => x.id !== id) })),

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
