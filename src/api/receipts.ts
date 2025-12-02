import { expensesApi, isMockMode } from '@/api/http';
import type { Expense } from '@/api/types';

// Uploads a receipt for the given expense.
// Airtable attachment field name: "receipt_file".
export async function uploadExpenseReceipt(expense: Expense, file: File): Promise<Expense> {
  if (isMockMode()) {
    await new Promise((r) => setTimeout(r, 500));
    return {
      ...expense,
      receipt_file: [{ url: `mock-receipt://${encodeURIComponent(file.name)}`, name: file.name }],
      status: 'receipt_uploaded',
    } as Expense;
  }

  const form = new FormData();
  form.append('receipt_file', file);

  const { data } = await expensesApi.post(`/${expense.id}/files`, form);
  return (data && typeof data === 'object' ? data : { ...expense }) as Expense;
}

