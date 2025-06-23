import { Project, PaymentRequest, ProgressUpdate, Vehicle, Driver, User, BackupLink, FinalSubmission } from './types';

const API_BASE_URL = 'http://localhost:3001/api';

// Helper function for making API requests
export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return response.json();
}

// Projects API
export const getProjects = async (): Promise<Project[]> => {
  return apiRequest<Project[]>('/projects');
};

export const getProjectById = async (id: string): Promise<Project | undefined> => {
  return apiRequest<Project>(`/projects/${id}`);
};

export const getProjectsByLeaderId = async (leaderId: string): Promise<Project[]> => {
  const projects = await getProjects();
  return projects.filter(project => project.leaderId === leaderId);
};

export const saveProject = async (project: Omit<Project, 'id' | 'createdAt'>): Promise<Project> => {
  return apiRequest<Project>('/projects', {
    method: 'POST',
    body: JSON.stringify(project),
  });
};

export const updateProject = async (project: Project): Promise<void> => {
  await apiRequest(`/projects/${project.id}`, {
    method: 'PUT',
    body: JSON.stringify(project),
  });
};

// Payment Requests API
export const getPaymentRequests = async (): Promise<PaymentRequest[]> => {
  return apiRequest<PaymentRequest[]>('/payment-requests');
};

export const getPaymentRequestsByProjectId = async (projectId: string): Promise<PaymentRequest[]> => {
  const requests = await getPaymentRequests();
  return requests.filter(request => request.projectId === projectId);
};

export const savePaymentRequest = async (paymentRequest: Omit<PaymentRequest, 'id' | 'createdAt'>): Promise<PaymentRequest> => {
  return apiRequest<PaymentRequest>('/payment-requests', {
    method: 'POST',
    body: JSON.stringify(paymentRequest),
  });
};

// Progress Updates API
export const getProgressUpdates = async (): Promise<ProgressUpdate[]> => {
  return apiRequest<ProgressUpdate[]>('/progress-updates');
};

export const getProgressUpdatesByProjectId = async (projectId: string): Promise<ProgressUpdate[]> => {
  const updates = await getProgressUpdates();
  return updates.filter(update => update.projectId === projectId);
};

export const addProgressUpdate = async (update: ProgressUpdate): Promise<void> => {
  await apiRequest('/progress-updates', {
    method: 'POST',
    body: JSON.stringify(update),
  });
};

// Vehicles API
export const getAllVehicles = async (): Promise<Vehicle[]> => {
  return apiRequest<Vehicle[]>('/vehicles');
};

export const createVehicle = async (vehicle: Omit<Vehicle, 'id'>): Promise<Vehicle> => {
  return apiRequest<Vehicle>('/vehicles', {
    method: 'POST',
    body: JSON.stringify(vehicle),
  });
};

// Drivers API
export const getAllDrivers = async (): Promise<Driver[]> => {
  return apiRequest<Driver[]>('/drivers');
};

export const createDriver = async (driver: Omit<Driver, 'id'>): Promise<Driver> => {
  return apiRequest<Driver>('/drivers', {
    method: 'POST',
    body: JSON.stringify(driver),
  });
};

// Users API
export const getUsers = async (): Promise<User[]> => {
  return apiRequest<User[]>('/users');
};

export const createUser = async (user: Omit<User, 'id'>): Promise<User> => {
  return apiRequest<User>('/users', {
    method: 'POST',
    body: JSON.stringify(user),
  });
}; 