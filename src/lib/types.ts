export type UserRole = "leader" | "checker" | "owner" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface Project {
  id: string;
  name: string;
  leaderId: string;
  createdAt: string;
  workers: number;
  totalWork: number; // in meters
  completedWork: number; // in meters
  status?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  completionPercentage?: number;
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
  licenseNumber: string;
  licenseType: string;
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
  projectId: string;
  date: string;
  completedWork: number; // in meters
  timeTaken: number; // in hours
  photos: PhotoWithMetadata[];
  notes?: string;
  vehicleId?: string;
  startMeterReading?: PhotoWithMetadata;
  endMeterReading?: PhotoWithMetadata;
  documents?: DocumentFile[];
  location?: Location; // Location property is now properly defined
}

export interface PaymentRequest {
  id: string;
  projectId: string;
  progressUpdateId?: string;
  date: string;
  purposes: PaymentPurpose[];
  status: "pending" | "approved" | "rejected" | "scheduled" | "paid";
  checkerNotes?: string;
  scheduledDate?: string;
  totalAmount: number;
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
  id: string;
  url: string;
  description: string;
  createdAt: string;
  createdBy: string;
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
