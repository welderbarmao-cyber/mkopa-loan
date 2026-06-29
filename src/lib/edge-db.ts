import { get as ecGet, has as ecHas } from '@vercel/edge-config';

// Edge Config is READ-ONLY at runtime via SDK
// Writes must go through the Vercel REST API

export interface User {
  id: number;
  email: string;
  name: string;
  passwordHash: string;
  role: 'admin' | 'customer';
  phone: string | null;
  createdAt: string;
}

export interface Loan {
  id: number;
  userId: number;
  amount: number;
  termMonths: number;
  status: 'pending' | 'approved' | 'rejected';
  productType: string;
  purpose: string;
  createdAt: string;
}

export interface KycUpload {
  id: number;
  userId: number;
  documentType: string;
  r2Key: string;
  status: 'pending' | 'approved' | 'rejected';
  uploadedAt: string;
}

const USERS_KEY = 'users';
const LOANS_KEY = 'loans';
const KYC_KEY = 'kyc_uploads';
const COUNTERS_KEY = 'counters';

// Use the REST API to write to Edge Config
async function writeEdgeConfig(key: string, value: unknown): Promise<void> {
  const ecId = process.env.EDGE_CONFIG;
  const token = process.env.EDGE_CONFIG_ACCESS_TOKEN;

  if (!ecId || !token) {
    throw new Error('EDGE_CONFIG or EDGE_CONFIG_ACCESS_TOKEN not set');
  }

  // Determine team ID from the user's default team
  // The Edge Config belongs to the team, so we use the Vercel API
  const url = `https://api.vercel.com/v1/edge-config/${ecId}/items?teamId=team_PbmEdMbmweJuU86JLZXXjMWD`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([{
      operation: 'upsert',
      key,
      value,
    }]),
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

// ============ Counters ============

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

// ============ Users ============

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
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  await writeEdgeConfig(USERS_KEY, users);
  return newUser;
}

export async function updateUserPassword(email: string, passwordHash: string): Promise<void> {
  const users = (await readEdgeConfig<User[]>(USERS_KEY)) || [];
  const idx = users.findIndex(u => u.email === email);
  if (idx >= 0) {
    users[idx].passwordHash = passwordHash;
    await writeEdgeConfig(USERS_KEY, users);
  }
}

// ============ Loans ============

export async function createLoan(data: {
  userId: number;
  amount: number;
  termMonths: number;
  productType: string;
  purpose: string;
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

export async function updateLoanStatus(loanId: number, status: 'approved' | 'rejected'): Promise<void> {
  const loans = (await readEdgeConfig<Loan[]>(LOANS_KEY)) || [];
  const idx = loans.findIndex(l => l.id === loanId);
  if (idx >= 0) {
    loans[idx].status = status;
    await writeEdgeConfig(LOANS_KEY, loans);
  }
}

// ============ KYC ============

export async function createKycUpload(data: {
  userId: number;
  documentType: string;
  r2Key: string;
}): Promise<KycUpload> {
  const uploads = (await readEdgeConfig<KycUpload[]>(KYC_KEY)) || [];
  const id = await getNextId('kyc');
  const newUpload: KycUpload = {
    id,
    userId: data.userId,
    documentType: data.documentType,
    r2Key: data.r2Key,
    status: 'pending',
    uploadedAt: new Date().toISOString(),
  };
  uploads.push(newUpload);
  await writeEdgeConfig(KYC_KEY, uploads);
  return newUpload;
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

export async function updateKycStatus(kycId: number, status: 'approved' | 'rejected'): Promise<void> {
  const uploads = (await readEdgeConfig<KycUpload[]>(KYC_KEY)) || [];
  const idx = uploads.findIndex(k => k.id === kycId);
  if (idx >= 0) {
    uploads[idx].status = status;
    await writeEdgeConfig(KYC_KEY, uploads);
  }
}

// ============ Initialization ============

export async function initializeDatabase(): Promise<{ initialized: boolean; adminCreated: boolean }> {
  await ensureCounters();
  const exists = await hasEdgeConfig(USERS_KEY);
  if (!exists) {
    await writeEdgeConfig(USERS_KEY, []);
    await writeEdgeConfig(LOANS_KEY, []);
    await writeEdgeConfig(KYC_KEY, []);
  }

  const admin = await findUserByEmail('admin@mkopa.com');
  return {
    initialized: true,
    adminCreated: !!admin,
  };
}
