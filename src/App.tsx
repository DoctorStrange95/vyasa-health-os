import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useAppStore } from '@/store/useAppStore';
import { AppLayout } from '@/components/layout/AppLayout';
import { Loader2 } from 'lucide-react';

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const JoinPage = lazy(() => import('@/pages/auth/JoinPage'));
const DashboardPage = lazy(() => import('@/pages/doctor/DashboardPage'));
const PatientListPage = lazy(() => import('@/pages/doctor/PatientListPage'));
const PatientDetailPage = lazy(() => import('@/pages/doctor/PatientDetailPage'));
const OPDQueuePage = lazy(() => import('@/pages/doctor/OPDQueuePage'));
const AlertsPage = lazy(() => import('@/pages/shared/AlertsPage'));
const VitalsPage = lazy(() => import('@/pages/nurse/VitalsPage'));
const PharmacyPage = lazy(() => import('@/pages/pharmacy/PharmacyPage'));
const BedsPage = lazy(() => import('@/pages/admin/BedsPage'));
const StaffPage = lazy(() => import('@/pages/admin/StaffPage'));
const BillingPage = lazy(() => import('@/pages/billing/BillingPage'));
const PlaceholderPage = lazy(() => import('@/pages/shared/PlaceholderPage'));

function Spinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const { isDemo } = useAuthStore();
  const { patients, loadDemo } = useAppStore();

  // Restore demo data after a page refresh (in-memory store is cleared on reload)
  useEffect(() => {
    if (isDemo && patients.length === 0) loadDemo();
  }, [isDemo, patients.length, loadDemo]);

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="w-10 h-10 animate-spin text-teal-500" /></div>}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          <Route path="/app" element={<RequireAuth><AppLayout /></RequireAuth>}>
            {/* Common redirect */}
            <Route index element={<Navigate to="/app/dashboard" replace />} />

            {/* Doctor / shared */}
            <Route path="dashboard" element={<Suspense fallback={<Spinner />}><DashboardPage /></Suspense>} />
            <Route path="patients" element={<Suspense fallback={<Spinner />}><PatientListPage /></Suspense>} />
            <Route path="patients/:id" element={<Suspense fallback={<Spinner />}><PatientDetailPage /></Suspense>} />
            <Route path="queue" element={<Suspense fallback={<Spinner />}><OPDQueuePage /></Suspense>} />
            <Route path="alerts" element={<Suspense fallback={<Spinner />}><AlertsPage /></Suspense>} />

            {/* Nurse */}
            <Route path="vitals" element={<Suspense fallback={<Spinner />}><VitalsPage /></Suspense>} />
            <Route path="mar" element={<Suspense fallback={<Spinner />}><PlaceholderPage title="Medication MAR" /></Suspense>} />
            <Route path="notes" element={<Suspense fallback={<Spinner />}><PlaceholderPage title="Nursing Notes" /></Suspense>} />

            {/* Doctor extended */}
            <Route path="prescriptions" element={<Suspense fallback={<Spinner />}><PlaceholderPage title="All Prescriptions" /></Suspense>} />
            <Route path="labs" element={<Suspense fallback={<Spinner />}><PlaceholderPage title="Lab Orders" /></Suspense>} />
            <Route path="triage" element={<Suspense fallback={<Spinner />}><PlaceholderPage title="AI Triage" /></Suspense>} />
            <Route path="admit" element={<Suspense fallback={<Spinner />}><PlaceholderPage title="Admit / Register Patient" /></Suspense>} />
            <Route path="discharge" element={<Suspense fallback={<Spinner />}><PlaceholderPage title="Discharge" /></Suspense>} />
            <Route path="network" element={<Suspense fallback={<Spinner />}><PlaceholderPage title="Doctor Network" /></Suspense>} />
            <Route path="analytics" element={<Suspense fallback={<Spinner />}><PlaceholderPage title="Analytics" /></Suspense>} />
            <Route path="profile" element={<Suspense fallback={<Spinner />}><PlaceholderPage title="My Profile" /></Suspense>} />

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
            <Route path="register" element={<Suspense fallback={<Spinner />}><PlaceholderPage title="Register Patient" /></Suspense>} />

            {/* Patient portal */}
            <Route path="patient-rx" element={<Suspense fallback={<Spinner />}><PlaceholderPage title="My Prescriptions" /></Suspense>} />
            <Route path="patient-discharge" element={<Suspense fallback={<Spinner />}><PlaceholderPage title="Discharge Summary" /></Suspense>} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
