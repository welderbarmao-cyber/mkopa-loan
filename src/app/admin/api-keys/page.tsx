'use client';

import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@/components/ui';
import { Code2, Plus, Eye, Trash2, Copy } from 'lucide-react';

export default function ApiKeysPage() {
  const apiKeys = [
    { id: 1, name: 'Production API Key', key: 'pg_JNKk...Seem', created: '2 days ago', lastUsed: '5 minutes ago', status: 'active' },
    { id: 2, name: 'Development Key', key: 'pg_dev1...x4yZ', created: '1 week ago', lastUsed: '2 hours ago', status: 'active' },
    { id: 3, name: 'Webhook Secret', key: 'wh_secr...8a3f', created: '2 weeks ago', lastUsed: '1 day ago', status: 'active' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Keys</h1>
          <p className="text-sm text-ink-500 mt-1">Manage API keys for external integrations</p>
        </div>
        <Button variant="primary"><Plus className="w-4 h-4" /> Generate New Key</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active API Keys</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {apiKeys.map(key => (
            <div key={key.id} className="flex items-center justify-between p-4 rounded-lg border border-ink-200 dark:border-ink-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg gradient-mkopa-soft flex items-center justify-center">
                  <Code2 className="w-5 h-5 text-mkopa-green" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{key.name}</p>
                  <p className="text-xs font-mono text-ink-500">{key.key}</p>
                  <p className="text-xs text-ink-400 mt-1">Created {key.created} · Last used {key.lastUsed}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="success">{key.status}</Badge>
                <Button variant="ghost" size="icon"><Copy className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon"><Eye className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>XDigitex Payment Integration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="font-semibold text-sm text-emerald-700 dark:text-emerald-400">Connected</p>
            </div>
            <p className="text-sm text-ink-600 dark:text-ink-400">XDigitex Pay integration is active. STK push payments via M-Pesa and Airtel are operational.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
