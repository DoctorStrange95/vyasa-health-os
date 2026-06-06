import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StaffUser, Role } from '@/types';
import { apiClient } from '@/api/client';

interface AuthState {
  user: StaffUser | null;
  token: string | null;
  isDemo: boolean;
  login: (username: string, password: string, portal: 'staff' | 'patient') => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  loginAsDemo: (role: Role) => void;
  logout: () => void;
}

const DEMO_STAFF: Record<Role, StaffUser> = {
  doctor: { id: 1, name: 'Dr. Arjun Mehta', role: 'doctor', email: 'arjun@vyasa.health', specialty: 'Internal Medicine', department: 'Medicine', hospital: 'Vyasa General Hospital' },
  clinic_admin: { id: 9, name: 'Dr. Nilanjan Roy', role: 'clinic_admin', email: 'nilanjan@vyasa.health', specialty: 'General Medicine', department: 'OPD', hospital: 'Roy Clinic' },
  nurse: { id: 2, name: 'Priya Sharma', role: 'nurse', email: 'priya@vyasa.health', department: 'ICU' },
  pharmacist: { id: 3, name: 'Ravi Kumar', role: 'pharmacist', email: 'ravi@vyasa.health', department: 'Pharmacy' },
  labtech: { id: 4, name: 'Sunita Rao', role: 'labtech', email: 'sunita@vyasa.health', department: 'Laboratory' },
  admin: { id: 5, name: 'Admin User', role: 'admin', email: 'admin@vyasa.health' },
  billing: { id: 6, name: 'Billing Staff', role: 'billing', email: 'billing@vyasa.health' },
  receptionist: { id: 7, name: 'Reception', role: 'receptionist', email: 'reception@vyasa.health' },
  patient: { id: 8, name: 'Patient Demo', role: 'patient', email: 'patient@vyasa.health' },
};

// Emails that should always get clinic_admin role (solo doctors)
const CLINIC_ADMIN_EMAILS = ['nilanjan@vyasa.health', 'nilanjan1995@gmail.com', 'kaartkaroo@gmail.com'];

function decodeGoogleJwt(credential: string): { sub: string; name: string; email: string; picture?: string } | null {
  try {
    const payload = credential.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function applyRoleOverrides(user: StaffUser | null): StaffUser | null {
  if (!user) return null;
  const email = (user.email ?? '').toLowerCase();
  const role = (user.role as string).toLowerCase() as StaffUser['role'];
  if (CLINIC_ADMIN_EMAILS.includes(email) && role === 'doctor') {
    return { ...user, role: 'clinic_admin' };
  }
  return { ...user, role };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isDemo: false,

      login: async (username, password, portal) => {
        const endpoint = portal === 'patient' ? '/auth/patient-login' : '/auth/login';
        const res = await apiClient.post(endpoint, { email: username, password });
        const { token, user } = res.data;
        const normUser = applyRoleOverrides(user)!;
        localStorage.setItem('vyasa_token', token);
        set({ user: normUser, token, isDemo: false });
      },

      loginWithGoogle: async (credential) => {
        const profile = decodeGoogleJwt(credential);
        if (!profile) throw new Error('Invalid Google credential');
        const email = profile.email.toLowerCase();
        const defaultRole: Role = CLINIC_ADMIN_EMAILS.includes(email) ? 'clinic_admin' : 'clinic_admin';
        const user: StaffUser = {
          id: Math.abs(profile.sub.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 9000 + 1000,
          name: profile.name,
          email: profile.email,
          avatar: profile.picture,
          role: defaultRole,
          hospital: 'Solo Practice',
        };
        const normUser = applyRoleOverrides(user)!;
        set({ user: normUser, token: `google_${profile.sub}`, isDemo: false });
      },

      loginAsDemo: (role) => {
        set({ user: DEMO_STAFF[role], token: 'demo', isDemo: true });
      },

      logout: () => {
        localStorage.removeItem('vyasa_token');
        // Delay import to avoid circular module init order issues
        import('./useAppStore').then(({ useAppStore }) => useAppStore.getState().resetStore());
        set({ user: null, token: null, isDemo: false });
      },
    }),
    {
      name: 'vyasa-auth',
      partialize: (s) => ({ user: s.user, token: s.token, isDemo: s.isDemo }),
      // Fix any persisted session that has the wrong role
      onRehydrateStorage: () => (state) => {
        if (state && !state.isDemo && state.user) {
          const fixed = applyRoleOverrides(state.user);
          if (fixed?.role !== state.user.role) {
            state.user = fixed;
          }
        }
      },
    }
  )
);
