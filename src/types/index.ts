// ─── Clinic ───────────────────────────────────────────────────────────────────

export interface DaySchedule {
  day: number;        // 0=Sun 1=Mon … 6=Sat
  open: boolean;
  sessions: { start: string; end: string }[];   // morning + optional evening
  maxPatients: number;
}

export interface ClinicBed {
  id: string;
  number: string;          // e.g. "1", "A-2", "ICU-1"
  ward: string;            // e.g. "General", "ICU", "Private"
  type?: string;           // General / ICU / Private / Semi-Private
}

export interface Clinic {
  id: string;
  name: string;
  address: string;
  state?: string;
  city?: string;
  pincode?: string;
  lat?: number;
  lng?: number;
  phone?: string;
  fee: number;
  maxPatients: number;   // fallback cap when no schedule set
  timings: string;       // auto-generated display string
  schedule: DaySchedule[];
  color?: string;
  beds?: ClinicBed[];    // IPD beds configured for this clinic
}

export interface DoctorAvailability {
  date: string;          // 'YYYY-MM-DD' — stale if not today
  clinicId: string;
  clinicName: string;
  isOpen: boolean;
  startTime: string;     // '09:00'
  endTime: string;       // '13:00'
  maxPatients: number;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export type Role =
  | 'doctor'
  | 'clinic_admin'   // solo-practice doctor who is also their own admin
  | 'nurse'
  | 'pharmacist'
  | 'labtech'
  | 'admin'          // hospital/facility administrator
  | 'billing'
  | 'receptionist'
  | 'patient'
  | 'superadmin';

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

export type PatientStatus = 'OPD' | 'IPD' | 'Discharged' | 'Critical' | 'Deceased' | 'Referred';
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
  assignedNurseId?: number;
  assignedNurseName?: string;
  clinicId?: string;
  priority: Priority;
  allergies?: string[];
  insurance?: string;
  deathDate?: string;
  deathCause?: string;
  referredHospital?: string;
  referredDept?: string;
  referredDoctor?: string;
  referralReason?: string;
  referralUrgency?: string;
  locality?: string;
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
  urgency?: 'routine' | 'urgent' | 'stat';
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

// ─── Visit / Longitudinal Consultation ───────────────────────────────────────

export interface VaccineEntry {
  id: string;
  name: string;
  batchNo?: string;
  site?: string;
  givenDate: string;
  nextDueDate?: string;
  givenBy: string;
}

export interface ProcedureEntry {
  id: string;
  name: string;
  notes?: string;
  performedBy: string;
  time: string;
}

export interface AttachmentEntry {
  id: string;
  label: string;
  type: 'photo' | 'report' | 'xray' | 'other';
  dataUrl: string;
  uploadedAt: string;
}

export interface VisitRecord {
  id: string;
  patientId: string;
  date: string;
  doctorName: string;

  // Subjective
  chiefComplaint: string;
  hopi?: string;
  pastMedical?: string;
  pastSurgical?: string;
  familyHistory?: string;
  socialHistory?: string;
  allergiesNote?: string;
  currentMeds?: string;

  // Objective
  vitalsSnapshot?: { bp?: string; hr?: string; temp?: string; spo2?: string; weight?: string; height?: string; rr?: string; };
  generalExam?: string;
  systemicExam?: string;
  bodyNotes?: Record<string, string>;
  bodySigns?: string[];
  investigation?: string;

  // Assessment
  diagnosis: string;
  icdCode?: string;
  secondaryDx?: string;

  // Plan
  drugs: { form?: string; drug: string; dose: string; strength?: string; puffs?: string; route: string; frequency: string; duration: string; instructions?: string }[];
  vaccines: VaccineEntry[];
  procedures: ProcedureEntry[];
  attachments: AttachmentEntry[];
  advice: string;
  followUp: string;
  referral?: { specialty: string; doctorName: string; reason: string; urgency: string };
  admitted?: boolean;
  privateNote?: string;
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

// ─── Appointment ─────────────────────────────────────────────────────────────

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';

export type PaymentMode = 'cash' | 'upi' | 'card' | 'insurance';

export interface AppointmentEntry {
  id: string;
  patientId: string;
  patientName: string;
  patientAge?: number;
  clinicId?: string;
  clinicName?: string;
  date: string;          // 'YYYY-MM-DD'
  time: string;          // 'HH:MM'
  reason: string;
  doctorId?: number;
  doctorName?: string;
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
  // Registration payment
  consultationFee?: number;
  amountPaid?: number;
  paymentMode?: PaymentMode;
  token?: number;
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

// ─── Drug Knowledge Base ──────────────────────────────────────────────────────

export interface DrugKB {
  id: string;
  name: string;
  genericName: string;
  brandNames: string[];
  category: string;
  defaultDose: string;
  defaultRoute: string;
  defaultFrequency: string;
  defaultDuration: string;
  defaultInstructions: string;
  commonFor: string[];
  contraindications: string[];
  interactions: string[];
}

// ─── Favourite Prescriptions ──────────────────────────────────────────────────

export interface FavPrescription {
  id: string;
  label: string;
  drugs: Partial<Medication>[];
  usageCount: number;
  lastUsed: string;
  tags: string[];
}

export interface FavDrug {
  id: string;
  name: string;
  dose: string;
  route: string;
  frequency: string;
  duration: string;
  instructions: string;
  usageCount: number;
}

// ─── Teleconsult ──────────────────────────────────────────────────────────────

export interface TeleconsultSession {
  id: string;
  appointmentId: string;
  patientId: string;
  roomUrl: string;
  status: 'scheduled' | 'active' | 'ended';
  startedAt?: string;
  endedAt?: string;
  whatsappSent: boolean;
}

// ─── Booking Slot ─────────────────────────────────────────────────────────────

export interface BookingSlot {
  id: string;
  clinicId: string;
  date: string;
  time: string;
  durationMins: number;
  status: 'available' | 'booked' | 'blocked' | 'completed';
  patientId?: string;
  patientName?: string;
  bookedVia: 'self' | 'receptionist' | 'walkin' | 'teleconsult';
  fee: number;
}

export interface BookingToken {
  token: string;
  clinicId: string;
  doctorId: string;
  doctorName: string;
  clinicName: string;
  expiresAt: string;
}

// ─── Nursing Photo ───────────────────────────────────────────────────────────

export interface NursingPhoto {
  id: string;
  patientId: string;
  dataUrl: string;
  caption?: string;
  takenAt: string;
  takenBy: string;
  bodyRegion?: string;
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
