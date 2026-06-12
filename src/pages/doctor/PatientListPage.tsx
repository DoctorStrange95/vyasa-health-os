import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, UserPlus, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { usePadStore } from '@/store/usePadStore';
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge';
import { localDate } from '@/lib/utils';
import type { PatientStatus } from '@/types';

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
  a.download = `vyasa-patients-${localDate()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PatientListPage() {
  const { patients, visits, vitals, appointments, openQuickRegister } = useAppStore();
  const { user } = useAuthStore();
  const { clinics } = usePadStore();
  const isReceptionist = user?.role === 'receptionist';

  // Lookup: patient → clinic name (direct clinicId first, then from appointments)
  const patientClinic = (p: { id: string; clinicId?: string }): string => {
    if (p.clinicId) {
      const name = clinics.find(c => c.id === p.clinicId)?.name;
      if (name) return name;
    }
    const apt = appointments
      .filter(a => a.patientId === p.id)
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    if (apt?.clinicName) return apt.clinicName;
    if (apt?.clinicId) return clinics.find(c => c.id === apt.clinicId)?.name ?? '—';
    return '—';
  };
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [clinicFilter, setClinicFilter] = useState<string>('all');

  const filtered = patients.filter(p => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.mrn.toLowerCase().includes(search.toLowerCase()) ||
      (p.diagnosis || '').toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || p.status === filter;
    const matchClinic = clinicFilter === 'all' || p.clinicId === clinicFilter;
    return matchSearch && matchFilter && matchClinic;
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="page-title">Patients</h1>
          <p className="page-subtitle">{patients.length} patients · {patients.filter(p => p.status === 'IPD').length} admitted</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => exportToCSV(patients, visits, vitals)}
            className="btn-secondary flex items-center gap-2 hidden sm:flex"
            title="Export all patients to Excel/CSV"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export
          </button>
          {/* Primary: opens unified QuickRegisterModal (with payment + slip) */}
          <button
            onClick={openQuickRegister}
            className="btn-primary flex items-center gap-2 flex-1 sm:flex-none"
          >
            <UserPlus className="w-4 h-4" />
            Register Patient
          </button>
          {/* Mobile: export icon only */}
          <button
            onClick={() => exportToCSV(patients, visits, vitals)}
            className="btn-secondary p-2 sm:hidden"
            title="Export CSV"
          >
            <FileSpreadsheet className="w-4 h-4" />
          </button>
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
          {clinics.length > 1 && (
            <select
              value={clinicFilter}
              onChange={e => setClinicFilter(e.target.value)}
              className="input text-sm py-1.5 px-3 w-auto min-w-[140px]"
            >
              <option value="all">All Clinics</option>
              {clinics.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
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

      {/* ── Mobile card view (< md) ── */}
      <div className="md:hidden space-y-3">
        {filtered.map(p => {
          const lastVisit = (visits[p.id] ?? [])[0];
          const todayStr = localDate();
          const consultedToday = (visits[p.id] ?? []).some(v => v.date.startsWith(todayStr));
          return (
            <div key={p.id} className="mobile-patient-card">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-700 text-sm font-bold flex-shrink-0">
                  {p.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900">{p.name}</span>
                    <span className="text-xs text-slate-400">{p.age}y {p.gender === 'M' ? '♂' : p.gender === 'F' ? '♀' : '⚧'}</span>
                    {p.priority === 'Critical' && (
                      <span className="text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">Critical</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 font-mono">{p.mrn}</div>
                  {(lastVisit?.chiefComplaint || p.diagnosis) && (
                    <div className="text-xs text-slate-500 mt-0.5 truncate">{lastVisit?.chiefComplaint || p.diagnosis}</div>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <StatusBadge status={p.status} />
                    {p.ward && <span className="text-xs text-slate-400">{p.ward}{p.bed ? ` · ${p.bed}` : ''}</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Link to={`/app/patients/${p.id}`} className="btn-secondary btn-sm flex-1 justify-center">View</Link>
                {!isReceptionist && (p.status === 'OPD' || p.status === 'IPD' || p.status === 'Critical') && (
                  consultedToday ? (
                    <Link to={`/app/consult/${p.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg font-semibold">
                      <CheckCircle2 className="w-3 h-3" /> Edit Consult
                    </Link>
                  ) : (
                    <Link to={`/app/consult/${p.id}`} className="btn-primary btn-sm flex-1 justify-center">Consult</Link>
                  )
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">No patients found</div>
        )}
      </div>

      {/* ── Desktop table (≥ md) ── */}
      <div className="hidden md:block table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Patient</th>
              <th>MRN</th>
              <th>Age / Sex</th>
              <th>Status</th>
              <th>Location</th>
              <th>Last Visit</th>
              <th>Complaint / Dx</th>
              <th>Clinic</th>
              <th>Priority</th>
              <th>Doctor</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const lastVisit = (visits[p.id] ?? [])[0];
              const todayStr = localDate();
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
                  <td>
                    {lastVisit ? (
                      <div>
                        <div className="text-xs font-medium text-slate-700">{new Date(lastVisit.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                        <div className="text-[10px] text-slate-400">{lastVisit.doctorName}</div>
                      </div>
                    ) : <span className="text-slate-400 text-xs">No visits</span>}
                  </td>
                  <td className="max-w-[160px]">
                    <div className="text-sm text-slate-700 truncate">{lastVisit?.diagnosis || lastVisit?.chiefComplaint || p.diagnosis || '—'}</div>
                  </td>
                  <td className="text-xs text-slate-600 whitespace-nowrap">{patientClinic(p)}</td>
                  <td><PriorityBadge priority={p.priority} /></td>
                  <td className="text-sm text-slate-600">{p.attendingDoctor || '—'}</td>
                  <td>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link to={`/app/patients/${p.id}`} className="btn-secondary btn-sm">View</Link>
                      {!isReceptionist && (p.status === 'OPD' || p.status === 'IPD' || p.status === 'Critical') && (
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
