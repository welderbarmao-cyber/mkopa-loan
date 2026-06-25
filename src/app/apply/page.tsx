'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LOAN_PRODUCTS, calculateLoanFee, calculateRepayment, formatKES } from '@/lib/utils';
import { ArrowLeft, ArrowRight, CheckCircle, Loader2, Upload } from 'lucide-react';

const STEPS = ['Product', 'Details', 'KYC', 'Review'];

export default function ApplyPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const [product, setProduct] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [term, setTerm] = useState('');
  const [purpose, setPurpose] = useState('');

  const [kycDocs, setKycDocs] = useState<{ national_id?: string; passport?: string; selfie?: string }>({});
  const [uploading, setUploading] = useState('');

  const selectedProduct = LOAN_PRODUCTS.find((p) => p.id === product);
  const amt = parseInt(amount) || 0;
  const fee = calculateLoanFee(amt);
  const repayment = selectedProduct && amt && parseInt(term) ? calculateRepayment(amt, selectedProduct.rate, parseInt(term)) : null;

  async function handleFileUpload(file: File, docType: 'national_id' | 'passport' | 'selfie') {
    setUploading(docType);
    try {
      // 1. Get presigned URL from our API
      const res = await fetch('/api/kyc/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 1, documentType: docType, contentType: file.type }),
      });
      const { uploadUrl, r2Key } = await res.json();

      // 2. Upload directly to R2
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });

      setKycDocs((prev) => ({ ...prev, [docType]: r2Key }));
    } catch { setError('Upload failed'); }
    setUploading('');
  }

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, amount: amt, termMonths: parseInt(term), productType: product, purpose }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed'); return; }
      setSubmitted(true);
    } catch { setError('Network error'); }
    setLoading(false);
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-mkopa-green mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Application Submitted!</h1>
          <p className="text-gray-500 mb-6">We&apos;ll review your application and notify you via email.</p>
          <button onClick={() => router.push('/dashboard')} className="gradient-mkopa text-white px-6 py-2 rounded-lg font-semibold">Track Status</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => step > 0 ? setStep(step - 1) : router.push('/')} className="p-2 hover:bg-gray-200 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
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
              {i < 3 && <div className={`flex-1 h-0.5 ${step > i ? 'bg-mkopa-green' : 'bg-gray-200'}`} />}
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
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded-lg px-4 py-2.5 text-sm" placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded-lg px-4 py-2.5 text-sm" placeholder="you@email.com" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone (M-Pesa)</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border rounded-lg px-4 py-2.5 text-sm" placeholder="+2547XXXXXXXX" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Loan Amount (KES)</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min={selectedProduct.min} max={selectedProduct.max} className="w-full border rounded-lg px-4 py-2.5 text-sm" />
                <p className="text-xs text-gray-400 mt-1">Min: {formatKES(selectedProduct.min)} · Max: {formatKES(selectedProduct.max)}</p>
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
                  <h3 className="font-semibold text-sm">Estimated Repayment</h3>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div><p className="text-xs text-gray-500">Monthly</p><p className="font-bold">{formatKES(repayment.monthly)}</p></div>
                    <div><p className="text-xs text-gray-500">Total</p><p className="font-bold">{formatKES(repayment.total)}</p></div>
                    <div><p className="text-xs text-gray-500">Fee (3.58%)</p><p className="font-bold text-mkopa-orange">{formatKES(fee)}</p></div>
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <button onClick={() => setStep(0)} className="px-6 py-2 rounded-lg border font-semibold">Back</button>
                <button disabled={!name || !email || !phone || !amount || !term} onClick={() => setStep(2)} className="gradient-mkopa text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-40 flex items-center gap-2">
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: KYC Upload */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-bold text-lg mb-2">Upload KYC Documents</h2>
              <p className="text-sm text-gray-500">Upload your documents for verification. Files go directly to secure cloud storage.</p>
              {(['national_id', 'passport', 'selfie'] as const).map((docType) => (
                <div key={docType} className="border-2 border-dashed rounded-xl p-6 text-center">
                  {kycDocs[docType] ? (
                    <div className="flex items-center justify-center gap-2 text-mkopa-green">
                      <CheckCircle className="w-5 h-5" /><span className="font-medium capitalize">{docType.replace('_', ' ')} uploaded</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <p className="font-medium capitalize mb-1">{docType.replace('_', ' ')}</p>
                      {uploading === docType ? (
                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-mkopa-green" />
                      ) : (
                        <label className="cursor-pointer text-sm text-mkopa-green font-semibold hover:underline">
                          Choose File
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], docType)} />
                        </label>
                      )}
                    </>
                  )}
                </div>
              ))}
              <div className="flex justify-between pt-4">
                <button onClick={() => setStep(1)} className="px-6 py-2 rounded-lg border font-semibold">Back</button>
                <button onClick={() => setStep(3)} className="gradient-mkopa text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2">
                  Review <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && selectedProduct && (
            <div className="space-y-4">
              <h2 className="font-bold text-lg mb-2">Review Application</h2>
              {[
                ['Product', selectedProduct.name],
                ['Amount', formatKES(amt)],
                ['Term', `${term} months`],
                ['Rate', `${selectedProduct.rate}% p.a.`],
                ['Monthly', repayment ? formatKES(repayment.monthly) : '—'],
                ['Total', repayment ? formatKES(repayment.total) : '—'],
                ['Application Fee', formatKES(fee)],
                ['Name', name],
                ['Email', email],
                ['Phone', phone],
                ['KYC Docs', Object.keys(kycDocs).length + ' uploaded'],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between py-2 border-b last:border-0">
                  <span className="text-gray-500 text-sm">{l}</span>
                  <span className="font-medium text-sm">{v}</span>
                </div>
              ))}
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="flex justify-between pt-4">
                <button onClick={() => setStep(2)} className="px-6 py-2 rounded-lg border font-semibold">Back</button>
                <button disabled={loading} onClick={handleSubmit} className="gradient-mkopa text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-40 flex items-center gap-2">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : 'Submit Application'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
