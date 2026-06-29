'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, ShieldCheck, FileText, Wallet, Loader2, ArrowRight } from 'lucide-react';
import { formatKES } from '@/lib/utils';

export default function AdminOverview() {
  const [stats, setStats] = useState<{
    totalUsers: number;
    pendingKyc: number;
    approvedKyc: number;
    totalLoans: number;
    pendingLoans: number;
    approvedLoans: number;
    totalDisbursed: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/users').then(r => r.json()),
      fetch('/api/admin/kyc').then(r => r.json()),
      fetch('/api/admin/loans').then(r => r.json()),
    ]).then(([users, kyc, loans]) => {
      setStats({
        totalUsers: users.total || 0,
        pendingKyc: (kyc.records || []).filter((r: { kycStatus: string }) => r.kycStatus === 'submitted').length,
        approvedKyc: (kyc.records || []).filter((r: { kycStatus: string }) => r.kycStatus === 'approved').length,
        totalLoans: loans.total || 0,
        pendingLoans: (loans.records || []).filter((l: { status: string }) => l.status === 'pending').length,
        approvedLoans: (loans.records || []).filter((l: { status: string }) => l.status === 'approved' || l.status === 'disbursed').length,
        totalDisbursed: (loans.records || [])
          .filter((l: { activationFeeStatus: string }) => l.activationFeeStatus === 'paid')
          .reduce((sum: number, l: { amount: number }) => sum + l.amount, 0),
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-mkopa-green" />
      </div>
    );
  }

  const cards = [
    { label: 'Total Users', value: stats?.totalUsers || 0, icon: Users, color: 'bg-blue-500', href: '/admin/users' },
    { label: 'Pending KYC', value: stats?.pendingKyc || 0, icon: ShieldCheck, color: 'bg-yellow-500', href: '/admin/kyc' },
    { label: 'Approved KYC', value: stats?.approvedKyc || 0, icon: ShieldCheck, color: 'bg-green-500', href: '/admin/kyc' },
    { label: 'Total Loans', value: stats?.totalLoans || 0, icon: FileText, color: 'bg-purple-500', href: '/admin/loans' },
    { label: 'Pending Loans', value: stats?.pendingLoans || 0, icon: FileText, color: 'bg-orange-500', href: '/admin/loans' },
    { label: 'Total Disbursed', value: formatKES(stats?.totalDisbursed || 0), icon: Wallet, color: 'bg-mkopa-green', href: '/admin/loans' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Overview</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {cards.map(card => {
          const Icon = card.icon;
          return (
            <Link key={card.label} href={card.href} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 ${card.color} rounded-lg flex items-center justify-center text-white`}>
                  <Icon className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300" />
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-sm text-gray-500 mt-1">{card.label}</p>
            </Link>
          );
        })}
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="font-bold mb-4">Quick Actions</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <Link href="/admin/kyc" className="border-2 border-yellow-200 bg-yellow-50 rounded-lg p-4 hover:border-yellow-400 transition">
            <ShieldCheck className="w-6 h-6 text-yellow-600 mb-2" />
            <p className="font-semibold text-sm">Review KYC</p>
            <p className="text-xs text-gray-500 mt-1">{stats?.pendingKyc || 0} pending</p>
          </Link>
          <Link href="/admin/users" className="border-2 border-blue-200 bg-blue-50 rounded-lg p-4 hover:border-blue-400 transition">
            <Users className="w-6 h-6 text-blue-600 mb-2" />
            <p className="font-semibold text-sm">Assign Loan Limits</p>
            <p className="text-xs text-gray-500 mt-1">Manage customers</p>
          </Link>
          <Link href="/admin/loans" className="border-2 border-green-200 bg-green-50 rounded-lg p-4 hover:border-green-400 transition">
            <FileText className="w-6 h-6 text-green-600 mb-2" />
            <p className="font-semibold text-sm">View Loans</p>
            <p className="text-xs text-gray-500 mt-1">{stats?.pendingLoans || 0} pending</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
