'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { deleteReceipt as deleteStorageFile } from '@/lib/storage/upload';
import { useUser } from '@/hooks/useUser';
import {
  Plus,
  Search,
  Filter,
  Receipt,
  Loader2,
  Trash2,
  Eye,
  Pencil,
  Upload,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  FileImage,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PaywallGuard } from '@/components/dashboard/PaywallGuard';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ReceiptUpload from '@/components/receipts/ReceiptUpload';
import ReceiptReview from '@/components/receipts/ReceiptReview';
import ReceiptDetail from '@/components/receipts/ReceiptDetail';
import StorageImage from '@/components/ui/storage-image';
import ExportModal from '@/components/export/ExportModal';
import type { ReceiptRow } from '@/components/receipts/ReceiptReview';
import type { ExportReceipt } from '@/lib/export/excel';

// ─── Constants ───────────────────────────────────────

const CATEGORIES = ['fuel', 'tolls', 'maintenance', 'insurance', 'other'] as const;
const PAYMENT_METHODS = ['cash', 'credit', 'debit', 'company_card', 'other'] as const;
const PAGE_SIZE = 20;

const CATEGORY_COLORS: Record<string, string> = {
  fuel: 'bg-blue-100 text-blue-700',
  tolls: 'bg-yellow-100 text-yellow-700',
  maintenance: 'bg-red-100 text-red-700',
  insurance: 'bg-purple-100 text-purple-700',
  other: 'bg-gray-100 text-gray-700',
};

type SortField = 'receipt_date' | 'amount' | 'vendor' | 'category';
type SortDir = 'asc' | 'desc';
type DateRange = 'all' | '7d' | '30d' | 'month' | 'year';

// ─── Helpers ─────────────────────────────────────────

function extractStoragePath(publicUrl: string): string | null {
  const m = publicUrl.match(/\/storage\/v1\/object\/public\/receipts\/(.+)/);
  return m ? m[1] : null;
}

function dateRangeStart(range: DateRange): Date | null {
  const now = new Date();
  switch (range) {
    case '7d':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    case '30d':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'year':
      return new Date(now.getFullYear(), 0, 1);
    default:
      return null;
  }
}

// ─── Component ───────────────────────────────────────

export default function ReceiptsPage() {
  const { user } = useUser();

  // Data
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [trucks, setTrucks] = useState<{ id: string; truck_number: string }[]>([]);
  const [drivers, setDrivers] = useState<{ id: string; name: string }[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [driverFilter, setDriverFilter] = useState<string>('all');
  const [truckFilter, setTruckFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Sort & pagination
  const [sortField, setSortField] = useState<SortField>('receipt_date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Dialogs
  const [dialogOpen, setDialogOpen] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Confirmation dialogs
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Detail / Review modals
  const [detailReceipt, setDetailReceipt] = useState<ReceiptRow | null>(null);
  const [reviewReceipt, setReviewReceipt] = useState<ReceiptRow | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  // Manual entry form
  const [form, setForm] = useState({
    vendor: '',
    amount: '',
    receipt_date: new Date().toISOString().split('T')[0],
    category: 'fuel' as string,
    payment_method: 'credit' as string,
    notes: '',
    truck_id: '',
    driver_id: '',
  });

  // ─── Data fetching ──────────────────────────────

  const fetchReceipts = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('receipts')
      .select('*')
      .eq('user_id', user.id)
      .order('receipt_date', { ascending: false });

    setReceipts((data as ReceiptRow[]) ?? []);
    setLoading(false);
  }, [user]);

  const fetchLookups = useCallback(async () => {
    if (!user) return;
    const [t, d] = await Promise.all([
      supabase.from('trucks').select('id, truck_number').eq('user_id', user.id).eq('active', true),
      supabase.from('drivers').select('id, name').eq('user_id', user.id).eq('active', true),
    ]);
    setTrucks((t.data as any[]) ?? []);
    setDrivers((d.data as any[]) ?? []);
  }, [user]);

  useEffect(() => {
    fetchReceipts();
    fetchLookups();
  }, [fetchReceipts, fetchLookups]);

  // ─── Lookup maps ────────────────────────────────

  const driverMap = useMemo(
    () => Object.fromEntries(drivers.map((d) => [d.id, d.name])),
    [drivers]
  );
  const truckMap = useMemo(
    () => Object.fromEntries(trucks.map((t) => [t.id, t.truck_number])),
    [trucks]
  );

  // ─── Filtering, sorting, pagination ─────────────

  const filtered = useMemo(() => {
    let result = [...receipts];

    // Text search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.vendor.toLowerCase().includes(q) ||
          r.amount.toString().includes(q) ||
          (r.notes && r.notes.toLowerCase().includes(q))
      );
    }

    // Category
    if (categoryFilter !== 'all') {
      result = result.filter((r) => r.category === categoryFilter);
    }

    // Driver
    if (driverFilter !== 'all') {
      result = result.filter((r) => r.driver_id === driverFilter);
    }

    // Truck
    if (truckFilter !== 'all') {
      result = result.filter((r) => r.truck_id === truckFilter);
    }

    // Status
    if (statusFilter === 'review') {
      result = result.filter((r) => r.needs_review);
    } else if (statusFilter === 'verified') {
      result = result.filter((r) => !r.needs_review);
    }

    // Date range
    const rangeStart = dateRangeStart(dateRange);
    if (rangeStart) {
      result = result.filter((r) => new Date(r.receipt_date) >= rangeStart);
    }

    // Sorting
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'receipt_date':
          cmp = new Date(a.receipt_date).getTime() - new Date(b.receipt_date).getTime();
          break;
        case 'amount':
          cmp = a.amount - b.amount;
          break;
        case 'vendor':
          cmp = a.vendor.localeCompare(b.vendor);
          break;
        case 'category':
          cmp = a.category.localeCompare(b.category);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [receipts, search, categoryFilter, driverFilter, truckFilter, statusFilter, dateRange, sortField, sortDir]);

  // ─── Stats (computed from filtered data) ────────

  const DATE_RANGE_LABELS: Record<DateRange, string> = {
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    'month': 'This Month',
    'year': 'This Year',
    'all': 'All Time',
  };

  const stats = useMemo(() => {
    const total = filtered.reduce((s, r) => s + r.amount, 0);
    const needsReview = filtered.filter((r) => r.needs_review).length;
    const avg = filtered.length > 0 ? total / filtered.length : 0;

    // Build a contextual label based on active filters
    const parts: string[] = [];
    if (dateRange !== 'all') parts.push(DATE_RANGE_LABELS[dateRange]);
    if (driverFilter !== 'all') parts.push(driverMap[driverFilter] || 'Driver');
    if (truckFilter !== 'all') parts.push(truckMap[truckFilter] || 'Truck');
    if (categoryFilter !== 'all') parts.push(categoryFilter);
    if (statusFilter !== 'all') parts.push(statusFilter === 'review' ? 'Needs Review' : 'Verified');
    if (search) parts.push(`"${search}"`);
    const label = parts.length > 0 ? parts.join(' · ') : 'All Time';

    return {
      count: filtered.length,
      total,
      needsReview,
      avg,
      allCount: receipts.length,
      label,
    };
  }, [filtered, receipts.length, dateRange, driverFilter, truckFilter, categoryFilter, statusFilter, search, driverMap, truckMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, driverFilter, truckFilter, statusFilter, dateRange, sortField, sortDir]);

  // ─── Sort toggle helper ─────────────────────────

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'amount' ? 'desc' : 'asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 text-gray-400" />;
    return sortDir === 'asc' ? (
      <ArrowUp className="h-3 w-3 ml-1 text-blue-600" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1 text-blue-600" />
    );
  };

  // ─── Selection helpers ──────────────────────────

  const allPageSelected =
    paginated.length > 0 && paginated.every((r) => selected.has(r.id));

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        paginated.forEach((r) => next.delete(r.id));
      } else {
        paginated.forEach((r) => next.add(r.id));
      }
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ─── Delete (DB + Storage) ──────────────────────

  const executeDelete = async (id: string) => {
    const receipt = receipts.find((r) => r.id === id);
    // Delete from database
    await supabase.from('receipts').delete().eq('id', id);
    // Delete image from Storage
    if (receipt?.image_url && receipt.image_url !== 'placeholder') {
      const storagePath = extractStoragePath(receipt.image_url);
      if (storagePath) {
        try {
          await deleteStorageFile(storagePath);
        } catch {
          // Image already deleted or path invalid — continue
        }
      }
    }
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setConfirmDeleteId(null);
    fetchReceipts();
  };

  const handleDelete = (id: string) => {
    setConfirmDeleteId(id);
  };

  const executeBulkDelete = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setBulkDeleting(true);
    // Delete all storage files in parallel
    const deletePromises = ids.map(async (id) => {
      const receipt = receipts.find((r) => r.id === id);
      if (receipt?.image_url && receipt.image_url !== 'placeholder') {
        const storagePath = extractStoragePath(receipt.image_url);
        if (storagePath) {
          try {
            await deleteStorageFile(storagePath);
          } catch { /* ignore */ }
        }
      }
    });
    await Promise.all(deletePromises);
    // Bulk DB delete
    await supabase.from('receipts').delete().in('id', ids);
    setSelected(new Set());
    setConfirmBulkDelete(false);
    setBulkDeleting(false);
    fetchReceipts();
  };

  const handleBulkDelete = () => {
    setConfirmBulkDelete(true);
  };

  // ─── Manual entry handler ──────────────────────

  const handleAddReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError('');
    setSaving(true);

    // ── Usage limit check ─────────────────────────
    try {
      const usageRes = await fetch('/api/stripe/usage');
      if (usageRes.ok) {
        const usage = await usageRes.json();
        if (usage.limit !== -1 && usage.used >= usage.limit) {
          setError(
            `You've reached your monthly receipt limit (${usage.used}/${usage.limit}). Upgrade your plan to add more receipts.`,
          );
          setSaving(false);
          return;
        }
      }
    } catch { /* proceed */ }

    const { error: insertError } = await supabase.from('receipts').insert({
      user_id: user.id,
      vendor: form.vendor.trim(),
      amount: parseFloat(form.amount),
      receipt_date: form.receipt_date,
      category: form.category as any,
      payment_method: form.payment_method as any,
      notes: form.notes || null,
      truck_id: form.truck_id || null,
      driver_id: form.driver_id || null,
      image_url: 'placeholder',
    });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    setForm({
      vendor: '',
      amount: '',
      receipt_date: new Date().toISOString().split('T')[0],
      category: 'fuel',
      payment_method: 'credit',
      notes: '',
      truck_id: '',
      driver_id: '',
    });
    setSaving(false);
    setDialogOpen(false);
    fetchReceipts();
  };

  // ─── Loading state ─────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // ─── Active filter count ────────────────────────

  const activeFilters = [
    categoryFilter !== 'all',
    driverFilter !== 'all',
    truckFilter !== 'all',
    statusFilter !== 'all',
    dateRange !== 'all',
    search.length > 0,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearch('');
    setCategoryFilter('all');
    setDriverFilter('all');
    setTruckFilter('all');
    setStatusFilter('all');
    setDateRange('all');
  };

  // ─── Render ────────────────────────────────────

  return (
    <PaywallGuard>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Receipts</h1>
          <p className="text-sm text-gray-500 mt-1">
            {stats.allCount} receipt{stats.allCount !== 1 ? 's' : ''} total
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" className="gap-2" onClick={() => setExportOpen(true)}>
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
                <Upload className="h-4 w-4" />
                AI Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Upload Receipt with AI</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-gray-500 -mt-1">
                Take a photo or upload an image — Gemini AI will extract all the details automatically.
              </p>
              <ReceiptUpload
                drivers={drivers}
                trucks={trucks}
                onSuccess={() => fetchReceipts()}
              />
            </DialogContent>
          </Dialog>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Manual Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Receipt</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddReceipt} className="space-y-4 mt-2">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label>Vendor</Label>
                    <Input
                      value={form.vendor}
                      onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                      placeholder="Shell Gas Station"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      placeholder="150.00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={form.receipt_date}
                      onChange={(e) => setForm({ ...form, receipt_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={form.category}
                      onValueChange={(v) => setForm({ ...form, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c} className="capitalize">
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Select
                      value={form.payment_method}
                      onValueChange={(v) => setForm({ ...form, payment_method: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((p) => (
                          <SelectItem key={p} value={p} className="capitalize">
                            {p.replace('_', ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {trucks.length > 0 && (
                    <div className="space-y-2">
                      <Label>Truck</Label>
                      <Select
                        value={form.truck_id}
                        onValueChange={(v) => setForm({ ...form, truck_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select truck" />
                        </SelectTrigger>
                        <SelectContent>
                          {trucks.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.truck_number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {drivers.length > 0 && (
                    <div className="space-y-2">
                      <Label>Driver</Label>
                      <Select
                        value={form.driver_id}
                        onValueChange={(v) => setForm({ ...form, driver_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select driver" />
                        </SelectTrigger>
                        <SelectContent>
                          {drivers.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="col-span-2 space-y-2">
                    <Label>Notes (optional)</Label>
                    <Textarea
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      placeholder="Additional details..."
                      rows={2}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Receipt'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Stats Cards ─────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-gray-100">
          <CardContent className="p-3 sm:pt-5 sm:pb-4 sm:px-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium">Receipts</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{stats.count}</p>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 truncate" title={stats.label}>{stats.label}</p>
              </div>
              <div className="p-2 sm:p-2.5 bg-blue-50 rounded-xl shrink-0">
                <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-100">
          <CardContent className="p-3 sm:pt-5 sm:pb-4 sm:px-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium">Total Expenses</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 truncate">
                  ${stats.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 truncate" title={stats.label}>{stats.label}</p>
              </div>
              <div className="p-2 sm:p-2.5 bg-green-50 rounded-xl shrink-0">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-100">
          <CardContent className="p-3 sm:pt-5 sm:pb-4 sm:px-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium">Needs Review</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{stats.needsReview}</p>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">in current view</p>
              </div>
              <div className="p-2 sm:p-2.5 bg-yellow-50 rounded-xl shrink-0">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-100">
          <CardContent className="p-3 sm:pt-5 sm:pb-4 sm:px-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium">Avg Per Receipt</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 truncate">
                  ${stats.avg.toFixed(2)}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 truncate" title={stats.label}>{stats.label}</p>
              </div>
              <div className="p-2 sm:p-2.5 bg-purple-50 rounded-xl shrink-0">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Filters Row ─────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by vendor, amount, or notes..."
              className="pl-9"
            />
          </div>
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-36 h-9 text-xs">
              <Filter className="h-3 w-3 mr-1.5 text-gray-400" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c} className="capitalize">
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 h-9 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="review">Needs Review</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
            </SelectContent>
          </Select>

          {drivers.length > 0 && (
            <Select value={driverFilter} onValueChange={setDriverFilter}>
              <SelectTrigger className="w-36 h-9 text-xs">
                <SelectValue placeholder="Driver" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Drivers</SelectItem>
                {drivers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {trucks.length > 0 && (
            <Select value={truckFilter} onValueChange={setTruckFilter}>
              <SelectTrigger className="w-36 h-9 text-xs">
                <SelectValue placeholder="Truck" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Trucks</SelectItem>
                {trucks.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.truck_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {activeFilters > 0 && (
            <Button variant="ghost" size="sm" className="h-9 text-xs text-gray-500" onClick={clearFilters}>
              Clear filters ({activeFilters})
            </Button>
          )}
        </div>
      </div>

      {/* ── Bulk actions ────────────────────────────── */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5">
          <span className="text-sm font-medium text-blue-700">
            {selected.size} selected
          </span>
          <Button
            variant="destructive"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={handleBulkDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete Selected
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-gray-500"
            onClick={() => setSelected(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      {/* ── Table ───────────────────────────────────── */}
      {filtered.length === 0 ? (
        <Card className="border-gray-100">
          <CardContent className="py-16 text-center">
            <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">No receipts found</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              {activeFilters > 0
                ? 'Try adjusting your search or filters.'
                : 'Get started by adding your first receipt.'}
            </p>
            {activeFilters > 0 && (
              <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="border-gray-100 overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allPageSelected}
                        onCheckedChange={toggleAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead className="w-10" />
                    <TableHead>
                      <button
                        className="flex items-center font-semibold text-xs hover:text-blue-600 transition-colors"
                        onClick={() => toggleSort('vendor')}
                      >
                        Vendor <SortIcon field="vendor" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="flex items-center font-semibold text-xs hover:text-blue-600 transition-colors"
                        onClick={() => toggleSort('receipt_date')}
                      >
                        Date <SortIcon field="receipt_date" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="flex items-center font-semibold text-xs hover:text-blue-600 transition-colors"
                        onClick={() => toggleSort('category')}
                      >
                        Category <SortIcon field="category" />
                      </button>
                    </TableHead>
                    <TableHead className="font-semibold">Driver</TableHead>
                    <TableHead className="font-semibold">Truck</TableHead>
                    <TableHead>
                      <button
                        className="flex items-center font-semibold text-xs hover:text-blue-600 transition-colors ml-auto"
                        onClick={() => toggleSort('amount')}
                      >
                        Amount <SortIcon field="amount" />
                      </button>
                    </TableHead>
                    <TableHead className="font-semibold text-center">Status</TableHead>
                    <TableHead className="w-28" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((receipt) => {
                    const hasImage = receipt.image_url && receipt.image_url !== 'placeholder';
                    return (
                      <TableRow
                        key={receipt.id}
                        className={`hover:bg-gray-50/50 cursor-pointer ${
                          selected.has(receipt.id) ? 'bg-blue-50/50' : ''
                        }`}
                        onClick={() => setDetailReceipt(receipt)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selected.has(receipt.id)}
                            onCheckedChange={() => toggleOne(receipt.id)}
                          />
                        </TableCell>
                        <TableCell className="pr-0">
                          {hasImage ? (
                            <StorageImage
                              src={receipt.image_url}
                              alt=""
                              className="h-8 w-8 rounded object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded bg-gray-100 flex items-center justify-center">
                              <FileImage className="h-3.5 w-3.5 text-gray-400" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-gray-900 max-w-[180px] truncate">
                          {receipt.vendor}
                        </TableCell>
                        <TableCell className="text-gray-600 text-sm">
                          {new Date(receipt.receipt_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
                              CATEGORY_COLORS[receipt.category] ?? CATEGORY_COLORS.other
                            }`}
                          >
                            {receipt.category}
                          </span>
                        </TableCell>
                        <TableCell className="text-gray-600 text-sm">
                          {receipt.driver_id ? driverMap[receipt.driver_id] ?? '—' : '—'}
                        </TableCell>
                        <TableCell className="text-gray-600 text-sm">
                          {receipt.truck_id ? truckMap[receipt.truck_id] ?? '—' : '—'}
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums text-gray-900">
                          ${receipt.amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          {receipt.needs_review ? (
                            <Badge variant="outline" className="border-yellow-300 text-yellow-700 bg-yellow-50">
                              Review
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50">
                              OK
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-400 hover:text-blue-600"
                              onClick={() => setDetailReceipt(receipt)}
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-400 hover:text-orange-600"
                              onClick={() => setReviewReceipt(receipt)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-400 hover:text-red-600"
                              onClick={() => handleDelete(receipt.id)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {/* Mobile select all */}
            <div className="flex items-center justify-between px-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={allPageSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Select all on page"
                />
                <span className="text-xs text-gray-500 font-medium">Select all</span>
              </label>
              <span className="text-xs text-gray-400">
                {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>

            {paginated.map((receipt) => {
              const hasImage = receipt.image_url && receipt.image_url !== 'placeholder';
              const isSelected = selected.has(receipt.id);
              return (
                <Card
                  key={receipt.id}
                  className={`border-gray-100 transition-shadow ${
                    isSelected ? 'ring-2 ring-blue-500 border-blue-200' : 'hover:shadow-md'
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleOne(receipt.id)}
                          aria-label={`Select ${receipt.vendor}`}
                        />
                      </div>

                      {hasImage ? (
                        <div
                          className="cursor-pointer flex-shrink-0"
                          onClick={() => setDetailReceipt(receipt)}
                        >
                          <StorageImage
                            src={receipt.image_url}
                            alt=""
                            className="h-12 w-12 rounded-lg object-cover border border-gray-200"
                          />
                        </div>
                      ) : (
                        <div
                          className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 cursor-pointer"
                          onClick={() => setDetailReceipt(receipt)}
                        >
                          <FileImage className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setDetailReceipt(receipt)}>
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-900 truncate max-w-[160px] sm:max-w-[220px]">{receipt.vendor}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {new Date(receipt.receipt_date).toLocaleDateString()}
                            </p>
                          </div>
                          <p className="text-lg font-bold tabular-nums text-gray-900 flex-shrink-0 ml-2">
                            ${receipt.amount.toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                              CATEGORY_COLORS[receipt.category] ?? CATEGORY_COLORS.other
                            }`}
                          >
                            {receipt.category}
                          </span>
                          {receipt.needs_review && (
                            <Badge variant="outline" className="border-yellow-300 text-yellow-700 bg-yellow-50 text-xs">
                              Review
                            </Badge>
                          )}
                          {receipt.driver_id && driverMap[receipt.driver_id] && (
                            <span className="text-xs text-gray-400">{driverMap[receipt.driver_id]}</span>
                          )}
                          {receipt.truck_id && truckMap[receipt.truck_id] && (
                            <span className="text-xs text-gray-400">{truckMap[receipt.truck_id]}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Mobile action buttons */}
                    <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-50 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-3 text-xs text-gray-500 hover:text-blue-600 gap-1.5"
                        onClick={() => setDetailReceipt(receipt)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-3 text-xs text-gray-500 hover:text-orange-600 gap-1.5"
                        onClick={() => setReviewReceipt(receipt)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-3 text-xs text-gray-500 hover:text-red-600 gap-1.5"
                        onClick={() => handleDelete(receipt.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* ── Pagination ────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-gray-500 hidden sm:block">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of{' '}
                {filtered.length}
              </p>
              <p className="text-sm text-gray-500 sm:hidden">
                {page} / {totalPages}
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {/* Page numbers - hidden on small mobile */}
                <div className="hidden sm:flex gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let p: number;
                    if (totalPages <= 5) {
                      p = i + 1;
                    } else if (page <= 3) {
                      p = i + 1;
                    } else if (page >= totalPages - 2) {
                      p = totalPages - 4 + i;
                    } else {
                      p = page - 2 + i;
                    }
                    return (
                      <Button
                        key={p}
                        variant={p === page ? 'default' : 'outline'}
                        size="icon"
                        className={`h-8 w-8 text-xs ${
                          p === page ? 'bg-blue-600 hover:bg-blue-700' : ''
                        }`}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── ReceiptDetail modal ─────────────────────── */}
      <ReceiptDetail
        receipt={detailReceipt}
        open={!!detailReceipt}
        onClose={() => setDetailReceipt(null)}
        onEdit={(r) => {
          setDetailReceipt(null);
          setReviewReceipt(r);
        }}
        onDelete={(id) => {
          setDetailReceipt(null);
          handleDelete(id);
        }}
        driverName={detailReceipt?.driver_id ? driverMap[detailReceipt.driver_id] : null}
        truckNumber={detailReceipt?.truck_id ? truckMap[detailReceipt.truck_id] : null}
      />

      {/* ── ReceiptReview modal ─────────────────────── */}
      {reviewReceipt && (
        <ReceiptReview
          receipt={reviewReceipt}
          open={!!reviewReceipt}
          onSave={() => {
            setReviewReceipt(null);
            fetchReceipts();
          }}
          onDelete={() => {
            setReviewReceipt(null);
            fetchReceipts();
          }}
          onCancel={() => setReviewReceipt(null)}
          drivers={drivers}
          trucks={trucks}
        />
      )}

      {/* ── Delete confirmation dialog ──────────────── */}
      <Dialog open={!!confirmDeleteId} onOpenChange={(open) => { if (!open) setConfirmDeleteId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Receipt</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Are you sure you want to delete this receipt? This action cannot be undone.
          </p>
          {confirmDeleteId && (() => {
            const r = receipts.find((r) => r.id === confirmDeleteId);
            return r ? (
              <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{r.vendor}</p>
                  <p className="text-xs text-gray-500">{new Date(r.receipt_date).toLocaleDateString()}</p>
                </div>
                <p className="text-sm font-bold text-gray-900">${r.amount.toFixed(2)}</p>
              </div>
            ) : null;
          })()}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => confirmDeleteId && executeDelete(confirmDeleteId)}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Bulk delete confirmation dialog ─────────── */}
      <Dialog open={confirmBulkDelete} onOpenChange={(open) => { if (!open) setConfirmBulkDelete(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {selected.size} Receipt{selected.size !== 1 ? 's' : ''}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Are you sure you want to delete <strong>{selected.size}</strong> selected receipt{selected.size !== 1 ? 's' : ''}? This action cannot be undone.
          </p>
          <div className="rounded-lg bg-red-50 border border-red-100 p-3">
            <p className="text-sm text-red-800">
              Total being deleted: <strong>${Array.from(selected).reduce((sum, id) => {
                const r = receipts.find((r) => r.id === id);
                return sum + (r?.amount ?? 0);
              }, 0).toFixed(2)}</strong>
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setConfirmBulkDelete(false)} disabled={bulkDeleting}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={executeBulkDelete}
              disabled={bulkDeleting}
            >
              {bulkDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Delete All
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Export modal ────────────────────────── */}
      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        receipts={receipts.map((r): ExportReceipt => ({
          id: r.id,
          vendor: r.vendor,
          amount: r.amount,
          receipt_date: r.receipt_date,
          tax_amount: r.tax_amount,
          category: r.category,
          payment_method: r.payment_method,
          needs_review: r.needs_review,
          notes: r.notes,
          image_url: r.image_url,
          ocr_confidence: r.ocr_confidence,
          driver_name: r.driver_id ? driverMap[r.driver_id] ?? null : null,
          truck_number: r.truck_id ? truckMap[r.truck_id] ?? null : null,
        }))}
      />
    </div>
    </PaywallGuard>
  );
}
