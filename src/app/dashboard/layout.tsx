'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { usePathname } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { useSubscription } from '@/hooks/useSubscription';
import LogoutButton from '@/components/auth/LogoutButton';
import Logo from '@/components/brand/Logo';
import {
  LayoutDashboard,
  Receipt,
  Truck,
  Users,
  Settings,
  Menu,
  X,
  ChevronRight,
  Bell,
  Upload,
  BarChart3,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/upload', label: 'Upload', icon: Upload },
  { href: '/dashboard/receipts', label: 'Receipts', icon: Receipt },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart3 },
  { href: '/dashboard/trucks', label: 'Trucks', icon: Truck },
  { href: '/dashboard/drivers', label: 'Drivers', icon: Users },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useUser();
  const { isActive, isTrialing, cancelAtPeriodEnd, loading: subLoading } = useSubscription();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [companyName, setCompanyName] = useState(
    user?.user_metadata?.company_name || 'My Company'
  );

  // Fetch company name from profiles table (updated by settings)
  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('company_name')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.company_name) setCompanyName(data.company_name);
      });
  }, [user]);

  const initials = companyName
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-screen bg-gray-50/50">
      {/* ─── SIDEBAR (desktop) ─── */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 border-r border-gray-200 bg-white">
        {/* Brand */}
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <Logo size="md" showText />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon className="h-4.5 w-4.5 flex-shrink-0" />
                {item.label}
                {isActive && (
                  <ChevronRight className="ml-auto h-3.5 w-3.5 text-blue-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User card */}
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {companyName}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
            <LogoutButton iconOnly className="text-gray-400 hover:text-gray-600" />
          </div>
        </div>
      </aside>

      {/* ─── MOBILE SIDEBAR OVERLAY ─── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative w-72 h-full bg-white shadow-xl flex flex-col">
            <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100">
              <Logo size="md" showText />
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded-md hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const isActive =
                  item.href === '/dashboard'
                    ? pathname === '/dashboard'
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <item.icon className="h-4.5 w-4.5 flex-shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="p-3 border-t border-gray-100">
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {companyName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user?.email}
                  </p>
                </div>
                <LogoutButton iconOnly />
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ─── MAIN AREA ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-8 border-b border-gray-200 bg-white">
          <button
            className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5 text-gray-600" />
          </button>

          <div className="hidden lg:block">
            <h2 className="text-sm font-semibold text-gray-900">
              {NAV_ITEMS.find((n) =>
                n.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(n.href)
              )?.label || 'Dashboard'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-gray-500">
              <Bell className="h-4.5 w-4.5" />
            </Button>
            <div className="lg:hidden">
              <LogoutButton iconOnly className="text-gray-500" />
            </div>
          </div>
        </header>

        {/* Subscription banner for users without active plan */}
        {!subLoading && !isActive && pathname !== '/dashboard/settings' && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-amber-800">
              <CreditCard className="h-4 w-4 text-amber-600 shrink-0" />
              <span>You don&apos;t have an active subscription. Some features are restricted.</span>
            </div>
            <Button
              asChild
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
            >
              <Link href="/dashboard/settings">Get a Plan</Link>
            </Button>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
