import { create } from 'zustand';
import type { UserProfile } from '@inv/shared';

export type AuthStatus = 'loading' | 'authed' | 'denied' | 'outside';

interface AuthState {
  status: AuthStatus;
  profile: UserProfile | null;
  deniedReason: string | null;
  setLoading: () => void;
  setAuthed: (profile: UserProfile) => void;
  setDenied: (reason: string) => void;
  setOutside: () => void;
  updateProfile: (profile: UserProfile) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  profile: null,
  deniedReason: null,
  setLoading: () => set({ status: 'loading' }),
  setAuthed: (profile) => set({ status: 'authed', profile, deniedReason: null }),
  setDenied: (reason) => set({ status: 'denied', deniedReason: reason }),
  setOutside: () => set({ status: 'outside' }),
  updateProfile: (profile) => set({ profile }),
}));
