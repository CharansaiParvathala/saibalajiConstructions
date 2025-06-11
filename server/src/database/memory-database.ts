import { Database } from './types';
import { Project, PaymentRequest, ProgressUpdate, Vehicle, Driver, User, BackupLink, FinalSubmission } from '../../src/lib/types';
import { StorageService } from '../services/storage-service';

export class MemoryDatabase implements Database {
  private storage: StorageService;

  constructor() {
    this.storage = StorageService.getInstance();
  }

  // Projects
  async getProjects(): Promise<Project[]> {
    return this.storage.getProjects();
  }

  async getProjectById(id: string): Promise<Project | undefined> {
    return this.storage.getProjectById(id);
  }

  async getProjectsByLeaderId(leaderId: string): Promise<Project[]> {
    return this.storage.getProjectsByLeaderId(leaderId);
  }

  async saveProject(project: Omit<Project, 'id' | 'createdAt'>): Promise<Project> {
    return this.storage.saveProject(project);
  }

  async updateProject(project: Project): Promise<void> {
    await this.storage.updateProject(project);
  }

  // Payment Requests
  async getPaymentRequests(): Promise<PaymentRequest[]> {
    return this.storage.getPaymentRequests();
  }

  async getPaymentRequestsByProjectId(projectId: string): Promise<PaymentRequest[]> {
    return this.storage.getPaymentRequestsByProjectId(projectId);
  }

  async savePaymentRequest(paymentRequest: Omit<PaymentRequest, 'id' | 'createdAt'>): Promise<PaymentRequest> {
    return this.storage.savePaymentRequest(paymentRequest);
  }

  async updatePaymentRequest(paymentRequest: PaymentRequest): Promise<void> {
    await this.storage.updatePaymentRequest(paymentRequest);
  }

  // Progress Updates
  async getProgressUpdates(): Promise<ProgressUpdate[]> {
    return this.storage.getProgressUpdates();
  }

  async getProgressUpdatesByProjectId(projectId: string): Promise<ProgressUpdate[]> {
    return this.storage.getProgressUpdatesByProjectId(projectId);
  }

  async addProgressUpdate(update: ProgressUpdate): Promise<void> {
    await this.storage.addProgressUpdate(update);
  }

  // Users
  async getUsers(): Promise<User[]> {
    return this.storage.getUsers();
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.storage.getUserById(id);
  }

  async createUser(user: Omit<User, 'id'>): Promise<User> {
    return this.storage.createUser(user);
  }

  async updateUser(user: User): Promise<void> {
    await this.storage.updateUser(user);
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return this.storage.getUsersByRole(role);
  }

  // Vehicles
  async getAllVehicles(): Promise<Vehicle[]> {
    return this.storage.getAllVehicles();
  }

  async createVehicle(vehicle: Omit<Vehicle, 'id'>): Promise<Vehicle> {
    return this.storage.createVehicle(vehicle);
  }

  async updateVehicle(vehicle: Vehicle): Promise<void> {
    await this.storage.updateVehicle(vehicle);
  }

  async deleteVehicle(id: string): Promise<void> {
    await this.storage.deleteVehicle(id);
  }

  // Drivers
  async getAllDrivers(): Promise<Driver[]> {
    return this.storage.getAllDrivers();
  }

  async createDriver(driver: Omit<Driver, 'id'>): Promise<Driver> {
    return this.storage.createDriver(driver);
  }

  async updateDriver(driver: Driver): Promise<void> {
    await this.storage.updateDriver(driver);
  }

  async deleteDriver(id: string): Promise<void> {
    await this.storage.deleteDriver(id);
  }

  // Backup Links
  async getAllBackupLinks(): Promise<BackupLink[]> {
    return this.storage.getAllBackupLinks();
  }

  async createBackupLink(link: Omit<BackupLink, 'id' | 'createdAt'>): Promise<BackupLink> {
    return this.storage.createBackupLink(link);
  }

  async deleteBackupLink(id: string): Promise<void> {
    await this.storage.deleteBackupLink(id);
  }

  // Final Submissions
  async getFinalSubmissions(): Promise<FinalSubmission[]> {
    return this.storage.getFinalSubmissions();
  }

  async saveFinalSubmission(submission: Omit<FinalSubmission, 'id' | 'createdAt' | 'updatedAt'>): Promise<FinalSubmission> {
    return this.storage.saveFinalSubmission(submission);
  }

  async getFinalSubmissionsByLeader(leaderId: string): Promise<FinalSubmission[]> {
    return this.storage.getFinalSubmissionsByLeader(leaderId);
  }

  async getFinalSubmissionsByProject(projectId: string): Promise<FinalSubmission[]> {
    return this.storage.getFinalSubmissionsByProject(projectId);
  }
} 