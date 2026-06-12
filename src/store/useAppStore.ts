import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Patient, Alert, Vitals, Medication, LabOrder, NursingNote, ChatMessage, MAREntry, QueueEntry, Bed, Staff, Bill, VisitRecord, DoctorAvailability, AppointmentEntry, NursingPhoto, BookingSlot } from '@/types';

interface AppState {
  // Data
  patients: Patient[];
  todayAvailability: DoctorAvailability | null;
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
  visits: Record<string, VisitRecord[]>; // patient visit history
  appointments: AppointmentEntry[];
  nursingPhotos: Record<string, NursingPhoto[]>;
  bookingSlots: BookingSlot[];

  // UI state
  activePatientId: string | null;
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  quickRegisterOpen: boolean;
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
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  openQuickRegister: () => void;
  closeQuickRegister: () => void;
  showToast: (msg: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;
  addVisit: (v: VisitRecord) => void;
  updateVisit: (id: string, patch: Partial<VisitRecord>) => void;
  addAppointment: (a: AppointmentEntry) => void;
  updateAppointment: (id: string, patch: Partial<AppointmentEntry>) => void;
  setTodayAvailability: (a: DoctorAvailability | null) => void;
  assignNurse: (patientId: string, nurseId: number, nurseName: string) => void;
  addNursingPhoto: (photo: NursingPhoto) => void;
  addBookingSlot: (slot: BookingSlot) => void;
  updateBookingSlot: (id: string, patch: Partial<BookingSlot>) => void;
  loadDemo: (doctorName?: string, doctorId?: number) => void;
  resetStore: () => void;
  syncFromBackend: () => Promise<void>;
  refreshAppointments: () => Promise<void>;
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
  { id: 'P006', name: 'Kavitha Rao', age: 70, gender: 'F', mrn: 'MRN-006', bloodGroup: 'AB+', status: 'OPD', admitDate: '2026-05-25', diagnosis: 'COPD Exacerbation', attendingDoctor: 'Dr. Arjun Mehta', attendingDoctorId: 1, priority: 'Stable', allergies: [] },
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

const EMPTY_STATE = {
  patients: [] as Patient[],
  alerts: [] as Alert[],
  vitals: {} as Record<string, Vitals[]>,
  prescriptions: {} as Record<string, Medication[]>,
  labOrders: {} as Record<string, LabOrder[]>,
  nursingNotes: {} as Record<string, NursingNote[]>,
  chatMessages: {} as Record<string, ChatMessage[]>,
  marEntries: {} as Record<string, MAREntry[]>,
  queue: [] as QueueEntry[],
  beds: [] as Bed[],
  staff: [] as Staff[],
  bills: [] as Bill[],
  visits: {} as Record<string, VisitRecord[]>,
  appointments: [] as AppointmentEntry[],
  nursingPhotos: {} as Record<string, NursingPhoto[]>,
  bookingSlots: [] as BookingSlot[],
  todayAvailability: null as DoctorAvailability | null,
  activePatientId: null as string | null,
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  quickRegisterOpen: false,
  toasts: [] as Toast[],
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
  ...EMPTY_STATE,

  setPatients: (p) => set({ patients: p }),
  upsertPatient: (p) => {
    set(s => ({
      patients: s.patients.find(x => x.id === p.id)
        ? s.patients.map(x => x.id === p.id ? p : x)
        : [...s.patients, p]
    }));
    import('@/lib/api').then(({ isApiEnabled, api }) => {
      if (isApiEnabled()) api.post('/patients', p).catch(console.warn);
    });
  },
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
  toggleMobileSidebar: () => set(s => ({ mobileSidebarOpen: !s.mobileSidebarOpen })),
  closeMobileSidebar: () => set({ mobileSidebarOpen: false }),
  openQuickRegister: () => set({ quickRegisterOpen: true, mobileSidebarOpen: false }),
  closeQuickRegister: () => set({ quickRegisterOpen: false }),

  showToast: (message, type = 'info') => {
    const toastId = id();
    set(s => ({ toasts: [...s.toasts, { id: toastId, message, type }] }));
    setTimeout(() => get().removeToast(toastId), 4000);
  },
  removeToast: (toastId) => set(s => ({ toasts: s.toasts.filter(t => t.id !== toastId) })),

  addAppointment: (a) => {
    set(s => ({ appointments: [...s.appointments, a] }));
    import('@/lib/api').then(({ isApiEnabled, api }) => {
      if (isApiEnabled()) api.post('/appointments', a).catch(console.warn);
    });
  },
  updateAppointment: (id, patch) => {
    set(s => ({ appointments: s.appointments.map(a => a.id === id ? { ...a, ...patch } : a) }));
    import('@/lib/api').then(({ isApiEnabled, api }) => {
      if (isApiEnabled()) api.patch(`/appointments/${id}`, patch).catch(console.warn);
    });
  },
  refreshAppointments: async () => {
    const { isApiEnabled, api } = await import('@/lib/api');
    if (!isApiEnabled()) return;
    try {
      const apts = await api.get<AppointmentEntry[]>('/appointments');
      set({ appointments: apts });
    } catch { /* silently ignore — stale data is acceptable */ }
  },
  addVisit: (v) => {
    set(s => ({
      visits: { ...s.visits, [v.patientId]: [v, ...(s.visits[v.patientId] ?? [])] },
    }));
    import('@/lib/api').then(({ isApiEnabled, api }) => {
      if (isApiEnabled()) api.post('/visits', v).catch(console.warn);
    });
  },
  updateVisit: (id, patch) => set(s => ({
    visits: Object.fromEntries(
      Object.entries(s.visits).map(([pid, list]) => [
        pid,
        list.map(v => v.id === id ? { ...v, ...patch } : v),
      ])
    ),
  })),
  setTodayAvailability: (a) => set({ todayAvailability: a }),
  assignNurse: (patientId, nurseId, nurseName) => set(s => ({
    patients: s.patients.map(p => p.id === patientId ? { ...p, assignedNurseId: nurseId, assignedNurseName: nurseName } : p),
    queue: s.queue.map(q => q.patientId === patientId ? { ...q, assignedNurse: nurseName } : q),
  })),

  addNursingPhoto: (photo) => set(s => ({
    nursingPhotos: { ...s.nursingPhotos, [photo.patientId]: [photo, ...(s.nursingPhotos[photo.patientId] ?? [])] },
  })),
  addBookingSlot: (slot) => set(s => ({ bookingSlots: [...s.bookingSlots, slot] })),
  updateBookingSlot: (id, patch) => set(s => ({ bookingSlots: s.bookingSlots.map(sl => sl.id === id ? { ...sl, ...patch } : sl) })),

  loadDemo: (doctorName?: string, doctorId?: number) => {
    const doc = doctorName || 'Dr. Arjun Mehta';
    const docId = doctorId ?? 1;
    const patients = DEMO_PATIENTS.map(p => ({ ...p, attendingDoctor: doc, attendingDoctorId: docId }));
    const prescriptions: Record<string, Medication[]> = {};
    for (const [pid, rxList] of Object.entries(DEMO_RX)) {
      prescriptions[pid] = rxList.map(rx => ({ ...rx, prescribedBy: doc }));
    }
    const queue = DEMO_QUEUE.map(q => ({
      ...q,
      assignedDoctor: q.assignedDoctor ? doc : q.assignedDoctor,
    }));
    // Build appointments relative to today (only OPD patients: P003, P005)
    const d = (n: number) => { const dt = new Date(); dt.setDate(dt.getDate() + n); return dt.toISOString().slice(0, 10); };
    const appointments: AppointmentEntry[] = [
      { id: 'APT001', patientId: 'P003', patientName: 'Vikram Singh', patientAge: 35, date: d(0), time: '09:00', reason: 'Fever with chills, R/O Malaria', status: 'scheduled', doctorId: docId, doctorName: doc, clinicId: 'C1', clinicName: 'Roy Clinic', createdAt: now(), token: 1, consultationFee: 500, amountPaid: 500, paymentMode: 'cash' },
      { id: 'APT002', patientId: 'P005', patientName: 'Arun Joshi', patientAge: 28, date: d(0), time: '11:00', reason: 'Acute Gastroenteritis', status: 'scheduled', doctorId: docId, doctorName: doc, clinicId: 'C1', clinicName: 'Roy Clinic', createdAt: now(), token: 2, consultationFee: 500, amountPaid: 500, paymentMode: 'upi' },
      { id: 'APT003', patientId: 'P003', patientName: 'Vikram Singh', patientAge: 35, date: d(2), time: '10:00', reason: 'Fever follow-up', status: 'scheduled', doctorId: docId, doctorName: doc, clinicId: 'C1', clinicName: 'Roy Clinic', createdAt: now(), token: 1, consultationFee: 500, amountPaid: 500, paymentMode: 'cash' },
      { id: 'APT004', patientId: 'P005', patientName: 'Arun Joshi', patientAge: 28, date: d(3), time: '09:30', reason: 'Gastro follow-up', status: 'scheduled', doctorId: docId, doctorName: doc, clinicId: 'C2', clinicName: 'City Nursing Home OPD', createdAt: now(), token: 1, consultationFee: 300, amountPaid: 300, paymentMode: 'cash' },
      { id: 'APT005', patientId: 'P006', patientName: 'Kavitha Rao', patientAge: 70, date: d(5), time: '10:00', reason: 'COPD post-discharge review', status: 'scheduled', doctorId: docId, doctorName: doc, clinicId: 'C1', clinicName: 'Roy Clinic', createdAt: now(), token: 1, consultationFee: 500, amountPaid: 500, paymentMode: 'insurance' },
    ];
    return set({
      patients,
      prescriptions,
      vitals: DEMO_VITALS,
      labOrders: DEMO_LABS,
      nursingNotes: DEMO_NOTES,
      chatMessages: DEMO_CHAT,
      queue,
      beds: DEMO_BEDS,
      staff: DEMO_STAFF,
      appointments,
      // Set today's clinic to Roy Clinic to match today's demo appointments (APT001, APT002)
      todayAvailability: { date: d(0), clinicId: 'C1', clinicName: 'Roy Clinic', isOpen: true, startTime: '09:00', endTime: '13:00', maxPatients: 15 },
      alerts: [
        { id: 'A1', patientId: 'P001', patientName: 'Ramesh Kumar', type: 'BP Alert', message: 'BP 178/105 — Hypertensive Urgency', severity: 'critical', time: '2026-06-04T08:00:00', acknowledged: false },
        { id: 'A2', patientId: 'P002', patientName: 'Sunita Devi', type: 'Sugar Alert', message: 'Blood sugar 450 mg/dL — Critical', severity: 'critical', time: '2026-06-04T08:00:00', acknowledged: false },
        { id: 'A3', patientId: 'P004', patientName: 'Meena Patel', type: 'SpO2 Alert', message: 'SpO2 91% — Desaturation', severity: 'critical', time: '2026-06-04T08:00:00', acknowledged: false },
      ],
    });
  },

  resetStore: () => set({ ...EMPTY_STATE }),

  syncFromBackend: async () => {
    const { isApiEnabled, api } = await import('@/lib/api');
    if (!isApiEnabled()) return;
    try {
      // Fetch patients
      const patients = await api.get<Patient[]>('/patients');
      // Build visits map
      const visitsArr = await api.get<VisitRecord[]>('/visits/clinic');
      const visitsMap: Record<string, VisitRecord[]> = {};
      for (const v of visitsArr) {
        if (!visitsMap[v.patientId]) visitsMap[v.patientId] = [];
        visitsMap[v.patientId].push(v);
      }
      // Fetch appointments (next 30 days)
      const appointments = await api.get<AppointmentEntry[]>('/appointments');
      set({ patients, visits: visitsMap, appointments });
    } catch (err) {
      console.warn('[vyasa] backend sync failed:', err);
    }
  },
    }),
    {
      name: 'vyasa-app',
      partialize: (s) => ({
        patients: s.patients,
        visits: s.visits,
        vitals: s.vitals,
        prescriptions: s.prescriptions,
        labOrders: s.labOrders,
        nursingNotes: s.nursingNotes,
        appointments: s.appointments,
        alerts: s.alerts,
        queue: s.queue,
        beds: s.beds,
        staff: s.staff,
        bills: s.bills,
        todayAvailability: s.todayAvailability,
        nursingPhotos: s.nursingPhotos,
        bookingSlots: s.bookingSlots,
        sidebarCollapsed: s.sidebarCollapsed,
      }),
    }
  )
);

// helper used across the app
export function ts() { return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }); }
export function nowIso() { return now(); }
export function uid() { return id(); }
