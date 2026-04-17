import { apiRequest } from './api';

export type AuthUser = {
  id: string;
  email: string;
};

export type AuthResponse = {
  user: AuthUser;
  accessToken: string;
};

export async function registerApi(email: string, password: string) {
  return apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: { email, password },
  });
}

export async function loginApi(email: string, password: string) {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export async function meApi(token: string) {
  return apiRequest<{ user: AuthUser }>('/auth/me', {
    method: 'GET',
    token,
  });
}

export async function logoutApi(token: string) {
  return apiRequest<{ ok: true }>('/auth/logout', {
    method: 'POST',
    token,
  });
}
