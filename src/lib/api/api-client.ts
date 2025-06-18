import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { Project, PaymentRequest, ProgressUpdate, Vehicle, Driver, User, BackupLink, FinalSubmission } from '../types';

const API_BASE_URL = 'http://localhost:3001/api';

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add auth token
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// For unauthenticated requests (login, register)
export const unauthenticatedRequest = async <T>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    data?: any;
    params?: Record<string, string>;
  } = {}
): Promise<T> => {
    const headers: Record<string, string> = {
    'Content-Type': 'application/json'
    };

  const config: AxiosRequestConfig = {
    method: options.method || 'GET',
    url: `${API_BASE_URL}${endpoint}`,
    headers,
    data: options.data,
    params: options.params,
  };

  console.log('Making unauthenticated request to:', endpoint);
  console.log('Request options:', config);

  try {
    const response = await axios(config);
    return response.data;
  } catch (error: any) {
    console.error('API Error:', error.response?.data || error.message);
    throw error;
  }
};

// For authenticated requests
export const apiRequest = async <T>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    data?: any;
    params?: Record<string, string>;
    body?: FormData | string;
  } = {}
): Promise<T> => {
  const { method = 'GET', data, params, body } = options;
  const token = localStorage.getItem('token');

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`
  };

  // Only add Content-Type if not sending FormData
  if (!(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }
  
  const response = await fetch(url.toString(), {
    method,
      headers,
    body: body || (data ? JSON.stringify(data) : undefined)
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'API request failed');
  }
  
  return response.json();
};

// Auth API
export const login = async (email: string, password: string): Promise<{ token: string; user: User }> => {
  return unauthenticatedRequest<{ token: string; user: User }>('/auth/login', {
    method: 'POST',
    data: { email, password },
  });
};

export const register = async (userData: {
  email: string;
  password: string;
  name: string;
  mobileNumber?: string;
  role?: string;
}): Promise<{ token: string; user: User }> => {
  return unauthenticatedRequest<{ token: string; user: User }>('/auth/register', {
    method: 'POST',
    data: userData,
  });
};

export const getCurrentUser = async (): Promise<User> => {
  return apiRequest<User>('/auth/current-user');
};

// Projects API
export const getProjects = async (): Promise<Project[]> => {
  return apiRequest<Project[]>('/projects');
};

export const getProjectById = async (id: number): Promise<Project> => {
  return apiRequest<Project>(`/projects/${id}`);
};

export const createProject = async (project: {
  title: string;
  description: string;
  leaderId: number;
  totalWork: number;
}): Promise<Project> => {
  const requestData = {
    title: project.title,
    description: project.description,
    leader_id: project.leaderId,
    total_work: project.totalWork,
    completed_work: 0,
    status: 'active',
    start_date: new Date().toISOString().split('T')[0]
  };

  console.log('API createProject called with:', {
    original: project,
    transformed: requestData
  });

  return apiRequest<Project>('/projects', {
    method: 'POST',
    data: requestData,
  });
};

export const updateProject = async (id: number, project: Partial<Project>): Promise<Project> => {
  return apiRequest<Project>(`/projects/${id}`, {
    method: 'PUT',
    data: project,
  });
};

export const deleteProject = async (id: number): Promise<void> => {
  return apiRequest<void>(`/projects/${id}`, {
    method: 'DELETE',
  });
};

// Progress API
export const getProgressUpdates = async (projectId: number): Promise<ProgressUpdate[]> => {
  return apiRequest<ProgressUpdate[]>(`/progress/project/${projectId}`);
};

export const getProgressImage = async (imageId: number): Promise<Blob> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/progress/image/${imageId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch progress image');
  }
  
  return response.blob();
};

export const addProgress = async (data: {
  projectId: number;
  completedWork: number;
  description: string;
  images?: File[];
}): Promise<any> => {
  const formData = new FormData();
  formData.append('projectId', data.projectId.toString());
  formData.append('completedWork', data.completedWork.toString());
  formData.append('description', data.description);
  
  if (data.images && data.images.length > 0) {
    data.images.forEach((image) => {
      formData.append('images', image);
    });
  }

  const response = await fetch(`${API_BASE_URL}/progress`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: formData
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to add progress');
  }

  return response.json();
};

// Payment Requests API
export const getPaymentRequests = async (userId: number): Promise<any[]> => {
  return apiRequest<any[]>('/payment-requests');
};

export const getPaymentRequestsByProjectId = async (projectId: number): Promise<any[]> => {
  return apiRequest<any[]>(`/payment-requests/project/${projectId}`);
};

export const getPaymentRequestImage = async (imageId: number): Promise<Blob> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/payment-requests/image/${imageId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch payment request image');
  }
  
  return response.blob();
};

export const createPaymentRequest = async (data: {
  projectId: number;
  description: string;
  progressId?: number;
  expenses: Array<{
    type: 'food' | 'fuel' | 'labour' | 'vehicle' | 'water' | 'other';
    amount: number;
    remarks?: string;
    images?: number[]; // Array of image indices
  }>;
  images?: File[];
}): Promise<any> => {
  const formData = new FormData();
  formData.append('projectId', data.projectId.toString());
  formData.append('description', data.description);
  
  if (data.progressId) {
    formData.append('progressId', data.progressId.toString());
  }
  
  // Add expenses as JSON string
  formData.append('expenses', JSON.stringify(data.expenses));
  
  // Add images
  if (data.images && data.images.length > 0) {
    data.images.forEach((image) => {
      formData.append('images', image);
    });
  }

  const response = await fetch(`${API_BASE_URL}/payment-requests`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: formData
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to create payment request');
  }

  return response.json();
};

export const updatePaymentRequestStatus = async (
  id: number,
  status: 'approved' | 'rejected' | 'scheduled' | 'paid'
): Promise<PaymentRequest> => {
  return apiRequest<PaymentRequest>(`/payment-requests/${id}/status`, {
    method: 'PUT',
    data: { status },
  });
};

// Vehicle API
export const getVehicles = async (): Promise<Vehicle[]> => {
  return apiRequest<Vehicle[]>('/vehicles');
};

export const createVehicle = async (vehicle: Omit<Vehicle, 'id'>): Promise<Vehicle> => {
  return apiRequest<Vehicle>('/vehicles', {
    method: 'POST',
    data: vehicle,
  });
};

export const updateVehicle = async (id: number, vehicle: Partial<Vehicle>): Promise<Vehicle> => {
  return apiRequest<Vehicle>(`/vehicles/${id}`, {
    method: 'PUT',
    data: vehicle,
  });
};

// Driver API
export const getDrivers = async (): Promise<Driver[]> => {
  return apiRequest<Driver[]>('/drivers');
};

export const createDriver = async (driver: Omit<Driver, 'id'>): Promise<Driver> => {
  return apiRequest<Driver>('/drivers', {
    method: 'POST',
    data: driver,
  });
};

export const updateDriver = async (id: number, driver: Partial<Driver>): Promise<Driver> => {
  return apiRequest<Driver>(`/drivers/${id}`, {
    method: 'PUT',
    data: driver,
  });
};

// Backup Links API
export const getBackupLinks = async (projectId: number): Promise<BackupLink[]> => {
  return apiRequest<BackupLink[]>(`/backup-links?projectId=${projectId}`);
};

export const createBackupLink = async (link: Omit<BackupLink, 'id'>): Promise<BackupLink> => {
  return apiRequest<BackupLink>('/backup-links', {
    method: 'POST',
    data: link,
  });
};

// Final Submissions API
export const getFinalSubmissions = async (projectId: number): Promise<FinalSubmission[]> => {
  return apiRequest<FinalSubmission[]>(`/final-submissions?projectId=${projectId}`);
};

// Progress Updates
export async function getProgressUpdatesByProjectId(projectId: string): Promise<ProgressUpdate[]> {
  return apiRequest<ProgressUpdate[]>(`/progress-updates?projectId=${projectId}`);
}

export async function createProgressUpdate(update: Omit<ProgressUpdate, 'id' | 'createdAt'>): Promise<void> {
  return apiRequest<void>('/progress-updates', {
    method: 'POST',
    body: JSON.stringify(update)
  });
}

// Users
export async function getUsers(): Promise<User[]> {
  return apiRequest<User[]>('/users');
}

export async function getUserById(id: string): Promise<User> {
  return apiRequest<User>(`/users/${id}`);
}

export async function createUser(user: Omit<User, 'id'>): Promise<User> {
  return apiRequest<User>('/users', {
    method: 'POST',
    body: JSON.stringify(user)
  });
}

export async function updateUser(user: User): Promise<void> {
  return apiRequest<void>(`/users/${user.id}`, {
    method: 'PUT',
    body: JSON.stringify(user)
  });
}

export async function deleteVehicle(id: string): Promise<void> {
  return apiRequest<void>(`/vehicles/${id}`, {
    method: 'DELETE'
  });
}

export async function deleteDriver(id: string): Promise<void> {
  return apiRequest<void>(`/drivers/${id}`, {
    method: 'DELETE'
  });
}

export async function deleteBackupLink(id: string): Promise<void> {
  return apiRequest<void>(`/backup-links/${id}`, {
    method: 'DELETE'
  });
} 