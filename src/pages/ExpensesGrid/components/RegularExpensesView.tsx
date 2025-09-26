import React from 'react';
import { Plus, Building2 } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { getExpenses } from '@/api/expenses';
import { Expense } from '@/api/types';
import { useAuthStore } from '@/stores/authStore';
import { useProgramsStore } from '@/stores/programsStore';
import { BudgetSummaryCards, ProjectSelector, SearchFilters, ExpensesTable, AddExpenseWizard, EditExpenseModal } from './index';
import { MoreActionsButton, type MoreActionsPayload, type CategoryOption } from './MoreActions';
import EditSalaryDialog from './MoreActions/EditSalaryDialog';
import EditPettyCashDialog from './MoreActions/EditPettyCashDialog';
import { useCategoriesStore } from '@/stores/categoriesStore';
import { isMockMode } from '@/api/http';
// (removed duplicate imports)
import { getProgramSummary } from '@/api/programs';
import { expensesApi } from '@/api/http';

export function RegularExpensesView() {
  const user = useAuthStore(s => s.user);
  const currentProgramId = useProgramsStore(s => s.selectedProgramId);
  const [expenses, setExpenses] = React.useState<Expense[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [expandedRow, setExpandedRow] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(true);
  const pageSize = 20;
  const loadingRef = React.useRef(false);

  // Budget summary state
  const [totalBudget, setTotalBudget] = React.useState(0);
  const [totalExpenses, setTotalExpenses] = React.useState(0);
  const [remainingBalance, setRemainingBalance] = React.useState(0);
  const [budgetUsedPercentage, setBudgetUsedPercentage] = React.useState(0);
  const [budgetLoading, setBudgetLoading] = React.useState(true);

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

  // Categories for More Actions dialogs
  const categoriesByProgram = useCategoriesStore(s => s.categoriesByProgram);
  const fetchCategoriesForProgram = useCategoriesStore(s => s.fetchForProgram);
  const categoryItems = React.useMemo(() => {
    if (!currentProgramId) return [] as CategoryOption[];
    const items = categoriesByProgram[currentProgramId]?.items || [];
    return items.map(it => ({ id: it.recId, name: it.name }));
  }, [categoriesByProgram, currentProgramId]);
  React.useEffect(() => {
    if (currentProgramId && !categoriesByProgram[currentProgramId]) {
      fetchCategoriesForProgram(currentProgramId);
    }
  }, [currentProgramId, categoriesByProgram, fetchCategoriesForProgram]);

  // Get user actions from store
  const userActions = user?.actions || [];
  const canViewBudgets = userActions.includes('program_budgets.view');
  const canViewAllExpenses = userActions.includes('expenses.view');

  // Derived: over budget by more than 5%
  const isOverLimit = totalBudget > 0 && totalExpenses > totalBudget * 1.05;

  // Fetch budget summary on component mount
  React.useEffect(() => {
    async function fetchBudgetSummary() {
      if (!currentProgramId || !canViewBudgets) { setBudgetLoading(false); return; }
      try {
        setBudgetLoading(true);
        const summary = await getProgramSummary(currentProgramId);
        setTotalBudget(summary.total_budget);
        setTotalExpenses(summary.total_expenses);
        setRemainingBalance(summary.remaining_balance);
        setBudgetUsedPercentage((summary.total_expenses / summary.total_budget) * 100);
      } catch (err) {
        console.error('Error fetching budget summary:', err);
      } finally {
        setBudgetLoading(false);
      }
    }

    fetchBudgetSummary();
  }, [currentProgramId, canViewBudgets]);

  React.useEffect(() => {
    if (!user?.userId || !currentProgramId) {
      setLoading(false);
      return;
    }

    async function fetchInitialExpenses() {
      try {
        setLoading(true);
        const result = await getExpenses({
          user_id: canViewAllExpenses ? undefined : user.userId,
          page: 1,
          pageSize,
          programId: currentProgramId
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
  }, [user?.userId, currentProgramId]);

  // Fetch expenses when search/filter parameters change
  React.useEffect(() => {
    if (!user?.userId || !currentProgramId) return;

    const fetchFilteredExpenses = async () => {
      try {
        setLoading(true);
        const result = await getExpenses({
          user_id: canViewAllExpenses ? undefined : user.userId,
          page: 1,
          pageSize,
          programId: currentProgramId,
          searchText: searchText || undefined,
          status: statusFilter || undefined,
          priority: (priorityFilter as any) || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          sort_by: sortBy,
          sort_dir: sortDir,
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
  }, [searchText, statusFilter, priorityFilter, dateFrom, dateTo, sortBy, sortDir, user?.userId, currentProgramId, canViewAllExpenses]);

  const loadMoreExpenses = React.useCallback(async () => {
    if (loadingMore || !hasMore || !user?.userId || !currentProgramId || loadingRef.current) return;

    try {
      loadingRef.current = true;
      setLoadingMore(true);
      const nextPage = currentPage + 1;
      const result = await getExpenses({
        user_id: canViewAllExpenses ? undefined : user.userId,
        page: nextPage,
        pageSize,
        programId: currentProgramId,
        searchText: searchText || undefined,
        status: statusFilter || undefined,
        priority: (priorityFilter as any) || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        sort_by: sortBy,
        sort_dir: sortDir,
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
  }, [currentPage, hasMore, loadingMore, pageSize, user?.userId, currentProgramId, canViewAllExpenses]);

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
    const candidates = [
      (expense as any).invoice_type,
      (expense as any).expense_type,
      (expense as any).type,
      (expense as any).status,
    ].filter(Boolean).map(v => String(v).toLowerCase());
    const isPettyCash =
      candidates.some(t => ['petty_cash', 'petty-cash', 'petty cash'].includes(t)) ||
      ((expense as any).invoice_type === 'קופה קטנה' ||
        (expense as any).expense_type === 'קופה קטנה');

    const isSalary =
      candidates.some(t => ['salary', 'salary_report', 'salary-report', 'salary report'].includes(t)) ||
      ((expense as any).invoice_type === 'דיווח שכר' ||
        (expense as any).expense_type === 'דיווח שכר');

    if (isPettyCash) {
      setShowEditExpense(false);
      setShowEditSalary(false);
      setShowEditPettyCash(true);

    } else if (isSalary) {
      setShowEditExpense(false);
      setShowEditPettyCash(false);
      (async () => {
        try {
          const { data } = await expensesApi.get(`/${expense.id}`);
          setEditingExpenseData(data?.fields ? { id: data.id, ...data.fields } : data);
        } catch (e) {
          console.error('Failed to load full salary expense', e);
          // אם נכשל—נמשיך עם ה־summary הקיים
        } finally {
          setShowEditSalary(true);
        }
      })();
    } else {
      setShowEditPettyCash(false);
      setShowEditSalary(false);
      setShowEditExpense(true);
    }
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
    if (isOverLimit) {
      // Block opening the wizard when more than 5% over budget
      return;
    }
    setShowAddExpense(true);
  };

  const fallbackMoreActionsError = 'שמירה נכשלה. נסו שוב.';

  const resolveMoreActionsErrorMessage = (err: unknown): string => {
    if (err && typeof err === 'object') {
      const response = (err as any).response;
      const data = response?.data;
      if (typeof data === 'string' && data.trim()) {
        return data.trim();
      }
      if (data && typeof data.message === 'string' && data.message.trim()) {
        return data.message.trim();
      }
      if (data && typeof data.error === 'string' && data.error.trim()) {
        return data.error.trim();
      }
      const errorMessage = (err as any).message;
      if (typeof errorMessage === 'string' && errorMessage.trim()) {
        return errorMessage.trim();
      }
    }
    if (typeof err === 'string' && err.trim()) {
      return err.trim();
    }
    if (err instanceof Error && err.message) {
      return err.message;
    }
    return fallbackMoreActionsError;
  };
  const handleMoreActionsSubmit = async (p: MoreActionsPayload) => {
    if (!currentProgramId || !user?.userId) return;

    const base = {
      program_id: String(currentProgramId),                 // ← ודאי מחרוזת
      categories: Array.isArray((p as any).categoryIds)
        ? (p as any).categoryIds.map(String)
        : (p as any).categoryId
          ? [String((p as any).categoryId)]
          : [],// ← מערך מחרוזות
      user_id: String(user.userId),                         // ← הקריטי! להפוך ל-string
      date: p.type === 'check'
        ? p.issueDate
        : new Date().toISOString().slice(0, 10),            // YYYY-MM-DD
      // status: 'pending' as const,
    };


    let body: any = {};
    switch (p.type) {
      case 'petty_cash':
        body = {
          ...base,
          supplier_name: p.name,
          expense_type: 'קופה קטנה',
          invoice_description: p.name,
          amount: p.amount,
          status: 'petty_cash',
        };
        break;
      case 'salary':
        body = {
          ...base,
          program_id: String(currentProgramId),
          user_id: String(user?.userId),
          supplier_name: p.payee,
          expense_type: 'דיווח שכר',
          quantity: Number(p.quantity),
          rate: Number(p.rate),
          amount: Number(p.amount),            // ?????? ???????? ????????
          meta: { is_gross: p.is_gross, rate: p.rate, quantity: p.quantity },
          categoryIds: Array.isArray((p as any).categoryIds) ? (p as any).categoryIds.map(String) : [],
          idNumber: (p as any).idNumber || '', // ?? ??
          month: (p as any).month || undefined // 'YYYY-MM' ?? ??
        };
        break;
      case 'check':
        body = {
          ...base,
          supplier_name: p.payee,
          invoice_type: 'check',
          invoice_description: `Check #${p.checkNumber}`,
          amount: p.amount,
          memo: p.memo,
        };
        break;
    }

    try {
      if (isMockMode()) {
        await new Promise(r => setTimeout(r, 500));
        const mockExpense = { id: `exp_${Date.now()}`, ...body } as Expense;
        await handleExpenseCreated(mockExpense);
        return;
      }
      await expensesApi.post('/', body, { headers: { 'Content-Type': 'application/json' } });
      // Reuse refresh logic
      await handleExpenseCreated(body as Expense);
    } catch (error) {
      console.error('MoreActions submit failed', error);
      throw new Error(resolveMoreActionsErrorMessage(error))
    }
  };

  const handleExpenseCreated = async (newExpense: Expense) => {
    setShowAddExpense(false);

    if (!currentProgramId || !user?.userId) return;

    try {
      // Wait a moment to ensure database is updated after server save
      await new Promise(resolve => setTimeout(resolve, 500));

      // Fetch fresh expenses list from server
      const result = await getExpenses({
        user_id: canViewAllExpenses ? undefined : user.userId,
        page: 1,
        pageSize,
        programId: currentProgramId
      });
      setExpenses(result.data);
      setHasMore(result.hasMore);
      setCurrentPage(1);

      // Also refresh budget summary
      const summary = await getProgramSummary(currentProgramId);
      setTotalBudget(summary.total_budget);
      setTotalExpenses(summary.total_expenses);
      setRemainingBalance(summary.remaining_balance);
      const usedPct = summary.total_budget > 0
        ? (summary.total_expenses / summary.total_budget) * 100
        : 0;
      setBudgetUsedPercentage(usedPct);
    } catch (err) {
      console.error("Error refreshing expenses and budget summary:", err);
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

    if (!currentProgramId || !user?.userId) return;

    try {
      // Wait a moment to ensure database is updated after server save
      await new Promise(resolve => setTimeout(resolve, 500));

      // Fetch fresh expenses list from server
      const result = await getExpenses({
        user_id: canViewAllExpenses ? undefined : user.userId,
        page: 1,
        pageSize,
        programId: currentProgramId
      });
      setExpenses(result.data);
      setHasMore(result.hasMore);
      setCurrentPage(1);

      // Also refresh budget summary
      if (canViewBudgets) {
        const summary = await getProgramSummary(currentProgramId);
        setTotalBudget(summary.total_budget);
        setTotalExpenses(summary.total_expenses);
        setRemainingBalance(summary.remaining_balance);
        setBudgetUsedPercentage((summary.total_expenses / summary.total_budget) * 100);
      }
    } catch (err) {
      console.error('Error refreshing expenses and budget summary:', err);
      // Fallback to optimistic update if server fetch fails
      setExpenses(prev => prev.map(exp =>
        exp.id === updatedExpense.id ? updatedExpense : exp
      ));
    }
  };



  // Show loading if no program selected
  if (user && !currentProgramId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">ניהול הוצאות</h1>
              <p className="text-gray-600">בחר פרויקט כדי להתחיל</p>
            </div>
            <ProjectSelector />
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">בחר פרויקט</h3>
            <p className="text-gray-500">אנא בחר פרויקט מהרשימה למעלה כדי לצפות בהוצאות</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Project Selector */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">ניהול הוצאות</h1>
            <p className="text-gray-600">עקוב אחר ההוצאות והתקציב שלך</p>
          </div>

          <div className="flex items-center gap-4">
            <ProjectSelector />
            <MoreActionsButton
              buttonLabel="פעולות נוספות"
              buttonClassName="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 hover:bg-gray-50"
              categories={categoryItems}
              onSubmit={handleMoreActionsSubmit}
            />
            <button
              onClick={handleNewExpense}
              style={{ cursor: isOverLimit ? 'not-allowed' : 'pointer' }}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Plus className="w-5 h-5" />
              הוצאה חדשה
            </button>
          </div>
        </div>

        {canViewBudgets && !budgetLoading && (
          <BudgetSummaryCards
            totalBudget={totalBudget}
            totalExpenses={totalExpenses}
            remainingBalance={remainingBalance}
            budgetUsedPercentage={budgetUsedPercentage}
            budgetLoaded={!budgetLoading}
          />
        )}

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
          programId={currentProgramId}
          expenses={expenses}
          loading={loading}
          loadingMore={loadingMore}
          hasMore={hasMore}
          onLoadMore={loadMoreExpenses}
        />

        <Outlet />

        <AddExpenseWizard
          isOpen={showAddExpense}
          onClose={() => setShowAddExpense(false)}
          onSuccess={handleExpenseCreated}
          totalBudget={totalBudget}
          totalExpenses={totalExpenses}
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
            open={showEditSalary}
            expense={editingExpenseData}
            categories={categoryItems}
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
            open={showEditPettyCash}
            expense={editingExpenseData}
            categories={categoryItems}
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