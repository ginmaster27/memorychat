import { create } from 'zustand';
import { UserProfile } from '../types/user';

interface AuthState {
  user: UserProfile | null;
  idToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasCheckedStoredSession: boolean;
  error: string | null;
  setSession: (user: UserProfile, idToken: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setSessionChecked: (hasCheckedStoredSession: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  idToken: null,
  isAuthenticated: false,
  isLoading: false,
  hasCheckedStoredSession: false,
  error: null,
  setSession: (user, idToken) =>
    set({
      user,
      idToken,
      isAuthenticated: true,
      isLoading: false,
      hasCheckedStoredSession: true,
      error: null,
    }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
  setSessionChecked: (hasCheckedStoredSession) => set({ hasCheckedStoredSession }),
  clearAuth: () =>
    set({
      user: null,
      idToken: null,
      isAuthenticated: false,
      isLoading: false,
      hasCheckedStoredSession: true,
      error: null,
    }),
}));
