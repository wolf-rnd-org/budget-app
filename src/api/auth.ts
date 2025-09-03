import { authApi } from './http';
import { AuthUser } from './types';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface ChangePasswordCredentials {
  currentPassword: string;
  newPassword: string;
}

export interface AuthResponse {
  user: AuthUser;
  token?: string;
}

export async function getCurrentUser(userId: number): Promise<AuthUser> {
  const response = await authApi.get('/me.json');
  return response.data;
}

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await authApi.post('/login.json', credentials);
  return response.data;
}

export async function changePassword(credentials: ChangePasswordCredentials): Promise<{ success: boolean; message: string }> {
  const response = await authApi.post('/change-password.json', credentials);
  return response.data;
}

export async function logout(): Promise<void> {
  await authApi.post('/logout.json');
}