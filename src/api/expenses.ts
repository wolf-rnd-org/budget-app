// src/api/expenses.ts
import { expensesApi, isMockMode } from './http';
import { Expense } from './types';

interface GetExpensesParams {
  userId: number;
  programId?: string;
  page?: number;
  pageSize?: number;
}

export async function getExpenses(  params: GetExpensesParams): Promise<{ data: Expense[]; hasMore: boolean; totalCount?: number }> {
  const { userId, programId, page = 1, pageSize = 20 } = params;
  // ⚠️ ב־mock לקרוא לקובץ .json; ב־real לקרוא ל־endpoint
  const endpoint = isMockMode() ? '/expenses.json' : '/';
  const response = await expensesApi.get(endpoint, {
    params: isMockMode() ? undefined : { user_id:userId , program_id: programId, page, pageSize },
    headers: { Accept: 'application/json' },
  });
  if (isMockMode()) {
    const all: Expense[] = response.data as Expense[];

    const filtered = programId ?
      all.filter(expense => expense.project.includes(programId) || expense.project.includes('24640') || expense.project.includes('24864')) :
      all;

    const start = (page - 1) * pageSize;
    const pageData = filtered.slice(start, start + pageSize);
    const totalCount = filtered.length;
    const hasMore = start + pageSize < totalCount;
    return { data: pageData, hasMore, totalCount };
  }

  const { data, hasMore, totalCount } = response.data;
  return { data, hasMore, totalCount };
}

