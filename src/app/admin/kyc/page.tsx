'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, Button, Badge, Input, Avatar, EmptyState, Skeleton } from '@/components/ui';
import { cn, timeAgo } from '@/lib/cn';
import {
  ShieldCheck, Search, CheckCircle, XCircle, Clock, FileText,
  Download, RefreshCw, Phone, Calendar
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

const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'default'; icon: React.ComponentType<{ className?: string }> }> = {
  submitted: { label: 'Pending Review', variant: 'warning', icon: Clock },
  approved: { label: 'Approved', variant: 'success', icon: CheckCircle },
  rejected: { label: 'Rejected', variant: 'danger', icon: XCircle },
  none: { label: 'Not Started', variant: 'default', icon: ShieldCheck },
};

export default function AdminKycPage() {
  const [records, setRecords] = useState<KycRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'submitted' | 'approved' | 'rejected'>('submitted');
  const [search, setSearch] = useState('');
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

  const filtered = records.filter(r => {
    if (filter !== 'all' && r.kycStatus !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.userName.toLowerCase().includes(q) ||
             r.userEmail.toLowerCase().includes(q) ||
             r.userPhone.includes(search);
    }
    return true;
  });

  const counts = {
    all: records.length,
    submitted: records.filter(r => r.kycStatus === 'submitted').length,
    approved: records.filter(r => r.kycStatus === 'approved').length,
    rejected: records.filter(r => r.kycStatus === 'rejected').length,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">KYC Verification</h1>
          <p className="text-sm text-ink-500 mt-1">Review and verify customer identity documents</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" onClick={fetchKyc}>
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
          <Button variant="outline" size="md">
            <Download className="w-4 h-4" /> Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Submissions', value: counts.all, icon: FileText, color: 'from-blue-500 to-blue-600' },
          { label: 'Pending Review', value: counts.submitted, icon: Clock, color: 'from-amber-500 to-orange-500' },
          { label: 'Approved', value: counts.approved, icon: CheckCircle, color: 'from-emerald-500 to-teal-500' },
          { label: 'Rejected', value: counts.rejected, icon: XCircle, color: 'from-red-500 to-pink-500' },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={cn('w-10 h-10 rounded-lg bg-gradient-to-br text-white flex items-center justify-center', stat.color)}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-ink-500 mt-1">{stat.label}</p>
            </Card>
          );
        })}
      </div>

      {/* Filters & Search */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <Input
              type="text"
              placeholder="Search by name, email, phone, or national ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            {(['submitted', 'approved', 'rejected', 'all'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all',
                  filter === f
                    ? 'gradient-mkopa text-white shadow-premium-md'
                    : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-400 dark:hover:bg-ink-700'
                )}
              >
                {f === 'submitted' ? 'Pending' : f.charAt(0).toUpperCase() + f.slice(1)}
                <span className="ml-2 text-xs opacity-70">({counts[f]})</span>
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Records */}
      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={ShieldCheck}
            title="No KYC submissions found"
            description="When customers submit their documents for verification, they will appear here."
          />
        </Card>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {filtered.map(record => {
            const status = statusConfig[record.kycStatus] || statusConfig.none;
            const StatusIcon = status.icon;
            return (
              <Card key={record.userId} className="overflow-hidden hover:shadow-premium-lg transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar name={record.userName} className="w-12 h-12" />
                      <div>
                        <h3 className="font-semibold text-base">{record.userName}</h3>
                        <p className="text-xs text-ink-500">{record.userEmail}</p>
                      </div>
                    </div>
                    <Badge variant={status.variant}>
                      <StatusIcon className="w-3 h-3" /> {status.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Contact Info */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2 text-ink-600 dark:text-ink-400">
                      <Phone className="w-3.5 h-3.5" /> {record.userPhone}
                    </div>
                    <div className="flex items-center gap-2 text-ink-600 dark:text-ink-400">
                      <Calendar className="w-3.5 h-3.5" /> {record.submittedAt ? timeAgo(record.submittedAt) : 'N/A'}
                    </div>
                  </div>

                  {/* Documents */}
                  <div className="space-y-2">
                    {record.documents.map(doc => (
                      <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border border-ink-200 dark:border-ink-800">
                        <div className="w-10 h-10 rounded-lg bg-ink-100 dark:bg-ink-800 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-ink-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold capitalize">{doc.documentType.replace('_', ' ')}</p>
                          <p className="text-xs text-ink-500 font-mono">{doc.r2Key.split('/').pop()}</p>
                        </div>
                        <Badge variant={
                          doc.status === 'approved' ? 'success' :
                          doc.status === 'rejected' ? 'danger' : 'warning'
                        }>
                          {doc.status}
                        </Badge>
                      </div>
                    ))}
                  </div>

                  {/* Rejection Reason */}
                  {record.rejectionReason && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg p-3">
                      <p className="text-xs text-red-700 dark:text-red-400">
                        <strong>Rejection:</strong> {record.rejectionReason}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  {record.kycStatus === 'submitted' && (
                    <div className="flex gap-2">
                      {rejecting === record.userId ? (
                        <div className="w-full flex gap-2">
                          <Input
                            type="text"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Rejection reason..."
                            autoFocus
                          />
                          <Button
                            variant="destructive"
                            size="md"
                            onClick={() => handleReject(record.userId)}
                            disabled={actionLoading === record.userId}
                          >
                            Confirm
                          </Button>
                          <Button
                            variant="outline"
                            size="md"
                            onClick={() => { setRejecting(null); setRejectReason(''); }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Button
                            variant="success"
                            size="md"
                            className="flex-1"
                            onClick={() => handleApprove(record.userId)}
                            disabled={actionLoading === record.userId}
                          >
                            <CheckCircle className="w-4 h-4" /> Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="md"
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
