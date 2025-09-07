// src/api/expenses.ts
import { expensesApi, isMockMode } from './http';
import { Expense } from './types';

interface GetExpensesParams {
  userId: number;
  programId?: string;
  page?: number;
  pageSize?: number;
  searchText?: string;
  status?: string;
  dateFrom?: string; // ISO yyyy-mm-dd
  dateTo?: string;   // ISO yyyy-mm-dd
  priority?: 'urgent' | 'normal' | '';
}

export async function getExpenses(  params: GetExpensesParams): Promise<{ data: Expense[]; hasMore: boolean; totalCount?: number }> {
  const { userId, programId, page = 1, pageSize = 20, searchText, status, dateFrom, dateTo, priority } = params;
  // ⚠️ ב־mock לקרוא לקובץ .json; ב־real לקרוא ל־endpoint
  const endpoint = isMockMode() ? '/expenses.json' : '/';
  const response = await expensesApi.get(endpoint, {
    params: isMockMode() ? undefined : { 
      user_id: userId,
      program_id: programId,
      page,
      pageSize,
      q: searchText,
      status,
      date_from: dateFrom,
      date_to: dateTo,
      priority,
    },
    headers: { Accept: 'application/json' },
  });
  if (isMockMode()) {
    const all: Expense[] = response.data as Expense[];

    // Simulate server-side filters
    const filtered = all.filter(expense => {
      const byProgram = programId ? (expense.project?.includes(String(programId))) : true;
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

    const start = (page - 1) * pageSize;
    const pageData = filtered.slice(start, start + pageSize);
    const totalCount = filtered.length;
    const hasMore = start + pageSize < totalCount;
    return { data: pageData, hasMore, totalCount };
  }

  const { data, hasMore, totalCount } = response.data;
  return { data, hasMore, totalCount };
}

