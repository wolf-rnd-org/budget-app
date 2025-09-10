import { useEffect } from 'react';
import { useProgramsStore } from '@/stores/programsStore';
import { useCategoriesStore } from '@/stores/categoriesStore';

/**
 * Hook that automatically syncs categories when the selected program changes
 * Call this hook in your main app component or layout to ensure categories
 * are always fetched when a program is selected
 */
export function useCategoriesSync() {
  const selectedProgramId = useProgramsStore(s => s.selectedProgramId);
  const fetchForProgram = useCategoriesStore(s => s.fetchForProgram);

  useEffect(() => {
    if (selectedProgramId) {
      fetchForProgram(selectedProgramId);
    }
  }, [selectedProgramId, fetchForProgram]);
}