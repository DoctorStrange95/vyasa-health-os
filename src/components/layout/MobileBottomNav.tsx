import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, ListOrdered, Pill, User } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { cn } from '@/lib/utils';

// Quick-access bottom nav for the 5 most common actions on mobile
const BOTTOM_NAV_BY_ROLE: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; to: string }[]> = {
  doctor: [
    { icon: LayoutDashboard, label: 'Home', to: '/app/dashboard' },
    { icon: Users, label: 'Patients', to: '/app/patients' },
    { icon: ListOrdered, label: 'Queue', to: '/app/queue' },
    { icon: Pill, label: 'Rx', to: '/app/prescriptions' },
    { icon: User, label: 'Profile', to: '/app/profile' },
  ],
  clinic_admin: [
    { icon: ListOrdered, label: "OPD", to: '/app/queue' },
    { icon: Users, label: 'Patients', to: '/app/patients' },
    { icon: Pill, label: 'Write Rx', to: '/app/prescriptions' },
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
  const { user } = useAuthStore();
  const location = useLocation();

  if (!user) return null;
  const items = BOTTOM_NAV_BY_ROLE[user.role];
  if (!items) return null;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-20 safe-area-pb">
      <div className="flex">
        {items.map(item => {
          const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-[10px] font-medium transition-colors',
                isActive
                  ? 'text-teal-600'
                  : 'text-slate-400 active:text-teal-500'
              )}
            >
              <item.icon className={cn('w-5 h-5', isActive && 'text-teal-600')} />
              {item.label}
              {isActive && <span className="absolute bottom-0 w-6 h-0.5 bg-teal-500 rounded-full" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
