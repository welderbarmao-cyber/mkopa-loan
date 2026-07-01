// =====================================================
// XDigitex Pay — STK Push Payment Integration
// Supports 10+ mobile money networks across Africa
// =====================================================

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
  redirect_url?: string;
  order_tracking_id?: string;
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

// ============ African Mobile Money Networks ============
// 10+ networks across East, South, and Central Africa

export interface MobileNetwork {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  currency: string;
  phonePrefix: string;
  provider: string; // PawaPay correspondent
}

export const AFRICAN_NETWORKS: MobileNetwork[] = [
  // Kenya
  { id: 'mpesa_kenya', name: 'M-Pesa Kenya', country: 'Kenya', countryCode: '+254', currency: 'KES', phonePrefix: '254', provider: 'MPESA_KEN' },
  { id: 'airtel_kenya', name: 'Airtel Money Kenya', country: 'Kenya', countryCode: '+254', currency: 'KES', phonePrefix: '254', provider: 'AIRTEL_KEN' },
  // Uganda
  { id: 'mtn_uganda', name: 'MTN MoMo Uganda', country: 'Uganda', countryCode: '+256', currency: 'UGX', phonePrefix: '256', provider: 'MTN_MOMO_UGA' },
  { id: 'airtel_uganda', name: 'Airtel Money Uganda', country: 'Uganda', countryCode: '+256', currency: 'UGX', phonePrefix: '256', provider: 'AIRTEL_OAPI_UGA' },
  // Tanzania
  { id: 'vodacom_tanzania', name: 'Vodacom M-Pesa Tanzania', country: 'Tanzania', countryCode: '+255', currency: 'TZS', phonePrefix: '255', provider: 'MPESA_TZA' },
  { id: 'airtel_tanzania', name: 'Airtel Money Tanzania', country: 'Tanzania', countryCode: '+255', currency: 'TZS', phonePrefix: '255', provider: 'AIRTEL_TZA' },
  // Ghana
  { id: 'mtn_ghana', name: 'MTN MoMo Ghana', country: 'Ghana', countryCode: '+233', currency: 'GHS', phonePrefix: '233', provider: 'MTN_MOMO_GHA' },
  { id: 'vodafone_ghana', name: 'Vodafone Cash Ghana', country: 'Ghana', countryCode: '+233', currency: 'GHS', phonePrefix: '233', provider: 'VODAFONE_CASH_GHA' },
  // Zambia
  { id: 'mtn_zambia', name: 'MTN MoMo Zambia', country: 'Zambia', countryCode: '+260', currency: 'ZMW', phonePrefix: '260', provider: 'MTN_MOMO_ZMB' },
  { id: 'airtel_zambia', name: 'Airtel Money Zambia', country: 'Zambia', countryCode: '+260', currency: 'ZMW', phonePrefix: '260', provider: 'AIRTEL_ZMB' },
  // Rwanda
  { id: 'mtn_rwanda', name: 'MTN MoMo Rwanda', country: 'Rwanda', countryCode: '+250', currency: 'RWF', phonePrefix: '250', provider: 'MTN_MOMO_RWA' },
  // Ivory Coast (West/Central Africa)
  { id: 'orange_civ', name: 'Orange Money Ivory Coast', country: 'Ivory Coast', countryCode: '+225', currency: 'XOF', phonePrefix: '225', provider: 'ORANGE_CIV' },
  { id: 'mtn_civ', name: 'MTN MoMo Ivory Coast', country: 'Ivory Coast', countryCode: '+225', currency: 'XOF', phonePrefix: '225', provider: 'MTN_MOMO_CIV' },
];

// Detect country from phone number
export function detectCountry(phone: string): { country: string; countryCode: string; currency: string } {
  const p = phone.replace(/[\s+]/g, '');
  if (p.startsWith('254')) return { country: 'Kenya', countryCode: '+254', currency: 'KES' };
  if (p.startsWith('256')) return { country: 'Uganda', countryCode: '+256', currency: 'UGX' };
  if (p.startsWith('255')) return { country: 'Tanzania', countryCode: '+255', currency: 'TZS' };
  if (p.startsWith('233')) return { country: 'Ghana', countryCode: '+233', currency: 'GHS' };
  if (p.startsWith('260')) return { country: 'Zambia', countryCode: '+260', currency: 'ZMW' };
  if (p.startsWith('250')) return { country: 'Rwanda', countryCode: '+250', currency: 'RWF' };
  if (p.startsWith('225')) return { country: 'Ivory Coast', countryCode: '+225', currency: 'XOF' };
  if (p.startsWith('234')) return { country: 'Nigeria', countryCode: '+234', currency: 'NGN' };
  if (p.startsWith('27')) return { country: 'South Africa', countryCode: '+27', currency: 'ZAR' };
  if (p.startsWith('263')) return { country: 'Zimbabwe', countryCode: '+263', currency: 'USD' };
  // Default to Kenya
  return { country: 'Kenya', countryCode: '+254', currency: 'KES' };
}

// Detect network from phone number
export function detectNetwork(phone: string): string {
  const stripped = phone.replace(/[\s+]/g, '');
  let p = stripped;
  if (p.startsWith('254')) p = p.substring(3);
  if (p.startsWith('0')) p = p.substring(1);
  if (p.length < 3) return 'unknown';
  const prefix = p.substring(0, 3);

  // Kenya Safaricom (M-Pesa)
  const safaricomPrefixes = ['700','701','702','703','704','705','706','707','708','709','710','711','712','713','714','715','716','717','718','719','720','721','722','723','724','725','726','727','728','729','740','741','742','743','744','745','746','747','748','749','750','751','752','753','754','755','756','757','758','759','760','761','762','763','764','765','768','769','790','791','792','793','794','795','796','797','798','799','110','111','112','113','114','115'];
  // Kenya Airtel
  const airtelKenyaPrefixes = ['730','731','732','733','734','735','736','737','738','739','750','751','752','753','754','755','756','757','758','759','770','771','772','773','774','775','776','777','778','779','100','101','102','103','104','105'];

  // Determine country first
  const country = detectCountry(phone);

  if (country.country === 'Kenya') {
    if (safaricomPrefixes.includes(prefix)) return 'M-Pesa Kenya';
    if (airtelKenyaPrefixes.includes(prefix)) return 'Airtel Money Kenya';
  }
  if (country.country === 'Uganda') {
    if (['77','78','76'].includes(prefix.substring(0, 2))) return 'MTN MoMo Uganda';
    if (['70','75'].includes(prefix.substring(0, 2))) return 'Airtel Money Uganda';
  }
  if (country.country === 'Tanzania') {
    if (['75','74','76'].includes(prefix.substring(0, 2))) return 'Vodacom M-Pesa Tanzania';
    if (['78','68','69'].includes(prefix.substring(0, 2))) return 'Airtel Money Tanzania';
  }
  if (country.country === 'Ghana') {
    if (['24','54','55'].includes(prefix.substring(0, 2))) return 'MTN MoMo Ghana';
    if (['20','50'].includes(prefix.substring(0, 2))) return 'Vodafone Cash Ghana';
  }
  if (country.country === 'Zambia') {
    if (['76','77','96','97'].includes(prefix.substring(0, 2))) return 'MTN MoMo Zambia';
    if (['95','97'].includes(prefix.substring(0, 2))) return 'Airtel Money Zambia';
  }
  if (country.country === 'Rwanda') {
    return 'MTN MoMo Rwanda';
  }
  if (country.country === 'Ivory Coast') {
    if (['07','05'].includes(prefix.substring(0, 2))) return 'Orange Money Ivory Coast';
    return 'MTN MoMo Ivory Coast';
  }

  return country.country + ' Mobile Money';
}

// Normalize phone to international format
export function normalizePhone(phone: string): string {
  const p = phone.replace(/[\s+]/g, '');
  if (p.startsWith('254')) return '+' + p;
  if (p.startsWith('256')) return '+' + p;
  if (p.startsWith('255')) return '+' + p;
  if (p.startsWith('233')) return '+' + p;
  if (p.startsWith('260')) return '+' + p;
  if (p.startsWith('250')) return '+' + p;
  if (p.startsWith('225')) return '+' + p;
  if (p.startsWith('234')) return '+' + p;
  if (p.startsWith('27')) return '+' + p;
  if (p.startsWith('263')) return '+' + p;
  // Kenya default
  if (p.startsWith('0')) return '+254' + p.substring(1);
  if (p.startsWith('7')) return '+254' + p;
  return phone;
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

export async function listGateways() {
  const response = await fetch(`${API_BASE}/gateways`, {
    headers: { 'X-API-Key': API_KEY },
  });
  const data = await response.json();
  return data.gateways || [];
}
