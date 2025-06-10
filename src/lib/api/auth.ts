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
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function registerUser(
  email: string,
  password: string,
  name: string,
  role: string
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name, role }),
  });
}

export async function logoutUser(): Promise<void> {
  return apiRequest('/auth/logout', {
    method: 'POST',
  });
}

export async function getCurrentUser(): Promise<AuthResponse['user']> {
  return apiRequest<AuthResponse['user']>('/auth/current-user');
} 