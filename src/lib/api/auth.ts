import { apiRequest, unauthenticatedRequest } from './api-client';
import { User } from '../types';

export async function login(email: string, password: string): Promise<User> {
  const response = await unauthenticatedRequest<{ user: User; token: string }>('/auth/login', {
    method: 'POST',
    data: { email, password }
  });
  
  // Store the token
  localStorage.setItem('token', response.token);
  
  // Return the user object
  return response.user;
}

export async function register(name: string, email: string, password: string, role: string, phone: string): Promise<User> {
  const response = await unauthenticatedRequest<{ user: User; token: string }>('/auth/register', {
    method: 'POST',
    data: { name, email, password, role, phone }
  });
  
  // Store the token
  localStorage.setItem('token', response.token);
  
  // Return the user object
  return response.user;
}

export async function logout(): Promise<void> {
  localStorage.removeItem('token');
  return apiRequest<void>('/auth/logout', {
    method: 'POST'
  });
}

export async function getCurrentUser(): Promise<User> {
  return apiRequest<User>('/auth/current-user');
} 