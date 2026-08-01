import { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserPlus, Pill, FlaskConical,
  Bell, LogOut, FileText, ListOrdered, Network, User,
  Activity, ClipboardList, Package, TestTube,
  DollarSign, Receipt, UserCheck, BedDouble,
  BarChart3, ScrollText, Settings2, CalendarDays,
  ClipboardCheck, ShieldCheck, MessageSquare, Building2,
  HelpCircle, ChevronDown, Menu, X,
} from 'lucide-react';
import type { Role } from '@/types';

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  to: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

// ─── Navigation groups by role ────────────────────────────────────────────────

const CLINIC_ADMIN_GROUPS: NavGroup[] = [
  {
    label: 'Main',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard',        to: '/app/dashboard' },
      { icon: ListOrdered,     label: "Today's OPD",      to: '/app/queue' },
      { icon: Users,           label: 'My Patients',      to: '/app/patients' },
    ],
  },
  {
    label: 'Consultation',
    items: [
      { icon: ClipboardCheck,  label: 'Booking Requests', to: '/app/bookings' },
      { icon: Pill,            label: 'Prescriptions',    to: '/app/prescriptions' },
      { icon: FlaskConical,    label: 'Lab Orders',       to: '/app/labs' },
    ],
  },
  {
    label: 'More',
    items: [
      { icon: BarChart3,       label: 'Analytics',        to: '/app/analytics' },
      { icon: UserCheck,       label: 'My Staff',         to: '/app/settings?tab=staff' },
      { icon: Settings2,       label: 'Settings',         to: '/app/settings' },
    ],
  },
];

const CLINIC_MANAGER_GROUPS: NavGroup[] = [
  {
    label: 'Main',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard',        to: '/app/dashboard' },
      { icon: CalendarDays,    label: 'Appointments',     to: '/app/schedule' },
      { icon: Users,           label: 'Patients',         to: '/app/patients' },
      { icon: ClipboardCheck,  label: 'Booking Requests', to: '/app/bookings' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { icon: UserCheck,       label: 'Staff',            to: '/app/org/staff' },
      { icon: BedDouble,       label: 'Beds & Wards',     to: '/app/beds' },
      { icon: DollarSign,      label: 'Billing',          to: '/app/billing' },
    ],
  },
  {
    label: 'More',
    items: [
      { icon: BarChart3,       label: 'Analytics',        to: '/app/analytics' },
      { icon: Building2,       label: 'Organisation',     to: '/app/settings' },
    ],
  },
];

const DOCTOR_GROUPS: NavGroup[] = [
  {
    label: 'Main',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard',   to: '/app/dashboard' },
      { icon: ListOrdered,     label: 'OPD Queue',   to: '/app/queue' },
      { icon: Users,           label: 'My Patients', to: '/app/patients' },
    ],
  },
  {
    label: 'Consultation',
    items: [
      { icon: Pill,         label: 'Prescriptions', to: '/app/prescriptions' },
      { icon: FlaskConical, label: 'Lab Orders',    to: '/app/labs' },
      { icon: FileText,     label: 'Discharge',     to: '/app/discharge' },
      { icon: Bell,         label: 'Alerts',        to: '/app/alerts' },
    ],
  },
  {
    label: 'More',
    items: [
      { icon: Network,   label: 'Dr. Network',    to: '/app/network' },
      { icon: BarChart3, label: 'Analytics',      to: '/app/analytics' },
      { icon: Settings2, label: 'Rx Pad Settings', to: '/app/pad-settings' },
    ],
  },
];

const NURSE_GROUPS: NavGroup[] = [
  {
    label: 'Main',
    items: [
      { icon: LayoutDashboard, label: 'Home',           to: '/app/dashboard' },
      { icon: Users,           label: 'My Patients',    to: '/app/nurse-patients' },
    ],
  },
  {
    label: 'Clinical',
    items: [
      { icon: Activity,      label: 'Vitals Entry',   to: '/app/vitals' },
      { icon: ClipboardList, label: 'Medication MAR', to: '/app/mar' },
      { icon: ScrollText,    label: 'Nursing Notes',  to: '/app/notes' },
      { icon: FlaskConical,  label: 'Lab Orders',     to: '/app/labs' },
    ],
  },
];

const RECEPTIONIST_GROUPS: NavGroup[] = [
  {
    label: 'Main',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard',        to: '/app/reception' },
      { icon: UserCheck,       label: 'Register Patient', to: '/app/register' },
      { icon: CalendarDays,    label: 'Appointments',     to: '/app/queue' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { icon: ClipboardCheck, label: 'Prescriptions',    to: '/app/rx-view' },
      { icon: DollarSign,     label: 'Collect Payment',  to: '/app/collect-payment' },
      { icon: Bell,           label: 'Booking Requests', to: '/app/bookings' },
    ],
  },
];

const SUPERADMIN_GROUPS: NavGroup[] = [
  {
    label: 'Admin',
    items: [
      { icon: ShieldCheck,     label: 'Approvals & Users', to: '/app/admin' },
      { icon: LayoutDashboard, label: 'Dashboard',          to: '/app/dashboard' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { icon: Users,     label: 'Patients',   to: '/app/patients' },
      { icon: BarChart3, label: 'Analytics',  to: '/app/analytics' },
      { icon: Settings2, label: 'Settings',   to: '/app/settings' },
    ],
  },
];

function getNavGroups(role: Role): NavGroup[] {
  switch (role) {
    case 'clinic_admin':    return CLINIC_ADMIN_GROUPS;
    case 'clinic_manager':  return CLINIC_MANAGER_GROUPS;
    case 'doctor':          return DOCTOR_GROUPS;
    case 'nurse':           return NURSE_GROUPS;
    case 'receptionist':    return RECEPTIONIST_GROUPS;
    case 'superadmin':      return SUPERADMIN_GROUPS;
    case 'pharmacist':      return [{ label: 'Main', items: [{ icon: Pill, label: 'Prescriptions', to: '/app/pharmacy' }, { icon: Package, label: 'Inventory', to: '/app/inventory' }] }];
    case 'labtech':         return [{ label: 'Main', items: [{ icon: TestTube, label: 'Lab Orders', to: '/app/labtech' }, { icon: ClipboardList, label: 'Results', to: '/app/results' }] }];
    case 'billing':         return [{ label: 'Main', items: [{ icon: DollarSign, label: 'Billing', to: '/app/billing' }, { icon: Receipt, label: 'Bills List', to: '/app/bills' }] }];
    case 'admin':           return [{ label: 'Main', items: [{ icon: Users, label: 'Staff', to: '/app/staff' }, { icon: BedDouble, label: 'Beds & Wards', to: '/app/beds' }, { icon: BarChart3, label: 'Analytics', to: '/app/analytics' }] }];
    default:                return [];
  }
}

function roleSubtitle(role: Role, specialty?: string): string {
  if (role === 'clinic_admin')   return specialty ? 'Solo Practice' : 'Solo Practice';
  if (role === 'clinic_manager') return 'Clinic Manager';
  if (role === 'doctor')         return specialty ?? 'Doctor';
  if (role === 'nurse')          return 'Nurse';
  if (role === 'receptionist')   return 'Receptionist';
  if (role === 'pharmacist')     return 'Pharmacist';
  if (role === 'labtech')        return 'Lab Technician';
  if (role === 'billing')        return 'Billing';
  if (role === 'superadmin')     return 'Super Admin';
  return role;
}

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const { alerts, openQuickRegister, mobileSidebarOpen, closeMobileSidebar, sidebarCollapsed, toggleSidebar } = useAppStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);

  if (!user) return null;

  const groups = getNavGroups(user.role);
  const feedbackItem: NavItem = { icon: MessageSquare, label: 'Feedback', to: '/app/feedback' };
  const unackAlerts = alerts.filter(a => !a.acknowledged).length;
  const initials = user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const isActive = (to: string) => {
    if (to.includes('?')) return (location.pathname + location.search) === to;
    return location.pathname === to || location.pathname.startsWith(to + '/');
  };

  const canRegisterPatient = (['clinic_admin', 'doctor', 'receptionist', 'clinic_manager'] as Role[]).includes(user.role);

  return (
    <>
      {/* Mobile backdrop */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={closeMobileSidebar} />
      )}

      <aside className={cn(
        'fixed left-0 top-0 h-screen flex flex-col z-40 transition-all duration-200',
        'bg-white border-r border-slate-100',
        sidebarCollapsed ? 'lg:w-16' : 'lg:w-60',
        'w-72',
        mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      )}>

        {/* ── Logo ── */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100">
          <img src="/logo.svg" alt="Vyasa" className="w-8 h-8 rounded-lg flex-shrink-0" />
          <div className={cn('min-w-0 flex-1', sidebarCollapsed && 'lg:hidden')}>
            <div className="font-bold text-slate-900 text-base leading-tight">Vyasa</div>
            <div className="text-teal-600 text-[10px] font-semibold">Integrated Healthcare</div>
          </div>
          {/* Mobile close */}
          <button onClick={closeMobileSidebar} className="lg:hidden text-slate-400 hover:text-slate-600 p-1">
            <X className="w-4 h-4" />
          </button>
          {/* Desktop collapse */}
          <button onClick={toggleSidebar} className="hidden lg:block text-slate-400 hover:text-slate-600 p-1 ml-auto">
            <Menu className="w-4 h-4" />
          </button>
        </div>

        {/* ── User profile card ── */}
        <div className={cn('px-3 py-3 border-b border-slate-100', sidebarCollapsed && 'lg:hidden')}>
          <button
            onClick={() => setProfileOpen(o => !o)}
            className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-full bg-teal-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-900 truncate">{user.name}</div>
              <div className="text-[11px] text-slate-500 truncate">{roleSubtitle(user.role, user.specialty)}</div>
            </div>
            <ChevronDown className={cn('w-3.5 h-3.5 text-slate-400 transition-transform flex-shrink-0', profileOpen && 'rotate-180')} />
          </button>
          {profileOpen && (
            <div className="mt-1 bg-slate-50 rounded-xl overflow-hidden border border-slate-100">
              <Link to="/app/profile" onClick={() => { setProfileOpen(false); closeMobileSidebar(); }}
                className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100 transition-colors">
                <User className="w-3.5 h-3.5 text-slate-400" />
                My Profile
              </Link>
              <Link to="/app/settings" onClick={() => { setProfileOpen(false); closeMobileSidebar(); }}
                className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100 transition-colors">
                <Settings2 className="w-3.5 h-3.5 text-slate-400" />
                Settings
              </Link>
            </div>
          )}
        </div>

        {/* ── Nav groups ── */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
          {groups.map(group => (
            <div key={group.label}>
              {!sidebarCollapsed && (
                <div className="px-2 mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider lg:block hidden">
                  {group.label}
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const active = isActive(item.to);
                  const isAlerts = item.to === '/app/alerts';
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={closeMobileSidebar}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                        active
                          ? 'bg-teal-50 text-teal-700 font-semibold'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                        sidebarCollapsed && 'lg:justify-center lg:px-2',
                      )}
                    >
                      <div className="relative flex-shrink-0">
                        <item.icon className={cn('w-4.5 h-4.5', active ? 'text-teal-600' : 'text-slate-400')} />
                        {isAlerts && unackAlerts > 0 && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                            {unackAlerts > 9 ? '9+' : unackAlerts}
                          </span>
                        )}
                      </div>
                      <span className={cn(sidebarCollapsed && 'lg:hidden')}>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Feedback — always last */}
          <div>
            <div className="space-y-0.5">
              <Link
                to={feedbackItem.to}
                onClick={closeMobileSidebar}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  isActive(feedbackItem.to)
                    ? 'bg-teal-50 text-teal-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                  sidebarCollapsed && 'lg:justify-center lg:px-2',
                )}
              >
                <feedbackItem.icon className="w-4.5 h-4.5 text-slate-400 flex-shrink-0" />
                <span className={cn(sidebarCollapsed && 'lg:hidden')}>{feedbackItem.label}</span>
              </Link>
            </div>
          </div>
        </nav>

        {/* ── Register Patient CTA ── */}
        {canRegisterPatient && (
          <div className={cn('px-3 pb-3', sidebarCollapsed && 'lg:px-2')}>
            <button
              onClick={() => { openQuickRegister(); closeMobileSidebar(); }}
              className={cn(
                'w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold',
                'bg-teal-500 hover:bg-teal-600 active:scale-[0.98] text-white transition-all shadow-sm',
                sidebarCollapsed && 'lg:justify-center lg:px-2',
              )}
            >
              <UserPlus className="w-4 h-4 flex-shrink-0" />
              <span className={cn(sidebarCollapsed && 'lg:hidden')}>+ New Patient</span>
            </button>
          </div>
        )}

        {/* ── Need help ── */}
        <div className={cn('px-3 pb-3 border-t border-slate-100 pt-3', sidebarCollapsed && 'lg:hidden')}>
          <button
            onClick={() => navigate('/app/feedback')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left"
          >
            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
              <HelpCircle className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-700">Need help?</div>
              <div className="text-[10px] text-slate-400">View guides & support</div>
            </div>
          </button>
        </div>

        {/* ── Logout ── */}
        <div className="px-3 pb-4 border-t border-slate-100 pt-3">
          <button
            onClick={() => { logout(); closeMobileSidebar(); }}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
              'text-red-500 hover:bg-red-50 hover:text-red-600',
              sidebarCollapsed && 'lg:justify-center',
            )}
          >
            <LogOut className="w-4.5 h-4.5 flex-shrink-0" />
            <span className={cn(sidebarCollapsed && 'lg:hidden')}>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
