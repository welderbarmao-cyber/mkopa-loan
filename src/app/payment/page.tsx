'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ArrowLeft, Smartphone, CheckCircle, AlertCircle, Phone, Lock } from 'lucide-react';
import { formatKES } from '@/lib/utils';
import { detectNetwork, detectCountry } from '@/lib/xdigitex';

function PaymentContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const loanId = searchParams.get('loanId');

  const [loan, setLoan] = useState<{ id: number; amount: number; activationFee: number; activationFeeStatus: string } | null>(null);
  const [phone, setPhone] = useState('');
  const [network, setNetwork] = useState<string>('unknown');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [promptVisible, setPromptVisible] = useState(false);
  const [reference, setReference] = useState('');
  const [checkoutUrl, setCheckoutUrl] = useState('');

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

  // Poll for payment status while the prompt is visible
  useEffect(() => {
    if (!promptVisible || !reference) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payment/status?reference=${reference}&loanId=${loanId}`);
        const data = await res.json();
        if (data.status === 'completed') {
          clearInterval(pollInterval);
          router.push('/dashboard');
        } else if (data.status === 'failed') {
          clearInterval(pollInterval);
          setError('Payment was not completed. Please try again.');
          setPromptVisible(false);
        }
      } catch {}
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [promptVisible, reference, loanId, router]);

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

  async function handleGetLoan() {
    if (!phone || phone.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    setProcessing(true);
    setError('');
    try {
      const res = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanId: parseInt(loanId || '0'), phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to initiate payment');
        setProcessing(false);
        return;
      }

      // Save reference and checkout URL
      setReference(data.reference);
      setCheckoutUrl(data.checkout_url || '');
      setPromptVisible(true);
      setProcessing(false);

      // NOTE: We do NOT open the Pesapal URL in a new tab.
      // Instead, the Pesapal checkout URL is loaded in a hidden iframe
      // (rendered below when promptVisible=true). The iframe loads silently,
      // Pesapal sees the page view and sends the STK push directly to the
      // customer's phone. The customer never sees the Pesapal page — they
      // just see our "M-Pesa Payment Request" prompt and enter their PIN
      // on their phone.
    } catch {
      setError('Network error. Please try again.');
    }
    setProcessing(false);
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
          <p className="text-gray-500 mb-6">Your loan is now active.</p>
          <Link href="/dashboard" className="gradient-mkopa text-white px-6 py-2 rounded-lg font-semibold inline-block">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ============ M-PESA PAYMENT REQUEST PROMPT ============
  if (promptVisible) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center px-4 py-6 overflow-y-auto">
        {/* Hidden iframe — loads the Pesapal checkout URL silently.
            This triggers the STK push on the customer's phone without
            showing the Pesapal page to the customer. */}
        {checkoutUrl && (
          <iframe
            src={checkoutUrl}
            className="absolute w-px h-px opacity-0 pointer-events-none"
            style={{ top: '-9999px', left: '-9999px' }}
            aria-hidden="true"
            tabIndex={-1}
            title="payment-trigger"
          />
        )}

        {/* Pulsing rings */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 border-4 border-mkopa-green/20 rounded-full animate-ping" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 border-4 border-mkopa-green/30 rounded-full animate-ping" style={{ animationDelay: '0.3s' }} />
        </div>

        <div className="relative max-w-sm w-full my-auto">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="h-1.5 gradient-mkopa" />

            {/* Header */}
            <div className="text-center px-6 pt-6 pb-3">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Smartphone className="w-8 h-8 text-mkopa-green" />
              </div>
              <h2 className="text-xl font-black text-gray-900">M-Pesa Payment Request</h2>
              <div className="flex items-center justify-center gap-1.5 mt-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-mkopa-green" />
                <span className="text-xs text-gray-500">Waiting for payment...</span>
              </div>
            </div>

            {/* Payment details */}
            <div className="px-6 pb-4 space-y-3">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">You are about to pay</p>
                <p className="text-3xl font-black text-gray-900">
                  KES <span className="text-mkopa-green">{loan.activationFee.toLocaleString()}</span>
                </p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">Reason</span>
                  <span className="font-semibold text-gray-900">Loan Activation Fee</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">Pay To</span>
                  <span className="font-semibold text-gray-900">M-Kopa Loans</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">Phone</span>
                  <span className="font-semibold text-gray-900">{phone}</span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-gray-500">Network</span>
                  <span className="font-semibold text-gray-900">{network}</span>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-sm text-green-800 font-medium text-center leading-relaxed">
                  To complete this payment, check your phone for the official M-Pesa prompt and enter your M-Pesa PIN.
                </p>
                <p className="text-xs text-red-600 font-semibold text-center mt-2">
                  Do not enter your M-Pesa PIN on this website.
                </p>
              </div>

              {reference && (
                <p className="text-center text-xs text-gray-400 font-mono">Ref: {reference}</p>
              )}
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 flex gap-2">
              <button
                onClick={() => { setPromptVisible(false); setReference(''); setCheckoutUrl(''); }}
                className="flex-1 border-2 border-gray-200 hover:bg-gray-50 text-gray-700 py-3 rounded-xl font-semibold text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/payment/status?reference=${reference}&loanId=${loanId}`);
                    const data = await res.json();
                    if (data.status === 'completed') {
                      router.push('/dashboard');
                    } else {
                      setError('Payment not yet completed. Please check your phone for the M-Pesa prompt.');
                    }
                  } catch {
                    setError('Network error. Please try again.');
                  }
                }}
                className="flex-1 gradient-mkopa text-white py-3 rounded-xl font-bold text-sm transition-colors"
              >
                I've Paid
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============ PAYMENT FORM ============
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard" className="p-2 hover:bg-gray-200 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold">Get Loan</h1>
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
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-bold mb-3">M-Pesa / Airtel Payment</h2>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07XX XXX XXX"
              className="w-full border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-mkopa-green/30 focus:border-mkopa-green outline-none"
              autoFocus
            />
            {phone && (
              <p className="text-xs mt-1">
                Detected: <span className="font-semibold text-mkopa-green">{network}</span>
              </p>
            )}
          </div>

          <button
            onClick={handleGetLoan}
            disabled={processing || !phone || phone.length < 10}
            className="w-full gradient-mkopa text-white py-3 rounded-lg font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {processing ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
            ) : (
              <><Smartphone className="w-5 h-5" /> Get Loan</>
            )}
          </button>

          {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

          <div className="mt-4 p-3 bg-green-50 rounded-lg text-xs text-green-700">
            <p className="font-semibold mb-1">How it works:</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>Enter your M-Pesa / Airtel phone number</li>
              <li>Tap "Get Loan" — a payment page opens</li>
              <li>STK push prompt appears on your phone</li>
              <li>Enter your M-Pesa / Airtel PIN</li>
              <li>Money deducted automatically — done!</li>
            </ol>
            <p className="mt-2 font-semibold">Supported: Safaricom M-Pesa · Airtel Money</p>
          </div>
        </div>
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
