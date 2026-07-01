'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { LOAN_PRODUCTS, calculateLoanFee, calculateRepayment, calculateActivationFee, formatKES } from '@/lib/utils';
import { ArrowLeft, ArrowRight, CheckCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

const STEPS = ['Product', 'Details', 'Review'];

export default function ApplyPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [blocker, setBlocker] = useState<{ type: string; message: string } | null>(null);

  const [product, setProduct] = useState('');
  const [amount, setAmount] = useState('');
  const [term, setTerm] = useState('');
  const [purpose, setPurpose] = useState('');

  const [user, setUser] = useState<{ kycStatus: string; loanLimit: number; name: string; email: string; phone: string } | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?message=Please sign in to apply for a loan');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchUser();
    }
  }, [session]);

  async function fetchUser() {
    try {
      const res = await fetch('/api/dashboard');
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        // Only check KYC - no loan limit requirement
        if (data.user.kycStatus !== 'approved') {
          setBlocker({
            type: 'KYC_REQUIRED',
            message: 'You need to complete KYC verification before applying for a loan.',
          });
        }
        // No loan limit check - customer can choose any amount
      }
    } catch {}
  }

  const selectedProduct = LOAN_PRODUCTS.find((p) => p.id === product);
  const amt = parseInt(amount) || 0;
  const fee = calculateLoanFee(amt);
  const activationFee = calculateActivationFee(amt);
  const repayment = selectedProduct && amt && parseInt(term) ? calculateRepayment(amt, selectedProduct.rate, parseInt(term)) : null;

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amt,
          termMonths: parseInt(term),
          productType: product,
          purpose,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed');
        return;
      }
      // Redirect to payment page
      router.push(`/payment?loanId=${data.loanId}`);
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

  // Show blocker if user can't apply
  if (blocker) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ArrowLeft className="w-8 h-8 text-yellow-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Action Required</h1>
          <p className="text-gray-500 mb-6">{blocker.message}</p>
          {blocker.type === 'KYC_REQUIRED' ? (
            <Link href="/kyc" className="gradient-mkopa text-white px-6 py-3 rounded-lg font-semibold inline-block">
              Complete KYC
            </Link>
          ) : (
            <Link href="/dashboard" className="gradient-mkopa text-white px-6 py-3 rounded-lg font-semibold inline-block">
              Back to Dashboard
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => step > 0 ? setStep(step - 1) : router.push('/dashboard')} className="p-2 hover:bg-gray-200 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Apply for a Loan</h1>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= i ? 'bg-mkopa-green text-white' : 'bg-gray-200 text-gray-500'}`}>
                {step > i ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-xs hidden sm:block ${step >= i ? 'text-mkopa-green font-medium' : 'text-gray-400'}`}>{s}</span>
              {i < 2 && <div className={`flex-1 h-0.5 ${step > i ? 'bg-mkopa-green' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          {/* Step 0: Product */}
          {step === 0 && (
            <div className="space-y-3">
              <h2 className="font-bold text-lg mb-4">Select Loan Product</h2>
              {LOAN_PRODUCTS.map((p) => (
                <button key={p.id} onClick={() => setProduct(p.id)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition ${product === p.id ? 'border-mkopa-green bg-green-50' : 'border-gray-200 hover:border-mkopa-green/40'}`}>
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-sm text-gray-500 mt-1">{p.rate}% p.a. · KES {p.min.toLocaleString()} – {p.max.toLocaleString()}</div>
                </button>
              ))}
              <div className="flex justify-end pt-4">
                <button disabled={!product} onClick={() => setStep(1)} className="gradient-mkopa text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-40 flex items-center gap-2">
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 1: Details */}
          {step === 1 && selectedProduct && (
            <div className="space-y-4">
              <h2 className="font-bold text-lg mb-2">Loan Details</h2>
              <div className="bg-green-50 p-3 rounded-lg text-sm text-gray-600">{selectedProduct.name} · {selectedProduct.rate}% p.a.</div>

              <div>
                <label className="block text-sm font-medium mb-1">Loan Amount (KES)</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min={selectedProduct.min} max={selectedProduct.max} className="w-full border rounded-lg px-4 py-2.5 text-sm" />
                <p className="text-xs text-gray-400 mt-1">
                  Min: {formatKES(selectedProduct.min)} · Max: {formatKES(selectedProduct.max)}
                </p>
                {user && user.loanLimit > 0 && (
                  <p className="text-xs text-mkopa-green mt-1">
                    Suggested limit: {formatKES(user.loanLimit)} (you can choose any amount up to {formatKES(selectedProduct.max)})
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Term (Months)</label>
                <input type="number" value={term} onChange={(e) => setTerm(e.target.value)} min={selectedProduct.minTerm} max={selectedProduct.maxTerm} className="w-full border rounded-lg px-4 py-2.5 text-sm" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Purpose (Optional)</label>
                <textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={2} className="w-full border rounded-lg px-4 py-2.5 text-sm" placeholder="What will you use the loan for?" />
              </div>

              {repayment && (
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <h3 className="font-semibold text-sm">Cost Breakdown</h3>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div><p className="text-xs text-gray-500">Monthly</p><p className="font-bold">{formatKES(repayment.monthly)}</p></div>
                    <div><p className="text-xs text-gray-500">Total Repayment</p><p className="font-bold">{formatKES(repayment.total)}</p></div>
                    <div><p className="text-xs text-gray-500">Processing Fee</p><p className="font-bold text-mkopa-orange">{formatKES(fee)}</p></div>
                    <div className="bg-orange-50 rounded p-2"><p className="text-xs text-gray-500">Activation Fee</p><p className="font-bold text-mkopa-orange">{formatKES(activationFee)}</p></div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Activation fee formula: KES 199 per KES 5,000 borrowed (min KES 199)</p>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <button onClick={() => setStep(0)} className="px-6 py-2 rounded-lg border font-semibold">Back</button>
                <button disabled={!amount || !term} onClick={() => setStep(2)} className="gradient-mkopa text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-40 flex items-center gap-2">
                  Review <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Review */}
          {step === 2 && selectedProduct && (
            <div className="space-y-4">
              <h2 className="font-bold text-lg mb-2">Review Application</h2>
              {[
                ['Product', selectedProduct.name],
                ['Amount', formatKES(amt)],
                ['Term', `${term} months`],
                ['Rate', `${selectedProduct.rate}% p.a.`],
                ['Monthly Payment', repayment ? formatKES(repayment.monthly) : '—'],
                ['Total Repayment', repayment ? formatKES(repayment.total) : '—'],
                ['Processing Fee', formatKES(fee)],
                ['Activation Fee (pay via M-Pesa)', formatKES(activationFee)],
                ['Name', user?.name || ''],
                ['Email', user?.email || ''],
                ['Phone', user?.phone || ''],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between py-2 border-b last:border-0">
                  <span className="text-gray-500 text-sm">{l}</span>
                  <span className="font-medium text-sm">{v}</span>
                </div>
              ))}
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="bg-orange-50 p-3 rounded-lg text-xs text-orange-700">
                After submitting, you&apos;ll pay the activation fee of <strong>{formatKES(activationFee)}</strong> via M-Pesa STK push.
              </div>
              <div className="flex justify-between pt-4">
                <button onClick={() => setStep(1)} className="px-6 py-2 rounded-lg border font-semibold">Back</button>
                <button disabled={loading} onClick={handleSubmit} className="gradient-mkopa text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-40 flex items-center gap-2">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : 'Submit & Pay Activation Fee'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
