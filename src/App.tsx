import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useAppStore } from '@/store/useAppStore';
import { AppLayout } from '@/components/layout/AppLayout';
import { Loader2 } from 'lucide-react';

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const PendingApprovalPage = lazy(() => import('@/pages/auth/PendingApprovalPage'));
const JoinPage = lazy(() => import('@/pages/auth/JoinPage'));
const DashboardPage = lazy(() => import('@/pages/doctor/DashboardPage'));
const PatientListPage = lazy(() => import('@/pages/doctor/PatientListPage'));
const PatientDetailPage = lazy(() => import('@/pages/doctor/PatientDetailPage'));
const OPDQueuePage = lazy(() => import('@/pages/doctor/OPDQueuePage'));
const AlertsPage = lazy(() => import('@/pages/shared/AlertsPage'));
const VitalsPage = lazy(() => import('@/pages/nurse/VitalsPage'));
const PharmacyPage = lazy(() => import('@/pages/pharmacy/PharmacyPage'));
const BedsPage = lazy(() => import('@/pages/admin/BedsPage'));
const SuperAdminPage = lazy(() => import('@/pages/admin/SuperAdminPage'));
const StaffPage = lazy(() => import('@/pages/admin/StaffPage'));
const BillingPage = lazy(() => import('@/pages/billing/BillingPage'));
const PlaceholderPage = lazy(() => import('@/pages/shared/PlaceholderPage'));
const PrescriptionsPage = lazy(() => import('@/pages/doctor/PrescriptionsPage'));
const LabOrdersPage = lazy(() => import('@/pages/doctor/LabOrdersPage'));
const AdmitPage = lazy(() => import('@/pages/doctor/AdmitPage'));
const DischargePage = lazy(() => import('@/pages/doctor/DischargePage'));
const TriagePage = lazy(() => import('@/pages/doctor/TriagePage'));
const NetworkPage = lazy(() => import('@/pages/doctor/NetworkPage'));
const AnalyticsPage = lazy(() => import('@/pages/doctor/AnalyticsPage'));
const ProfilePage = lazy(() => import('@/pages/shared/ProfilePage'));
const ConsultPage = lazy(() => import('@/pages/doctor/ConsultPage'));
const PadSettingsPage = lazy(() => import('@/pages/shared/PadSettingsPage'));
const SettingsPage = lazy(() => import('@/pages/shared/SettingsPage'));
const NursePatientsPage = lazy(() => import('@/pages/nurse/NursePatientsPage'));
const PublicBookingPage = lazy(() => import('@/pages/public/PublicBookingPage'));
const DoctorPublicPage = lazy(() => import('@/pages/public/DoctorPublicPage'));
const BookingRequestsPage = lazy(() => import('@/pages/doctor/BookingRequestsPage'));
const ReceptionistDashboard = lazy(() => import('@/pages/receptionist/ReceptionistDashboard'));
const RegisterPatientPage = lazy(() => import('@/pages/receptionist/RegisterPatientPage'));
const PrescriptionViewerPage = lazy(() => import('@/pages/receptionist/PrescriptionViewerPage'));

function Spinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isDemo } = useAuthStore();
  const { patients, loadDemo } = useAppStore();

  useEffect(() => {
    if (!user) return;
    if (isDemo) {
      // Demo mode only: restore sample data after a page refresh
      if (patients.length === 0) loadDemo(user.name, user.id);
      return;
    }
    // Real login: NEVER seed demo data. Purge demo remnants persisted from
    // older sessions (demo ids: P001…, A1…), then pull real data from the backend.
    const state = useAppStore.getState();
    const hasDemoData =
      state.patients.some(p => /^P\d{3}$/.test(p.id)) ||
      state.alerts.some(a => /^A\d$/.test(a.id)) ||
      state.queue.some(q => /^Q\d/.test(q.id ?? ''));
    if (hasDemoData) state.resetStore();
    state.syncFromBackend();
  }, [isDemo, patients.length, loadDemo, user?.id, user?.name, user]);

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// Redirect to the correct home page based on role
function RoleIndex() {
  const { user } = useAuthStore();
  if (user?.role === 'receptionist') return <Navigate to="/app/reception" replace />;
  return <Navigate to="/app/dashboard" replace />;
}

// Block receptionist from doctor-only pages
function DoctorOnly({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  if (user?.role === 'receptionist') return <Navigate to="/app/reception" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="w-10 h-10 animate-spin text-teal-500" /></div>}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/pending-approval" element={<Suspense fallback={null}><PendingApprovalPage /></Suspense>} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/book/:clinicId" element={<Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="w-10 h-10 animate-spin text-teal-500" /></div>}><PublicBookingPage /></Suspense>} />
          <Route path="/dr/:slug" element={<Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="w-10 h-10 animate-spin text-teal-500" /></div>}><DoctorPublicPage /></Suspense>} />

          <Route path="/app" element={<RequireAuth><AppLayout /></RequireAuth>}>
            {/* Role-aware home redirect */}
            <Route index element={<RoleIndex />} />

            {/* Receptionist portal */}
            <Route path="reception" element={<Suspense fallback={<Spinner />}><ReceptionistDashboard /></Suspense>} />
            <Route path="collect-payment" element={<Suspense fallback={<Spinner />}><ReceptionistDashboard /></Suspense>} />

            {/* Doctor / shared */}
            <Route path="dashboard" element={<Suspense fallback={<Spinner />}><DoctorOnly><DashboardPage /></DoctorOnly></Suspense>} />
            <Route path="patients" element={<Suspense fallback={<Spinner />}><PatientListPage /></Suspense>} />
            <Route path="patients/:id" element={<Suspense fallback={<Spinner />}><PatientDetailPage /></Suspense>} />
            <Route path="queue" element={<Suspense fallback={<Spinner />}><OPDQueuePage /></Suspense>} />
            <Route path="alerts" element={<Suspense fallback={<Spinner />}><AlertsPage /></Suspense>} />

            {/* Nurse */}
            <Route path="nurse-patients" element={<Suspense fallback={<Spinner />}><NursePatientsPage /></Suspense>} />
            <Route path="vitals" element={<Suspense fallback={<Spinner />}><VitalsPage /></Suspense>} />
            <Route path="mar" element={<Suspense fallback={<Spinner />}><PlaceholderPage title="Medication MAR" /></Suspense>} />
            <Route path="notes" element={<Suspense fallback={<Spinner />}><PlaceholderPage title="Nursing Notes" /></Suspense>} />

            {/* Doctor extended */}
            <Route path="prescriptions" element={<Suspense fallback={<Spinner />}><PrescriptionsPage /></Suspense>} />
            <Route path="labs" element={<Suspense fallback={<Spinner />}><LabOrdersPage /></Suspense>} />
            <Route path="triage" element={<Suspense fallback={<Spinner />}><TriagePage /></Suspense>} />
            <Route path="admit" element={<Suspense fallback={<Spinner />}><AdmitPage /></Suspense>} />
            <Route path="discharge" element={<Suspense fallback={<Spinner />}><DischargePage /></Suspense>} />
            <Route path="network" element={<Suspense fallback={<Spinner />}><NetworkPage /></Suspense>} />
            <Route path="analytics" element={<Suspense fallback={<Spinner />}><AnalyticsPage /></Suspense>} />
            <Route path="profile" element={<Suspense fallback={<Spinner />}><ProfilePage /></Suspense>} />
            <Route path="consult/:patientId" element={<Suspense fallback={<Spinner />}><DoctorOnly><ConsultPage /></DoctorOnly></Suspense>} />
            <Route path="pad-settings" element={<Suspense fallback={<Spinner />}><PadSettingsPage /></Suspense>} />
            <Route path="settings" element={<Suspense fallback={<Spinner />}><SettingsPage /></Suspense>} />
            <Route path="schedule" element={<Navigate to="/app/bookings" replace />} />
            <Route path="bookings" element={<Suspense fallback={<Spinner />}><BookingRequestsPage /></Suspense>} />
            <Route path="admin" element={<Suspense fallback={<Spinner />}><SuperAdminPage /></Suspense>} />

            {/* Pharmacy */}
            <Route path="pharmacy" element={<Suspense fallback={<Spinner />}><PharmacyPage /></Suspense>} />
            <Route path="inventory" element={<Suspense fallback={<Spinner />}><PlaceholderPage title="Drug Inventory" /></Suspense>} />

            {/* Lab */}
            <Route path="labtech" element={<Suspense fallback={<Spinner />}><PlaceholderPage title="Lab Orders" /></Suspense>} />
            <Route path="results" element={<Suspense fallback={<Spinner />}><PlaceholderPage title="Lab Results" /></Suspense>} />

            {/* Admin */}
            <Route path="staff" element={<Suspense fallback={<Spinner />}><StaffPage /></Suspense>} />
            <Route path="beds" element={<Suspense fallback={<Spinner />}><BedsPage /></Suspense>} />
            <Route path="integration" element={<Suspense fallback={<Spinner />}><PlaceholderPage title="Integration" /></Suspense>} />
            <Route path="audit" element={<Suspense fallback={<Spinner />}><PlaceholderPage title="Audit Log" /></Suspense>} />
            <Route path="workload" element={<Suspense fallback={<Spinner />}><PlaceholderPage title="Workload" /></Suspense>} />

            {/* Billing */}
            <Route path="billing" element={<Suspense fallback={<Spinner />}><BillingPage /></Suspense>} />
            <Route path="bills" element={<Suspense fallback={<Spinner />}><PlaceholderPage title="Bills List" /></Suspense>} />

            {/* Receptionist */}
            <Route path="register" element={<Suspense fallback={<Spinner />}><RegisterPatientPage /></Suspense>} />
            <Route path="rx-view" element={<Suspense fallback={<Spinner />}><PrescriptionViewerPage /></Suspense>} />

            {/* Patient portal */}
            <Route path="patient-rx" element={<Suspense fallback={<Spinner />}><PlaceholderPage title="My Prescriptions" /></Suspense>} />
            <Route path="patient-discharge" element={<Suspense fallback={<Spinner />}><PlaceholderPage title="Discharge Summary" /></Suspense>} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
