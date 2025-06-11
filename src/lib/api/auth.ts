import { apiRequest } from './api-client';

interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'leader' | 'owner' | 'checker';
  };
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/login', 'POST', { email, password }, false);
}

export async function registerUser(
  email: string,
  password: string,
  name: string,
  role: string
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/register', 'POST', { email, password, name, role }, false);
}

export async function logoutUser(): Promise<void> {
  return apiRequest<void>('/auth/logout', 'POST');
}

export async function getCurrentUser(): Promise<AuthResponse['user']> {
  return apiRequest<AuthResponse['user']>('/auth/current-user');
} 