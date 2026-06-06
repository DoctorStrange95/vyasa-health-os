// ─── Auth ────────────────────────────────────────────────────────────────────

export type Role =
  | 'doctor'
  | 'nurse'
  | 'pharmacist'
  | 'labtech'
  | 'admin'
  | 'billing'
  | 'receptionist'
  | 'patient';

export interface StaffUser {
  id: number;
  name: string;
  role: Role;
  email: string;
  specialty?: string;
  department?: string;
  hospital?: string;
  avatar?: string;
}

// ─── Patient ─────────────────────────────────────────────────────────────────

export type PatientStatus = 'OPD' | 'IPD' | 'Discharged' | 'Critical';
export type Priority = 'Critical' | 'High' | 'Medium' | 'Stable';

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: 'M' | 'F' | 'Other';
  mrn: string;
  phone?: string;
  email?: string;
  bloodGroup?: string;
  status: PatientStatus;
  ward?: string;
  bed?: string;
  admitDate?: string;
  diagnosis?: string;
  attendingDoctor?: string;
  attendingDoctorId?: number;
  priority: Priority;
  allergies?: string[];
  insurance?: string;
}

// ─── Vitals ──────────────────────────────────────────────────────────────────

export interface Vitals {
  id: string;
  patientId: string;
  time: string;
  recordedBy: string;
  bp?: string;
  pulse?: number;
  temp?: number;
  spo2?: number;
  rr?: number;
  weight?: number;
  height?: number;
  gcs?: number;
  sugar?: number;
  notes?: string;
  alert?: boolean;
}

// ─── Prescription ─────────────────────────────────────────────────────────────

export type RxStatus = 'active' | 'discontinued' | 'completed';

export interface Medication {
  id: string;
  patientId?: string;
  drug: string;
  dose: string;
  route: string;
  frequency: string;
  duration: string;
  instructions?: string;
  prescribedBy: string;
  time: string;
  status: RxStatus;
}

// ─── Lab ─────────────────────────────────────────────────────────────────────

export type LabStatus = 'ordered' | 'collected' | 'processing' | 'resulted' | 'critical';

export interface LabOrder {
  id: string;
  patientId: string;
  testName: string;
  panel?: string;
  orderedBy: string;
  orderedAt: string;
  status: LabStatus;
  result?: string;
  unit?: string;
  refRange?: string;
  critical?: boolean;
  resultTime?: string;
}

// ─── Notes ───────────────────────────────────────────────────────────────────

export interface NursingNote {
  id: string;
  patientId: string;
  time: string;
  by: string;
  type: string;
  note: string;
}

export interface ConsultNote {
  id: string;
  patientId: string;
  time: string;
  by: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

// ─── MAR ─────────────────────────────────────────────────────────────────────

export interface MAREntry {
  id: string;
  patientId: string;
  rxId: string;
  drug: string;
  dose: string;
  scheduledTime: string;
  givenTime?: string;
  givenBy?: string;
  status: 'scheduled' | 'given' | 'missed' | 'held';
  notes?: string;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  patientId: string;
  senderId: number;
  senderName: string;
  senderRole: Role;
  message: string;
  time: string;
  type?: 'order' | 'alert' | 'message';
}

// ─── Alert ───────────────────────────────────────────────────────────────────

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface Alert {
  id: string;
  patientId: string;
  patientName: string;
  type: string;
  message: string;
  severity: AlertSeverity;
  time: string;
  acknowledged: boolean;
}

// ─── OPD Queue ───────────────────────────────────────────────────────────────

export type QueueStatus = 'waiting' | 'in-progress' | 'completed' | 'no-show';

export interface QueueEntry {
  id: string;
  patientId: string;
  patientName: string;
  token: number;
  reason: string;
  status: QueueStatus;
  registeredAt: string;
  assignedDoctor?: string;
  waitMins?: number;
}

// ─── Bed ─────────────────────────────────────────────────────────────────────

export type BedStatus = 'occupied' | 'available' | 'maintenance' | 'reserved';

export interface Bed {
  id: string;
  number: string;
  ward: string;
  type: 'General' | 'ICU' | 'HDU' | 'NICU' | 'Private' | 'Semi-Private';
  status: BedStatus;
  patientId?: string;
  patientName?: string;
}

// ─── Staff ───────────────────────────────────────────────────────────────────

export interface Staff {
  id: number;
  name: string;
  role: Role;
  email: string;
  phone?: string;
  department?: string;
  specialty?: string;
  shift?: string;
  status: 'active' | 'off-duty' | 'on-leave';
}

// ─── Billing ─────────────────────────────────────────────────────────────────

export interface BillItem {
  id: string;
  description: string;
  category: 'consultation' | 'procedure' | 'medication' | 'lab' | 'room' | 'other';
  quantity: number;
  rate: number;
  amount: number;
}

export interface Bill {
  id: string;
  patientId: string;
  patientName: string;
  items: BillItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  status: 'draft' | 'pending' | 'paid' | 'partially-paid';
  createdAt: string;
  paidAt?: string;
}
