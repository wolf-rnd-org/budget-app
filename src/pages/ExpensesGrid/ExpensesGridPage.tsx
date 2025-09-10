import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import { AdminExpensesView, RegularExpensesView } from './components';

export function ExpensesGridPage() {
  const user = useAuthStore(s => s.user);
  
  // Get user actions from store
  const userActions = user?.actions || [];
  const hasAdminView = userActions.includes('expenses.admin.view');
  
  // Conditionally render based on permissions
  if (hasAdminView) {
    return <AdminExpensesView />;
  }
  
  return <RegularExpensesView />;
}
