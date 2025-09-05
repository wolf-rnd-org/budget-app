import { authApi, isMockMode } from './http';
import { useAuthStore } from '@/stores/authStore';
import type { AuthUser } from './types';
import type { MeResponse } from './types';

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

// Base URL for auth server (absolute), ignoring mock base in instance
const AUTH_BASE_URL = String(import.meta.env.VITE_AUTH_BASE_URL || '').replace(/\/+$/, '');
const APPLICATION_NAME = 'BUDGETS';

export async function getCurrentUser(userId: number): Promise<MeResponse> {
  if (isMockMode()) {
    const response = await authApi.get('/me.json', { withCredentials: true });
    return response.data as MeResponse;
  }
  const url = `${AUTH_BASE_URL}/me`;
  const response = await authApi.get(url, {
    withCredentials: true,
    params: {
      application_name: APPLICATION_NAME,
      user_id: userId,
    },
  });
  return response.data as MeResponse;
}

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  if (isMockMode()) {
    const response = await authApi.post('/login.json', credentials, { withCredentials: true });
    return response.data as AuthResponse;
  }
  const url = `${AUTH_BASE_URL}/login`;
  const response = await authApi.post(url, credentials, { withCredentials: true });
  const data = response.data as {
    userId: number;
    email: string;
    firstName: string;
    lastName: string;
  };

  const user: AuthUser = {
    userId: data.userId,
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    // Actions typically come from /me; leave empty after login
    actions: [],
  };

  return { user };
}

// export async function changePassword(credentials: ChangePasswordCredentials): Promise<{ success: boolean; message: string }> {
//   const response = await authApi.post('/change-password.json', credentials);
//   return response.data;
// }

export async function logout(): Promise<void> {
  const doClientCleanup = () => {
    try {
      useAuthStore.getState().logout();
    } catch {
      // ignore store cleanup errors
    }
  };

  if (isMockMode()) {
    try {
      await authApi.post('/logout.json', undefined, { withCredentials: true });
    } finally {
      doClientCleanup();
    }
    return;
  }
  const url = `${AUTH_BASE_URL}/logout`;
  try {
    await authApi.post(url, undefined, { withCredentials: true });
  } finally {
    // Always clean local state regardless of server outcome
    doClientCleanup();
  }
}

// Registration
export interface RegisterPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: 'accountant' | string;
  application_name?: string; // defaulted to APPLICATION_NAME if not provided
}

export async function register(payload: RegisterPayload): Promise<{ ok: true }> {
  if (isMockMode()) {
    const response = await authApi.post('/register.json', payload, { withCredentials: true });
    return response.data as { ok: true };
  }
  const url = `${AUTH_BASE_URL}/register`;
  const body = {
    application_name: APPLICATION_NAME,
    ...payload,
  };
  const response = await authApi.post(url, body, { withCredentials: true });
  return response.data as { ok: true };
}

// Change password (mock vs real)
export async function changePassword(
  credentials: ChangePasswordCredentials
): Promise<{ success: boolean; message?: string }> {
  if (isMockMode()) {
    const response = await authApi.post('/change-password.json', credentials, { withCredentials: true });
    return response.data as { success: boolean; message?: string };
  }

  const currentUserEmail = useAuthStore.getState().user?.email;
  if (!currentUserEmail) {
    throw new Error('User email not available');
  }

  const url = `${AUTH_BASE_URL}/change-password`;
  const body = {
    email: currentUserEmail,
    current_password: credentials.currentPassword,
    new_password: credentials.newPassword,
  };

  const response = await authApi.post(url, body, { withCredentials: true });
  const data = response.data as { ok?: boolean; message?: string };

  if (data?.ok === true) {
    return { success: true };
  }
  // In case server returns 200 with ok:false (unlikely), pass message back
  return { success: false, message: data?.message };
}
