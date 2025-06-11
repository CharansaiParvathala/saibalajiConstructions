import { Project, PaymentRequest, ProgressUpdate, Vehicle, Driver, User, BackupLink, FinalSubmission } from '../types';

const API_URL = 'http://localhost:3000/api';

// Helper function to handle API requests
export async function apiRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: any,
  requireAuth: boolean = true
): Promise<T> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (requireAuth) {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Decode the token to get the user ID
      const tokenData = JSON.parse(atob(token.split('.')[1]));
      const userId = tokenData.id;
      headers['x-user-id'] = userId;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }

    return response.json();
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
}

// Projects
export async function getProjects(): Promise<Project[]> {
  return apiRequest<Project[]>('/projects');
}

export async function getProjectById(id: string): Promise<Project> {
  return apiRequest<Project>(`/projects/${id}`);
}

export async function createProject(project: Omit<Project, 'id' | 'createdAt'>): Promise<Project> {
  return apiRequest<Project>('/projects', 'POST', project);
}

export async function updateProject(project: Project): Promise<void> {
  return apiRequest<void>(`/projects/${project.id}`, 'PUT', project);
}

// Payment Requests
export async function getPaymentRequests(): Promise<PaymentRequest[]> {
  return apiRequest<PaymentRequest[]>('/payment-requests');
}

export async function getPaymentRequestsByProjectId(projectId: string): Promise<PaymentRequest[]> {
  return apiRequest<PaymentRequest[]>(`/payment-requests?projectId=${projectId}`);
}

export async function createPaymentRequest(paymentRequest: Omit<PaymentRequest, 'id' | 'createdAt'>): Promise<PaymentRequest> {
  return apiRequest<PaymentRequest>('/payment-requests', 'POST', paymentRequest);
}

export async function updatePaymentRequest(paymentRequest: PaymentRequest): Promise<void> {
  return apiRequest<void>(`/payment-requests/${paymentRequest.id}`, 'PUT', paymentRequest);
}

// Progress Updates
export async function getProgressUpdates(): Promise<ProgressUpdate[]> {
  return apiRequest<ProgressUpdate[]>('/progress-updates');
}

export async function getProgressUpdatesByProjectId(projectId: string): Promise<ProgressUpdate[]> {
  return apiRequest<ProgressUpdate[]>(`/progress-updates?projectId=${projectId}`);
}

export async function createProgressUpdate(update: Omit<ProgressUpdate, 'id' | 'createdAt'>): Promise<void> {
  return apiRequest<void>('/progress-updates', 'POST', update);
}

// Users
export async function getUsers(): Promise<User[]> {
  return apiRequest<User[]>('/users');
}

export async function getUserById(id: string): Promise<User> {
  return apiRequest<User>(`/users/${id}`);
}

export async function createUser(user: Omit<User, 'id'>): Promise<User> {
  return apiRequest<User>('/users', 'POST', user);
}

export async function updateUser(user: User): Promise<void> {
  return apiRequest<void>(`/users/${user.id}`, 'PUT', user);
}

// Vehicles
export async function getVehicles(): Promise<Vehicle[]> {
  return apiRequest<Vehicle[]>('/vehicles');
}

export async function createVehicle(vehicle: Omit<Vehicle, 'id'>): Promise<Vehicle> {
  return apiRequest<Vehicle>('/vehicles', 'POST', vehicle);
}

export async function updateVehicle(vehicle: Vehicle): Promise<void> {
  return apiRequest<void>(`/vehicles/${vehicle.id}`, 'PUT', vehicle);
}

export async function deleteVehicle(id: string): Promise<void> {
  return apiRequest<void>(`/vehicles/${id}`, 'DELETE');
}

// Drivers
export async function getDrivers(): Promise<Driver[]> {
  return apiRequest<Driver[]>('/drivers');
}

export async function createDriver(driver: Omit<Driver, 'id'>): Promise<Driver> {
  return apiRequest<Driver>('/drivers', 'POST', driver);
}

export async function updateDriver(driver: Driver): Promise<void> {
  return apiRequest<void>(`/drivers/${driver.id}`, 'PUT', driver);
}

export async function deleteDriver(id: string): Promise<void> {
  return apiRequest<void>(`/drivers/${id}`, 'DELETE');
}

// Backup Links
export async function getBackupLinks(): Promise<BackupLink[]> {
  return apiRequest<BackupLink[]>('/backup-links');
}

export async function createBackupLink(link: Omit<BackupLink, 'id' | 'createdAt'>): Promise<BackupLink> {
  return apiRequest<BackupLink>('/backup-links', 'POST', link);
}

export async function deleteBackupLink(id: string): Promise<void> {
  return apiRequest<void>(`/backup-links/${id}`, 'DELETE');
}

// Final Submissions
export async function getFinalSubmissions(): Promise<FinalSubmission[]> {
  return apiRequest<FinalSubmission[]>('/final-submissions');
}

export async function createFinalSubmission(submission: Omit<FinalSubmission, 'id' | 'createdAt' | 'updatedAt'>): Promise<FinalSubmission> {
  return apiRequest<FinalSubmission>('/final-submissions', 'POST', submission);
}

export async function getFinalSubmissionsByLeader(leaderId: string): Promise<FinalSubmission[]> {
  return apiRequest<FinalSubmission[]>(`/final-submissions?leaderId=${leaderId}`);
}

export async function getFinalSubmissionsByProject(projectId: string): Promise<FinalSubmission[]> {
  return apiRequest<FinalSubmission[]>(`/final-submissions?projectId=${projectId}`);
} 