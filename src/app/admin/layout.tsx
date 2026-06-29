'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, LogOut, ShieldCheck, Users, FileText, LayoutDashboard } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useEffect } from 'react';

const navItems = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/kyc', label: 'KYC Review', icon: ShieldCheck },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/loans', label: 'Loans', icon: FileText },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?message=Admin sign in required');
    } else if (status === 'authenticated') {
      const role = (session?.user as { role?: string })?.role;
      if (role !== 'admin') {
        router.push('/dashboard');
      }
    }
  }, [status, session, router]);

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-mkopa-green" />
      </div>
    );
  }

  const role = (session.user as { role?: string })?.role;
  if (role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-mkopa-green" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r hidden md:flex flex-col">
        <div className="p-6 border-b">
          <Link href="/" className="font-bold text-xl"><span className="text-mkopa-green">M-Kopa</span> Admin</Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-mkopa-green transition"
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t">
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile nav */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b z-40">
        <div className="flex items-center justify-between px-4 h-16">
          <Link href="/" className="font-bold text-xl"><span className="text-mkopa-green">M-Kopa</span> Admin</Link>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="flex items-center gap-2 text-sm text-gray-500"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
        <div className="flex overflow-x-auto px-4 pb-2 gap-2">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
