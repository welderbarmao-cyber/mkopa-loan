'use client';

import { PagePlaceholder } from '@/components/page-placeholder';
import { CreditCard } from 'lucide-react';

export default function RepaymentsPage() {
  return (
    <PagePlaceholder
      title="Repayments"
      description="Track loan repayments, manage schedules, and handle collections"
      icon={CreditCard}
      color="from-emerald-500 to-teal-500"
      features={[
        'Repayment schedules',
        'Auto-collection via STK push',
        'Late payment tracking',
        'Collection reports',
        'Payment reminders',
        'Reversal handling',
      ]}
    />
  );
}
