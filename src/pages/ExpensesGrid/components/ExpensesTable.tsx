import React from 'react';
import { Edit3, Trash2, ChevronDown, ChevronUp, Search, AlertTriangle } from 'lucide-react';
import { Expense } from '@/api/types';
import { formatCurrency } from '@/shared/utils';
import { useAuthStore } from '@/stores/authStore';
import { getExpenses } from '@/api/expenses';
import { budgetApi, isMockMode } from '@/api/http';

interface ExpensesTableProps {
  onEdit: (expense: Expense, event: React.MouseEvent) => void;
  onDelete: (expense: Expense, event: React.MouseEvent) => void;
  onUrgentToggle?: (expense: Expense) => void;
  searchText: string;
  statusFilter: string;
  priorityFilter: string;
  dateFrom: string;
  dateTo: string;
  programId: string | null;
}

export function ExpensesTable({
  onEdit,
  onDelete,
  onUrgentToggle,
  searchText,
  statusFilter,
  priorityFilter,
  dateFrom,
  dateTo,
  programId
}: ExpensesTableProps) {
  const { user } = useAuthStore();
  const [expenses, setExpenses] = React.useState<Expense[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [expandedRow, setExpandedRow] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(true);
  const pageSize = 20;

  const onRowClick = (expenseId: string) => {
    setExpandedRow(expandedRow === expenseId ? null : expenseId);
  };

  const handleMarkUrgent = async (expense: Expense, event: React.MouseEvent) => {
    event.stopPropagation();
    
    try {
      const newPriority = expense.priority === 'urgent' ? 'normal' : 'urgent';
      
      if (isMockMode()) {
        // Mock API call
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Update local state optimistically
        setExpenses(prev => prev.map(exp => 
          exp.id === expense.id 
            ? { ...exp, priority: newPriority }
            : exp
        ));
        
        if (onUrgentToggle) {
          onUrgentToggle({ ...expense, priority: newPriority });
        }
      } else {
        // Real API call
        debugger
        const response = await budgetApi.patch(`/budget/expenses/${expense.id}`, {
          priority: newPriority
        });
        
        // Update local state
        setExpenses(prev => prev.map(exp => 
          exp.id === expense.id 
            ? { ...exp, priority: newPriority }
            : exp
        ));
        
        if (onUrgentToggle) {
          onUrgentToggle(response.data);
        }
      }
    } catch (err) {
      console.error('Error updating expense priority:', err);
    }
  };

  React.useEffect(() => {
    if (!user?.userId || !programId) {
      setLoading(false);
      return;
    }

    async function fetchInitialExpenses() {
      try {
        setLoading(true);
        const result = await getExpenses({ 
          userId: user.userId, 
          page: 1, 
          pageSize ,
          programId: programId,
          searchText,
          status: statusFilter || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          priority: (priorityFilter as any) || undefined,
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
  }, [user?.userId, programId, searchText, statusFilter, dateFrom, dateTo, priorityFilter]);

  const loadMoreExpenses = React.useCallback(async () => {
    if (loadingMore || !hasMore || !user?.userId || !programId) return;
    
    try {
      setLoadingMore(true);
      const nextPage = currentPage + 1;
      const result = await getExpenses({ 
        userId: user.userId, 
        page: nextPage, 
        pageSize ,
        programId: programId,
        searchText,
        status: statusFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        priority: (priorityFilter as any) || undefined,
      });
      setExpenses(prev => [...prev, ...result.data]);
      setHasMore(result.hasMore);
      setCurrentPage(nextPage);
    } catch (err) {
      console.error('Error loading more expenses:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [currentPage, hasMore, loadingMore, pageSize, user?.userId, programId]);

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

  // Server-side filtering now; render what server returns
  const filteredExpenses = expenses;

  // Early return if no user
  if (!user?.userId) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">נדרש אימות</h3>
          <p className="text-gray-500">יש להתחבר כדי לצפות בהוצאות</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">טוען הוצאות...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
        <p className="text-red-700 font-medium">{error}</p>
      </div>
    );
  }
  const getStatusStyle = (status: string) => {
    switch ((status || '').toLowerCase()) {
      case 'new':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'sent_for_payment':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'paid':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'receipt_uploaded':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'closed':
        return 'bg-gray-200 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

    const getStatusText = (status: string) => {
    switch ((status || '').toLowerCase()) {
      case 'new':
        return 'חדש – ממתין להנה"ח';
      case 'sent_for_payment':
        return 'נשלחה לתשלום';
      case 'paid':
        return 'שולם – ממתין לקבלה';
      case 'receipt_uploaded':
        return 'הועלתה קבלה';
      case 'closed':
        return 'הסתיים';
      default:
        return status;
    }
  };

  const formatCategories = (categories: string[] | string) => {
    if (Array.isArray(categories)) {
      return categories.join(', ');
    }
    return categories;
  };
  if (filteredExpenses.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">לא נמצאו הוצאות</h3>
          <p className="text-gray-500">נסה לשנות את קריטריוני החיפוש</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">ספק</th>
              <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">תאריך</th>
              <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">סכום</th>
              <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">סטטוס</th>
              <th className="text-center px-6 py-4 text-sm font-semibold text-gray-900">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredExpenses.map((expense) => (
              <React.Fragment key={expense.id}>
                <tr 
                  onClick={() => onRowClick(expense.id)}
                  className={`hover:bg-gray-50 cursor-pointer transition-colors group ${
                    expense.priority === 'urgent' 
                      ? 'bg-red-50 border-l-4 border-red-500' 
                      : ''
                  }`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {expense.priority === 'urgent' && (
                        <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                      )}
                      <div className="font-medium text-gray-900">{expense.supplier_name}</div>
                    </div>
                    <div className="text-sm text-gray-500">{expense.invoice_description}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {new Date(expense.date).toLocaleDateString('he-IL')}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(expense.amount)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusStyle(expense.status)}`}>
                      {getStatusText(expense.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <div className="relative group">
                        <button
                          onClick={(e) => handleMarkUrgent(expense, e)}
                          className={`p-2 rounded-lg transition-all ${
                            expense.priority === 'urgent'
                              ? 'text-red-600 bg-red-50 hover:bg-red-100'
                              : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                          }`}
                          title={expense.priority === 'urgent' ? 'הסר דחיפות' : 'סמן כדחוף'}
                        >
                          <AlertTriangle className="w-4 h-4" />
                        </button>
                        
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                          {expense.priority === 'urgent' 
                            ? 'הסר דחיפות' 
                            : 'הערה: סמן הוצאות כדחופות רק אם הכסף באמת דחוף'
                          }
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                      
                      <button
                        onClick={(e) => onEdit(expense, e)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => onDelete(expense, e)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                        {expandedRow === expense.id ? 
                          <ChevronUp className="w-4 h-4" /> : 
                          <ChevronDown className="w-4 h-4" />
                        }
                      </button>
                    </div>
                  </td>
                </tr>
                
                {/* Accordion Content */}
                {expandedRow === expense.id && (
                  <tr>
                    <td colSpan={5} className="px-6 py-0">
                      <div className="bg-gray-50 rounded-xl p-6 m-4 border border-gray-200">
                        <div className="mb-4">
                          <h4 className="text-lg font-semibold text-gray-900 mb-1">פרטי הוצאה מלאים</h4>
                          <div className="w-12 h-0.5 bg-blue-500 rounded-full"></div>
                        </div>
                        
                        <div className="bg-white rounded-lg p-6 shadow-sm">
                          {/* Basic Details Section */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-6">
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                              <span className="text-sm font-medium text-gray-600">תיאור החשבונית</span>
                              <span className="text-sm text-gray-900 font-medium">{expense.invoice_description}</span>
                            </div>
                            
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                              <span className="text-sm font-medium text-gray-600">תקציב</span>
                              <span className="text-sm text-gray-900 font-bold">{expense.budget}</span>
                            </div>
                            
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                              <span className="text-sm font-medium text-gray-600">מספר עסק</span>
                              <span className="text-sm text-gray-900 font-mono">{expense.business_number}</span>
                            </div>
                            
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                              <span className="text-sm font-medium text-gray-600">סוג חשבונית</span>
                              <span className="text-sm text-gray-900 font-medium">{expense.invoice_type}</span>
                            </div>
                            
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                              <span className="text-sm font-medium text-gray-600">אימייל ספק</span>
                              <span className="text-sm text-gray-900 font-medium">{expense.supplier_email || 'לא צוין'}</span>
                            </div>
                            
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                              <span className="text-sm font-medium text-gray-600">קטגוריות</span>
                              <div className="flex flex-wrap gap-1">
                                {Array.isArray(expense.categories) ? 
                                  expense.categories.map((cat, idx) => (
                                    <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                                      {cat}
                                    </span>
                                  )) :
                                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                                    {expense.categories}
                                  </span>
                                }
                              </div>
                            </div>
                          </div>
                          
                          {/* Files Section */}
                          <div className="pt-4 border-t border-gray-200">
                            <h5 className="text-sm font-semibold text-gray-700 mb-3">קבצים מצורפים</h5>
                            <div className="flex flex-wrap gap-3">
                              <a
                                href={expense.invoice_file} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                חשבונית
                              </a>
                              
                              {expense.bank_details_file && (
                                <a
                                  href={expense.bank_details_file} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                  </svg>
                                  פרטי בנק
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        
        {/* Loading More Indicator */}
        {loadingMore && (
          <div className="bg-white p-6 text-center border-t border-gray-100">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">טוען עוד הוצאות...</p>
          </div>
        )}

        {/* End of Data Indicator */}
        {!hasMore && expenses.length > 0 && (
          <div className="text-center py-6 border-t border-gray-100">
            <p className="text-gray-500">הוצגו כל ההוצאות</p>
          </div>
        )}
      </div>
    </div>
  );
}

