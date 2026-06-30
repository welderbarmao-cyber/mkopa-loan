'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ArrowLeft, Smartphone, CheckCircle, AlertCircle, Bell, Phone } from 'lucide-react';
import { formatKES } from '@/lib/utils';
import { detectNetwork } from '@/lib/xdigitex';

function PaymentContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const loanId = searchParams.get('loanId');

  const [loan, setLoan] = useState<{ id: number; amount: number; activationFee: number; activationFeeStatus: string } | null>(null);
  const [phone, setPhone] = useState('');
  const [network, setNetwork] = useState<'safaricom' | 'airtel' | 'telkom' | 'unknown'>('unknown');
  const [loading, setLoading] = useState(true);
  const [initiating, setInitiating] = useState(false);
  const [error, setError] = useState('');
  const [stkSent, setStkSent] = useState(false);
  const [reference, setReference] = useState('');

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

  // Auto-poll for payment status when STK is sent
  useEffect(() => {
    if (!stkSent || !reference) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payment/status?reference=${reference}&loanId=${loanId}`);
        const data = await res.json();
        if (data.status === 'completed') {
          clearInterval(pollInterval);
          router.push('/dashboard');
        } else if (data.status === 'failed') {
          clearInterval(pollInterval);
          setError('Payment failed or timed out. Please try again.');
          setStkSent(false);
        }
      } catch {}
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [stkSent, reference, loanId, router]);

  async function fetchLoanDetails() {
    try {
      const res = await fetch('/api/dashboard');
      const data = await res.json();
      if (data.loans) {
        const found = data.loans.find((l: { id: number }) => l.id === parseInt(loanId || '0'));
        if (found) {
          setLoan(found);
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

  async function handlePay() {
    if (!phone || phone.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }
    if (network === 'unknown' || network === 'telkom') {
      setError('Please enter a valid Safaricom or Airtel phone number');
      return;
    }

    setInitiating(true);
    setError('');
    try {
      const res = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanId: parseInt(loanId || '0'), phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Payment initiation failed');
        setInitiating(false);
        return;
      }

      // STK push sent - show "check your phone" message
      setReference(data.reference);
      setStkSent(true);
    } catch {
      setError('Network error. Please try again.');
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
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Activation Fee</p>
              <p className="text-xl font-bold text-mkopa-orange">{formatKES(loan.activationFee)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Loan #{loan.id}</p>
              <p className="text-sm font-medium">{formatKES(loan.amount)}</p>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        {!stkSent ? (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="font-bold mb-3">M-Pesa STK Push</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07XX XXX XXX or +2547XX XXX XXX"
                className="w-full border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-mkopa-green/30 focus:border-mkopa-green outline-none"
                autoFocus
              />
              {phone && (
                <p className="text-xs mt-1">
                  Detected: <span className="font-semibold capitalize text-mkopa-green">{network}</span>
                  {(network === 'telkom' || network === 'unknown') && (
                    <span className="text-red-500"> (Safaricom or Airtel only)</span>
                  )}
                </p>
              )}
            </div>

            <button
              onClick={handlePay}
              disabled={initiating || !phone || network === 'unknown' || network === 'telkom'}
              className="w-full gradient-mkopa text-white py-3 rounded-lg font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {initiating ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Sending STK Push...</>
              ) : (
                <><Smartphone className="w-5 h-5" /> Send STK Push to {phone || 'Phone'}</>
              )}
            </button>

            {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
              <p className="font-semibold mb-1">How STK Push works:</p>
              <ol className="list-decimal list-inside space-y-0.5">
                <li>Enter your M-Pesa phone number</li>
                <li>Click &quot;Send STK Push&quot;</li>
                <li>An M-Pesa prompt appears ON YOUR PHONE</li>
                <li>Enter your M-Pesa PIN on your phone</li>
                <li>Payment completes automatically</li>
              </ol>
            </div>
          </div>
        ) : (
          /* STK Push Sent - Check Your Phone */
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            {/* Animated phone icon */}
            <div className="relative w-20 h-20 mx-auto mb-4">
              <div className="absolute inset-0 bg-mkopa-green/20 rounded-full animate-ping" />
              <div className="relative w-20 h-20 bg-mkopa-green rounded-full flex items-center justify-center">
                <Smartphone className="w-10 h-10 text-white" />
              </div>
              {/* Notification badge */}
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-mkopa-orange rounded-full flex items-center justify-center animate-bounce">
                <Bell className="w-3.5 h-3.5 text-white" />
              </div>
            </div>

            <h2 className="font-bold text-lg mb-2">CHECK YOUR PHONE!</h2>
            <p className="text-gray-700 text-sm mb-2 font-medium">
              An M-Pesa payment prompt has been sent to:
            </p>
            <p className="text-xl font-bold text-mkopa-green mb-3 flex items-center justify-center gap-1">
              <Phone className="w-4 h-4" /> {phone}
            </p>
            <p className="text-gray-500 text-xs mb-4">
              Enter your M-Pesa PIN on your phone to complete payment of <strong>{formatKES(loan.activationFee)}</strong>
            </p>

            {reference && (
              <div className="bg-gray-50 rounded-lg p-2 mb-4">
                <p className="text-xs text-gray-500">Reference</p>
                <p className="font-mono text-sm font-semibold">{reference}</p>
              </div>
            )}

            {/* Auto-polling indicator */}
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Waiting for payment confirmation...</span>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-yellow-700">
                <strong>⏱️ Important:</strong> The M-Pesa prompt will appear on your phone within 30 seconds. 
                If you don&apos;t see it, check your SMS or dial <strong>*150#</strong> to check pending payments.
              </p>
            </div>

            <div className="flex gap-2">
              <Link
                href={`/payment/status?reference=${reference}&loanId=${loanId}`}
                className="flex-1 gradient-mkopa text-white py-2 rounded-lg font-semibold text-sm"
              >
                Check Status
              </Link>
              <button
                onClick={() => { setStkSent(false); setReference(''); }}
                className="px-4 py-2 border rounded-lg font-semibold text-sm"
              >
                Cancel
              </button>
            </div>
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
