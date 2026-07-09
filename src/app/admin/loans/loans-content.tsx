'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Badge, Input, Avatar, EmptyState, Skeleton } from '@/components/ui';
import { cn, formatCurrency, formatDate } from '@/lib/cn';
import {
  FileText, Search, CheckCircle, XCircle,
  CreditCard, Plus, X
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

interface UserRecord {
  id: number;
  name: string;
  email: string;
  phone: string;
  kycStatus: string;
  loanLimit: number;
  role?: string;
}

const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'default'; color: string }> = {
  pending: { label: 'Pending', variant: 'warning', color: 'bg-amber-500' },
  approved: { label: 'Approved', variant: 'success', color: 'bg-emerald-500' },
  rejected: { label: 'Rejected', variant: 'danger', color: 'bg-red-500' },
  disbursed: { label: 'Disbursed', variant: 'info', color: 'bg-blue-500' },
};

const PRODUCTS = [
  { id: 'personal', name: 'Personal Loan' },
  { id: 'business', name: 'Business Loan' },
  { id: 'emergency', name: 'Emergency Loan' },
  { id: 'education', name: 'Education Loan' },
  { id: 'asset', name: 'Asset Financing' },
];

export default function AdminLoansPage() {
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'disbursed'>('all');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [showAllocate, setShowAllocate] = useState(false);

  const [selectedUser, setSelectedUser] = useState('');
  const [amount, setAmount] = useState('');
  const [termMonths, setTermMonths] = useState('12');
  const [productType, setProductType] = useState('personal');
  const [purpose, setPurpose] = useState('');
  const [allocateStatus, setAllocateStatus] = useState('approved');
  const [allocating, setAllocating] = useState(false);
  const [allocateError, setAllocateError] = useState('');

  useEffect(() => {
    fetchLoans();
    fetchUsers();
  }, []);

  async function fetchLoans() {
    try {
      const res = await fetch('/api/admin/loans');
      const data = await res.json();
      setLoans(data.records || []);
    } catch {
      // Silent fail
    }
    setLoading(false);
  }

  async function fetchUsers() {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      const allUsers = (data.records || []).filter((u: UserRecord) => u.role !== 'admin');
      setUsers(allUsers);
    } catch {
      // Silent fail
    }
  }

  async function updateStatus(loanId: number, status: string) {
    setActionLoading(loanId);
    try {
      const res = await fetch('/api/admin/loans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: loanId, status }),
      });
      if (res.ok) {
        await fetchLoans();
      }
    } catch {
      // Silent fail
    }
    setActionLoading(null);
  }

  async function handleAllocate() {
    const userId = parseInt(selectedUser);
    if (!userId) {
      setAllocateError('Please select a customer');
      return;
    }
    const amt = parseInt(amount);
    if (!amt || amt < 5000) {
      setAllocateError('Amount must be at least KES 5,000');
      return;
    }
    setAllocating(true);
    setAllocateError('');
    try {
      const res = await fetch('/api/admin/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          amount: amt,
          termMonths: parseInt(termMonths),
          productType,
          purpose,
          status: allocateStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAllocateError(data.error || 'Failed to allocate loan');
        setAllocating(false);
        return;
      }
      setShowAllocate(false);
      setSelectedUser('');
      setAmount('');
      setTermMonths('12');
      setProductType('personal');
      setPurpose('');
      setAllocateStatus('approved');
      await fetchLoans();
    } catch {
      setAllocateError('Network error');
    }
    setAllocating(false);
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

  const activationFeePreview = amount && parseInt(amount) >= 5000
    ? Math.ceil((parseInt(amount) / 5000) * 199)
    : 0;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Loan Management</h1>
          <p className="text-sm text-ink-500">Allocate, approve, and manage loans</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowAllocate(true)}>
          <Plus className="w-4 h-4" /> Allocate Loan
        </Button>
      </div>

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

      {showAllocate && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowAllocate(false)}
        >
          <div
            className="bg-white dark:bg-ink-900 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
              <h2 className="font-bold">Allocate New Loan</h2>
              <button
                onClick={() => setShowAllocate(false)}
                className="p-1.5 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {allocateError && (
                <div className="bg-red-50 text-red-600 text-sm p-2 rounded-lg">{allocateError}</div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Customer</label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm h-10 bg-white dark:bg-ink-800 dark:text-ink-50"
                >
                  <option value="">Select a customer...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} - {u.email}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Loan Amount (KES)</label>
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Min: 5,000" min={5000} max={500000} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Term (Months)</label>
                <Input type="number" value={termMonths} onChange={(e) => setTermMonths(e.target.value)} min={1} max={60} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Loan Product</label>
                <select
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm h-10 bg-white dark:bg-ink-800 dark:text-ink-50"
                >
                  {PRODUCTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Purpose (Optional)</label>
                <Input type="text" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Reason for loan" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Loan Status</label>
                <select
                  value={allocateStatus}
                  onChange={(e) => setAllocateStatus(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm h-10 bg-white dark:bg-ink-800 dark:text-ink-50"
                >
                  <option value="pending">Pending (customer pays activation fee)</option>
                  <option value="disbursed">Disbursed (loan fully active)</option>
                </select>
              </div>

              {activationFeePreview > 0 && (
                <div className="bg-mkopa-green/5 border border-mkopa-green/20 rounded-lg p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-ink-500">Activation Fee:</span>
                    <span className="font-bold text-mkopa-orange">KES {activationFeePreview.toLocaleString()}</span>
                  </div>
                </div>
              )}

              <Button variant="primary" className="w-full" onClick={handleAllocate} disabled={allocating || !selectedUser || !amount}>
                {allocating ? 'Allocating...' : 'Allocate Loan'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Card className="p-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <Input type="text" placeholder="Search loans..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-9" />
          </div>
          <div className="flex items-center gap-1 overflow-x-auto">
            {(['all', 'pending', 'approved', 'disbursed', 'rejected'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap capitalize', filter === f ? 'gradient-mkopa text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-400')}
              >
                {f} ({f === 'all' ? loans.length : loans.filter(l => l.status === f).length})
              </button>
            ))}
          </div>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState icon={FileText} title="No loans found" description="Click 'Allocate Loan' to create a new loan." />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(loan => {
            const status = statusConfig[loan.status] || { label: loan.status, variant: 'default' as const, color: 'bg-gray-500' };
            const feePaid = loan.activationFeeStatus === 'paid';
            return (
              <Card key={loan.id} className="overflow-hidden">
                <div className={cn('h-1', status.color)} />
                <div className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Avatar name={loan.userName} className="w-10 h-10 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-semibold text-sm">{loan.userName}</h3>
                          <Badge variant={status.variant}>{status.label}</Badge>
                          <span className="text-xs text-ink-400">#{loan.id}</span>
                        </div>
                        <p className="text-xs text-ink-500 mb-2">{loan.userEmail}</p>
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <span><span className="text-ink-500">Amount:</span> <strong>{formatCurrency(loan.amount)}</strong></span>
                          <span><span className="text-ink-500">Term:</span> <strong>{loan.termMonths}mo</strong></span>
                          <span><span className="text-ink-500">Date:</span> {formatDate(loan.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 lg:min-w-[180px]">
                      <div className="text-right">
                        <p className="text-xs text-ink-500">Fee: {formatCurrency(loan.activationFee)}</p>
                        <Badge variant={feePaid ? 'success' : loan.activationFeeStatus === 'pending' ? 'warning' : 'default'}>
                          {loan.activationFeeStatus}
                        </Badge>
                      </div>
                      {loan.status === 'pending' && !feePaid && (
                        <Button variant="outline" size="sm" className="w-full text-red-600 border-red-200" onClick={() => updateStatus(loan.id, 'rejected')} disabled={actionLoading === loan.id}>
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </Button>
                      )}
                      {loan.status === 'pending' && feePaid && (
                        <Button variant="success" size="sm" className="w-full" onClick={() => updateStatus(loan.id, 'disbursed')} disabled={actionLoading === loan.id}>
                          <CheckCircle className="w-3.5 h-3.5" /> Disburse
                        </Button>
                      )}
                      {loan.status === 'approved' && (
                        <Button variant="primary" size="sm" className="w-full" onClick={() => updateStatus(loan.id, 'disbursed')} disabled={actionLoading === loan.id}>
                          <CreditCard className="w-3.5 h-3.5" /> Disburse
                        </Button>
                      )}
                      {loan.status === 'pending' && (
                        <Button variant="outline" size="sm" className="w-full text-red-600 border-red-200" onClick={() => updateStatus(loan.id, 'rejected')} disabled={actionLoading === loan.id}>
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </Button>
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
