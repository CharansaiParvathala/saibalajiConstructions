export enum UserRole {
  ADMIN = 'admin',
  LEADER = 'leader',
  USER = 'user'
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  mobileNumber?: string;
}

export interface Project {
  id: number;
  title: string;
  description: string;
  leader_id: number;
  status: 'active' | 'completed' | 'on_hold' | 'scheduled' | 'cancelled';
  start_date?: string;
  end_date?: string;
  total_work: number;
  completed_work: number;
  created_at?: string;
  updated_at?: string;
}

export interface Vehicle {
  id: string;
  model: string;
  registrationNumber: string;
  pollutionCertExpiry: string;
  fitnessCertExpiry: string;
  additionalDetails: string;
}

export interface Driver {
  id: string;
  name: string;
  mobileNumber: string;
  licenseNumber: string;
  licenseType: string;
  licenseImageUrl?: string;
  licenseImageName?: string;
  licenseImageMime?: string;
  experience: number;
  experienceYears?: number; // For backward compatibility
  isExternal: boolean;
  contactNumber?: string;
  address?: string;
}

export interface Location {
  latitude: number;
  longitude: number;
}

export interface PhotoWithMetadata {
  dataUrl: string;
  timestamp: string;
  location: Location;
}

export interface DocumentFile {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  timestamp: string;
}

export interface ProgressUpdate {
  id: string;
  project_id: number;
  user_id: number;
  completed_work: number;
  description: string;
  completion_percentage: number;
  status: 'pending' | 'completed';
  created_at: string;
  image_proof?: string; // base64 encoded image
  image_ids?: number[]; // array of image IDs for database retrieval
  start_meter_image_id?: number | null;
  end_meter_image_id?: number | null;
  vehicle?: {
    id: number;
    model: string;
    type: string;
  } | null;
  driver?: {
    id: number;
    name: string;
    mobile_number: string;
    license_number: string;
    license_type: string;
  } | null;
  driver_external?: {
    name: string;
    license_type: string;
  } | null;
}

export interface PaymentRequest {
  id: string;
  projectId: string;
  progressUpdateId?: string;
  date: string;
  totalAmount: number; // Calculated total from expenses
  status: "pending" | "approved" | "rejected" | "scheduled" | "paid";
  checkerNotes?: string;
  scheduledDate?: string;
  expenses: PaymentExpense[]; // Array of individual expenses
  image_ids?: number[]; // array of image IDs for database retrieval
}

export interface PaymentExpense {
  id?: number;
  type: "food" | "fuel" | "labour" | "vehicle" | "water" | "other";
  amount: number;
  remarks?: string;
  images?: number[]; // Array of image indices for this expense
}

export interface PaymentPurpose {
  type: "food" | "fuel" | "labour" | "vehicle" | "water" | "other";
  amount: number;
  images: PhotoWithMetadata[];
  remarks?: string; // Properly define remarks as optional property
}

export interface CorrectionRequest {
  id: string;
  progressUpdateId: string;
  message: string;
  type: "text" | "voice";
  dataUrl?: string; // For voice message
  timestamp: string;
  status: "pending" | "approved" | "rejected";
  checkerNotes?: string;
}

export interface BackupLink {
  id: number;
  url: string;
  description: string;
  createdAt: string;
  createdBy: number;
  createdByName?: string;
}

// Enhanced interfaces for tracking progress
export interface LeaderProgressStats {
  leaderId: string;
  leaderName: string;
  projectCount: number;
  totalDistance: number; // Total distance covered
  totalTime: number; // Total time spent
  completionPercentage: number; // Overall completion percentage
  recentUpdates: ProgressUpdate[];
}

export interface FinalSubmission {
  id: string;
  projectId: string;
  leaderId: string;
  submissionDate: string;
  timerDuration: number;
  timerStartedAt: string;
  timerEndedAt?: string;
  status: 'in_progress' | 'completed' | 'expired';
  images: PhotoWithMetadata[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
