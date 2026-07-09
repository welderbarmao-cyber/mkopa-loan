'use client';

import { PagePlaceholder } from '@/components/page-placeholder';
import { UserCog } from 'lucide-react';

export default function AdminsPage() {
  return (
    <PagePlaceholder
      title="Administrators"
      description="Manage admin users and their access levels"
      icon={UserCog}
      color="from-blue-500 to-indigo-500"
      features={[
        'Create admin accounts',
        'Role-based access control',
        'Permission management',
        'Activity monitoring',
        'Admin audit logs',
        'Account suspension',
      ]}
    />
  );
}
