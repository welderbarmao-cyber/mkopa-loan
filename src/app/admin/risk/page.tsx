'use client';

import { PagePlaceholder } from '@/components/page-placeholder';
import { AlertTriangle } from 'lucide-react';

export default function RiskPage() {
  return (
    <PagePlaceholder
      title="Risk Management"
      description="Assess and manage credit risk across the loan portfolio"
      icon={AlertTriangle}
      color="from-amber-500 to-red-500"
      features={[
        'Credit scoring engine',
        'Risk assessment models',
        'Default rate monitoring',
        'Portfolio risk analysis',
        'Automated risk flags',
        'Collection strategies',
      ]}
    />
  );
}
