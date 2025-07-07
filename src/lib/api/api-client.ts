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
export const getProjects = async (filters?: { status?: string; notCompleted?: boolean }): Promise<Project[]> => {
  let params: Record<string, string> = {};
  if (filters) {
    if (filters.status) params.status = filters.status;
    if (filters.notCompleted) params.notCompleted = 'true';
  }
  return apiRequest<Project[]>('/projects', { params });
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

export const getProgressStatistics = async (): Promise<{
  monthlyStats: Array<{
    name: string;
    month: string;
    total_completed_work: number;
    total_progress_updates: number;
    avg_completion_percentage: number;
    completed_updates: number;
    pending_updates: number;
    completed_work_amount: number;
    pending_work_amount: number;
    avg_work_per_update: number;
    active_projects_count: number;
    active_users_count: number;
  }>;
  projectStats: {
    total_projects: number;
    active_projects: number;
    completed_projects: number;
    pending_projects: number;
    cancelled_projects: number;
    total_work_planned: number;
    total_work_completed: number;
    overall_completion_percentage: number;
    avg_project_size: number;
    completed_projects_work: number;
    active_projects_work: number;
  };
  statusDistribution: Array<{
    name: string;
    value: number;
    total_work: number;
    avg_work: number;
    avg_completion: number;
  }>;
  recentActivity: Array<{
    date: string;
    progress_count: number;
    daily_completed_work: number;
    avg_work_per_update: number;
    completed_count: number;
    pending_count: number;
    avg_completion_percentage: number;
    projects_updated: number;
    users_active: number;
  }>;
  efficiencyMetrics: {
    total_progress_updates: number;
    total_work_completed: number;
    avg_work_per_update: number;
    avg_completion_percentage: number;
    fully_completed_updates: number;
    low_completion_updates: number;
    medium_completion_updates: number;
    completed_work_total: number;
    pending_work_total: number;
  };
  projectProgressCorrelation: Array<{
    project_id: number;
    project_title: string;
    project_total_work: number;
    project_completed_work: number;
    project_status: string;
    progress_updates_count: number;
    progress_total_work: number;
    avg_progress_completion: number;
    last_progress_update: string;
    first_progress_update: string;
  }>;
  userActivity: Array<{
    user_id: number;
    user_name: string;
    user_role: string;
    progress_updates_count: number;
    total_work_completed: number;
    avg_work_per_update: number;
    avg_completion_percentage: number;
    completed_updates: number;
    pending_updates: number;
    last_activity: string;
    projects_worked_on: number;
  }>;
  paymentAnalytics: {
    total_payment_requests: number;
    total_amount_requested: number;
    avg_payment_amount: number;
    pending_requests: number;
    approved_requests: number;
    rejected_requests: number;
    scheduled_requests: number;
    paid_requests: number;
    pending_amount: number;
    approved_amount: number;
    rejected_amount: number;
    scheduled_amount: number;
    paid_amount: number;
  };
  monthlyPaymentTrends: Array<{
    name: string;
    month: string;
    payment_requests_count: number;
    total_amount: number;
    avg_amount: number;
    pending_count: number;
    approved_count: number;
    rejected_count: number;
    scheduled_count: number;
    paid_count: number;
    pending_amount: number;
    approved_amount: number;
    rejected_amount: number;
    scheduled_amount: number;
    paid_amount: number;
  }>;
  paymentByProject: Array<{
    project_id: number;
    project_title: string;
    payment_requests_count: number;
    total_amount_requested: number;
    avg_payment_amount: number;
    pending_requests: number;
    approved_requests: number;
    rejected_requests: number;
    scheduled_requests: number;
    paid_requests: number;
    total_paid_amount: number;
  }>;
  paymentByUser: Array<{
    user_id: number;
    user_name: string;
    user_role: string;
    payment_requests_count: number;
    total_amount_requested: number;
    avg_payment_amount: number;
    pending_requests: number;
    approved_requests: number;
    rejected_requests: number;
    scheduled_requests: number;
    paid_requests: number;
    total_paid_amount: number;
    last_payment_request: string;
  }>;
  expenseTypeAnalysis: Array<{
    expense_type: string;
    expense_count: number;
    total_amount: number;
    avg_amount: number;
    min_amount: number;
    max_amount: number;
  }>;
  recentPaymentActivity: Array<{
    date: string;
    payment_requests_count: number;
    daily_total_amount: number;
    avg_daily_amount: number;
    pending_count: number;
    approved_count: number;
    rejected_count: number;
    scheduled_count: number;
    paid_count: number;
    projects_with_payments: number;
    users_with_payments: number;
  }>;
}> => {
  return apiRequest('/progress/statistics');
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
  vehicle_id?: number;
  driver_id?: number;
  is_external_driver?: boolean;
  external_driver_name?: string;
  external_driver_license_type?: string;
  external_driver_mobile_number?: string;
  start_meter_image?: File;
  end_meter_image?: File;
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
  if (data.vehicle_id) formData.append('vehicle_id', data.vehicle_id.toString());
  if (data.driver_id) formData.append('driver_id', data.driver_id.toString());
  if (typeof data.is_external_driver !== 'undefined') formData.append('is_external_driver', data.is_external_driver ? 'true' : 'false');
  if (data.external_driver_name) formData.append('external_driver_name', data.external_driver_name);
  if (data.external_driver_license_type) formData.append('external_driver_license_type', data.external_driver_license_type);
  if (data.external_driver_mobile_number) formData.append('external_driver_mobile_number', data.external_driver_mobile_number);
  if (data.start_meter_image) formData.append('start_meter_image', data.start_meter_image);
  if (data.end_meter_image) formData.append('end_meter_image', data.end_meter_image);

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
  status: 'approved' | 'rejected' | 'scheduled' | 'paid',
  comment?: string
): Promise<PaymentRequest> => {
  return apiRequest<PaymentRequest>(`/payment-requests/${id}/status`, {
    method: 'PUT',
    data: { status, comment },
  });
};

export const getPaymentRequestHistory = async (id: number): Promise<any[]> => {
  return apiRequest<any[]>(`/payment-requests/${id}/history`);
};

// Vehicle API
export const getVehicles = async (): Promise<Vehicle[]> => {
  return apiRequest<Vehicle[]>('/auth/vehicles');
};

export const createVehicle = async (data: {
  type: string;
  model: string;
  rc_image?: File;
  rc_expiry?: string;
  pollution_cert_image?: File;
  pollution_cert_expiry?: string;
  fitness_cert_image?: File;
  fitness_cert_expiry?: string;
}): Promise<any> => {
  const formData = new FormData();
  formData.append('type', data.type);
  formData.append('model', data.model);
  if (data.rc_image) formData.append('rc_image', data.rc_image);
  if (data.rc_expiry) formData.append('rc_expiry', data.rc_expiry);
  if (data.pollution_cert_image) formData.append('pollution_cert_image', data.pollution_cert_image);
  if (data.pollution_cert_expiry) formData.append('pollution_cert_expiry', data.pollution_cert_expiry);
  if (data.fitness_cert_image) formData.append('fitness_cert_image', data.fitness_cert_image);
  if (data.fitness_cert_expiry) formData.append('fitness_cert_expiry', data.fitness_cert_expiry);

  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/auth/vehicles`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to add vehicle');
  }
  return response.json();
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

// Backup Links API (MySQL-based)
export const getAllBackupLinks = async (): Promise<BackupLink[]> => {
  return apiRequest<BackupLink[]>('/backup-links');
};

export const createBackupLink = async (link: {
  url: string;
  description: string;
}): Promise<BackupLink> => {
  return apiRequest<BackupLink>('/backup-links', {
    method: 'POST',
    data: link,
  });
};

export const updateBackupLink = async (id: number, link: {
  url: string;
  description: string;
}): Promise<BackupLink> => {
  return apiRequest<BackupLink>(`/backup-links/${id}`, {
    method: 'PUT',
    data: link,
  });
};

export const getBackupLinkById = async (id: number): Promise<BackupLink> => {
  return apiRequest<BackupLink>(`/backup-links/${id}`);
};

// Final Submissions API
export const getFinalSubmissions = async (projectId: number): Promise<FinalSubmission[]> => {
  return apiRequest<FinalSubmission[]>(`/final-submissions/${projectId}`);
};

export const startFinalSubmissionTimer = async (projectId: number, leaderId: number) => {
  return apiRequest<{
    submissionId: number;
    timerStartedAt: string;
    timerDuration: number;
    message: string;
  }>(`/final-submissions/${projectId}/start-timer`, {
    method: 'POST',
    data: { leaderId }
  });
};

export const uploadFinalSubmissionImages = async (submissionId: number, files: File[]) => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('images', file);
  });
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/final-submissions/${submissionId}/upload-images`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to upload images');
  }
  return response.json();
};

export const completeFinalSubmission = async (submissionId: number, notes?: string) => {
  return apiRequest<{
    message: string;
    submissionId: number;
    imageCount: number;
  }>(`/final-submissions/${submissionId}/complete`, {
    method: 'POST',
    data: { notes }
  });
};

export const getFinalSubmissionDetails = async (submissionId: number) => {
  return apiRequest<FinalSubmission & { images: any[] }>(`/final-submissions/${submissionId}/details`);
};

export const getTimerStatus = async (submissionId: number) => {
  return apiRequest<{
    status: string;
    timeRemaining: number;
    timerStartedAt?: string;
    timerDuration?: number;
    message?: string;
  }>(`/final-submissions/${submissionId}/timer-status`);
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
  return apiRequest<User[]>('/auth/users');
}

export async function getUserById(id: string): Promise<User> {
  return apiRequest<User>(`/users/${id}`);
}

export async function createUser(user: Omit<User, 'id'>): Promise<User> {
  return apiRequest<User>('/auth/users', {
    method: 'POST',
    body: JSON.stringify(user)
  });
}

export async function updateUser(user: User): Promise<void> {
  return apiRequest<void>(`/auth/users/${user.id}`, {
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

// Get comprehensive export data
// Removed getExportData function - no longer needed

export const getProjectExportData = async (projectId: number): Promise<any> => {
  return apiRequest<any>(`/projects/export-project/${projectId}`);
};

// Get all project images with timestamps for export
export const getProjectImagesForExport = async (projectId: number): Promise<{
  progressImages: Array<{
    id: number;
    progress_id: number;
    created_at: string;
    image_data: string;
  }>;
  paymentImages: Array<{
    id: number;
    payment_request_id: number;
    expense_id?: number;
    created_at: string;
    image_data: string;
  }>;
}> => {
  console.log('API Client: Calling getProjectImagesForExport for project ID:', projectId);
  try {
    const response = await apiRequest<any>(`/projects/${projectId}/images-for-export`);
    console.log('API Client: Response received:', response);
    return response;
  } catch (error) {
    console.error('API Client: Error in getProjectImagesForExport:', error);
    throw error;
  }
};

// Admin Dashboard API functions
export const getAdminDashboardData = async (): Promise<{
  users: User[];
  projects: Project[];
  vehicles: Vehicle[];
  drivers: Driver[];
  paymentRequests: PaymentRequest[];
  statistics: any;
}> => {
  try {
    // Fetch all data in parallel
    const [users, projects, vehicles, drivers, paymentRequests, statistics] = await Promise.all([
      apiRequest<User[]>('/auth/users'),
      apiRequest<Project[]>('/projects'),
      apiRequest<Vehicle[]>('/auth/vehicles'),
      apiRequest<Driver[]>('/drivers'),
      apiRequest<PaymentRequest[]>('/payment-requests'),
      apiRequest<any>('/progress/statistics')
    ]);

    return {
      users,
      projects,
      vehicles,
      drivers,
      paymentRequests,
      statistics
    };
  } catch (error) {
    console.error('Error fetching admin dashboard data:', error);
    throw error;
  }
};

export const getAdminUsers = async (): Promise<User[]> => {
  return apiRequest<User[]>('/auth/users');
};

export const getAdminVehicles = async (): Promise<Vehicle[]> => {
  return apiRequest<Vehicle[]>('/auth/vehicles');
};

export const getAdminDrivers = async (): Promise<Driver[]> => {
  return apiRequest<Driver[]>('/drivers');
};

export const getAdminProjects = async (): Promise<Project[]> => {
  return apiRequest<Project[]>('/projects');
};

export const getAdminPaymentRequests = async (): Promise<PaymentRequest[]> => {
  return apiRequest<PaymentRequest[]>('/payment-requests');
};

export const getAdminPaymentSummary = async (): Promise<{
  paymentRequests: PaymentRequest[];
  summary: {
    totalAmount: number;
    paidAmount: number;
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
    scheduledCount: number;
    paidCount: number;
    totalCount: number;
  };
}> => {
  return apiRequest<{
    paymentRequests: PaymentRequest[];
    summary: {
      totalAmount: number;
      paidAmount: number;
      pendingCount: number;
      approvedCount: number;
      rejectedCount: number;
      scheduledCount: number;
      paidCount: number;
      totalCount: number;
    };
  }>('/payment-requests/admin-summary');
};

export const getAdminStatistics = async (): Promise<any> => {
  return apiRequest<any>('/progress/statistics');
};

// Get all final submission images for a project
export const getFinalSubmissionImagesForExport = async (projectId: number): Promise<Array<{
  id: number;
  final_submission_id: number;
  image_data: string;
  created_at: string;
}>> => {
  try {
    const response = await apiRequest<any>(`/projects/${projectId}/final-submission-images-for-export`);
    return response.images;
  } catch (error) {
    console.error('API Client: Error in getFinalSubmissionImagesForExport:', error);
    throw error;
  }
}; 