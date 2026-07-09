'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, Button, Badge, Skeleton } from '@/components/ui';
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
  { name: 'Approved', value: 1247, color: '#009739' },
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
        pendingKyc: (kyc.records || []).filter((r: { kycStatus: string }) => r.kycStatus === 'submitted' || r.kycStatus === 'none').length,
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
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
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
      href: '/admin/users',
    },
    {
      label: 'Pending KYC',
      value: formatNumber(stats?.pendingKyc || 0),
      change: '+5.2%',
      trend: 'up' as const,
      icon: ShieldCheck,
      color: 'from-amber-500 to-orange-500',
      description: 'Awaiting review',
      href: '/admin/kyc',
    },
    {
      label: 'Total Loans',
      value: formatNumber(stats?.totalLoans || 0),
      change: '+18.3%',
      trend: 'up' as const,
      icon: FileText,
      color: 'from-purple-500 to-pink-500',
      description: `${stats?.pendingLoans || 0} pending`,
      href: '/admin/loans',
    },
    {
      label: 'Total Disbursed',
      value: formatCurrency(stats?.totalDisbursed || 0),
      change: '+24.1%',
      trend: 'up' as const,
      icon: Wallet,
      color: 'from-mkopa-green to-mkopa-dark',
      description: 'Active loans',
      href: '/admin/loans',
    },
  ];

  const secondaryStats = [
    { label: 'Revenue', value: formatCurrency(stats?.revenue || 0), change: '+15.2%', trend: 'up' as const, icon: DollarSign, href: '/admin/analytics' },
    { label: 'Interest', value: formatCurrency(stats?.interestEarned || 0), change: '+8.7%', trend: 'up' as const, icon: TrendingUp, href: '/admin/analytics' },
    { label: 'Late Payments', value: formatNumber(stats?.latePayments || 0), change: '-2.1%', trend: 'down' as const, icon: Clock, href: '/admin/repayments' },
    { label: 'Default Rate', value: formatPercent(stats?.defaultRate || 0), change: '-0.4%', trend: 'down' as const, icon: TrendingDown, href: '/admin/risk' },
    { label: 'Fraud Alerts', value: formatNumber(stats?.fraudAlerts || 0), change: '+1', trend: 'up' as const, icon: AlertTriangle, href: '/admin/fraud' },
    { label: 'Support', value: formatNumber(stats?.supportTickets || 0), change: '-3', trend: 'down' as const, icon: LifeBuoy, href: '/admin/support' },
    { label: 'Active Users', value: formatNumber(stats?.activeUsers || 0), change: '+9.4%', trend: 'up' as const, icon: Activity, href: '/admin/users' },
    { label: 'New Signups', value: formatNumber(stats?.newRegistrations || 0), change: '+22.8%', trend: 'up' as const, icon: Users, href: '/admin/users' },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header - Compact */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-ink-500">Platform overview &amp; insights</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/reports">
            <Button variant="outline" size="sm">
              <FileText className="w-4 h-4" /> Reports
            </Button>
          </Link>
          <Link href="/admin/analytics">
            <Button variant="primary" size="sm">
              <Activity className="w-4 h-4" /> Analytics
            </Button>
          </Link>
        </div>
      </div>

      {/* Primary Stats - Compact */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {primaryStats.map(stat => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href}>
              <Card className="relative overflow-hidden group hover:shadow-premium-lg transition-all p-4">
                <div className={cn('absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-10 bg-gradient-to-br', stat.color)} />
                <div className="flex items-start justify-between mb-2">
                  <div className={cn('w-9 h-9 rounded-lg bg-gradient-to-br text-white flex items-center justify-center shadow-premium-md', stat.color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <Badge variant={stat.trend === 'up' ? 'success' : 'danger'}>
                    {stat.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {stat.change}
                  </Badge>
                </div>
                <p className="text-xl font-bold tracking-tight truncate">{stat.value}</p>
                <p className="text-xs font-medium text-ink-700 dark:text-ink-300">{stat.label}</p>
                <p className="text-xs text-ink-500 mt-0.5 truncate">{stat.description}</p>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Charts Row - Compact */}
      <div className="grid lg:grid-cols-3 gap-3">
        {/* Loans Trend */}
        <Card className="lg:col-span-2">
          <div className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">Loan Applications</h3>
                <p className="text-xs text-ink-500">Last 7 days</p>
              </div>
              <Badge variant="primary">+18.3%</Badge>
            </div>
          </div>
          <div className="p-2 pt-0">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={loansTrendData}>
                <defs>
                  <linearGradient id="loansGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#009739" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#009739" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgb(24 24 27)',
                    border: '1px solid rgb(39 39 42)',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '12px',
                  }}
                />
                <Area type="monotone" dataKey="loans" stroke="#009739" strokeWidth={2} fill="url(#loansGrad)" name="Loans" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* KYC Distribution */}
        <Card>
          <div className="p-4 pb-2">
            <h3 className="font-semibold text-sm">KYC Status</h3>
            <p className="text-xs text-ink-500">Distribution</p>
          </div>
          <div className="p-2">
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie
                  data={kycDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={55}
                  paddingAngle={3}
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
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1 px-3 pb-3">
              {kycDistribution.map(item => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-ink-600 dark:text-ink-400">{item.name}</span>
                  </div>
                  <span className="font-semibold">{formatNumber(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Revenue + Secondary Stats - Compact */}
      <div className="grid lg:grid-cols-3 gap-3">
        <Card className="lg:col-span-2">
          <div className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">Revenue vs Target</h3>
                <p className="text-xs text-ink-500">Monthly comparison</p>
              </div>
            </div>
          </div>
          <div className="p-2">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v/1000}K`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgb(24 24 27)',
                    border: '1px solid rgb(39 39 42)',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '12px',
                  }}
                  formatter={((v: unknown) => formatCurrency(Number(v))) as never}
                />
                <Bar dataKey="target" fill="#d4d4d8" radius={[3, 3, 0, 0]} name="Target" />
                <Bar dataKey="revenue" fill="#009739" radius={[3, 3, 0, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Secondary Stats Grid - Compact */}
        <div className="grid grid-cols-2 gap-2">
          {secondaryStats.map(stat => {
            const Icon = stat.icon;
            return (
              <Link key={stat.label} href={stat.href}>
                <Card className="p-3 hover:shadow-premium-md transition-all h-full">
                  <div className="flex items-center justify-between mb-1">
                    <Icon className="w-3.5 h-3.5 text-ink-400" />
                    <Badge variant={stat.trend === 'up' ? 'success' : 'danger'} className="text-xs px-1.5 py-0">
                      {stat.change}
                    </Badge>
                  </div>
                  <p className="text-sm font-bold truncate">{stat.value}</p>
                  <p className="text-xs text-ink-500 truncate">{stat.label}</p>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Quick Actions - Compact */}
      <Card>
        <div className="p-4 pb-2">
          <h3 className="font-semibold text-sm">Quick Actions</h3>
          <p className="text-xs text-ink-500">Frequently used tasks</p>
        </div>
        <div className="p-3 pt-1">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
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
                  className="group flex items-center gap-2 p-3 rounded-lg border border-ink-200 dark:border-ink-800 hover:border-mkopa-green/40 hover:shadow-premium-md transition-all"
                >
                  <div className={cn('w-8 h-8 rounded-lg text-white flex items-center justify-center flex-shrink-0', action.color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{action.label}</p>
                    {action.count !== undefined && action.count > 0 && (
                      <p className="text-xs text-ink-500">{action.count} pending</p>
                    )}
                  </div>
                  <ArrowRight className="w-3 h-3 text-ink-300 group-hover:text-mkopa-green group-hover:translate-x-1 transition-all flex-shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Recent Activity - Compact */}
      <Card>
        <div className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm">Recent Activity</h3>
              <p className="text-xs text-ink-500">Latest platform events</p>
            </div>
            <Link href="/admin/audit-logs" className="text-xs text-mkopa-green font-semibold hover:underline">
              View All
            </Link>
          </div>
        </div>
        <div className="p-3 pt-1">
          <div className="space-y-1">
            {[
              { icon: CheckCircle, color: 'text-emerald-500', title: 'KYC approved for John Doe', time: '5m ago' },
              { icon: FileText, color: 'text-blue-500', title: 'New loan application: KES 50,000', time: '12m ago' },
              { icon: AlertTriangle, color: 'text-amber-500', title: 'High-risk transaction flagged', time: '1h ago' },
              { icon: Users, color: 'text-purple-500', title: '15 new user registrations', time: '2h ago' },
              { icon: XCircle, color: 'text-red-500', title: 'Loan #1234 rejected', time: '3h ago' },
            ].map((activity, i) => {
              const Icon = activity.icon;
              return (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg hover:bg-ink-50 dark:hover:bg-ink-800/50">
                  <Icon className={cn('w-4 h-4 flex-shrink-0', activity.color)} />
                  <p className="flex-1 text-xs truncate">{activity.title}</p>
                  <span className="text-xs text-ink-400 flex-shrink-0">{activity.time}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}
