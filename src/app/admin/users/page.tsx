'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Badge, Input, Avatar, EmptyState, Skeleton } from '@/components/ui';
import { cn, formatCurrency } from '@/lib/cn';
import {
  Users, Search, Wallet, Loader2
} from 'lucide-react';

interface UserRecord {
  id: number;
  email: string;
  name: string;
  phone: string;
  role: string;
  kycStatus: string;
  loanLimit: number;
  loanLimitAssignedAt?: string;
  kycSubmittedAt?: string;
  kycReviewedAt?: string;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'admin' | 'customer' | 'kyc_approved' | 'kyc_pending'>('all');
  const [assigning, setAssigning] = useState<number | null>(null);
  const [limitInput, setLimitInput] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setUsers(data.records || []);
    } catch {}
    setLoading(false);
  }

  async function assignLimit(userId: number) {
    const limit = parseInt(limitInput);
    if (!limit || limit < 5000) {
      alert('Please enter a valid limit (min KES 5,000)');
      return;
    }
    setActionLoading(userId);
    try {
      const res = await fetch('/api/admin/loan-limit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, loanLimit: limit }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to assign limit');
        return;
      }
      setAssigning(null);
      setLimitInput('');
      await fetchUsers();
    } catch {
      alert('Network error');
    }
    setActionLoading(null);
  }

  const filtered = users.filter(u => {
    if (filter === 'admin' && u.role !== 'admin') return false;
    if (filter === 'customer' && u.role !== 'customer') return false;
    if (filter === 'kyc_approved' && u.kycStatus !== 'approved') return false;
    if (filter === 'kyc_pending' && u.kycStatus !== 'submitted' && u.kycStatus !== 'none') return false;
    if (search) {
      const q = search.toLowerCase();
      return u.email.toLowerCase().includes(q) ||
             u.name.toLowerCase().includes(q) ||
             u.phone.includes(search);
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
    total: users.length,
    customers: users.filter(u => u.role === 'customer').length,
    admins: users.filter(u => u.role === 'admin').length,
    kycApproved: users.filter(u => u.kycStatus === 'approved').length,
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">User Management</h1>
          <p className="text-sm text-ink-500">Manage customers and assign loan limits</p>
        </div>
      </div>

      {/* Stats - Compact */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'from-mkopa-green to-mkopa-dark' },
          { label: 'Customers', value: stats.customers, color: 'from-purple-500 to-pink-500' },
          { label: 'Admins', value: stats.admins, color: 'from-indigo-500 to-blue-500' },
          { label: 'KYC Approved', value: stats.kycApproved, color: 'from-emerald-500 to-teal-500' },
        ].map(stat => (
          <Card key={stat.label} className="p-3 sm:p-4">
            <div className={cn('w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br mb-2', stat.color)} />
            <p className="text-lg sm:text-xl font-bold">{stat.value}</p>
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
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
          <div className="flex items-center gap-1 overflow-x-auto">
            {([
              { key: 'all', label: 'All' },
              { key: 'customer', label: 'Customers' },
              { key: 'admin', label: 'Admins' },
              { key: 'kyc_approved', label: 'KYC ✓' },
              { key: 'kyc_pending', label: 'KYC Pending' },
            ] as const).map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all',
                  filter === f.key
                    ? 'gradient-mkopa text-white shadow-premium-md'
                    : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-400'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Users - Compact table */}
      {filtered.length === 0 ? (
        <Card>
          <EmptyState icon={Users} title="No users found" description="Try adjusting your search or filters." />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead className="bg-ink-50 dark:bg-ink-800/50 border-b border-ink-200 dark:border-ink-800">
                <tr>
                  <th className="text-left text-xs font-semibold text-ink-500 uppercase px-3 py-2">User</th>
                  <th className="text-left text-xs font-semibold text-ink-500 uppercase px-3 py-2">Role</th>
                  <th className="text-left text-xs font-semibold text-ink-500 uppercase px-3 py-2">KYC</th>
                  <th className="text-left text-xs font-semibold text-ink-500 uppercase px-3 py-2">Limit</th>
                  <th className="text-right text-xs font-semibold text-ink-500 uppercase px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                {filtered.map(user => (
                  <tr key={user.id} className="hover:bg-ink-50 dark:hover:bg-ink-800/30">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Avatar name={user.name} className="w-8 h-8 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{user.name}</p>
                          <p className="text-xs text-ink-500 truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={user.role === 'admin' ? 'primary' : 'default'}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={
                        user.kycStatus === 'approved' ? 'success' :
                        user.kycStatus === 'submitted' ? 'warning' :
                        user.kycStatus === 'rejected' ? 'danger' : 'default'
                      }>
                        {user.kycStatus}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      {user.loanLimit > 0 ? (
                        <span className="font-semibold text-sm text-mkopa-green">{formatCurrency(user.loanLimit)}</span>
                      ) : (
                        <span className="text-sm text-ink-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {user.kycStatus === 'approved' && user.role === 'customer' ? (
                        <div className="flex items-center justify-end gap-1">
                          <Input
                            type="number"
                            placeholder="Limit"
                            value={assigning === user.id ? limitInput : ''}
                            min={5000}
                            max={500000}
                            onChange={(e) => {
                              setAssigning(user.id);
                              setLimitInput(e.target.value);
                            }}
                            className="w-24 h-7 text-xs"
                          />
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => assignLimit(user.id)}
                            disabled={actionLoading === user.id || (assigning === user.id && !limitInput)}
                          >
                            {actionLoading === user.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wallet className="w-3 h-3" />}
                            {user.loanLimit > 0 ? '' : 'Set'}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-ink-400">—</span>
                      )}
                    </td>
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
