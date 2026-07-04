'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ArrowLeft, Smartphone, CheckCircle, AlertCircle, Bell, Phone, Zap, Lock } from 'lucide-react';
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
  const [country, setCountry] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [stkSent, setStkSent] = useState(false);
  const [reference, setReference] = useState('');
  const [phoneEditable, setPhoneEditable] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const autoTriggered = useRef(false);
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?message=Please sign in to make payment');
    }
  }, [status, router]);

  // ---- Wake Lock: keep the screen on so the customer doesn't miss the STK prompt ----
  const acquireWakeLock = async () => {
    try {
      // @ts-expect-error - wakeLock is not in older TS lib defs
      if ('wakeLock' in navigator && navigator.wakeLock?.request) {
        // @ts-expect-error - wakeLock is not in older TS lib defs
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch {
      // Wake lock denied or unavailable — silently ignore
    }
  };
  const releaseWakeLock = async () => {
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    } catch {
      // ignore
    }
  };

  // Re-acquire wake lock when tab becomes visible again
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && stkSent) acquireWakeLock();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [stkSent]);

  // ---- Notifications API: fire a system notification when STK is sent ----
  const fireNotification = async (title: string, body: string) => {
    try {
      if (!('Notification' in window)) return;
      // Ask permission if not already granted
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      if (Notification.permission === 'granted') {
        const notif = new Notification(title, {
          body,
          tag: 'mkopa-stk-push',
          requireInteraction: true, // stays in tray until dismissed
          icon: '/logo.jpg',
        });
        // Auto-close after 30 seconds (some browsers ignore this)
        setTimeout(() => notif.close(), 30000);
      }
    } catch {
      // ignore
    }
  };

  // Request notification permission early when page loads
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      // Ask after a short delay so it doesn't block initial render
      const t = setTimeout(() => Notification.requestPermission().catch(() => {}), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    if (session?.user && loanId) {
      fetchLoanDetails();
    }
  }, [session, loanId]);

  useEffect(() => {
    if (phone) {
      setNetwork(detectNetwork(phone));
      setCountry(detectCountry(phone).country);
    }
  }, [phone]);

  // Auto-poll for payment status when STK is sent — every 2 seconds for speed
  useEffect(() => {
    if (!stkSent || !reference) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payment/status?reference=${reference}&loanId=${loanId}`);
        const data = await res.json();
        if (data.status === 'completed') {
          clearInterval(pollInterval);
          releaseWakeLock();
          router.push('/dashboard');
        } else if (data.status === 'failed') {
          clearInterval(pollInterval);
          releaseWakeLock();
          setError('Payment was not completed. Please try again.');
          setStkSent(false);
        }
      } catch {}
    }, 2000);

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

  // Auto-trigger STK push as soon as we have a valid phone + loan
  useEffect(() => {
    if (!autoTriggered.current && loan && phone && phone.length >= 10 && !stkSent && !processing) {
      autoTriggered.current = true;
      // Small delay so the UI can render the "sending" state
      setTimeout(() => triggerStkPush(), 300);
    }
  }, [loan, phone, stkSent, processing]);

  async function triggerStkPush() {
    if (!phone || phone.length < 10) {
      setError('Please enter a valid phone number');
      setPhoneEditable(true);
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
        setPhoneEditable(true);
        return;
      }

      // STK push sent — either via Pesapal checkout URL or PawaPay direct STK
      setReference(data.reference);
      setCheckoutUrl(data.checkout_url || '');
      setStkSent(true);
      setProcessing(false);

      // Vibrate the device if supported (mobile browsers)
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 400]);
      }

      // Keep the screen awake so the customer doesn't miss the STK prompt
      acquireWakeLock();

      // Fire a system notification (appears in the OS notification tray,
      // over other apps). This is the closest a website can get to drawing
      // over other apps — the actual STK PIN dialog is drawn by Safaricom /
      // Airtel's SIM toolkit, not by us.
      const amt = loan.activationFee;
      const cur = data.currency || 'KES';
      fireNotification(
        'M-Kopa: Enter your PIN',
        `A payment prompt for ${amt} ${cur} was sent to ${phone}. Open your phone and enter your M-Pesa / Airtel PIN to confirm.`
      );
    } catch {
      setError('Network error. Please try again.');
      setPhoneEditable(true);
    }
    setProcessing(false);
  }

  // Release the wake lock when the component unmounts or payment completes
  useEffect(() => {
    return () => {
      releaseWakeLock();
    };
  }, []);

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

  // ============ STK PUSH SENT — FULLSCREEN PIN PROMPT ============
  if (stkSent) {
    // If we have a Pesapal checkout URL, show it in a fullscreen iframe overlay.
    // The iframe loads the Pesapal checkout page which triggers the STK push
    // directly to the customer's phone — they just enter their M-Pesa/Airtel PIN.
    if (checkoutUrl) {
      return (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          {/* Top bar — stays visible above the iframe */}
          <div className="bg-mkopa-green text-white px-4 py-3 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              <span className="font-bold text-sm">Complete Payment — {formatKES(loan.activationFee)}</span>
            </div>
            <button
              onClick={() => { setStkSent(false); setReference(''); setCheckoutUrl(''); autoTriggered.current = false; }}
              className="text-white/80 hover:text-white text-xs underline"
            >
              Cancel
            </button>
          </div>
          {/* Pesapal checkout iframe — triggers STK push on the phone */}
          <iframe
            src={checkoutUrl}
            className="flex-1 w-full border-0"
            title="M-Kopa Payment"
            allow="payment"
          />
        </div>
      );
    }

    // No checkout URL — PawaPay direct STK was sent. Show the fullscreen
    // "CHECK YOUR PHONE" overlay while polling for payment status.
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-mkopa-green to-green-700 flex items-center justify-center px-4">
        {/* Pulsing rings to grab attention */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 border-4 border-white/20 rounded-full animate-ping" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 border-4 border-white/30 rounded-full animate-ping" style={{ animationDelay: '0.3s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 border-4 border-white/40 rounded-full animate-ping" style={{ animationDelay: '0.6s' }} />
        </div>

        <div className="relative max-w-sm w-full text-center text-white">
          {/* Phone icon with notification badge */}
          <div className="relative w-28 h-28 mx-auto mb-6">
            <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse" />
            <div className="relative w-28 h-28 bg-white rounded-full flex items-center justify-center shadow-2xl">
              <Smartphone className="w-14 h-14 text-mkopa-green" />
            </div>
            <div className="absolute -top-2 -right-2 w-10 h-10 bg-mkopa-orange rounded-full flex items-center justify-center animate-bounce shadow-lg">
              <Bell className="w-5 h-5 text-white" />
            </div>
          </div>

          <h2 className="text-3xl font-black mb-2 tracking-tight">CHECK YOUR PHONE</h2>
          <p className="text-white/80 text-sm mb-4">
            Payment prompt sent to:
          </p>
          <p className="text-2xl font-bold mb-4 flex items-center justify-center gap-2">
            <Phone className="w-5 h-5" />
            {phone}
          </p>

          <div className="bg-white/15 backdrop-blur rounded-xl p-4 mb-4 border border-white/20">
            <p className="text-white/70 text-xs mb-1">Amount to authorize</p>
            <p className="text-3xl font-black text-mkopa-orange">{formatKES(loan.activationFee)}</p>
            <div className="flex items-center justify-center gap-1.5 mt-2 text-white/80 text-xs">
              <Lock className="w-3 h-3" />
              Enter your M-Pesa / Airtel PIN to confirm
            </div>
          </div>

          {reference && (
            <p className="text-white/50 text-xs mb-4 font-mono">Ref: {reference}</p>
          )}

          <div className="flex items-center justify-center gap-2 text-white/90 text-sm mb-6">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Waiting for PIN entry on your phone...</span>
          </div>

          <button
            onClick={() => { setStkSent(false); setReference(''); autoTriggered.current = false; }}
            className="text-white/70 hover:text-white text-sm underline"
          >
            Cancel and try again
          </button>
        </div>
      </div>
    );
  }

  // ============ PROCESSING — SENDING STK ============
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

        {/* Sending STK or Phone Input */}
        <div className="bg-white rounded-xl shadow-sm p-6 text-center">
          {processing ? (
            <>
              <div className="relative w-20 h-20 mx-auto mb-4">
                <div className="absolute inset-0 bg-mkopa-green/20 rounded-full animate-ping" />
                <div className="relative w-20 h-20 bg-mkopa-green rounded-full flex items-center justify-center">
                  <Zap className="w-10 h-10 text-white animate-pulse" />
                </div>
              </div>
              <h2 className="font-bold text-lg mb-2">Getting your loan...</h2>
              <p className="text-gray-500 text-sm mb-4">
                Sending payment prompt to <strong>{phone}</strong>
              </p>
              <Loader2 className="w-6 h-6 animate-spin text-mkopa-green mx-auto" />
            </>
          ) : phoneEditable ? (
            <>
              <h2 className="font-bold mb-3">Confirm Your Phone Number</h2>
              <div className="mb-4">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07XX XXX XXX"
                  className="w-full border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-mkopa-green/30 focus:border-mkopa-green outline-none text-center"
                  autoFocus
                />
                {phone && (
                  <p className="text-xs mt-1">
                    <span className="font-semibold text-mkopa-green">{network}</span>
                    {country && <span className="text-gray-400"> · {country}</span>}
                  </p>
                )}
              </div>
              <button
                onClick={() => { setPhoneEditable(false); autoTriggered.current = false; }}
                disabled={!phone || phone.length < 10}
                className="w-full gradient-mkopa text-white py-3 rounded-lg font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <Smartphone className="w-5 h-5" /> Get Loan
              </button>
              {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-mkopa-green/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Smartphone className="w-8 h-8 text-mkopa-green" />
              </div>
              <h2 className="font-bold text-lg mb-1">Ready to Get Loan</h2>
              <p className="text-gray-500 text-sm mb-4">
                {formatKES(loan.activationFee)} will be deducted from your M-Pesa / Airtel wallet after you enter your PIN.
              </p>
              <p className="text-lg font-bold text-mkopa-green mb-4 flex items-center justify-center gap-1">
                <Phone className="w-4 h-4" /> {phone}
              </p>
              <p className="text-xs text-gray-400 mb-4">
                Detected: {network}{country && ` · ${country}`}
              </p>
              <button
                onClick={() => { autoTriggered.current = false; triggerStkPush(); }}
                className="w-full gradient-mkopa text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
              >
                <Zap className="w-5 h-5" /> Get Loan
              </button>
              <button
                onClick={() => setPhoneEditable(true)}
                className="text-gray-500 text-sm mt-3 hover:text-gray-700"
              >
                Use a different number
              </button>
            </>
          )}

          <div className="mt-5 p-3 bg-green-50 rounded-lg text-xs text-green-700 text-left">
            <p className="font-semibold mb-1">How it works:</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>Tap "Get Loan" — a payment prompt appears on your phone</li>
              <li>Enter your M-Pesa / Airtel PIN to authorize</li>
              <li>{formatKES(loan.activationFee)} is deducted from your wallet</li>
              <li>Loan activated instantly — done!</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentClient() {
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
