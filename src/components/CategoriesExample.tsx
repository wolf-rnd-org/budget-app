import React from 'react';
import { useCategories, useCategoriesForProgram } from '@/hooks/useCategories';

/**
 * Example component showing how to use the categories hooks
 * This is just for demonstration - you can delete this file
 */
export function CategoriesExample() {
  const { categories, loading, error, refreshCategories, programId } = useCategories();
  
  // Example of getting categories for a specific program
  const specificProgram = useCategoriesForProgram('some-program-id');

  if (loading) {
    return <div>Loading categories...</div>;
  }

  if (error) {
    return (
      <div>
        <p>Error loading categories: {error}</p>
        <button onClick={refreshCategories}>Retry</button>
      </div>
    );
  }

  return (
    <div>
      <h3>Categories for program: {programId}</h3>
      <ul>
        {categories.map(category => (
          <li key={category.recId}>
            {category.name} (ID: {category.recId})
          </li>
        ))}
      </ul>
      <button onClick={refreshCategories}>Refresh Categories</button>
    </div>
  );
}