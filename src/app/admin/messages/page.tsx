'use client';

import { PagePlaceholder } from '@/components/page-placeholder';
import { MessageSquare } from 'lucide-react';

export default function MessagesPage() {
  return (
    <PagePlaceholder
      title="Messages"
      description="Internal messaging and customer communication"
      icon={MessageSquare}
      color="from-blue-500 to-indigo-500"
      features={[
        'Direct customer messaging',
        'Bulk SMS campaigns',
        'Email templates',
        'Message scheduling',
        'Two-way chat',
        'Automated responses',
      ]}
    />
  );
}
