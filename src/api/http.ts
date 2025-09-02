import axios from 'axios';

const apiMode = import.meta.env.VITE_API_MODE || 'mock';

export function isMockMode(): boolean {
  return apiMode === 'mock';
}

// Auth API instance
export const authApi = axios.create({
  baseURL: isMockMode() 
    ? '' 
    : `${import.meta.env.VITE_AUTH_BASE_URL}`,
  
});

// Budget API instance
export const budgetApi = axios.create({
  baseURL: isMockMode() 
    ? '' 
    : `${import.meta.env.VITE_BUDGET_BASE_URL}`,
});

// Programs API instance
export const programsApi = axios.create({
  baseURL: isMockMode()
    ? ''
    : `${import.meta.env.VITE_PROGRAMS_BASE_URL}`,
});

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
