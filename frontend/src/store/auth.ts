import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../api/client';
import { getMe, refreshToken } from '../api/client';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  setAuth: (token: string, refresh: string, user: User) => void;
  updateUser: (user: User) => void;
  refreshAuth: () => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,
      setAuth: (token, refresh, user) => set({ token, refreshToken: refresh, user }),
      updateUser: (user) => set({ user }),
      refreshAuth: async () => {
        const { refreshToken: stored } = get();
        if (!stored) return false;
        try {
          const tokens = await refreshToken(stored);
          const user = await getMe(tokens.access_token);
          set({ token: tokens.access_token, refreshToken: tokens.refresh_token, user });
          return true;
        } catch {
          set({ token: null, refreshToken: null, user: null });
          return false;
        }
      },
      logout: () => set({ token: null, refreshToken: null, user: null }),
    }),
    { name: 'ai-pm-auth' }
  )
);
