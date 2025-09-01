// src/api/expenses.ts
import { budgetApi, isMockMode } from './http';
import { Expense } from './types';

interface GetExpensesParams {
  userId: number;
  programId?: string;
  page?: number;
  pageSize?: number;
}

export async function getExpenses(
  params: GetExpensesParams
): Promise<{ data: Expense[]; hasMore: boolean; totalCount?: number }> {
  const { userId, programId, page = 1, pageSize = 20 } = params;

  // ⚠️ ב־mock לקרוא לקובץ .json; ב־real לקרוא ל־endpoint
  const endpoint = isMockMode() ? '/expenses.json' : '/expenses';

  const response = await budgetApi.get(endpoint, {
    // בפרודקשן השרת יפילטר; ב־mock זה יתעלם (זה קובץ סטטי)
    params: isMockMode() ? undefined : { userId, programId, page, pageSize },
    // לא חובה, אבל מגן מעט מפני קאש/חזרה של HTML
    headers: { Accept: 'application/json' },
  });

  // במוק: הקובץ מחזיר מערך גלמי; נייצר עמוד ולוגיקה מקומית
  if (isMockMode()) {
    const all: Expense[] = response.data as Expense[];

    // Filter by programId if provided (mock filtering)
    const filtered = programId ?
      all.filter(expense => expense.project.includes(programId) || expense.project.includes('24640') || expense.project.includes('24864')) :
      all;

    const start = (page - 1) * pageSize;
    const pageData = filtered.slice(start, start + pageSize);
    const totalCount = filtered.length;
    const hasMore = start + pageSize < totalCount;
    return { data: pageData, hasMore, totalCount };
  }

  // בפרודקשן: מצפים שהשרת יחזיר { data, hasMore, totalCount }
  const { data, hasMore, totalCount } = response.data;
  return { data, hasMore, totalCount };
}

// ---------------- NEW FUNCTION ----------------
export interface BudgetSummary {
  program_id: string;
  total_budget: number;
  total_expenses: number;
  remaining_balance: number;
}

export async function getBudgetSummary(
  programId: string | number
): Promise<BudgetSummary> {
  // ⚠️ גם כאן: ב־mock לקרוא לקובץ, בפרודקשן לאנדפוינט
  const endpoint = isMockMode() ? '/summary.json' : '/budget/summary';
  const response = await budgetApi.get(endpoint, {
    params: isMockMode() ? undefined : { program_id: programId },
    headers: { Accept: 'application/json' },
  });

  return response.data as BudgetSummary;
}
