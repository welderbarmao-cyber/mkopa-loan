import { get as ecGet, has as ecHas } from '@vercel/edge-config';

// =====================================================
// M-Kopa Loans — Data Layer (Vercel Edge Config)
// =====================================================

export interface User {
  id: number;
  email: string;
  name: string;
  passwordHash: string;
  role: 'admin' | 'customer';
  phone: string | null;
  // KYC flow state
  kycStatus: 'none' | 'submitted' | 'approved' | 'rejected';
  kycSubmittedAt?: string;
  kycReviewedAt?: string;
  kycRejectionReason?: string;
  // Loan limit (assigned by admin after KYC approval)
  loanLimit: number; // 0 means no limit assigned
  loanLimitAssignedAt?: string;
  createdAt: string;
}

export interface Loan {
  id: number;
  userId: number;
  amount: number;
  termMonths: number;
  status: 'pending' | 'approved' | 'rejected' | 'disbursed';
  productType: string;
  purpose: string;
  // Activation fee payment
  activationFee: number;
  activationFeeStatus: 'unpaid' | 'pending' | 'paid' | 'failed';
  activationFeeReference?: string;
  activationFeePaidAt?: string;
  createdAt: string;
}

export interface KycUpload {
  id: number;
  userId: number;
  // Only national_id and passport (no selfie)
  documentType: 'national_id' | 'passport';
  r2Key: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  uploadedAt: string;
  reviewedAt?: string;
  // Base64 document data (stored when R2 is not available)
  fileData?: string;
  fileName?: string;
  contentType?: string;
}

const USERS_KEY = 'users';
const LOANS_KEY = 'loans';
const KYC_KEY = 'kyc_uploads';
const COUNTERS_KEY = 'counters';

// ---------- Write helper (Vercel API v9) ----------

async function writeEdgeConfig(key: string, value: unknown): Promise<void> {
  const ecId = process.env.EDGE_CONFIG;
  const vercelToken = process.env.VERCEL_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!ecId || !vercelToken || !teamId) {
    throw new Error('EDGE_CONFIG, VERCEL_TOKEN, or VERCEL_TEAM_ID not set');
  }

  const idMatch = ecId.match(/ecfg_[a-zA-Z0-9]+/);
  if (!idMatch) throw new Error('Invalid EDGE_CONFIG connection string');
  const ecfgId = idMatch[0];

  const url = `https://api.vercel.com/v9/edge-config/${ecfgId}/items?teamId=${teamId}`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${vercelToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items: [{ operation: 'upsert', key, value }],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Edge Config write failed: ${response.status} ${text}`);
  }
}

async function readEdgeConfig<T>(key: string): Promise<T | undefined> {
  return await ecGet<T>(key);
}

async function hasEdgeConfig(key: string): Promise<boolean> {
  return await ecHas(key);
}

// ---------- Counters ----------

async function ensureCounters() {
  const exists = await hasEdgeConfig(COUNTERS_KEY);
  if (!exists) {
    await writeEdgeConfig(COUNTERS_KEY, { user: 1, loan: 1, kyc: 1 });
  }
}

async function getNextId(type: 'user' | 'loan' | 'kyc'): Promise<number> {
  await ensureCounters();
  const counters = (await readEdgeConfig<{ user: number; loan: number; kyc: number }>(COUNTERS_KEY)) || { user: 1, loan: 1, kyc: 1 };
  const next = counters[type];
  counters[type] = next + 1;
  await writeEdgeConfig(COUNTERS_KEY, counters);
  return next;
}

// ---------- Users ----------

export async function findUserByEmail(email: string): Promise<User | null> {
  const users = (await readEdgeConfig<User[]>(USERS_KEY)) || [];
  if (!Array.isArray(users)) return null;
  return users.find(u => u.email === email) || null;
}

export async function findUserById(id: number): Promise<User | null> {
  const users = (await readEdgeConfig<User[]>(USERS_KEY)) || [];
  if (!Array.isArray(users)) return null;
  return users.find(u => u.id === id) || null;
}

export async function getAllUsers(): Promise<User[]> {
  const users = (await readEdgeConfig<User[]>(USERS_KEY)) || [];
  return Array.isArray(users) ? users : [];
}

export async function createUser(data: {
  email: string;
  name: string;
  passwordHash: string;
  phone: string;
  role?: 'admin' | 'customer';
}): Promise<User> {
  const users = (await readEdgeConfig<User[]>(USERS_KEY)) || [];
  const id = await getNextId('user');
  const newUser: User = {
    id,
    email: data.email,
    name: data.name,
    passwordHash: data.passwordHash,
    role: data.role || 'customer',
    phone: data.phone,
    kycStatus: 'none',
    loanLimit: 0,
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  await writeEdgeConfig(USERS_KEY, users);
  return newUser;
}

export async function updateUser(email: string, updates: Partial<User>): Promise<void> {
  const users = (await readEdgeConfig<User[]>(USERS_KEY)) || [];
  const idx = users.findIndex(u => u.email === email);
  if (idx >= 0) {
    users[idx] = { ...users[idx], ...updates };
    await writeEdgeConfig(USERS_KEY, users);
  }
}

export async function updateUserById(userId: number, updates: Partial<User>): Promise<void> {
  const users = (await readEdgeConfig<User[]>(USERS_KEY)) || [];
  const idx = users.findIndex(u => u.id === userId);
  if (idx >= 0) {
    users[idx] = { ...users[idx], ...updates };
    await writeEdgeConfig(USERS_KEY, users);
  }
}

// ---------- Loans ----------

export async function createLoan(data: {
  userId: number;
  amount: number;
  termMonths: number;
  productType: string;
  purpose: string;
  activationFee: number;
}): Promise<Loan> {
  const loans = (await readEdgeConfig<Loan[]>(LOANS_KEY)) || [];
  const id = await getNextId('loan');
  const newLoan: Loan = {
    id,
    userId: data.userId,
    amount: data.amount,
    termMonths: data.termMonths,
    status: 'pending',
    productType: data.productType,
    purpose: data.purpose,
    activationFee: data.activationFee,
    activationFeeStatus: 'unpaid',
    createdAt: new Date().toISOString(),
  };
  loans.push(newLoan);
  await writeEdgeConfig(LOANS_KEY, loans);
  return newLoan;
}

export async function getLoansByUserId(userId: number): Promise<Loan[]> {
  const loans = (await readEdgeConfig<Loan[]>(LOANS_KEY)) || [];
  if (!Array.isArray(loans)) return [];
  return loans.filter(l => l.userId === userId);
}

export async function getAllLoans(): Promise<Loan[]> {
  const loans = (await readEdgeConfig<Loan[]>(LOANS_KEY)) || [];
  return Array.isArray(loans) ? loans : [];
}

export async function updateLoan(loanId: number, updates: Partial<Loan>): Promise<void> {
  const loans = (await readEdgeConfig<Loan[]>(LOANS_KEY)) || [];
  const idx = loans.findIndex(l => l.id === loanId);
  if (idx >= 0) {
    loans[idx] = { ...loans[idx], ...updates };
    await writeEdgeConfig(LOANS_KEY, loans);
  }
}

export async function findLoanById(id: number): Promise<Loan | null> {
  const loans = (await readEdgeConfig<Loan[]>(LOANS_KEY)) || [];
  return loans.find(l => l.id === id) || null;
}

// ---------- KYC ----------

// Store file data in separate keys to avoid Edge Config 2MB limit per key
const KYC_FILE_PREFIX = 'kyc_file_';

export async function createKycUpload(data: {
  userId: number;
  documentType: 'national_id' | 'passport';
  r2Key: string;
  fileData?: string;
  fileName?: string;
  contentType?: string;
}): Promise<KycUpload> {
  const uploads = (await readEdgeConfig<KycUpload[]>(KYC_KEY)) || [];
  const id = await getNextId('kyc');

  // Store file data in a SEPARATE key (not in the array) to avoid size limits
  if (data.fileData) {
    await writeEdgeConfig(`${KYC_FILE_PREFIX}${id}`, {
      fileData: data.fileData,
      fileName: data.fileName,
      contentType: data.contentType,
    });
  }

  // Store only metadata in the array (keeps it small)
  const newUpload: KycUpload = {
    id,
    userId: data.userId,
    documentType: data.documentType,
    r2Key: data.r2Key,
    status: 'pending',
    uploadedAt: new Date().toISOString(),
    // Don't store fileData in the array - it's in a separate key
    fileName: data.fileName,
    contentType: data.contentType,
  };
  uploads.push(newUpload);
  await writeEdgeConfig(KYC_KEY, uploads);
  return newUpload;
}

// Get file data for a specific KYC document
export async function getKycFileData(kycId: number): Promise<{ fileData: string; fileName?: string; contentType?: string } | null> {
  const data = await readEdgeConfig<{ fileData: string; fileName?: string; contentType?: string }>(`${KYC_FILE_PREFIX}${kycId}`);
  return data || null;
}

export async function getKycByUserId(userId: number): Promise<KycUpload[]> {
  const uploads = (await readEdgeConfig<KycUpload[]>(KYC_KEY)) || [];
  if (!Array.isArray(uploads)) return [];
  return uploads.filter(k => k.userId === userId);
}

export async function getAllKyc(): Promise<KycUpload[]> {
  const uploads = (await readEdgeConfig<KycUpload[]>(KYC_KEY)) || [];
  return Array.isArray(uploads) ? uploads : [];
}

export async function updateKyc(kycId: number, updates: Partial<KycUpload>): Promise<void> {
  const uploads = (await readEdgeConfig<KycUpload[]>(KYC_KEY)) || [];
  const idx = uploads.findIndex(k => k.id === kycId);
  if (idx >= 0) {
    uploads[idx] = { ...uploads[idx], ...updates };
    await writeEdgeConfig(KYC_KEY, uploads);
  }
}

// ---------- Init ----------

export async function initializeDatabase(): Promise<void> {
  await ensureCounters();
  const exists = await hasEdgeConfig(USERS_KEY);
  if (!exists) {
    await writeEdgeConfig(USERS_KEY, []);
    await writeEdgeConfig(LOANS_KEY, []);
    await writeEdgeConfig(KYC_KEY, []);
  }
}
