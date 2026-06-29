'use client';

import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import { AlertTriangle, Eye, MapPin, Smartphone, Globe, Ban } from 'lucide-react';

export default function FraudPage() {
  const alerts = [
    { id: 1, type: 'Multiple Accounts', severity: 'high', user: 'user@example.com', description: 'Same device registered 3 accounts', time: '5 minutes ago', icon: Smartphone },
    { id: 2, type: 'VPN Detection', severity: 'medium', user: 'test@example.com', description: 'Login from VPN IP address', time: '1 hour ago', icon: Globe },
    { id: 3, type: 'Impossible Travel', severity: 'high', user: 'jane@example.com', description: 'Login from Kenya then Nigeria in 5 min', time: '2 hours ago', icon: MapPin },
    { id: 4, type: 'Fake Document', severity: 'critical', user: 'fraud@example.com', description: 'National ID failed forgery detection', time: '3 hours ago', icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Fraud Monitoring</h1>
        <p className="text-sm text-ink-500 mt-1">Real-time fraud detection and prevention</p>
      </div>

      <div className="grid sm:grid-cols-4 gap-4">
        {[
          { label: 'Active Alerts', value: 4, color: 'from-red-500 to-pink-500' },
          { label: 'Critical', value: 1, color: 'from-red-600 to-red-700' },
          { label: 'High Risk Users', value: 7, color: 'from-amber-500 to-orange-500' },
          { label: 'Blocked Today', value: 2, color: 'from-ink-500 to-ink-600' },
        ].map(stat => (
          <Card key={stat.label} className="p-5">
            <div className={cn('w-10 h-10 rounded-lg bg-gradient-to-br mb-3', stat.color)} />
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-sm text-ink-500 mt-1">{stat.label}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Fraud Alerts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {alerts.map(alert => {
            const Icon = alert.icon;
            return (
              <div key={alert.id} className="flex items-start gap-4 p-4 rounded-lg border border-ink-200 dark:border-ink-800 hover:shadow-premium-md transition">
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center',
                  alert.severity === 'critical' ? 'bg-red-100 text-red-600 dark:bg-red-900/30' :
                  alert.severity === 'high' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30' :
                  'bg-amber-100 text-amber-600 dark:bg-amber-900/30'
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{alert.type}</p>
                    <Badge variant={alert.severity === 'critical' ? 'danger' : alert.severity === 'high' ? 'warning' : 'default'}>
                      {alert.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-ink-500 mt-1">{alert.description}</p>
                  <p className="text-xs text-ink-400 mt-1">{alert.user} · {alert.time}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm"><Eye className="w-3 h-3" /> View</Button>
                  <Button variant="destructive" size="sm"><Ban className="w-3 h-3" /> Block</Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
