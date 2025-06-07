
export interface TenderBill {
  id: string;
  billType: string;
  description?: string;
  cost: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Tender {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  totalCost: number;
  items: TenderItem[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TenderItem {
  id: string;
  tenderId: string;
  billId: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  billType: string;
  description?: string;
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

export interface PhotoWithMetadata {
  dataUrl: string;
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
  };
}
