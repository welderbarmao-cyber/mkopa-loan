'use client';

import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Avatar } from '@/components/ui';
import { useSession } from 'next-auth/react';
import { signOut } from 'next-auth/react';
import { Mail, Phone, Shield, LogOut, Edit, Key } from 'lucide-react';

export default function ProfilePage() {
  const { data: session } = useSession();
  const userName = session?.user?.name || 'Admin';
  const userEmail = session?.user?.email || '';
  const userPhone = (session?.user as { phone?: string })?.phone || '';

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-ink-500 mt-1">Manage your admin account</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <Avatar name={userName} className="w-24 h-24 text-2xl" />
            <div className="flex-1">
              <h2 className="text-xl font-bold">{userName}</h2>
              <p className="text-sm text-ink-500">{userEmail}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="primary"><Shield className="w-3 h-3" /> Administrator</Badge>
                <Badge variant="success">Active</Badge>
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm"><Edit className="w-3 h-3" /> Edit Profile</Button>
                <Button variant="outline" size="sm"><Key className="w-3 h-3" /> Change Password</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Contact Information</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-ink-400" />
              <div>
                <p className="text-xs text-ink-500">Email</p>
                <p className="text-sm font-medium">{userEmail}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-ink-400" />
              <div>
                <p className="text-xs text-ink-500">Phone</p>
                <p className="text-sm font-medium">{userPhone}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Security</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-ink-400" />
                <p className="text-sm font-medium">Two-Factor Auth</p>
              </div>
              <Badge variant="success">Enabled</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Key className="w-4 h-4 text-ink-400" />
                <p className="text-sm font-medium">Last Password Change</p>
              </div>
              <span className="text-xs text-ink-500">30 days ago</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-red-200 dark:border-red-900/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-red-600">Sign Out</h3>
              <p className="text-sm text-ink-500">Sign out of your admin account</p>
            </div>
            <Button variant="destructive" onClick={() => signOut({ callbackUrl: '/' })}>
              <LogOut className="w-4 h-4" /> Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
