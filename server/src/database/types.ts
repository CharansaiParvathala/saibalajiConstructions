import { Project, PaymentRequest, ProgressUpdate, Vehicle, Driver, User, BackupLink, FinalSubmission } from '../../src/lib/types';

export interface Database {
  // Projects
  getProjects(): Promise<Project[]>;
  getProjectById(id: string): Promise<Project | undefined>;
  getProjectsByLeaderId(leaderId: string): Promise<Project[]>;
  saveProject(project: Omit<Project, 'id' | 'createdAt'>): Promise<Project>;
  updateProject(project: Project): Promise<void>;

  // Payment Requests
  getPaymentRequests(): Promise<PaymentRequest[]>;
  getPaymentRequestsByProjectId(projectId: string): Promise<PaymentRequest[]>;
  savePaymentRequest(paymentRequest: Omit<PaymentRequest, 'id' | 'createdAt'>): Promise<PaymentRequest>;
  updatePaymentRequest(paymentRequest: PaymentRequest): Promise<void>;

  // Progress Updates
  getProgressUpdates(): Promise<ProgressUpdate[]>;
  getProgressUpdatesByProjectId(projectId: string): Promise<ProgressUpdate[]>;
  addProgressUpdate(update: ProgressUpdate): Promise<void>;
  getProgressUpdateById(id: string): Promise<ProgressUpdate | undefined>;

  // Vehicles
  getAllVehicles(): Promise<Vehicle[]>;
  createVehicle(vehicle: Omit<Vehicle, 'id'>): Promise<Vehicle>;
  updateVehicle(vehicle: Vehicle): Promise<void>;
  deleteVehicle(id: string): Promise<void>;
  getVehicleById(id: string): Promise<Vehicle | undefined>;

  // Drivers
  getAllDrivers(): Promise<Driver[]>;
  createDriver(driver: Omit<Driver, 'id'>): Promise<Driver>;
  updateDriver(driver: Driver): Promise<void>;
  deleteDriver(id: string): Promise<void>;

  // Users
  getUsers(): Promise<User[]>;
  getUserById(id: string): Promise<User | undefined>;
  createUser(user: Omit<User, 'id'>): Promise<User>;
  updateUser(user: User): Promise<void>;
  deleteUser(id: string): Promise<void>;
  getUsersByRole(role: string): Promise<User[]>;

  // Backup Links
  getAllBackupLinks(): Promise<BackupLink[]>;
  createBackupLink(link: Omit<BackupLink, 'id' | 'createdAt'>): Promise<BackupLink>;
  deleteBackupLink(id: string): Promise<void>;

  // Final Submissions
  getFinalSubmissions(): Promise<FinalSubmission[]>;
  saveFinalSubmission(submission: Omit<FinalSubmission, 'id' | 'createdAt' | 'updatedAt'>): Promise<FinalSubmission>;
  getFinalSubmissionsByLeader(leaderId: string): Promise<FinalSubmission[]>;
  getFinalSubmissionsByProject(projectId: string): Promise<FinalSubmission[]>;
} 