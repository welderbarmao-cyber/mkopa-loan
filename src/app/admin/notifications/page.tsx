'use client';

import { Card, CardContent, Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import { CheckCircle, AlertTriangle, FileText, Users, DollarSign, ShieldCheck } from 'lucide-react';

export default function NotificationsPage() {
  const notifications = [
    { id: 1, type: 'kyc', title: 'New KYC Submission', message: 'John Doe submitted KYC documents for review', time: '5 minutes ago', read: false, icon: ShieldCheck, color: 'text-amber-500' },
    { id: 2, type: 'loan', title: 'Loan Application', message: 'New loan application: KES 50,000 from Jane Smith', time: '12 minutes ago', read: false, icon: FileText, color: 'text-blue-500' },
    { id: 3, type: 'payment', title: 'Payment Received', message: 'Activation fee of KES 1,992 received via M-Pesa', time: '1 hour ago', read: false, icon: DollarSign, color: 'text-emerald-500' },
    { id: 4, type: 'fraud', title: 'High-Risk Activity', message: 'Multiple login attempts from different countries', time: '2 hours ago', read: true, icon: AlertTriangle, color: 'text-red-500' },
    { id: 5, type: 'user', title: 'New Registration', message: '15 new users registered in the last hour', time: '3 hours ago', read: true, icon: Users, color: 'text-purple-500' },
    { id: 6, type: 'kyc', title: 'KYC Approved', message: 'Admin approved KYC for 5 users', time: '5 hours ago', read: true, icon: CheckCircle, color: 'text-emerald-500' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-sm text-ink-500 mt-1">Real-time platform alerts and notifications</p>
        </div>
        <Button variant="outline">Mark All Read</Button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: 'Unread', value: notifications.filter(n => !n.read).length, color: 'from-amber-500 to-orange-500' },
          { label: 'Total Today', value: 24, color: 'from-blue-500 to-blue-600' },
          { label: 'Critical Alerts', value: 1, color: 'from-red-500 to-pink-500' },
        ].map(stat => (
          <Card key={stat.label} className="p-5">
            <div className={cn('w-10 h-10 rounded-lg bg-gradient-to-br mb-3', stat.color)} />
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-sm text-ink-500 mt-1">{stat.label}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-ink-100 dark:divide-ink-800">
            {notifications.map(n => {
              const Icon = n.icon;
              return (
                <div key={n.id} className={cn('flex items-start gap-4 p-4 hover:bg-ink-50 dark:hover:bg-ink-800/30 transition', !n.read && 'bg-mkopa-green/5')}>
                  <div className={cn('w-10 h-10 rounded-lg bg-ink-100 dark:bg-ink-800 flex items-center justify-center flex-shrink-0', n.color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{n.title}</p>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-mkopa-green animate-pulse" />}
                    </div>
                    <p className="text-sm text-ink-500 mt-1">{n.message}</p>
                    <p className="text-xs text-ink-400 mt-1">{n.time}</p>
                  </div>
                  <Button variant="ghost" size="sm">View</Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
