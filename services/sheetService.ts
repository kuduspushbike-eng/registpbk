import { MemberData, UserStatus, PaymentMethod } from '../types';

const STORAGE_KEY = 'pushbike_kudus_db';
const SCRIPT_URL_KEY = 'pushbike_script_url';
const LOGO_URL_KEY = 'pushbike_logo_url';

export const DEFAULT_LOGO = "https://cdn-icons-png.flaticon.com/512/5717/5717316.png";

// Simulate network delay for mock mode
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- CONFIGURATION HELPERS ---

export const setScriptUrl = (url: string) => {
  if (url && url.trim().length > 0) {
    localStorage.setItem(SCRIPT_URL_KEY, url.trim());
  } else {
    localStorage.removeItem(SCRIPT_URL_KEY);
  }
};

export const getScriptUrl = (): string => {
  return localStorage.getItem(SCRIPT_URL_KEY) || "";
};

export const setLogoUrl = (url: string) => {
  if (url && url.trim().length > 0) {
    localStorage.setItem(LOGO_URL_KEY, url.trim());
  } else {
    localStorage.removeItem(LOGO_URL_KEY);
  }
};

export const getLogoUrl = (overrideDefault?: string): string => {
  return localStorage.getItem(LOGO_URL_KEY) || overrideDefault || DEFAULT_LOGO;
};

const getActiveUrl = (): string => {
  return getScriptUrl();
};

// --- MOCK DATABASE HELPERS (LOCAL STORAGE) ---
const getDB = (): Record<string, MemberData> => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : {};
};

const saveDB = (db: Record<string, MemberData>) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
};

// --- API HELPER FOR GOOGLE SHEETS ---
const callScript = async (action: string, payload: any = {}) => {
  const url = getActiveUrl();
  if (!url) throw new Error("Script URL not configured");
  
  const response = await fetch(url, {
    method: "POST",
    body: JSON.stringify({ action, ...payload })
  });
  
  const json = await response.json();
  if (json.error) throw new Error(json.error);
  return json;
};

// ============================================================================
// SERVICE METHODS
// ============================================================================

export const checkMemberStatus = async (whatsapp: string, nickname?: string, childCount: number = 1): Promise<MemberData> => {
  // 1. REAL MODE
  if (getActiveUrl()) {
    try {
      return await callScript('check_status', { whatsapp, nickname, childCount });
    } catch (e) {
      console.warn("API Error, falling back to mock check for safety", e);
      throw e;
    }
  }

  // 2. MOCK MODE
  await delay(600);
  const db = getDB();
  
  if (db[whatsapp]) {
    const existing = db[whatsapp];
    // LOGIC FIX: If member exists but is NEW, allow updating child count and price
    if (existing.status === UserStatus.NEW && existing.childCount !== childCount) {
       const basePrice = childCount === 2 ? 300000 : 200000;
       const randomDigits = existing.paymentCode || Math.floor(Math.random() * 90 + 10);
       
       existing.childCount = childCount;
       existing.paymentAmount = basePrice + randomDigits;
       // Also update nickname if provided
       if(nickname) existing.nickname = nickname;
       
       saveDB(db);
       return existing;
    }
    return existing;
  }

  const basePrice = childCount === 2 ? 300000 : 200000;
  const randomDigits = Math.floor(Math.random() * 90 + 10); // 10-99
  
  const newMember: MemberData = {
    whatsapp,
    nickname: nickname || '',
    childCount: childCount,
    status: UserStatus.NEW,
    paymentCode: randomDigits,
    paymentAmount: basePrice + randomDigits
  };
  
  db[whatsapp] = newMember;
  saveDB(db);
  return newMember;
};

export const confirmPayment = async (whatsapp: string, method: PaymentMethod): Promise<MemberData> => {
  // 1. REAL MODE
  if (getActiveUrl()) {
    return await callScript('confirm_payment', { whatsapp, method });
  }

  // 2. MOCK MODE
  await delay(800);
  const db = getDB();
  if (db[whatsapp]) {
    db[whatsapp].status = UserStatus.WAITING_APPROVAL;
    db[whatsapp].paymentMethod = method;
    
    // Calculate base price based on child count
    const basePrice = db[whatsapp].childCount === 2 ? 300000 : 200000;

    // If Cash, normalize amount to flat base price. If Transfer, ensure it keeps the unique code.
    if (method === 'CASH') {
        db[whatsapp].paymentAmount = basePrice;
    } else {
        // Ensure unique code exists if switching back to transfer
        if (db[whatsapp].paymentAmount === basePrice) {
             const randomDigits = db[whatsapp].paymentCode || Math.floor(Math.random() * 90 + 10);
             db[whatsapp].paymentCode = randomDigits;
             db[whatsapp].paymentAmount = basePrice + randomDigits;
        }
    }

    saveDB(db);
    return db[whatsapp];
  }
  throw new Error("Member not found");
};

export const adminApproveMember = async (whatsapp: string): Promise<MemberData> => {
  // 1. REAL MODE
  if (getActiveUrl()) {
    await callScript('admin_approve', { whatsapp });
    // Fetch updated data to return consistent object
    return { ...(await checkMemberStatus(whatsapp)), status: UserStatus.APPROVED };
  }

  // 2. MOCK MODE
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
  // 1. REAL MODE
  if (getActiveUrl()) {
    return await callScript('submit_registration', { whatsapp, data });
  }

  // 2. MOCK MODE
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
  // 1. REAL MODE
  if (getActiveUrl()) {
    return await callScript('get_all');
  }

  // 2. MOCK MODE
  await delay(500);
  const db = getDB();
  return Object.values(db);
};

export const wipeAllData = async (): Promise<void> => {
  // 1. REAL MODE
  if (getActiveUrl()) {
    await callScript('wipe_all');
    return;
  }

  // 2. MOCK MODE
  await delay(1000);
  localStorage.removeItem(STORAGE_KEY);
};

export const syncColors = async (): Promise<{success: boolean, count: number}> => {
  // 1. REAL MODE
  if (getActiveUrl()) {
    return await callScript('sync_colors');
  }

  // 2. MOCK MODE
  await delay(500);
  return { success: true, count: 0 };
};
