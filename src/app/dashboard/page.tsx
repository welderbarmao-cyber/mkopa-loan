'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatKES } from '@/lib/utils';
import { Loader2, FileText, LogOut, ArrowRight, ShieldCheck, Clock, CheckCircle, AlertCircle, Wallet } from 'lucide-react';
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
  const activeLoans = data?.loans.filter(l => l.status === 'pending' || l.status === 'approved' || l.status === 'disbursed') || [];
  const unpaidLoans = data?.loans.filter(l => l.activationFeeStatus === 'unpaid') || [];

  const currentStep = kycStatus === 'approved'
    ? (loanLimit > 0 ? (hasActiveLoan ? 4 : 3) : 2)
    : (kycStatus === 'submitted' ? 1 : 0);

  const steps = [
    { num: 1, label: 'KYC', desc: 'Upload docs' },
    { num: 2, label: 'Review', desc: 'Admin verifies' },
    { num: 3, label: 'Limit', desc: 'Get limit' },
    { num: 4, label: 'Apply', desc: 'Apply & pay' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b px-4 h-14 flex items-center justify-between sticky top-0 z-40">
        <Link href="/" className="font-bold text-lg"><span className="text-mkopa-green">M-Kopa</span> Loans</Link>
        <div className="flex items-center gap-3">
          {kycStatus === 'approved' && loanLimit > 0 && (
            <Link href="/apply" className="gradient-mkopa text-white px-3 py-1.5 rounded-lg text-sm font-semibold">Apply</Link>
          )}
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-4">
        {/* Welcome */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Welcome, {session.user?.name?.split(' ')[0] || 'User'}</h1>
            <p className="text-gray-500 text-xs">{session.user?.email}</p>
          </div>
          <button
            onClick={fetchDashboard}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"
            title="Refresh"
          >
            <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-mkopa-green" />
          </div>
        )}

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        {data && (
          <div className="space-y-4">
            {/* Progress Flow - Compact */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-sm">Your Loan Journey</h2>
                <span className="text-xs text-gray-400">Step {currentStep + 1} of 4</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {steps.map((step, i) => {
                  const isComplete = i < currentStep;
                  const isCurrent = i === currentStep;
                  return (
                    <div key={step.num} className="text-center">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm mx-auto mb-1.5 ${
                        isComplete ? 'bg-mkopa-green text-white' :
                        isCurrent ? 'bg-mkopa-orange text-white animate-pulse' :
                        'bg-gray-200 text-gray-400'
                      }`}>
                        {isComplete ? <CheckCircle className="w-5 h-5" /> : step.num}
                      </div>
                      <p className={`text-xs font-semibold ${isComplete || isCurrent ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</p>
                      <p className="text-xs text-gray-400 hidden sm:block">{step.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status Cards - 3 columns */}
            <div className="grid grid-cols-3 gap-3">
              {/* KYC Status */}
              <div className="bg-white rounded-xl p-3 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <ShieldCheck className={`w-5 h-5 ${kycStatus === 'approved' ? 'text-mkopa-green' : kycStatus === 'submitted' ? 'text-amber-500' : kycStatus === 'rejected' ? 'text-red-500' : 'text-gray-400'}`} />
                  <KycStatusBadge status={kycStatus} />
                </div>
                <h3 className="font-bold text-xs">KYC Verification</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {kycStatus === 'none' && 'Upload to start'}
                  {kycStatus === 'submitted' && 'Under review'}
                  {kycStatus === 'approved' && 'Complete'}
                  {kycStatus === 'rejected' && 'Resubmit'}
                </p>
                {kycStatus !== 'approved' && (
                  <Link href="/kyc" className="mt-2 inline-block text-xs text-mkopa-green font-semibold hover:underline">
                    {kycStatus === 'rejected' ? 'Resubmit' : 'Start'} →
                  </Link>
                )}
              </div>

              {/* Loan Limit */}
              <div className="bg-white rounded-xl p-3 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <Wallet className={`w-5 h-5 ${loanLimit > 0 ? 'text-mkopa-green' : 'text-gray-400'}`} />
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${loanLimit > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {loanLimit > 0 ? '✓' : '—'}
                  </span>
                </div>
                <h3 className="font-bold text-xs">Loan Limit</h3>
                <p className="text-lg font-bold text-mkopa-green mt-0.5">
                  {loanLimit > 0 ? formatKES(loanLimit) : '—'}
                </p>
                <p className="text-xs text-gray-500">
                  {loanLimit > 0 ? 'Available' : 'After KYC'}
                </p>
              </div>

              {/* Active Loans */}
              <div className="bg-white rounded-xl p-3 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <FileText className="w-5 h-5 text-blue-500" />
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold bg-gray-100 text-gray-600">
                    {data.loans.length}
                  </span>
                </div>
                <h3 className="font-bold text-xs">My Loans</h3>
                <p className="text-lg font-bold text-gray-900 mt-0.5">{activeLoans.length}</p>
                <p className="text-xs text-gray-500">Active</p>
              </div>
            </div>

            {/* Action Banner */}
            <ActionBanner
              kycStatus={kycStatus}
              loanLimit={loanLimit}
              hasActiveLoan={hasActiveLoan}

            />

            {/* Unpaid Loans Alert */}
            {unpaidLoans.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-orange-700">Activation Fee Pending</p>
                    <p className="text-xs text-orange-600">Pay to activate loan #{unpaidLoans[0].id}</p>
                  </div>
                </div>
                <Link
                  href={`/payment?loanId=${unpaidLoans[0].id}`}
                  className="bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
                >
                  Pay Now
                </Link>
              </div>
            )}

            {/* Loans List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-sm">Your Loans</h3>
                {kycStatus === 'approved' && loanLimit > 0 && (
                  <Link href="/apply" className="text-xs text-mkopa-green font-semibold hover:underline">
                    + New Loan
                  </Link>
                )}
              </div>
              {data.loans.length === 0 ? (
                <div className="bg-white rounded-xl p-6 shadow-sm text-center">
                  <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm mb-3">No loans yet</p>
                  {kycStatus === 'approved' && loanLimit > 0 ? (
                    <Link href="/apply" className="gradient-mkopa text-white px-4 py-2 rounded-lg text-sm font-semibold inline-block">
                      Apply Now
                    </Link>
                  ) : kycStatus !== 'approved' ? (
                    <Link href="/kyc" className="text-mkopa-green text-sm font-semibold hover:underline">
                      Complete KYC first →
                    </Link>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-2">
                  {data.loans.map(loan => (
                    <div key={loan.id} className="bg-white rounded-xl p-3 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm capitalize">{loan.productType.replace('_', ' ')}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[loan.status] || 'bg-gray-100'}`}>
                              {loan.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>{formatKES(loan.amount)}</span>
                            <span>·</span>
                            <span>{loan.termMonths}mo</span>
                            <span>·</span>
                            <span>#{loan.id}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {loan.activationFeeStatus === 'unpaid' && (
                            <Link
                              href={`/payment?loanId=${loan.id}`}
                              className="text-xs bg-mkopa-orange text-white px-2 py-1 rounded font-semibold"
                            >
                              Pay Fee
                            </Link>
                          )}
                          {loan.activationFeeStatus === 'pending' && (
                            <Link
                              href={`/payment/status?reference=${loan.activationFeeReference}&loanId=${loan.id}`}
                              className="text-xs text-yellow-600 font-semibold"
                            >
                              Check Status
                            </Link>
                          )}
                          {loan.activationFeeStatus === 'paid' && (
                            <span className="text-xs text-green-600 font-semibold flex items-center gap-0.5">
                              <CheckCircle className="w-3 h-3" /> Paid
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function KycStatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    none: { color: 'bg-gray-100 text-gray-600', label: 'None' },
    submitted: { color: 'bg-yellow-100 text-yellow-700', label: 'Pending' },
    approved: { color: 'bg-green-100 text-green-700', label: 'Approved' },
    rejected: { color: 'bg-red-100 text-red-700', label: 'Rejected' },
  };
  const c = config[status] || config.none;
  return <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${c.color}`}>{c.label}</span>;
}

function ActionBanner({ kycStatus, loanLimit, hasActiveLoan }: { kycStatus: string; loanLimit: number; hasActiveLoan: boolean }) {
  if (kycStatus === 'approved' && loanLimit > 0 && !hasActiveLoan) {
    return (
      <div className="gradient-mkopa text-white rounded-xl p-4 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm">Ready to borrow up to {formatKES(loanLimit)}!</h3>
          <p className="text-xs opacity-90 mt-0.5">Apply now and pay activation fee via M-Pesa STK push.</p>
        </div>
        <Link href="/apply" className="bg-mkopa-orange text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-1 flex-shrink-0">
          Apply <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    );
  }
  if (kycStatus === 'rejected') {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm">KYC Rejected</h3>
          <p className="text-xs mt-0.5">Please resubmit your documents.</p>
        </div>
        <Link href="/kyc" className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold">
          Resubmit
        </Link>
      </div>
    );
  }
  if (kycStatus === 'submitted') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-xl p-3 flex items-center gap-2">
        <Clock className="w-4 h-4 flex-shrink-0" />
        <div>
          <h3 className="font-bold text-sm">KYC Under Review</h3>
          <p className="text-xs">Admin will review within 24 hours.</p>
        </div>
      </div>
    );
  }
  if (kycStatus === 'none') {
    return (
      <div className="gradient-mkopa text-white rounded-xl p-4 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm">Complete KYC Verification</h3>
          <p className="text-xs opacity-90 mt-0.5">Upload your National ID or Passport to start.</p>
        </div>
        <Link href="/kyc" className="bg-mkopa-orange text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-1 flex-shrink-0">
          Start <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    );
  }
  if (kycStatus === 'approved' && loanLimit === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-xl p-3 flex items-center gap-2">
        <Clock className="w-4 h-4 flex-shrink-0" />
        <div>
          <h3 className="font-bold text-sm">KYC Approved! Waiting for Loan Limit</h3>
          <p className="text-xs">Admin will assign your limit shortly.</p>
        </div>
      </div>
    );
  }
  return null;
}
