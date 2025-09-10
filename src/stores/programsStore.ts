import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ProgramItem = { id: string; name: string };

interface ProgramsState {
  programs: ProgramItem[];
  selectedProgramId: string | null;
  loading: boolean;
  error: string | null;

  setPrograms: (programs: ProgramItem[]) => void;
  setSelectedProgramId: (programId: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

export const useProgramsStore = create<ProgramsState>()(
  persist(
    (set) => ({
      programs: [],
      selectedProgramId: null,
      loading: false,
      error: null,

      setPrograms: (programs) => set({ programs }),
      setSelectedProgramId: (selectedProgramId) => set({ selectedProgramId }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      clear: () => set({ programs: [], selectedProgramId: null, loading: false, error: null }),
    }),
    {
      name: 'programs-storage',
      partialize: (state) => ({ selectedProgramId: state.selectedProgramId }),
    }
  )
);

