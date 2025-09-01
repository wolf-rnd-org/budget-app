import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthUser } from '@/api/types';

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  currentProgramId: string | null;
  programs: UserProgram[];
  programsLoading: boolean;
  programsError: string | null;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  setCurrentProgramId: (programId: string) => void;
  setPrograms: (programs: UserProgram[]) => void;
  setProgramsLoading: (loading: boolean) => void;
  setProgramsError: (error: string | null) => void;
  clearUser: () => void;
}

export interface UserProgram {
  id: string;
  name: string;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,
      currentProgramId: null,
      programs: [],
      programsLoading: false,
      programsError: null,
      setUser: (user) => {
        set({ user, isLoading: false });
      },
      setLoading: (isLoading) => set({ isLoading }),
      setCurrentProgramId: (programId) => set({ currentProgramId: programId }),
      setPrograms: (programs) => set({ programs }),
      setProgramsLoading: (programsLoading) => set({ programsLoading }),
      setProgramsError: (programsError) => set({ programsError }),
      clearUser: () => set({ user: null, isLoading: false, currentProgramId: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        currentProgramId: state.currentProgramId,
      }),
    }
  )
);