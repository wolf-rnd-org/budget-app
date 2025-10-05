import React from 'react';
import { Plus } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { getExpenses } from '@/api/expenses';
import { Expense } from '@/api/types';
import { useAuthStore } from '@/stores/authStore';
import { BudgetSummaryCards, SearchFilters, ExpensesTable, AddExpenseWizard, EditExpenseModal } from './index';
import { expensesApi } from '@/api/http';
import { getPrograms, type Program } from '@/api/programs';

export function AdminExpensesView() {
  const user = useAuthStore(s => s.user);
  const [expenses, setExpenses] = React.useState<Expense[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [expandedRow, setExpandedRow] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(true);
  const pageSize = 20;
  const loadingRef = React.useRef(false);

  // Filter states
  const [searchText, setSearchText] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [priorityFilter, setPriorityFilter] = React.useState('');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [sortBy, setSortBy] = React.useState<string>('date');
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('desc');
  const [showAddExpense, setShowAddExpense] = React.useState(false);
  const [showEditExpense, setShowEditExpense] = React.useState(false);
  const [editingExpenseId, setEditingExpenseId] = React.useState<string | null>(null);
  const [editingExpenseData, setEditingExpenseData] = React.useState<Expense | null>(null);

  // Program filter state (admin view)
  const [programFilter, setProgramFilter] = React.useState<string>(''); // '' means All programs
  const [programs, setPrograms] = React.useState<Program[]>([]);
  const [programsLoading, setProgramsLoading] = React.useState(false);
  const [programsError, setProgramsError] = React.useState<string | null>(null);

  // Load all programs for dropdown
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setProgramsLoading(true);
        setProgramsError(null);
        const list = await getPrograms();
        if (!cancelled) setPrograms(list || []);
      } catch (err) {
        console.error('Error loading programs', err);
        if (!cancelled) setProgramsError('Failed to load programs');
      } finally {
        if (!cancelled) setProgramsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Get user actions from store
  const userActions = user?.actions || [];
  const canViewAllExpenses = userActions.includes('expenses.admin.view');

  // Fetch all expenses (no program filtering for admin view)
  React.useEffect(() => {
    if (!user?.userId) {
      setLoading(false);
      return;
    }

    async function fetchInitialExpenses() {
      try {
        setLoading(true);
        const result = await getExpenses({
          // No user_id filter for admin view - show all users' expenses
          // No programId filter for admin view - show all programs
          page: 1,
          pageSize,
          programId: programFilter || undefined
        });
        setExpenses(result.data);
        setHasMore(result.hasMore);
        setCurrentPage(1);
      } catch (err) {
        setError('נכשל בטעינת ההוצאות');
        console.error('Error fetching expenses:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchInitialExpenses();
  }, [user?.userId, programFilter]);

  // Fetch expenses when search/filter parameters change
  React.useEffect(() => {
    if (!user?.userId) return;

    const fetchFilteredExpenses = async () => {
      try {
        setLoading(true);
        const result = await getExpenses({
          // No user_id filter for admin view - show all users' expenses
          // No programId filter for admin view - show all programs
          page: 1,
          pageSize,
          searchText: searchText || undefined,
          status: statusFilter || undefined,
          priority: (priorityFilter as any) || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          sort_by: sortBy,
          sort_dir: sortDir,
          programId: programFilter || undefined,
        });
        setExpenses(result.data);
        setHasMore(result.hasMore);
        setCurrentPage(1);
      } catch (err) {
        setError('נכשל בטעינת ההוצאות');
        console.error('Error fetching filtered expenses:', err);
      } finally {
        setLoading(false);
      }
    };

    // Debounce search to avoid too many requests - wait for user to finish typing
    const timeoutId = setTimeout(() => {
      fetchFilteredExpenses();
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [searchText, statusFilter, priorityFilter, dateFrom, dateTo, sortBy, sortDir, user?.userId, programFilter]);

  const loadMoreExpenses = React.useCallback(async () => {
    if (loadingMore || !hasMore || !user?.userId || loadingRef.current) return;

    try {
      loadingRef.current = true;
      setLoadingMore(true);
      const nextPage = currentPage + 1;
      const result = await getExpenses({
        // No user_id filter for admin view
        // No programId filter for admin view
        page: nextPage,
        pageSize,
        searchText: searchText || undefined,
        status: statusFilter || undefined,
        priority: (priorityFilter as any) || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
          sort_by: sortBy,
          sort_dir: sortDir,
          programId: programFilter || undefined,
        });

      // Check if we already have these expenses to prevent duplicates
      setExpenses(prev => {
        const existingIds = new Set(prev.map(exp => exp.id));
        const newExpenses = result.data.filter(exp => !existingIds.has(exp.id));
        return [...prev, ...newExpenses];
      });

      setHasMore(result.hasMore);
      setCurrentPage(nextPage);
    } catch (err) {
      console.error('Error loading more expenses:', err);
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, pageSize, user?.userId, currentPage]);

  React.useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop
        >= document.documentElement.offsetHeight - 1000) {
        loadMoreExpenses();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMoreExpenses]);

  const handleRowClick = (expenseId: string) => {
    setExpandedRow(expandedRow === expenseId ? null : expenseId);
  };

  const handleEdit = (expense: Expense, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingExpenseId(expense.id);
    setEditingExpenseData(expense);
    setShowEditExpense(true);
  };

  const handleDelete = async (expense: Expense, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!confirm(`למחוק את ההוצאה של ${expense.supplier_name}?`)) return;

    try {
      await expensesApi.delete(`/${expense.id}`); // DELETE /expenses/:id
      setExpenses(prev => prev.filter(x => x.id !== expense.id)); // עדכון UI
    } catch (err) {
      console.error('Delete failed', err);
      alert('מחיקה נכשלה');
    }
  };


  const handleUrgentToggle = (updatedExpense: Expense) => {
    // Update the expense in the local state
    setExpenses(prev => prev.map(exp =>
      exp.id === updatedExpense.id ? updatedExpense : exp
    ));
  };

  const handleNewExpense = () => {
    setShowAddExpense(true);
  };

  const handleExpenseCreated = async (newExpense: Expense) => {
    setShowAddExpense(false);

    if (!user?.userId) return;

    try {
      // Wait a moment to ensure database is updated after server save
      await new Promise(resolve => setTimeout(resolve, 500));

      // Fetch fresh expenses list from server (admin view shows all expenses)
      const result = await getExpenses({
        // No user_id filter for admin view - show all users' expenses
        // No programId filter for admin view - show all programs
        page: 1,
        pageSize,
        programId: programFilter || undefined
      });
      setExpenses(result.data);
      setHasMore(result.hasMore);
      setCurrentPage(1);
    } catch (err) {
      console.error("Error refreshing expenses:", err);
      // Fallback to optimistic update if server fetch fails
      setExpenses(prev => [newExpense, ...prev]);
    }
  };

  const handleExpenseUpdated = async (updatedExpense: Expense) => {
    setShowEditExpense(false);
    setEditingExpenseId(null);

    if (!user?.userId) return;

    try {
      // Wait a moment to ensure database is updated after server save
      await new Promise(resolve => setTimeout(resolve, 500));

      // Fetch fresh expenses list from server (admin view shows all expenses)
      const result = await getExpenses({
        // No user_id filter for admin view - show all users' expenses
        // No programId filter for admin view - show all programs
        page: 1,
        pageSize,
        programId: programFilter || undefined
      });
      setExpenses(result.data);
      setHasMore(result.hasMore);
      setCurrentPage(1);
    } catch (err) {
      console.error("Error refreshing expenses:", err);
      // Fallback to optimistic update if server fetch fails
      setExpenses(prev => prev.map(exp =>
        exp.id === updatedExpense.id ? updatedExpense : exp
      ));
    }
  };

  const handleExpenseStatusUpdate = (updatedExpense: Expense) => {
    // Optimistically update the expense status in the list
    setExpenses(prev => prev.map(exp =>
      exp.id === updatedExpense.id ? updatedExpense : exp
    ));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header - No Project Selector for admin view */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">ניהול הוצאות - תצוגת מנהל</h1>
            <p className="text-gray-600">צפייה בכל ההוצאות בכל הפרויקטים</p>
          </div>


        </div>

        {/* No Budget Summary Cards for admin view since it's cross-program */}

        <SearchFilters
          searchText={searchText}
          setSearchText={setSearchText}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          priorityFilter={priorityFilter}
          setPriorityFilter={setPriorityFilter}
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
          programOptions={programs}
          programFilter={programFilter}
          setProgramFilter={setProgramFilter}
          programLoading={programsLoading}
        />

        <ExpensesTable
          onEdit={handleEdit}
          onDelete={handleDelete}
          onUrgentToggle={handleUrgentToggle}
          searchText={searchText}
          statusFilter={statusFilter}
          priorityFilter={priorityFilter}
          dateFrom={dateFrom}
          dateTo={dateTo}
          sortBy={sortBy}
          sortDir={sortDir}
          onSortChange={(by, dir) => { setSortBy(by); setSortDir(dir); }}
          programId={programFilter || null}
          expenses={expenses}
          loading={loading}
          loadingMore={loadingMore}
          hasMore={hasMore}
          onLoadMore={loadMoreExpenses}
          showProgramColumn={true}
          showDownloadColumn={true}
          onExpenseStatusUpdate={handleExpenseStatusUpdate}
        />

        <Outlet />

        <AddExpenseWizard
          isOpen={showAddExpense}
          onClose={() => setShowAddExpense(false)}
          onSuccess={handleExpenseCreated}
          // No budget constraints for admin view
          totalBudget={0}
          totalExpenses={0}
        />

        {editingExpenseId && (
          <EditExpenseModal
            isOpen={showEditExpense}
            expenseId={editingExpenseId}
            initialExpense={editingExpenseData}
            onClose={() => {
              setShowEditExpense(false);
              setEditingExpenseId(null);
              setEditingExpenseData(null);
            }}
            onSuccess={handleExpenseUpdated}
          />
        )}
      </div>
    </div>
  );
}