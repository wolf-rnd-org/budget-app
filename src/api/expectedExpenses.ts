import { expensesApi, isMockMode } from './http';

export type ExpectedExpensePayload = {
  program_id: string | number;
  name: string;
  expected_amount: number;
};

export async function createExpectedExpense(payload: ExpectedExpensePayload) {
  const endpoint = isMockMode() ? '/expected-expenses.json' : '/expected-expenses';
  const body = {
    program_id: String(payload.program_id),
    name: payload.name,
    expected_amount: Number(payload.expected_amount),
    // Send a plain amount as a fallback for servers that still expect it
    amount: Number(payload.expected_amount),
  };

  const response = await expensesApi.post(endpoint, body, {
    headers: { 'Content-Type': 'application/json' },
  });

  return response.data;
}
