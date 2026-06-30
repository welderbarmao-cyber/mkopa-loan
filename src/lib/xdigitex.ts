// =====================================================
// XDigitex Pay — STK Push Payment Integration
// =====================================================
// API Docs: https://pay.xdigitex.space/docs
// Base URL: https://pay.xdigitex.space/api
// Auth: X-API-Key header
// Gateway behavior:
//   - mobile: ACTUAL STK push (PawaPay) - auto-detects Safaricom/Airtel
//   - safaricom/airtel: Pesapal hosted checkout (redirect_url)
//   - card: Pesapal hosted checkout (redirect_url)

const API_BASE = 'https://pay.xdigitex.space/api';
const API_KEY = process.env.XDIGITEX_API_KEY || 'pg_JNKkFppfeEqwpYUEmoyrfJkoPKIpSeem';

export interface InitiatePaymentRequest {
  amount: number;
  currency?: string;
  gateway: 'safaricom' | 'airtel' | 'mobile' | 'card' | 'crypto';
  phone: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  description: string;
  callback_url?: string;
  webhook_url?: string;
}

export interface InitiatePaymentResponse {
  success: boolean;
  reference: string;
  gateway: string;
  amount: number;
  fee: number;
  net_amount: number;
  fee_percent: number;
  // For card/safaricom/airtel via Pesapal (redirect-based)
  redirect_url?: string;
  order_tracking_id?: string;
  // For mobile money via PawaPay (actual STK push)
  deposit_id?: string;
  pawa_status?: string;
  correspondent?: string;
  checkout_url?: string;
  message?: string;
}

export interface PaymentStatus {
  reference: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  amount: string;
  fee: string;
  net_amount: string;
  currency: string;
  gateway: string;
  created_at: string;
  updated_at: string;
}

export interface Gateway {
  id: string;
  name: string;
  description: string;
  fee_percent: number;
  currencies: string[];
  min_amount: number;
  enabled: boolean;
}

export async function initiatePayment(req: InitiatePaymentRequest): Promise<InitiatePaymentResponse> {
  const response = await fetch(`${API_BASE}/payments/initiate`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: req.amount,
      currency: req.currency || 'KES',
      gateway: req.gateway,
      phone: req.phone,
      email: req.email,
      first_name: req.first_name,
      last_name: req.last_name,
      description: req.description,
      callback_url: req.callback_url,
      webhook_url: req.webhook_url,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || data.message || `Payment initiation failed: ${response.status}`);
  }
  return data;
}

export async function getPaymentStatus(reference: string): Promise<PaymentStatus> {
  const response = await fetch(`${API_BASE}/payments/${reference}/status`, {
    headers: { 'X-API-Key': API_KEY },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Failed to fetch payment status: ${response.status}`);
  }
  return data;
}

export async function listGateways(): Promise<Gateway[]> {
  const response = await fetch(`${API_BASE}/gateways`, {
    headers: { 'X-API-Key': API_KEY },
  });
  const data = await response.json();
  return data.gateways || [];
}

// Detect network from Kenyan phone number
export function detectNetwork(phone: string): 'safaricom' | 'airtel' | 'telkom' | 'unknown' {
  const stripped = phone.replace(/[\s+]/g, '');
  let p = stripped;
  if (p.startsWith('254')) p = p.substring(3);
  if (p.startsWith('0')) p = p.substring(1);
  if (p.length < 3) return 'unknown';
  const prefix = p.substring(0, 3);
  const safaricomPrefixes = ['700','701','702','703','704','705','706','707','708','709','710','711','712','713','714','715','716','717','718','719','720','721','722','723','724','725','726','727','728','729','740','741','742','743','744','745','746','747','748','749','750','751','752','753','754','755','756','757','758','759','760','761','762','763','764','765','768','769','790','791','792','793','794','795','796','797','798','799','110','111','112','113','114','115'];
  const airtelPrefixes = ['730','731','732','733','734','735','736','737','738','739','750','751','752','753','754','755','756','757','758','759','770','771','772','773','774','775','776','777','778','779','100','101','102','103','104','105'];
  const telkomPrefixes = ['770','771','772','773','774','775','776','777','778','779'];

  if (safaricomPrefixes.includes(prefix)) return 'safaricom';
  if (airtelPrefixes.includes(prefix)) return 'airtel';
  if (telkomPrefixes.includes(prefix)) return 'telkom';
  return 'unknown';
}

// Normalize phone to +254 format
export function normalizePhone(phone: string): string {
  const p = phone.replace(/[\s+]/g, '');
  if (p.startsWith('254')) return '+' + p;
  if (p.startsWith('0')) return '+254' + p.substring(1);
  if (p.startsWith('7')) return '+254' + p;
  return phone;
}
