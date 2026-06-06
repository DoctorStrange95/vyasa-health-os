import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, UserPlus } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge';
import type { PatientStatus } from '@/types';

type Filter = 'all' | PatientStatus;

export default function PatientListPage() {
  const { patients } = useAppStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

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
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Patients</h1>
          <p className="page-subtitle">{patients.length} patients · {patients.filter(p => p.status === 'IPD').length} admitted</p>
        </div>
        <Link to="/app/admit" className="btn-primary">
          <UserPlus className="w-4 h-4" />
          Admit Patient
        </Link>
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
            {(['all', 'IPD', 'OPD', 'Critical', 'Discharged'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f as Filter)}
                className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
              >
                {f === 'all' ? 'All' : f}
                <span className={`ml-1 px-1.5 py-0 rounded-full text-[10px] ${filter === f ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {counts[f]}
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
              <th>Ward / Bed</th>
              <th>Diagnosis</th>
              <th>Priority</th>
              <th>Doctor</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
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
                  {p.ward ? (
                    <div>
                      <div className="font-medium text-slate-700">{p.ward}</div>
                      <div className="text-xs text-slate-400">{p.bed || '—'}</div>
                    </div>
                  ) : <span className="text-slate-400">OPD</span>}
                </td>
                <td className="max-w-[180px]">
                  <div className="text-sm text-slate-700 truncate">{p.diagnosis || '—'}</div>
                </td>
                <td><PriorityBadge priority={p.priority} /></td>
                <td className="text-sm text-slate-600">{p.attendingDoctor || '—'}</td>
                <td>
                  <Link to={`/app/patients/${p.id}`} className="btn-secondary btn-sm">
                    View
                  </Link>
                </td>
              </tr>
            ))}
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
