import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StaffUser, Role } from '@/types';
import { api, setTokens, clearTokens } from '@/lib/api';

interface AuthState {
  user: StaffUser | null;
  token: string | null;
  isDemo: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'suspended' | null;
  login: (email: string, password: string, geo?: { lat: number; lng: number; locationLabel?: string }) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  loginWithGoogle: (credential: string, geo?: { lat: number; lng: number }) => Promise<GoogleResult>;
  completeGoogleRegister: (data: GoogleRegisterPayload) => Promise<void>;
  loginAsDemo: (role: Role) => void;
  logout: () => void;
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
  specialty?: string;
  degrees?: string;
  phone?: string;
  licenseNumber?: string;
  googleId?: string;
}

const DEMO_STAFF: Record<Role, StaffUser> = {
  doctor:       { id: 1, name: 'Dr. Arjun Mehta',  role: 'doctor',       email: 'arjun@vyasa.health',   specialty: 'Internal Medicine', department: 'Medicine' },
  clinic_admin: { id: 9, name: 'Dr. Nilanjan Roy',  role: 'clinic_admin', email: 'nilanjan@vyasa.health', specialty: 'General Medicine',  department: 'OPD' },
  nurse:        { id: 2, name: 'Priya Sharma',      role: 'nurse',        email: 'priya@vyasa.health',    department: 'ICU' },
  pharmacist:   { id: 3, name: 'Ravi Kumar',        role: 'pharmacist',   email: 'ravi@vyasa.health',     department: 'Pharmacy' },
  labtech:      { id: 4, name: 'Sunita Rao',        role: 'labtech',      email: 'sunita@vyasa.health',   department: 'Laboratory' },
  admin:        { id: 5, name: 'Admin User',        role: 'admin',        email: 'admin@vyasa.health' },
  billing:      { id: 6, name: 'Billing Staff',     role: 'billing',      email: 'billing@vyasa.health' },
  receptionist: { id: 7, name: 'Reception',         role: 'receptionist', email: 'reception@vyasa.health' },
  patient:      { id: 8, name: 'Patient Demo',      role: 'patient',      email: 'patient@vyasa.health' },
  superadmin:   { id: 0, name: 'Super Admin',       role: 'superadmin',   email: 'admin@vyasa.health' },
};

interface BackendAuthResponse {
  accessToken: string;
  refreshToken: string;
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
    (set) => ({
      user: null,
      token: null,
      isDemo: false,
      approvalStatus: null,

      // ─── Real backend login ────────────────────────────────────────────────
      login: async (email, password, geo) => {
        const data = await api.post<BackendAuthResponse>('/auth/login', { email, password, ...geo });
        setTokens(data.accessToken, data.refreshToken);
        set({
          user: toStaffUser(data.user),
          token: data.accessToken,
          isDemo: false,
          approvalStatus: (data.user.approvalStatus ?? 'approved') as AuthState['approvalStatus'],
        });
        // Sync backend data into app store
        import('./useAppStore').then(({ useAppStore }) =>
          useAppStore.getState().syncFromBackend()
        );
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
        set({
          user: toStaffUser(r.user),
          token: r.accessToken,
          isDemo: false,
          approvalStatus: (r.user.approvalStatus ?? 'approved') as AuthState['approvalStatus'],
        });
        import('./useAppStore').then(({ useAppStore }) =>
          useAppStore.getState().syncFromBackend()
        );
        return { isNewUser: false };
      },

      // ─── Complete Google registration (new user) ──────────────────────────
      completeGoogleRegister: async (payload) => {
        // Register with a random secure password (Google handles auth)
        const data = await api.post<BackendAuthResponse>('/auth/register', {
          ...payload,
          password: `google_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          role: 'clinic_admin',
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
      },

      logout: () => {
        const rt = localStorage.getItem('vyasa_refresh_token');
        if (rt) api.post('/auth/logout', { refreshToken: rt }).catch(() => {});
        clearTokens();
        import('./useAppStore').then(({ useAppStore }) => useAppStore.getState().resetStore());
        set({ user: null, token: null, isDemo: false, approvalStatus: null });
      },
    }),
    {
      name: 'vyasa-auth',
      partialize: (s) => ({ user: s.user, token: s.token, isDemo: s.isDemo, approvalStatus: s.approvalStatus }),
    }
  )
);
