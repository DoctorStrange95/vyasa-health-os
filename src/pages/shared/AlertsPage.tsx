import { Bell, CheckCheck } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function AlertsPage() {
  const { alerts, acknowledgeAlert } = useAppStore();

  const unack = alerts.filter(a => !a.acknowledged);
  const ack = alerts.filter(a => a.acknowledged);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Alerts</h1>
          <p className="page-subtitle">{unack.length} unacknowledged · {ack.length} resolved</p>
        </div>
        {unack.length > 0 && (
          <button onClick={() => unack.forEach(a => acknowledgeAlert(a.id))} className="btn-secondary">
            <CheckCheck className="w-4 h-4" /> Acknowledge All
          </button>
        )}
      </div>

      {unack.length > 0 && (
        <div className="mb-5">
          <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Active Alerts ({unack.length})
          </h2>
          <div className="space-y-3">
            {unack.map(a => (
              <div key={a.id} className={cn('card p-4 border-l-4', a.severity === 'critical' ? 'border-l-red-500' : a.severity === 'warning' ? 'border-l-amber-500' : 'border-l-blue-500')}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Bell className={cn('w-5 h-5 mt-0.5 flex-shrink-0', a.severity === 'critical' ? 'text-red-500' : a.severity === 'warning' ? 'text-amber-500' : 'text-blue-500')} />
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-slate-900">{a.patientName}</span>
                        <span className={cn('badge', a.severity === 'critical' ? 'bg-red-100 text-red-700' : a.severity === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700')}>{a.severity}</span>
                        <span className="badge bg-slate-100 text-slate-600">{a.type}</span>
                      </div>
                      <p className="text-sm text-slate-700">{a.message}</p>
                      <p className="text-xs text-slate-400 mt-1">{formatDateTime(a.time)}</p>
                    </div>
                  </div>
                  <button onClick={() => acknowledgeAlert(a.id)} className="btn-secondary btn-sm flex-shrink-0">
                    Acknowledge
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {ack.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-slate-500 mb-3">Resolved ({ack.length})</h2>
          <div className="space-y-2">
            {ack.map(a => (
              <div key={a.id} className="card p-4 opacity-60">
                <div className="flex items-center gap-3">
                  <CheckCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span className="font-semibold text-slate-700">{a.patientName}</span>
                  <span className="text-sm text-slate-500">{a.message}</span>
                  <span className="text-xs text-slate-400 ml-auto">{formatDateTime(a.time)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {alerts.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
          <Bell className="w-12 h-12 mb-3 text-slate-200" />
          <p className="font-medium">No alerts</p>
          <p className="text-sm">All patients are stable</p>
        </div>
      )}
    </div>
  );
}
