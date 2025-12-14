// src/api/expenses.ts
import { expensesApi, isMockMode } from './http';
import { Expense } from './types';
import { useAuthStore } from '@/stores/authStore';

interface GetExpensesParams {
  user_id?: number; // optional: omit when user has expenses.view
  programId?: string | string[];
  page?: number;
  pageSize?: number;
  searchText?: string;
  status?: string;
  dateFrom?: string; // ISO yyyy-mm-dd
  dateTo?: string;   // ISO yyyy-mm-dd
  priority?: 'urgent' | 'normal' | '';
  sort_by?: string; // e.g., supplier_name | date | amount | status
  sort_dir?: 'asc' | 'desc';
  // userActions removed - will be automatically retrieved from auth store
}

export async function getExpenses(params: GetExpensesParams): Promise<{ data: Expense[]; hasMore: boolean; totalCount?: number }> {
  const { user_id, programId, page = 1, pageSize = 20, searchText, status, dateFrom, dateTo, priority, sort_by, sort_dir } = params;
  const authState = useAuthStore.getState();
  const rawUserActions = authState.user?.actions ?? authState.actions ?? [];
  const normalizedActions = Array.isArray(rawUserActions)
    ? rawUserActions
    : rawUserActions
      ? [String(rawUserActions)]
      : [];
  const userActionsParam = JSON.stringify(normalizedActions);
  const programIds = Array.isArray(programId)
    ? programId.filter(Boolean)
    : programId
      ? [programId]
      : [];
  const primaryProgramId = programIds.length === 1 ? programIds[0] : undefined;
  const multipleProgramIds = programIds.length > 1 ? programIds : undefined;
  const commaSeparatedProgramIds = programIds.length > 1 ? programIds.join(',') : undefined;
  // ⚠️ ב־mock לקרוא לקובץ .json; ב־real לקרוא ל־endpoint
  const endpoint = isMockMode() ? '/expenses.json' : '/';
  const response = await expensesApi.get(endpoint, {
    params: isMockMode()
      ? undefined
      : {
        // Only include user_id if provided (i.e., caller wants user-scoped data)
        ...(typeof user_id === 'number' ? { user_id } : {}),
        // Support both single and multiple program filters; keep legacy program_id for single selection
        ...(primaryProgramId ? { program_id: primaryProgramId } : {}),
        ...(multipleProgramIds ? { program_ids: multipleProgramIds } : {}),
        // Fallback for servers that accept comma-separated program_id only
        ...(commaSeparatedProgramIds ? { program_id: commaSeparatedProgramIds } : {}),
        page,
        pageSize,
        q: searchText,
        status,
        date_from: dateFrom,
        date_to: dateTo,
        priority,
        sort_by,
        sort_dir,
        // Send user actions for server-side permission checking
        user_actions: userActionsParam,
      },
    headers: { Accept: 'application/json' },
  });
  if (isMockMode()) {
    const all: Expense[] = response.data as Expense[];

    // Simulate server-side filters
    const filtered = all.filter(expense => {
      const projectRaw = (expense as any).project;
      const projectTokens = Array.isArray(projectRaw)
        ? projectRaw.map(v => String(v))
        : projectRaw
          ? [String(projectRaw)]
          : [];
      const byProgram = programIds.length > 0
        ? programIds.some(id => projectTokens.some(token => token === String(id) || token.includes(String(id))))
        : true;
      const byStatus = status ? (String(expense.status).toLowerCase() === status.toLowerCase()) : true;
      const byPriority = priority ? (String(expense.priority || '').toLowerCase() === priority.toLowerCase()) : true;
      const byText = searchText ? (
        String(expense.project).toLowerCase().includes(searchText.toLowerCase()) ||
        String(expense.supplier_name).toLowerCase().includes(searchText.toLowerCase()) ||
        String(expense.invoice_description).toLowerCase().includes(searchText.toLowerCase())
      ) : true;
      const dateVal = new Date(expense.date);
      const byFrom = dateFrom ? (dateVal >= new Date(dateFrom)) : true;
      const byTo = dateTo ? (dateVal <= new Date(dateTo)) : true;
      return byProgram && byStatus && byPriority && byText && byFrom && byTo;
    });

    // Simulate server-side sort
    const sortField = sort_by || 'date';
    const sortDirVal = (sort_dir || 'desc') === 'asc' ? 1 : -1;
    const sorted = [...filtered].sort((a, b) => {
      const getVal = (e: Expense) => {
        switch (sortField) {
          case 'amount':
            return e.amount;
          case 'supplier_name':
            return (e.supplier_name || '').toString().toLowerCase();
          case 'status':
            return (e.status || '').toString().toLowerCase();
          case 'date':
          default:
            return new Date(e.date).getTime();
        }
      };
      const va = getVal(a);
      const vb = getVal(b);
      if (va < vb) return -1 * sortDirVal;
      if (va > vb) return 1 * sortDirVal;
      return 0;
    });

    const start = (page - 1) * pageSize;
    const pageData = sorted.slice(start, start + pageSize);
    const totalCount = filtered.length;
    const hasMore = start + pageSize < totalCount;
    return { data: pageData, hasMore, totalCount };
  }

  const { data, hasMore, totalCount } = response.data;
  return { data, hasMore, totalCount };
}
export async function deleteExpense(id: string) {
  await expensesApi.delete(`/${id}`); // מצפה ל-204 No Content
}
