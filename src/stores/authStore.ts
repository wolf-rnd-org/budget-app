

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@/api/types';
import type { MeResponse } from '@/api/types';
export interface UserProgram {
  id: string;
  name: string;
}
// src/store/auth.store.ts

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  currentProgramId: string | null;

  // חדש:
  actions: string[];

  programs: UserProgram[];
  programsLoading: boolean;
  programsError: string | null;

  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  setCurrentProgramId: (programId: string | null) => void;

  // חדש:
  setActions: (actions: string[]) => void;

  setPrograms: (programs: UserProgram[]) => void;
  setProgramsLoading: (loading: boolean) => void;
  setProgramsError: (error: string | null) => void;
  clearUser: () => void;
  logout: () => void;

  // חדש: הידרציה מתשובת me
  hydrateFromMe: (me: MeResponse) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: true,
      currentProgramId: null,
      actions: [],            // 👈 חדש
      programs: [],
      programsLoading: false,
      programsError: null,

      setUser: (user) => set({ user, isLoading: false }),
      setLoading: (isLoading) => set({ isLoading }),
      logout: () => {
        set({ user: null, isLoading: false, currentProgramId: null, programs: [], actions: [] });
        localStorage.removeItem('authToken');
      },
      setCurrentProgramId: (programId) => set({ currentProgramId: programId }),
      setPrograms: (programs) => set({ programs }),
      setProgramsLoading: (programsLoading) => set({ programsLoading }),
      setProgramsError: (programsError) => set({ programsError }),
      clearUser: () => set({ user: null, isLoading: false, currentProgramId: null, actions: [] }),

      setActions: (actions) => set({ actions }),

      hydrateFromMe: (me) => {
        // אם ה-AuthUser שלך לא כולל firstName/lastName—עדכני את הטיפוס/מיפוי
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
        currentProgramId: state.currentProgramId,
        // אם תרצי לשמר גם הרשאות:
        // actions: state.actions,
        // ואם תרצי לשמר גם user:
        // user: state.user,
      }),
    }
  )
);
