'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';
import { usePermissions } from '@/hooks/usePermissions';
import {
  Camera,
  Receipt,
  DollarSign,
  CalendarDays,
  Loader2,
  ChevronRight,
  ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// ─── Types ──────────────────────────────────────────

interface RecentReceipt {
  id: string;
  vendor: string | null;
  amount: number | null;
  receipt_date: string | null;
  image_url: string | null;
  created_at: string;
}

interface Stats {
  receiptsThisWeek: number;
  totalThisMonth: number;
}

// ─── Helpers ────────────────────────────────────────

function startOfWeek(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const mon = new Date(d.setDate(diff));
  mon.setHours(0, 0, 0, 0);
  return mon.toISOString();
}

function startOfMonth(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(n);
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

// ─── Component ──────────────────────────────────────

export default function DriverHomePage() {
  const router = useRouter();
  const { user } = useUser();
  const { effectiveOwnerId } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [recentReceipts, setRecentReceipts] = useState<RecentReceipt[]>([]);
  const [stats, setStats] = useState<Stats>({ receiptsThisWeek: 0, totalThisMonth: 0 });
  const [driverName, setDriverName] = useState('');

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch driver profile name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      if (profile?.full_name) setDriverName(profile.full_name);

      // Fetch recent receipts (last 10)
      const { data: recent } = await supabase
        .from('receipts')
        .select('id, vendor, amount, receipt_date, image_url, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setRecentReceipts((recent as RecentReceipt[]) ?? []);

      // Fetch stats — receipts this week
      const { count: weekCount } = await supabase
        .from('receipts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfWeek());

      // Fetch stats — total amount this month
      const { data: monthReceipts } = await supabase
        .from('receipts')
        .select('amount')
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth());

      const monthTotal = (monthReceipts ?? []).reduce(
        (sum, r) => sum + (r.amount ?? 0),
        0,
      );

      setStats({
        receiptsThisWeek: weekCount ?? 0,
        totalThisMonth: monthTotal,
      });
    } catch (err) {
      console.error('Driver home fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Render ─────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Greeting ─────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          {driverName ? `Hey, ${driverName.split(' ')[0]}!` : 'Welcome!'}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Upload receipts and track your expenses.
        </p>
      </div>

      {/* ── Quick Upload CTA ─────────────────────── */}
      <Button
        onClick={() => router.push('/driver/upload')}
        className="w-full h-20 text-lg gap-3 bg-blue-600 hover:bg-blue-700 rounded-2xl shadow-lg shadow-blue-200 active:scale-[0.98] transition-transform"
      >
        <Camera className="h-7 w-7" />
        Upload Receipt
      </Button>

      {/* ── Stats ────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-gray-200">
          <CardContent className="p-4 flex flex-col items-center text-center gap-1">
            <div className="h-9 w-9 rounded-full bg-blue-50 flex items-center justify-center">
              <CalendarDays className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.receiptsThisWeek}
            </p>
            <p className="text-xs text-gray-500">Receipts this week</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="p-4 flex flex-col items-center text-center gap-1">
            <div className="h-9 w-9 rounded-full bg-green-50 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(stats.totalThisMonth)}
            </p>
            <p className="text-xs text-gray-500">Total this month</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Recent Uploads ───────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">
            Recent Uploads
          </h2>
          <Link
            href="/driver/receipts"
            className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
          >
            View all
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {recentReceipts.length === 0 ? (
          <Card className="border-dashed border-gray-300">
            <CardContent className="py-10 flex flex-col items-center text-center gap-2">
              <Receipt className="h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">No receipts yet</p>
              <p className="text-xs text-gray-400">
                Tap the upload button to add your first receipt.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentReceipts.map((r) => (
              <Card
                key={r.id}
                className="border-gray-200 hover:border-gray-300 transition-colors"
              >
                <CardContent className="p-3 flex items-center gap-3">
                  {/* Thumbnail */}
                  <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                    {r.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.image_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {r.vendor || 'Unknown vendor'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(r.receipt_date)}
                    </p>
                  </div>

                  {/* Amount */}
                  <p className="text-sm font-semibold text-gray-900 shrink-0">
                    {r.amount != null ? formatCurrency(r.amount) : '—'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
