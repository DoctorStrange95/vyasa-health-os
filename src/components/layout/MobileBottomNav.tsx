import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, CalendarCheck, BarChart3, User, Users, ListOrdered, Lock } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

type NavItem = {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  to?: string;
  isCenter?: boolean;
  isRx?: boolean;
};

const DOCTOR_NAV: NavItem[] = [
  { icon: LayoutDashboard, label: 'Home',     to: '/app/dashboard' },
  { icon: CalendarCheck,  label: 'Bookings',  to: '/app/bookings' },
  { icon: LayoutDashboard, label: 'Rx',       isCenter: true, isRx: true },
  { icon: BarChart3,      label: 'Analytics', to: '/app/analytics' },
  { icon: User,           label: 'Profile',   to: '/app/profile' },
];

const NURSE_NAV: NavItem[] = [
  { icon: LayoutDashboard, label: 'Home',     to: '/app/dashboard' },
  { icon: Users,           label: 'Patients', to: '/app/nurse-patients' },
  { icon: ListOrdered,     label: 'Vitals',   to: '/app/vitals' },
  { icon: User,            label: 'Profile',  to: '/app/profile' },
];

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  doctor:       DOCTOR_NAV,
  clinic_admin: DOCTOR_NAV,
  nurse:        NURSE_NAV,
};

export function MobileBottomNav() {
  const { user, isDemo } = useAuthStore();
  const { openQuickRxModal } = useAppStore();
  const location = useLocation();

  if (!user) return null;
  const items = NAV_BY_ROLE[user.role];
  if (!items) return null;

  const n = items.length;

  function activeIndex() {
    return items.findIndex(
      item => item.to && (location.pathname === item.to || location.pathname.startsWith(item.to + '/'))
    );
  }

  const ai = activeIndex();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 safe-area-pb"
      aria-label="Main navigation"
    >
      {/* Glass bar */}
      <div
        className="mx-2 mb-2 rounded-2xl"
        style={{
          background: 'rgba(255,255,255,0.78)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.6)',
          boxShadow: '0 8px 32px rgba(15,32,64,0.14), 0 1.5px 6px rgba(15,32,64,0.07)',
          overflow: 'visible',
          position: 'relative',
        }}
      >
        {/* Sliding glass pill — moves to active tab */}
        {ai >= 0 && (
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: '10px',
              width: `calc(${100 / n}% - 16px)`,
              left: `calc(${ai * (100 / n)}% + 8px)`,
              height: '40px',
              borderRadius: '14px',
              background: 'rgba(8,145,178,0.11)',
              border: '1px solid rgba(8,145,178,0.22)',
              backdropFilter: 'blur(8px)',
              transition: 'left 300ms cubic-bezier(0.34,1.56,0.64,1)',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
        )}

        <div className="flex items-end h-16 px-1" style={{ position: 'relative', zIndex: 1 }}>
          {items.map((item, idx) => {
            const active = !!item.to && (
              location.pathname === item.to || location.pathname.startsWith(item.to + '/')
            );
            const isDisabledForDemo = isDemo && item.isRx;

            /* ── Center Rx FAB ── */
            if (item.isCenter) {
              if (isDisabledForDemo) {
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center justify-end pb-2 cursor-not-allowed">
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center relative opacity-50"
                      style={{
                        marginBottom: '-28px',
                        transform: 'translateY(-16px)',
                        background: 'linear-gradient(135deg,#0891b2,#0e7490)',
                        boxShadow: '0 4px 18px rgba(8,145,178,0.35)',
                      }}
                      title="Not available in demo"
                    >
                      <span className="text-white font-black text-lg tracking-tight leading-none">Rx</span>
                      <Lock className="w-3 h-3 absolute bottom-1 right-1 text-white/80" />
                    </div>
                  </div>
                );
              }
              return (
                <div key={idx} className="flex-1 flex flex-col items-center justify-end pb-2">
                  <button
                    onClick={openQuickRxModal}
                    aria-label="Write prescription"
                    className="w-14 h-14 rounded-full flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                    style={{
                      transform: 'translateY(-16px)',
                      background: 'linear-gradient(135deg,#0891b2 0%,#0e7490 55%,#059669 100%)',
                      boxShadow: '0 6px 24px rgba(8,145,178,0.48), 0 2px 8px rgba(8,145,178,0.22)',
                      transition: 'transform 150ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 150ms ease',
                    }}
                    onMouseDown={e => (e.currentTarget.style.transform = 'translateY(-12px) scale(0.94)')}
                    onMouseUp={e => (e.currentTarget.style.transform = 'translateY(-16px) scale(1)')}
                    onTouchStart={e => (e.currentTarget.style.transform = 'translateY(-12px) scale(0.94)')}
                    onTouchEnd={e => (e.currentTarget.style.transform = 'translateY(-16px) scale(1)')}
                  >
                    <span className="text-white font-black text-xl tracking-tight leading-none">Rx</span>
                  </button>
                </div>
              );
            }

            /* ── Regular tab ── */
            return (
              <Link
                key={idx}
                to={item.to || '#'}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center gap-0.5 h-full pb-1 rounded-xl',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400',
                )}
              >
                <item.icon
                  className="w-5 h-5"
                  style={{
                    color: active ? '#0891b2' : '#94a3b8',
                    transform: active ? 'scale(1.15)' : 'scale(1)',
                    transition: 'color 220ms ease, transform 280ms cubic-bezier(0.34,1.56,0.64,1)',
                  }}
                />
                <span
                  style={{
                    fontSize: '9px',
                    fontWeight: active ? 700 : 500,
                    color: active ? '#0e7490' : '#94a3b8',
                    transition: 'color 220ms ease, font-weight 220ms ease',
                    lineHeight: 1,
                  }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
