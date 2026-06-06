import { useAuthStore } from '@/store/useAuthStore';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserPlus, Brain, Pill, FlaskConical,
  Bell, LogOut, FileText, ListOrdered, Network, User,
  Activity, ClipboardList, Package, TestTube,
  DollarSign, Receipt, UserCheck, Stethoscope, BedDouble,
  BarChart3, Link2, ScrollText, Gauge, ChevronLeft
} from 'lucide-react';
import type { Role } from '@/types';

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  to: string;
}

const NAV_ITEMS: Record<Role, NavItem[]> = {
  doctor: [
    { icon: LayoutDashboard, label: 'Dashboard', to: '/app/dashboard' },
    { icon: Users, label: 'My Patients', to: '/app/patients' },
    { icon: UserPlus, label: 'Admit / Register', to: '/app/admit' },
    { icon: Brain, label: 'AI Triage', to: '/app/triage' },
    { icon: Pill, label: 'Prescriptions', to: '/app/prescriptions' },
    { icon: FlaskConical, label: 'Lab Orders', to: '/app/labs' },
    { icon: Bell, label: 'Alerts', to: '/app/alerts' },
    { icon: FileText, label: 'Discharge', to: '/app/discharge' },
    { icon: ListOrdered, label: 'OPD Queue', to: '/app/queue' },
    { icon: Network, label: 'Dr. Network', to: '/app/network' },
    { icon: BarChart3, label: 'Analytics', to: '/app/analytics' },
    { icon: User, label: 'My Profile', to: '/app/profile' },
  ],
  nurse: [
    { icon: Users, label: 'My Patients', to: '/app/patients' },
    { icon: Activity, label: 'Vitals Entry', to: '/app/vitals' },
    { icon: ClipboardList, label: 'Medication MAR', to: '/app/mar' },
    { icon: ScrollText, label: 'Nursing Notes', to: '/app/notes' },
    { icon: Bell, label: 'Alerts', to: '/app/alerts' },
    { icon: Brain, label: 'AI Triage', to: '/app/triage' },
  ],
  pharmacist: [
    { icon: Pill, label: 'Prescriptions', to: '/app/pharmacy' },
    { icon: Package, label: 'Inventory', to: '/app/inventory' },
  ],
  labtech: [
    { icon: TestTube, label: 'Lab Orders', to: '/app/labtech' },
    { icon: ClipboardList, label: 'Results', to: '/app/results' },
  ],
  admin: [
    { icon: Users, label: 'Staff', to: '/app/staff' },
    { icon: BedDouble, label: 'Beds & Wards', to: '/app/beds' },
    { icon: Link2, label: 'Integration', to: '/app/integration' },
    { icon: ScrollText, label: 'Audit Log', to: '/app/audit' },
    { icon: Gauge, label: 'Workload', to: '/app/workload' },
    { icon: BarChart3, label: 'Analytics', to: '/app/analytics' },
  ],
  billing: [
    { icon: DollarSign, label: 'Billing', to: '/app/billing' },
    { icon: Receipt, label: 'Bills List', to: '/app/bills' },
  ],
  receptionist: [
    { icon: UserCheck, label: 'Register Patient', to: '/app/register' },
    { icon: ListOrdered, label: 'OPD Queue', to: '/app/queue' },
  ],
  patient: [
    { icon: Pill, label: 'My Prescriptions', to: '/app/patient-rx' },
    { icon: FileText, label: 'Discharge Summary', to: '/app/patient-discharge' },
  ],
};

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar, alerts } = useAppStore();
  const location = useLocation();

  if (!user) return null;

  const items = NAV_ITEMS[user.role] || [];
  const unackAlerts = alerts.filter(a => !a.acknowledged).length;

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-navy-800 flex flex-col z-40 transition-all duration-200',
        sidebarCollapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-4 border-b border-white/10 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center flex-shrink-0">
          <Stethoscope className="w-4.5 h-4.5 text-white" />
        </div>
        {!sidebarCollapsed && (
          <div className="min-w-0">
            <div className="text-white font-bold text-base leading-tight tracking-tight">Vyasa</div>
            <div className="text-teal-400 text-[10px] font-medium uppercase tracking-widest">Health OS</div>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className={cn(
            'ml-auto text-slate-400 hover:text-white transition-colors p-0.5',
            sidebarCollapsed && 'rotate-180'
          )}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Role badge */}
      {!sidebarCollapsed && (
        <div className="px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 text-xs font-bold flex-shrink-0">
              {user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-white text-sm font-semibold truncate">{user.name}</div>
              <div className="text-slate-400 text-xs capitalize">{user.role}{user.specialty ? ` · ${user.specialty}` : ''}</div>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {!sidebarCollapsed && (
          <div className="px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
            Navigation
          </div>
        )}
        {items.map(item => {
          const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
          const isAlerts = item.to === '/app/alerts';
          return (
            <Link
              key={item.to}
              to={item.to}
              title={sidebarCollapsed ? item.label : undefined}
              className={cn('sidebar-nav-item', isActive && 'active', sidebarCollapsed && 'justify-center px-0')}
            >
              <div className="relative flex-shrink-0">
                <item.icon className="w-4.5 h-4.5" />
                {isAlerts && unackAlerts > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                    {unackAlerts > 9 ? '9+' : unackAlerts}
                  </span>
                )}
              </div>
              {!sidebarCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-white/10">
        <button
          onClick={logout}
          className={cn('sidebar-nav-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10', sidebarCollapsed && 'justify-center')}
        >
          <LogOut className="w-4.5 h-4.5 flex-shrink-0" />
          {!sidebarCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
