import { Project, PaymentRequest, ProgressUpdate, Vehicle, Driver, User, BackupLink, FinalSubmission } from '../../src/lib/types';

export class StorageService {
  private static instance: StorageService;
  private storage: { [key: string]: any } = {};

  private constructor() {
    // Initialize storage with default values
    this.storage = {
      projects: [],
      paymentRequests: [],
      progressUpdates: [],
      vehicles: [],
      drivers: [],
      users: [],
      backupLinks: [],
      finalSubmissions: []
    };
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  // Generic methods for all data types
  private async getData<T>(key: string): Promise<T[]> {
    return this.storage[key] || [];
  }

  private async setData<T>(key: string, data: T[]): Promise<void> {
    this.storage[key] = data;
  }

  private async addData<T>(key: string, item: T): Promise<T> {
    const data = await this.getData<T>(key);
    data.push(item);
    await this.setData(key, data);
    return item;
  }

  private async updateData<T>(key: string, id: string, update: Partial<T>): Promise<void> {
    const data = await this.getData<T>(key);
    const index = data.findIndex((item: any) => item.id === id);
    if (index !== -1) {
      data[index] = { ...data[index], ...update };
      await this.setData(key, data);
    }
  }

  private async deleteData<T>(key: string, id: string): Promise<void> {
    const data = await this.getData<T>(key);
    const filteredData = data.filter((item: any) => item.id !== id);
    await this.setData(key, filteredData);
  }

  // Projects
  async getProjects(): Promise<Project[]> {
    return this.getData<Project>('projects');
  }

  async getProjectById(id: string): Promise<Project | undefined> {
    const projects = await this.getProjects();
    return projects.find(project => project.id === id);
  }

  async getProjectsByLeaderId(leaderId: string): Promise<Project[]> {
    const projects = await this.getProjects();
    return projects.filter(project => project.leaderId === leaderId);
  }

  async saveProject(project: Omit<Project, 'id' | 'createdAt'>): Promise<Project> {
    const newProject: Project = {
      ...project,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    return this.addData<Project>('projects', newProject);
  }

  async updateProject(project: Project): Promise<void> {
    await this.updateData<Project>('projects', project.id, project);
  }

  // Payment Requests
  async getPaymentRequests(): Promise<PaymentRequest[]> {
    return this.getData<PaymentRequest>('paymentRequests');
  }

  async getPaymentRequestsByProjectId(projectId: string): Promise<PaymentRequest[]> {
    const requests = await this.getPaymentRequests();
    return requests.filter(request => request.projectId === projectId);
  }

  async savePaymentRequest(paymentRequest: Omit<PaymentRequest, 'id' | 'createdAt'>): Promise<PaymentRequest> {
    const newRequest: PaymentRequest = {
      ...paymentRequest,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    return this.addData<PaymentRequest>('paymentRequests', newRequest);
  }

  async updatePaymentRequest(paymentRequest: PaymentRequest): Promise<void> {
    await this.updateData<PaymentRequest>('paymentRequests', paymentRequest.id, paymentRequest);
  }

  // Progress Updates
  async getProgressUpdates(): Promise<ProgressUpdate[]> {
    return this.getData<ProgressUpdate>('progressUpdates');
  }

  async getProgressUpdatesByProjectId(projectId: string): Promise<ProgressUpdate[]> {
    const updates = await this.getProgressUpdates();
    return updates.filter(update => update.projectId === projectId);
  }

  async addProgressUpdate(update: ProgressUpdate): Promise<void> {
    await this.addData<ProgressUpdate>('progressUpdates', update);
  }

  // Users
  async getUsers(): Promise<User[]> {
    return this.getData<User>('users');
  }

  async getUserById(id: string): Promise<User | undefined> {
    const users = await this.getUsers();
    return users.find(user => user.id === id);
  }

  async createUser(user: Omit<User, 'id'>): Promise<User> {
    const newUser: User = {
      ...user,
      id: crypto.randomUUID(),
    };
    return this.addData<User>('users', newUser);
  }

  async updateUser(user: User): Promise<void> {
    await this.updateData<User>('users', user.id, user);
  }

  async getUsersByRole(role: string): Promise<User[]> {
    const users = await this.getUsers();
    return users.filter(user => user.role === role);
  }

  // Vehicles
  async getAllVehicles(): Promise<Vehicle[]> {
    return this.getData<Vehicle>('vehicles');
  }

  async createVehicle(vehicle: Omit<Vehicle, 'id'>): Promise<Vehicle> {
    const newVehicle: Vehicle = {
      ...vehicle,
      id: crypto.randomUUID(),
    };
    return this.addData<Vehicle>('vehicles', newVehicle);
  }

  async updateVehicle(vehicle: Vehicle): Promise<void> {
    await this.updateData<Vehicle>('vehicles', vehicle.id, vehicle);
  }

  async deleteVehicle(id: string): Promise<void> {
    await this.deleteData<Vehicle>('vehicles', id);
  }

  // Drivers
  async getAllDrivers(): Promise<Driver[]> {
    return this.getData<Driver>('drivers');
  }

  async createDriver(driver: Omit<Driver, 'id'>): Promise<Driver> {
    const newDriver: Driver = {
      ...driver,
      id: crypto.randomUUID(),
    };
    return this.addData<Driver>('drivers', newDriver);
  }

  async updateDriver(driver: Driver): Promise<void> {
    await this.updateData<Driver>('drivers', driver.id, driver);
  }

  async deleteDriver(id: string): Promise<void> {
    await this.deleteData<Driver>('drivers', id);
  }

  // Backup Links
  async getAllBackupLinks(): Promise<BackupLink[]> {
    return this.getData<BackupLink>('backupLinks');
  }

  async createBackupLink(link: Omit<BackupLink, 'id' | 'createdAt'>): Promise<BackupLink> {
    const newLink: BackupLink = {
      ...link,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    return this.addData<BackupLink>('backupLinks', newLink);
  }

  async deleteBackupLink(id: string): Promise<void> {
    await this.deleteData<BackupLink>('backupLinks', id);
  }

  // Final Submissions
  async getFinalSubmissions(): Promise<FinalSubmission[]> {
    return this.getData<FinalSubmission>('finalSubmissions');
  }

  async saveFinalSubmission(submission: Omit<FinalSubmission, 'id' | 'createdAt' | 'updatedAt'>): Promise<FinalSubmission> {
    const newSubmission: FinalSubmission = {
      ...submission,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return this.addData<FinalSubmission>('finalSubmissions', newSubmission);
  }

  async getFinalSubmissionsByLeader(leaderId: string): Promise<FinalSubmission[]> {
    const submissions = await this.getFinalSubmissions();
    return submissions.filter(submission => submission.leaderId === leaderId);
  }

  async getFinalSubmissionsByProject(projectId: string): Promise<FinalSubmission[]> {
    const submissions = await this.getFinalSubmissions();
    return submissions.filter(submission => submission.projectId === projectId);
  }
} 