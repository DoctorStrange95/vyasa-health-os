import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, ListOrdered, User, Lock, Pill } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

// Quick-access bottom nav for the 5 most common actions on mobile
const BOTTOM_NAV_BY_ROLE: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; to?: string }[]> = {
  doctor: [
    { icon: LayoutDashboard, label: 'Home', to: '/app/dashboard' },
    { icon: Users, label: 'Patients', to: '/app/patients' },
    { icon: ListOrdered, label: 'Queue', to: '/app/queue' },
    { icon: Pill, label: 'Rx', to: undefined },
    { icon: User, label: 'Profile', to: '/app/profile' },
  ],
  clinic_admin: [
    { icon: ListOrdered, label: "OPD", to: '/app/queue' },
    { icon: Users, label: 'Patients', to: '/app/patients' },
    { icon: Pill, label: 'Write Rx', to: undefined },
    { icon: LayoutDashboard, label: 'Dashboard', to: '/app/dashboard' },
    { icon: User, label: 'Profile', to: '/app/profile' },
  ],
  nurse: [
    { icon: LayoutDashboard, label: 'Home', to: '/app/dashboard' },
    { icon: Users, label: 'Patients', to: '/app/patients' },
    { icon: ListOrdered, label: 'Vitals', to: '/app/vitals' },
    { icon: User, label: 'Profile', to: '/app/profile' },
  ],
};

export function MobileBottomNav() {
  const { user, isDemo } = useAuthStore();
  const { openQuickRxModal } = useAppStore();
  const location = useLocation();

  if (!user) return null;
  const items = BOTTOM_NAV_BY_ROLE[user.role];
  if (!items) return null;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-20 safe-area-pb">
      <div className="flex">
        {items.map(item => {
          const isActive = item.to && (location.pathname === item.to || location.pathname.startsWith(item.to + '/'));
          // Disable Write Rx in demo mode
          const isDisabledForDemo = isDemo && (item.label === 'Write Rx' || item.label === 'Rx');

          // Highlight Rx/Write Rx button
          const isRxButton = item.label.includes('Rx');

          return isDisabledForDemo ? (
            <div
              key={item.label}
              className="relative flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-[10px] font-medium opacity-50 cursor-not-allowed"
              title="Not available in demo mode"
            >
              <div className="w-5 h-5 relative">
                <item.icon className="w-5 h-5 text-slate-400" />
                <Lock className="w-3 h-3 absolute -bottom-0.5 -right-0.5 text-red-500" />
              </div>
              {item.label}
            </div>
          ) : isRxButton ? (
            <button
              key={item.label}
              onClick={openQuickRxModal}
              className={cn(
                'relative flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-[10px] font-medium transition-colors rounded-lg',
                'text-slate-400 active:text-teal-500',
                'border-t-2 border-teal-500'
              )}
            >
              <item.icon className="w-5 h-5 text-teal-600" />
              <span className="font-semibold text-teal-700">{item.label}</span>
            </button>
          ) : (
            <Link
              key={item.label}
              to={item.to || '#'}
              className={cn(
                'relative flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-[10px] font-medium transition-colors rounded-lg',
                isActive
                  ? 'text-teal-600 bg-teal-50'
                  : 'text-slate-400 active:text-teal-500'
              )}
            >
              <item.icon className={cn('w-5 h-5', isActive && 'text-teal-600')} />
              <span className={cn('font-semibold', isActive && 'text-teal-700')}>{item.label}</span>
              {isActive && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-teal-500 rounded-full" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
