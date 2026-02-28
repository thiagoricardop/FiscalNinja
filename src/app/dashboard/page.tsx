'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';
import {
  Receipt,
  Truck,
  Users,
  DollarSign,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  Plus,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DashboardStats {
  totalReceipts: number;
  totalAmount: number;
  totalTrucks: number;
  totalDrivers: number;
  needsReview: number;
  recentReceipts: {
    id: string;
    vendor: string;
    amount: number;
    receipt_date: string;
    category: string;
    needs_review: boolean;
  }[];
}

export default function DashboardPage() {
  const { user } = useUser();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      const [receiptsRes, trucksRes, driversRes, reviewRes, recentRes] =
        await Promise.all([
          supabase
            .from('receipts')
            .select('amount', { count: 'exact' })
            .eq('user_id', user.id),
          supabase
            .from('trucks')
            .select('id', { count: 'exact' })
            .eq('user_id', user.id)
            .eq('active', true),
          supabase
            .from('drivers')
            .select('id', { count: 'exact' })
            .eq('user_id', user.id)
            .eq('active', true),
          supabase
            .from('receipts')
            .select('id', { count: 'exact' })
            .eq('user_id', user.id)
            .eq('needs_review', true),
          supabase
            .from('receipts')
            .select('id, vendor, amount, receipt_date, category, needs_review')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5),
        ]);

      const totalAmount =
        receiptsRes.data?.reduce((sum, r) => sum + (r.amount || 0), 0) ?? 0;

      setStats({
        totalReceipts: receiptsRes.count ?? 0,
        totalAmount,
        totalTrucks: trucksRes.count ?? 0,
        totalDrivers: driversRes.count ?? 0,
        needsReview: reviewRes.count ?? 0,
        recentReceipts: (recentRes.data as any[]) ?? [],
      });
      setLoading(false);
    };

    fetchStats();
  }, [user]);

  const companyName = user?.user_metadata?.company_name || 'My Company';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const STAT_CARDS = [
    {
      title: 'Total Receipts',
      value: stats?.totalReceipts ?? 0,
      icon: Receipt,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      href: '/dashboard/receipts',
    },
    {
      title: 'Total Expenses',
      value: `$${(stats?.totalAmount ?? 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
      })}`,
      icon: DollarSign,
      color: 'text-green-600',
      bg: 'bg-green-50',
      href: '/dashboard/receipts',
    },
    {
      title: 'Active Trucks',
      value: stats?.totalTrucks ?? 0,
      icon: Truck,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      href: '/dashboard/trucks',
    },
    {
      title: 'Active Drivers',
      value: stats?.totalDrivers ?? 0,
      icon: Users,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      href: '/dashboard/drivers',
    },
  ];

  const CATEGORY_COLORS: Record<string, string> = {
    fuel: 'bg-blue-100 text-blue-700',
    tolls: 'bg-yellow-100 text-yellow-700',
    maintenance: 'bg-red-100 text-red-700',
    insurance: 'bg-purple-100 text-purple-700',
    other: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {companyName}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Here&apos;s what&apos;s happening with your fleet today.
          </p>
        </div>
        <Link href="/dashboard/receipts">
          <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
            <Plus className="h-4 w-4" />
            Add Receipt
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((card) => (
          <Link key={card.title} href={card.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-gray-100">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">
                      {card.title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {card.value}
                    </p>
                  </div>
                  <div
                    className={`h-11 w-11 rounded-xl ${card.bg} flex items-center justify-center`}
                  >
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Needs Review Alert */}
      {(stats?.needsReview ?? 0) > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-yellow-800">
                {stats?.needsReview} receipt
                {(stats?.needsReview ?? 0) !== 1 ? 's' : ''} need
                {(stats?.needsReview ?? 0) === 1 ? 's' : ''} review
              </p>
              <p className="text-xs text-yellow-600 mt-0.5">
                Low-confidence OCR scans require manual verification.
              </p>
            </div>
            <Link href="/dashboard/receipts">
              <Button
                size="sm"
                variant="outline"
                className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
              >
                Review Now
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Two-Column: Recent Receipts + Quick Actions */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Receipts */}
        <Card className="lg:col-span-2 border-gray-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">
              Recent Receipts
            </CardTitle>
            <Link
              href="/dashboard/receipts"
              className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            {stats?.recentReceipts.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500 font-medium">
                  No receipts yet
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Upload your first receipt to get started.
                </p>
                <Link href="/dashboard/receipts">
                  <Button size="sm" className="mt-4 bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Add Receipt
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {stats?.recentReceipts.map((receipt) => (
                  <div
                    key={receipt.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-gray-50 flex items-center justify-center">
                        <Receipt className="h-4 w-4 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {receipt.vendor}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(receipt.receipt_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                          CATEGORY_COLORS[receipt.category] ||
                          CATEGORY_COLORS.other
                        }`}
                      >
                        {receipt.category}
                      </span>
                      <span className="text-sm font-semibold text-gray-900 tabular-nums">
                        ${receipt.amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-gray-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              {
                label: 'Upload Receipt',
                icon: Receipt,
                href: '/dashboard/receipts',
                color: 'text-blue-600',
              },
              {
                label: 'Add Truck',
                icon: Truck,
                href: '/dashboard/trucks',
                color: 'text-purple-600',
              },
              {
                label: 'Add Driver',
                icon: Users,
                href: '/dashboard/drivers',
                color: 'text-orange-600',
              },
              {
                label: 'View Reports',
                icon: TrendingUp,
                href: '/dashboard/receipts',
                color: 'text-green-600',
              },
            ].map((action) => (
              <Link key={action.label} href={action.href}>
                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group">
                  <div className="h-9 w-9 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-white transition-colors">
                    <action.icon className={`h-4 w-4 ${action.color}`} />
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {action.label}
                  </span>
                  <ArrowRight className="ml-auto h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
