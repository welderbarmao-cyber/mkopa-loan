'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatKES } from '@/lib/utils';
import { Loader2, FileText, LogOut, ArrowRight } from 'lucide-react';
import { signOut } from 'next-auth/react';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

interface LoanData {
  id: number;
  amount: number;
  termMonths: number;
  productType: string;
  status: string;
  createdAt: string;
}

interface KycData {
  id: number;
  documentType: string;
  status: string;
  uploadedAt: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    user: { id: number; name: string; email: string; phone: string };
    loans: LoanData[];
    kyc: KycData[];
  } | null>(null);
  const [error, setError] = useState('');

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?message=Please sign in to access your dashboard');
    }
  }, [status, router]);

  // Fetch dashboard data when session is available
  useEffect(() => {
    if (session?.user?.email) {
      fetchDashboard(session.user.email);
    }
  }, [session]);

  async function fetchDashboard(email: string) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/dashboard?email=${encodeURIComponent(email)}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Not found');
        setData(null);
        return;
      }
      setData(json);
    } catch {
      setError('Network error');
    }
    setLoading(false);
  }

  // Loading state while checking auth
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-mkopa-green" />
      </div>
    );
  }

  // Not authenticated — will redirect via useEffect
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-mkopa-green" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl"><span className="text-mkopa-green">M-Kopa</span> Loans</Link>
        <div className="flex items-center gap-4">
          <Link href="/apply" className="gradient-mkopa text-white px-4 py-2 rounded-lg text-sm font-semibold">Apply</Link>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Welcome section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Welcome, {session.user?.name || 'User'}</h1>
          <p className="text-gray-500 text-sm">{session.user?.email}</p>
        </div>

        {loading && !data && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-mkopa-green" />
          </div>
        )}

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        {data && (
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="grid sm:grid-cols-2 gap-4">
              <Link href="/apply" className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition border flex items-center justify-between group">
                <div>
                  <h3 className="font-bold text-lg">Apply for a Loan</h3>
                  <p className="text-gray-500 text-sm mt-1">Start a new loan application</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-mkopa-green transition" />
              </Link>
              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <h3 className="font-bold text-lg">Account Status</h3>
                <p className="text-gray-500 text-sm mt-1">
                  {data.kyc.length > 0
                    ? `${data.kyc.filter(d => d.status === 'approved').length}/${data.kyc.length} KYC docs approved`
                    : 'No KYC documents uploaded yet'}
                </p>
              </div>
            </div>

            {/* Loans */}
            <div>
              <h3 className="font-bold mb-3">Your Loans</h3>
              {data.loans.length === 0 ? (
                <div className="bg-white rounded-xl p-8 shadow-sm text-center">
                  <p className="text-gray-400 text-sm mb-4">You haven&apos;t applied for any loans yet.</p>
                  <Link href="/apply" className="gradient-mkopa text-white px-6 py-2 rounded-lg text-sm font-semibold inline-block">
                    Apply Now
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.loans.map((loan) => (
                    <div key={loan.id} className="bg-white rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold capitalize">{loan.productType.replace('_', ' ')} Loan</div>
                        <div className="text-sm text-gray-500">{formatKES(loan.amount)} · {loan.termMonths} months</div>
                        <div className="text-xs text-gray-400 mt-1">{new Date(loan.createdAt).toLocaleDateString()}</div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[loan.status] || 'bg-gray-100'}`}>
                        {loan.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* KYC Status */}
            {data.kyc.length > 0 && (
              <div>
                <h3 className="font-bold mb-3">KYC Documents</h3>
                <div className="space-y-2">
                  {data.kyc.map((doc) => (
                    <div key={doc.id} className="bg-white rounded-lg p-4 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="capitalize text-sm">{doc.documentType.replace('_', ' ')}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[doc.status]}`}>
                        {doc.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
