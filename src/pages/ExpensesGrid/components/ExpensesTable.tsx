import React from 'react';
import { Edit3, Trash2, ChevronDown, ChevronUp, Search, AlertTriangle, Download, Upload, XCircle } from 'lucide-react';
import { Expense } from '@/api/types';
import { formatCurrency } from '@/shared/utils';
import { useAuthStore } from '@/stores/authStore';
import { expensesApi, isMockMode } from '@/api/http';
import { uploadExpenseReceipt } from '@/api/receipts';

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
  // Callback when an expense object is updated (e.g., after receipt upload)
  onExpenseUpdated?: (expense: Expense) => void;
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
  onExpenseStatusUpdate,
  onExpenseUpdated
}: ExpensesTableProps) {
  const { user } = useAuthStore();
  const [error, setError] = React.useState<string | null>(null);
  const [expandedRow, setExpandedRow] = React.useState<string | null>(null);
  const [uploadingId, setUploadingId] = React.useState<string | null>(null);
  const [uploadErrors, setUploadErrors] = React.useState<Record<string, string>>({});

  // Treat urgent styling as inactive once the expense is sent for payment (and beyond)
  const isUrgentStyled = (expense: Expense) => {
    const status = String(expense.status || '').toLowerCase();
    const suppressed = new Set(['sent_for_payment', 'paid', 'closed']);
    return String(expense.priority || '').toLowerCase() === 'urgent' && !suppressed.has(status);
  };
  const isRejected = (expense: Expense) => String(expense.status || '').toLowerCase() === 'rejected';

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
  // 1) החלף/הוסף פונקציה שמחזירה האם התקדם סטטוס
  const advanceStatusIfNew = async (expense: Expense): Promise<boolean> => {
    const current = (expense.status || '').toLowerCase();
    if (current !== 'new') return false; // לא מנסה לקדם אם לא NEW

    try {
      const res = await expensesApi.patch(`/${expense.id}/status`, {
        status: expense.status, // לפי ה־API הקיים שלך: השרת בודק התאמה ומקדם
      });

      const next =
        res.data?.statusChange?.to ||
        res.data?.data?.fields?.status ||
        expense.status;

      if (onExpenseStatusUpdate && next) {
        onExpenseStatusUpdate({ ...expense, status: next });
      }

      // קידום נחשב הצלחה אם השתנה מ-NEW למשהו אחר
      return current === 'new' && String(next || '').toLowerCase() !== 'new';
    } catch (err) {
      console.error('Failed to advance status:', err);
      return false; // כישלון בקידום לא חוסם הורדה; יגרום לשליחה בלי דוא"ל
    }
  };
  const buildDownloadAndSendUrl = (
    expenseId: string,
    field: 'invoice_file' | 'bank_details_file' | 'receipt_file',
    index: number,
    opts?: { advanced?: boolean }

  ) => {
    const base = (expensesApi.defaults.baseURL || '').replace(/\/$/, '');
    const uid = user?.userId;
    const qp = new URLSearchParams();
    if (user?.userId) qp.set('user_id', String(user.userId));
    if (typeof opts?.advanced === 'boolean') qp.set('advanced', opts.advanced ? '1' : '0');
    const qs = qp.toString();
    return `${base}/${expenseId}/files/${field}/${index}/download-and-send${qs ? `?${qs}` : ''}`;
  };

  // Handle file download to local computer
  const handleFileDownload = async (
    expense: Expense,
    field: 'invoice_file' | 'bank_details_file' | 'receipt_file',
    index: number,
    fileName: string
  ) => {
    try {
      if (!user?.userId) {
        setError('Missing logged-in user. Please sign in again.');
        return;
      }

      // 1) הורדה קודם כל (ללא קידום סטטוס)
      const downloadUrlApi = buildDownloadAndSendUrl(expense.id, field, index, { advanced: false });
      const response = await fetch(downloadUrlApi);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();

      // הורדה לדפדפן
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName || `${field}_${expense.id}_${index + 1}`;
      document.body.appendChild(link);
      link.click(); document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);

      // 2) עכשיו מקדמים סטטוס (אם היה NEW)
      await advanceStatusIfNew(expense);

      // 3) טריגר לשליחת מייל ברקע — לא תנאי לקידום, ללא await
      fetch(buildDownloadAndSendUrl(expense.id, field, index, { advanced: true }))
        .catch(() => {/* נרמז/התעלמות שקטה */ });

    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: פתיחה בטאב חדש אם כשל
      window.open(buildDownloadAndSendUrl(expense.id, field, index), '_blank');
    }
  };
  //clean after tests in the prodaction
  // const handleFileDownload = async (expense: Expense, field: 'invoice_file' | 'bank_details_file' | 'receipt_file', index: number, fileName: string) => {
  //   try {
  //     if (!user?.userId) {
  //       setError('Missing logged-in user. Please sign in again.');
  //       return;
  //     }
  //     const advanced = await advanceStatusIfNew(expense);
  //     const url = buildDownloadAndSendUrl(expense.id, field, index, { advanced });

  //     // Fetch the file as blob
  //     const response = await fetch(url);
  //     if (!response.ok) throw new Error('Download failed');

  //     const blob = await response.blob();

  //     // Create download link
  //     const downloadUrl = window.URL.createObjectURL(blob);
  //     const link = document.createElement('a');
  //     link.href = downloadUrl;
  //     link.download = fileName || `${field}_${expense.id}_${index + 1}`;

  //     // Trigger download
  //     document.body.appendChild(link);
  //     link.click();

  //     // Cleanup
  //     document.body.removeChild(link);
  //     window.URL.revokeObjectURL(downloadUrl);

  //     // void pollStatusUntilChanged(expense, { tries: 12, delayMs: 1500 });

  //     // // רענון חד-פעמי מהשרת אחרי 1.5ש' כדי למשוך את הסטטוס החדש (אם עודכן)
  //     // async function fetchExpenseStatus(expenseId: string): Promise<string | undefined> {
  //     //   const res = await expensesApi.get(`/${expenseId}`);
  //     //   const fresh = res.data;
  //     //   return fresh?.fields?.status ?? fresh?.data?.fields?.status ?? fresh?.status;
  //     // }

  //     // async function pollStatusUntilChanged(expense: Expense, opts?: { tries?: number; delayMs?: number }) {
  //     //   // פול רק אם כרגע NEW (השרת מקדם רק מזה)
  //     //   if ((expense.status || '').toLowerCase() !== 'new') return;

  //     //   const tries = opts?.tries ?? 12;      // ~18s
  //     //   const delayMs = opts?.delayMs ?? 1500;

  //     //   for (let i = 0; i < tries; i++) {
  //     //     await new Promise(r => setTimeout(r, delayMs));
  //     //     try {
  //     //       const freshStatus = await fetchExpenseStatus(expense.id);
  //     //       if (freshStatus && freshStatus !== expense.status) {
  //     //         onExpenseStatusUpdate?.({ ...expense, status: freshStatus });
  //     //         return;
  //     //       }
  //     //     } catch { /* שקט */ }
  //     //   }
  //     // }


  //     // Update expense status after successful download
  //     // Only update status if onExpenseStatusUpdate callback is provided (admin view only)
  //     // if (onExpenseStatusUpdate) {
  //     //   await updateExpenseStatus(expense.id, expense);
  //     // }
  //   } catch (error) {
  //     console.error('Download failed:', error);
  //     // Fallback to opening in new tab if download fails
  //     window.open(buildDownloadAndSendUrl(expense.id, field, index), '_blank');
  //   }
  // };

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
        {
          // Fallback: show a receipt button even if attachments array is missing in list API
          (normalizeFiles((expense as any).receipt_file).length === 0 &&
            (String(expense.status || '').toLowerCase() === 'receipt_uploaded' || Boolean((expense as any).has_receipt))) && (
            <button
              key={`receipt_file-0-fallback`}
              onClick={(e) => {
                e.stopPropagation();
                const fileName = `קבלה_${expense.supplier_name}_${expense.id}`;
                handleFileDownload(expense, 'receipt_file', 0, fileName);
              }}
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs hover:bg-blue-50 px-1 py-0.5 rounded transition-colors"
            >
              <Download className="w-3 h-3" />
              קבלה
            </button>
          )
        }
      </div>
    );
  };

  const onRowClick = (expenseId: string) => {
    setExpandedRow(expandedRow === expenseId ? null : expenseId);
  };

  const handleReceiptUploadChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
    currentExpense: Expense
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setUploadErrors((prev) => ({ ...prev, [currentExpense.id]: 'הקובץ גדול מדי (מקסימום 10MB)' }));
      event.target.value = '';
      return;
    }
    try {
      setUploadingId(currentExpense.id);
      setUploadErrors((prev) => {
        const next = { ...prev };
        delete next[currentExpense.id];
        return next;
      });
      const updated = await uploadExpenseReceipt(currentExpense, file);
      onExpenseUpdated?.(updated);
    } catch (e) {
      console.error('Receipt upload failed', e);
      setUploadErrors((prev) => ({ ...prev, [currentExpense.id]: 'העלאת קבלה נכשלה. נסו שוב.' }));
    } finally {
      setUploadingId(null);
      event.target.value = '';
    }
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
      case 'rejected':
        return 'bg-gray-200 text-gray-700 border-gray-300';
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
      case 'rejected':
        return 'נדחה';
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
                  className={`hover:bg-gray-50 cursor-pointer transition-colors group ${
                    isRejected(expense)
                      ? 'bg-gray-50 border-l-4 border-gray-300 opacity-80'
                      : (isUrgentStyled(expense) ? 'bg-red-50 border-l-4 border-red-500' : '')
                  }`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {isUrgentStyled(expense) && (
                        (showDownloadColumn || showProgramColumn)
                          ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white border border-red-700">
                              דחוף
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white border border-red-700">
                              דחוף
                            </span>
                          )
                      )}
                      {isRejected(expense) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-200 text-gray-700 border border-gray-300">
                          <XCircle className="w-3 h-3" />
                          נדחה • לא ישולם
                        </span>
                      )}
                      <div className={`font-medium ${isRejected(expense) ? 'text-gray-500' : 'text-gray-900'}`}>{expense.supplier_name}</div>
                    </div>
                    <div className={`text-sm ${isRejected(expense) ? 'text-gray-400 line-through' : 'text-gray-500'}`}>{expense.invoice_description}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {new Date(expense.date).toLocaleDateString('he-IL')}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`font-semibold ${isRejected(expense) ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                      {formatCurrency(expense.amount)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusStyle(expense.status)}`}>
                      {getStatusText(expense.status)}
                    </span>
                    {isRejected(expense) && (
                      <div className="mt-1 text-xs text-gray-500"> יש להעלות הוצאה חדשה </div>
                    )}
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
                    <div className="flex items-center gap-2 w-full">
                      {/* Left slot to keep actions aligned across rows */}
                      <div className="flex items-center justify-start min-w-[84px]">
                        {((expense.status || '').toLowerCase() === 'sent_for_payment') && !showDownloadColumn ? (
                          <>
                            <input
                              id={`receipt-upload-inline-${expense.id}`}
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              className="hidden"
                              onChange={(e) => handleReceiptUploadChange(e, expense)}
                              disabled={uploadingId === expense.id}
                            />
                            <label
                              htmlFor={`receipt-upload-inline-${expense.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-all border whitespace-nowrap shrink-0 ${uploadingId === expense.id
                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                : 'bg-white text-indigo-700 border-indigo-300 hover:bg-indigo-50 hover:border-indigo-400 ring-1 ring-inset ring-indigo-100'}
                              `}
                            >
                              {uploadingId === expense.id ? (
                                <span className="inline-flex items-center gap-1">
                                  <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></span>
                                  מעלה
                                </span>
                              ) : (
                                <>
                                  <Upload className="w-3 h-3" />
                                  קבלה
                                </>
                              )}
                            </label>
                          </>
                        ) : (
                          <span aria-hidden className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-transparent opacity-0 select-none">
                            קבלה
                          </span>
                        )}
                      </div>
                      {!(showDownloadColumn || showProgramColumn) && (
                        <div className="relative group ml-auto">
                          <button
                            onClick={(e) => handleMarkUrgent(expense, e)}
                            className={`p-2 rounded-lg transition-all ${isUrgentStyled(expense)
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
                      )}

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
                          {isRejected(expense) && (
                            <div className="mb-6 p-4 rounded-lg border border-rose-300 bg-rose-50 text-rose-800 flex items-center gap-3">
                              <XCircle className="w-5 h-5" />
                              <div className="font-medium">
                                ההוצאה נדחתה, לא מחושבת בתקציב ולא תועבר לתשלום. יש להעלות הוצאה חדשה.
                              </div>
                            </div>
                          )}
                          {/* Prominent Receipt Upload Banner inside expanded row */}
                          {((expense.status || '').toLowerCase() === 'sent_for_payment') && (
                            <div className="mb-6 p-4 rounded-lg border border-amber-300 bg-amber-50 flex flex-col sm:flex-row items-center justify-between gap-3">
                              <div className="text-amber-900 font-medium">
                                הועבר לתשלום - העלו קבלה כדי להשלים את התהליך
                              </div>
                              <div className="flex items-center gap-3">
                                <input
                                  id={`receipt-upload-${expense.id}`}
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  className="hidden"
                                  onChange={(e) => handleReceiptUploadChange(e, expense)}
                                  disabled={uploadingId === expense.id}
                                />
                                <label
                                  htmlFor={`receipt-upload-${expense.id}`}
                                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium cursor-pointer transition-all ${uploadingId === expense.id ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                                >
                                  {uploadingId === expense.id ? (
                                    <span className="inline-flex items-center gap-2">
                                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                                      מעלה קבלה...
                                    </span>
                                  ) : (
                                    <>
                                      <Upload className="w-4 h-4" />
                                      העלאת קבלה
                                    </>
                                  )}
                                </label>
                              </div>
                            </div>
                          )}
                          {uploadErrors[expense.id] && expandedRow === expense.id && (
                            <div className="mb-4 text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{uploadErrors[expense.id]}</div>
                          )}
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

                              {(normalizeFiles as any)(expense.receipt_file).length > 0 && (
                                <a
                                  href={Array.isArray(expense.receipt_file)
                                    ? (isMockMode()
                                      ? (typeof (expense.receipt_file as any)[0] === 'string'
                                        ? (expense.receipt_file as any)[0]
                                        : ((expense.receipt_file as any)[0]?.url || ''))
                                      : buildRedirectUrl(expense.id, 'receipt_file', 0))
                                    : (typeof expense.receipt_file === 'string'
                                      ? expense.receipt_file
                                      : ((expense.receipt_file as any)?.url || ''))}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  קבלה
                                </a>
                              )}

                              {(normalizeFiles as any)(expense.receipt_file).length === 0 &&
                                (String(expense.status || '').toLowerCase() === 'receipt_uploaded' || Boolean((expense as any).has_receipt)) && (
                                  <a
                                    href={buildRedirectUrl(expense.id, 'receipt_file', 0)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 8H7a2 2 0 01-2 2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    קבלה
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

