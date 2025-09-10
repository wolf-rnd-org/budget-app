import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser, MeResponse } from '@/api/types';
import { useProgramsStore } from '@/stores/programsStore';

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  // permissions/actions only; programs moved to programsStore
  actions: string[];

  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;

  // actions
  setActions: (actions: string[]) => void;
  clearUser: () => void;
  logout: () => void;

  // hydrate from /me
  hydrateFromMe: (me: MeResponse) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: true,
      actions: [],

      setUser: (user) => set({ user, isLoading: false }),
      setLoading: (isLoading) => set({ isLoading }),

      logout: () => {
        set({ user: null, isLoading: false, actions: [] });
        try {
          const ps = useProgramsStore.getState();
          ps.clear();
        } catch {}
        localStorage.removeItem('authToken');
      },

      clearUser: () => set({ user: null, isLoading: false, actions: [] }),

      setActions: (actions) => set({ actions }),

      hydrateFromMe: (me) => {
        const authUser: AuthUser = {
          userId: me.userId,
          email: me.email,
          firstName: me.firstName,
          lastName: me.lastName,
          actions: me.actions || [],
        } as AuthUser;
        set({
          user: authUser,
          actions: me.actions ?? [],
          isLoading: false,
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        // Persist selectively if needed in future
        // actions: state.actions,
        // user: state.user,
      }),
    }
  )
);

