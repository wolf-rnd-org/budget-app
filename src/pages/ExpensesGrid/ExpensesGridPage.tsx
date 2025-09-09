import React from 'react';
import { Plus, Building2 } from 'lucide-react';
import { Outlet, useNavigate } from 'react-router-dom';
import { getExpenses } from '@/api/expenses';
import { Expense } from '@/api/types';
import { useAuthStore } from '@/stores/authStore';
import { BudgetSummaryCards, ProjectSelector, SearchFilters, ExpensesTable, LoadingStates, AddExpenseWizard, EditExpenseModal } from './components';
import { getProgramSummary } from '@/api/programs';

export function ExpensesGridPage() {
  const navigate = useNavigate();
  const { user, currentProgramId } = useAuthStore();
  const [expenses, setExpenses] = React.useState<Expense[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [expandedRow, setExpandedRow] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(true);
  const pageSize = 20;
  
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
  const [editingExpenseId, setEditingExpenseId] = React.useState<string | null>(null);

  // Get user actions from store
  const userActions = user?.actions || [];
  const canViewBudgets = userActions.includes('program_budgets.view');
  const canViewAllExpenses = userActions.includes('expenses.view');

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
          pageSize ,
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

  const loadMoreExpenses = React.useCallback(async () => {
    if (loadingMore || !hasMore || !user?.userId || !currentProgramId) return;
    
    try {
      setLoadingMore(true);
      const nextPage = currentPage + 1;
      const result = await getExpenses({ 
        user_id: canViewAllExpenses ? undefined : user.userId, 
        page: nextPage, 
        pageSize ,
        programId: currentProgramId
      });
      setExpenses(prev => [...prev, ...result.data]);
      setHasMore(result.hasMore);
      setCurrentPage(nextPage);
    } catch (err) {
      console.error('Error loading more expenses:', err);
    } finally {
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
    setShowEditExpense(true);
  };

  const handleDelete = (expense: Expense, event: React.MouseEvent) => {
    event.stopPropagation();
    console.log('Delete expense:', expense.id);
  };

  const handleUrgentToggle = (updatedExpense: Expense) => {
    // Update the expense in the local state
    setExpenses(prev => prev.map(exp => 
      exp.id === updatedExpense.id ? updatedExpense : exp
    ));
  };

  const handleNewExpense = () => {
    const overLimit = totalBudget > 0 && totalExpenses > totalBudget * 1.05;
    if (overLimit) {
      // Block opening the wizard when more than 5% over budget
      return;
    }
    setShowAddExpense(true);
  };
const handleExpenseCreated = async (newExpense: Expense) => {
  // אופטימיסטי
  setExpenses(prev => [newExpense, ...prev]);
  setShowAddExpense(false);

  if (!currentProgramId) return;

  try {
    const summary = await getBudgetSummary(currentProgramId);

    setTotalBudget(summary.total_budget);
    setTotalExpenses(summary.total_expenses);
    setRemainingBalance(summary.remaining_balance);

    const usedPct = summary.total_budget > 0
      ? (summary.total_expenses / summary.total_budget) * 100
      : 0;

    setBudgetUsedPercentage(usedPct);
  } catch (err) {
    console.error("Error refreshing budget summary:", err);
  }
};

  const handleExpenseUpdated = (updatedExpense: Expense) => {
    // Optimistically update the expense in the list
    setExpenses(prev => prev.map(exp => 
      exp.id === updatedExpense.id ? updatedExpense : exp
    ));
    setShowEditExpense(false);
    setEditingExpenseId(null);
    
    // Refresh budget summary
    if (currentProgramId && canViewBudgets) {
      getBudgetSummary(currentProgramId).then(summary => {
        setTotalBudget(summary.total_budget);
        setTotalExpenses(summary.total_expenses);
        setRemainingBalance(summary.remaining_balance);
        setBudgetUsedPercentage((summary.total_expenses / summary.total_budget) * 100);
      }).catch(err => {
        console.error('Error refreshing budget summary:', err);
      });
    }
  };

  // Filter expenses based on search criteria
  const filteredExpenses = expenses;
  // .filter(expense => {
  //   const matchesText = searchText === '' || 
  //     expense.project.toLowerCase().includes(searchText.toLowerCase()) ||
  //     expense.supplier_name.toLowerCase().includes(searchText.toLowerCase()) ||
  //     expense.invoice_description.toLowerCase().includes(searchText.toLowerCase());
    
  //   const matchesStatus = statusFilter === '' || expense.status === statusFilter;
    
  //   const matchesDateFrom = dateFrom === '' || new Date(expense.date) >= new Date(dateFrom);
  //   const matchesDateTo = dateTo === '' || new Date(expense.date) <= new Date(dateTo);
    
  //   return matchesText && matchesStatus && matchesDateFrom && matchesDateTo;
  // });

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
            <button
              onClick={handleNewExpense}
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
        />

        <Outlet />
        
        <AddExpenseWizard
          isOpen={showAddExpense}
          onClose={() => setShowAddExpense(false)}
          onSuccess={handleExpenseCreated}
          totalBudget={totalBudget}
          totalExpenses={totalExpenses}
        />
        
        {editingExpenseId && (
          <EditExpenseModal
            isOpen={showEditExpense}
            expenseId={editingExpenseId}
            onClose={() => {
              setShowEditExpense(false);
              setEditingExpenseId(null);
            }}
            onSuccess={handleExpenseUpdated}
          />
        )}
      </div>
    </div>
  );
}
