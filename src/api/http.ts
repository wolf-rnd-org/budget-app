import axios from 'axios';

const apiMode = import.meta.env.VITE_API_MODE || 'mock';

export function isMockMode(): boolean {

  return apiMode === 'mock';
}

// Auth API instance
export const authApi = axios.create({
  baseURL: isMockMode()
    ? '/mocks/auth'
    : import.meta.env.VITE_AUTH_BASE_URL,
  timeout: 10000,
});

// Budget API instance
export const budgetApi = axios.create({
  baseURL: isMockMode()
    ? '/mocks/budgets'
    : `${import.meta.env.VITE_BUDGET_BASE_URL}`,
});

// Programs API instance
export const programsApi = axios.create({
  baseURL: isMockMode()
    ? 'mocks/programs'
    : `${import.meta.env.VITE_PROGRAMS_BASE_URL}`,
});

// Expenses API instance
export const expensesApi = axios.create({
  baseURL: isMockMode()
    ? '/mocks/expenses'
    : import.meta.env.VITE_EXPENSES_BASE_URL,
  timeout: 10000,
});

export const documentsApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});
// Funding Sources API 
export type FundingSourceDTO = { id: string; name: string; code?: string };

export async function getFundingSources() {
  const { data } = await budgetApi.get<FundingSourceDTO[]>('/funding-sources', {
    withCredentials: false,
  });
  return data;
}
// Common interceptors
function attach401Interceptor(instance: typeof authApi) {
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        throw error; // ProtectedRoute will handle
      }
      return Promise.reject(error);
    }
  );
}

[authApi, budgetApi, programsApi].forEach(attach401Interceptor);
