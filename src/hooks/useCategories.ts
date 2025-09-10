import { useProgramsStore } from '@/stores/programsStore';
import { useCategoriesStore } from '@/stores/categoriesStore';

/**
 * Hook to get categories for the currently selected program
 * Returns categories, loading state, and error state
 */
export function useCategories() {
  const selectedProgramId = useProgramsStore(s => s.selectedProgramId);
  const getCategories = useCategoriesStore(s => s.getCategories);
  const getCategoriesState = useCategoriesStore(s => s.getCategoriesState);
  const fetchForProgram = useCategoriesStore(s => s.fetchForProgram);

  const programId = selectedProgramId || '';
  const categories = getCategories(programId);
  const { loading, error } = getCategoriesState(programId);

  // Function to manually refresh categories
  const refreshCategories = () => {
    if (programId) {
      fetchForProgram(programId);
    }
  };

  return {
    categories,
    loading,
    error,
    refreshCategories,
    programId,
  };
}

/**
 * Hook to get categories for a specific program (not necessarily the selected one)
 */
export function useCategoriesForProgram(programId: string | null) {
  const getCategories = useCategoriesStore(s => s.getCategories);
  const getCategoriesState = useCategoriesStore(s => s.getCategoriesState);
  const fetchForProgram = useCategoriesStore(s => s.fetchForProgram);

  const id = programId || '';
  const categories = getCategories(id);
  const { loading, error } = getCategoriesState(id);

  // Function to manually refresh categories for this specific program
  const refreshCategories = () => {
    if (id) {
      fetchForProgram(id);
    }
  };

  return {
    categories,
    loading,
    error,
    refreshCategories,
    programId: id,
  };
}