import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StaffUser, Role } from '@/types';
import { api, setTokens, clearTokens } from '@/lib/api';

export interface RecentAccount {
  name: string;
  email: string;
  role: Role;
  specialty?: string;
  loginMethod: 'google' | 'email';
}

interface AuthState {
  user: StaffUser | null;
  token: string | null;
  isDemo: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'suspended' | null;
  consentGivenAt: string | null;
  recentAccount: RecentAccount | null;
  subscriptionPaidAt: string | null;   // ISO timestamp of last successful payment
  subscriptionPaymentId: string | null; // Razorpay payment ID
  login: (email: string, password: string, geo?: { lat: number; lng: number; locationLabel?: string }) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  loginWithGoogle: (credential: string, geo?: { lat: number; lng: number }) => Promise<GoogleResult>;
  completeGoogleRegister: (data: GoogleRegisterPayload) => Promise<void>;
  loginAsDemo: (role: Role) => void;
  logout: () => void;
  recordConsent: () => Promise<void>;
  setSubscriptionPaid: (paymentId: string) => void;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role?: string;
  specialty?: string;
  degrees?: string;
  phone?: string;
  licenseNumber?: string;
}

export type GoogleResult =
  | { isNewUser: false }
  | { isNewUser: true; googleEmail: string; googleName: string };

export interface GoogleRegisterPayload {
  name: string;
  email: string;
  role?: string;
  specialty?: string;
  degrees?: string;
  phone?: string;
  licenseNumber?: string;
  medicalCouncil?: string;
  regState?: string;
  city?: string;
  state?: string;
  clinicName?: string;
  googleId?: string;
}

const DEMO_STAFF: Record<Role, StaffUser> = {
  doctor:          { id: 1,  name: 'Dr. Arjun Mehta',  role: 'doctor',          email: 'arjun@vyasa.health',   specialty: 'Internal Medicine', department: 'Medicine' },
  clinic_admin:    { id: 9,  name: 'Dr. Nilanjan Roy',  role: 'clinic_admin',    email: 'nilanjan@vyasa.health', specialty: 'General Medicine',  department: 'OPD' },
  clinic_manager:  { id: 10, name: 'Aruna Roy',       role: 'clinic_manager',  email: 'aruna@vyasa.health',    department: 'Administration' },
  nurse:           { id: 2,  name: 'Priya Sharma',      role: 'nurse',           email: 'priya@vyasa.health',    department: 'ICU' },
  pharmacist:      { id: 3,  name: 'Ravi Kumar',        role: 'pharmacist',      email: 'ravi@vyasa.health',     department: 'Pharmacy' },
  labtech:         { id: 4,  name: 'Sunita Rao',        role: 'labtech',         email: 'sunita@vyasa.health',   department: 'Laboratory' },
  admin:           { id: 5,  name: 'Admin User',        role: 'admin',           email: 'admin@vyasa.health' },
  billing:         { id: 6,  name: 'Billing Staff',     role: 'billing',         email: 'billing@vyasa.health' },
  receptionist:    { id: 7,  name: 'Reception',         role: 'receptionist',    email: 'reception@vyasa.health' },
  patient:         { id: 8,  name: 'Patient Demo',      role: 'patient',         email: 'patient@vyasa.health' },
  superadmin:      { id: 0,  name: 'Super Admin',       role: 'superadmin',      email: 'admin@vyasa.health' },
};

interface BackendAuthResponse {
  accessToken: string;
  refreshToken: string;
  googlePicture?: string;
  user: {
    id: number; name: string; email: string; role: string;
    clinicId: string; specialty?: string; degrees?: string;
    approvalStatus?: string;
  };
}

function toStaffUser(u: BackendAuthResponse['user']): StaffUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role as Role,
    specialty: u.specialty,
    hospital: u.clinicId,
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isDemo: false,
      approvalStatus: null,
      consentGivenAt: null,
      recentAccount: null,
      subscriptionPaidAt: null,
      subscriptionPaymentId: null,

      // ─── Real backend login ────────────────────────────────────────────────
      login: async (email, password, geo) => {
        const data = await api.post<BackendAuthResponse>('/auth/login', { email, password, ...geo });
        setTokens(data.accessToken, data.refreshToken);
        const staffUser = toStaffUser(data.user);
        const backendConsent = (data.user as { consentGivenAt?: string | null }).consentGivenAt ?? null;
        set({
          user: staffUser,
          token: data.accessToken,
          isDemo: false,
          approvalStatus: (data.user.approvalStatus ?? 'approved') as AuthState['approvalStatus'],
          consentGivenAt: backendConsent ?? get().consentGivenAt,
          recentAccount: { name: staffUser.name, email: staffUser.email, role: staffUser.role, specialty: staffUser.specialty, loginMethod: 'email' },
        });
        // Sync backend data into app store
        import('./useAppStore').then(({ useAppStore }) =>
          useAppStore.getState().syncFromBackend()
        );
        // Always sync pad settings on login so degrees/specialty are up-to-date across devices
        import('./usePadStore').then(({ usePadStore }) => {
          usePadStore.getState().syncPadFromApi();
          usePadStore.getState().syncClinicsFromApi();
        });
      },

      // ─── Real backend register ─────────────────────────────────────────────
      register: async (payload) => {
        const data = await api.post<BackendAuthResponse>('/auth/register', payload);
        setTokens(data.accessToken, data.refreshToken);
        set({
          user: toStaffUser(data.user),
          token: data.accessToken,
          isDemo: false,
          approvalStatus: (data.user.approvalStatus ?? 'pending') as AuthState['approvalStatus'],
        });
        // New user — start with clean local state
        import('./useAppStore').then(({ useAppStore }) =>
          useAppStore.getState().syncFromBackend()
        );
        import('./usePadStore').then(({ usePadStore }) => {
          usePadStore.getState().syncPadFromApi();
        });
      },

      // ─── Google OAuth ──────────────────────────────────────────────────────
      loginWithGoogle: async (credential, geo) => {
        const result = await api.post<
          BackendAuthResponse & { isNewUser?: false } |
          { isNewUser: true; googleEmail: string; googleName: string }
        >('/auth/google', { accessToken: credential, ...geo });

        if ('isNewUser' in result && result.isNewUser) {
          return { isNewUser: true, googleEmail: result.googleEmail, googleName: result.googleName };
        }

        const r = result as BackendAuthResponse;
        setTokens(r.accessToken, r.refreshToken);
        const staffUser = toStaffUser(r.user);
        const backendConsent = (r.user as { consentGivenAt?: string | null }).consentGivenAt ?? null;
        set({
          user: staffUser,
          token: r.accessToken,
          isDemo: false,
          approvalStatus: (r.user.approvalStatus ?? 'approved') as AuthState['approvalStatus'],
          consentGivenAt: backendConsent ?? get().consentGivenAt,
          recentAccount: { name: staffUser.name, email: staffUser.email, role: staffUser.role, specialty: staffUser.specialty, loginMethod: 'google' },
        });
        import('./useAppStore').then(({ useAppStore }) =>
          useAppStore.getState().syncFromBackend()
        );
        import('./usePadStore').then(({ usePadStore }) => {
          usePadStore.getState().syncPadFromApi();
          usePadStore.getState().syncClinicsFromApi();
        });
        return { isNewUser: false };
      },

      // ─── Complete Google registration (new user) ──────────────────────────
      completeGoogleRegister: async (payload) => {
        // Register with a random secure password (Google handles auth)
        const data = await api.post<BackendAuthResponse>('/auth/register', {
          ...payload,
          password: `google_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          role: payload.role ?? 'clinic_admin',
          googleId: payload.googleId,
        });
        setTokens(data.accessToken, data.refreshToken);
        set({
          user: toStaffUser(data.user),
          token: data.accessToken,
          isDemo: false,
          approvalStatus: (data.user.approvalStatus ?? 'pending') as AuthState['approvalStatus'],
        });
        import('./useAppStore').then(({ useAppStore }) =>
          useAppStore.getState().syncFromBackend()
        );
      },

      // ─── Demo mode (no backend) ────────────────────────────────────────────
      loginAsDemo: (role) => {
        clearTokens();
        set({ user: DEMO_STAFF[role], token: 'demo', isDemo: true, approvalStatus: 'approved' });
        // Restore demo clinics so the pad/prescription system works in demo mode
        import('./usePadStore').then(({ usePadStore, DEMO_CLINICS }) => {
          const s = usePadStore.getState();
          if (s.clinics.length === 0) {
            s.setSettings({ doctorName: DEMO_STAFF[role].name, specialty: DEMO_STAFF[role].specialty ?? '' });
            usePadStore.setState({ clinics: DEMO_CLINICS });
          }
        }).catch(() => {});
      },

      logout: () => {
        const rt = localStorage.getItem('vyasa_refresh_token');
        if (rt) api.post('/auth/logout', { refreshToken: rt }).catch(() => {});
        clearTokens();
        import('./useAppStore').then(({ useAppStore }) => useAppStore.getState().resetStore());
        // recentAccount intentionally kept — used for quick re-login on the login page
        set(s => ({ user: null, token: null, isDemo: false, approvalStatus: null, recentAccount: s.recentAccount, subscriptionPaidAt: null, subscriptionPaymentId: null }));
      },

      // ─── Record consent (Privacy Policy + Terms) ─────────────────────────
      recordConsent: async () => {
        try {
          const data = await api.post<{ ok: boolean; consentGivenAt: string }>('/auth/consent', {});
          set({ consentGivenAt: data.consentGivenAt });
        } catch {
          // If backend call fails, still dismiss modal locally so user isn't blocked
          set({ consentGivenAt: new Date().toISOString() });
        }
      },

      // ─── Mark subscription as paid ────────────────────────────────────────
      setSubscriptionPaid: (paymentId: string) => {
        set({ subscriptionPaidAt: new Date().toISOString(), subscriptionPaymentId: paymentId });
        // Best-effort: tell backend about the payment
        api.post('/subscriptions/record', { paymentId, plan: 'monthly_999' }).catch(() => {});
      },
    }),
    {
      name: 'vyasa-auth',
      version: 2,  // bump forces migration for existing sessions
      migrate: (persisted: unknown) => {
        // Existing sessions won't have subscriptionPaidAt — explicitly set null
        // so the paywall fires for everyone who hasn't paid yet
        const s = (persisted ?? {}) as Record<string, unknown>;
        if (!('subscriptionPaidAt' in s)) s.subscriptionPaidAt = null;
        if (!('subscriptionPaymentId' in s)) s.subscriptionPaymentId = null;
        return s;
      },
      partialize: (s) => ({ user: s.user, token: s.token, isDemo: s.isDemo, approvalStatus: s.approvalStatus, consentGivenAt: s.consentGivenAt, recentAccount: s.recentAccount, subscriptionPaidAt: s.subscriptionPaidAt, subscriptionPaymentId: s.subscriptionPaymentId }),
    }
  )
);
