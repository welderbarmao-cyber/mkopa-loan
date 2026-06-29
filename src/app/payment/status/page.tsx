'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { formatKES } from '@/lib/utils';

function StatusContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference');
  const loanId = searchParams.get('loanId');

  const [status, setStatus] = useState<'loading' | 'completed' | 'failed' | 'pending' | 'error'>('loading');
  const [amount, setAmount] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!reference) {
      setError('Missing payment reference');
      setStatus('error');
      return;
    }
    checkStatus();
  }, [reference]);

  async function checkStatus() {
    try {
      const res = await fetch(`/api/payment/status?reference=${reference}&loanId=${loanId}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to fetch status');
        setStatus('error');
        return;
      }
      setAmount(parseFloat(data.amount));
      if (data.status === 'completed') {
        setStatus('completed');
      } else if (data.status === 'failed') {
        setStatus('failed');
      } else {
        setStatus('pending');
        // Auto-poll every 5 seconds for pending payments
        setTimeout(checkStatus, 5000);
      }
    } catch {
      setError('Network error');
      setStatus('error');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard" className="p-2 hover:bg-gray-200 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold">Payment Status</h1>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-16 h-16 text-mkopa-green animate-spin mx-auto mb-4" />
              <h2 className="font-bold text-lg mb-2">Checking Payment Status...</h2>
              <p className="text-gray-500 text-sm">Reference: {reference}</p>
            </>
          )}

          {status === 'pending' && (
            <>
              <Loader2 className="w-16 h-16 text-yellow-500 animate-spin mx-auto mb-4" />
              <h2 className="font-bold text-lg mb-2">Payment Pending</h2>
              <p className="text-gray-500 text-sm mb-4">
                Waiting for payment confirmation. Please complete the STK push on your phone.
              </p>
              <p className="text-xs text-gray-400">Auto-refreshing every 5 seconds...</p>
              <p className="text-xs text-gray-400 mt-2">Reference: {reference}</p>
            </>
          )}

          {status === 'completed' && (
            <>
              <CheckCircle className="w-16 h-16 text-mkopa-green mx-auto mb-4" />
              <h2 className="font-bold text-xl mb-2">Payment Successful!</h2>
              {amount && <p className="text-2xl font-bold text-mkopa-green mb-2">{formatKES(amount)}</p>}
              <p className="text-gray-500 text-sm mb-6">Your loan has been approved. Funds will be disbursed to your mobile money account.</p>
              <Link href="/dashboard" className="gradient-mkopa text-white px-6 py-3 rounded-lg font-semibold inline-block">
                Go to Dashboard
              </Link>
            </>
          )}

          {status === 'failed' && (
            <>
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="font-bold text-xl mb-2">Payment Failed</h2>
              <p className="text-gray-500 text-sm mb-6">The payment could not be completed. Please try again.</p>
              <Link href={`/payment?loanId=${loanId}`} className="bg-mkopa-orange text-white px-6 py-3 rounded-lg font-semibold inline-block">
                Try Again
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="font-bold text-xl mb-2">Error</h2>
              <p className="text-gray-500 text-sm mb-6">{error}</p>
              <Link href="/dashboard" className="gradient-mkopa text-white px-6 py-3 rounded-lg font-semibold inline-block">
                Go to Dashboard
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PaymentStatusPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-mkopa-green" />
      </div>
    }>
      <StatusContent />
    </Suspense>
  );
}
