import { useAuthStore } from '@/store/useAuthStore';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserPlus, Brain, Pill, FlaskConical,
  Bell, LogOut, FileText, ListOrdered, Network, User,
  Activity, ClipboardList, Package, TestTube,
  DollarSign, Receipt, UserCheck, BedDouble,
  BarChart3, Link2, ScrollText, Gauge, ChevronLeft, Settings2, CalendarDays, ClipboardCheck, ShieldCheck
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
    { icon: Settings2, label: 'Rx Pad Settings', to: '/app/pad-settings' },
    { icon: User, label: 'My Profile', to: '/app/profile' },
  ],
  // Solo-practice doctor — minimal, workflow-ordered
  clinic_admin: [
    { icon: LayoutDashboard, label: 'Dashboard',        to: '/app/dashboard' },
    { icon: ListOrdered,     label: "Today's OPD",      to: '/app/queue' },
    { icon: Users,           label: 'My Patients',      to: '/app/patients' },
    { icon: ClipboardCheck,  label: 'Booking Requests', to: '/app/bookings' },
    { icon: BarChart3,       label: 'Analytics',        to: '/app/analytics' },
    { icon: Users,           label: 'My Staff',         to: '/app/settings?tab=staff' },
    { icon: Settings2,       label: 'Settings',         to: '/app/settings' },
    { icon: User,            label: 'My Profile',       to: '/app/profile' },
  ],
  nurse: [
    { icon: ListOrdered, label: 'Home', to: '/app/dashboard' },
    { icon: Users, label: 'My Patients', to: '/app/nurse-patients' },
    { icon: Activity, label: 'Vitals Entry', to: '/app/vitals' },
    { icon: ClipboardList, label: 'Medication MAR', to: '/app/mar' },
    { icon: ScrollText, label: 'Nursing Notes', to: '/app/notes' },
    { icon: FlaskConical, label: 'Lab Orders', to: '/app/labs' },
    { icon: User, label: 'My Profile', to: '/app/profile' },
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
    { icon: LayoutDashboard, label: 'Dashboard',        to: '/app/reception' },
    { icon: UserCheck,       label: 'Register Patient', to: '/app/register' },
    { icon: CalendarDays,    label: 'Appointments',     to: '/app/queue' },
    { icon: ClipboardCheck,  label: 'Prescriptions',    to: '/app/rx-view' },
    { icon: DollarSign,      label: 'Collect Payment',  to: '/app/collect-payment' },
    { icon: Bell,            label: 'Booking Requests', to: '/app/bookings' },
  ],
  patient: [
    { icon: Pill, label: 'My Prescriptions', to: '/app/patient-rx' },
    { icon: FileText, label: 'Discharge Summary', to: '/app/patient-discharge' },
  ],
  superadmin: [
    { icon: ShieldCheck, label: 'Approvals & Users', to: '/app/admin' },
    { icon: LayoutDashboard, label: 'Dashboard', to: '/app/dashboard' },
    { icon: Users, label: 'Patients', to: '/app/patients' },
    { icon: ListOrdered, label: 'OPD Queue', to: '/app/queue' },
    { icon: BarChart3, label: 'Analytics', to: '/app/analytics' },
    { icon: Settings2, label: 'Settings', to: '/app/settings' },
  ],
};

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar, mobileSidebarOpen, closeMobileSidebar, alerts, openQuickRegister } = useAppStore();
  const location = useLocation();

  if (!user) return null;

  const items = NAV_ITEMS[user.role] || [];
  const unackAlerts = alerts.filter(a => !a.acknowledged).length;

  // On mobile, sidebar is an overlay. On desktop, it's fixed in the layout.
  const collapsed = sidebarCollapsed;

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-navy-800 flex flex-col z-40 transition-all duration-200',
        // Desktop width
        collapsed ? 'lg:w-16' : 'lg:w-60',
        // Mobile: always full width when open, hidden when closed
        'w-72',
        mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-4 border-b border-white/10 flex-shrink-0">
        <img src="/logo.svg" alt="Vyasa" className="w-8 h-8 rounded-lg flex-shrink-0" />
        {/* Always show text on mobile; hide on desktop when collapsed */}
        <div className={cn('min-w-0', collapsed && 'lg:hidden')}>
          <div className="text-white font-bold text-base leading-tight tracking-tight">Vyasa</div>
          <div className="text-teal-400 text-[10px] font-medium uppercase tracking-widest">Integrated Healthcare</div>
        </div>
        {/* Desktop collapse toggle */}
        <button
          onClick={toggleSidebar}
          className={cn(
            'ml-auto text-slate-400 hover:text-white transition-colors p-0.5 hidden lg:block',
            collapsed && 'rotate-180'
          )}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {/* Mobile close button */}
        <button
          onClick={closeMobileSidebar}
          className="ml-auto text-slate-400 hover:text-white transition-colors p-0.5 lg:hidden"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Role badge */}
      <div className={cn('px-4 py-3 border-b border-white/10', collapsed && 'lg:hidden')}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 text-xs font-bold flex-shrink-0">
            {user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-white text-sm font-semibold truncate">{user.name}</div>
            <div className="text-slate-400 text-xs">
              {user.role === 'clinic_admin' ? 'Solo Practice' :
               user.role === 'doctor' ? 'Doctor' :
               user.role.charAt(0).toUpperCase() + user.role.slice(1).replace('_', ' ')}
              {user.specialty ? ` · ${user.specialty}` : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        <div className={cn('px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1', collapsed && 'lg:hidden')}>
          Navigation
        </div>
        {items.map(item => {
          const isActive = item.to.includes('?')
            ? (location.pathname + location.search) === item.to
            : location.pathname === item.to || location.pathname.startsWith(item.to + '/');
          const isAlerts = item.to === '/app/alerts';
          return (
            <Link
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              onClick={closeMobileSidebar}
              className={cn(
                'sidebar-nav-item',
                isActive && 'active',
                collapsed && 'lg:justify-center lg:px-0'
              )}
            >
              <div className="relative flex-shrink-0">
                <item.icon className="w-4.5 h-4.5" />
                {isAlerts && unackAlerts > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                    {unackAlerts > 9 ? '9+' : unackAlerts}
                  </span>
                )}
              </div>
              <span className={cn(collapsed && 'lg:hidden')}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Register Patient — quick access for clinic_admin / doctor / receptionist */}
      {(['clinic_admin', 'doctor', 'receptionist'] as Role[]).includes(user.role) && (
        <div className={cn('px-2 pb-2', collapsed && 'lg:px-1')}>
          <button
            onClick={() => { openQuickRegister(); closeMobileSidebar(); }}
            className={cn(
              'w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-semibold',
              'bg-teal-500 hover:bg-teal-600 active:scale-95 text-white transition-all shadow-sm',
              collapsed && 'lg:justify-center lg:px-0'
            )}
          >
            <UserPlus className="w-4.5 h-4.5 flex-shrink-0" />
            <span className={cn(collapsed && 'lg:hidden')}>Register Patient</span>
          </button>
        </div>
      )}

      {/* Logout */}
      <div className="p-2 border-t border-white/10">
        <button
          onClick={() => { logout(); closeMobileSidebar(); }}
          className={cn('sidebar-nav-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10', collapsed && 'lg:justify-center')}
        >
          <LogOut className="w-4.5 h-4.5 flex-shrink-0" />
          <span className={cn(collapsed && 'lg:hidden')}>Logout</span>
        </button>
      </div>
    </aside>
  );
}
