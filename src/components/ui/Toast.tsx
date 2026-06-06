import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useAppStore, type Toast } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

const ICONS: Record<Toast['type'], React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const STYLES: Record<Toast['type'], string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  info: 'border-blue-200 bg-blue-50 text-blue-800',
};

function ToastItem({ toast }: { toast: Toast }) {
  const { removeToast } = useAppStore();
  const Icon = ICONS[toast.type];
  return (
    <div className={cn('flex items-start gap-3 p-4 rounded-xl border shadow-lg text-sm font-medium max-w-sm', STYLES[toast.type])}>
      <Icon className="w-4.5 h-4.5 flex-shrink-0 mt-0.5" />
      <span className="flex-1">{toast.message}</span>
      <button onClick={() => removeToast(toast.id)} className="flex-shrink-0 opacity-60 hover:opacity-100">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts } = useAppStore();
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2">
      {toasts.map(t => <ToastItem key={t.id} toast={t} />)}
    </div>
  );
}
