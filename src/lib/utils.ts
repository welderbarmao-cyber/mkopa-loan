// =====================================================
// M-Kopa Loan Utilities
// =====================================================

export function calculateLoanFee(amount: number): number {
  return Math.ceil(amount * (179 / 5000)); // 3.58%
}

// Activation fee: 5000 -> KES 199
// Formula: amount / 5000 * 199, rounded up, min 199
export function calculateActivationFee(amount: number): number {
  if (amount <= 0) return 0;
  // KES 199 per 5000 borrowed
  const fee = Math.ceil((amount / 5000) * 199);
  return Math.max(fee, 199);
}

export function formatKES(n: number): string {
  return 'KES ' + n.toLocaleString('en-KE');
}

export function calculateRepayment(principal: number, annualRate: number, months: number) {
  const total = Math.round(principal * (1 + (annualRate / 100) * (months / 12)));
  const monthly = Math.round(total / months);
  const interest = total - principal;
  return { total, monthly, interest };
}

export const LOAN_PRODUCTS = [
  { id: 'personal', name: 'Personal Loan', rate: 12.5, min: 5000, max: 500000, minTerm: 3, maxTerm: 36 },
  { id: 'business', name: 'Business Loan', rate: 15.0, min: 5000, max: 500000, minTerm: 6, maxTerm: 48 },
  { id: 'emergency', name: 'Emergency Loan', rate: 18.0, min: 5000, max: 500000, minTerm: 1, maxTerm: 12 },
  { id: 'education', name: 'Education Loan', rate: 10.0, min: 5000, max: 500000, minTerm: 6, maxTerm: 60 },
  { id: 'asset', name: 'Asset Financing', rate: 14.0, min: 5000, max: 500000, minTerm: 12, maxTerm: 60 },
];
