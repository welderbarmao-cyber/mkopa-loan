'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatKES } from '@/lib/utils';
import { Loader2, FileText, LogOut, ArrowRight, ShieldCheck, Clock, CheckCircle, XCircle, AlertCircle, Wallet } from 'lucide-react';
import { signOut } from 'next-auth/react';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  disbursed: 'bg-blue-100 text-blue-700',
};

interface DashboardData {
  user: {
    id: number;
    name: string;
    email: string;
    phone: string;
    kycStatus: 'none' | 'submitted' | 'approved' | 'rejected';
    loanLimit: number;
    kycReviewedAt?: string;
    kycRejectionReason?: string;
  };
  loans: Array<{
    id: number;
    amount: number;
    termMonths: number;
    productType: string;
    status: string;
    activationFee: number;
    activationFeeStatus: string;
    activationFeeReference?: string;
    createdAt: string;
  }>;
  kyc: Array<{
    id: number;
    documentType: string;
    status: string;
    uploadedAt: string;
  }>;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?message=Please sign in to access your dashboard');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.email) {
      fetchDashboard();
    }
  }, [session]);

  async function fetchDashboard() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/dashboard');
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to load dashboard');
        return;
      }
      setData(json);
    } catch {
      setError('Network error');
    }
    setLoading(false);
  }

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-mkopa-green" />
      </div>
    );
  }

  const user = data?.user;
  const kycStatus = user?.kycStatus || 'none';
  const loanLimit = user?.loanLimit || 0;
  const hasActiveLoan = data?.loans.some(l => l.status === 'approved' || l.status === 'pending') || false;

  // Determine current step in the flow
  const currentStep = kycStatus === 'approved'
    ? (loanLimit > 0 ? (hasActiveLoan ? 4 : 3) : 2)
    : (kycStatus === 'submitted' ? 1 : 0);

  const steps = [
    { num: 1, label: 'KYC Verification', desc: 'Upload your documents' },
    { num: 2, label: 'Admin Review', desc: 'We verify your documents' },
    { num: 3, label: 'Loan Limit', desc: 'Get your assigned limit' },
    { num: 4, label: 'Apply & Pay', desc: 'Apply and pay activation fee' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b px-4 h-16 flex items-center justify-between sticky top-0 z-40">
        <Link href="/" className="font-bold text-xl"><span className="text-mkopa-green">M-Kopa</span> Loans</Link>
        <div className="flex items-center gap-4">
          <Link href="/apply" className="gradient-mkopa text-white px-4 py-2 rounded-lg text-sm font-semibold">Apply for Loan</Link>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-4">
        {/* Welcome */}
        <div className="mb-4">
          <h1 className="text-xl font-bold mb-1">Welcome, {session.user?.name || 'User'}</h1>
          <p className="text-gray-500 text-sm">{session.user?.email}</p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-mkopa-green" />
          </div>
        )}

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        {data && (
          <>
            {/* Progress Flow */}
            <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
              <h2 className="font-bold text-sm mb-3">Your Loan Journey</h2>
              <div className="grid grid-cols-4 gap-2">
                {steps.map((step, i) => {
                  const isComplete = i < currentStep;
                  const isCurrent = i === currentStep;
                  const isLocked = i > currentStep;
                  return (
                    <div key={step.num} className="relative">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mb-2 text-sm ${
                        isComplete ? 'bg-mkopa-green text-white' :
                        isCurrent ? 'bg-mkopa-orange text-white animate-pulse' :
                        'bg-gray-200 text-gray-400'
                      }`}>
                        {isComplete ? <CheckCircle className="w-4 h-4" /> : step.num}
                      </div>
                      <h3 className={`font-semibold text-xs ${isLocked ? 'text-gray-400' : 'text-gray-900'}`}>{step.label}</h3>
                      <p className={`text-xs mt-0.5 hidden sm:block ${isLocked ? 'text-gray-300' : 'text-gray-500'}`}>{step.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {/* KYC Status */}
              <div className="bg-white rounded-xl p-3 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <ShieldCheck className="w-5 h-5 text-mkopa-green" />
                  <KycStatusBadge status={kycStatus} />
                </div>
                <h3 className="font-bold text-sm">KYC Verification</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {kycStatus === 'none' && 'Upload your documents to start'}
                  {kycStatus === 'submitted' && 'Under review by admin'}
                  {kycStatus === 'approved' && 'Verification complete'}
                  {kycStatus === 'rejected' && 'Please resubmit your documents'}
                </p>
                {kycStatus !== 'approved' && (
                  <Link href="/kyc" className="mt-3 inline-block text-xs text-mkopa-green font-semibold hover:underline">
                    {kycStatus === 'rejected' ? 'Resubmit KYC' : 'Complete KYC'} →
                  </Link>
                )}
              </div>

              {/* Loan Limit */}
              <div className="bg-white rounded-xl p-3 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <Wallet className="w-5 h-5 text-mkopa-orange" />
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    loanLimit > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {loanLimit > 0 ? 'Assigned' : 'Pending'}
                  </span>
                </div>
                <h3 className="font-bold text-sm">Loan Limit</h3>
                <p className="text-xl font-bold text-mkopa-green mt-1">
                  {loanLimit > 0 ? formatKES(loanLimit) : '—'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {loanLimit > 0 ? 'Max you can borrow' : 'After KYC approval'}
                </p>
              </div>

              {/* Active Loans */}
              <div className="bg-white rounded-xl p-3 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <FileText className="w-5 h-5 text-blue-500" />
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-gray-100 text-gray-600">
                    {data.loans.length} total
                  </span>
                </div>
                <h3 className="font-bold text-sm">Loan Applications</h3>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {data.loans.filter(l => l.status === 'pending' || l.status === 'approved').length}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Active applications</p>
              </div>
            </div>

            {/* Action Banner */}
            <ActionBanner
              kycStatus={kycStatus}
              loanLimit={loanLimit}
              hasActiveLoan={hasActiveLoan}
            />

            {/* Loans List */}
            <div className="mt-4">
              <h3 className="font-bold mb-3">Your Loans</h3>
              {data.loans.length === 0 ? (
                <div className="bg-white rounded-xl p-8 shadow-sm text-center">
                  <p className="text-gray-400 text-sm mb-4">No loan applications yet.</p>
                  {kycStatus === 'approved' && loanLimit > 0 && (
                    <Link href="/apply" className="gradient-mkopa text-white px-6 py-2 rounded-lg text-sm font-semibold inline-block">
                      Apply Now
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {data.loans.map(loan => (
                    <div key={loan.id} className="bg-white rounded-xl p-5 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold capitalize">{loan.productType.replace('_', ' ')} Loan</div>
                          <div className="text-sm text-gray-500">{formatKES(loan.amount)} · {loan.termMonths} months</div>
                          <div className="text-xs text-gray-400 mt-1">{new Date(loan.createdAt).toLocaleString()}</div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[loan.status] || 'bg-gray-100'}`}>
                            {loan.status}
                          </span>
                          {loan.activationFeeStatus === 'unpaid' && (
                            <Link href={`/payment?loanId=${loan.id}`} className="text-xs text-mkopa-orange font-semibold hover:underline">
                              Pay Activation Fee →
                            </Link>
                          )}
                          {loan.activationFeeStatus === 'pending' && (
                            <Link href={`/payment/status?reference=${loan.activationFeeReference}&loanId=${loan.id}`} className="text-xs text-yellow-600 font-semibold hover:underline">
                              Check Payment Status →
                            </Link>
                          )}
                          {loan.activationFeeStatus === 'paid' && (
                            <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Fee Paid
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function KycStatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; icon: React.ReactNode }> = {
    none: { color: 'bg-gray-100 text-gray-600', icon: <AlertCircle className="w-3 h-3" /> },
    submitted: { color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-3 h-3" /> },
    approved: { color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
    rejected: { color: 'bg-red-100 text-red-700', icon: <XCircle className="w-3 h-3" /> },
  };
  const c = config[status] || config.none;
  return (
    <span className={`text-xs px-2 py-1 rounded-full font-semibold flex items-center gap-1 ${c.color}`}>
      {c.icon} {status}
    </span>
  );
}

function ActionBanner({ kycStatus, loanLimit, hasActiveLoan }: { kycStatus: string; loanLimit: number; hasActiveLoan: boolean }) {
  if (kycStatus === 'approved' && loanLimit > 0 && !hasActiveLoan) {
    return (
      <div className="gradient-mkopa text-white rounded-xl p-6 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg">You&apos;re approved to borrow up to {formatKES(loanLimit)}!</h3>
          <p className="text-sm opacity-90 mt-1">Apply for a loan now and pay the activation fee via M-Pesa or Airtel STK push.</p>
        </div>
        <Link href="/apply" className="bg-mkopa-orange text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 hover:opacity-90 transition">
          Apply Now <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }
  if (kycStatus === 'rejected') {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-6 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg">KYC Verification Rejected</h3>
          <p className="text-sm mt-1">Please resubmit your documents to continue.</p>
        </div>
        <Link href="/kyc" className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition">
          Resubmit KYC
        </Link>
      </div>
    );
  }
  if (kycStatus === 'submitted') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-xl p-6">
        <h3 className="font-bold text-lg flex items-center gap-2"><Clock className="w-5 h-5" /> KYC Under Review</h3>
        <p className="text-sm mt-1">Our admin team is reviewing your documents. This usually takes 24 hours.</p>
      </div>
    );
  }
  if (kycStatus === 'none') {
    return (
      <div className="gradient-mkopa text-white rounded-xl p-6 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg">Complete Your KYC Verification</h3>
          <p className="text-sm opacity-90 mt-1">Upload your National ID or Passport to start your loan journey.</p>
        </div>
        <Link href="/kyc" className="bg-mkopa-orange text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 hover:opacity-90 transition">
          Start KYC <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }
  if (kycStatus === 'approved' && loanLimit === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-xl p-6">
        <h3 className="font-bold text-lg">KYC Approved! Waiting for Loan Limit</h3>
        <p className="text-sm mt-1">Our admin team will assign your loan limit shortly. Check back soon.</p>
      </div>
    );
  }
  return null;
}
