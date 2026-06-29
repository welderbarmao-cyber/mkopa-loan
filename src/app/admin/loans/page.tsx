'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Badge, Input, Avatar, EmptyState, Skeleton } from '@/components/ui';
import { cn, formatCurrency, formatNumber, formatDate } from '@/lib/cn';
import {
  FileText, Search, CheckCircle, XCircle, Clock, Download,
  DollarSign, AlertCircle, CreditCard
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

const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'default' }> = {
  pending: { label: 'Pending', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
  disbursed: { label: 'Disbursed', variant: 'info' },
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
      await fetch('/api/admin/loans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: loanId, status }),
      });
      await fetchLoans();
    } catch {}
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
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 rounded-xl" />
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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Loan Management</h1>
          <p className="text-sm text-ink-500 mt-1">Review, approve, and manage all loan applications</p>
        </div>
        <Button variant="outline" size="md">
          <Download className="w-4 h-4" /> Export
        </Button>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Loans', value: formatNumber(stats.total), icon: FileText, color: 'from-blue-500 to-blue-600' },
          { label: 'Pending Review', value: formatNumber(stats.pending), icon: Clock, color: 'from-amber-500 to-orange-500' },
          { label: 'Approved', value: formatNumber(stats.approved), icon: CheckCircle, color: 'from-emerald-500 to-teal-500' },
          { label: 'Total Disbursed', value: formatCurrency(stats.disbursed), icon: DollarSign, color: 'from-purple-500 to-pink-500' },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-5">
              <div className={cn('w-10 h-10 rounded-lg bg-gradient-to-br text-white flex items-center justify-center mb-3', stat.color)}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-ink-500 mt-1">{stat.label}</p>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <Input
              type="text"
              placeholder="Search by loan ID, customer name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            {(['all', 'pending', 'approved', 'disbursed', 'rejected'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all capitalize',
                  filter === f
                    ? 'gradient-mkopa text-white shadow-premium-md'
                    : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-400 dark:hover:bg-ink-700'
                )}
              >
                {f} ({f === 'all' ? loans.length : loans.filter(l => l.status === f).length})
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Loans */}
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
            const status = statusConfig[loan.status] || { label: loan.status, variant: 'default' as const };
            return (
              <Card key={loan.id} className="p-5 hover:shadow-premium-lg transition-all">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Left: Customer Info */}
                  <div className="flex items-start gap-3 flex-1">
                    <Avatar name={loan.userName} className="w-12 h-12" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{loan.userName}</h3>
                        <Badge variant={status.variant}>{status.label}</Badge>
                        <span className="text-xs text-ink-400">#{loan.id}</span>
                      </div>
                      <p className="text-sm text-ink-500">{loan.userEmail} · {loan.userPhone}</p>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-sm">
                        <span><span className="text-ink-500">Product:</span> <strong className="capitalize">{loan.productType.replace('_', ' ')}</strong></span>
                        <span><span className="text-ink-500">Amount:</span> <strong>{formatCurrency(loan.amount)}</strong></span>
                        <span><span className="text-ink-500">Term:</span> {loan.termMonths} months</span>
                        <span><span className="text-ink-500">Applied:</span> {formatDate(loan.createdAt)}</span>
                      </div>
                      {loan.purpose && (
                        <p className="text-xs text-ink-500 mt-2 italic">&quot;{loan.purpose}&quot;</p>
                      )}
                    </div>
                  </div>

                  {/* Right: Fee Status + Actions */}
                  <div className="flex flex-col items-end gap-3 lg:min-w-[280px]">
                    <div className="text-right">
                      <p className="text-xs text-ink-500">Activation Fee</p>
                      <p className="font-bold text-lg">{formatCurrency(loan.activationFee)}</p>
                      <Badge variant={
                        loan.activationFeeStatus === 'paid' ? 'success' :
                        loan.activationFeeStatus === 'pending' ? 'warning' :
                        loan.activationFeeStatus === 'failed' ? 'danger' : 'default'
                      } className="mt-1">
                        {loan.activationFeeStatus}
                      </Badge>
                    </div>

                    {/* Actions */}
                    {loan.status === 'pending' && loan.activationFeeStatus === 'paid' && (
                      <div className="flex gap-2 w-full">
                        <Button
                          variant="success"
                          size="sm"
                          className="flex-1"
                          onClick={() => updateStatus(loan.id, 'disbursed')}
                          disabled={actionLoading === loan.id}
                        >
                          <CheckCircle className="w-3 h-3" /> Disburse
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => updateStatus(loan.id, 'rejected')}
                          disabled={actionLoading === loan.id}
                        >
                          <XCircle className="w-3 h-3" /> Reject
                        </Button>
                      </div>
                    )}
                    {loan.status === 'pending' && loan.activationFeeStatus !== 'paid' && (
                      <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-lg p-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        Waiting for activation fee payment
                      </div>
                    )}
                    {loan.status === 'disbursed' && (
                      <Badge variant="info"><CreditCard className="w-3 h-3" /> Disbursed</Badge>
                    )}
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
