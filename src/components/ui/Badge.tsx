import { cn } from '@/lib/utils';
import type { PatientStatus, Priority, AlertSeverity, LabStatus } from '@/types';

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
}

export function Badge({ children, className }: BadgeProps) {
  return <span className={cn('badge', className)}>{children}</span>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const cls: Record<Priority, string> = {
    Critical: 'priority-critical',
    High: 'priority-high',
    Medium: 'priority-medium',
    Stable: 'priority-stable',
  };
  return <span className={cn('badge', cls[priority])}>{priority}</span>;
}

export function StatusBadge({ status }: { status: PatientStatus }) {
  const cls: Record<PatientStatus, string> = {
    IPD: 'status-admitted',
    OPD: 'status-active',
    Critical: 'status-critical',
    Discharged: 'status-discharged',
    Deceased: 'bg-slate-200 text-slate-600',
    Referred: 'bg-violet-100 text-violet-700',
  };
  return <span className={cn('badge', cls[status])}>{status}</span>;
}

export function AlertBadge({ severity }: { severity: AlertSeverity }) {
  const cls: Record<AlertSeverity, string> = {
    critical: 'bg-red-100 text-red-700',
    warning: 'bg-amber-100 text-amber-700',
    info: 'bg-blue-100 text-blue-700',
  };
  return <span className={cn('badge', cls[severity])}>{severity}</span>;
}

export function LabStatusBadge({ status }: { status: LabStatus }) {
  const cls: Record<LabStatus, string> = {
    ordered: 'bg-slate-100 text-slate-600',
    collected: 'bg-blue-100 text-blue-700',
    processing: 'bg-yellow-100 text-yellow-700',
    resulted: 'bg-emerald-100 text-emerald-700',
    critical: 'bg-red-100 text-red-700',
  };
  return <span className={cn('badge', cls[status])}>{status}</span>;
}
