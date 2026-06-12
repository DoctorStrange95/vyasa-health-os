import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { AppFooter } from './AppFooter';
import { MobileBottomNav } from './MobileBottomNav';
import { ToastContainer } from '@/components/ui/Toast';
import { QuickRegisterModal } from '@/components/QuickRegisterModal';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { usePadStore } from '@/store/usePadStore';
import { cn } from '@/lib/utils';

export function AppLayout() {
  const { sidebarCollapsed, mobileSidebarOpen, closeMobileSidebar, quickRegisterOpen } = useAppStore();
  const { user } = useAuthStore();
  const syncClinicsFromApi = usePadStore(s => s.syncClinicsFromApi);

  // Hydrate real clinics (with schedules) from the backend on login
  useEffect(() => { syncClinicsFromApi(); }, [syncClinicsFromApi]);

  // Roles that get a mobile bottom nav
  const hasMobileBottomNav = user && ['doctor', 'clinic_admin', 'nurse'].includes(user.role);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Mobile sidebar backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      <Sidebar />

      <div
        className={cn(
          'flex flex-col flex-1 min-w-0 transition-all duration-200',
          // Desktop: offset by sidebar width
          'lg:ml-60',
          sidebarCollapsed && 'lg:ml-16'
        )}
      >
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          {/* Extra bottom padding on mobile so content clears the bottom nav */}
          <div className={cn('p-4 md:p-5 min-h-full', hasMobileBottomNav && 'pb-20 lg:pb-5')}>
            <Outlet />
          </div>
        </main>
        <AppFooter />
      </div>

      <MobileBottomNav />
      <ToastContainer />
      {quickRegisterOpen && <QuickRegisterModal />}
    </div>
  );
}
