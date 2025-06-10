import { v4 as uuidv4 } from 'uuid';
import { Database } from './types';
import { Project, PaymentRequest, ProgressUpdate, Vehicle, Driver, User, BackupLink, FinalSubmission } from '../../src/lib/types';

export class MemoryDatabase implements Database {
  private projects: Project[] = [];
  private paymentRequests: PaymentRequest[] = [];
  private progressUpdates: ProgressUpdate[] = [];
  private vehicles: Vehicle[] = [];
  private drivers: Driver[] = [];
  private users: User[] = [];
  private backupLinks: BackupLink[] = [];
  private finalSubmissions: FinalSubmission[] = [];

  // Projects
  async getProjects(): Promise<Project[]> {
    return this.projects;
  }

  async getProjectById(id: string): Promise<Project | undefined> {
    return this.projects.find(project => project.id === id);
  }

  async getProjectsByLeaderId(leaderId: string): Promise<Project[]> {
    return this.projects.filter(project => project.leaderId === leaderId);
  }

  async saveProject(project: Omit<Project, 'id' | 'createdAt'>): Promise<Project> {
    const newProject: Project = {
      ...project,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    this.projects.push(newProject);
    return newProject;
  }

  async updateProject(project: Project): Promise<void> {
    const index = this.projects.findIndex(p => p.id === project.id);
    if (index !== -1) {
      this.projects[index] = project;
    }
  }

  // Payment Requests
  async getPaymentRequests(): Promise<PaymentRequest[]> {
    return this.paymentRequests;
  }

  async getPaymentRequestsByProjectId(projectId: string): Promise<PaymentRequest[]> {
    return this.paymentRequests.filter(request => request.projectId === projectId);
  }

  async savePaymentRequest(paymentRequest: Omit<PaymentRequest, 'id' | 'createdAt'>): Promise<PaymentRequest> {
    const newPaymentRequest: PaymentRequest = {
      ...paymentRequest,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    this.paymentRequests.push(newPaymentRequest);
    return newPaymentRequest;
  }

  async updatePaymentRequest(paymentRequest: PaymentRequest): Promise<void> {
    const index = this.paymentRequests.findIndex(p => p.id === paymentRequest.id);
    if (index !== -1) {
      this.paymentRequests[index] = paymentRequest;
    }
  }

  // Progress Updates
  async getProgressUpdates(): Promise<ProgressUpdate[]> {
    return this.progressUpdates;
  }

  async getProgressUpdatesByProjectId(projectId: string): Promise<ProgressUpdate[]> {
    return this.progressUpdates.filter(update => update.projectId === projectId);
  }

  async addProgressUpdate(update: ProgressUpdate): Promise<void> {
    this.progressUpdates.push(update);
  }

  async getProgressUpdateById(id: string): Promise<ProgressUpdate | undefined> {
    return this.progressUpdates.find(update => update.id === id);
  }

  // Vehicles
  async getAllVehicles(): Promise<Vehicle[]> {
    return this.vehicles;
  }

  async createVehicle(vehicle: Omit<Vehicle, 'id'>): Promise<Vehicle> {
    const newVehicle: Vehicle = {
      ...vehicle,
      id: uuidv4(),
    };
    this.vehicles.push(newVehicle);
    return newVehicle;
  }

  async updateVehicle(vehicle: Vehicle): Promise<void> {
    const index = this.vehicles.findIndex(v => v.id === vehicle.id);
    if (index !== -1) {
      this.vehicles[index] = vehicle;
    }
  }

  async deleteVehicle(id: string): Promise<void> {
    this.vehicles = this.vehicles.filter(v => v.id !== id);
  }

  async getVehicleById(id: string): Promise<Vehicle | undefined> {
    return this.vehicles.find(vehicle => vehicle.id === id);
  }

  // Drivers
  async getAllDrivers(): Promise<Driver[]> {
    return this.drivers;
  }

  async createDriver(driver: Omit<Driver, 'id'>): Promise<Driver> {
    const newDriver: Driver = {
      ...driver,
      id: uuidv4(),
    };
    this.drivers.push(newDriver);
    return newDriver;
  }

  async updateDriver(driver: Driver): Promise<void> {
    const index = this.drivers.findIndex(d => d.id === driver.id);
    if (index !== -1) {
      this.drivers[index] = driver;
    }
  }

  async deleteDriver(id: string): Promise<void> {
    this.drivers = this.drivers.filter(d => d.id !== id);
  }

  // Users
  async getUsers(): Promise<User[]> {
    return this.users;
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.users.find(user => user.id === id);
  }

  async createUser(user: Omit<User, 'id'>): Promise<User> {
    const newUser: User = {
      ...user,
      id: uuidv4(),
    };
    this.users.push(newUser);
    return newUser;
  }

  async updateUser(user: User): Promise<void> {
    const index = this.users.findIndex(u => u.id === user.id);
    if (index !== -1) {
      this.users[index] = user;
    }
  }

  async deleteUser(id: string): Promise<void> {
    this.users = this.users.filter(u => u.id !== id);
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return this.users.filter(user => user.role === role);
  }

  // Backup Links
  async getAllBackupLinks(): Promise<BackupLink[]> {
    return this.backupLinks;
  }

  async createBackupLink(link: Omit<BackupLink, 'id' | 'createdAt'>): Promise<BackupLink> {
    const newLink: BackupLink = {
      ...link,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    this.backupLinks.push(newLink);
    return newLink;
  }

  async deleteBackupLink(id: string): Promise<void> {
    this.backupLinks = this.backupLinks.filter(link => link.id !== id);
  }

  // Final Submissions
  async getFinalSubmissions(): Promise<FinalSubmission[]> {
    return this.finalSubmissions;
  }

  async saveFinalSubmission(submission: Omit<FinalSubmission, 'id' | 'createdAt' | 'updatedAt'>): Promise<FinalSubmission> {
    const newSubmission: FinalSubmission = {
      ...submission,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.finalSubmissions.push(newSubmission);
    return newSubmission;
  }

  async getFinalSubmissionsByLeader(leaderId: string): Promise<FinalSubmission[]> {
    return this.finalSubmissions.filter(submission => submission.leaderId === leaderId);
  }

  async getFinalSubmissionsByProject(projectId: string): Promise<FinalSubmission[]> {
    return this.finalSubmissions.filter(submission => submission.projectId === projectId);
  }
} 