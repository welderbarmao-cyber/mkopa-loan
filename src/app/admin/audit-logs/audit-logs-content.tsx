'use client';

import { Card, CardContent, Button, Badge, Input } from '@/components/ui';
import { Search, Download, Shield, User, FileText, Settings } from 'lucide-react';

export default function AuditLogsPage() {
  const logs = [
    { id: 1, action: 'KYC Approved', user: 'admin@mkopa.com', target: 'user@example.com', ip: '41.90.64.1', time: '5 minutes ago', icon: Shield, color: 'text-emerald-500' },
    { id: 2, action: 'Loan Limit Assigned', user: 'admin@mkopa.com', target: 'KES 100,000 to jane@example.com', ip: '41.90.64.1', time: '12 minutes ago', icon: User, color: 'text-blue-500' },
    { id: 3, action: 'Loan Approved', user: 'admin@mkopa.com', target: 'Loan #45 - KES 50,000', ip: '41.90.64.1', time: '1 hour ago', icon: FileText, color: 'text-purple-500' },
    { id: 4, action: 'Settings Updated', user: 'admin@mkopa.com', target: 'Interest rate changed to 12.5%', ip: '41.90.64.1', time: '2 hours ago', icon: Settings, color: 'text-amber-500' },
    { id: 5, action: 'User Suspended', user: 'admin@mkopa.com', target: 'fraud@example.com', ip: '41.90.64.1', time: '3 hours ago', icon: Shield, color: 'text-red-500' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-sm text-ink-500 mt-1">Complete trail of all administrative actions</p>
        </div>
        <Button variant="outline"><Download className="w-4 h-4" /> Export Logs</Button>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <Input type="text" placeholder="Search logs by action, user, or IP..." className="pl-10" />
        </div>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-ink-100 dark:divide-ink-800">
            {logs.map(log => {
              const Icon = log.icon;
              return (
                <div key={log.id} className="flex items-start gap-4 p-4 hover:bg-ink-50 dark:hover:bg-ink-800/30">
                  <div className={`w-10 h-10 rounded-lg bg-ink-100 dark:bg-ink-800 flex items-center justify-center ${log.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{log.action}</p>
                    </div>
                    <p className="text-sm text-ink-500 mt-1">{log.target}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-ink-400">
                      <span>By: {log.user}</span>
                      <span>·</span>
                      <span>IP: {log.ip}</span>
                      <span>·</span>
                      <span>{log.time}</span>
                    </div>
                  </div>
                  <Badge variant="outline">View Details</Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
