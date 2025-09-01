import { authApi } from './http';
import { AuthUser } from './types';

export async function getCurrentUser(): Promise<AuthUser> {
  const response = await authApi.get('/me.json');
  return response.data;
}