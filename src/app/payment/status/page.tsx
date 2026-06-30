'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, CheckCircle, XCircle, ArrowLeft, Smartphone, RefreshCw } from 'lucide-react';
import { formatKES } from '@/lib/utils';

function StatusContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference');
  const loanId = searchParams.get('loanId');

  const [status, setStatus] = useState<'loading' | 'completed' | 'failed' | 'pending' | 'error'>('loading');
  const [amount, setAmount] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    if (!reference) {
      setError('Missing payment reference');
      setStatus('error');
      return;
    }
    checkStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        // Auto-redirect to dashboard after 3 seconds
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 3000);
      } else if (data.status === 'failed') {
        setStatus('failed');
      } else {
        setStatus('pending');
        // Auto-poll every 2 seconds for instant updates
        setPollCount(c => c + 1);
        setTimeout(checkStatus, 2000);
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
              <div className="w-16 h-16 bg-mkopa-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Smartphone className="w-8 h-8 text-mkopa-green animate-pulse" />
              </div>
              <h2 className="font-bold text-lg mb-2">Check Your Phone!</h2>
              <p className="text-gray-500 text-sm mb-4">
                An M-Pesa/Airtel payment prompt has been sent to your phone. Enter your PIN to complete the payment.
              </p>
              {amount && <p className="text-2xl font-bold text-mkopa-green mb-3">{formatKES(amount)}</p>}
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-3">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Auto-checking every 2 seconds... ({pollCount})</span>
              </div>
              <p className="text-xs text-gray-400">Reference: {reference}</p>
              <button
                onClick={checkStatus}
                className="mt-4 text-sm text-mkopa-green font-semibold flex items-center gap-1 mx-auto hover:underline"
              >
                <RefreshCw className="w-3 h-3" /> Check Now
              </button>
            </>
          )}

          {status === 'completed' && (
            <>
              <CheckCircle className="w-16 h-16 text-mkopa-green mx-auto mb-4" />
              <h2 className="font-bold text-xl mb-2">Payment Successful!</h2>
              {amount && <p className="text-2xl font-bold text-mkopa-green mb-2">{formatKES(amount)}</p>}
              <p className="text-gray-500 text-sm mb-6">Your loan has been approved. Redirecting to dashboard...</p>
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
              {loanId && (
                <Link href={`/payment?loanId=${loanId}`} className="bg-mkopa-orange text-white px-6 py-3 rounded-lg font-semibold inline-block">
                  Try Again
                </Link>
              )}
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
