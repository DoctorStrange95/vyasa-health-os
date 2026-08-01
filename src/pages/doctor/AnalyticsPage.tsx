import { useState, useMemo } from 'react';
import {
  Users, Calendar, Clock, Stethoscope,
  ArrowUp, ArrowDown, Activity, Pill, Share2,
  RefreshCw, Star, BarChart3
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { usePadStore } from '@/store/usePadStore';
import { cn, localDate } from '@/lib/utils';

type Period = 'week' | 'month' | 'quarter';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return startOfDay(d); }
function monthsAgo(n: number) { const d = new Date(); d.setMonth(d.getMonth() - n); d.setDate(1); d.setHours(0,0,0,0); return d; }

// ─── Bar Chart ────────────────────────────────────────────────────────────────

function BarChart({ labels, values, color = 'bg-teal-500', height = 80 }: {
  labels: string[]; values: number[]; color?: string; height?: number;
}) {
  const max = Math.max(...values, 1);
  return (
    <div>
      <div className="flex items-end gap-1" style={{ height }}>
        {values.map((v, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 group">
            <div className="relative w-full">
              {v > 0 && (
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded z-10 whitespace-nowrap">
                  {v}
                </div>
              )}
              <div className={cn('w-full rounded-t transition-all', color, v === 0 && 'opacity-20')}
                style={{ height: `${Math.max((v / max) * height, v > 0 ? 6 : 2)}px` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-1 mt-1">
        {labels.map((l, i) => (
          <div key={i} className="flex-1 text-center text-[10px] text-slate-400 truncate">{l}</div>
        ))}
      </div>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, delta, iconBg }: {
  icon: typeof Users; label: string; value: string | number;
  sub?: string; delta?: number; iconBg: string;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', iconBg)}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        {delta !== undefined && (
          <span className={cn('text-xs font-semibold flex items-center gap-0.5', delta >= 0 ? 'text-emerald-600' : 'text-red-500')}>
            {delta >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      <div className="text-2xl font-black text-slate-900">{value}</div>
      <div className="text-xs font-medium text-slate-600 mt-0.5">{label}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

// ─── Donut (simple SVG) ───────────────────────────────────────────────────────

function DonutChart({ slices }: { slices: { label: string; value: number; color: string }[] }) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  let cumulative = 0;
  const r = 40; const cx = 50; const cy = 50;
  const paths = slices.map(s => {
    const pct = s.value / total;
    const start = cumulative;
    cumulative += pct;
    const startAngle = start * 2 * Math.PI - Math.PI / 2;
    const endAngle = cumulative * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + r * Math.cos(startAngle); const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle); const y2 = cy + r * Math.sin(endAngle);
    const large = pct > 0.5 ? 1 : 0;
    return { d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`, ...s, pct };
  });
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="w-24 h-24 flex-shrink-0">
        <circle cx={cx} cy={cy} r={r} fill="#f1f5f9" />
        {paths.map((p, i) => p.value > 0 && (
          <path key={i} d={p.d} className={p.color} />
        ))}
        <circle cx={cx} cy={cy} r={22} fill="white" />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" className="text-xs font-bold fill-slate-900" fontSize="12">{total}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" dominantBaseline="middle" className="fill-slate-400" fontSize="7">patients</text>
      </svg>
      <div className="space-y-1.5">
        {paths.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <svg className="w-2.5 h-2.5 flex-shrink-0"><circle cx="5" cy="5" r="5" className={p.color} /></svg>
            <span className="text-xs text-slate-600">{p.label}</span>
            <span className="text-xs font-bold text-slate-900 ml-auto">{p.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { patients, visits, prescriptions, queue, appointments } = useAppStore();
  const { user } = useAuthStore();
  const { clinics } = usePadStore();
  const [period, setPeriod] = useState<Period>('month');
  const [selectedClinicId, setSelectedClinicId] = useState<string>('all');

  // ─── Clinic filtering ──────────────────────────────────────────────────────
  const filteredPatients = useMemo(() =>
    selectedClinicId === 'all'
      ? patients
      : patients.filter(p => p.clinicId === selectedClinicId),
  [patients, selectedClinicId]);

  const allVisits = useMemo(() => {
    const all = Object.values(visits).flat();
    if (selectedClinicId === 'all') return all;
    const ids = new Set(filteredPatients.map(p => p.id));
    return all.filter(v => ids.has(v.patientId));
  }, [visits, filteredPatients, selectedClinicId]);

  // ─── Computed metrics from real data ───────────────────────────────────────
  const weekStart = daysAgo(7);
  const monthStart = daysAgo(30);

  const todayPatients = queue.filter(q => q.status === 'completed' || q.status === 'in-progress').length;
  const todayQueue = queue.length;

  const weekVisits = allVisits.filter(v => new Date(v.date) >= weekStart).length;
  const monthVisits = allVisits.filter(v => new Date(v.date) >= monthStart).length;
  const prevMonthVisits = allVisits.filter(v => {
    const d = new Date(v.date);
    return d >= daysAgo(60) && d < monthStart;
  }).length;
  const monthDelta = prevMonthVisits > 0 ? Math.round(((monthVisits - prevMonthVisits) / prevMonthVisits) * 100) : 0;

  const totalPatients = filteredPatients.length;
  const newThisMonth = filteredPatients.filter(p => {
    const d = new Date(p.admitDate ?? '');
    return d >= monthStart;
  }).length;


  // Last 6 months monthly OPD trend
  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const mo = monthsAgo(5 - i);
    const next = new Date(mo); next.setMonth(next.getMonth() + 1);
    const count = allVisits.filter(v => {
      const d = new Date(v.date); return d >= mo && d < next;
    }).length;
    return { label: MONTH_NAMES[mo.getMonth()], count };
  });

  // Appointment stats
  const todayStr = localDate();
  const filteredApts = useMemo(() =>
    selectedClinicId === 'all' ? appointments : appointments.filter(a => a.clinicId === selectedClinicId),
  [appointments, selectedClinicId]);
  const aptScheduled  = filteredApts.filter(a => a.date >= todayStr && (a.status === 'scheduled' || a.status === 'confirmed')).length;
  const aptCompleted  = filteredApts.filter(a => a.status === 'completed').length;
  const aptNoShow     = filteredApts.filter(a => a.status === 'no-show').length;
  const aptCancelled  = filteredApts.filter(a => a.status === 'cancelled').length;
  const aptTotal      = aptCompleted + aptNoShow + aptCancelled + aptScheduled;
  const seenRate      = (aptCompleted + aptNoShow) > 0 ? Math.round((aptCompleted / (aptCompleted + aptNoShow)) * 100) : 0;

  // Top diagnoses from actual patient data + visits
  const diagnosisMap: Record<string, number> = {};
  filteredPatients.forEach(p => {
    if (p.diagnosis) {
      diagnosisMap[p.diagnosis] = (diagnosisMap[p.diagnosis] ?? 0) + 1;
    }
  });
  allVisits.forEach(v => {
    if (v.diagnosis && v.diagnosis !== filteredPatients.find(p => p.id === v.patientId)?.diagnosis) {
      diagnosisMap[v.diagnosis] = (diagnosisMap[v.diagnosis] ?? 0) + 1;
    }
  });
  const topDx = Object.entries(diagnosisMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const maxDx = topDx[0]?.[1] || 1;

  // Demographics
  const male = filteredPatients.filter(p => p.gender === 'M').length;
  const female = filteredPatients.filter(p => p.gender === 'F').length;
  const other = filteredPatients.filter(p => p.gender !== 'M' && p.gender !== 'F').length;

  const ageGroups = [
    { label: '0–12', count: filteredPatients.filter(p => (p.age as number) <= 12).length },
    { label: '13–30', count: filteredPatients.filter(p => (p.age as number) > 12 && (p.age as number) <= 30).length },
    { label: '31–50', count: filteredPatients.filter(p => (p.age as number) > 30 && (p.age as number) <= 50).length },
    { label: '51–70', count: filteredPatients.filter(p => (p.age as number) > 50 && (p.age as number) <= 70).length },
    { label: '70+', count: filteredPatients.filter(p => (p.age as number) > 70).length },
  ];

  // Referrals and prescriptions
  const referrals = allVisits.filter(v => v.referral?.specialty).length;
  const totalRxDrugs = allVisits.reduce((sum, v) => sum + (v.drugs?.length ?? 0), 0);
  const avgRxPerVisit = allVisits.length ? (totalRxDrugs / allVisits.length).toFixed(1) : '—';
  const referralRate = allVisits.length ? Math.round((referrals / allVisits.length) * 100) : 0;

  // IPD/OPD breakdown
  const ipdCount = filteredPatients.filter(p => p.status === 'IPD' || p.status === 'Critical').length;
  const opdCount = filteredPatients.filter(p => p.status === 'OPD').length;
  const dischargedCount = filteredPatients.filter(p => p.status === 'Discharged').length;

  // Clinic breakdown (for "All Clinics" view)
  const clinicBreakdown = clinics.map(c => ({
    ...c,
    patientCount: patients.filter(p => p.clinicId === c.id).length,
    visitCount: Object.values(visits).flat().filter(v =>
      patients.some(p => p.id === v.patientId && p.clinicId === c.id)
    ).length,
  }));

  const BAR_COLORS = ['bg-teal-500', 'bg-blue-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-slate-300'];

  return (
    <div className="p-4 md:p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Clinic Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">{user?.name} · {user?.hospital ?? 'Solo Practice'}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {clinics.length > 0 && (
            <select
              value={selectedClinicId}
              onChange={e => setSelectedClinicId(e.target.value)}
              className="input text-sm py-1.5 px-3 w-auto"
            >
              <option value="all">All Clinics</option>
              {clinics.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          <button className="btn-ghost btn-sm text-slate-500">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <div className="tab-bar">
            {(['week', 'month', 'quarter'] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)} className={cn('tab-btn', period === p && 'active')}>
                {p === 'week' ? 'Week' : p === 'month' ? 'Month' : 'Quarter'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 1: Primary KPIs ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard icon={Stethoscope} label="Consultations Today" value={todayPatients || todayQueue}
          sub={`${todayQueue} in queue`} iconBg="bg-teal-50 text-teal-600" />
        <KpiCard icon={Calendar} label="This Week" value={weekVisits}
          sub="Visit records" iconBg="bg-blue-50 text-blue-600" />
        <KpiCard icon={BarChart3} label="This Month" value={monthVisits}
          sub={prevMonthVisits > 0 ? `${prevMonthVisits} last month` : 'No prior data'} delta={monthDelta || undefined}
          iconBg="bg-violet-50 text-violet-600" />
        <KpiCard icon={Users} label="Total Patients" value={totalPatients}
          sub={`${newThisMonth} new this month`}
          iconBg="bg-amber-50 text-amber-600" />
      </div>

      {/* ── Appointment Insights ─────────────────────────────────────────────── */}
      {aptTotal > 0 && (
        <div className="card p-5">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-600" />
            Appointment Insights
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Upcoming Scheduled', value: aptScheduled, color: 'text-teal-700', bg: 'bg-teal-50', desc: 'Future appointments' },
              { label: 'Seen / Completed',   value: aptCompleted, color: 'text-emerald-700', bg: 'bg-emerald-50', desc: 'Appointments completed' },
              { label: 'No Show',            value: aptNoShow,    color: 'text-amber-700',  bg: 'bg-amber-50', desc: 'Patients who didn\'t come' },
              { label: 'Show Rate',          value: `${seenRate}%`, color: 'text-blue-700', bg: 'bg-blue-50', desc: `${aptCompleted} of ${aptCompleted + aptNoShow} seen` },
            ].map(m => (
              <div key={m.label} className={`rounded-xl p-4 text-center ${m.bg}`}>
                <div className={`text-2xl font-black mb-0.5 ${m.color}`}>{m.value}</div>
                <div className="text-xs font-semibold text-slate-700">{m.label}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{m.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Row 2: Practice Vitals ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Clock,    label: 'Avg OPD / Day',  value: period === 'week' ? (weekVisits > 0 ? Math.ceil(weekVisits / 7) : 0) : (monthVisits > 0 ? Math.ceil(monthVisits / 30) : 0), sub: 'consultations', iconBg: 'bg-teal-50 text-teal-600' },
          { icon: Activity, label: 'Total Visits',   value: allVisits.length, sub: 'all time records', iconBg: 'bg-emerald-50 text-emerald-600' },
          { icon: Pill,     label: 'Avg Rx / Visit', value: avgRxPerVisit, sub: 'drugs prescribed', iconBg: 'bg-blue-50 text-blue-600' },
          { icon: Share2,   label: 'Referral Rate',  value: `${referralRate}%`, sub: `${referrals} referrals made`, iconBg: 'bg-violet-50 text-violet-600' },
        ].map(k => (
          <div key={k.label} className="card p-4 flex items-center gap-3">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', k.iconBg)}>
              <k.icon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xl font-black text-slate-900">{k.value}</div>
              <div className="text-xs font-medium text-slate-700">{k.label}</div>
              <div className="text-[10px] text-slate-400">{k.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Clinic Breakdown (All Clinics view) ──────────────────────────── */}
      {selectedClinicId === 'all' && clinics.length > 0 && (
        <div className="card p-5">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-teal-600" />
            Clinic-wise Breakdown
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {clinicBreakdown.map((c, i) => {
              const maxPts = Math.max(...clinicBreakdown.map(x => x.patientCount), 1);
              const pct = Math.round((c.patientCount / maxPts) * 100);
              const barColors = ['bg-teal-500', 'bg-blue-500', 'bg-violet-500'];
              return (
                <div key={c.id} className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-semibold text-slate-800 text-sm">{c.name}</div>
                      <div className="text-[10px] text-slate-400">{c.timings}</div>
                    </div>
                    <button
                      onClick={() => setSelectedClinicId(c.id)}
                      className="text-[10px] text-teal-600 font-semibold hover:underline"
                    >
                      Filter
                    </button>
                  </div>
                  <div className="flex items-end gap-4 mt-3">
                    <div className="text-center">
                      <div className="text-2xl font-black text-slate-900">{c.patientCount}</div>
                      <div className="text-[10px] text-slate-500">Patients</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-black text-teal-700">{c.visitCount}</div>
                      <div className="text-[10px] text-slate-500">Visits</div>
                    </div>
                    <div className="flex-1">
                      <div className="text-[10px] text-slate-400 mb-1">Share</div>
                      <div className="h-2 rounded-full bg-slate-200">
                        <div className={cn('h-full rounded-full', barColors[i % barColors.length])}
                          style={{ width: `${pct || 2}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] text-slate-400">Fee: ₹{c.fee} · Cap: {c.maxPatients}/day</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Row 3: OPD Trend + Demographics ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Monthly OPD trend chart */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800">OPD Trend</h3>
              <p className="text-xs text-slate-400">Monthly consultations — last 6 months</p>
            </div>
            {monthDelta !== 0 && (
              <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${monthDelta > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                {monthDelta > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                {Math.abs(monthDelta)}% vs last month
              </div>
            )}
          </div>
          <div className="flex items-end gap-2 h-28">
            {last6Months.map((m) => (
              <div key={m.label} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="relative w-full">
                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded z-10 whitespace-nowrap">
                    {m.count} visits
                  </div>
                  <div className="w-full rounded-t bg-teal-500 transition-all"
                    style={{ height: `${Math.max((m.count / Math.max(...last6Months.map(x => x.count))) * 112, 6)}px` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-1">
            {last6Months.map(m => (
              <div key={m.label} className="flex-1 text-center text-[10px] text-slate-400">{m.label}</div>
            ))}
          </div>
          {/* month totals row */}
          <div className="flex gap-2 mt-1">
            {last6Months.map(m => (
              <div key={m.label} className="flex-1 text-center text-[10px] font-semibold text-teal-700">{m.count}</div>
            ))}
          </div>
        </div>

        {/* Patient type breakdown */}
        <div className="card p-5">
          <h3 className="font-bold text-slate-800 mb-4">Patient Status</h3>
          <DonutChart slices={[
            { label: 'OPD', value: opdCount, color: 'fill-teal-500' },
            { label: 'IPD', value: ipdCount, color: 'fill-blue-500' },
            { label: 'Discharged', value: dischargedCount, color: 'fill-slate-300' },
          ]} />
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2">
            <div className="text-center">
              <div className="text-lg font-black text-teal-600">{newThisMonth}</div>
              <div className="text-[10px] text-slate-500">New this month</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-black text-blue-600">{Math.max(totalPatients - newThisMonth, 0)}</div>
              <div className="text-[10px] text-slate-500">Returning</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 4: Top Diagnoses + Gender + Age ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Top diagnoses */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-bold text-slate-800 mb-4">My Top Diagnoses</h3>
          {topDx.length > 0 ? (
            <div className="space-y-3">
              {topDx.map(([name, count], i) => (
                <div key={name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-700 font-medium truncate flex-1 mr-2">{name}</span>
                    <span className="text-slate-500 flex-shrink-0">{count} patient{count !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className={cn('h-full rounded-full', BAR_COLORS[i])} style={{ width: `${(count / maxDx) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-sm">
              No diagnosis data yet. Start consultations to see trends.
            </div>
          )}
        </div>

        {/* Gender + Age groups */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-bold text-slate-800 mb-3">Gender Split</h3>
            <DonutChart slices={[
              { label: 'Male',   value: male,  color: 'fill-blue-500' },
              { label: 'Female', value: female, color: 'fill-rose-400' },
              { label: 'Other',  value: other,  color: 'fill-slate-300' },
            ]} />
          </div>

          <div className="card p-5">
            <h3 className="font-bold text-slate-800 mb-3">Age Groups</h3>
            <BarChart
              labels={ageGroups.map(a => a.label)}
              values={ageGroups.map(a => a.count)}
              color="bg-teal-500"
              height={64}
            />
          </div>
        </div>
      </div>

      {/* ── Row 5: Clinical Performance ──────────────────────────────────── */}
      <div className="card p-5">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500" />
          Clinical Performance Indicators
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {(() => {
            // Follow-up compliance: patients who had a follow-up visit after their first visit
            const patientsWithMultipleVisits = Object.values(visits).filter(vList => vList.length > 1).length;
            const followUpCompliance = totalPatients > 0
              ? Math.round((patientsWithMultipleVisits / Math.max(totalPatients, 1)) * 100)
              : null;

            // Avg wait time: from queue registeredAt → in-progress time (only has data if queue entries exist)
            const completedQueueEntries = queue.filter(q =>
              q.status === 'completed' && q.registeredAt && q.waitMins != null
            );
            const avgWaitMins = completedQueueEntries.length > 0
              ? Math.round(completedQueueEntries.reduce((s, q) => s + (q.waitMins ?? 0), 0) / completedQueueEntries.length)
              : null;

            // Admission rate
            const admissionRate = totalPatients > 0 ? Math.round((ipdCount / totalPatients) * 100) : 0;

            // Completed today
            const completedToday = todayPatients || queue.filter(q => q.status === 'completed').length;

            return [
              {
                label: 'Follow-up Compliance',
                value: followUpCompliance !== null ? `${followUpCompliance}%` : '—',
                desc: followUpCompliance !== null ? 'Patients with return visits' : 'No visit data yet',
                good: true,
              },
              {
                label: 'Avg Wait Time',
                value: avgWaitMins !== null ? `${avgWaitMins} min` : '—',
                desc: avgWaitMins !== null ? 'Before consultation' : 'No queue data yet',
                good: true,
              },
              {
                label: 'Admission Rate',
                value: `${admissionRate}%`,
                desc: 'OPD to IPD conversions',
                good: false,
              },
              {
                label: 'Completed Today',
                value: `${completedToday}`,
                desc: 'Consultations done',
                good: true,
              },
            ];
          })().map(m => (
            <div key={m.label} className="bg-slate-50 rounded-xl p-4 text-center">
              <div className={cn('text-2xl font-black mb-1', m.good ? 'text-teal-700' : 'text-amber-700')}>{m.value}</div>
              <div className="text-xs font-semibold text-slate-700">{m.label}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{m.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Row 6: Quick Summary Table ─────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Period Summary</h3>
          <p className="text-xs text-slate-500">Comparing this period vs last period</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Metric</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">This Period</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Last Period</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {[
                { metric: 'Total OPD',     curr: monthVisits,                                    prev: prevMonthVisits },
                { metric: 'New Patients',  curr: newThisMonth,                                   prev: filteredPatients.filter(p => { const d = new Date(p.admitDate ?? ''); return d >= daysAgo(60) && d < monthStart; }).length },
                { metric: 'Total IPD',     curr: ipdCount,                                       prev: 0 },
                { metric: 'Referrals',     curr: referrals,                                      prev: allVisits.filter(v => v.referral?.specialty && new Date(v.date) >= daysAgo(60) && new Date(v.date) < monthStart).length },
                { metric: 'Rx Written',    curr: Object.values(prescriptions).flat().length,     prev: 0 },
                { metric: 'Appts Booked',  curr: filteredApts.filter(a => { const d = new Date(a.createdAt ?? ''); return d >= monthStart; }).length, prev: filteredApts.filter(a => { const d = new Date(a.createdAt ?? ''); return d >= daysAgo(60) && d < monthStart; }).length },
              ].map(row => {
                const change = row.prev > 0 ? Math.round(((row.curr - row.prev) / row.prev) * 100) : 0;
                return (
                  <tr key={row.metric} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-900">{row.metric}</td>
                    <td className="px-5 py-3 text-right font-bold text-slate-900">{row.curr}</td>
                    <td className="px-5 py-3 text-right text-slate-500">{row.prev}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={cn('text-xs font-semibold flex items-center justify-end gap-0.5',
                        change >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                        {change >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                        {Math.abs(change)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
