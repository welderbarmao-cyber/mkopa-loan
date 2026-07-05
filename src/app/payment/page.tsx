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

      // STK push sent directly to phone via PawaPay — no checkout page,
      // no iframe, no on-screen PIN entry. The customer just sees the
      // "prompt sent" message and enters their M-Pesa PIN on their phone.
      setReference(data.reference);
      setPromptVisible(true);
      setProcessing(false);
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

  // ============ STK PUSH SENT — CHECK YOUR PHONE ============
  if (promptVisible) {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-mkopa-green to-green-700 flex items-center justify-center px-4 py-6 overflow-y-auto">
        {/* Pulsing rings */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 border-4 border-white/20 rounded-full animate-ping" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 border-4 border-white/30 rounded-full animate-ping" style={{ animationDelay: '0.3s' }} />
        </div>

        <div className="relative max-w-sm w-full text-center text-white my-auto">
          {/* Phone icon with notification badge */}
          <div className="relative w-28 h-28 mx-auto mb-6">
            <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse" />
            <div className="relative w-28 h-28 bg-white rounded-full flex items-center justify-center shadow-2xl">
              <Smartphone className="w-14 h-14 text-mkopa-green" />
            </div>
            <div className="absolute -top-2 -right-2 w-10 h-10 bg-mkopa-orange rounded-full flex items-center justify-center animate-bounce shadow-lg">
              <Phone className="w-5 h-5 text-white" />
            </div>
          </div>

          <h2 className="text-3xl font-black mb-2">CHECK YOUR PHONE</h2>
          <p className="text-white/80 text-sm mb-3">
            An M-Pesa prompt has been sent to:
          </p>

          {/* Editable phone number */}
          <div className="bg-white/15 backdrop-blur rounded-xl p-3 mb-4 border border-white/20">
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-white/70 flex-shrink-0" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07XX XXX XXX"
                className="flex-1 bg-transparent text-white text-xl font-bold text-center border-0 outline-none placeholder-white/40 focus:ring-0"
              />
            </div>
            {phone && (
              <p className="text-white/60 text-xs mt-1 text-center">
                Detected: {network}
              </p>
            )}
          </div>

          {/* Resend button — re-triggers STK push with the (possibly edited) number */}
          <button
            onClick={async () => {
              if (!phone || phone.length < 10) return;
              setProcessing(true);
              try {
                const res = await fetch('/api/payment/initiate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ loanId: parseInt(loanId || '0'), phone }),
                });
                const data = await res.json();
                if (res.ok && data.reference) {
                  setReference(data.reference);
                }
              } catch {}
              setProcessing(false);
            }}
            disabled={processing || !phone || phone.length < 10}
            className="w-full bg-mkopa-orange hover:bg-mkopa-orange/90 text-white py-2.5 rounded-lg font-semibold text-sm disabled:opacity-40 transition-colors flex items-center justify-center gap-2 mb-4"
          >
            {processing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Resending...</>
            ) : (
              <>Retry Application</>
            )}
          </button>

          {/* Amount */}
          <div className="bg-white/15 backdrop-blur rounded-xl p-4 mb-4 border border-white/20">
            <p className="text-white/70 text-xs mb-1">Amount to pay</p>
            <p className="text-3xl font-black text-white">
              KES <span className="text-mkopa-orange">{loan.activationFee.toLocaleString()}</span>
            </p>
            <p className="text-white/70 text-xs mt-1">Loan Activation Fee · M-Kopa Loans</p>
          </div>

          {/* Instructions */}
          <div className="bg-white/15 backdrop-blur rounded-xl p-3 mb-4 border border-white/20">
            <p className="text-white text-sm font-medium leading-relaxed">
              Enter your <strong>M-Pesa PIN</strong> on your phone to authorize payment.
            </p>
            <p className="text-white/60 text-xs mt-2">
              Do not enter your PIN on this website.
            </p>
          </div>

          {/* Reference */}
          {reference && (
            <p className="text-white/50 text-xs mb-4 font-mono">Ref: {reference}</p>
          )}

          {/* Auto-polling indicator */}
          <div className="flex items-center justify-center gap-2 text-white/90 text-sm mb-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Waiting for payment confirmation...</span>
          </div>

          {/* Cancel */}
          <button
            onClick={() => { setPromptVisible(false); setReference(''); }}
            className="text-white/70 hover:text-white text-sm underline"
          >
            Cancel
          </button>
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
