// Define local types instead of importing from client
interface Project {
  id: string;
  name: string;
  description: string;
  leader_id: string;
  total_work: number;
  completed_work: number;
  status: string;
  created_at: string;
}

interface PaymentRequest {
  id: string;
  project_id: string;
  description: string;
  amount: number;
  status: string;
  created_at: string;
}

interface ProgressUpdate {
  id: string;
  project_id: string;
  description: string;
  completed_work: number;
  created_at: string;
}

interface Vehicle {
  id: string;
  type: string;
  model: string;
  created_at: string;
}

interface Driver {
  id: string;
  name: string;
  mobile_number: string;
  license_number: string;
  license_type: string;
  created_at: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  mobile_number: string;
  created_at: string;
}

interface BackupLink {
  id: string;
  url: string;
  description: string;
  created_at: string;
}

interface FinalSubmission {
  id: string;
  project_id: string;
  leader_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export class StorageService {
  private static instance: StorageService;
  private storage: { [key: string]: any } = {};

  private constructor() {
    // Initialize storage with default values
    this.storage = {
      projects: [
        {
          id: '1',
          name: 'Sample Project 1',
          description: 'A sample project for testing',
          leader_id: '1',
          total_work: 100,
          completed_work: 0,
          status: 'pending',
          created_at: new Date().toISOString()
        }
      ],
      paymentRequests: [],
      progressUpdates: [],
      vehicles: [],
      drivers: [],
      users: [
        {
          id: '1',
          name: 'Admin User',
          email: 'admin@example.com',
          password: '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', // hashed 'admin123'
          role: 'admin',
          mobile_number: '1234567890',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Leader User',
          email: 'leader@example.com',
          password: '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', // hashed 'leader123'
          role: 'leader',
          mobile_number: '2345678901',
          created_at: new Date().toISOString()
        },
        {
          id: '3',
          name: 'Owner User',
          email: 'owner@example.com',
          password: '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', // hashed 'owner123'
          role: 'owner',
          mobile_number: '3456789012',
          created_at: new Date().toISOString()
        },
        {
          id: '4',
          name: 'Checker User',
          email: 'checker@example.com',
          password: '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', // hashed 'checker123'
          role: 'checker',
          mobile_number: '4567890123',
          created_at: new Date().toISOString()
        }
      ],
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
    return projects.filter(project => project.leader_id === leaderId);
  }

  async saveProject(project: Omit<Project, 'id' | 'created_at'>): Promise<Project> {
    const newProject: Project = {
      ...project,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
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
    return requests.filter(request => request.project_id === projectId);
  }

  async savePaymentRequest(paymentRequest: Omit<PaymentRequest, 'id' | 'created_at'>): Promise<PaymentRequest> {
    const newRequest: PaymentRequest = {
      ...paymentRequest,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
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
    return updates.filter(update => update.project_id === projectId);
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

  async getVehicleById(id: string): Promise<Vehicle | undefined> {
    const vehicles = await this.getAllVehicles();
    return vehicles.find(vehicle => vehicle.id === id);
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

  async getDriverById(id: string): Promise<Driver | undefined> {
    const drivers = await this.getAllDrivers();
    return drivers.find(driver => driver.id === id);
  }

  // Backup Links
  async getAllBackupLinks(): Promise<BackupLink[]> {
    return this.getData<BackupLink>('backupLinks');
  }

  async createBackupLink(link: Omit<BackupLink, 'id' | 'created_at'>): Promise<BackupLink> {
    const newLink: BackupLink = {
      ...link,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    return this.addData<BackupLink>('backupLinks', newLink);
  }

  async updateBackupLink(link: BackupLink): Promise<void> {
    await this.updateData<BackupLink>('backupLinks', link.id, link);
  }

  async deleteBackupLink(id: string): Promise<void> {
    await this.deleteData<BackupLink>('backupLinks', id);
  }

  // Final Submissions
  async getFinalSubmissions(): Promise<FinalSubmission[]> {
    return this.getData<FinalSubmission>('finalSubmissions');
  }

  async saveFinalSubmission(submission: Omit<FinalSubmission, 'id' | 'created_at' | 'updated_at'>): Promise<FinalSubmission> {
    const newSubmission: FinalSubmission = {
      ...submission,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return this.addData<FinalSubmission>('finalSubmissions', newSubmission);
  }

  async getFinalSubmissionsByLeader(leaderId: string): Promise<FinalSubmission[]> {
    const submissions = await this.getFinalSubmissions();
    return submissions.filter(submission => submission.leader_id === leaderId);
  }

  async getFinalSubmissionsByProject(projectId: string): Promise<FinalSubmission[]> {
    const submissions = await this.getFinalSubmissions();
    return submissions.filter(submission => submission.project_id === projectId);
  }
} 