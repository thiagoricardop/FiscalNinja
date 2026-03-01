'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';
import {
  Receipt,
  Loader2,
  ImageIcon,
  Search,
  ChevronLeft,
  ChevronRight,
  Calendar,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ─── Types ──────────────────────────────────────────

interface ReceiptItem {
  id: string;
  vendor: string | null;
  amount: number | null;
  receipt_date: string | null;
  image_url: string | null;
  category: string | null;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
}

// ─── Config ─────────────────────────────────────────

const PAGE_SIZE = 20;

// ─── Helpers ────────────────────────────────────────

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
    year: 'numeric',
  });
}

function categoryColor(cat: string | null): string {
  const colors: Record<string, string> = {
    fuel: 'bg-amber-50 text-amber-700',
    tolls: 'bg-purple-50 text-purple-700',
    maintenance: 'bg-orange-50 text-orange-700',
    insurance: 'bg-teal-50 text-teal-700',
    other: 'bg-gray-50 text-gray-600',
  };
  return colors[cat ?? ''] ?? colors.other;
}

// ─── Component ──────────────────────────────────────

export default function DriverReceiptsPage() {
  const { user } = useUser();
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<ReceiptItem | null>(null);

  // ── Fetch ────────────────────────────────────────

  const fetchReceipts = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('receipts')
      .select(
        'id, vendor, amount, receipt_date, image_url, category, payment_method, notes, created_at',
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error) setReceipts((data as ReceiptItem[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  // ── Search / Pagination ──────────────────────────

  const filtered = useMemo(() => {
    if (!search.trim()) return receipts;
    const q = search.toLowerCase();
    return receipts.filter(
      (r) =>
        (r.vendor ?? '').toLowerCase().includes(q) ||
        (r.category ?? '').toLowerCase().includes(q) ||
        String(r.amount ?? '').includes(q),
    );
  }, [receipts, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Reset page when search changes
  useEffect(() => setPage(0), [search]);

  // ── Render ───────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-gray-900">My Receipts</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {receipts.length} receipt{receipts.length !== 1 ? 's' : ''} total
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search vendor, category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-8 h-10"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex flex-col items-center py-16 gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <p className="text-sm text-gray-400">Loading receipts…</p>
        </div>
      ) : paged.length === 0 ? (
        <Card className="border-dashed border-gray-300">
          <CardContent className="py-12 flex flex-col items-center text-center gap-2">
            <Receipt className="h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">
              {search ? 'No receipts match your search' : 'No receipts yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {paged.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelected(r)}
              className="w-full text-left"
            >
              <Card className="border-gray-200 hover:border-gray-300 transition-colors active:bg-gray-50">
                <CardContent className="p-3 flex items-center gap-3">
                  {/* Thumbnail */}
                  <div className="h-14 w-14 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
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
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">
                        {formatDate(r.receipt_date)}
                      </span>
                      {r.category && (
                        <Badge
                          variant="secondary"
                          className={`text-[10px] px-1.5 py-0 ${categoryColor(r.category)}`}
                        >
                          {r.category}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Amount */}
                  <p className="text-sm font-semibold text-gray-900 shrink-0">
                    {r.amount != null ? formatCurrency(r.amount) : '—'}
                  </p>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <Button
            variant="ghost"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>
          <span className="text-xs text-gray-500">
            {page + 1} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
            className="gap-1"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* ── Detail Dialog ───────────────────────── */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-base">
              {selected?.vendor || 'Receipt Details'}
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              {/* Image */}
              {selected.image_url && (
                <div className="rounded-lg overflow-hidden border border-gray-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selected.image_url}
                    alt="Receipt"
                    className="w-full max-h-72 object-contain bg-gray-50"
                  />
                </div>
              )}

              {/* Fields */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Date</p>
                  <p className="font-medium text-gray-900">
                    {formatDate(selected.receipt_date)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Amount</p>
                  <p className="font-medium text-gray-900">
                    {selected.amount != null
                      ? formatCurrency(selected.amount)
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Category</p>
                  <p className="font-medium text-gray-900 capitalize">
                    {selected.category || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Payment</p>
                  <p className="font-medium text-gray-900 capitalize">
                    {selected.payment_method?.replace('_', ' ') || '—'}
                  </p>
                </div>
              </div>

              {selected.notes && (
                <div className="text-sm">
                  <p className="text-xs text-gray-500 mb-0.5">Notes</p>
                  <p className="text-gray-700">{selected.notes}</p>
                </div>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setSelected(null)}
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
