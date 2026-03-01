'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { PermissionsProvider, usePermissions } from '@/hooks/usePermissions';
import LogoutButton from '@/components/auth/LogoutButton';
import Logo from '@/components/brand/Logo';
import { Home, Upload, Receipt, LogOut, Loader2, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─── Nav items (minimal) ─────────────────────────────

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/driver', label: 'Home', icon: Home },
  { href: '/driver/upload', label: 'Upload', icon: Upload },
  { href: '/driver/receipts', label: 'My Receipts', icon: Receipt },
];

// ─── Layout wrapper ──────────────────────────────────

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PermissionsProvider>
      <DriverLayoutInner>{children}</DriverLayoutInner>
    </PermissionsProvider>
  );
}

// ─── Inner layout (needs permissions context) ────────

function DriverLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading } = useUser();
  const { isDriver, loading: permLoading } = usePermissions();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Guard: only drivers can access /driver/*
  useEffect(() => {
    if (!authLoading && !permLoading) {
      if (!user) {
        router.replace('/auth/login');
      } else if (!isDriver) {
        router.replace('/dashboard');
      }
    }
  }, [user, authLoading, isDriver, permLoading, router]);

  if (authLoading || permLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user || !isDriver) return null;

  const isActive = (href: string) =>
    href === '/driver' ? pathname === '/driver' : pathname.startsWith(href);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* ── Top Bar ─────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <Logo className="h-7" />

          {/* Desktop nav (hidden on small screens) */}
          <nav className="hidden sm:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
            <LogoutButton iconOnly className="ml-1 text-gray-500" />
          </nav>

          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="border-t border-gray-100 bg-white px-4 pb-3 pt-2 sm:hidden">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
            <div className="mt-1 border-t border-gray-100 pt-2">
              <LogoutButton className="w-full justify-start text-gray-600" />
            </div>
          </div>
        )}
      </header>

      {/* ── Page content ────────────────────────────── */}
      <main className="flex-1 px-4 py-5 sm:py-6 mx-auto w-full max-w-lg">
        {children}
      </main>

      {/* ── Bottom Tab Bar (mobile only) ────────────── */}
      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-gray-200 bg-white sm:hidden safe-area-bottom">
        <div className="mx-auto flex max-w-lg items-center justify-around py-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-4 py-2 text-xs font-medium transition-colors ${
                  active ? 'text-blue-600' : 'text-gray-400'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'text-blue-600' : ''}`} />
                {item.label}
              </Link>
            );
          })}
          <LogoutButton
            iconOnly
            className="flex flex-col items-center gap-0.5 px-4 py-2 text-gray-400 hover:text-gray-600"
          />
        </div>
      </nav>

      {/* Spacer for bottom tab bar */}
      <div className="h-16 sm:hidden" />
    </div>
  );
}
