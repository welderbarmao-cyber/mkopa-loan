'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription, Button, Badge } from '@/components/ui';
import { FileText, Download, FileSpreadsheet, FileImage, Mail, Calendar, Clock } from 'lucide-react';

export default function ReportsPage() {
  const reportTypes = [
    { name: 'Loan Portfolio Report', description: 'Comprehensive overview of all active and closed loans', icon: FileText, format: 'PDF', color: 'from-blue-500 to-blue-600' },
    { name: 'User Activity Report', description: 'User registrations, KYC status, and engagement metrics', icon: FileSpreadsheet, format: 'Excel', color: 'from-emerald-500 to-teal-500' },
    { name: 'Revenue Report', description: 'Revenue breakdown by product, fees, and interest', icon: FileImage, format: 'PDF', color: 'from-purple-500 to-pink-500' },
    { name: 'KYC Verification Report', description: 'KYC submission status and approval rates', icon: FileText, format: 'CSV', color: 'from-amber-500 to-orange-500' },
    { name: 'Transaction Log', description: 'All transactions with filters and export options', icon: FileSpreadsheet, format: 'Excel', color: 'from-indigo-500 to-blue-500' },
    { name: 'Risk Assessment Report', description: 'Default rates, late payments, and risk metrics', icon: FileImage, format: 'PDF', color: 'from-red-500 to-pink-500' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-sm text-ink-500 mt-1">Generate and download comprehensive reports</p>
        </div>
        <Button variant="primary"><Calendar className="w-4 h-4" /> Schedule Report</Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportTypes.map(report => {
          const Icon = report.icon;
          return (
            <Card key={report.name} className="p-5 hover:shadow-premium-lg transition-all">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${report.color} text-white flex items-center justify-center mb-4 shadow-premium-md`}>
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base mb-1">{report.name}</h3>
              <p className="text-sm text-ink-500 mb-4">{report.description}</p>
              <div className="flex items-center justify-between">
                <Badge variant="outline">{report.format}</Badge>
                <Button variant="outline" size="sm">
                  <Download className="w-3 h-3" /> Download
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scheduled Reports</CardTitle>
          <CardDescription>Automated reports delivered to your inbox</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: 'Weekly Summary', schedule: 'Every Monday at 9:00 AM', recipients: 'admin@mkopa.com', icon: Mail },
              { name: 'Monthly Revenue Report', schedule: '1st of every month', recipients: 'admin@mkopa.com', icon: Mail },
              { name: 'Daily Transaction Log', schedule: 'Every day at 11:59 PM', recipients: 'admin@mkopa.com', icon: Clock },
            ].map(scheduled => {
              const Icon = scheduled.icon;
              return (
                <div key={scheduled.name} className="flex items-center justify-between p-3 rounded-lg border border-ink-200 dark:border-ink-800">
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-mkopa-green" />
                    <div>
                      <p className="font-semibold text-sm">{scheduled.name}</p>
                      <p className="text-xs text-ink-500">{scheduled.schedule} · {scheduled.recipients}</p>
                    </div>
                  </div>
                  <Badge variant="success">Active</Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
