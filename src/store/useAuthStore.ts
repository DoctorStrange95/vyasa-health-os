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
  nurse: { id: 2, name: 'Priya Sharma', role: 'nurse', email: 'priya@vyasa.health', department: 'ICU' },
  pharmacist: { id: 3, name: 'Ravi Kumar', role: 'pharmacist', email: 'ravi@vyasa.health', department: 'Pharmacy' },
  labtech: { id: 4, name: 'Sunita Rao', role: 'labtech', email: 'sunita@vyasa.health', department: 'Laboratory' },
  admin: { id: 5, name: 'Admin User', role: 'admin', email: 'admin@vyasa.health' },
  billing: { id: 6, name: 'Billing Staff', role: 'billing', email: 'billing@vyasa.health' },
  receptionist: { id: 7, name: 'Reception', role: 'receptionist', email: 'reception@vyasa.health' },
  patient: { id: 8, name: 'Patient Demo', role: 'patient', email: 'patient@vyasa.health' },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isDemo: false,

      login: async (username, password, portal) => {
        const endpoint = portal === 'patient' ? '/patient/login' : '/login';
        const res = await apiClient.post(endpoint, { username, password });
        const { token, user } = res.data;
        localStorage.setItem('vyasa_token', token);
        set({ user, token, isDemo: false });
      },

      loginWithGoogle: async (credential) => {
        const res = await apiClient.post('/auth/google', { credential });
        const { token, user } = res.data;
        localStorage.setItem('vyasa_token', token);
        set({ user, token, isDemo: false });
      },

      loginAsDemo: (role) => {
        set({ user: DEMO_STAFF[role], token: 'demo', isDemo: true });
      },

      logout: () => {
        localStorage.removeItem('vyasa_token');
        set({ user: null, token: null, isDemo: false });
      },
    }),
    { name: 'vyasa-auth', partialize: (s) => ({ user: s.user, token: s.token, isDemo: s.isDemo }) }
  )
);
