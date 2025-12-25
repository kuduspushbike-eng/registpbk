import { MemberData, UserStatus } from '../types';

const STORAGE_KEY = 'pushbike_kudus_db';

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to get DB
const getDB = (): Record<string, MemberData> => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : {};
};

// Helper to save DB
const saveDB = (db: Record<string, MemberData>) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
};

export const checkMemberStatus = async (whatsapp: string): Promise<MemberData> => {
  await delay(600); // Simulate API call
  const db = getDB();
  
  if (db[whatsapp]) {
    return db[whatsapp];
  }

  // Create new if not exists
  const randomDigits = Math.floor(Math.random() * 90 + 10); // 10-99
  const newMember: MemberData = {
    whatsapp,
    status: UserStatus.NEW,
    paymentCode: randomDigits,
    paymentAmount: 200000 + randomDigits
  };
  
  db[whatsapp] = newMember;
  saveDB(db);
  return newMember;
};

export const confirmPayment = async (whatsapp: string): Promise<MemberData> => {
  await delay(800);
  const db = getDB();
  if (db[whatsapp]) {
    db[whatsapp].status = UserStatus.WAITING_APPROVAL;
    saveDB(db);
    return db[whatsapp];
  }
  throw new Error("Member not found");
};

// This function simulates the Admin approving the payment manually on the sheet
export const adminApproveMember = async (whatsapp: string): Promise<MemberData> => {
  await delay(400);
  const db = getDB();
  if (db[whatsapp]) {
    db[whatsapp].status = UserStatus.APPROVED;
    saveDB(db);
    return db[whatsapp];
  }
  throw new Error("Member not found");
};

export const submitRegistration = async (whatsapp: string, data: Partial<MemberData>): Promise<MemberData> => {
  await delay(1000);
  const db = getDB();
  if (db[whatsapp]) {
    db[whatsapp] = {
      ...db[whatsapp],
      ...data,
      status: UserStatus.REGISTERED
    };
    saveDB(db);
    return db[whatsapp];
  }
  throw new Error("Member not found");
};

export const getAllMembers = async (): Promise<MemberData[]> => {
  await delay(500);
  const db = getDB();
  // Sort by latest added (conceptually, though keys are random/wa, we just return list)
  return Object.values(db);
};
