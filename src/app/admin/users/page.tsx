'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Badge, Input, Avatar, EmptyState, Skeleton } from '@/components/ui';
import { cn, formatCurrency, formatNumber, formatDate } from '@/lib/cn';
import {
  Users, Search, Wallet, CheckCircle, Loader2, Download,
  MoreVertical, ShieldCheck, UserPlus
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
  const [filter, setFilter] = useState<'all' | 'admin' | 'customer' | 'kyc_approved' | 'kyc_pending' | 'kyc_rejected'>('all');
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
    if (filter === 'kyc_pending' && u.kycStatus !== 'submitted') return false;
    if (filter === 'kyc_rejected' && u.kycStatus !== 'rejected') return false;
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
    total: users.length,
    customers: users.filter(u => u.role === 'customer').length,
    admins: users.filter(u => u.role === 'admin').length,
    kycApproved: users.filter(u => u.kycStatus === 'approved').length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-sm text-ink-500 mt-1">Manage customers, admins, and loan limits</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="md">
            <Download className="w-4 h-4" /> Export
          </Button>
          <Button variant="primary" size="md">
            <UserPlus className="w-4 h-4" /> Add User
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: stats.total, icon: Users, color: 'from-blue-500 to-blue-600' },
          { label: 'Customers', value: stats.customers, icon: Users, color: 'from-purple-500 to-pink-500' },
          { label: 'Admins', value: stats.admins, icon: ShieldCheck, color: 'from-indigo-500 to-blue-500' },
          { label: 'KYC Approved', value: stats.kycApproved, icon: CheckCircle, color: 'from-emerald-500 to-teal-500' },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-5">
              <div className={cn('w-10 h-10 rounded-lg bg-gradient-to-br text-white flex items-center justify-center mb-3', stat.color)}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold">{formatNumber(stat.value)}</p>
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
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            {([
              { key: 'all', label: 'All' },
              { key: 'customer', label: 'Customers' },
              { key: 'admin', label: 'Admins' },
              { key: 'kyc_approved', label: 'KYC Approved' },
              { key: 'kyc_pending', label: 'KYC Pending' },
            ] as const).map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all',
                  filter === f.key
                    ? 'gradient-mkopa text-white shadow-premium-md'
                    : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-400 dark:hover:bg-ink-700'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Users Table */}
      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title="No users found"
            description="Try adjusting your search or filters."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead className="bg-ink-50 dark:bg-ink-800/50 border-b border-ink-200 dark:border-ink-800">
                <tr>
                  <th className="text-left text-xs font-semibold text-ink-500 uppercase tracking-wider px-6 py-3">User</th>
                  <th className="text-left text-xs font-semibold text-ink-500 uppercase tracking-wider px-6 py-3">Role</th>
                  <th className="text-left text-xs font-semibold text-ink-500 uppercase tracking-wider px-6 py-3">KYC</th>
                  <th className="text-left text-xs font-semibold text-ink-500 uppercase tracking-wider px-6 py-3">Loan Limit</th>
                  <th className="text-left text-xs font-semibold text-ink-500 uppercase tracking-wider px-6 py-3">Joined</th>
                  <th className="text-right text-xs font-semibold text-ink-500 uppercase tracking-wider px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                {filtered.map(user => (
                  <tr key={user.id} className="hover:bg-ink-50 dark:hover:bg-ink-800/30">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={user.name} />
                        <div>
                          <p className="font-semibold text-sm">{user.name}</p>
                          <p className="text-xs text-ink-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={user.role === 'admin' ? 'primary' : 'default'}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={
                        user.kycStatus === 'approved' ? 'success' :
                        user.kycStatus === 'submitted' ? 'warning' :
                        user.kycStatus === 'rejected' ? 'danger' : 'default'
                      }>
                        {user.kycStatus}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      {user.loanLimit > 0 ? (
                        <span className="font-semibold text-sm">{formatCurrency(user.loanLimit)}</span>
                      ) : (
                        <span className="text-sm text-ink-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-ink-500">{formatDate(user.createdAt)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {user.kycStatus === 'approved' && user.role === 'customer' ? (
                        <div className="flex items-center justify-end gap-2">
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
                            className="w-28 h-8 text-xs"
                          />
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => assignLimit(user.id)}
                            disabled={actionLoading === user.id || (assigning === user.id && !limitInput)}
                          >
                            {actionLoading === user.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wallet className="w-3 h-3" />}
                            {user.loanLimit > 0 ? 'Update' : 'Assign'}
                          </Button>
                        </div>
                      ) : (
                        <button className="p-1.5 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-400">
                          <MoreVertical className="w-4 h-4" />
                        </button>
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
