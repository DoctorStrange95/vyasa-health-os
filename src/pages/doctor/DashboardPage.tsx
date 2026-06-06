import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Link } from 'react-router-dom';
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge';
import { Users, BedDouble, Bell, Clock, TrendingUp, AlertTriangle, Activity, CheckCircle2 } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { patients, alerts, queue, beds, vitals } = useAppStore();

  const myPatients = patients.filter(p => p.attendingDoctorId === user?.id);
  const ipd = myPatients.filter(p => p.status === 'IPD');
  const opd = myPatients.filter(p => p.status === 'OPD');
  const critical = myPatients.filter(p => p.priority === 'Critical');
  const unackAlerts = alerts.filter(a => !a.acknowledged);
  const availBeds = beds.filter(b => b.status === 'available').length;
  const waitingQueue = queue.filter(q => q.status === 'waiting' || q.status === 'in-progress');

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div>
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          {greeting}, {user?.name?.split(' ').slice(0, 2).join(' ')} 👋
        </h1>
        <p className="text-slate-500 mt-1 text-sm">Here's your clinical overview for today.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<BedDouble className="w-5 h-5 text-blue-500" />}
          label="IPD Patients"
          value={ipd.length}
          sub={`${critical.length} critical`}
          subColor="text-red-500"
          bg="bg-blue-50"
          to="/app/patients"
        />
        <StatCard
          icon={<Users className="w-5 h-5 text-teal-500" />}
          label="OPD Today"
          value={opd.length}
          sub={`${waitingQueue.length} in queue`}
          subColor="text-slate-500"
          bg="bg-teal-50"
          to="/app/queue"
        />
        <StatCard
          icon={<Bell className="w-5 h-5 text-red-500" />}
          label="Active Alerts"
          value={unackAlerts.length}
          sub="Unacknowledged"
          subColor={unackAlerts.length > 0 ? 'text-red-500' : 'text-slate-500'}
          bg="bg-red-50"
          to="/app/alerts"
        />
        <StatCard
          icon={<Activity className="w-5 h-5 text-emerald-500" />}
          label="Beds Available"
          value={availBeds}
          sub={`${beds.length} total beds`}
          subColor="text-slate-500"
          bg="bg-emerald-50"
          to="/app/beds"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Critical patients */}
        <div className="xl:col-span-2 card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900">My Patients</h3>
              <p className="text-xs text-slate-500">{myPatients.length} total · {critical.length} critical</p>
            </div>
            <Link to="/app/patients" className="btn-secondary btn-sm">View all</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {myPatients.slice(0, 6).map(p => {
              const latest = vitals[p.id]?.[0];
              return (
                <Link
                  key={p.id}
                  to={`/app/patients/${p.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-700 font-bold text-sm flex-shrink-0">
                    {p.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 text-sm">{p.name}</span>
                      <span className="text-xs text-slate-400">{p.age}y {p.gender}</span>
                    </div>
                    <div className="text-xs text-slate-500 truncate">{p.diagnosis || 'No diagnosis'}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {latest && (
                      <span className="text-xs text-slate-500 hidden md:inline">
                        BP {latest.bp} · SpO2 {latest.spo2}%
                      </span>
                    )}
                    <StatusBadge status={p.status} />
                    <PriorityBadge priority={p.priority} />
                  </div>
                </Link>
              );
            })}
            {myPatients.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-slate-400">No patients assigned yet</div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Unack Alerts */}
          <div className="card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                Active Alerts
              </h3>
              <Link to="/app/alerts" className="text-xs text-teal-600 hover:underline">View all</Link>
            </div>
            <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto">
              {unackAlerts.slice(0, 5).map(a => (
                <div key={a.id} className="px-5 py-3">
                  <div className="flex items-start gap-2">
                    <span className="w-2 h-2 mt-1.5 rounded-full bg-red-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">{a.patientName}</div>
                      <div className="text-xs text-slate-500 truncate">{a.message}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{formatDateTime(a.time)}</div>
                    </div>
                  </div>
                </div>
              ))}
              {unackAlerts.length === 0 && (
                <div className="px-5 py-5 flex items-center gap-2 text-sm text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" /> All clear
                </div>
              )}
            </div>
          </div>

          {/* OPD Queue */}
          <div className="card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-500" />
                OPD Queue
              </h3>
              <Link to="/app/queue" className="text-xs text-teal-600 hover:underline">Manage</Link>
            </div>
            <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto">
              {waitingQueue.slice(0, 4).map(q => (
                <div key={q.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-7 h-7 rounded-full bg-teal-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {q.token}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-900">{q.patientName}</div>
                    <div className="text-xs text-slate-500 truncate">{q.reason}</div>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0">
                    <span className={`badge text-[10px] ${q.status === 'in-progress' ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-600'}`}>
                      {q.status === 'in-progress' ? 'In Consult' : 'Waiting'}
                    </span>
                    {q.waitMins != null && <span className="text-[10px] text-slate-400 mt-0.5">{q.waitMins}m wait</span>}
                  </div>
                </div>
              ))}
              {waitingQueue.length === 0 && (
                <div className="px-5 py-5 text-sm text-slate-400 text-center">Queue empty</div>
              )}
            </div>
          </div>

          {/* Quick stats */}
          <div className="card px-5 py-4">
            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-500" />
              Today's Summary
            </h3>
            <div className="space-y-2.5">
              {[
                { label: 'Discharges today', value: myPatients.filter(p => p.status === 'Discharged').length },
                { label: 'Labs pending', value: Object.values(vitals).flat().length > 0 ? 2 : 0 },
                { label: 'Rx written', value: 4 },
                { label: 'Consult notes', value: 3 },
              ].map(s => (
                <div key={s.label} className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">{s.label}</span>
                  <span className="font-bold text-slate-900 text-sm">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, sub, subColor, bg, to
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub: string;
  subColor: string;
  bg: string;
  to: string;
}) {
  return (
    <Link to={to} className="stat-card hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>{icon}</div>
      </div>
      <div className="text-3xl font-black text-slate-900">{value}</div>
      <div className="text-sm font-medium text-slate-600">{label}</div>
      <div className={`text-xs mt-0.5 font-medium ${subColor}`}>{sub}</div>
    </Link>
  );
}
