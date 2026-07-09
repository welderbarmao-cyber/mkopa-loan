'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Badge, Input, EmptyState, Skeleton } from '@/components/ui';
import { cn, formatCurrency, formatDateTime } from '@/lib/cn';
import { ArrowLeftRight, Search, Download, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface Transaction {
  id: number;
  type: 'activation_fee' | 'loan_disbursement' | 'repayment';
  amount: number;
  status: string;
  reference: string;
  userName: string;
  userEmail: string;
  gateway: string;
  createdAt: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'activation_fee' | 'loan_disbursement' | 'repayment'>('all');

  useEffect(() => {
    fetch('/api/admin/loans')
      .then(r => r.json())
      .then(data => {
        const txns: Transaction[] = (data.records || []).flatMap((loan: { id: number; amount: number; activationFee: number; activationFeeStatus: string; activationFeeReference?: string; activationFeePaidAt?: string; userName: string; userEmail: string; createdAt: string }) => {
          const txns: Transaction[] = [];
          if (loan.activationFeeStatus === 'paid' && loan.activationFeeReference) {
            txns.push({
              id: loan.id * 10 + 1,
              type: 'activation_fee',
              amount: loan.activationFee,
              status: 'completed',
              reference: loan.activationFeeReference,
              userName: loan.userName,
              userEmail: loan.userEmail,
              gateway: 'M-Pesa',
              createdAt: loan.activationFeePaidAt || loan.createdAt,
            });
          }
          if (loan.activationFeeStatus === 'paid') {
            txns.push({
              id: loan.id * 10 + 2,
              type: 'loan_disbursement',
              amount: loan.amount,
              status: 'completed',
              reference: `DISB-${loan.id}`,
              userName: loan.userName,
              userEmail: loan.userEmail,
              gateway: 'M-Pesa',
              createdAt: loan.createdAt,
            });
          }
          return txns;
        });
        setTransactions(txns);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = transactions.filter(t => {
    if (filter !== 'all' && t.type !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.reference.toLowerCase().includes(q) ||
             t.userName.toLowerCase().includes(q) ||
             t.userEmail.toLowerCase().includes(q);
    }
    return true;
  });

  const totalVolume = transactions.reduce((sum, t) => sum + t.amount, 0);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
          <p className="text-sm text-ink-500 mt-1">All payment transactions across the platform</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="md"><Download className="w-4 h-4" /> Export CSV</Button>
          <Button variant="outline" size="md"><Download className="w-4 h-4" /> Export Excel</Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Transactions', value: transactions.length, color: 'from-blue-500 to-blue-600' },
          { label: 'Total Volume', value: formatCurrency(totalVolume), color: 'from-emerald-500 to-teal-500' },
          { label: 'Activation Fees', value: transactions.filter(t => t.type === 'activation_fee').length, color: 'from-amber-500 to-orange-500' },
          { label: 'Disbursements', value: transactions.filter(t => t.type === 'loan_disbursement').length, color: 'from-purple-500 to-pink-500' },
        ].map(stat => (
          <Card key={stat.label} className="p-5">
            <div className={cn('w-10 h-10 rounded-lg bg-gradient-to-br mb-3', stat.color)} />
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-sm text-ink-500 mt-1">{stat.label}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <Input type="text" placeholder="Search by reference, customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            {(['all', 'activation_fee', 'loan_disbursement', 'repayment'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} className={cn('px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap capitalize transition-all', filter === f ? 'gradient-mkopa text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-400')}>
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card><EmptyState icon={ArrowLeftRight} title="No transactions found" description="Transactions will appear here once payments are processed." /></Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead className="bg-ink-50 dark:bg-ink-800/50 border-b border-ink-200 dark:border-ink-800">
                <tr>
                  <th className="text-left text-xs font-semibold text-ink-500 uppercase px-6 py-3">Reference</th>
                  <th className="text-left text-xs font-semibold text-ink-500 uppercase px-6 py-3">Customer</th>
                  <th className="text-left text-xs font-semibold text-ink-500 uppercase px-6 py-3">Type</th>
                  <th className="text-left text-xs font-semibold text-ink-500 uppercase px-6 py-3">Gateway</th>
                  <th className="text-right text-xs font-semibold text-ink-500 uppercase px-6 py-3">Amount</th>
                  <th className="text-left text-xs font-semibold text-ink-500 uppercase px-6 py-3">Date</th>
                  <th className="text-center text-xs font-semibold text-ink-500 uppercase px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                {filtered.map(t => (
                  <tr key={t.id} className="hover:bg-ink-50 dark:hover:bg-ink-800/30">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-semibold">{t.reference}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium">{t.userName}</p>
                      <p className="text-xs text-ink-500">{t.userEmail}</p>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={t.type === 'loan_disbursement' ? 'info' : 'primary'}>
                        {t.type.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4"><span className="text-sm">{t.gateway}</span></td>
                    <td className="px-6 py-4 text-right">
                      <span className={cn('font-bold text-sm flex items-center justify-end gap-1', t.type === 'loan_disbursement' ? 'text-red-600' : 'text-emerald-600')}>
                        {t.type === 'loan_disbursement' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {formatCurrency(t.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4"><span className="text-sm text-ink-500">{formatDateTime(t.createdAt)}</span></td>
                    <td className="px-6 py-4 text-center"><Badge variant="success">Completed</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
