'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';
import {
  DollarSign,
  Receipt,
  TrendingUp,
  TrendingDown,
  Truck,
  Users,
  Fuel,
  Calendar,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  BarChart3,
  PieChart as PieIcon,
  Lightbulb,
  FileText,
  ChevronDown,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { PaywallGuard } from '@/components/dashboard/PaywallGuard';
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
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import ExportModal from '@/components/export/ExportModal';
import type { ExportReceipt } from '@/lib/export/excel';
import { downloadPDFReport, type PDFReceipt, type ReportMode } from '@/lib/export/pdf-report';

// ─── Types ───────────────────────────────────────────

interface ReceiptRow {
  id: string;
  user_id: string;
  driver_id: string | null;
  truck_id: string | null;
  image_url: string;
  receipt_date: string;
  vendor: string;
  amount: number;
  tax_amount: number | null;
  category: 'fuel' | 'tolls' | 'maintenance' | 'insurance' | 'other';
  payment_method: 'cash' | 'credit' | 'debit' | 'company_card' | 'other';
  notes: string | null;
  ocr_confidence: number | null;
  needs_review: boolean;
  created_at: string;
}

interface DriverRow {
  id: string;
  name: string;
}

interface TruckRow {
  id: string;
  truck_number: string;
}

type DatePreset = 'this-week' | 'this-month' | 'last-month' | 'this-quarter' | 'this-year' | 'custom';
type TimeGroup = 'day' | 'week' | 'month';
type DriverSortField = 'name' | 'total' | 'count' | 'avg';
type SortDir = 'asc' | 'desc';

// ─── Constants ───────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  fuel: '#3B82F6',
  tolls: '#F59E0B',
  maintenance: '#EF4444',
  insurance: '#8B5CF6',
  other: '#6B7280',
};

const CATEGORY_LABELS: Record<string, string> = {
  fuel: 'Fuel',
  tolls: 'Tolls',
  maintenance: 'Maintenance',
  insurance: 'Insurance',
  other: 'Other',
};

const PIE_COLORS = ['#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#6B7280', '#10B981'];

const IRS_SCHEDULE_C: Record<string, string> = {
  fuel: 'Line 9 — Car & Truck Expenses',
  tolls: 'Line 9 — Car & Truck Expenses',
  maintenance: 'Line 21 — Repairs & Maintenance',
  insurance: 'Line 15 — Insurance',
  other: 'Line 27a — Other Expenses',
};

// ─── Helpers ─────────────────────────────────────────

function money(n: number): string {
  return '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function shortMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return money(n);
}

function pct(n: number): string {
  return (n * 100).toFixed(1) + '%';
}

function capitalize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
}

function getDateRange(preset: DatePreset, customStart: string, customEnd: string) {
  const now = new Date();
  switch (preset) {
    case 'this-week':
      return { start: startOfWeek(now), end: now };
    case 'this-month':
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
    case 'last-month': {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return { start: s, end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59) };
    }
    case 'this-quarter': {
      const q = Math.floor(now.getMonth() / 3) * 3;
      return { start: new Date(now.getFullYear(), q, 1), end: now };
    }
    case 'this-year':
      return { start: new Date(now.getFullYear(), 0, 1), end: now };
    case 'custom':
      return {
        start: new Date(customStart + 'T00:00:00'),
        end: new Date(customEnd + 'T23:59:59'),
      };
  }
}

function toInputDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function weekKey(d: Date): string {
  const s = startOfWeek(d);
  return `${s.getMonth() + 1}/${s.getDate()}`;
}

function groupByTime(receipts: ReceiptRow[], grouping: TimeGroup) {
  const map = new Map<string, { key: string; amount: number; count: number; sortKey: string }>();

  for (const r of receipts) {
    const d = new Date(r.receipt_date);
    let key: string;
    let sortKey: string;

    switch (grouping) {
      case 'day':
        key = `${d.getMonth() + 1}/${d.getDate()}`;
        sortKey = r.receipt_date;
        break;
      case 'week':
        key = `W ${weekKey(d)}`;
        sortKey = startOfWeek(d).toISOString();
        break;
      case 'month':
        key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        sortKey = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
        break;
    }

    const existing = map.get(key);
    if (existing) {
      existing.amount += r.amount;
      existing.count += 1;
    } else {
      map.set(key, { key, amount: r.amount, count: 1, sortKey });
    }
  }

  return [...map.values()].sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}

// ─── Skeleton Components ─────────────────────────────

function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
      <div className="h-3 w-24 bg-gray-200 rounded mb-3" />
      <div className="h-8 w-32 bg-gray-200 rounded mb-2" />
      <div className="h-3 w-20 bg-gray-100 rounded" />
    </div>
  );
}

function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div
      className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse flex items-center justify-center"
      style={{ height }}
    >
      <div className="flex flex-col items-center gap-2 text-gray-300">
        <BarChart3 className="h-10 w-10" />
        <div className="h-3 w-24 bg-gray-200 rounded" />
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="h-4 w-28 bg-gray-200 rounded" />
          <div className="h-4 w-16 bg-gray-100 rounded" />
          <div className="h-4 w-20 bg-gray-200 rounded" />
          <div className="h-4 w-16 bg-gray-100 rounded" />
        </div>
      ))}
    </div>
  );
}

// ─── Custom Tooltip ──────────────────────────────────

function CurrencyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 shadow-lg rounded-lg px-3 py-2 text-sm">
      <p className="text-gray-500 text-xs">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-semibold" style={{ color: p.color }}>
          {money(p.value)}
        </p>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white border border-gray-200 shadow-lg rounded-lg px-3 py-2 text-sm">
      <p className="font-medium">{d.name}</p>
      <p className="text-gray-600">{money(d.value)}</p>
      <p className="text-gray-400 text-xs">{pct(d.payload.pctNum)}</p>
    </div>
  );
}

// ═════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════

export default function ReportsPage() {
  const { user } = useUser();

  // ── Data State ─────────────────────────────────
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [trucks, setTrucks] = useState<TruckRow[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Date Range ─────────────────────────────────
  const [preset, setPreset] = useState<DatePreset>('this-month');
  const [customStart, setCustomStart] = useState(toInputDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [customEnd, setCustomEnd] = useState(toInputDate(new Date()));

  // ── Chart Controls ─────────────────────────────
  const [timeGroup, setTimeGroup] = useState<TimeGroup>('day');
  const [driverSort, setDriverSort] = useState<DriverSortField>('total');
  const [driverSortDir, setDriverSortDir] = useState<SortDir>('desc');

  // ── Tax bracket ────────────────────────────────
  const [taxBracket, setTaxBracket] = useState<string>('22');

  // ── Export ─────────────────────────────────────
  const [exportOpen, setExportOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfMode, setPdfMode] = useState<ReportMode>('full');
  const [pdfError, setPdfError] = useState<string | null>(null);

  const handlePDFDownload = async () => {
    if (!filtered.length || pdfLoading) return;
    setPdfLoading(true);
    setPdfError(null);
    try {
      const pdfReceipts: PDFReceipt[] = filtered.map((r) => ({
        id: r.id,
        vendor: r.vendor,
        amount: r.amount,
        receipt_date: r.receipt_date,
        tax_amount: r.tax_amount,
        category: r.category,
        payment_method: r.payment_method,
        driver_name: r.driver_id ? driverMap[r.driver_id] ?? null : null,
        truck_number: r.truck_id ? truckMap[r.truck_id] ?? null : null,
        notes: r.notes,
      }));
      await downloadPDFReport({
        companyName: user?.user_metadata?.company_name ?? 'My Company',
        dateRange,
        receipts: pdfReceipts,
        taxBracket: Number(taxBracket),
        mode: pdfMode,
      });
    } catch (err: any) {
      console.error('PDF generation error:', err);
      setPdfError(err?.message || 'Failed to generate PDF. Please try again.');
    } finally {
      setPdfLoading(false);
    }
  };

  // ── Data Fetching ──────────────────────────────

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [rRes, dRes, tRes] = await Promise.all([
      supabase
        .from('receipts')
        .select('*')
        .eq('user_id', user.id)
        .order('receipt_date', { ascending: false }),
      supabase.from('drivers').select('id, name').eq('user_id', user.id),
      supabase.from('trucks').select('id, truck_number').eq('user_id', user.id),
    ]);

    setReceipts((rRes.data as ReceiptRow[]) ?? []);
    setDrivers((dRes.data as DriverRow[]) ?? []);
    setTrucks((tRes.data as TruckRow[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Lookup maps ────────────────────────────────

  const driverMap = useMemo(
    () => Object.fromEntries(drivers.map((d) => [d.id, d.name])),
    [drivers],
  );
  const truckMap = useMemo(
    () => Object.fromEntries(trucks.map((t) => [t.id, t.truck_number])),
    [trucks],
  );

  // ── Filtered by date range ─────────────────────

  const dateRange = useMemo(
    () => getDateRange(preset, customStart, customEnd),
    [preset, customStart, customEnd],
  );

  const filtered = useMemo(() => {
    return receipts.filter((r) => {
      const d = new Date(r.receipt_date);
      return d >= dateRange.start && d <= dateRange.end;
    });
  }, [receipts, dateRange]);

  // ── Previous period (for comparison) ───────────

  const prevRange = useMemo(() => {
    const diff = dateRange.end.getTime() - dateRange.start.getTime();
    return {
      start: new Date(dateRange.start.getTime() - diff),
      end: new Date(dateRange.start.getTime() - 1),
    };
  }, [dateRange]);

  const prevFiltered = useMemo(() => {
    return receipts.filter((r) => {
      const d = new Date(r.receipt_date);
      return d >= prevRange.start && d <= prevRange.end;
    });
  }, [receipts, prevRange]);

  // ═══════════════════════════════════════════════
  // COMPUTED DATA
  // ═══════════════════════════════════════════════

  // ── Key Metrics ────────────────────────────────

  const totalExpenses = useMemo(() => filtered.reduce((s, r) => s + r.amount, 0), [filtered]);
  const totalTax = useMemo(() => filtered.reduce((s, r) => s + (r.tax_amount ?? 0), 0), [filtered]);
  const avgExpense = useMemo(() => (filtered.length > 0 ? totalExpenses / filtered.length : 0), [filtered, totalExpenses]);

  const prevTotal = useMemo(() => prevFiltered.reduce((s, r) => s + r.amount, 0), [prevFiltered]);
  const totalChange = prevTotal > 0 ? (totalExpenses - prevTotal) / prevTotal : 0;

  const prevAvg = useMemo(() => (prevFiltered.length > 0 ? prevTotal / prevFiltered.length : 0), [prevFiltered, prevTotal]);
  const avgChange = prevAvg > 0 ? (avgExpense - prevAvg) / prevAvg : 0;

  const topCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filtered) {
      map.set(r.category, (map.get(r.category) ?? 0) + r.amount);
    }
    let best = { cat: '—', amt: 0 };
    for (const [cat, amt] of map) {
      if (amt > best.amt) best = { cat, amt };
    }
    return best;
  }, [filtered]);

  const topDriver = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filtered) {
      const name = r.driver_id ? driverMap[r.driver_id] ?? 'Unknown' : 'Unassigned';
      map.set(name, (map.get(name) ?? 0) + r.amount);
    }
    let best = { name: '—', amt: 0 };
    for (const [name, amt] of map) {
      if (amt > best.amt) best = { name, amt };
    }
    return best;
  }, [filtered, driverMap]);

  const topTruck = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filtered) {
      const num = r.truck_id ? truckMap[r.truck_id] ?? 'Unknown' : 'Unassigned';
      map.set(num, (map.get(num) ?? 0) + r.amount);
    }
    let best = { name: '—', amt: 0 };
    for (const [name, amt] of map) {
      if (amt > best.amt) best = { name, amt };
    }
    return best;
  }, [filtered, truckMap]);

  // ── Chart Data: Over Time ─────────────────────

  const timeData = useMemo(() => groupByTime(filtered, timeGroup), [filtered, timeGroup]);

  // ── Chart Data: By Category (Pie) ─────────────

  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filtered) {
      map.set(r.category, (map.get(r.category) ?? 0) + r.amount);
    }
    return [...map.entries()]
      .map(([cat, amount]) => ({
        name: CATEGORY_LABELS[cat] ?? capitalize(cat),
        value: amount,
        pctNum: totalExpenses > 0 ? amount / totalExpenses : 0,
        color: CATEGORY_COLORS[cat] ?? '#6B7280',
      }))
      .sort((a, b) => b.value - a.value);
  }, [filtered, totalExpenses]);

  // ── Chart Data: By Driver (Bar) ────────────────

  const driverBarData = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filtered) {
      const name = r.driver_id ? driverMap[r.driver_id] ?? 'Unknown' : 'Unassigned';
      map.set(name, (map.get(name) ?? 0) + r.amount);
    }
    return [...map.entries()]
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [filtered, driverMap]);

  // ── Chart Data: By Truck (Bar) ─────────────────

  const truckBarData = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filtered) {
      const num = r.truck_id ? truckMap[r.truck_id] ?? 'Unknown' : 'Unassigned';
      map.set(num, (map.get(num) ?? 0) + r.amount);
    }
    return [...map.entries()]
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [filtered, truckMap]);

  // ── Tax Summary ────────────────────────────────

  const taxSummary = useMemo(() => {
    const map = new Map<string, { amount: number; tax: number; count: number }>();
    for (const r of filtered) {
      const existing = map.get(r.category) ?? { amount: 0, tax: 0, count: 0 };
      existing.amount += r.amount;
      existing.tax += r.tax_amount ?? 0;
      existing.count += 1;
      map.set(r.category, existing);
    }
    return [...map.entries()]
      .map(([cat, data]) => ({
        category: cat,
        label: CATEGORY_LABELS[cat] ?? capitalize(cat),
        scheduleCLine: IRS_SCHEDULE_C[cat] ?? 'Line 27a — Other',
        ...data,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filtered]);

  const totalDeductible = useMemo(() => taxSummary.reduce((s, t) => s + t.amount, 0), [taxSummary]);
  const estimatedSavings = totalDeductible * (parseInt(taxBracket) / 100);

  // ── Driver Performance ─────────────────────────

  const driverPerformance = useMemo(() => {
    const map = new Map<
      string,
      { name: string; count: number; total: number; categories: Map<string, number> }
    >();

    for (const r of filtered) {
      const name = r.driver_id ? driverMap[r.driver_id] ?? 'Unknown' : 'Unassigned';
      const existing = map.get(name) ?? {
        name,
        count: 0,
        total: 0,
        categories: new Map<string, number>(),
      };
      existing.count += 1;
      existing.total += r.amount;
      existing.categories.set(r.category, (existing.categories.get(r.category) ?? 0) + r.amount);
      map.set(name, existing);
    }

    return [...map.values()]
      .map((d) => {
        let topCat = '—';
        let topCatAmt = 0;
        for (const [cat, amt] of d.categories) {
          if (amt > topCatAmt) {
            topCat = CATEGORY_LABELS[cat] ?? capitalize(cat);
            topCatAmt = amt;
          }
        }
        return {
          name: d.name,
          count: d.count,
          total: d.total,
          avg: d.count > 0 ? d.total / d.count : 0,
          topCategory: topCat,
        };
      })
      .sort((a, b) => {
        const mul = driverSortDir === 'desc' ? -1 : 1;
        switch (driverSort) {
          case 'name':
            return mul * a.name.localeCompare(b.name);
          case 'count':
            return mul * (a.count - b.count);
          case 'total':
            return mul * (a.total - b.total);
          case 'avg':
            return mul * (a.avg - b.avg);
        }
      });
  }, [filtered, driverMap, driverSort, driverSortDir]);

  // ── Insights ───────────────────────────────────

  const insights = useMemo(() => {
    const results: { text: string; type: 'info' | 'warning' | 'positive' }[] = [];

    // Compare category spending vs previous period
    const prevCatMap = new Map<string, number>();
    for (const r of prevFiltered) {
      prevCatMap.set(r.category, (prevCatMap.get(r.category) ?? 0) + r.amount);
    }

    for (const cat of categoryData) {
      const catKey = Object.entries(CATEGORY_LABELS).find(([, v]) => v === cat.name)?.[0] ?? '';
      const prev = prevCatMap.get(catKey) ?? 0;
      if (prev > 0) {
        const change = ((cat.value - prev) / prev) * 100;
        if (change > 10) {
          results.push({
            text: `${cat.name} expenses up ${change.toFixed(0)}% vs previous period`,
            type: 'warning',
          });
        } else if (change < -10) {
          results.push({
            text: `${cat.name} expenses down ${Math.abs(change).toFixed(0)}% vs previous period`,
            type: 'positive',
          });
        }
      }
    }

    // Highest average receipt driver
    if (driverPerformance.length > 1) {
      const sorted = [...driverPerformance].sort((a, b) => b.avg - a.avg);
      if (sorted[0] && sorted[0].avg > 0) {
        results.push({
          text: `${sorted[0].name} has highest average receipt (${money(sorted[0].avg)})`,
          type: 'info',
        });
      }
    }

    // Above-average truck
    if (truckBarData.length > 1) {
      const avgTruck = truckBarData.reduce((s, t) => s + t.total, 0) / truckBarData.length;
      const expensive = truckBarData.filter((t) => t.total > avgTruck * 1.3);
      for (const t of expensive.slice(0, 2)) {
        results.push({
          text: `Truck ${t.name} costs ${pct((t.total - avgTruck) / avgTruck)} above fleet average`,
          type: 'warning',
        });
      }
    }

    // Most common submission day
    const dayMap = new Map<number, number>();
    for (const r of filtered) {
      const d = new Date(r.receipt_date).getDay();
      dayMap.set(d, (dayMap.get(d) ?? 0) + 1);
    }
    const days = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
    let topDay = 0;
    let topDayCount = 0;
    for (const [day, count] of dayMap) {
      if (count > topDayCount) {
        topDay = day;
        topDayCount = count;
      }
    }
    if (topDayCount > 0) {
      results.push({
        text: `Most receipts are from ${days[topDay]} (${topDayCount} receipts)`,
        type: 'info',
      });
    }

    // Overall trend
    if (totalChange > 0.05) {
      results.push({
        text: `Total spending up ${pct(totalChange)} vs previous period`,
        type: 'warning',
      });
    } else if (totalChange < -0.05) {
      results.push({
        text: `Total spending down ${pct(Math.abs(totalChange))} vs previous period`,
        type: 'positive',
      });
    }

    if (results.length === 0) {
      results.push({ text: 'Add more receipts across periods to unlock spending insights.', type: 'info' });
    }

    return results.slice(0, 6);
  }, [categoryData, driverPerformance, truckBarData, filtered, prevFiltered, totalChange]);

  // ── Export receipts mapping ────────────────────

  const exportReceipts: ExportReceipt[] = useMemo(
    () =>
      filtered.map((r) => ({
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
      })),
    [filtered, driverMap, truckMap],
  );

  // ── CSV export for driver table ────────────────

  const downloadDriverCSV = () => {
    const headers = ['Driver Name', 'Total Receipts', 'Total Spent', 'Avg/Receipt', 'Top Category'];
    const rows = driverPerformance.map((d) =>
      [d.name, d.count, d.total.toFixed(2), d.avg.toFixed(2), d.topCategory].join(','),
    );
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'driver-performance.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Sort helper for driver table ───────────────

  const toggleDriverSort = (field: DriverSortField) => {
    if (driverSort === field) {
      setDriverSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setDriverSort(field);
      setDriverSortDir('desc');
    }
  };

  const SortIcon = ({ field }: { field: DriverSortField }) => {
    if (driverSort !== field) return <ArrowUpDown className="h-3 w-3 text-gray-400" />;
    return driverSortDir === 'desc' ? (
      <ArrowDown className="h-3 w-3 text-blue-600" />
    ) : (
      <ArrowUp className="h-3 w-3 text-blue-600" />
    );
  };

  // ─── Presets ───────────────────────────────────

  const datePresets: { key: DatePreset; label: string }[] = [
    { key: 'this-week', label: 'This Week' },
    { key: 'this-month', label: 'This Month' },
    { key: 'last-month', label: 'Last Month' },
    { key: 'this-quarter', label: 'This Quarter' },
    { key: 'this-year', label: 'This Year' },
    { key: 'custom', label: 'Custom' },
  ];

  // ═══════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════

  return (
    <PaywallGuard>
    <div className="space-y-6">
      {/* ═══════ DATE RANGE SELECTOR BAR ═══════ */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <BarChart3 className="h-6 w-6 text-blue-600 flex-shrink-0" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Reports</h1>
            <p className="text-xs text-gray-500 hidden sm:block">Analytics & spending insights</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {datePresets.map((p) => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                preset === p.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}

          <div className="ml-2 flex items-center gap-0 border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setPdfMode('full')}
              className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
                pdfMode === 'full'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Full Report
            </button>
            <button
              onClick={() => setPdfMode('summary')}
              className={`px-2.5 py-1.5 text-xs font-medium transition-colors border-l border-gray-200 ${
                pdfMode === 'summary'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              1-Page Summary
            </button>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handlePDFDownload}
            disabled={pdfLoading || !filtered.length}
            className="gap-1.5"
          >
            {pdfLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <FileText className="h-3 w-3" />
            )}
            Download PDF
          </Button>
        </div>
        {pdfError && (
          <p className="text-xs text-red-500 mt-1">{pdfError}</p>
        )}
      </div>

      {/* Custom date picker */}
      {preset === 'custom' && (
        <div className="flex gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Start</Label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">End</Label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* ═══════ LOADING STATE ═══════ */}
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartSkeleton height={350} />
            <ChartSkeleton height={350} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartSkeleton height={350} />
            <ChartSkeleton height={350} />
          </div>
          <TableSkeleton />
        </div>
      ) : (
        <>
          {/* ═══════ KEY METRICS CARDS ═══════ */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Total Expenses */}
            <Card className="border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <DollarSign className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">Total Expenses</span>
                </div>
                <p className="text-lg sm:text-xl font-bold text-gray-900">{shortMoney(totalExpenses)}</p>
                {totalChange !== 0 && (
                  <div className={`flex items-center gap-1 text-xs mt-1 ${totalChange > 0 ? 'text-red-500' : 'text-green-600'}`}>
                    {totalChange > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {pct(Math.abs(totalChange))} vs prev
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Total Receipts */}
            <Card className="border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <Receipt className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">Receipts</span>
                </div>
                <p className="text-lg sm:text-xl font-bold text-gray-900">{filtered.length}</p>
                <p className="text-xs text-gray-400 mt-1">{prevFiltered.length} prev period</p>
              </CardContent>
            </Card>

            {/* Average */}
            <Card className="border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">Avg Receipt</span>
                </div>
                <p className="text-lg sm:text-xl font-bold text-gray-900">{money(avgExpense)}</p>
                {avgChange !== 0 && (
                  <div className={`flex items-center gap-1 text-xs mt-1 ${avgChange > 0 ? 'text-red-500' : 'text-green-600'}`}>
                    {avgChange > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {pct(Math.abs(avgChange))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Category */}
            <Card className="border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <Fuel className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">Top Category</span>
                </div>
                <p className="text-sm font-bold text-gray-900 truncate">{CATEGORY_LABELS[topCategory.cat] ?? capitalize(topCategory.cat)}</p>
                <p className="text-xs text-gray-400 mt-1">{money(topCategory.amt)}</p>
              </CardContent>
            </Card>

            {/* Top Driver */}
            <Card className="border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <Users className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">Top Driver</span>
                </div>
                <p className="text-sm font-bold text-gray-900 truncate">{topDriver.name}</p>
                <p className="text-xs text-gray-400 mt-1">{money(topDriver.amt)}</p>
              </CardContent>
            </Card>

            {/* Top Truck */}
            <Card className="border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <Truck className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">Top Truck</span>
                </div>
                <p className="text-sm font-bold text-gray-900 truncate">{topTruck.name}</p>
                <p className="text-xs text-gray-400 mt-1">{money(topTruck.amt)}</p>
              </CardContent>
            </Card>
          </div>

          {/* ═══════ CHARTS ROW 1 ═══════ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Chart 1: Expenses Over Time */}
            <Card className="border-gray-200">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-gray-700">Expenses Over Time</CardTitle>
                  <div className="flex gap-1">
                    {(['day', 'week', 'month'] as TimeGroup[]).map((g) => (
                      <button
                        key={g}
                        onClick={() => setTimeGroup(g)}
                        className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${
                          timeGroup === g
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        {capitalize(g)}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {timeData.length === 0 ? (
                  <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">
                    No data for this period
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={timeData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      <XAxis dataKey="key" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#9CA3AF' }}
                        tickFormatter={(v) => shortMoney(v)}
                        width={60}
                      />
                      <Tooltip content={<CurrencyTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        dot={{ r: 3, fill: '#3B82F6' }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Chart 2: Expenses by Category (Pie) */}
            <Card className="border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <PieIcon className="h-4 w-4 text-gray-400" />
                  Expenses by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                {categoryData.length === 0 ? (
                  <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">
                    No data for this period
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={100}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {categoryData.map((entry, idx) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap sm:flex-col gap-2 text-xs min-w-[140px]">
                      {categoryData.map((cat) => (
                        <div key={cat.name} className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                          <span className="text-gray-600">{cat.name}</span>
                          <span className="text-gray-400 ml-auto">{pct(cat.pctNum)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ═══════ CHARTS ROW 2 ═══════ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Chart 3: By Driver */}
            <Card className="border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  Expenses by Driver
                </CardTitle>
              </CardHeader>
              <CardContent>
                {driverBarData.length === 0 ? (
                  <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">
                    No data
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={driverBarData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} tickFormatter={(v) => shortMoney(v)} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        tick={{ fontSize: 11, fill: '#6B7280' }}
                        width={90}
                      />
                      <Tooltip content={<CurrencyTooltip />} />
                      <Bar dataKey="total" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Chart 4: By Truck */}
            <Card className="border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Truck className="h-4 w-4 text-gray-400" />
                  Expenses by Truck
                </CardTitle>
              </CardHeader>
              <CardContent>
                {truckBarData.length === 0 ? (
                  <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">
                    No data
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={truckBarData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} tickFormatter={(v) => shortMoney(v)} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        tick={{ fontSize: 11, fill: '#6B7280' }}
                        width={90}
                      />
                      <Tooltip content={<CurrencyTooltip />} />
                      <Bar dataKey="total" fill="#F59E0B" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ═══════ TAX DEDUCTION SUMMARY ═══════ */}
          <Card className="border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-green-600" />
                  Tax Deduction Summary
                </CardTitle>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-gray-500 whitespace-nowrap">Tax Bracket</Label>
                    <Select value={taxBracket} onValueChange={setTaxBracket}>
                      <SelectTrigger className="h-8 w-[90px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10%</SelectItem>
                        <SelectItem value="12">12%</SelectItem>
                        <SelectItem value="22">22%</SelectItem>
                        <SelectItem value="24">24%</SelectItem>
                        <SelectItem value="32">32%</SelectItem>
                        <SelectItem value="35">35%</SelectItem>
                        <SelectItem value="37">37%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => setExportOpen(true)}
                  >
                    <Download className="h-3 w-3" />
                    Export for Tax Filing
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Summary cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-blue-600 font-medium">Total Deductible</p>
                    <p className="text-lg font-bold text-blue-900">{money(totalDeductible)}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs text-green-600 font-medium">Est. Tax Savings ({taxBracket}%)</p>
                    <p className="text-lg font-bold text-green-900">{money(estimatedSavings)}</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3">
                    <p className="text-xs text-amber-600 font-medium">Total Sales Tax Paid</p>
                    <p className="text-lg font-bold text-amber-900">{money(totalTax)}</p>
                  </div>
                </div>

                {/* Category breakdown */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="text-xs">Schedule C Line</TableHead>
                        <TableHead className="text-xs">Category</TableHead>
                        <TableHead className="text-xs text-right">Receipts</TableHead>
                        <TableHead className="text-xs text-right">Amount</TableHead>
                        <TableHead className="text-xs text-right">Tax</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {taxSummary.map((row) => (
                        <TableRow key={row.category}>
                          <TableCell className="text-xs text-gray-500">{row.scheduleCLine}</TableCell>
                          <TableCell className="text-sm font-medium">{row.label}</TableCell>
                          <TableCell className="text-sm text-right">{row.count}</TableCell>
                          <TableCell className="text-sm text-right font-mono">{money(row.amount)}</TableCell>
                          <TableCell className="text-sm text-right font-mono">{money(row.tax)}</TableCell>
                        </TableRow>
                      ))}
                      {taxSummary.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-gray-400 py-6 text-sm">
                            No receipts in this period
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ═══════ DRIVER PERFORMANCE TABLE ═══════ */}
          <Card className="border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  Driver Performance
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={downloadDriverCSV}
                >
                  <Download className="h-3 w-3" />
                  CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>
                        <button
                          className="flex items-center gap-1 text-xs font-semibold"
                          onClick={() => toggleDriverSort('name')}
                        >
                          Driver <SortIcon field="name" />
                        </button>
                      </TableHead>
                      <TableHead className="text-right">
                        <button
                          className="flex items-center gap-1 text-xs font-semibold ml-auto"
                          onClick={() => toggleDriverSort('count')}
                        >
                          Receipts <SortIcon field="count" />
                        </button>
                      </TableHead>
                      <TableHead className="text-right">
                        <button
                          className="flex items-center gap-1 text-xs font-semibold ml-auto"
                          onClick={() => toggleDriverSort('total')}
                        >
                          Total Spent <SortIcon field="total" />
                        </button>
                      </TableHead>
                      <TableHead className="text-right">
                        <button
                          className="flex items-center gap-1 text-xs font-semibold ml-auto"
                          onClick={() => toggleDriverSort('avg')}
                        >
                          Avg / Receipt <SortIcon field="avg" />
                        </button>
                      </TableHead>
                      <TableHead className="text-xs">Top Category</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {driverPerformance.map((d) => (
                      <TableRow key={d.name}>
                        <TableCell className="font-medium text-sm">{d.name}</TableCell>
                        <TableCell className="text-right text-sm">{d.count}</TableCell>
                        <TableCell className="text-right text-sm font-mono">{money(d.total)}</TableCell>
                        <TableCell className="text-right text-sm font-mono">{money(d.avg)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {d.topCategory}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {driverPerformance.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-gray-400 py-6 text-sm">
                          No driver data in this period
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* ═══════ INSIGHTS ═══════ */}
          <Card className="border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Spending Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {insights.map((insight, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2.5 rounded-lg p-3 text-sm ${
                      insight.type === 'warning'
                        ? 'bg-amber-50 text-amber-800'
                        : insight.type === 'positive'
                        ? 'bg-green-50 text-green-800'
                        : 'bg-blue-50 text-blue-800'
                    }`}
                  >
                    {insight.type === 'warning' ? (
                      <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    ) : insight.type === 'positive' ? (
                      <TrendingDown className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    )}
                    <span className="text-xs leading-relaxed">{insight.text}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Export Modal */}
      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        receipts={exportReceipts}
      />
    </div>
    </PaywallGuard>
  );
}
