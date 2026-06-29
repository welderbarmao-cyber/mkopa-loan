'use client';

import { useState, useEffect } from 'react';
import { Loader2, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import { formatKES } from '@/lib/utils';

interface LoanRecord {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  userPhone: string;
  amount: number;
  termMonths: number;
  productType: string;
  purpose: string;
  status: string;
  activationFee: number;
  activationFeeStatus: string;
  activationFeeReference?: string;
  activationFeePaidAt?: string;
  createdAt: string;
}

export default function AdminLoansPage() {
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'disbursed'>('all');

  useEffect(() => { fetchLoans(); }, []);

  async function fetchLoans() {
    try {
      const res = await fetch('/api/admin/loans');
      const data = await res.json();
      setLoans(data.records || []);
    } catch {}
    setLoading(false);
  }

  async function updateStatus(loanId: number, status: string) {
    try {
      await fetch('/api/admin/loans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: loanId, status }),
      });
      await fetchLoans();
    } catch {}
  }

  const filtered = filter === 'all' ? loans : loans.filter(l => l.status === filter);

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-mkopa-green" /></div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Loan Applications</h1>

      {/* Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {(['all', 'pending', 'approved', 'rejected', 'disbursed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition ${
              filter === f ? 'gradient-mkopa text-white' : 'bg-white text-gray-600 border'
            }`}
          >
            {f} ({f === 'all' ? loans.length : loans.filter(l => l.status === f).length})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No loans to display</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(loan => (
            <div key={loan.id} className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold capitalize">{loan.productType.replace('_', ' ')} Loan</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${
                      loan.status === 'approved' ? 'bg-green-100 text-green-700' :
                      loan.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      loan.status === 'disbursed' ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {loan.status}
                    </span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-500">Customer:</span> <strong>{loan.userName}</strong></div>
                    <div><span className="text-gray-500">Contact:</span> {loan.userPhone}</div>
                    <div><span className="text-gray-500">Amount:</span> <strong>{formatKES(loan.amount)}</strong></div>
                    <div><span className="text-gray-500">Term:</span> {loan.termMonths} months</div>
                    <div><span className="text-gray-500">Activation Fee:</span> {formatKES(loan.activationFee)}</div>
                    <div><span className="text-gray-500">Fee Status:</span>
                      <span className={`ml-1 text-xs font-semibold ${
                        loan.activationFeeStatus === 'paid' ? 'text-green-600' :
                        loan.activationFeeStatus === 'pending' ? 'text-yellow-600' :
                        loan.activationFeeStatus === 'failed' ? 'text-red-600' :
                        'text-gray-500'
                      }`}>
                        {loan.activationFeeStatus}
                      </span>
                    </div>
                    {loan.purpose && <div className="sm:col-span-2"><span className="text-gray-500">Purpose:</span> {loan.purpose}</div>}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Applied: {new Date(loan.createdAt).toLocaleString()}</p>
                  {loan.activationFeeReference && (
                    <p className="text-xs text-gray-400 mt-1">Payment Ref: <span className="font-mono">{loan.activationFeeReference}</span></p>
                  )}
                </div>

                {/* Admin Actions */}
                {loan.status === 'pending' && loan.activationFeeStatus === 'paid' && (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => updateStatus(loan.id, 'disbursed')}
                      className="bg-mkopa-green text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" /> Mark Disbursed
                    </button>
                    <button
                      onClick={() => updateStatus(loan.id, 'rejected')}
                      className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </div>
                )}
                {loan.status === 'pending' && loan.activationFeeStatus !== 'paid' && (
                  <div className="text-xs text-yellow-600 bg-yellow-50 border border-yellow-200 rounded-lg p-3 max-w-xs">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Waiting for activation fee payment. Customer needs to pay {formatKES(loan.activationFee)}.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
