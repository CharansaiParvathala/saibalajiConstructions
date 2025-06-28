import { v4 as uuidv4 } from 'uuid';
import { Project, PaymentRequest, ProgressUpdate, Vehicle, Driver, User, BackupLink, FinalSubmission } from './types';

// Add IndexedDB setup at the top of the file
const DB_NAME = 'progress-tracker-db';
const DB_VERSION = 1;
const IMAGE_STORE = 'images';

// Initialize IndexedDB
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(IMAGE_STORE)) {
        db.createObjectStore(IMAGE_STORE, { keyPath: 'id' });
      }
    };
  });
};

// Store image in IndexedDB
const storeImage = async (id: string, dataUrl: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(IMAGE_STORE, 'readwrite');
    const store = transaction.objectStore(IMAGE_STORE);
    const request = store.put({ id, dataUrl });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Get image from IndexedDB
const getImage = async (id: string): Promise<string | null> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(IMAGE_STORE, 'readonly');
    const store = transaction.objectStore(IMAGE_STORE);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result?.dataUrl || null);
    request.onerror = () => reject(request.error);
  });
};

// Projects Storage
export const getProjects = (): Project[] => {
  const projects = localStorage.getItem('projects');
  return projects ? JSON.parse(projects) : [];
};

export const getProjectById = (id: string): Project | undefined => {
    const projects = getProjects();
    return projects.find(project => project.id === id);
};

export const getProjectsByLeaderId = (leaderId: string): Project[] => {
  const projects = getProjects();
  return projects.filter(project => project.leaderId === leaderId);
};

export const saveProject = (project: Omit<Project, 'id' | 'createdAt'>): Project => {
  const projects = getProjects();
  const newProject: Project = {
    ...project,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
  };
  projects.push(newProject);
  localStorage.setItem('projects', JSON.stringify(projects));
  return newProject;
};

export const updateProject = (updatedProject: Project): void => {
    const projects = getProjects();
    const updatedProjects = projects.map(project =>
        project.id === updatedProject.id ? updatedProject : project
    );
    localStorage.setItem('projects', JSON.stringify(updatedProjects));
};

// Payment Requests Storage
export const getPaymentRequests = (): PaymentRequest[] => {
  const paymentRequests = localStorage.getItem('paymentRequests');
  return paymentRequests ? JSON.parse(paymentRequests) : [];
};

export const getPaymentRequestsByProjectId = (projectId: string): PaymentRequest[] => {
  const paymentRequests = getPaymentRequests();
  return paymentRequests.filter(request => request.projectId === projectId);
};

export const savePaymentRequest = (paymentRequest: Omit<PaymentRequest, 'id' | 'createdAt'>): PaymentRequest => {
  const paymentRequests = getPaymentRequests();
  const newPaymentRequest: PaymentRequest = {
    ...paymentRequest,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
  };
  paymentRequests.push(newPaymentRequest);
  localStorage.setItem('paymentRequests', JSON.stringify(paymentRequests));
  return newPaymentRequest;
};

// Progress Updates Storage
export const getProgressUpdates = async (): Promise<ProgressUpdate[]> => {
  const updates = JSON.parse(localStorage.getItem('progressUpdates') || '[]');
  
  // Load images from IndexedDB
  const updatesWithImages = await Promise.all(
    updates.map(async (update: ProgressUpdate) => {
      const photosWithImages = await Promise.all(
        update.photos.map(async (photo) => {
          const dataUrl = await getImage(photo.id);
          return {
            ...photo,
            dataUrl
          };
        })
      );
      return {
        ...update,
        photos: photosWithImages
      };
    })
  );

  return updatesWithImages;
};

export const getProgressUpdatesByProjectId = async (projectId: string): Promise<ProgressUpdate[]> => {
  const updates = await getProgressUpdates();
  return updates.filter(update => update.projectId === projectId);
};

// Add these utility functions at the top of the file
const compressImage = async (dataUrl: string, maxWidth = 600, quality = 0.5): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions
      if (width > maxWidth) {
        height = (maxWidth * height) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Apply additional compression by reducing quality
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
};

const cleanupOldProgressUpdates = async (projectId: string, maxUpdates = 5) => {
  try {
    const updates = await getProgressUpdatesByProjectId(projectId);
    if (updates.length > maxUpdates) {
      // Sort by timestamp, newest first
      const sortedUpdates = [...updates].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      // Keep only the most recent updates
      const updatesToKeep = sortedUpdates.slice(0, maxUpdates);
      
      // Get all updates
      const allUpdates = await getProgressUpdates();
      
      // Filter updates
      const filteredUpdates = allUpdates.filter(update => 
        update.projectId === projectId ? 
          updatesToKeep.some(kept => kept.id === update.id) : 
          true
      );
      
      // Save filtered updates to localStorage
      localStorage.setItem('progressUpdates', JSON.stringify(filteredUpdates));
      
      // Clean up old images from IndexedDB
      const db = await initDB();
      const transaction = db.transaction(IMAGE_STORE, 'readwrite');
      const store = transaction.objectStore(IMAGE_STORE);
      
      // Get all image IDs to keep
      const imageIdsToKeep = new Set(
        updatesToKeep.flatMap(update => 
          update.photos.map(photo => photo.id)
        )
      );
      
      // Delete old images
      const request = store.openCursor();
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          if (!imageIdsToKeep.has(cursor.key as string)) {
            cursor.delete();
          }
          cursor.continue();
        }
      };
    }
  } catch (error) {
    console.error('Error cleaning up old progress updates:', error);
  }
};

// Modify the addProgressUpdate function to use IndexedDB for images
export const addProgressUpdate = async (update: ProgressUpdate): Promise<void> => {
  try {
    // First, try to clean up old updates
    cleanupOldProgressUpdates(update.projectId);

    // Process and store images in IndexedDB
    const processedPhotos = await Promise.all(
      update.photos.map(async (photo, index) => {
        const compressedDataUrl = await compressImage(photo.dataUrl);
        const imageId = `${update.id}_photo_${index}`;
        await storeImage(imageId, compressedDataUrl);
        return {
          ...photo,
          id: imageId,
          dataUrl: null // Remove dataUrl from localStorage
        };
      })
    );

    const updateWithProcessedPhotos = {
      ...update,
      photos: processedPhotos
    };

    // Get existing updates
    const existingUpdates = JSON.parse(localStorage.getItem('progressUpdates') || '[]');
    
    // Add new update
    existingUpdates.push(updateWithProcessedPhotos);
    
    // Save to localStorage (now only contains metadata and image IDs)
    localStorage.setItem('progressUpdates', JSON.stringify(existingUpdates));
  } catch (error) {
    console.error('Error adding progress update:', error);
    throw error;
  }
};

// Vehicles Storage
export const getAllVehicles = (): Vehicle[] => {
  const vehicles = localStorage.getItem('vehicles');
  return vehicles ? JSON.parse(vehicles) : [];
};

// Drivers Storage
export const getAllDrivers = (): Driver[] => {
  const drivers = localStorage.getItem('drivers');
  return drivers ? JSON.parse(drivers) : [];
};

// Generate Export Data
export const generateExportData = () => {
  const projects = getProjects();
  const paymentRequests = getPaymentRequests();
  const progressUpdates = getProgressUpdates();

  return {
    projects,
    paymentRequests,
    progressUpdates,
  };
};

// Updated getAllProjects to return all projects regardless of user role
export const getAllProjects = (): Project[] => {
  const projects = localStorage.getItem('projects');
  return projects ? JSON.parse(projects) : [];
};

// Updated getAllPaymentRequests to return all payment requests regardless of user role
export const getAllPaymentRequests = (): PaymentRequest[] => {
  const paymentRequests = localStorage.getItem('paymentRequests');
  return paymentRequests ? JSON.parse(paymentRequests) : [];
};

// Updated getAllProgressUpdates to return all progress updates regardless of user role
export const getAllProgressUpdates = (): ProgressUpdate[] => {
  const progressUpdates = localStorage.getItem('progressUpdates');
  return progressUpdates ? JSON.parse(progressUpdates) : [];
};

// Add helper functions for cross-dashboard visibility
export const getProjectsForDashboard = (userRole: string): Project[] => {
  // All roles can see all projects
  return getAllProjects();
};

export const getPaymentRequestsForDashboard = (userRole: string): PaymentRequest[] => {
  // All roles can see all payment requests
  return getAllPaymentRequests();
};

export const getProgressUpdatesForDashboard = (): ProgressUpdate[] => {
  // All roles can see all progress updates
  return getAllProgressUpdates();
};

// User Storage
export const getUsers = (): User[] => {
  const users = localStorage.getItem('users');
  return users ? JSON.parse(users) : [];
};

export const getAllUsers = (): User[] => {
  return getUsers();
};

export const getUserById = (id: number): User | undefined => {
  const users = getUsers();
  return users.find(user => user.id === id.toString());
};

export const createUser = (user: Omit<User, 'id'>): User => {
  const users = getUsers();
  const newUser: User = {
    ...user,
    id: uuidv4(),
  };
  users.push(newUser);
  localStorage.setItem('users', JSON.stringify(users));
  return newUser;
};

export const updateUser = (updatedUser: User): void => {
  const users = getUsers();
  const updatedUsers = users.map(user =>
    user.id === updatedUser.id ? updatedUser : user
  );
  localStorage.setItem('users', JSON.stringify(updatedUsers));
};

export const deleteUser = (id: string): void => {
  const users = getUsers();
  const updatedUsers = users.filter(user => user.id !== id);
  localStorage.setItem('users', JSON.stringify(updatedUsers));
};

export const getUsersByRole = (role: string): User[] => {
  const users = getUsers();
  return users.filter(user => user.role === role);
};

// Authentication Storage
export const getCurrentUser = (): User | null => {
  const currentUser = localStorage.getItem('currentUser');
  return currentUser ? JSON.parse(currentUser) : null;
};

export const setCurrentUser = (user: User | null): void => {
  if (user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
  } else {
    localStorage.removeItem('currentUser');
  }
};

export const logoutUser = (): void => {
  localStorage.removeItem('currentUser');
};

export const registerUser = (user: Omit<User, 'id'>): User => {
  return createUser(user);
};

// Backup Links Storage
export const getAllBackupLinks = (): BackupLink[] => {
  const links = localStorage.getItem('backupLinks');
  return links ? JSON.parse(links) : [];
};

export const createBackupLink = (link: Omit<BackupLink, 'id' | 'createdAt'>): BackupLink => {
  const links = getAllBackupLinks();
  const newLink: BackupLink = {
    ...link,
    id: Date.now(), // Use timestamp as ID
    createdAt: new Date().toISOString(),
  };
  links.push(newLink);
  localStorage.setItem('backupLinks', JSON.stringify(links));
  return newLink;
};

export const deleteBackupLink = (id: number): void => {
  const links = getAllBackupLinks();
  const updatedLinks = links.filter(link => link.id !== id);
  localStorage.setItem('backupLinks', JSON.stringify(updatedLinks));
};

// Driver Storage
export const createDriver = (driver: Omit<Driver, 'id'>): Driver => {
  const drivers = getAllDrivers();
  const newDriver: Driver = {
    ...driver,
    id: uuidv4(),
  };
  drivers.push(newDriver);
  localStorage.setItem('drivers', JSON.stringify(drivers));
  return newDriver;
};

export const updateDriver = (updatedDriver: Driver): void => {
  const drivers = getAllDrivers();
  const updatedDrivers = drivers.map(driver =>
    driver.id === updatedDriver.id ? updatedDriver : driver
  );
  localStorage.setItem('drivers', JSON.stringify(updatedDrivers));
};

export const deleteDriver = (id: string): void => {
  const drivers = getAllDrivers();
  const updatedDrivers = drivers.filter(driver => driver.id !== id);
  localStorage.setItem('drivers', JSON.stringify(updatedDrivers));
};

// Vehicle Storage
export const createVehicle = (vehicle: Omit<Vehicle, 'id'>): Vehicle => {
  const vehicles = getAllVehicles();
  const newVehicle: Vehicle = {
    ...vehicle,
    id: uuidv4(),
  };
  vehicles.push(newVehicle);
  localStorage.setItem('vehicles', JSON.stringify(vehicles));
  return newVehicle;
};

export const updateVehicle = (updatedVehicle: Vehicle): void => {
  const vehicles = getAllVehicles();
  const updatedVehicles = vehicles.map(vehicle =>
    vehicle.id === updatedVehicle.id ? updatedVehicle : vehicle
  );
  localStorage.setItem('vehicles', JSON.stringify(updatedVehicles));
};

export const deleteVehicle = (id: string): void => {
  const vehicles = getAllVehicles();
  const updatedVehicles = vehicles.filter(vehicle => vehicle.id !== id);
  localStorage.setItem('vehicles', JSON.stringify(updatedVehicles));
};

export const getVehicleById = (id: string): Vehicle | undefined => {
  const vehicles = getAllVehicles();
  return vehicles.find(vehicle => vehicle.id === id);
};

// Project Storage
export const createProject = (project: Omit<Project, 'id' | 'created_at'>): Project => {
  return saveProject(project);
};

// Progress Update Storage
export const getProgressUpdateById = async (id: string): Promise<ProgressUpdate | undefined> => {
  const updates = await getProgressUpdates();
  return updates.find((update: ProgressUpdate) => update.id === id);
};

// Payment Request Storage
export const updatePaymentRequest = (updatedRequest: PaymentRequest): void => {
  const requests = getPaymentRequests();
  const updatedRequests = requests.map(request =>
    request.id === updatedRequest.id ? updatedRequest : request
  );
  localStorage.setItem('paymentRequests', JSON.stringify(updatedRequests));
};

// Leader Progress Stats
export const getLeaderProgressStats = async (leaderId: string) => {
  const projects = getProjectsByLeaderId(leaderId);
  const updates = await getProgressUpdates();
  
  return projects.map(project => {
    const projectUpdates = updates.filter((update: ProgressUpdate) => update.project_id === project.id);
    const totalUpdates = projectUpdates.length;
    const lastUpdate = projectUpdates[0]?.created_at || project.created_at;
    
    return {
      projectId: project.id,
      projectName: project.title,
      totalUpdates,
      lastUpdate,
      completionPercentage: calculateCompletionPercentage(project)
    };
  });
};

// Helper function for completion percentage
const calculateCompletionPercentage = (project: Project): number => {
  if (project.total_work === 0) return 0;
  return Math.min(100, Math.round((project.completed_work / project.total_work) * 100));
};

// Final Submissions Storage
export const getFinalSubmissions = (): FinalSubmission[] => {
  const submissions = localStorage.getItem('finalSubmissions');
  return submissions ? JSON.parse(submissions) : [];
};

export const saveFinalSubmission = (submission: Omit<FinalSubmission, 'id' | 'createdAt' | 'updatedAt'>): FinalSubmission => {
  const submissions = getFinalSubmissions();
  const newSubmission: FinalSubmission = {
    ...submission,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  submissions.push(newSubmission);
  localStorage.setItem('finalSubmissions', JSON.stringify(submissions));
  return newSubmission;
};

export const getFinalSubmissionsByLeader = (leaderId: string): FinalSubmission[] => {
  return getFinalSubmissions().filter(submission => submission.leaderId === leaderId);
};

export const getFinalSubmissionsByProject = (projectId: string): FinalSubmission[] => {
  return getFinalSubmissions().filter(submission => submission.projectId === projectId);
};
