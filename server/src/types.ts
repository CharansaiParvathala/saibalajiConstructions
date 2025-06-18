export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'leader' | 'checker' | 'owner';
  mobileNumber?: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  leaderId: string;
  totalWork: number;
  completedWork: number;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
}

export interface PaymentRequest {
  id: string;
  projectId: string;
  amount: number;
  description: string;
  status: 'pending' | 'approved' | 'rejected' | 'scheduled' | 'paid';
  createdAt: string;
}

export interface ProgressUpdate {
  id: string;
  projectId: string;
  description: string;
  completedWork: number;
  images: string[];
  createdAt: string;
}

export interface Vehicle {
  id: string;
  name: string;
  type: string;
  registrationNumber: string;
  capacity: number;
  status: 'available' | 'in_use' | 'maintenance';
}

export interface Driver {
  id: string;
  name: string;
  licenseNumber: string;
  phoneNumber: string;
  status: 'available' | 'on_duty' | 'off_duty';
}

export interface BackupLink {
  id: string;
  url: string;
  description: string;
  createdAt: string;
}

export interface FinalSubmission {
  id: string;
  projectId: string;
  leaderId: string;
  description: string;
  images: string[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
} 