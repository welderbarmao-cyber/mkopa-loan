'use client';

import { PagePlaceholder } from '@/components/page-placeholder';
import { Lock } from 'lucide-react';

export default function SecurityPage() {
  return (
    <PagePlaceholder
      title="Security"
      description="Security configuration, 2FA, and access controls"
      icon={Lock}
      color="from-indigo-500 to-purple-500"
      features={[
        'Two-factor authentication',
        'IP whitelist management',
        'Session management',
        'Device tracking',
        'Password policies',
        'Security audit trail',
      ]}
    />
  );
}
