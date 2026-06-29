'use client';

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/cn';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button, Avatar } from '@/components/ui';
import {
  LayoutDashboard, ShieldCheck, Users, FileText, ArrowLeftRight, CreditCard,
  PiggyBank, BarChart3, TrendingUp, Bell, MessageSquare, ShieldAlert,
  AlertTriangle, LifeBuoy, UserCog, ScrollText, Code2, Settings,
  Lock, LogOut, Menu, X, ChevronLeft, Search, Sparkles
} from 'lucide-react';

const navSections = [
  {
    title: 'Overview',
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Operations',
    items: [
      { href: '/admin/kyc', label: 'KYC Verification', icon: ShieldCheck, badge: 'pending' },
      { href: '/admin/users', label: 'Users', icon: Users },
      { href: '/admin/loans', label: 'Loans', icon: FileText },
      { href: '/admin/transactions', label: 'Transactions', icon: ArrowLeftRight },
      { href: '/admin/repayments', label: 'Repayments', icon: CreditCard },
      { href: '/admin/savings', label: 'Savings', icon: PiggyBank },
    ],
  },
  {
    title: 'Insights',
    items: [
      { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
      { href: '/admin/analytics', label: 'Analytics', icon: TrendingUp },
    ],
  },
  {
    title: 'Communication',
    items: [
      { href: '/admin/notifications', label: 'Notifications', icon: Bell },
      { href: '/admin/messages', label: 'Messages', icon: MessageSquare },
      { href: '/admin/support', label: 'Support', icon: LifeBuoy },
    ],
  },
  {
    title: 'Security',
    items: [
      { href: '/admin/fraud', label: 'Fraud Monitoring', icon: ShieldAlert },
      { href: '/admin/risk', label: 'Risk Management', icon: AlertTriangle },
      { href: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
      { href: '/admin/security', label: 'Security', icon: Lock },
    ],
  },
  {
    title: 'Administration',
    items: [
      { href: '/admin/admins', label: 'Admins', icon: UserCog },
      { href: '/admin/api-keys', label: 'API Keys', icon: Code2 },
      { href: '/admin/settings', label: 'System Settings', icon: Settings },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

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

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50 dark:bg-ink-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl gradient-mkopa animate-pulse" />
          <p className="text-sm text-ink-500">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  const role = (session.user as { role?: string })?.role;
  if (role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50 dark:bg-ink-950">
        <div className="text-center">
          <p className="text-ink-500 mb-4">Redirecting to customer dashboard...</p>
        </div>
      </div>
    );
  }

  const userName = session.user?.name || 'Admin';
  const userEmail = session.user?.email || '';

  return (
    <div className="min-h-screen bg-ink-50 dark:bg-ink-950 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed md:sticky top-0 left-0 z-50 h-screen bg-white dark:bg-ink-900 border-r border-ink-200 dark:border-ink-800',
        'flex flex-col transition-all duration-300',
        collapsed ? 'w-20' : 'w-72',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      )}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-ink-200 dark:border-ink-800">
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl gradient-mkopa flex items-center justify-center text-white font-bold shadow-glow">
              M
            </div>
            {!collapsed && (
              <div>
                <p className="font-bold text-sm leading-none">M-Kopa</p>
                <p className="text-xs text-ink-500 mt-0.5">Admin Console</p>
              </div>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex p-1.5 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-500"
          >
            <ChevronLeft className={cn('w-4 h-4 transition-transform', collapsed && 'rotate-180')} />
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin py-4 px-3 space-y-6">
          {navSections.map((section) => (
            <div key={section.title}>
              {!collapsed && (
                <p className="px-3 mb-2 text-xs font-semibold text-ink-400 uppercase tracking-wider">
                  {section.title}
                </p>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                        isActive
                          ? 'gradient-mkopa text-white shadow-premium-md'
                          : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-50',
                        collapsed && 'justify-center'
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {!collapsed && <span className="flex-1">{item.label}</span>}
                      {!collapsed && item.badge === 'pending' && (
                        <span className="w-2 h-2 rounded-full bg-mkopa-orange animate-pulse" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Profile */}
        <div className="p-3 border-t border-ink-200 dark:border-ink-800">
          <div className={cn('flex items-center gap-3 p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800', collapsed && 'justify-center')}>
            <Avatar name={userName} className="w-9 h-9 flex-shrink-0" />
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{userName}</p>
                  <p className="text-xs text-ink-500 truncate">{userEmail}</p>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 text-ink-500"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            )}
            {collapsed && (
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 text-ink-500"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 sticky top-0 z-30 bg-white/80 dark:bg-ink-900/80 backdrop-blur border-b border-ink-200 dark:border-ink-800 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-ink-100 dark:bg-ink-800">
              <Search className="w-4 h-4 text-ink-400" />
              <input
                type="text"
                placeholder="Search users, loans, transactions..."
                className="bg-transparent text-sm outline-none w-64"
              />
              <kbd className="text-xs text-ink-400 px-1.5 py-0.5 rounded bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-700">⌘K</kbd>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/" target="_blank">
              <Button variant="ghost" size="sm" className="hidden sm:flex">
                <Sparkles className="w-4 h-4" /> View Site
              </Button>
            </Link>
            <button className="relative p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800">
              <Bell className="w-5 h-5 text-ink-500" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-mkopa-orange" />
            </button>
            <ThemeToggle />
            <div className="h-6 w-px bg-ink-200 dark:bg-ink-700 mx-1" />
            <Link href="/admin/profile">
              <Avatar name={userName} className="w-8 h-8" />
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
