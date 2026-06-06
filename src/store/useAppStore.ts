import { create } from 'zustand';
import type { Patient, Alert, Vitals, Medication, LabOrder, NursingNote, ChatMessage, MAREntry, QueueEntry, Bed, Staff, Bill } from '@/types';

interface AppState {
  // Data
  patients: Patient[];
  alerts: Alert[];
  vitals: Record<string, Vitals[]>;
  prescriptions: Record<string, Medication[]>;
  labOrders: Record<string, LabOrder[]>;
  nursingNotes: Record<string, NursingNote[]>;
  chatMessages: Record<string, ChatMessage[]>;
  marEntries: Record<string, MAREntry[]>;
  queue: QueueEntry[];
  beds: Bed[];
  staff: Staff[];
  bills: Bill[];

  // UI state
  activePatientId: string | null;
  sidebarCollapsed: boolean;
  toasts: Toast[];

  // Actions
  setPatients: (p: Patient[]) => void;
  upsertPatient: (p: Patient) => void;
  setAlerts: (a: Alert[]) => void;
  addAlert: (a: Alert) => void;
  acknowledgeAlert: (id: string) => void;
  setVitals: (patientId: string, v: Vitals[]) => void;
  addVitals: (v: Vitals) => void;
  setPrescriptions: (patientId: string, rx: Medication[]) => void;
  addPrescription: (rx: Medication) => void;
  setLabOrders: (patientId: string, labs: LabOrder[]) => void;
  addLabOrder: (lab: LabOrder) => void;
  setNursingNotes: (patientId: string, notes: NursingNote[]) => void;
  addNursingNote: (note: NursingNote) => void;
  setChatMessages: (patientId: string, msgs: ChatMessage[]) => void;
  addChatMessage: (msg: ChatMessage) => void;
  setMAREntries: (patientId: string, entries: MAREntry[]) => void;
  setQueue: (q: QueueEntry[]) => void;
  setBeds: (b: Bed[]) => void;
  setStaff: (s: Staff[]) => void;
  setBills: (b: Bill[]) => void;
  setActivePatient: (id: string | null) => void;
  toggleSidebar: () => void;
  showToast: (msg: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;
  loadDemo: () => void;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

const now = () => new Date().toISOString();
const id = () => Math.random().toString(36).slice(2, 9);

const DEMO_PATIENTS: Patient[] = [
  { id: 'P001', name: 'Ramesh Kumar', age: 62, gender: 'M', mrn: 'MRN-001', phone: '9876543210', bloodGroup: 'A+', status: 'IPD', ward: 'Cardiology', bed: 'C-04', admitDate: '2026-06-01', diagnosis: 'Hypertensive Urgency, IHD', attendingDoctor: 'Dr. Arjun Mehta', attendingDoctorId: 1, priority: 'Critical', allergies: ['Penicillin'], insurance: 'Star Health' },
  { id: 'P002', name: 'Sunita Devi', age: 45, gender: 'F', mrn: 'MRN-002', phone: '9123456780', bloodGroup: 'B+', status: 'IPD', ward: 'Medicine', bed: 'M-07', admitDate: '2026-06-02', diagnosis: 'Diabetic Ketoacidosis', attendingDoctor: 'Dr. Arjun Mehta', attendingDoctorId: 1, priority: 'High', allergies: [], insurance: 'CGHS' },
  { id: 'P003', name: 'Vikram Singh', age: 35, gender: 'M', mrn: 'MRN-003', status: 'OPD', diagnosis: 'Fever with chills, R/O Malaria', attendingDoctor: 'Dr. Arjun Mehta', attendingDoctorId: 1, priority: 'Medium', allergies: [] },
  { id: 'P004', name: 'Meena Patel', age: 55, gender: 'F', mrn: 'MRN-004', bloodGroup: 'O+', status: 'IPD', ward: 'ICU', bed: 'ICU-02', admitDate: '2026-05-30', diagnosis: 'Septic Shock, Post-op', attendingDoctor: 'Dr. Arjun Mehta', attendingDoctorId: 1, priority: 'Critical', allergies: ['Sulfa'], insurance: 'Mediclaim' },
  { id: 'P005', name: 'Arun Joshi', age: 28, gender: 'M', mrn: 'MRN-005', status: 'OPD', diagnosis: 'Acute Gastroenteritis', attendingDoctor: 'Dr. Arjun Mehta', attendingDoctorId: 1, priority: 'Stable', allergies: [] },
  { id: 'P006', name: 'Kavitha Rao', age: 70, gender: 'F', mrn: 'MRN-006', bloodGroup: 'AB+', status: 'Discharged', admitDate: '2026-05-25', diagnosis: 'COPD Exacerbation', attendingDoctor: 'Dr. Arjun Mehta', attendingDoctorId: 1, priority: 'Stable', allergies: [] },
];

const DEMO_VITALS: Record<string, Vitals[]> = {
  P001: [
    { id: 'V1', patientId: 'P001', time: '2026-06-04T08:00:00', recordedBy: 'Priya Sharma', bp: '178/105', pulse: 98, temp: 98.6, spo2: 96, rr: 18, alert: true },
    { id: 'V2', patientId: 'P001', time: '2026-06-04T12:00:00', recordedBy: 'Priya Sharma', bp: '162/98', pulse: 88, temp: 98.8, spo2: 97, rr: 16 },
    { id: 'V3', patientId: 'P001', time: '2026-06-04T16:00:00', recordedBy: 'Priya Sharma', bp: '148/92', pulse: 82, temp: 98.4, spo2: 98, rr: 16 },
  ],
  P002: [
    { id: 'V4', patientId: 'P002', time: '2026-06-04T08:00:00', recordedBy: 'Priya Sharma', bp: '110/70', pulse: 112, temp: 100.2, spo2: 95, rr: 22, sugar: 450, alert: true },
    { id: 'V5', patientId: 'P002', time: '2026-06-04T12:00:00', recordedBy: 'Priya Sharma', bp: '118/74', pulse: 102, temp: 99.4, spo2: 97, rr: 18, sugar: 310 },
  ],
  P004: [
    { id: 'V6', patientId: 'P004', time: '2026-06-04T08:00:00', recordedBy: 'Priya Sharma', bp: '90/60', pulse: 122, temp: 103.2, spo2: 91, rr: 28, gcs: 12, alert: true },
  ],
};

const DEMO_RX: Record<string, Medication[]> = {
  P001: [
    { id: 'RX1', drug: 'Tab. Amlodipine', dose: '5mg', route: 'Oral', frequency: 'OD', duration: 'Continued', instructions: 'With food', prescribedBy: 'Dr. Arjun Mehta', time: '2026-06-01T08:15:00', status: 'active' },
    { id: 'RX2', drug: 'Tab. Metoprolol', dose: '50mg', route: 'Oral', frequency: 'BD', duration: 'Continued', instructions: 'With food', prescribedBy: 'Dr. Arjun Mehta', time: '2026-06-01T08:15:00', status: 'active' },
    { id: 'RX3', drug: 'Tab. Aspirin', dose: '75mg', route: 'Oral', frequency: 'OD', duration: 'Continued', instructions: 'After food', prescribedBy: 'Dr. Arjun Mehta', time: '2026-06-01T08:15:00', status: 'active' },
    { id: 'RX4', drug: 'Inj. Lasix', dose: '40mg', route: 'IV', frequency: 'BD', duration: '3 days', prescribedBy: 'Dr. Arjun Mehta', time: '2026-06-01T08:15:00', status: 'active' },
  ],
  P002: [
    { id: 'RX5', drug: 'Inj. Actrapid', dose: '4 units', route: 'SC', frequency: 'Per sliding scale', duration: '24h', prescribedBy: 'Dr. Arjun Mehta', time: '2026-06-02T09:00:00', status: 'active' },
    { id: 'RX6', drug: 'IV Fluids NS', dose: '500ml', route: 'IV', frequency: 'Q8H', duration: '24h', prescribedBy: 'Dr. Arjun Mehta', time: '2026-06-02T09:00:00', status: 'active' },
  ],
};

const DEMO_LABS: Record<string, LabOrder[]> = {
  P001: [
    { id: 'L1', patientId: 'P001', testName: 'CBC', orderedBy: 'Dr. Arjun Mehta', orderedAt: '2026-06-01T08:30:00', status: 'resulted', result: 'WBC 11.2, Hb 11.4, Plt 220', refRange: 'Normal', unit: 'g/dL' },
    { id: 'L2', patientId: 'P001', testName: 'Lipid Profile', orderedBy: 'Dr. Arjun Mehta', orderedAt: '2026-06-01T08:30:00', status: 'resulted', result: 'LDL 142, HDL 38, TG 198', critical: true },
    { id: 'L3', patientId: 'P001', testName: 'ECG', orderedBy: 'Dr. Arjun Mehta', orderedAt: '2026-06-04T10:00:00', status: 'ordered' },
  ],
  P002: [
    { id: 'L4', patientId: 'P002', testName: 'Blood Sugar', orderedBy: 'Dr. Arjun Mehta', orderedAt: '2026-06-02T09:00:00', status: 'resulted', result: '450', unit: 'mg/dL', refRange: '70-140', critical: true },
    { id: 'L5', patientId: 'P002', testName: 'ABG', orderedBy: 'Dr. Arjun Mehta', orderedAt: '2026-06-02T09:00:00', status: 'processing' },
  ],
};

const DEMO_NOTES: Record<string, NursingNote[]> = {
  P001: [
    { id: 'N1', patientId: 'P001', time: '2026-06-04T08:15:00', by: 'Priya Sharma', type: 'Assessment', note: 'Patient alert, oriented x3. BP elevated. IV access patent. Foley in situ, draining clear urine.' },
    { id: 'N2', patientId: 'P001', time: '2026-06-04T12:20:00', by: 'Priya Sharma', type: 'Medication', note: 'IV Lasix 40mg given as ordered. Urine output 200ml in 2h post-dose.' },
  ],
  P004: [
    { id: 'N3', patientId: 'P004', time: '2026-06-04T08:05:00', by: 'Priya Sharma', type: 'Critical', note: 'Pt desaturating. O2 increased to 10L/min. Dr. Mehta informed. On Noradrenaline 0.3 mcg/kg/min.' },
  ],
};

const DEMO_CHAT: Record<string, ChatMessage[]> = {
  P001: [
    { id: 'C1', patientId: 'P001', senderId: 2, senderName: 'Priya Sharma', senderRole: 'nurse', message: 'BP still 178/105. IV Labetalol PRN order needed?', time: '2026-06-04T09:10:00' },
    { id: 'C2', patientId: 'P001', senderId: 1, senderName: 'Dr. Arjun Mehta', senderRole: 'doctor', message: 'Yes. Give Inj. Labetalol 20mg IV slow over 2 min. Repeat Q15m if BP > 170. Max 3 doses.', time: '2026-06-04T09:15:00', type: 'order' },
    { id: 'C3', patientId: 'P001', senderId: 2, senderName: 'Priya Sharma', senderRole: 'nurse', message: '1st dose given at 09:18. BP now 162/98 at 09:30. Continuing monitoring.', time: '2026-06-04T09:32:00' },
  ],
};

const DEMO_QUEUE: QueueEntry[] = [
  { id: 'Q1', patientId: 'Q-P1', patientName: 'Rohan Shah', token: 1, reason: 'Fever for 3 days', status: 'completed', registeredAt: '2026-06-04T09:00:00', assignedDoctor: 'Dr. Arjun Mehta' },
  { id: 'Q2', patientId: 'Q-P2', patientName: 'Deepa Nair', token: 2, reason: 'Follow-up HTN', status: 'in-progress', registeredAt: '2026-06-04T09:15:00', assignedDoctor: 'Dr. Arjun Mehta', waitMins: 35 },
  { id: 'Q3', patientId: 'Q-P3', patientName: 'Manish Verma', token: 3, reason: 'Back pain', status: 'waiting', registeredAt: '2026-06-04T09:45:00', waitMins: 20 },
  { id: 'Q4', patientId: 'Q-P4', patientName: 'Lalita Gupta', token: 4, reason: 'Diabetes review', status: 'waiting', registeredAt: '2026-06-04T10:00:00', waitMins: 5 },
  { id: 'Q5', patientId: 'Q-P5', patientName: 'Suresh Pillai', token: 5, reason: 'Chest pain — urgent', status: 'waiting', registeredAt: '2026-06-04T10:20:00', waitMins: 2 },
];

const DEMO_BEDS: Bed[] = [
  { id: 'B1', number: 'C-01', ward: 'Cardiology', type: 'General', status: 'occupied', patientId: 'P-X', patientName: 'Other Patient' },
  { id: 'B2', number: 'C-02', ward: 'Cardiology', type: 'General', status: 'available' },
  { id: 'B3', number: 'C-03', ward: 'Cardiology', type: 'Private', status: 'available' },
  { id: 'B4', number: 'C-04', ward: 'Cardiology', type: 'General', status: 'occupied', patientId: 'P001', patientName: 'Ramesh Kumar' },
  { id: 'B5', number: 'ICU-01', ward: 'ICU', type: 'ICU', status: 'occupied' },
  { id: 'B6', number: 'ICU-02', ward: 'ICU', type: 'ICU', status: 'occupied', patientId: 'P004', patientName: 'Meena Patel' },
  { id: 'B7', number: 'ICU-03', ward: 'ICU', type: 'ICU', status: 'available' },
  { id: 'B8', number: 'M-07', ward: 'Medicine', type: 'Semi-Private', status: 'occupied', patientId: 'P002', patientName: 'Sunita Devi' },
];

const DEMO_STAFF: Staff[] = [
  { id: 1, name: 'Dr. Arjun Mehta', role: 'doctor', email: 'arjun@vyasa.health', phone: '9876500001', department: 'Medicine', specialty: 'Internal Medicine', shift: 'Day', status: 'active' },
  { id: 2, name: 'Priya Sharma', role: 'nurse', email: 'priya@vyasa.health', phone: '9876500002', department: 'ICU', shift: 'Day', status: 'active' },
  { id: 3, name: 'Ravi Kumar', role: 'pharmacist', email: 'ravi@vyasa.health', phone: '9876500003', department: 'Pharmacy', shift: 'Day', status: 'active' },
  { id: 4, name: 'Sunita Rao', role: 'labtech', email: 'sunita@vyasa.health', phone: '9876500004', department: 'Laboratory', shift: 'Day', status: 'active' },
  { id: 5, name: 'Dr. Preethi Nair', role: 'doctor', email: 'preethi@vyasa.health', phone: '9876500005', department: 'Surgery', specialty: 'General Surgery', shift: 'Night', status: 'active' },
  { id: 6, name: 'Anand Kumar', role: 'nurse', email: 'anand@vyasa.health', phone: '9876500006', department: 'Medicine', shift: 'Night', status: 'off-duty' },
];

export const useAppStore = create<AppState>()((set, get) => ({
  patients: [],
  alerts: [],
  vitals: {},
  prescriptions: {},
  labOrders: {},
  nursingNotes: {},
  chatMessages: {},
  marEntries: {},
  queue: [],
  beds: [],
  staff: [],
  bills: [],
  activePatientId: null,
  sidebarCollapsed: false,
  toasts: [],

  setPatients: (p) => set({ patients: p }),
  upsertPatient: (p) => set(s => ({
    patients: s.patients.find(x => x.id === p.id)
      ? s.patients.map(x => x.id === p.id ? p : x)
      : [...s.patients, p]
  })),
  setAlerts: (a) => set({ alerts: a }),
  addAlert: (a) => set(s => ({ alerts: [a, ...s.alerts] })),
  acknowledgeAlert: (id) => set(s => ({
    alerts: s.alerts.map(a => a.id === id ? { ...a, acknowledged: true } : a)
  })),
  setVitals: (pid, v) => set(s => ({ vitals: { ...s.vitals, [pid]: v } })),
  addVitals: (v) => set(s => ({
    vitals: { ...s.vitals, [v.patientId]: [v, ...(s.vitals[v.patientId] || [])] }
  })),
  setPrescriptions: (pid, rx) => set(s => ({ prescriptions: { ...s.prescriptions, [pid]: rx } })),
  addPrescription: (rx) => set(s => ({
    prescriptions: { ...s.prescriptions, [rx.patientId ?? '']: [rx, ...(s.prescriptions[rx.patientId ?? ''] || [])] }
  })),
  setLabOrders: (pid, labs) => set(s => ({ labOrders: { ...s.labOrders, [pid]: labs } })),
  addLabOrder: (lab) => set(s => ({
    labOrders: { ...s.labOrders, [lab.patientId]: [lab, ...(s.labOrders[lab.patientId] || [])] }
  })),
  setNursingNotes: (pid, notes) => set(s => ({ nursingNotes: { ...s.nursingNotes, [pid]: notes } })),
  addNursingNote: (note) => set(s => ({
    nursingNotes: { ...s.nursingNotes, [note.patientId]: [note, ...(s.nursingNotes[note.patientId] || [])] }
  })),
  setChatMessages: (pid, msgs) => set(s => ({ chatMessages: { ...s.chatMessages, [pid]: msgs } })),
  addChatMessage: (msg) => set(s => ({
    chatMessages: { ...s.chatMessages, [msg.patientId]: [...(s.chatMessages[msg.patientId] || []), msg] }
  })),
  setMAREntries: (pid, entries) => set(s => ({ marEntries: { ...s.marEntries, [pid]: entries } })),
  setQueue: (q) => set({ queue: q }),
  setBeds: (b) => set({ beds: b }),
  setStaff: (s2) => set({ staff: s2 }),
  setBills: (b) => set({ bills: b }),
  setActivePatient: (id) => set({ activePatientId: id }),
  toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  showToast: (message, type = 'info') => {
    const toastId = id();
    set(s => ({ toasts: [...s.toasts, { id: toastId, message, type }] }));
    setTimeout(() => get().removeToast(toastId), 4000);
  },
  removeToast: (toastId) => set(s => ({ toasts: s.toasts.filter(t => t.id !== toastId) })),

  loadDemo: () => set({
    patients: DEMO_PATIENTS,
    vitals: DEMO_VITALS,
    prescriptions: DEMO_RX,
    labOrders: DEMO_LABS,
    nursingNotes: DEMO_NOTES,
    chatMessages: DEMO_CHAT,
    queue: DEMO_QUEUE,
    beds: DEMO_BEDS,
    staff: DEMO_STAFF,
    alerts: [
      { id: 'A1', patientId: 'P001', patientName: 'Ramesh Kumar', type: 'BP Alert', message: 'BP 178/105 — Hypertensive Urgency', severity: 'critical', time: '2026-06-04T08:00:00', acknowledged: false },
      { id: 'A2', patientId: 'P002', patientName: 'Sunita Devi', type: 'Sugar Alert', message: 'Blood sugar 450 mg/dL — Critical', severity: 'critical', time: '2026-06-04T08:00:00', acknowledged: false },
      { id: 'A3', patientId: 'P004', patientName: 'Meena Patel', type: 'SpO2 Alert', message: 'SpO2 91% — Desaturation', severity: 'critical', time: '2026-06-04T08:00:00', acknowledged: false },
    ],
  }),
}));

// helper used across the app
export function ts() { return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }); }
export function nowIso() { return now(); }
export function uid() { return id(); }
