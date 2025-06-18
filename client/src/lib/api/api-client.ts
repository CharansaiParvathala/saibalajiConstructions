import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const login = async (email: string, password: string) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const register = async (userData: any) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

// Projects API
export const getProjects = async () => {
  const response = await api.get('/projects');
  return response.data;
};

export const createProject = async (projectData: any) => {
  const response = await api.post('/projects', projectData);
  return response.data;
};

export const updateProject = async (id: string, projectData: any) => {
  const response = await api.put(`/projects/${id}`, projectData);
  return response.data;
};

export const deleteProject = async (id: string) => {
  const response = await api.delete(`/projects/${id}`);
  return response.data;
};

// Progress API
export const addProgress = async (projectId: string, progressData: any) => {
  const response = await api.post(`/projects/${projectId}/progress`, progressData);
  return response.data;
};

export const getProgress = async (projectId: string) => {
  const response = await api.get(`/projects/${projectId}/progress`);
  return response.data;
};

// Payment Requests API
export const createPaymentRequest = async (projectId: string, amount: number) => {
  const response = await api.post(`/projects/${projectId}/payments`, { amount });
  return response.data;
};

export const getPaymentRequests = async (projectId: string) => {
  const response = await api.get(`/projects/${projectId}/payments`);
  return response.data;
};

// Final Submission API
export const submitFinal = async (projectId: string, submissionData: any) => {
  const response = await api.post(`/projects/${projectId}/final-submission`, submissionData);
  return response.data;
};

export const getFinalSubmission = async (projectId: string) => {
  const response = await api.get(`/projects/${projectId}/final-submission`);
  return response.data;
};

// Backup Links API
export const addBackupLink = async (projectId: string, url: string) => {
  const response = await api.post(`/projects/${projectId}/backup-links`, { url });
  return response.data;
};

export const getBackupLinks = async (projectId: string) => {
  const response = await api.get(`/projects/${projectId}/backup-links`);
  return response.data;
};

// Vehicles API
export const addVehicle = async (projectId: string, vehicleData: any) => {
  const response = await api.post(`/projects/${projectId}/vehicles`, vehicleData);
  return response.data;
};

export const getVehicles = async (projectId: string) => {
  const response = await api.get(`/projects/${projectId}/vehicles`);
  return response.data;
};

// Drivers API
export const addDriver = async (projectId: string, driverData: any) => {
  const response = await api.post(`/projects/${projectId}/drivers`, driverData);
  return response.data;
};

export const getDrivers = async (projectId: string) => {
  const response = await api.get(`/projects/${projectId}/drivers`);
  return response.data;
}; 