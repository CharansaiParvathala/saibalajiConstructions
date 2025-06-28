import { TenderBill, Tender, FinalSubmission } from './tender-types';
import { v4 as uuidv4 } from 'uuid';

// Tender Bills Storage
export const getTenderBills = (): TenderBill[] => {
  const bills = localStorage.getItem('tenderBills');
  return bills ? JSON.parse(bills) : [];
};

export const saveTenderBill = (bill: Omit<TenderBill, 'id' | 'createdAt' | 'updatedAt'>): TenderBill => {
  const bills = getTenderBills();
  const newBill: TenderBill = {
    ...bill,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  bills.push(newBill);
  localStorage.setItem('tenderBills', JSON.stringify(bills));
  return newBill;
};

export const updateTenderBill = (id: string, updates: Partial<TenderBill>): TenderBill | null => {
  const bills = getTenderBills();
  const index = bills.findIndex(bill => bill.id === id);
  if (index === -1) return null;
  
  bills[index] = { ...bills[index], ...updates, updatedAt: new Date().toISOString() };
  localStorage.setItem('tenderBills', JSON.stringify(bills));
  return bills[index];
};

export const deleteTenderBill = (id: string): boolean => {
  const bills = getTenderBills();
  const filteredBills = bills.filter(bill => bill.id !== id);
  localStorage.setItem('tenderBills', JSON.stringify(filteredBills));
  return filteredBills.length < bills.length;
};

// Tenders Storage
export const getTenders = (): Tender[] => {
  const tenders = localStorage.getItem('tenders');
  return tenders ? JSON.parse(tenders) : [];
};

export const saveTender = (tender: Omit<Tender, 'id' | 'createdAt' | 'updatedAt'>): Tender => {
  const tenders = getTenders();
  const newTender: Tender = {
    ...tender,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  tenders.push(newTender);
  localStorage.setItem('tenders', JSON.stringify(tenders));
  return newTender;
};

export const updateTender = (id: string, updates: Partial<Tender>): Tender | null => {
  const tenders = getTenders();
  const index = tenders.findIndex(tender => tender.id === id);
  if (index === -1) return null;
  
  tenders[index] = { ...tenders[index], ...updates, updatedAt: new Date().toISOString() };
  localStorage.setItem('tenders', JSON.stringify(tenders));
  return tenders[index];
};

export const deleteTender = (id: string): boolean => {
  const tenders = getTenders();
  const filteredTenders = tenders.filter(tender => tender.id !== id);
  localStorage.setItem('tenders', JSON.stringify(filteredTenders));
  return filteredTenders.length < tenders.length;
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

export const updateFinalSubmission = (id: string, updates: Partial<FinalSubmission>): FinalSubmission | null => {
  const submissions = getFinalSubmissions();
  const index = submissions.findIndex(submission => submission.id === id);
  if (index === -1) return null;
  
  submissions[index] = { ...submissions[index], ...updates, updatedAt: new Date().toISOString() };
  localStorage.setItem('finalSubmissions', JSON.stringify(submissions));
  return submissions[index];
};

export const getFinalSubmissionsByLeader = (leaderId: string): FinalSubmission[] => {
  return getFinalSubmissions().filter(submission => submission.leaderId === leaderId);
};

export const getFinalSubmissionsByProject = (projectId: string): FinalSubmission[] => {
  return getFinalSubmissions().filter(submission => submission.projectId === projectId);
};
