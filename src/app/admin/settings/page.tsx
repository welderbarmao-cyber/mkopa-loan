'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Avatar } from '@/components/ui';
import { Percent, Globe, Mail, Power, Shield } from 'lucide-react';

export default function SettingsPage() {
  const settingsGroups = [
    {
      title: 'Loan Configuration',
      icon: Percent,
      settings: [
        { label: 'Default Interest Rate', value: '12.5%', type: 'input' },
        { label: 'Maximum Loan Amount', value: 'KES 500,000', type: 'input' },
        { label: 'Minimum Loan Amount', value: 'KES 5,000', type: 'input' },
        { label: 'Maximum Term (Months)', value: '60', type: 'input' },
        { label: 'Activation Fee Rate', value: 'KES 199 per 5,000', type: 'input' },
        { label: 'Processing Fee', value: '3.58%', type: 'input' },
      ],
    },
    {
      title: 'Currency & Region',
      icon: Globe,
      settings: [
        { label: 'Base Currency', value: 'KES', type: 'select' },
        { label: 'Supported Countries', value: 'Kenya, Uganda, Tanzania', type: 'input' },
        { label: 'Default Language', value: 'English', type: 'select' },
        { label: 'Timezone', value: 'Africa/Nairobi (UTC+3)', type: 'select' },
      ],
    },
    {
      title: 'Communication',
      icon: Mail,
      settings: [
        { label: 'Email Provider', value: 'SendGrid', type: 'select' },
        { label: 'SMS Gateway', value: 'Africa\'s Talking', type: 'select' },
        { label: 'Push Notifications', value: 'Enabled', type: 'toggle' },
        { label: 'Email Notifications', value: 'Enabled', type: 'toggle' },
      ],
    },
    {
      title: 'Security',
      icon: Shield,
      settings: [
        { label: 'Two-Factor Authentication', value: 'Enabled', type: 'toggle' },
        { label: 'Session Timeout', value: '30 minutes', type: 'input' },
        { label: 'Password Policy', value: 'Strong (12+ chars)', type: 'select' },
        { label: 'IP Whitelist', value: '0.0.0.0/0 (all)', type: 'input' },
      ],
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
          <p className="text-sm text-ink-500 mt-1">Configure platform-wide settings and preferences</p>
        </div>
        <Button variant="primary">Save Changes</Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {settingsGroups.map(group => {
          const Icon = group.icon;
          return (
            <Card key={group.title}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg gradient-mkopa-soft flex items-center justify-center">
                    <Icon className="w-5 h-5 text-mkopa-green" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{group.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {group.settings.map(setting => (
                  <div key={setting.label} className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">{setting.label}</p>
                      <p className="text-xs text-ink-500">{setting.value}</p>
                    </div>
                    {setting.type === 'toggle' ? (
                      <button className="relative w-11 h-6 rounded-full bg-mkopa-green">
                        <span className="absolute right-0.5 top-0.5 w-5 h-5 rounded-full bg-white" />
                      </button>
                    ) : (
                      <Button variant="outline" size="sm">Edit</Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>Customize the platform appearance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-ink-200 dark:border-ink-800">
              <p className="text-sm font-medium mb-2">Primary Color</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-mkopa-green" />
                <span className="text-sm font-mono">#009739</span>
              </div>
            </div>
            <div className="p-4 rounded-lg border border-ink-200 dark:border-ink-800">
              <p className="text-sm font-medium mb-2">Accent Color</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-mkopa-orange" />
                <span className="text-sm font-mono">#E87722</span>
              </div>
            </div>
            <div className="p-4 rounded-lg border border-ink-200 dark:border-ink-800">
              <p className="text-sm font-medium mb-2">Logo</p>
              <Avatar name="M-Kopa" className="w-8 h-8" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-200 dark:border-red-900/50">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
          <CardDescription>Maintenance mode and system controls</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10">
            <div>
              <p className="font-semibold text-sm">Maintenance Mode</p>
              <p className="text-xs text-ink-500">Temporarily disable customer access to the platform</p>
            </div>
            <Button variant="destructive" size="sm"><Power className="w-4 h-4" /> Enable</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
