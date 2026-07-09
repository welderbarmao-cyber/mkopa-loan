'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, Button, Badge, Input, Avatar, EmptyState, Skeleton } from '@/components/ui';
import { cn, timeAgo } from '@/lib/cn';
import {
  ShieldCheck, Search, CheckCircle, XCircle, Clock, FileText,
  RefreshCw, Phone, Eye
} from 'lucide-react';

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

const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'default' | 'primary'; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  submitted: { label: 'Pending Review', variant: 'warning', icon: Clock, color: 'bg-amber-500' },
  none: { label: 'Documents Uploaded', variant: 'primary', icon: FileText, color: 'bg-blue-500' },
  approved: { label: 'Approved', variant: 'success', icon: CheckCircle, color: 'bg-emerald-500' },
  rejected: { label: 'Rejected', variant: 'danger', icon: XCircle, color: 'bg-red-500' },
};

export default function AdminKycPage() {
  const [records, setRecords] = useState<KycRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [viewingDoc, setViewingDoc] = useState<{ docId: number; docType: string } | null>(null);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [docLoading, setDocLoading] = useState(false);

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
      const res = await fetch('/api/admin/kyc', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'approve' }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to approve');
        return;
      }
      await fetchKyc();
    } catch {
      alert('Network error');
    }
    setActionLoading(null);
  }

  async function handleReject(userId: number) {
    if (!rejectReason.trim()) {
      alert('Please enter a rejection reason');
      return;
    }
    setActionLoading(userId);
    try {
      const res = await fetch('/api/admin/kyc', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'reject', rejectionReason: rejectReason }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to reject');
        return;
      }
      setRejecting(null);
      setRejectReason('');
      await fetchKyc();
    } catch {
      alert('Network error');
    }
    setActionLoading(null);
  }

  async function viewDocument(docId: number, docType: string) {
    setViewingDoc({ docId, docType });
    setDocLoading(true);
    setDocUrl(null);
    try {
      const res = await fetch(`/api/kyc/view?docId=${docId}`);
      const data = await res.json();
      if (data.fileData) {
        setDocUrl(data.fileData);
      } else if (data.viewUrl) {
        setDocUrl(data.viewUrl);
      } else {
        alert('Document not available for viewing');
        setViewingDoc(null);
      }
    } catch {
      alert('Failed to load document');
      setViewingDoc(null);
    }
    setDocLoading(false);
  }

  // Filter: "pending" shows users with documents that need review (submitted or none with docs)
  const filtered = records.filter(r => {
    if (filter === 'pending') {
      // Show users with documents that are pending review
      return (r.kycStatus === 'submitted' || r.kycStatus === 'none') && r.documents.length > 0;
    }
    if (filter === 'approved') return r.kycStatus === 'approved';
    if (filter === 'rejected') return r.kycStatus === 'rejected';
    // "all" shows users with documents
    return r.documents.length > 0;
  }).filter(r => {
    if (search) {
      const q = search.toLowerCase();
      return r.userName.toLowerCase().includes(q) ||
             r.userEmail.toLowerCase().includes(q) ||
             r.userPhone.includes(search);
    }
    return true;
  });

  const counts = {
    all: records.filter(r => r.documents.length > 0).length,
    pending: records.filter(r => (r.kycStatus === 'submitted' || r.kycStatus === 'none') && r.documents.length > 0).length,
    approved: records.filter(r => r.kycStatus === 'approved').length,
    rejected: records.filter(r => r.kycStatus === 'rejected').length,
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">KYC Verification</h1>
          <p className="text-sm text-ink-500">Review and approve customer identity documents</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchKyc}>
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* Stats - Compact */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', value: counts.all, color: 'from-mkopa-green to-mkopa-dark' },
          { label: 'Pending', value: counts.pending, color: 'from-amber-500 to-orange-500' },
          { label: 'Approved', value: counts.approved, color: 'from-emerald-500 to-teal-500' },
          { label: 'Rejected', value: counts.rejected, color: 'from-red-500 to-pink-500' },
        ].map(stat => (
          <Card key={stat.label} className="p-3 sm:p-4">
            <div className={cn('w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br mb-2', stat.color)} />
            <p className="text-lg sm:text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-ink-500">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Filters & Search - Compact */}
      <Card className="p-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <Input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
          <div className="flex items-center gap-1 overflow-x-auto">
            {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all capitalize',
                  filter === f
                    ? 'gradient-mkopa text-white shadow-premium-md'
                    : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-400'
                )}
              >
                {f} ({counts[f]})
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Records - Compact */}
      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={ShieldCheck}
            title="No KYC submissions found"
            description="When customers upload their documents, they will appear here for review."
          />
        </Card>
      ) : (
        <div className="grid lg:grid-cols-2 gap-3">
          {filtered.map(record => {
            const status = statusConfig[record.kycStatus] || statusConfig.none;
            const StatusIcon = status.icon;
            const canReview = record.kycStatus === 'submitted' || record.kycStatus === 'none';
            return (
              <Card key={record.userId} className="overflow-hidden hover:shadow-premium-lg transition-all">
                {/* Header bar with M-Kopa color accent */}
                <div className={cn('h-1', status.color)} />
                <CardContent className="p-4 space-y-3">
                  {/* User Info - Compact */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={record.userName} className="w-10 h-10 flex-shrink-0" />
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm truncate">{record.userName}</h3>
                        <p className="text-xs text-ink-500 truncate">{record.userEmail}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-ink-400 flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {record.userPhone}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge variant={status.variant} className="flex-shrink-0">
                      <StatusIcon className="w-3 h-3" /> {status.label}
                    </Badge>
                  </div>

                  {/* Documents - Compact */}
                  <div className="space-y-2">
                    {record.documents.map(doc => (
                      <div key={doc.id} className="flex items-center gap-2 p-2 rounded-lg bg-ink-50 dark:bg-ink-800/50">
                        <div className="w-8 h-8 rounded-lg bg-white dark:bg-ink-900 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-mkopa-green" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold capitalize">{doc.documentType.replace('_', ' ')}</p>
                          <p className="text-xs text-ink-400">{timeAgo(doc.uploadedAt)}</p>
                        </div>
                        <button
                          onClick={() => viewDocument(doc.id, doc.documentType)}
                          className="flex items-center gap-1 text-xs text-mkopa-green font-semibold hover:underline px-2 py-1 rounded hover:bg-mkopa-green/10"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Rejection Reason */}
                  {record.rejectionReason && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg p-2">
                      <p className="text-xs text-red-700 dark:text-red-400">
                        <strong>Rejected:</strong> {record.rejectionReason}
                      </p>
                    </div>
                  )}

                  {/* Actions - Compact */}
                  {canReview && (
                    <div className="flex gap-2 pt-1">
                      {rejecting === record.userId ? (
                        <div className="w-full flex gap-2">
                          <Input
                            type="text"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Rejection reason..."
                            autoFocus
                            className="h-8 text-xs flex-1"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleReject(record.userId)}
                            disabled={actionLoading === record.userId}
                          >
                            Confirm
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setRejecting(null); setRejectReason(''); }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Button
                            variant="success"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleApprove(record.userId)}
                            disabled={actionLoading === record.userId}
                          >
                            <CheckCircle className="w-4 h-4" /> Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => setRejecting(record.userId)}
                            disabled={actionLoading === record.userId}
                          >
                            <XCircle className="w-4 h-4" /> Reject
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                  {!canReview && record.kycStatus === 'approved' && (
                    <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-lg">
                      <CheckCircle className="w-4 h-4" />
                      <span>Approved on {record.reviewedAt ? new Date(record.reviewedAt).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewingDoc && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => { setViewingDoc(null); setDocUrl(null); }}
        >
          <div
            className="bg-white dark:bg-ink-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-ink-200 dark:border-ink-800">
              <div>
                <h3 className="font-bold capitalize">{viewingDoc.docType.replace('_', ' ')}</h3>
                <p className="text-xs text-ink-500">Document verification</p>
              </div>
              <button
                onClick={() => { setViewingDoc(null); setDocUrl(null); }}
                className="p-1.5 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-ink-50 dark:bg-ink-950 min-h-[300px]">
              {docLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <RefreshCw className="w-8 h-8 animate-spin text-mkopa-green" />
                  <p className="text-sm text-ink-500">Loading document...</p>
                </div>
              ) : docUrl ? (
                docUrl.startsWith('data:') || docUrl.startsWith('http') ? (
                  <img src={docUrl} alt="Document" className="max-w-full max-h-[60vh] rounded-lg shadow-lg" />
                ) : (
                  <p className="text-sm text-ink-500">Document format not supported for preview</p>
                )
              ) : (
                <p className="text-sm text-ink-500">No document available</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
