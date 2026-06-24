import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Users, BedDouble, Stethoscope, AlertTriangle, HeartPulse, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Patient } from '@/types';

// Nurse Home — a quick at-a-glance dashboard. Shows COUNTS only (no patient
// list); each card is clickable and opens the filtered list in My Patients.
export default function NurseHome() {
  const { user } = useAuthStore();
  const { patients, vitals } = useAppStore();
  const navigate = useNavigate();
  const [posting, setPosting] = useState<string>('');

  useEffect(() => {
    import('@/lib/api').then(({ isApiEnabled, api }) => {
      if (isApiEnabled()) api.get<{ department?: string }>('/auth/me').then(me => setPosting(me.department || '')).catch(() => {});
    });
  }, []);

  const isIpd = (p: Patient) => p.status === 'IPD' || p.status === 'Critical';
  const inPosting = (p: Patient) => {
    if (posting === 'OPD') return p.status === 'OPD';
    if (posting === 'IPD') return isIpd(p);
    return true; // Both / unset → all clinic patients
  };

  const mine = patients.filter(inPosting);

  // A patient is "critical" if flagged Critical, or latest vitals are out of range.
  const isCritical = (p: Patient) => {
    if (p.priority === 'Critical') return true;
    const v = (vitals[p.id] ?? [])[0];
    if (!v) return false;
    const sys = v.bp ? parseInt(v.bp) : NaN;
    return (!Number.isNaN(sys) && (sys > 160 || sys < 90)) || (v.spo2 != null && v.spo2 < 94);
  };

  const total = mine.length;
  const assigned = mine.filter(p => p.assignedNurseId === user?.id).length;
  const opd = mine.filter(p => p.status === 'OPD').length;
  const critical = mine.filter(isCritical).length;

  const cards = [
    { label: 'Total Patients', value: total,    icon: Users,        color: 'bg-teal-50 text-teal-700 border-teal-100',       filter: 'all' },
    { label: 'Assigned to me', value: assigned, icon: HeartPulse,   color: 'bg-pink-50 text-pink-700 border-pink-100',       filter: 'assigned' },
    { label: 'OPD Queue',      value: opd,      icon: Stethoscope,  color: 'bg-amber-50 text-amber-700 border-amber-100',    filter: 'opd' },
    { label: 'Critical',       value: critical, icon: AlertTriangle,color: 'bg-red-50 text-red-700 border-red-100',          filter: 'critical' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <BedDouble className="w-6 h-6 text-teal-600" /> Home
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {user?.name ? `Hi ${user.name.split(' ')[0]} · ` : ''}{posting ? `${posting} posting` : 'your ward'} — tap a card to see those patients
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map(c => (
          <button
            key={c.label}
            onClick={() => navigate(`/app/nurse-patients?filter=${c.filter}`)}
            className={cn('rounded-2xl p-4 border text-left transition-all hover:shadow-md active:scale-[0.98]', c.color)}
          >
            <div className="flex items-center justify-between">
              <c.icon className="w-5 h-5" />
              <ChevronRight className="w-4 h-4 opacity-40" />
            </div>
            <div className="text-3xl font-black mt-2">{c.value}</div>
            <div className="text-xs font-medium opacity-70 mt-0.5">{c.label}</div>
          </button>
        ))}
      </div>

      <button
        onClick={() => navigate('/app/nurse-patients')}
        className="w-full rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-between hover:shadow-md transition-all"
      >
        <span className="flex items-center gap-2 font-semibold text-slate-800">
          <Users className="w-5 h-5 text-teal-600" /> View all my patients
        </span>
        <ChevronRight className="w-5 h-5 text-slate-400" />
      </button>
    </div>
  );
}
