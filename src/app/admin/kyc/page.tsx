'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Loader2, FileText, CheckCircle, XCircle, Eye, RefreshCw } from 'lucide-react';

export default function AdminKycPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [records, setRecords] = useState<{id: number; userId: number; documentType: string; r2Key: string; status: string; uploadedAt: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<string | null>(null);
  const [viewUrl, setViewUrl] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetchRecords();
  }, [status]);

  async function fetchRecords() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/kyc');
      if (res.ok) { const data = await res.json(); setRecords(data.records || []); }
    } catch {}
    setLoading(false);
  }

  async function handleView(r2Key: string) {
    setViewing(r2Key);
    try {
      const res = await fetch(`/api/kyc/view?key=${encodeURIComponent(r2Key)}`);
      const data = await res.json();
      setViewUrl(data.viewUrl);
    } catch { alert('Failed to load image'); setViewing(null); }
  }

  async function handleReview(id: number, status: 'approved' | 'rejected') {
    await fetch('/api/admin/kyc', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    fetchRecords();
  }

  if (status === 'loading') return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-mkopa-green" /></div>;
  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-4 h-16 flex items-center justify-between">
        <h1 className="font-bold text-xl"><span className="text-mkopa-green">M-Kopa</span> Admin</h1>
        <button onClick={() => router.push('/login')} className="text-sm text-gray-500 hover:text-red-500">Sign Out</button>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">KYC Verification</h2>
          <button onClick={fetchRecords} className="flex items-center gap-2 text-sm text-mkopa-green font-semibold"><RefreshCw className="w-4 h-4" /> Refresh</button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-mkopa-green" /></div>
        ) : records.length === 0 ? (
          <p className="text-gray-400 text-center py-12">No KYC uploads yet</p>
        ) : (
          <div className="space-y-3">
            {records.map((r) => (
              <div key={r.id} className="bg-white rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <FileText className="w-8 h-8 text-gray-400" />
                  <div>
                    <div className="font-semibold capitalize">{r.documentType?.replace('_', ' ')}</div>
                    <div className="text-xs text-gray-400">User #{r.userId} · {new Date(r.uploadedAt).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {r.status === 'pending' ? (
                    <>
                      <button onClick={() => handleView(r.r2Key)} className="flex items-center gap-1 px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50">
                        <Eye className="w-4 h-4" /> View
                      </button>
                      <button onClick={() => handleReview(r.id, 'approved')} className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm font-semibold">
                        <CheckCircle className="w-4 h-4" /> Approve
                      </button>
                      <button onClick={() => handleReview(r.id, 'rejected')} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm font-semibold">
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                    </>
                  ) : (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${r.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {r.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image viewer modal */}
      {viewing && viewUrl && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => { setViewing(null); setViewUrl(''); }}>
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-auto p-4" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={viewUrl} alt="KYC Document" className="w-full rounded" />
            <button onClick={() => { setViewing(null); setViewUrl(''); }} className="mt-4 w-full py-2 border rounded-lg text-sm font-semibold">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
