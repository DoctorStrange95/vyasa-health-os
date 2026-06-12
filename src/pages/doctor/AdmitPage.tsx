import { useState } from 'react';
import { UserPlus, ClipboardList, Activity, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { Patient } from '@/types';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];
const WARD_OPTIONS = ['General Ward', 'ICU', 'CCU', 'NICU', 'PICU', 'Private Room', 'Semi-Private', 'Casualty', 'Day Care'];
const PRIORITY_OPTIONS: Patient['priority'][] = ['Critical', 'High', 'Medium', 'Stable'];
const ADMISSION_TYPES = ['Emergency', 'Elective', 'Referral', 'OPD Follow-up', 'Transfer'];
const SPECIALTIES = ['General Medicine', 'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Gynecology', 'Surgery', 'Nephrology', 'Oncology', 'Dermatology'];

type Step = 'personal' | 'clinical' | 'confirm';

export default function AdmitPage() {
  const { upsertPatient, beds, showToast } = useAppStore();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('personal');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    // Personal
    name: '', dob: '', gender: 'M' as 'M' | 'F' | 'Other',
    phone: '', emergencyContact: '', address: '',
    bloodGroup: 'Unknown', allergies: '',
    // Clinical
    diagnosis: '', admissionType: 'Emergency', specialty: 'General Medicine',
    priority: 'Medium' as Patient['priority'],
    ward: 'General Ward', bedId: '',
    chiefComplaint: '', history: '', vitals: '',
    // Insurance
    insuranceProvider: '', policyNumber: '',
  });

  const set = (field: string, val: string) => setForm(f => ({ ...f, [field]: val }));

  const availableBeds = beds.filter(b => b.status === 'available');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));

    const newPatient: Patient = {
      id: `p-${Date.now()}`,
      mrn: `REG-${Date.now().toString().slice(-6)}`,
      name: form.name,
      age: 0,
      gender: form.gender,
      phone: form.phone,
      bloodGroup: form.bloodGroup,
      allergies: form.allergies ? form.allergies.split(',').map(a => a.trim()) : [],
      diagnosis: form.diagnosis,
      status: 'OPD',
      priority: form.priority,
      attendingDoctor: '',
    };

    upsertPatient(newPatient);
    showToast(`${form.name} registered · Starting consultation…`, 'success');
    setSaving(false);
    navigate(`/app/consult/${newPatient.id}`);
  }

  const steps = [
    { id: 'personal', label: 'Patient Info', icon: UserPlus },
    { id: 'clinical', label: 'Clinical Details', icon: Activity },
    { id: 'confirm', label: 'Confirm', icon: ClipboardList },
  ];

  return (
    <div className="p-0 md:p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Register New Patient</h1>
        <p className="text-sm text-slate-500 mt-0.5">Register the patient — you will be taken to consultation immediately after</p>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-0 mb-8">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center flex-1">
            <button onClick={() => step !== 'personal' || s.id === 'personal' ? setStep(s.id as Step) : undefined}
              className={cn('flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                step === s.id ? 'bg-navy-800 text-white' : 'text-slate-500 hover:text-slate-700')}>
              <s.icon className="w-4 h-4" />
              {s.label}
            </button>
            {i < steps.length - 1 && <div className="flex-1 h-px bg-slate-200 mx-2" />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {/* Step 1: Personal */}
        {step === 'personal' && (
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-slate-800 mb-4">Patient Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label">Full Name *</label>
                <input value={form.name} onChange={e => set('name', e.target.value)} className="input" placeholder="Patient full name" required />
              </div>
              <div>
                <label className="label">Date of Birth *</label>
                <input type="date" value={form.dob} onChange={e => set('dob', e.target.value)} className="input" required />
              </div>
              <div>
                <label className="label">Gender *</label>
                <select value={form.gender} onChange={e => set('gender', e.target.value)} className="input">
                  <option value="M">Male</option><option value="F">Female</option><option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="label">Phone *</label>
                <input value={form.phone} onChange={e => set('phone', e.target.value)} className="input" placeholder="+91 98765 43210" required />
              </div>
              <div>
                <label className="label">Emergency Contact</label>
                <input value={form.emergencyContact} onChange={e => set('emergencyContact', e.target.value)} className="input" placeholder="Name & phone" />
              </div>
              <div>
                <label className="label">Blood Group</label>
                <select value={form.bloodGroup} onChange={e => set('bloodGroup', e.target.value)} className="input">
                  {BLOOD_GROUPS.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Known Allergies</label>
                <input value={form.allergies} onChange={e => set('allergies', e.target.value)} className="input" placeholder="Penicillin, Sulfa… (comma separated)" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Address</label>
                <input value={form.address} onChange={e => set('address', e.target.value)} className="input" placeholder="Full address" />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button type="button" onClick={() => setStep('clinical')}
                disabled={!form.name || !form.dob || !form.phone}
                className="btn-primary">Next: Clinical Details →</button>
            </div>
          </div>
        )}

        {/* Step 2: Clinical */}
        {step === 'clinical' && (
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-slate-800 mb-4">Clinical Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label">Chief Complaint *</label>
                <input value={form.chiefComplaint} onChange={e => set('chiefComplaint', e.target.value)} className="input" placeholder="Primary reason for admission" required />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Provisional Diagnosis *</label>
                <input value={form.diagnosis} onChange={e => set('diagnosis', e.target.value)} className="input" placeholder="e.g. Acute MI, Pneumonia" required />
              </div>
              <div>
                <label className="label">Admission Type</label>
                <select value={form.admissionType} onChange={e => set('admissionType', e.target.value)} className="input">
                  {ADMISSION_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Priority</label>
                <select value={form.priority} onChange={e => set('priority', e.target.value as Patient['priority'])} className="input">
                  {PRIORITY_OPTIONS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Specialty</label>
                <select value={form.specialty} onChange={e => set('specialty', e.target.value)} className="input">
                  {SPECIALTIES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Ward</label>
                <select value={form.ward} onChange={e => set('ward', e.target.value)} className="input">
                  {WARD_OPTIONS.map(w => <option key={w}>{w}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Assign Bed {availableBeds.length === 0 && <span className="text-amber-600 text-xs">(no beds available)</span>}</label>
                <select value={form.bedId} onChange={e => set('bedId', e.target.value)} className="input">
                  <option value="">No bed assigned yet</option>
                  {availableBeds.map(b => <option key={b.id} value={b.id}>{b.ward} — Bed {b.number} ({b.type})</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">History & Presenting Complaint</label>
                <textarea value={form.history} onChange={e => set('history', e.target.value)}
                  rows={3} className="input resize-none" placeholder="Brief history, duration of symptoms…" />
              </div>
              <div>
                <label className="label">Insurance Provider</label>
                <input value={form.insuranceProvider} onChange={e => set('insuranceProvider', e.target.value)} className="input" placeholder="CGHS, ESI, Private…" />
              </div>
              <div>
                <label className="label">Policy Number</label>
                <input value={form.policyNumber} onChange={e => set('policyNumber', e.target.value)} className="input" placeholder="Policy / TPA number" />
              </div>
            </div>
            <div className="flex gap-3 justify-between pt-2">
              <button type="button" onClick={() => setStep('personal')} className="btn-secondary">← Back</button>
              <button type="button" onClick={() => setStep('confirm')}
                disabled={!form.chiefComplaint || !form.diagnosis}
                className="btn-primary">Review & Confirm →</button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="card p-6">
              <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-teal-600" /> Admission Summary
              </h2>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                {[
                  ['Name', form.name], ['DOB', form.dob], ['Gender', form.gender],
                  ['Phone', form.phone], ['Blood Group', form.bloodGroup], ['Allergies', form.allergies || 'None known'],
                  ['Diagnosis', form.diagnosis], ['Admission Type', form.admissionType], ['Priority', form.priority],
                  ['Ward', form.ward], ['Specialty', form.specialty], ['Insurance', form.insuranceProvider || '—'],
                ].map(([label, val]) => (
                  <div key={label}>
                    <span className="text-slate-400 text-xs uppercase tracking-wide">{label}</span>
                    <div className="font-medium text-slate-900">{val}</div>
                  </div>
                ))}
              </div>
              {form.priority === 'Critical' && (
                <div className="mt-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  Critical priority — ICU/emergency team will be notified upon admission.
                </div>
              )}
            </div>
            <div className="flex gap-3 justify-between">
              <button type="button" onClick={() => setStep('clinical')} className="btn-secondary">← Edit</button>
              <button type="submit" disabled={saving} className="btn-primary px-8">
                {saving ? 'Admitting…' : <><CheckCircle2 className="w-4 h-4" /> Confirm Admission</>}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
