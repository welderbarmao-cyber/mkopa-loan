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

export interface Guarantor {
  name: string;
  phone: string;
  email?: string;
  relation: string;
  occupation: string;
  incomeRange: string;
  idNumber: string;
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
  // Personal details
  fullName?: string;
  nationalId?: string;
  dob?: string;
  gender?: string;
  maritalStatus?: string;
  address?: string;
  city?: string;
  // Financial details
  occupation?: string;
  employer?: string;
  jobTitle?: string;
  incomeRange?: string;
  dependants?: string;
  bankName?: string;
  bankAccount?: string;
  mpesaPhone?: string;
  // Guarantor
  guarantor?: Guarantor;
  createdAt: string;
}

export interface KycUpload {
  id: number;
  userId: number;
  // KYC document types: National ID front, National ID back, Selfie/Passport photo
  documentType: 'national_id_front' | 'national_id_back' | 'selfie';
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
export const PWD_PREFIX = 'pwd_'; // Password hashes stored separately to keep users array small

// ---------- Storage helpers ----------
// Edge Config: READS only (unlimited, fast)
// GitHub: WRITES only (5000 req/hour, no monthly limit)
// Edge Config free plan exhausted 250 writes/month

import { writeData, readData, isGitHubDbConfigured } from './github-db';

async function writeEdgeConfig(key: string, value: unknown): Promise<void> {
  // Try GitHub first (no rate limits, 5000 req/hour)
  if (isGitHubDbConfigured()) {
    const success = await writeData(key, value);
    if (success) return;
    // GitHub write failed - throw error (don't silently fall back to rate-limited Edge Config)
    throw new Error('Failed to write data. Please try again.');
  }

  // No GitHub configured - try Edge Config
  const ecId = process.env.EDGE_CONFIG;
  const vercelToken = process.env.VERCEL_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!ecId || !vercelToken || !teamId) {
    throw new Error('No storage configured');
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
  // Try GitHub first (has latest data since writes go there)
  if (isGitHubDbConfigured()) {
    const ghData = await readData<T>(key);
    if (ghData !== null) return ghData;
  }
  // Fallback to Edge Config (has old data, reads unlimited)
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
  // Read users directly from GitHub API (bypasses all caching/fallback logic)
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    // Fallback to edge config if no GitHub token
    const users = (await readEdgeConfig<User[]>(USERS_KEY)) || [];
    if (!Array.isArray(users)) return null;
    return users.find(u => u.email === email) || null;
  }
  
  try {
    // Read users.json directly from GitHub API
    const usersResp = await fetch(
      'https://api.github.com/repos/welderbarmao-cyber/mkopa-loan/contents/data/users.json?ref=kyc-docs',
      {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
        cache: 'no-store',
      }
    );
    if (!usersResp.ok) return null;
    const usersFile = await usersResp.json();
    const usersContent = JSON.parse(Buffer.from(usersFile.content, 'base64').toString('utf-8'));
    const user = usersContent.find((u: User) => u.email === email);
    if (!user) return null;
    
    // Read pwd file directly from GitHub API
    const pwdResp = await fetch(
      `https://api.github.com/repos/welderbarmao-cyber/mkopa-loan/contents/data/pwd_${user.id}.json?ref=kyc-docs`,
      {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
        cache: 'no-store',
      }
    );
    if (pwdResp.ok) {
      const pwdFile = await pwdResp.json();
      const pwdContent = JSON.parse(Buffer.from(pwdFile.content, 'base64').toString('utf-8'));
      if (pwdContent.passwordHash && pwdContent.passwordHash.startsWith('$2b$')) {
        return { ...user, passwordHash: pwdContent.passwordHash };
      }
    }
    
    // If pwd file doesn't exist, use hash from array
    if (user.passwordHash && user.passwordHash.startsWith('$2b$')) {
      return user;
    }
    
    return user;
  } catch {
    return null;
  }
}

export async function findUserById(id: number): Promise<User | null> {
  const users = (await readEdgeConfig<User[]>(USERS_KEY)) || [];
  if (!Array.isArray(users)) return null;
  return users.find(u => u.id === id) || null;
}

export async function getAllUsers(): Promise<User[]> {
  const users = (await readEdgeConfig<User[]>(USERS_KEY)) || [];
  // Strip password hashes to keep data small
  return (Array.isArray(users) ? users : []).map(u => ({ ...u, passwordHash: '' }));
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
  // Also store hash separately as backup
  await writeEdgeConfig(`${PWD_PREFIX}${id}`, { passwordHash: data.passwordHash });
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
  fullName?: string;
  nationalId?: string;
  dob?: string;
  gender?: string;
  maritalStatus?: string;
  address?: string;
  city?: string;
  occupation?: string;
  employer?: string;
  jobTitle?: string;
  incomeRange?: string;
  dependants?: string;
  bankName?: string;
  bankAccount?: string;
  mpesaPhone?: string;
  guarantor?: Guarantor;
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
    fullName: data.fullName,
    nationalId: data.nationalId,
    dob: data.dob,
    gender: data.gender,
    maritalStatus: data.maritalStatus,
    address: data.address,
    city: data.city,
    occupation: data.occupation,
    employer: data.employer,
    jobTitle: data.jobTitle,
    incomeRange: data.incomeRange,
    dependants: data.dependants,
    bankName: data.bankName,
    bankAccount: data.bankAccount,
    mpesaPhone: data.mpesaPhone,
    guarantor: data.guarantor,
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
// For large files, split into multiple chunks: kyc_file_<id>_chunk_<n>
const KYC_FILE_PREFIX = 'kyc_file_';
const KYC_FILE_META_PREFIX = 'kyc_file_meta_';

export async function createKycUpload(data: {
  userId: number;
  documentType: 'national_id_front' | 'national_id_back' | 'selfie';
  r2Key: string;
  fileData?: string;
  fileName?: string;
  contentType?: string;
}): Promise<KycUpload> {
  const uploads = (await readEdgeConfig<KycUpload[]>(KYC_KEY)) || [];
  const id = await getNextId('kyc');

  // Store file data in SEPARATE key(s) - chunk if necessary
  if (data.fileData) {
    const CHUNK_SIZE = 500 * 1024; // 500KB per chunk
    const matches = data.fileData.match(/^data:(image\/\w+);base64,(.+)$/);
    const prefix = matches ? `data:${matches[1]};base64,` : '';
    const rawData = matches ? matches[2] : data.fileData;

    if (rawData.length < CHUNK_SIZE) {
      // Small enough for single key
      await writeEdgeConfig(`${KYC_FILE_PREFIX}${id}`, {
        fileData: data.fileData,
        fileName: data.fileName,
        contentType: data.contentType,
      });
    } else {
      // Split into chunks
      const numChunks = Math.ceil(rawData.length / CHUNK_SIZE);
      for (let i = 0; i < numChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = start + CHUNK_SIZE;
        const chunkData = rawData.substring(start, end);
        const chunkValue = i === 0 ? prefix + chunkData : chunkData;
        await writeEdgeConfig(`${KYC_FILE_PREFIX}${id}_chunk_${i}`, {
          chunkIndex: i,
          chunkData: chunkValue,
          totalChunks: numChunks,
        });
      }
      // Store metadata
      await writeEdgeConfig(`${KYC_FILE_META_PREFIX}${id}`, {
        fileName: data.fileName,
        contentType: data.contentType,
        totalChunks: numChunks,
        chunked: true,
      });
    }
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

// Get file data for a specific KYC document (reassembles chunks if needed)
export async function getKycFileData(kycId: number): Promise<{ fileData: string; fileName?: string; contentType?: string } | null> {
  // First, check if there's a metadata key (indicates chunked storage)
  const meta = await readEdgeConfig<{ fileName?: string; contentType?: string; totalChunks: number; chunked: boolean }>(`${KYC_FILE_META_PREFIX}${kycId}`);

  if (meta?.chunked) {
    // Reassemble chunks
    let reassembled = '';
    for (let i = 0; i < meta.totalChunks; i++) {
      const chunk = await readEdgeConfig<{ chunkData: string; chunkIndex: number }>(`${KYC_FILE_PREFIX}${kycId}_chunk_${i}`);
      if (chunk?.chunkData) {
        reassembled += chunk.chunkData;
      }
    }
    if (reassembled) {
      return {
        fileData: reassembled,
        fileName: meta.fileName,
        contentType: meta.contentType,
      };
    }
  }

  // Try single key (non-chunked)
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
// Cache bust: Thu Jul  2 05:33:09 UTC 2026

// Direct GitHub read for password hash - bypasses all caching
async function directReadPwd(userId: number): Promise<string | null> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;
  try {
    const resp = await fetch(
      `https://api.github.com/repos/welderbarmao-cyber/mkopa-loan/contents/data/pwd_${userId}.json?ref=kyc-docs`,
      {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
        cache: 'no-store',
      }
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data.content && data.encoding === 'base64') {
      const decoded = JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'));
      return decoded.passwordHash || null;
    }
    return null;
  } catch {
    return null;
  }
}
