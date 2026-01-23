import React from 'react';
import { Plus } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { getExpenses } from '@/api/expenses';
import { Expense } from '@/api/types';
import { useAuthStore } from '@/stores/authStore';
import { BudgetSummaryCards, SearchFilters, ExpensesTable, AddExpenseWizard, EditExpenseModal } from './index';
import EditSalaryDialog from './MoreActions/EditSalaryDialog';
import EditPettyCashDialog from './MoreActions/EditPettyCashDialog';
import { expensesApi } from '@/api/http';
import { getPrograms, type Program } from '@/api/programs';
// import { useCategoriesStore } from '@/stores/categoriesStore'; // ← ADD

const ADMIN_FILTERS_STORAGE_KEY = 'admin-expenses-filters';

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
  const [showEditSalary, setShowEditSalary] = React.useState(false);
  const [showEditPettyCash, setShowEditPettyCash] = React.useState(false);
  const [editingExpenseId, setEditingExpenseId] = React.useState<string | null>(null);
  const [editingExpenseData, setEditingExpenseData] = React.useState<Expense | null>(null);
  const [filtersReady, setFiltersReady] = React.useState(false);

  // Program filter state (admin view)
  const [programFilter, setProgramFilter] = React.useState<string[]>([]); // [] means All programs
  const [programs, setPrograms] = React.useState<Program[]>([]);
  const [programsLoading, setProgramsLoading] = React.useState(false);
  const [programsError, setProgramsError] = React.useState<string | null>(null);

//   // ← ADD: קטגוריות לפי תוכנית ההוצאה הנערכת
//   const categoriesByProgram = useCategoriesStore(s => s.categoriesByProgram);
//   const fetchCategoriesForProgram = useCategoriesStore(s => s.fetchForProgram);
//   const [dialogProgramId, setDialogProgramId] = React.useState<string | null>(null);
//   const categoryItems = React.useMemo(() => {
//     if (!dialogProgramId) return [];
//     const items = categoriesByProgram[dialogProgramId]?.items || [];
// return items.map(it => ({ id: it.id ?? it.recId, name: it.name }));
//   }, [dialogProgramId, categoriesByProgram]);
//   React.useEffect(() => {
//     if (dialogProgramId) {
//       const entry = categoriesByProgram[dialogProgramId];
//       const needsFetch = !entry || (!entry.loading && (!entry.lastFetched || (entry.items?.length ?? 0) === 0));
//       if (needsFetch) fetchCategoriesForProgram(dialogProgramId);
//     }
//   }, [dialogProgramId, categoriesByProgram, fetchCategoriesForProgram]);
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
  const canRejectExpenses = userActions.includes('expenses.admin.reject');
  const canEditExpenses = userActions.includes('expenses.admin.edit');
  const canDeleteExpenses = userActions.includes('expenses.admin.delete');
  const effectiveProgramFilter = programFilter.length ? programFilter : undefined;

  // Load saved filters per user (admin view only)
  React.useEffect(() => {
    if (!user?.userId) return;

    setFiltersReady(false);
    setSearchText('');
    setStatusFilter('');
    setPriorityFilter('');
    setDateFrom('');
    setDateTo('');
    setSortBy('date');
    setSortDir('desc');
    setProgramFilter([]);

    try {
      const raw = localStorage.getItem(`${ADMIN_FILTERS_STORAGE_KEY}:${user.userId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.searchText === 'string') setSearchText(parsed.searchText);
        if (typeof parsed.statusFilter === 'string') setStatusFilter(parsed.statusFilter);
        if (typeof parsed.priorityFilter === 'string') setPriorityFilter(parsed.priorityFilter);
        if (typeof parsed.dateFrom === 'string') setDateFrom(parsed.dateFrom);
        if (typeof parsed.dateTo === 'string') setDateTo(parsed.dateTo);
        if (typeof parsed.sortBy === 'string') setSortBy(parsed.sortBy);
        if (parsed.sortDir === 'asc' || parsed.sortDir === 'desc') setSortDir(parsed.sortDir);
        if (Array.isArray(parsed.programFilter)) {
          setProgramFilter(parsed.programFilter.filter((id: unknown) => typeof id === 'string'));
        }
      }
    } catch (err) {
      console.warn('Failed to load admin filters from storage', err);
    } finally {
      setFiltersReady(true);
    }
  }, [user?.userId]);

  // Persist filters per user (admin view only)
  React.useEffect(() => {
    if (!user?.userId || !filtersReady) return;

    const payload = {
      searchText,
      statusFilter,
      priorityFilter,
      dateFrom,
      dateTo,
      sortBy,
      sortDir,
      programFilter,
    };

    try {
      localStorage.setItem(`${ADMIN_FILTERS_STORAGE_KEY}:${user.userId}`, JSON.stringify(payload));
    } catch (err) {
      console.warn('Failed to save admin filters to storage', err);
    }
  }, [dateFrom, dateTo, priorityFilter, programFilter, searchText, sortBy, sortDir, statusFilter, user?.userId, filtersReady]);

  // Fetch all expenses (no program filtering for admin view)
  React.useEffect(() => {
    if (!user?.userId) {
      setLoading(false);
      return;
    }
    if (!filtersReady) return;

    async function fetchInitialExpenses() {
      try {
        setLoading(true);
        const result = await getExpenses({
          // No user_id filter for admin view - show all users' expenses
          // No programId filter for admin view - show all programs
          page: 1,
          pageSize,
          programId: effectiveProgramFilter
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
  }, [user?.userId, programFilter, filtersReady]);

  // Fetch expenses when search/filter parameters change
  React.useEffect(() => {
    if (!user?.userId || !filtersReady) return;

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
          programId: effectiveProgramFilter,
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
  }, [searchText, statusFilter, priorityFilter, dateFrom, dateTo, sortBy, sortDir, user?.userId, programFilter, filtersReady]);

  const loadMoreExpenses = React.useCallback(async () => {
    if (loadingMore || !hasMore || !user?.userId || loadingRef.current || !filtersReady) return;

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
        programId: effectiveProgramFilter,
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
  }, [hasMore, loadingMore, pageSize, user?.userId, currentPage, searchText, statusFilter, priorityFilter, dateFrom, dateTo, sortBy, sortDir, programFilter, filtersReady]);

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
    if (!canEditExpenses) return;
    setEditingExpenseId(expense.id);
    setEditingExpenseData(expense);
    // ← ADD: קבעי את התוכנית הרלוונטית לדיאלוג
    // const programFromExpense =
    //   (expense as any).program_id ||
    //   (expense as any).programId ||
    //   (expense as any).program?.id ||
    //   (Array.isArray((expense as any).program) ? (expense as any).program[0] : '');
    // setDialogProgramId(programFromExpense || programFilter || null);

    // Detect special types like in RegularExpensesView
    const candidates = [
      (expense as any).invoice_type,
      (expense as any).expense_type,
      (expense as any).type,
      (expense as any).status,
    ].filter(Boolean).map(v => String(v).toLowerCase());

    const isPettyCash =
      candidates.some(t => ['petty_cash', 'petty-cash', 'petty cash'].includes(t)) ||
      ((expense as any).invoice_type === 'קופה קטנה' || (expense as any).expense_type === 'קופה קטנה');
    const isSalary =
      candidates.some(t => ['salary', 'salary_report', 'salary-report', 'salary report'].includes(t)) ||
      ((expense as any).invoice_type === 'דיווח שכר' || (expense as any).expense_type === 'דיווח שכר');

    if (isPettyCash) {
      setShowEditExpense(false);
      setShowEditSalary(false);
      setShowEditPettyCash(true);
      return;
    }

    if (isSalary) {
      setShowEditExpense(false);
      setShowEditPettyCash(false);
      (async () => {
        try {
          const { data } = await expensesApi.get(`/${expense.id}`);
          setEditingExpenseData(data?.fields ? { id: data.id, ...data.fields } : data);
        } catch (e) {
          console.error('Failed to load full salary expense', e);
        } finally {
          setShowEditSalary(true);
        }
      })();
      return;
    }

    // Fallback to generic editor
    setShowEditPettyCash(false);
    setShowEditSalary(false);
    setShowEditExpense(true);
  };

  const handleDelete = async (expense: Expense, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!canDeleteExpenses) return;
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

  const refreshExpensesList = React.useCallback(async () => {
    if (!user?.userId) return;

    // Wait a moment to ensure database is updated after server save
    await new Promise(resolve => setTimeout(resolve, 500));

    const result = await getExpenses({
      // No user_id filter for admin view - show all users' expenses
      // No programId filter for admin view - show all programs
      page: 1,
      pageSize,
      programId: effectiveProgramFilter
    });
    setExpenses(result.data);
    setHasMore(result.hasMore);
    setCurrentPage(1);
  }, [user?.userId, pageSize, effectiveProgramFilter]);

  const handleExpenseCreated = async (newExpense: Expense) => {
    setShowAddExpense(false);

    if (!user?.userId) return;

    try {
      await refreshExpensesList();
    } catch (err) {
      console.error("Error refreshing expenses:", err);
      // Fallback to optimistic update if server fetch fails
      setExpenses(prev => [newExpense, ...prev]);
    }
  };

  const handleExpenseUpdated = async (updatedExpense: Expense) => {
    setShowEditExpense(false);
    setShowEditPettyCash(false);
    setShowEditSalary(false);
    setEditingExpenseId(null);
    setEditingExpenseData(null);

    if (!user?.userId) return;

    try {
      await refreshExpensesList();
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
          programId={effectiveProgramFilter || null}
          expenses={expenses}
          loading={loading}
          loadingMore={loadingMore}
          hasMore={hasMore}
          onLoadMore={loadMoreExpenses}
          showProgramColumn={true}
          showDownloadColumn={true}
          onExpenseStatusUpdate={handleExpenseStatusUpdate}
          allowReject={canRejectExpenses}
          enforceAdminActions={true}
        />

        <Outlet />

        <AddExpenseWizard
          isOpen={showAddExpense}
          onClose={() => setShowAddExpense(false)}
          onSuccess={handleExpenseCreated}
          onTimeoutRefresh={refreshExpensesList}
          // No budget constraints for admin view
          totalBudget={0}
          totalExpenses={0}
        />

        {editingExpenseId && showEditExpense && (
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

        {editingExpenseId && showEditSalary && (
          <EditSalaryDialog
            // key={dialogProgramId || 'salary'}
            open={showEditSalary}
            expense={editingExpenseData}
            // categories={categoryItems}  // ← ADD
            onClose={() => {
              setShowEditSalary(false);
              setEditingExpenseId(null);
              setEditingExpenseData(null);
            }}
            onSuccess={handleExpenseUpdated}
          />
        )}

        {editingExpenseId && showEditPettyCash && (
          <EditPettyCashDialog
            // key={dialogProgramId || 'petty'}
            open={showEditPettyCash}
            expense={editingExpenseData}
            // categories={categoryItems}  // ← ADD
            onClose={() => {
              setShowEditPettyCash(false);
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
