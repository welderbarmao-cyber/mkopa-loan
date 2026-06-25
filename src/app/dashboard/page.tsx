'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatKES } from '@/lib/utils';
import { Search, Loader2, FileText } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

export default function DashboardPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{user: {id: number; name: string; email: string; phone: string}; loans: {id: number; amount: number; termMonths: number; productType: string; status: string; createdAt: string}[]; kyc: {id: number; documentType: string; status: string; uploadedAt: string}[]} | null>(null);
  const [error, setError] = useState('');

  async function handleSearch() {
    if (!email) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/dashboard?email=${encodeURIComponent(email)}`);
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Not found'); setData(null); return; }
      setData(json);
    } catch { setError('Network error'); }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl"><span className="text-mkopa-green">M-Kopa</span> Loans</Link>
        <Link href="/apply" className="gradient-mkopa text-white px-4 py-2 rounded-lg text-sm font-semibold">Apply</Link>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-2">Loan Dashboard</h1>
        <p className="text-gray-500 mb-8">Enter your email to view your loan status</p>

        <div className="flex gap-3 mb-8">
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="you@email.com" className="flex-1 border rounded-lg px-4 py-2.5 text-sm"
          />
          <button onClick={handleSearch} disabled={loading} className="gradient-mkopa text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-40 flex items-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Search
          </button>
        </div>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        {data && (
          <div className="space-y-6">
            {/* User card */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="font-bold text-lg">{data.user.name}</h2>
              <p className="text-gray-500 text-sm">{data.user.email} · {data.user.phone}</p>
            </div>

            {/* Loans */}
            <div>
              <h3 className="font-bold mb-3">Your Loans</h3>
              {data.loans.length === 0 ? (
                <p className="text-gray-400 text-sm">No loans yet. <Link href="/apply" className="text-mkopa-green underline">Apply now</Link></p>
              ) : (
                <div className="space-y-3">
                  {data.loans.map((loan) => (
                    <div key={loan.id} className="bg-white rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold capitalize">{loan.productType.replace('_', ' ')} Loan</div>
                        <div className="text-sm text-gray-500">{formatKES(loan.amount)} · {loan.termMonths} months</div>
                        <div className="text-xs text-gray-400 mt-1">{new Date(loan.createdAt).toLocaleDateString()}</div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[loan.status] || 'bg-gray-100'}`}>
                        {loan.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* KYC Status */}
            {data.kyc.length > 0 && (
              <div>
                <h3 className="font-bold mb-3">KYC Documents</h3>
                <div className="space-y-2">
                  {data.kyc.map((doc) => (
                    <div key={doc.id} className="bg-white rounded-lg p-4 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="capitalize text-sm">{doc.documentType.replace('_', ' ')}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[doc.status]}`}>
                        {doc.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
