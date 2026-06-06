import { Clock } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import type { QueueStatus } from '@/types';

const STATUS_COLOR: Record<QueueStatus, string> = {
  waiting: 'bg-yellow-100 text-yellow-700',
  'in-progress': 'bg-teal-100 text-teal-700',
  completed: 'bg-slate-100 text-slate-500',
  'no-show': 'bg-red-100 text-red-500',
};

export default function OPDQueuePage() {
  const { queue } = useAppStore();

  const waiting = queue.filter(q => q.status === 'waiting');
  const inProgress = queue.filter(q => q.status === 'in-progress');
  const done = queue.filter(q => q.status === 'completed' || q.status === 'no-show');

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">OPD Queue</h1>
        <p className="page-subtitle">{waiting.length} waiting · {inProgress.length} in consult · {done.length} done</p>
      </div>

      {/* In progress */}
      {inProgress.length > 0 && (
        <div className="mb-5">
          <h2 className="text-sm font-bold text-teal-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            In Consultation ({inProgress.length})
          </h2>
          <div className="space-y-2">
            {inProgress.map(q => <QueueCard key={q.id} q={q} />)}
          </div>
        </div>
      )}

      {/* Waiting */}
      <div className="mb-5">
        <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-yellow-500" />
          Waiting ({waiting.length})
        </h2>
        {waiting.length > 0 ? (
          <div className="space-y-2">
            {waiting.map(q => <QueueCard key={q.id} q={q} />)}
          </div>
        ) : (
          <div className="card p-6 text-center text-slate-400 text-sm">
            Queue is empty
          </div>
        )}
      </div>

      {/* Done */}
      {done.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-slate-500 mb-3">Completed ({done.length})</h2>
          <div className="space-y-2">
            {done.map(q => <QueueCard key={q.id} q={q} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function QueueCard({ q }: { q: any }) {
  return (
    <div className="card p-4 flex items-center gap-4">
      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-lg font-black flex-shrink-0', q.status === 'in-progress' ? 'bg-teal-500 text-white' : q.status === 'waiting' ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-100 text-slate-500')}>
        {q.token}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-slate-900">{q.patientName}</div>
        <div className="text-sm text-slate-500">{q.reason}</div>
        {q.assignedDoctor && <div className="text-xs text-slate-400">{q.assignedDoctor}</div>}
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className={cn('badge', STATUS_COLOR[q.status as QueueStatus])}>{q.status}</span>
        {q.waitMins != null && q.status === 'waiting' && (
          <span className="text-xs text-slate-400">{q.waitMins}m wait</span>
        )}
      </div>
    </div>
  );
}
