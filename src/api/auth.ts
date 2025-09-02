import { authApi, isMockMode } from './http';
import { AuthUser } from './types';

export async function getCurrentUser(): Promise<AuthUser> {
  const endpoint = isMockMode()
    ? '/mocks/auth/me.json'  
    : '/auth/me';            
  const response = await authApi.get(endpoint);
  return response.data;
}