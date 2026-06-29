'use client';

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, XCircle, Clock, FileText, ShieldCheck } from 'lucide-react';

interface KycRecord {
  userId: number;
  userName: string;
  userEmail: string;
  userPhone: string;
  kycStatus: string;
  submittedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
  documents: Array<{
    id: number;
    documentType: string;
    r2Key: string;
    status: string;
    uploadedAt: string;
    rejectionReason?: string;
  }>;
}

export default function AdminKycPage() {
  const [records, setRecords] = useState<KycRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'submitted' | 'approved' | 'rejected'>('submitted');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => { fetchKyc(); }, []);

  async function fetchKyc() {
    try {
      const res = await fetch('/api/admin/kyc');
      const data = await res.json();
      setRecords(data.records || []);
    } catch {}
    setLoading(false);
  }

  async function handleApprove(userId: number) {
    setActionLoading(userId);
    try {
      await fetch('/api/admin/kyc', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'approve' }),
      });
      await fetchKyc();
    } catch {}
    setActionLoading(null);
  }

  async function handleReject(userId: number) {
    if (!rejectReason.trim()) {
      alert('Please enter a rejection reason');
      return;
    }
    setActionLoading(userId);
    try {
      await fetch('/api/admin/kyc', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'reject', rejectionReason: rejectReason }),
      });
      setRejecting(null);
      setRejectReason('');
      await fetchKyc();
    } catch {}
    setActionLoading(null);
  }

  const filtered = filter === 'all' ? records : records.filter(r => r.kycStatus === filter);

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-mkopa-green" /></div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">KYC Review</h1>

      {/* Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {(['submitted', 'approved', 'rejected', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition ${
              filter === f ? 'gradient-mkopa text-white' : 'bg-white text-gray-600 border'
            }`}
          >
            {f} ({records.filter(r => f === 'all' || r.kycStatus === f).length})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center">
          <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No KYC submissions to display</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(record => (
            <div key={record.userId} className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-bold">{record.userName}</h3>
                  <p className="text-sm text-gray-500">{record.userEmail} · {record.userPhone}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Submitted: {record.submittedAt ? new Date(record.submittedAt).toLocaleString() : 'N/A'}
                  </p>
                </div>
                <StatusBadge status={record.kycStatus} />
              </div>

              {/* Documents */}
              <div className="grid sm:grid-cols-2 gap-3 mb-4">
                {record.documents.map(doc => (
                  <div key={doc.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold capitalize">{doc.documentType.replace('_', ' ')}</span>
                      <StatusBadge status={doc.status} small />
                    </div>
                    <div className="bg-gray-50 rounded p-2 text-center">
                      <FileText className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                      <p className="text-xs text-gray-400">Document stored securely</p>
                      <p className="text-xs text-gray-400 font-mono mt-1">{doc.r2Key.split('/').pop()}</p>
                    </div>
                  </div>
                ))}
              </div>

              {record.rejectionReason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-xs text-red-700"><strong>Rejection reason:</strong> {record.rejectionReason}</p>
                </div>
              )}

              {/* Actions */}
              {record.kycStatus === 'submitted' && (
                <div className="flex gap-2">
                  {rejecting === record.userId ? (
                    <div className="w-full flex gap-2">
                      <input
                        type="text"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Rejection reason..."
                        className="flex-1 border rounded-lg px-3 py-2 text-sm"
                      />
                      <button
                        onClick={() => handleReject(record.userId)}
                        disabled={actionLoading === record.userId}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                      >
                        Confirm Reject
                      </button>
                      <button
                        onClick={() => { setRejecting(null); setRejectReason(''); }}
                        className="border px-4 py-2 rounded-lg text-sm font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleApprove(record.userId)}
                        disabled={actionLoading === record.userId}
                        className="bg-mkopa-green text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-mkopa-dark transition"
                      >
                        {actionLoading === record.userId ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        Approve
                      </button>
                      <button
                        onClick={() => setRejecting(record.userId)}
                        disabled={actionLoading === record.userId}
                        className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-red-100 transition"
                      >
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, small }: { status: string; small?: boolean }) {
  const config: Record<string, { color: string; icon: React.ReactNode }> = {
    none: { color: 'bg-gray-100 text-gray-600', icon: null },
    pending: { color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-3 h-3" /> },
    submitted: { color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-3 h-3" /> },
    approved: { color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
    rejected: { color: 'bg-red-100 text-red-700', icon: <XCircle className="w-3 h-3" /> },
  };
  const c = config[status] || config.none;
  const size = small ? 'text-xs px-2 py-0.5' : 'text-xs px-3 py-1';
  return (
    <span className={`${size} rounded-full font-semibold capitalize flex items-center gap-1 ${c.color}`}>
      {c.icon} {status}
    </span>
  );
}
