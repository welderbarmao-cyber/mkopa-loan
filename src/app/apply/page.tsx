'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { LOAN_PRODUCTS, calculateActivationFee, formatKES } from '@/lib/utils';
import { ArrowLeft, ArrowRight, CheckCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

const STEPS = ['Product', 'Personal', 'Financial', 'Guarantor', 'Review'];

const OCCUPATIONS = [
  'Employed (Full-time)',
  'Employed (Part-time)',
  'Self-employed / Business',
  'Freelancer / Contractor',
  'Student',
  'Retired',
  'Unemployed',
];

const INCOME_RANGES = [
  'Below KES 10,000',
  'KES 10,000 - 25,000',
  'KES 25,000 - 50,000',
  'KES 50,000 - 100,000',
  'KES 100,000 - 250,000',
  'Above KES 250,000',
];

export default function ApplyPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [blocker, setBlocker] = useState<{ type: string; message: string } | null>(null);

  // Product
  const [product, setProduct] = useState('');
  const [amount, setAmount] = useState('');
  const [term, setTerm] = useState('');
  const [purpose, setPurpose] = useState('');

  // Personal details
  const [fullName, setFullName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');

  // Financial details
  const [occupation, setOccupation] = useState('');
  const [employer, setEmployer] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [incomeRange, setIncomeRange] = useState('');
  const [dependants, setDependants] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [mpesaPhone, setMpesaPhone] = useState('');

  // Guarantor
  const [gName, setGName] = useState('');
  const [gPhone, setGPhone] = useState('');
  const [gEmail, setGEmail] = useState('');
  const [gRelation, setGRelation] = useState('');
  const [gOccupation, setGOccupation] = useState('');
  const [gIncome, setGIncome] = useState('');
  const [gIdNumber, setGIdNumber] = useState('');



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

        if (data.user.kycStatus !== 'approved') {
          setBlocker({
            type: 'KYC_REQUIRED',
            message: 'You need to complete KYC verification before applying for a loan.',
          });
        }
        // Pre-fill name
        if (data.user.name) setFullName(data.user.name);
        if (data.user.phone) setMpesaPhone(data.user.phone);
      }
    } catch {}
  }

  const selectedProduct = LOAN_PRODUCTS.find((p) => p.id === product);
  const amt = parseInt(amount) || 0;
  const activationFee = calculateActivationFee(amt);

  function validateStep(s: number): boolean {
    if (s === 0) return !!product;
    if (s === 1) return !!fullName && !!nationalId && !!dob && !!gender && !!address && !!city;
    if (s === 2) return !!occupation && !!incomeRange && !!dependants && !!mpesaPhone;
    if (s === 3) return !!gName && !!gPhone && !!gRelation && !!gOccupation && !!gIncome && !!gIdNumber;
    return true;
  }

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
          // Personal
          fullName, nationalId, dob, gender, maritalStatus, address, city,
          // Financial
          occupation, employer, jobTitle, incomeRange, dependants, bankName, bankAccount, mpesaPhone,
          // Guarantor
          guarantor: { name: gName, phone: gPhone, email: gEmail, relation: gRelation, occupation: gOccupation, incomeRange: gIncome, idNumber: gIdNumber },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed');
        return;
      }
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

  if (blocker) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ArrowLeft className="w-8 h-8 text-yellow-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Action Required</h1>
          <p className="text-gray-500 mb-6">{blocker.message}</p>
          <Link href="/kyc" className="gradient-mkopa text-white px-6 py-3 rounded-lg font-semibold inline-block">
            Complete KYC
          </Link>
        </div>
      </div>
    );
  }

  const inputCls = "w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-mkopa-green/30 focus:border-mkopa-green outline-none";
  const labelCls = "block text-sm font-medium mb-1";

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => step > 0 ? setStep(step - 1) : router.push('/dashboard')} className="p-2 hover:bg-gray-200 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Apply for a Loan</h1>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1 flex-shrink-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step >= i ? 'bg-mkopa-green text-white' : 'bg-gray-200 text-gray-500'}`}>
                {step > i ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`text-xs whitespace-nowrap ${step >= i ? 'text-mkopa-green font-medium' : 'text-gray-400'}`}>{s}</span>
              {i < 4 && <div className={`w-4 h-0.5 ${step > i ? 'bg-mkopa-green' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          {/* Step 0: Product */}
          {step === 0 && (
            <div className="space-y-3">
              <h2 className="font-bold text-lg mb-2">Select Loan Product & Amount</h2>
              {LOAN_PRODUCTS.map((p) => (
                <button key={p.id} onClick={() => setProduct(p.id)}
                  className={`w-full text-left p-3 rounded-xl border-2 transition ${product === p.id ? 'border-mkopa-green bg-green-50' : 'border-gray-200 hover:border-mkopa-green/40'}`}>
                  <div className="font-semibold text-sm">{p.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{p.rate}% p.a. · KES {p.min.toLocaleString()} – {p.max.toLocaleString()}</div>
                </button>
              ))}
              {selectedProduct && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className={labelCls}>Amount (KES)</label>
                    <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min={selectedProduct.min} max={selectedProduct.max} className={inputCls} placeholder="5,000" />
                  </div>
                  <div>
                    <label className={labelCls}>Term (Months)</label>
                    <input type="number" value={term} onChange={(e) => setTerm(e.target.value)} min={selectedProduct.minTerm} max={selectedProduct.maxTerm} className={inputCls} placeholder="12" />
                  </div>
                </div>
              )}
              <div>
                <label className={labelCls}>Purpose (Optional)</label>
                <textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={2} className={inputCls} placeholder="What will you use the loan for?" />
              </div>
              <div className="flex justify-end pt-2">
                <button disabled={!validateStep(0) || !amount || !term} onClick={() => setStep(1)} className="gradient-mkopa text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-40 flex items-center gap-2">
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 1: Personal Details */}
          {step === 1 && (
            <div className="space-y-3">
              <h2 className="font-bold text-lg mb-2">Personal Details</h2>
              <div>
                <label className={labelCls}>Full Name (as per ID) *</label>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} placeholder="John Doe" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>National ID Number *</label>
                  <input value={nationalId} onChange={(e) => setNationalId(e.target.value)} className={inputCls} placeholder="12345678" />
                </div>
                <div>
                  <label className={labelCls}>Date of Birth *</label>
                  <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Gender *</label>
                  <select value={gender} onChange={(e) => setGender(e.target.value)} className={inputCls}>
                    <option value="">Select...</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Marital Status</label>
                  <select value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value)} className={inputCls}>
                    <option value="">Select...</option>
                    <option>Single</option>
                    <option>Married</option>
                    <option>Divorced</option>
                    <option>Widowed</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Residential Address *</label>
                <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} placeholder="123 Main Street, Estate" />
              </div>
              <div>
                <label className={labelCls}>City / Town *</label>
                <input value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} placeholder="Nairobi" />
              </div>
              <div className="flex justify-between pt-2">
                <button onClick={() => setStep(0)} className="px-6 py-2 rounded-lg border font-semibold text-sm">Back</button>
                <button disabled={!validateStep(1)} onClick={() => setStep(2)} className="gradient-mkopa text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-40 flex items-center gap-2 text-sm">
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Financial Details */}
          {step === 2 && (
            <div className="space-y-3">
              <h2 className="font-bold text-lg mb-2">Financial & Occupation Details</h2>
              <div>
                <label className={labelCls}>Occupation / Employment Status *</label>
                <select value={occupation} onChange={(e) => setOccupation(e.target.value)} className={inputCls}>
                  <option value="">Select...</option>
                  {OCCUPATIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Employer / Business Name</label>
                  <input value={employer} onChange={(e) => setEmployer(e.target.value)} className={inputCls} placeholder="Company Ltd" />
                </div>
                <div>
                  <label className={labelCls}>Job Title</label>
                  <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className={inputCls} placeholder="Manager" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Monthly Income Range *</label>
                <select value={incomeRange} onChange={(e) => setIncomeRange(e.target.value)} className={inputCls}>
                  <option value="">Select...</option>
                  {INCOME_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Number of Dependants *</label>
                <select value={dependants} onChange={(e) => setDependants(e.target.value)} className={inputCls}>
                  <option value="">Select...</option>
                  <option value="0">0 (None)</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5+">5 or more</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Bank Name</label>
                  <input value={bankName} onChange={(e) => setBankName(e.target.value)} className={inputCls} placeholder="Equity Bank" />
                </div>
                <div>
                  <label className={labelCls}>Bank Account Number</label>
                  <input value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} className={inputCls} placeholder="1234567890" />
                </div>
              </div>
              <div>
                <label className={labelCls}>M-Pesa Phone Number *</label>
                <input value={mpesaPhone} onChange={(e) => setMpesaPhone(e.target.value)} className={inputCls} placeholder="07XX XXX XXX" />
              </div>
              <div className="flex justify-between pt-2">
                <button onClick={() => setStep(1)} className="px-6 py-2 rounded-lg border font-semibold text-sm">Back</button>
                <button disabled={!validateStep(2)} onClick={() => setStep(3)} className="gradient-mkopa text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-40 flex items-center gap-2 text-sm">
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Guarantor */}
          {step === 3 && (
            <div className="space-y-3">
              <h2 className="font-bold text-lg mb-1">Guarantor Details</h2>
              <p className="text-xs text-gray-500 mb-3">At least one guarantor is required.</p>
              <div>
                <label className={labelCls}>Guarantor Full Name *</label>
                <input value={gName} onChange={(e) => setGName(e.target.value)} className={inputCls} placeholder="Jane Doe" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Phone Number *</label>
                  <input value={gPhone} onChange={(e) => setGPhone(e.target.value)} className={inputCls} placeholder="07XX XXX XXX" />
                </div>
                <div>
                  <label className={labelCls}>ID Number *</label>
                  <input value={gIdNumber} onChange={(e) => setGIdNumber(e.target.value)} className={inputCls} placeholder="12345678" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Email Address</label>
                <input type="email" value={gEmail} onChange={(e) => setGEmail(e.target.value)} className={inputCls} placeholder="jane@email.com" />
              </div>
              <div>
                <label className={labelCls}>Relationship *</label>
                <select value={gRelation} onChange={(e) => setGRelation(e.target.value)} className={inputCls}>
                  <option value="">Select...</option>
                  <option>Spouse</option>
                  <option>Parent</option>
                  <option>Sibling</option>
                  <option>Child</option>
                  <option>Relative</option>
                  <option>Friend</option>
                  <option>Colleague</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Guarantor Occupation *</label>
                <select value={gOccupation} onChange={(e) => setGOccupation(e.target.value)} className={inputCls}>
                  <option value="">Select...</option>
                  {OCCUPATIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Guarantor Income Range *</label>
                <select value={gIncome} onChange={(e) => setGIncome(e.target.value)} className={inputCls}>
                  <option value="">Select...</option>
                  {INCOME_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="flex justify-between pt-2">
                <button onClick={() => setStep(2)} className="px-6 py-2 rounded-lg border font-semibold text-sm">Back</button>
                <button disabled={!validateStep(3)} onClick={() => setStep(4)} className="gradient-mkopa text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-40 flex items-center gap-2 text-sm">
                  Review <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && selectedProduct && (
            <div className="space-y-3">
              <h2 className="font-bold text-lg mb-2">Review Application</h2>

              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Loan Details</p>
                <div className="grid grid-cols-2 gap-1 text-sm">
                  <span className="text-gray-500">Product:</span><span className="font-medium">{selectedProduct.name}</span>
                  <span className="text-gray-500">Amount:</span><span className="font-medium">{formatKES(amt)}</span>
                  <span className="text-gray-500">Term:</span><span className="font-medium">{term} months</span>
                  <span className="text-gray-500">Activation Fee:</span><span className="font-medium text-mkopa-orange">{formatKES(activationFee)}</span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Personal</p>
                <div className="grid grid-cols-2 gap-1 text-sm">
                  <span className="text-gray-500">Name:</span><span className="font-medium">{fullName}</span>
                  <span className="text-gray-500">ID:</span><span className="font-medium">{nationalId}</span>
                  <span className="text-gray-500">City:</span><span className="font-medium">{city}</span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Financial</p>
                <div className="grid grid-cols-2 gap-1 text-sm">
                  <span className="text-gray-500">Occupation:</span><span className="font-medium">{occupation}</span>
                  <span className="text-gray-500">Income:</span><span className="font-medium">{incomeRange}</span>
                  <span className="text-gray-500">Dependants:</span><span className="font-medium">{dependants}</span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Guarantor</p>
                <div className="grid grid-cols-2 gap-1 text-sm">
                  <span className="text-gray-500">Name:</span><span className="font-medium">{gName}</span>
                  <span className="text-gray-500">Phone:</span><span className="font-medium">{gPhone}</span>
                  <span className="text-gray-500">Relation:</span><span className="font-medium">{gRelation}</span>
                </div>
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="bg-orange-50 p-3 rounded-lg text-xs text-orange-700">
                After submitting, you&apos;ll pay the activation fee of <strong>{formatKES(activationFee)}</strong> via M-Pesa STK push.
              </div>
              <div className="flex justify-between pt-2">
                <button onClick={() => setStep(3)} className="px-6 py-2 rounded-lg border font-semibold text-sm">Back</button>
                <button disabled={loading} onClick={handleSubmit} className="gradient-mkopa text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-40 flex items-center gap-2 text-sm">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : 'Submit & Pay Fee'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
