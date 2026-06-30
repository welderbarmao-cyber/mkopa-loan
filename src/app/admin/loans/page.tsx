'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Badge, Input, Avatar, EmptyState, Skeleton } from '@/components/ui';
import { cn, formatCurrency, formatDate } from '@/lib/cn';
import {
  FileText, Search, CheckCircle, XCircle,
  AlertCircle, CreditCard
} from 'lucide-react';

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

const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'default'; color: string }> = {
  pending: { label: 'Pending', variant: 'warning', color: 'bg-amber-500' },
  approved: { label: 'Approved', variant: 'success', color: 'bg-emerald-500' },
  rejected: { label: 'Rejected', variant: 'danger', color: 'bg-red-500' },
  disbursed: { label: 'Disbursed', variant: 'info', color: 'bg-blue-500' },
};

export default function AdminLoansPage() {
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'disbursed'>('all');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

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
    setActionLoading(loanId);
    try {
      const res = await fetch('/api/admin/loans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: loanId, status }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to update loan');
        return;
      }
      await fetchLoans();
    } catch {
      alert('Network error');
    }
    setActionLoading(null);
  }

  const filtered = loans.filter(l => {
    if (filter !== 'all' && l.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return l.userName.toLowerCase().includes(q) ||
             l.userEmail.toLowerCase().includes(q) ||
             l.userPhone.includes(search) ||
             String(l.id).includes(search);
    }
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const stats = {
    total: loans.length,
    pending: loans.filter(l => l.status === 'pending').length,
    approved: loans.filter(l => l.status === 'approved' || l.status === 'disbursed').length,
    disbursed: loans.filter(l => l.activationFeeStatus === 'paid').reduce((sum, l) => sum + l.amount, 0),
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Loan Management</h1>
          <p className="text-sm text-ink-500">Review, approve, and disburse loans</p>
        </div>
      </div>

      {/* Stats - Compact */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Loans', value: stats.total, color: 'from-mkopa-green to-mkopa-dark' },
          { label: 'Pending', value: stats.pending, color: 'from-amber-500 to-orange-500' },
          { label: 'Approved', value: stats.approved, color: 'from-emerald-500 to-teal-500' },
          { label: 'Disbursed', value: formatCurrency(stats.disbursed), color: 'from-blue-500 to-indigo-500' },
        ].map(stat => (
          <Card key={stat.label} className="p-3 sm:p-4">
            <div className={cn('w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br mb-2', stat.color)} />
            <p className="text-lg sm:text-xl font-bold truncate">{stat.value}</p>
            <p className="text-xs text-ink-500">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Filters - Compact */}
      <Card className="p-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <Input
              type="text"
              placeholder="Search by loan ID, customer name, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
          <div className="flex items-center gap-1 overflow-x-auto">
            {(['all', 'pending', 'approved', 'disbursed', 'rejected'] as const).map(f => (
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
                {f} ({f === 'all' ? loans.length : loans.filter(l => l.status === f).length})
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Loans - Compact */}
      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={FileText}
            title="No loans found"
            description="When customers apply for loans, they will appear here for review."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(loan => {
            const status = statusConfig[loan.status] || { label: loan.status, variant: 'default' as const, color: 'bg-gray-500' };
            const feePaid = loan.activationFeeStatus === 'paid';
            const canDisburse = loan.status === 'pending' && feePaid;
            return (
              <Card key={loan.id} className="overflow-hidden hover:shadow-premium-lg transition-all">
                <div className={cn('h-1', status.color)} />
                <div className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                    {/* Left: Customer Info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Avatar name={loan.userName} className="w-10 h-10 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-semibold text-sm">{loan.userName}</h3>
                          <Badge variant={status.variant}>
                            {status.label}
                          </Badge>
                          <span className="text-xs text-ink-400">#{loan.id}</span>
                        </div>
                        <p className="text-xs text-ink-500 mb-2">{loan.userEmail} · {loan.userPhone}</p>
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <span className="flex items-center gap-1">
                            <span className="text-ink-500">Product:</span>
                            <strong className="capitalize text-mkopa-green">{loan.productType.replace('_', ' ')}</strong>
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="text-ink-500">Amount:</span>
                            <strong>{formatCurrency(loan.amount)}</strong>
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="text-ink-500">Term:</span>
                            <strong>{loan.termMonths}mo</strong>
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="text-ink-500">Applied:</span>
                            <span>{formatDate(loan.createdAt)}</span>
                          </span>
                        </div>
                        {loan.purpose && (
                          <p className="text-xs text-ink-400 mt-2 italic">&ldquo;{loan.purpose}&rdquo;</p>
                        )}
                      </div>
                    </div>

                    {/* Right: Fee + Actions */}
                    <div className="flex flex-col items-end gap-2 lg:min-w-[200px]">
                      {/* Fee Status */}
                      <div className="text-right">
                        <p className="text-xs text-ink-500">Activation Fee</p>
                        <p className="font-bold text-base text-mkopa-orange">{formatCurrency(loan.activationFee)}</p>
                        <Badge variant={
                          feePaid ? 'success' :
                          loan.activationFeeStatus === 'pending' ? 'warning' :
                          loan.activationFeeStatus === 'failed' ? 'danger' : 'default'
                        } className="mt-1">
                          {loan.activationFeeStatus}
                        </Badge>
                      </div>

                      {/* Actions */}
                      {canDisburse && (
                        <div className="flex gap-2 w-full">
                          <Button
                            variant="success"
                            size="sm"
                            className="flex-1"
                            onClick={() => updateStatus(loan.id, 'disbursed')}
                            disabled={actionLoading === loan.id}
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Disburse
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => updateStatus(loan.id, 'rejected')}
                            disabled={actionLoading === loan.id}
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </Button>
                        </div>
                      )}
                      {loan.status === 'pending' && !feePaid && (
                        <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-lg p-2 flex items-center gap-2 w-full">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          <span>Waiting for fee payment</span>
                        </div>
                      )}
                      {loan.status === 'disbursed' && (
                        <Badge variant="info"><CreditCard className="w-3 h-3" /> Disbursed</Badge>
                      )}
                      {loan.status === 'rejected' && (
                        <Badge variant="danger"><XCircle className="w-3 h-3" /> Rejected</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
