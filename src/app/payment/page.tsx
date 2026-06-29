'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ArrowLeft, Smartphone, CheckCircle, AlertCircle } from 'lucide-react';
import { formatKES } from '@/lib/utils';
import { detectNetwork } from '@/lib/xdigitex';

function PaymentContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const loanId = searchParams.get('loanId');

  const [loan, setLoan] = useState<{ id: number; amount: number; activationFee: number; activationFeeStatus: string; activationFeeReference?: string } | null>(null);
  const [phone, setPhone] = useState('');
  const [network, setNetwork] = useState<'safaricom' | 'airtel' | 'telkom' | 'unknown'>('unknown');
  const [loading, setLoading] = useState(true);
  const [initiating, setInitiating] = useState(false);
  const [error, setError] = useState('');
  const [paymentData, setPaymentData] = useState<{ reference: string; redirect_url?: string; checkout_url?: string; message?: string } | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?message=Please sign in to make payment');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user && loanId) {
      fetchLoanDetails();
    }
  }, [session, loanId]);

  useEffect(() => {
    if (phone) {
      setNetwork(detectNetwork(phone));
    }
  }, [phone]);

  async function fetchLoanDetails() {
    try {
      const res = await fetch('/api/dashboard');
      const data = await res.json();
      if (data.loans) {
        const found = data.loans.find((l: { id: number }) => l.id === parseInt(loanId || '0'));
        if (found) {
          setLoan(found);
          // Pre-fill phone from user data
          if (data.user?.phone) setPhone(data.user.phone);
        } else {
          setError('Loan not found');
        }
      }
    } catch {
      setError('Failed to load loan details');
    }
    setLoading(false);
  }

  async function handlePay(gateway: 'safaricom' | 'airtel') {
    setInitiating(true);
    setError('');
    try {
      const res = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanId: parseInt(loanId || '0'), gateway, phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Payment initiation failed');
        return;
      }
      setPaymentData({
        reference: data.reference,
        redirect_url: data.redirect_url,
        checkout_url: data.checkout_url,
        message: data.message,
      });
    } catch {
      setError('Network error');
    }
    setInitiating(false);
  }

  if (status === 'loading' || !session || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-mkopa-green" />
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">{error || 'Loan not found'}</p>
          <Link href="/dashboard" className="gradient-mkopa text-white px-6 py-2 rounded-lg font-semibold inline-block">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (loan.activationFeeStatus === 'paid') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-mkopa-green mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Payment Complete!</h1>
          <p className="text-gray-500 mb-6">Your activation fee has been paid. Your loan is now approved.</p>
          <Link href="/dashboard" className="gradient-mkopa text-white px-6 py-2 rounded-lg font-semibold inline-block">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard" className="p-2 hover:bg-gray-200 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold">Pay Activation Fee</h1>
        </div>

        {/* Payment Summary */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="font-bold mb-4">Payment Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500 text-sm">Loan Amount</span>
              <span className="font-medium text-sm">{formatKES(loan.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 text-sm">Loan ID</span>
              <span className="font-medium text-sm">#{loan.id}</span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between">
                <span className="font-semibold">Activation Fee</span>
                <span className="font-bold text-mkopa-orange text-lg">{formatKES(loan.activationFee)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        {!paymentData ? (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold mb-4">Choose Payment Method</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07XX XXX XXX or +2547XX XXX XXX"
                className="w-full border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-mkopa-green/30 focus:border-mkopa-green outline-none"
              />
              {phone && (
                <p className="text-xs mt-1">
                  Detected network: <span className="font-semibold capitalize text-mkopa-green">{network}</span>
                  {network === 'telkom' && <span className="text-orange-600"> (Telkom not supported for STK)</span>}
                  {network === 'unknown' && <span className="text-red-500"> (unrecognized)</span>}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handlePay('safaricom')}
                disabled={initiating || !phone || network === 'unknown'}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold disabled:opacity-40 flex items-center justify-center gap-2 hover:bg-green-700 transition"
              >
                <Smartphone className="w-5 h-5" />
                {initiating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Pay via M-Pesa (Safaricom)'}
              </button>

              <button
                onClick={() => handlePay('airtel')}
                disabled={initiating || !phone || network === 'unknown'}
                className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold disabled:opacity-40 flex items-center justify-center gap-2 hover:bg-red-700 transition"
              >
                <Smartphone className="w-5 h-5" />
                {initiating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Pay via Airtel Money'}
              </button>
            </div>

            {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

            <p className="text-xs text-gray-400 text-center mt-4">
              You&apos;ll receive an STK push prompt on your phone. Enter your M-Pesa/Airtel PIN to complete payment.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Smartphone className="w-8 h-8 text-yellow-600 animate-pulse" />
            </div>
            <h2 className="font-bold text-lg mb-2">Check Your Phone</h2>
            <p className="text-gray-500 text-sm mb-4">{paymentData.message || 'STK push sent. Enter your PIN to complete payment.'}</p>
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-xs text-gray-500">Reference</p>
              <p className="font-mono text-sm font-semibold">{paymentData.reference}</p>
            </div>
            <Link
              href={`/payment/status?reference=${paymentData.reference}&loanId=${loanId}`}
              className="block w-full gradient-mkopa text-white py-3 rounded-lg font-semibold"
            >
              Check Payment Status
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-mkopa-green" />
      </div>
    }>
      <PaymentContent />
    </Suspense>
  );
}
