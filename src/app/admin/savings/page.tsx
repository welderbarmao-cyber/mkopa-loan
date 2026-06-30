'use client';

import { PagePlaceholder } from '@/components/page-placeholder';
import { PiggyBank } from 'lucide-react';

export default function SavingsPage() {
  return (
    <PagePlaceholder
      title="Savings"
      description="Customer savings accounts and interest management"
      icon={PiggyBank}
      color="from-purple-500 to-pink-500"
      features={[
        'Savings account management',
        'Interest calculation',
        'Deposit tracking',
        'Withdrawal requests',
        'Savings goals',
        'Interest rate configuration',
      ]}
    />
  );
}
