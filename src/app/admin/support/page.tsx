'use client';

import { PagePlaceholder } from '@/components/page-placeholder';
import { LifeBuoy } from 'lucide-react';

export default function SupportPage() {
  return (
    <PagePlaceholder
      title="Support Tickets"
      description="Manage customer support requests and tickets"
      icon={LifeBuoy}
      color="from-cyan-500 to-blue-500"
      features={[
        'Ticket management',
        'Priority queues',
        'SLA tracking',
        'Knowledge base',
        'Agent assignment',
        'Resolution metrics',
      ]}
    />
  );
}
