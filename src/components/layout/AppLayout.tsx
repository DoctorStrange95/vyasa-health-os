import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { AppFooter } from './AppFooter';
import { MobileBottomNav } from './MobileBottomNav';
import { ToastContainer } from '@/components/ui/Toast';
import { QuickRegisterModal } from '@/components/QuickRegisterModal';
import { QuickRxModal } from '@/components/QuickRxModal';
import { ConsentModal } from '@/components/ConsentModal';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { usePadStore } from '@/store/usePadStore';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { cn } from '@/lib/utils';

export function AppLayout() {
  const { sidebarCollapsed, mobileSidebarOpen, closeMobileSidebar, quickRegisterOpen, quickRxModalOpen } = useAppStore();
  const { user, isDemo } = useAuthStore();
  const syncClinicsFromApi = usePadStore(s => s.syncClinicsFromApi);
  const syncPadFromApi = usePadStore(s => s.syncPadFromApi);
  const refreshAppointments = useAppStore(s => s.refreshAppointments);
  const location = useLocation();

  // Hydrate clinics, pad settings, and appointments (incl. today's pending bookings) on login
  useEffect(() => {
    syncClinicsFromApi();
    syncPadFromApi();
    refreshAppointments();
  }, [syncClinicsFromApi, syncPadFromApi, refreshAppointments]);

  // Connect socket as soon as user is authenticated so real-time events
  // (vitals, chat, patient status) start flowing immediately — not just when
  // the user navigates to a specific page.
  useEffect(() => {
    if (!user || isDemo) return;
    const sock = connectSocket();
    if (!sock) return;
    // patient_status_change — emitted by backend when a patient's status/priority changes.
    // Merge into the store so the doctor's patient list reflects it without a page refresh.
    const onStatusChange = (data: { patientId: string; status?: string; priority?: string }) => {
      const { patients, setPatients } = useAppStore.getState();
      if (!data?.patientId) return;
      const updated = patients.map(p =>
        p.id === data.patientId
          ? { ...p, ...(data.status && { status: data.status as never }), ...(data.priority && { priority: data.priority as never }) }
          : p
      );
      setPatients(updated);
    };
    sock.on('patient_status_change', onStatusChange);
    return () => {
      sock.off('patient_status_change', onStatusChange);
      disconnectSocket();
    };
  }, [user?.id, isDemo]);

  // Roles that get a mobile bottom nav
  const hasMobileBottomNav = user && ['doctor', 'clinic_admin', 'nurse'].includes(user.role);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <ConsentModal />
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
          <div
            key={location.pathname}
            className={cn('p-4 md:p-5 min-h-full animate-page-enter', hasMobileBottomNav && 'pb-20 lg:pb-5')}
          >
            <Outlet />
          </div>
        </main>
        <AppFooter />
      </div>

      <MobileBottomNav />
      <ToastContainer />
      {quickRegisterOpen && <QuickRegisterModal />}
      {quickRxModalOpen && <QuickRxModal />}
    </div>
  );
}
