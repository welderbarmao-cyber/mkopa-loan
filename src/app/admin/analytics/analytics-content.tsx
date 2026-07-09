'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription, Badge } from '@/components/ui';
import { cn, formatCurrency, formatNumber, formatPercent } from '@/lib/cn';
import { TrendingUp, Users, FileText, DollarSign } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const userGrowthData = [
  { name: 'Jan', users: 120, loans: 45 },
  { name: 'Feb', users: 180, loans: 67 },
  { name: 'Mar', users: 240, loans: 89 },
  { name: 'Apr', users: 320, loans: 124 },
  { name: 'May', users: 450, loans: 178 },
  { name: 'Jun', users: 580, loans: 234 },
];

const loanTypeData = [
  { name: 'Personal', value: 45, color: '#009739' },
  { name: 'Business', value: 25, color: '#E87722' },
  { name: 'Emergency', value: 15, color: '#ef4444' },
  { name: 'Education', value: 10, color: '#3b82f6' },
  { name: 'Asset', value: 5, color: '#a855f7' },
];

const performanceData = [
  { name: 'Week 1', approval: 78, rejection: 22 },
  { name: 'Week 2', approval: 82, rejection: 18 },
  { name: 'Week 3', approval: 85, rejection: 15 },
  { name: 'Week 4', approval: 88, rejection: 12 },
];

export default function AnalyticsPage() {
  const kpis = [
    { label: 'Total Revenue', value: formatCurrency(2840000), change: '+24.1%', icon: DollarSign, color: 'from-emerald-500 to-teal-500' },
    { label: 'Active Users', value: formatNumber(1247), change: '+12.5%', icon: Users, color: 'from-blue-500 to-blue-600' },
    { label: 'Loan Approval Rate', value: formatPercent(87.4), change: '+3.2%', icon: FileText, color: 'from-purple-500 to-pink-500' },
    { label: 'Avg. Loan Size', value: formatCurrency(48500), change: '+8.7%', icon: TrendingUp, color: 'from-amber-500 to-orange-500' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-ink-500 mt-1">Deep insights into platform performance and trends</p>
      </div>

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={cn('w-10 h-10 rounded-lg bg-gradient-to-br text-white flex items-center justify-center', kpi.color)}>
                  <Icon className="w-5 h-5" />
                </div>
                <Badge variant="success">{kpi.change}</Badge>
              </div>
              <p className="text-2xl font-bold">{kpi.value}</p>
              <p className="text-sm text-ink-500 mt-1">{kpi.label}</p>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>User Growth</CardTitle>
            <CardDescription>Users vs Loans over 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={userGrowthData}>
                <defs>
                  <linearGradient id="usersGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#009739" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#009739" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="loansGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E87722" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#E87722" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'rgb(24 24 27)', border: '1px solid rgb(39 39 42)', borderRadius: '12px', color: 'white', fontSize: '12px' }} />
                <Area type="monotone" dataKey="users" stroke="#009739" strokeWidth={2} fill="url(#usersGrad)" />
                <Area type="monotone" dataKey="loans" stroke="#E87722" strokeWidth={2} fill="url(#loansGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Loan Distribution</CardTitle>
            <CardDescription>By product type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={loanTypeData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label>
                  {loanTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'rgb(24 24 27)', border: '1px solid rgb(39 39 42)', borderRadius: '12px', color: 'white', fontSize: '12px' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Approval Performance</CardTitle>
            <CardDescription>Weekly approval vs rejection rates</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'rgb(24 24 27)', border: '1px solid rgb(39 39 42)', borderRadius: '12px', color: 'white', fontSize: '12px' }} />
                <Legend />
                <Bar dataKey="approval" fill="#009739" radius={[4, 4, 0, 0]} name="Approved %" />
                <Bar dataKey="rejection" fill="#ef4444" radius={[4, 4, 0, 0]} name="Rejected %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Monthly revenue growth</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'rgb(24 24 27)', border: '1px solid rgb(39 39 42)', borderRadius: '12px', color: 'white', fontSize: '12px' }} />
                <Line type="monotone" dataKey="users" stroke="#009739" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
