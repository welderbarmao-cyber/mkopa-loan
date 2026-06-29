'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, Button, Badge, Skeleton } from '@/components/ui';
import { cn, formatCurrency, formatNumber, formatPercent } from '@/lib/cn';
import {
  Users, ShieldCheck, FileText, Wallet, TrendingUp, TrendingDown,
  AlertTriangle, LifeBuoy, ArrowRight, ArrowUpRight, Clock, CheckCircle,
  XCircle, DollarSign, Activity
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  pendingKyc: number;
  approvedKyc: number;
  rejectedKyc: number;
  totalLoans: number;
  pendingLoans: number;
  approvedLoans: number;
  rejectedLoans: number;
  totalDisbursed: number;
  revenue: number;
  interestEarned: number;
  latePayments: number;
  defaultRate: number;
  fraudAlerts: number;
  supportTickets: number;
  newRegistrations: number;
}

// Sample chart data
const loansTrendData = [
  { name: 'Mon', loans: 12, amount: 450000 },
  { name: 'Tue', loans: 19, amount: 720000 },
  { name: 'Wed', loans: 15, amount: 580000 },
  { name: 'Thu', loans: 22, amount: 940000 },
  { name: 'Fri', loans: 28, amount: 1200000 },
  { name: 'Sat', loans: 18, amount: 680000 },
  { name: 'Sun', loans: 9, amount: 340000 },
];

const kycDistribution = [
  { name: 'Approved', value: 1247, color: '#10b981' },
  { name: 'Pending', value: 89, color: '#f59e0b' },
  { name: 'Rejected', value: 34, color: '#ef4444' },
];

const revenueData = [
  { name: 'Jan', revenue: 240000, target: 200000 },
  { name: 'Feb', revenue: 280000, target: 220000 },
  { name: 'Mar', revenue: 320000, target: 250000 },
  { name: 'Apr', revenue: 290000, target: 280000 },
  { name: 'May', revenue: 380000, target: 300000 },
  { name: 'Jun', revenue: 420000, target: 320000 },
];

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/users').then(r => r.json()),
      fetch('/api/admin/kyc').then(r => r.json()),
      fetch('/api/admin/loans').then(r => r.json()),
    ]).then(([users, kyc, loans]) => {
      const totalLoans = loans.total || 0;
      const allLoans = loans.records || [];
      const disbursedAmount = allLoans
        .filter((l: { activationFeeStatus: string }) => l.activationFeeStatus === 'paid')
        .reduce((sum: number, l: { amount: number }) => sum + l.amount, 0);

      setStats({
        totalUsers: users.total || 0,
        activeUsers: Math.floor((users.total || 0) * 0.7),
        pendingKyc: (kyc.records || []).filter((r: { kycStatus: string }) => r.kycStatus === 'submitted').length,
        approvedKyc: (kyc.records || []).filter((r: { kycStatus: string }) => r.kycStatus === 'approved').length,
        rejectedKyc: (kyc.records || []).filter((r: { kycStatus: string }) => r.kycStatus === 'rejected').length,
        totalLoans,
        pendingLoans: allLoans.filter((l: { status: string }) => l.status === 'pending').length,
        approvedLoans: allLoans.filter((l: { status: string }) => l.status === 'approved' || l.status === 'disbursed').length,
        rejectedLoans: allLoans.filter((l: { status: string }) => l.status === 'rejected').length,
        totalDisbursed: disbursedAmount,
        revenue: Math.floor(disbursedAmount * 0.12),
        interestEarned: Math.floor(disbursedAmount * 0.08),
        latePayments: Math.floor(totalLoans * 0.05),
        defaultRate: 2.3,
        fraudAlerts: 3,
        supportTickets: 7,
        newRegistrations: Math.floor((users.total || 0) * 0.15),
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const primaryStats = [
    {
      label: 'Total Users',
      value: formatNumber(stats?.totalUsers || 0),
      change: '+12.5%',
      trend: 'up' as const,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      description: `${stats?.newRegistrations || 0} new this week`,
    },
    {
      label: 'Pending KYC',
      value: formatNumber(stats?.pendingKyc || 0),
      change: '+5.2%',
      trend: 'up' as const,
      icon: ShieldCheck,
      color: 'from-amber-500 to-orange-500',
      description: 'Awaiting review',
    },
    {
      label: 'Total Loans',
      value: formatNumber(stats?.totalLoans || 0),
      change: '+18.3%',
      trend: 'up' as const,
      icon: FileText,
      color: 'from-purple-500 to-pink-500',
      description: `${stats?.pendingLoans || 0} pending approval`,
    },
    {
      label: 'Total Disbursed',
      value: formatCurrency(stats?.totalDisbursed || 0),
      change: '+24.1%',
      trend: 'up' as const,
      icon: Wallet,
      color: 'from-emerald-500 to-teal-500',
      description: 'Across all active loans',
    },
  ];

  const secondaryStats = [
    { label: 'Revenue', value: formatCurrency(stats?.revenue || 0), change: '+15.2%', trend: 'up' as const, icon: DollarSign },
    { label: 'Interest Earned', value: formatCurrency(stats?.interestEarned || 0), change: '+8.7%', trend: 'up' as const, icon: TrendingUp },
    { label: 'Late Payments', value: formatNumber(stats?.latePayments || 0), change: '-2.1%', trend: 'down' as const, icon: Clock },
    { label: 'Default Rate', value: formatPercent(stats?.defaultRate || 0), change: '-0.4%', trend: 'down' as const, icon: TrendingDown },
    { label: 'Fraud Alerts', value: formatNumber(stats?.fraudAlerts || 0), change: '+1', trend: 'up' as const, icon: AlertTriangle },
    { label: 'Support Tickets', value: formatNumber(stats?.supportTickets || 0), change: '-3', trend: 'down' as const, icon: LifeBuoy },
    { label: 'Active Users', value: formatNumber(stats?.activeUsers || 0), change: '+9.4%', trend: 'up' as const, icon: Activity },
    { label: 'New Registrations', value: formatNumber(stats?.newRegistrations || 0), change: '+22.8%', trend: 'up' as const, icon: Users },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-ink-500 mt-1">Welcome back. Here&apos;s what&apos;s happening with your platform today.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="md">
            <Activity className="w-4 h-4" /> Live View
          </Button>
          <Button variant="primary" size="md">
            <FileText className="w-4 h-4" /> Generate Report
          </Button>
        </div>
      </div>

      {/* Primary Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {primaryStats.map(stat => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="relative overflow-hidden group hover:shadow-premium-lg transition-all">
              <div className={cn('absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 bg-gradient-to-br', stat.color)} />
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={cn('w-11 h-11 rounded-xl bg-gradient-to-br text-white flex items-center justify-center shadow-premium-md', stat.color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <Badge variant={stat.trend === 'up' ? 'success' : 'danger'}>
                    {stat.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {stat.change}
                  </Badge>
                </div>
                <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                <p className="text-sm font-medium text-ink-700 dark:text-ink-300 mt-1">{stat.label}</p>
                <p className="text-xs text-ink-500 mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Loans Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Loan Applications</CardTitle>
                <CardDescription>Last 7 days performance</CardDescription>
              </div>
              <Badge variant="primary">+18.3% vs last week</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={loansTrendData}>
                <defs>
                  <linearGradient id="loansGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#009739" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#009739" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="amountGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E87722" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#E87722" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgb(24 24 27)',
                    border: '1px solid rgb(39 39 42)',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '12px',
                  }}
                />
                <Area type="monotone" dataKey="loans" stroke="#009739" strokeWidth={2} fill="url(#loansGrad)" name="Loans" />
                <Area type="monotone" dataKey="amount" stroke="#E87722" strokeWidth={2} fill="url(#amountGrad)" name="Amount (KES)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* KYC Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>KYC Status</CardTitle>
            <CardDescription>Distribution overview</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={kycDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {kycDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgb(24 24 27)',
                    border: '1px solid rgb(39 39 42)',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-4">
              {kycDistribution.map(item => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-ink-600 dark:text-ink-400">{item.name}</span>
                  </div>
                  <span className="text-sm font-semibold">{formatNumber(item.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart + Secondary Stats */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Revenue vs Target</CardTitle>
                <CardDescription>Monthly performance comparison</CardDescription>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-mkopa-green" />
                  <span>Revenue</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-ink-300" />
                  <span>Target</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v/1000}K`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgb(24 24 27)',
                    border: '1px solid rgb(39 39 42)',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '12px',
                  }}
                  formatter={((v: unknown) => formatCurrency(Number(v))) as never}
                />
                <Bar dataKey="target" fill="#d4d4d8" radius={[4, 4, 0, 0]} name="Target" />
                <Bar dataKey="revenue" fill="#009739" radius={[4, 4, 0, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Secondary Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {secondaryStats.map(stat => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Icon className="w-4 h-4 text-ink-400" />
                  <Badge variant={stat.trend === 'up' ? 'success' : 'danger'} className="text-xs">
                    {stat.change}
                  </Badge>
                </div>
                <p className="text-lg font-bold">{stat.value}</p>
                <p className="text-xs text-ink-500 mt-0.5">{stat.label}</p>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Frequently used administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { href: '/admin/kyc', label: 'Review KYC', icon: ShieldCheck, color: 'bg-amber-500', count: stats?.pendingKyc },
              { href: '/admin/users', label: 'Assign Limits', icon: Wallet, color: 'bg-blue-500' },
              { href: '/admin/loans', label: 'Approve Loans', icon: FileText, color: 'bg-emerald-500', count: stats?.pendingLoans },
              { href: '/admin/fraud', label: 'Fraud Alerts', icon: AlertTriangle, color: 'bg-red-500', count: stats?.fraudAlerts },
            ].map(action => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group flex items-center gap-3 p-4 rounded-xl border border-ink-200 dark:border-ink-800 hover:border-mkopa-green/40 hover:shadow-premium-md transition-all"
                >
                  <div className={cn('w-10 h-10 rounded-lg text-white flex items-center justify-center', action.color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{action.label}</p>
                    {action.count !== undefined && action.count > 0 && (
                      <p className="text-xs text-ink-500">{action.count} pending</p>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-ink-300 group-hover:text-mkopa-green group-hover:translate-x-1 transition-all" />
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest platform events</CardDescription>
            </div>
            <Button variant="ghost" size="sm">View All</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { icon: CheckCircle, color: 'text-emerald-500', title: 'KYC approved for John Doe', time: '5 minutes ago' },
              { icon: FileText, color: 'text-blue-500', title: 'New loan application: KES 50,000', time: '12 minutes ago' },
              { icon: AlertTriangle, color: 'text-amber-500', title: 'High-risk transaction flagged', time: '1 hour ago' },
              { icon: Users, color: 'text-purple-500', title: '15 new user registrations', time: '2 hours ago' },
              { icon: XCircle, color: 'text-red-500', title: 'Loan #1234 rejected', time: '3 hours ago' },
            ].map((activity, i) => {
              const Icon = activity.icon;
              return (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-ink-50 dark:hover:bg-ink-800/50">
                  <Icon className={cn('w-5 h-5', activity.color)} />
                  <p className="flex-1 text-sm">{activity.title}</p>
                  <span className="text-xs text-ink-400">{activity.time}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
