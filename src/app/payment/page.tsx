'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ArrowLeft, Smartphone, CheckCircle, AlertCircle, Shield } from 'lucide-react';
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
  const [popupOpened, setPopupOpened] = useState(false);
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

  // Auto-poll for payment status when popup is opened
  useEffect(() => {
    if (!popupOpened || !reference) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payment/status?reference=${reference}&loanId=${loanId}`);
        const data = await res.json();
        if (data.status === 'completed') {
          clearInterval(pollInterval);
          router.push('/dashboard');
        } else if (data.status === 'failed') {
          clearInterval(pollInterval);
          setError('Payment failed. Please try again.');
          setPopupOpened(false);
        }
      } catch {}
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [popupOpened, reference, loanId, router]);

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

      // Open the payment checkout as a POPUP WINDOW on the customer's screen
      if (data.redirect_url) {
        setReference(data.reference);
        const popup = window.open(data.redirect_url, 'paymentPopup', 'width=500,height=700,scrollbars=yes,resizable=yes');

        if (popup) {
          setPopupOpened(true);
          // Focus the popup
          popup.focus();
        } else {
          // If popup blocked, redirect to status page with link
          setPopupOpened(true);
          // Open in same tab as fallback
          window.location.href = data.redirect_url;
        }
      }
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

        {/* Payment Form / Status */}
        {!popupOpened ? (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="font-bold mb-3">M-Pesa / Airtel Payment</h2>

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
                <><Loader2 className="w-5 h-5 animate-spin" /> Opening Payment...</>
              ) : (
                <><Smartphone className="w-5 h-5" /> Pay {formatKES(loan.activationFee)} Now</>
              )}
            </button>

            {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-blue-700 dark:text-blue-400">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4" />
                <p className="font-semibold">Secure Payment Popup</p>
              </div>
              <p>Click pay and a secure payment window will pop up on your screen. Complete the payment by entering your phone number and M-Pesa PIN on the popup.</p>
            </div>
          </div>
        ) : (
          /* Payment popup opened - show waiting status */
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <div className="w-16 h-16 bg-mkopa-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-mkopa-green animate-spin" />
            </div>
            <h2 className="font-bold text-lg mb-2">Complete Payment on Popup</h2>
            <p className="text-gray-500 text-sm mb-4">
              A payment window has opened on your screen. Please complete the payment there.
            </p>
            {reference && (
              <div className="bg-gray-50 rounded-lg p-2 mb-4">
                <p className="text-xs text-gray-500">Reference</p>
                <p className="font-mono text-sm font-semibold">{reference}</p>
              </div>
            )}
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Waiting for payment confirmation...</span>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/payment/status?reference=${reference}&loanId=${loanId}`}
                className="flex-1 gradient-mkopa text-white py-2 rounded-lg font-semibold text-sm"
              >
                Check Status
              </Link>
              <button
                onClick={() => setPopupOpened(false)}
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
