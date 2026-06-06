import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, UserPlus, FileSpreadsheet, Plus, X, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge';
import type { PatientStatus, Patient } from '@/types';
import { cn } from '@/lib/utils';

type Filter = 'all' | PatientStatus;

function exportToCSV(
  patients: ReturnType<typeof useAppStore.getState>['patients'],
  visits: ReturnType<typeof useAppStore.getState>['visits'],
  vitals: ReturnType<typeof useAppStore.getState>['vitals'],
) {
  const headers = [
    'MRN', 'Name', 'Age', 'Gender', 'Phone', 'Email', 'Blood Group',
    'Status', 'Priority',
    'Ward', 'Bed', 'Admit Date',
    'Death Date', 'Death Cause',
    'Diagnosis', 'Allergies',
    'Insurance', 'Attending Doctor', 'Assigned Nurse',
    // Latest vitals
    'Latest Vitals Date', 'BP', 'Pulse', 'Temp (°C)', 'SpO2 (%)', 'RR', 'Weight (kg)', 'Height (cm)', 'Sugar (mg/dL)',
    // Most recent visit
    'Last Visit Date', 'Chief Complaint', 'HOPI / History',
    'Examination', 'Assessment / Diagnosis', 'ICD Code',
    'Medications', 'Advice', 'Follow-Up', 'Referral',
    'Vaccines', 'Procedures', 'Private Note',
  ];

  function esc(v: unknown): string {
    if (v == null || v === '') return '';
    const s = String(v).replace(/"/g, '""');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
  }

  const rows = patients.map(p => {
    const pVitals = (vitals[p.id] ?? [])[0];
    const pVisits = visits[p.id] ?? [];
    const lastVisit = pVisits[0]; // newest first

    const meds = lastVisit?.drugs?.map(d =>
      `${d.drug} ${d.dose} ${d.route} ${d.frequency} × ${d.duration}`
    ).join('; ') ?? '';

    const vaccines = lastVisit?.vaccines?.map(v => `${v.name} (${v.givenDate})`).join('; ') ?? '';
    const procedures = lastVisit?.procedures?.map(pr => pr.name).join('; ') ?? '';

    const referral = lastVisit?.referral
      ? `${lastVisit.referral.specialty} – ${lastVisit.referral.reason} (${lastVisit.referral.urgency})`
      : '';

    return [
      p.mrn, p.name, p.age, p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : 'Other',
      p.phone ?? '', p.email ?? '', p.bloodGroup ?? '',
      p.status, p.priority,
      p.ward ?? '', p.bed ?? '', p.admitDate ?? '',
      p.deathDate ?? '', p.deathCause ?? '',
      p.diagnosis ?? '', (p.allergies ?? []).join(', '),
      p.insurance ?? '', p.attendingDoctor ?? '', p.assignedNurseName ?? '',
      // vitals
      pVitals ? new Date(pVitals.time).toLocaleString('en-IN') : '',
      pVitals?.bp ?? '', pVitals?.pulse ?? '', pVitals?.temp ?? '',
      pVitals?.spo2 ?? '', pVitals?.rr ?? '', pVitals?.weight ?? '', pVitals?.height ?? '', pVitals?.sugar ?? '',
      // visit
      lastVisit ? new Date(lastVisit.date).toLocaleString('en-IN') : '',
      lastVisit?.chiefComplaint ?? '',
      lastVisit?.hopi ?? '',
      lastVisit?.generalExam ?? '',
      lastVisit?.diagnosis ?? '',
      lastVisit?.icdCode ?? '',
      meds, lastVisit?.advice ?? '', lastVisit?.followUp ?? '', referral,
      vaccines, procedures, lastVisit?.privateNote ?? '',
    ].map(esc).join(',');
  });

  const csv = '﻿' + [headers.map(esc).join(','), ...rows].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vyasa-patients-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Quick Add Modal ──────────────────────────────────────────────────────────

interface QuickAddProps {
  totalPatients: number;
  onClose: () => void;
}

function QuickAddModal({ totalPatients, onClose }: QuickAddProps) {
  const { upsertPatient } = useAppStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<Patient['gender']>('M');
  const [phone, setPhone] = useState('');
  const [complaint, setComplaint] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !age) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 300));

    const newId = `p-${Date.now()}`;
    const mrn = `MRN-${String(totalPatients + 1).padStart(3, '0')}`;
    upsertPatient({
      id: newId,
      name: name.trim(),
      age: Number(age),
      gender,
      mrn,
      phone: phone.trim() || undefined,
      diagnosis: complaint.trim() || undefined,
      status: 'OPD',
      priority: 'Stable',
      allergies: [],
      attendingDoctor: user?.name ?? '',
      attendingDoctorId: user?.id,
    });
    setSaving(false);
    onClose();
    navigate(`/app/consult/${newId}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Quick Add Patient</h2>
            <p className="text-xs text-slate-400 mt-0.5">Registers as OPD → opens consultation</p>
          </div>
          <button type="button" onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label">Full Name *</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="input"
              placeholder="Patient name"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Age *</label>
              <input
                type="number"
                min={1}
                max={120}
                value={age}
                onChange={e => setAge(e.target.value)}
                className="input"
                placeholder="Years"
                required
              />
            </div>
            <div>
              <label className="label">Gender</label>
              <div className="flex gap-1.5 mt-1">
                {(['M', 'F', 'Other'] as Patient['gender'][]).map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={cn('flex-1 text-xs py-2 rounded-lg border-2 font-semibold transition-all',
                      gender === g
                        ? 'border-teal-500 bg-teal-50 text-teal-700'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    )}>
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="label">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="input"
              placeholder="Mobile number"
            />
          </div>

          <div>
            <label className="label">Chief Complaint</label>
            <input
              type="text"
              value={complaint}
              onChange={e => setComplaint(e.target.value)}
              className="input"
              placeholder="Presenting complaint"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving || !name.trim() || !age}
              className="btn-primary flex-1 disabled:opacity-50">
              {saving ? 'Saving…' : 'Add & Consult'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PatientListPage() {
  const { patients, visits, vitals } = useAppStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const filtered = patients.filter(p => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.mrn.toLowerCase().includes(search.toLowerCase()) ||
      (p.diagnosis || '').toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || p.status === filter;
    return matchSearch && matchFilter;
  });

  const counts: Record<string, number> = {
    all: patients.length,
    IPD: patients.filter(p => p.status === 'IPD').length,
    OPD: patients.filter(p => p.status === 'OPD').length,
    Critical: patients.filter(p => p.status === 'Critical').length,
    Discharged: patients.filter(p => p.status === 'Discharged').length,
    Deceased: patients.filter(p => p.status === 'Deceased').length,
    Referred: patients.filter(p => p.status === 'Referred').length,
  };

  return (
    <div>
      {showQuickAdd && (
        <QuickAddModal
          totalPatients={patients.length}
          onClose={() => setShowQuickAdd(false)}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Patients</h1>
          <p className="page-subtitle">{patients.length} patients · {patients.filter(p => p.status === 'IPD').length} admitted</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => exportToCSV(patients, visits, vitals)}
            className="btn-secondary flex items-center gap-2"
            title="Export all patients to Excel/CSV"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => setShowQuickAdd(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Patient
          </button>
          <Link to="/app/admit" className="btn-secondary flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Full Register
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, MRN, diagnosis…"
              className="input pl-9"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['all', 'IPD', 'OPD', 'Critical', 'Discharged', 'Referred', 'Deceased'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f as Filter)}
                className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
              >
                {f === 'all' ? 'All' : f}
                <span className={`ml-1 px-1.5 py-0 rounded-full text-[10px] ${filter === f ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {counts[f] ?? 0}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Patient</th>
              <th>MRN</th>
              <th>Age / Sex</th>
              <th>Status</th>
              <th>Location</th>
              <th>Last Visit / Diagnosis</th>
              <th>Priority</th>
              <th>Doctor</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const lastVisit = (visits[p.id] ?? [])[0];
              const todayStr = new Date().toISOString().slice(0, 10);
              const consultedToday = (visits[p.id] ?? []).some(v => v.date.startsWith(todayStr));
              return (
                <tr key={p.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-700 text-xs font-bold flex-shrink-0">
                        {p.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 text-sm">{p.name}</div>
                        <div className="text-xs text-slate-400">{p.bloodGroup || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="font-mono text-xs text-slate-500">{p.mrn}</td>
                  <td className="text-sm">{p.age}y {p.gender === 'M' ? '♂' : p.gender === 'F' ? '♀' : '⚧'}</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td className="text-sm">
                    {p.status === 'Deceased' ? (
                      <div className="text-xs text-slate-400">Deceased{p.deathDate ? ` · ${p.deathDate}` : ''}</div>
                    ) : p.status === 'Referred' ? (
                      <div>
                        <div className="font-medium text-violet-700 text-xs">{p.referredHospital || 'Referred'}</div>
                        {p.referredDept && <div className="text-xs text-slate-400">{p.referredDept}</div>}
                      </div>
                    ) : p.ward ? (
                      <div>
                        <div className="font-medium text-slate-700">{p.ward}</div>
                        <div className="text-xs text-slate-400">{p.bed || '—'}</div>
                      </div>
                    ) : <span className="text-slate-400">OPD</span>}
                  </td>
                  <td className="max-w-[200px]">
                    {lastVisit ? (
                      <div>
                        <div className="text-xs text-slate-400">{new Date(lastVisit.date).toLocaleDateString('en-IN')}</div>
                        <div className="text-sm text-slate-700 truncate">{lastVisit.chiefComplaint || p.diagnosis || '—'}</div>
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500 truncate">{p.diagnosis || '—'}</div>
                    )}
                  </td>
                  <td><PriorityBadge priority={p.priority} /></td>
                  <td className="text-sm text-slate-600">{p.attendingDoctor || '—'}</td>
                  <td>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link to={`/app/patients/${p.id}`} className="btn-secondary btn-sm">View</Link>
                      {(p.status === 'OPD' || p.status === 'IPD' || p.status === 'Critical') && (
                        consultedToday ? (
                          <>
                            <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-lg font-medium">
                              <CheckCircle2 className="w-3 h-3" /> Done
                            </span>
                            <Link to={`/app/consult/${p.id}`} className="btn-secondary btn-sm">
                              Edit
                            </Link>
                          </>
                        ) : (
                          <Link to={`/app/consult/${p.id}`} className="btn-primary btn-sm">
                            Consult
                          </Link>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">
            No patients found
          </div>
        )}
      </div>
    </div>
  );
}
