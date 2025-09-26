import React from 'react';
import { Edit3, Trash2, ChevronDown, ChevronUp, Search, AlertTriangle, Download } from 'lucide-react';
import { Expense } from '@/api/types';
import { formatCurrency } from '@/shared/utils';
import { useAuthStore } from '@/stores/authStore';
import { expensesApi, isMockMode } from '@/api/http';

interface ExpensesTableProps {
  onEdit: (expense: Expense, event: React.MouseEvent) => void;
  onDelete: (expense: Expense, event: React.MouseEvent) => void;
  onUrgentToggle?: (expense: Expense) => void;
  searchText: string;
  statusFilter: string;
  priorityFilter: string;
  dateFrom: string;
  dateTo: string;
  sortBy: string;
  sortDir: 'asc' | 'desc';
  onSortChange?: (by: string, dir: 'asc' | 'desc') => void;
  programId: string | null;
  // Add props for expenses data from parent
  expenses: Expense[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  // Show program column for admin view
  showProgramColumn?: boolean;
  // Show download files column for admin view
  showDownloadColumn?: boolean;
  // Callback when expense status is updated
  onExpenseStatusUpdate?: (expense: Expense) => void;
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
  sortBy,
  sortDir,
  onSortChange,
  programId,

  expenses,
  loading,
  loadingMore,
  hasMore,
  onLoadMore,
  showProgramColumn = false,
  showDownloadColumn = false,
  onExpenseStatusUpdate
}: ExpensesTableProps) {
  const { user } = useAuthStore();
  const [error, setError] = React.useState<string | null>(null);
  const [expandedRow, setExpandedRow] = React.useState<string | null>(null);

  // Helpers to handle file download links from server
  const normalizeFiles = (files: any): { url: string; name?: string }[] => {
    if (!files) return [];
    if (typeof files === 'string') return files ? [{ url: files }] : [];
    if (Array.isArray(files)) {
      return files
        .map((f) => (typeof f === 'string' ? { url: f } : { url: f?.url || '', name: f?.name }))
        .filter((f) => !!f.url);
    }
    if (typeof files === 'object' && files.url) return [{ url: files.url, name: files.name }];
    return [];
  };

  const buildRedirectUrl = (expenseId: string, field: 'invoice_file' | 'bank_details_file' | 'receipt_file', index: number) => {
    const base = (expensesApi.defaults.baseURL || '').replace(/\/$/, '');
    return `${base}/${expenseId}/files/${field}/${index}`;
  };

  // Handle file download to local computer
  const handleFileDownload = async (expense: Expense, field: 'invoice_file' | 'bank_details_file' | 'receipt_file', index: number, fileName: string) => {
    try {
      const url = buildRedirectUrl(expense.id, field, index);

      // Fetch the file as blob
      const response = await fetch(url);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();

      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName || `${field}_${expense.id}_${index + 1}`;

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      // Update expense status after successful download
      // Only update status if onExpenseStatusUpdate callback is provided (admin view only)
      if (onExpenseStatusUpdate) {
        await updateExpenseStatus(expense.id, expense);
      }
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback to opening in new tab if download fails
      window.open(buildRedirectUrl(expense.id, field, index), '_blank');
    }
  };

  // Update expense status - server decides next status based on current status
  const updateExpenseStatus = async (expenseId: string, currentExpense: Expense) => {
    try {
      const res = await expensesApi.patch(`/${expenseId}/status`, {
        status: currentExpense.status, // ← היה tatus
      });
      const next =
        res.data?.statusChange?.to ||
        res.data?.data?.fields?.status ||
        currentExpense.status;

      if (onExpenseStatusUpdate && next) {
        onExpenseStatusUpdate({ ...currentExpense, status: next });
      }
    } catch (err) {
      console.error('Failed to update expense status:', err);
    }
  };

  // Render download buttons for all file types
  const renderDownloadButtons = (expense: Expense) => {
    const fileTypes = [
      { field: 'invoice_file' as const, label: 'חשבונית', files: expense.invoice_file },
      { field: 'bank_details_file' as const, label: 'פרטי בנק', files: expense.bank_details_file },
      { field: 'receipt_file' as const, label: 'קבלה', files: expense.receipt_file }
    ];

    const availableFiles = fileTypes.filter(({ files }) => {
      const normalized = normalizeFiles(files);
      return normalized.length > 0;
    });

    if (availableFiles.length === 0) {
      return <span className="text-gray-400 text-xs">אין קבצים</span>;
    }

    return (
      <div className="flex flex-col gap-1">
        {availableFiles.map(({ field, label, files }) => {
          const normalized = normalizeFiles(files);
          return normalized.map((file, index) => {
            const fileName = file.name || `${label}_${expense.supplier_name}_${expense.id}`;
            return (
              <button
                key={`${field}-${index}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleFileDownload(expense, field, index, fileName);
                }}
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs hover:bg-blue-50 px-1 py-0.5 rounded transition-colors"
              >
                <Download className="w-3 h-3" />
                {label}
                {normalized.length > 1 && ` (${index + 1})`}
              </button>
            );
          });
        })}
      </div>
    );
  };

  const onRowClick = (expenseId: string) => {
    setExpandedRow(expandedRow === expenseId ? null : expenseId);
  };
  const updatingUrgentIds = React.useRef<Set<string>>(new Set());

  const handleMarkUrgent = async (expense: Expense, event: React.MouseEvent) => {
    event.stopPropagation();

    // מניעת לחיצה כפולה/מרוץ בקשות לאותו id
    if (updatingUrgentIds.current.has(expense.id)) return;
    updatingUrgentIds.current.add(expense.id);

    const newPriority = expense.priority === 'urgent' ? 'normal' : 'urgent';
    try {
      if (!isMockMode()) {
        await expensesApi.patch(`/${expense.id}`, { priority: newPriority });
      } else {
        await new Promise(r => setTimeout(r, 300));
      }
      onUrgentToggle?.({ ...expense, priority: newPriority });
    } catch (err) {
      console.error('Error updating expense priority:', err);
    } finally {
      updatingUrgentIds.current.delete(expense.id);
    }
  };

  // Data fetching is now handled by parent component

  React.useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop
        >= document.documentElement.offsetHeight - 1000) {
        onLoadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [onLoadMore]);

  // Server-side filtering now; render what server returns
  const filteredExpenses = expenses;

  const handleSortClick = (field: string) => {
    const nextDir: 'asc' | 'desc' = sortBy === field ? (sortDir === 'asc' ? 'desc' : 'asc') : (field === 'date' ? 'desc' : 'asc');
    if (onSortChange) onSortChange(field, nextDir);
  };

  const SortIcon = ({ field }: { field: string }) => {
    const isActive = sortBy === field;
    const classes = `w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-300'}`;
    if (!isActive) return <ChevronDown className={classes} />;
    return sortDir === 'asc' ? (
      <ChevronUp className={classes} />
    ) : (
      <ChevronDown className={classes} />
    );
  };

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
      case 'petty_cash':
        return 'קופה קטנה';
      case 'salary':
        return 'דיווח שכר';
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
              {showProgramColumn && (
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">תוכנית</th>
              )}
              {showDownloadColumn && (
                <th className="text-center px-6 py-4 text-sm font-semibold text-gray-900">הורדת קבצים</th>
              )}
              <th className="text-center px-6 py-4 text-sm font-semibold text-gray-900">פעולות</th>
            </tr>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-right px-6 pb-3 pt-0 text-xs font-normal text-gray-500">
                <button type="button" onClick={() => handleSortClick('supplier_name')} className="inline-flex items-center gap-1 hover:text-blue-600">
                  <SortIcon field="supplier_name" />
                </button>
              </th>
              <th className="text-right px-6 pb-3 pt-0 text-xs font-normal text-gray-500">
                <button type="button" onClick={() => handleSortClick('date')} className="inline-flex items-center gap-1 hover:text-blue-600">
                  <SortIcon field="date" />
                </button>
              </th>
              <th className="text-right px-6 pb-3 pt-0 text-xs font-normal text-gray-500">
                <button type="button" onClick={() => handleSortClick('amount')} className="inline-flex items-center gap-1 hover:text-blue-600">
                  <SortIcon field="amount" />
                </button>
              </th>
              <th className="text-right px-6 pb-3 pt-0 text-xs font-normal text-gray-500">
                <button type="button" onClick={() => handleSortClick('status')} className="inline-flex items-center gap-1 hover:text-blue-600">
                  <SortIcon field="status" />
                </button>
              </th>
              {showProgramColumn && (
                <th className="text-right px-6 pb-3 pt-0 text-xs font-normal text-gray-500">
                  <button type="button" onClick={() => handleSortClick('program_name')} className="inline-flex items-center gap-1 hover:text-blue-600">
                    <SortIcon field="program_name" />
                  </button>
                </th>
              )}
              {showDownloadColumn && (
                <th className="px-6 pb-3 pt-0"></th>
              )}
              <th className="px-6 pb-3 pt-0"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredExpenses.map((expense) => (
              <React.Fragment key={expense.id}>
                <tr
                  onClick={() => onRowClick(expense.id)}
                  className={`hover:bg-gray-50 cursor-pointer transition-colors group ${expense.priority === 'urgent'
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
                  {showProgramColumn && (
                    <td className="px-6 py-4 text-gray-700">
                      {expense.program_name || '—'}
                    </td>
                  )}
                  {showDownloadColumn && (
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {renderDownloadButtons(expense)}
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <div className="relative group">
                        {/* <button
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
                         */}
                        {/* Tooltip */}
                        {/* <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                          {expense.priority === 'urgent' 
                            ? 'הסר דחיפות' 
                            : 'הערה: סמן הוצאות כדחופות רק אם הכסף באמת דחוף'
                          }
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                        </div> */}
                      </div>


                      <button
                        onClick={(e) => onEdit(expense, e)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(expense, e); }}
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
                    <td colSpan={
                      (showProgramColumn ? 1 : 0) +
                      (showDownloadColumn ? 1 : 0) +
                      5 // base columns: supplier, date, amount, status, actions
                    } className="px-6 py-0">
                      <div className="bg-gray-50 rounded-xl p-6 m-4 border border-gray-200">
                        <div className="mb-4">
                          <h4 className="text-lg font-semibold text-gray-900 mb-1">פרטי הוצאה נוספים</h4>
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
                              <span className="text-sm font-medium text-gray-600">חשבונית ע''ש</span>
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
                                      {typeof cat === 'string' ? cat : (cat?.name ?? cat?.id ?? '—')}
                                    </span>
                                  )) :
                                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                                    {expense.categories}
                                  </span>
                                }
                              </div>
                            </div>
                          </div>

                          {/* Bank Details Section */}
                          <div className="pt-4 border-t border-gray-200">
                            <h5 className="text-sm font-semibold text-gray-700 mb-3">פרטי בנק</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                <span className="text-sm font-medium text-gray-600">שם הבנק</span>
                                <span className="text-sm text-gray-900">{(expense as any).bank_name || expense.bank_name || '—'}</span>
                              </div>
                              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                <span className="text-sm font-medium text-gray-600">סניף</span>
                                <span className="text-sm text-gray-900">{(expense as any).bank_branch || expense.bank_branch || '—'}</span>
                              </div>
                              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                <span className="text-sm font-medium text-gray-600">חשבון</span>
                                <span className="text-sm text-gray-900">{(expense as any).bank_account || expense.bank_account || '—'}</span>
                              </div>
                              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                <span className="text-sm font-medium text-gray-600">מוטב</span>
                                <span className="text-sm text-gray-900">{(expense as any).beneficiary || expense.beneficiary || '—'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Files Section */}
                          <div className="pt-4 border-t border-gray-200">
                            <h5 className="text-sm font-semibold text-gray-700 mb-3">קבצים מצורפים</h5>
                            <div className="flex flex-wrap gap-3">
                              <a
                                href={Array.isArray(expense.invoice_file)
                                  ? (isMockMode()
                                    ? (typeof (expense.invoice_file as any)[0] === 'string'
                                      ? (expense.invoice_file as any)[0]
                                      : ((expense.invoice_file as any)[0]?.url || ''))
                                    : buildRedirectUrl(expense.id, 'invoice_file', 0))
                                  : (typeof expense.invoice_file === 'string'
                                    ? expense.invoice_file
                                    : ((expense.invoice_file as any)?.url || ''))}
                                style={{ display: (normalizeFiles as any)(expense.invoice_file).length > 0 ? 'inline-flex' : 'none' }}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                חשבונית
                              </a>

                              {(normalizeFiles as any)(expense.bank_details_file).length > 0 && (
                                <a
                                  href={Array.isArray(expense.bank_details_file)
                                    ? (isMockMode()
                                      ? (typeof (expense.bank_details_file as any)[0] === 'string'
                                        ? (expense.bank_details_file as any)[0]
                                        : ((expense.bank_details_file as any)[0]?.url || ''))
                                      : buildRedirectUrl(expense.id, 'bank_details_file', 0))
                                    : (typeof expense.bank_details_file === 'string'
                                      ? expense.bank_details_file
                                      : ((expense.bank_details_file as any)?.url || ''))}
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

