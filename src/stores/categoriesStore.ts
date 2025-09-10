import { create } from 'zustand';
import { budgetApi } from '@/api/http';

export type CategoryItem = { recId: string; name: string };

type ProgramCategories = {
  items: CategoryItem[];
  loading: boolean;
  error: string | null;
  lastFetched?: number;
};

interface CategoriesState {
  categoriesByProgram: Record<string, ProgramCategories>;
  selectedByProgram: Record<string, string[]>;
  setCategories: (programId: string, items: CategoryItem[]) => void;
  setLoading: (programId: string, loading: boolean) => void;
  setError: (programId: string, error: string | null) => void;
  fetchForProgram: (programId: string) => Promise<void>;
  setSelected: (programId: string, ids: string[]) => void;
  getSelected: (programId: string) => string[];
}

export const useCategoriesStore = create<CategoriesState>((set, get) => ({
  categoriesByProgram: {},
  selectedByProgram: {},
  setCategories: (programId, items) =>
    set((state) => ({
      categoriesByProgram: {
        ...state.categoriesByProgram,
        [programId]: {
          items,
          loading: false,
          error: null,
          lastFetched: Date.now(),
        },
      },
    })),
  setLoading: (programId, loading) =>
    set((state) => ({
      categoriesByProgram: {
        ...state.categoriesByProgram,
        [programId]: {
          ...(state.categoriesByProgram[programId] || { items: [], error: null }),
          loading,
        },
      },
    })),
  setError: (programId, error) =>
    set((state) => ({
      categoriesByProgram: {
        ...state.categoriesByProgram,
        [programId]: {
          ...(state.categoriesByProgram[programId] || { items: [], loading: false }),
          error,
        },
      },
    })),
  fetchForProgram: async (programId: string) => {
    if (!programId) return;
    const { categoriesByProgram, setCategories, setLoading, setError } = get() as any;
    // Avoid duplicate fetch if already loading
    if (categoriesByProgram[programId]?.loading) return;
    setLoading(programId, true);
    try {
      const res = await budgetApi.get('/categories', { params: { program_id: programId } });
      const raw = Array.isArray(res.data?.items) ? res.data.items : res.data;
      const items: CategoryItem[] = (raw || []).map((c: any) => ({
        recId: c.recId ?? c.id ?? c.recordId ?? c.airtableId ?? String(c.value ?? c),
        name: c.name ?? c.title ?? c.label ?? String(c.name ?? c),
      }));
      setCategories(programId, items);
    } catch (e) {
      console.error('Failed to fetch categories', e);
      setError(programId, 'failed');
      setLoading(programId, false);
    }
  },
  setSelected: (programId: string, ids: string[]) =>
    set((state) => ({
      selectedByProgram: { ...state.selectedByProgram, [programId]: ids },
    })),
  getSelected: (programId: string) => {
    const s = get();
    return s.selectedByProgram[programId] || [];
  },
}));
