'use client';

import { useState, useMemo } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Check,
  Calendar,
  BarChart3,
  Receipt,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  generateExpenseReport,
  generateCSV,
  generateQuickBooksImport,
  downloadBlob,
  type ExportReceipt,
  type ExportOptions,
} from '@/lib/export/excel';
import {
  checkExportRateLimit,
  recordExport,
  buildCacheKey,
  getCachedExport,
  setCachedExport,
} from '@/lib/export/rate-limit';

// ─── Types ───────────────────────────────────────────

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  /** All receipts available for export (already enriched with driver/truck names). */
  receipts: ExportReceipt[];
}

type DatePreset = 'this-month' | 'last-month' | 'tax-year' | 'all' | 'custom';
type Format = 'xlsx' | 'csv' | 'quickbooks';
type GroupBy = 'none' | 'driver' | 'truck' | 'category';

// ─── Helpers ─────────────────────────────────────────

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
}

function toInputDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function formatMoney(n: number): string {
  return '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Component ───────────────────────────────────────

export default function ExportModal({ open, onClose, receipts }: ExportModalProps) {
  const now = new Date();

  // ── State ──────────────────────────────────────────
  const [preset, setPreset] = useState<DatePreset>('this-month');
  const [customStart, setCustomStart] = useState(toInputDate(startOfMonth(now)));
  const [customEnd, setCustomEnd] = useState(toInputDate(now));
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeImages, setIncludeImages] = useState(true);
  const [includeTax, setIncludeTax] = useState(false);
  const [format, setFormat] = useState<Format>('xlsx');
  const [exporting, setExporting] = useState(false);
  const [done, setDone] = useState(false);
  const [rateLimitMsg, setRateLimitMsg] = useState<string | null>(null);

  // ── Computed date range ────────────────────────────
  const dateRange = useMemo(() => {
    switch (preset) {
      case 'this-month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last-month': {
        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return { start: prev, end: endOfMonth(prev) };
      }
      case 'tax-year':
        return {
          start: new Date(now.getFullYear(), 0, 1),
          end: new Date(now.getFullYear(), 11, 31, 23, 59, 59),
        };
      case 'all':
        return {
          start: new Date(2020, 0, 1),
          end: new Date(now.getFullYear() + 1, 11, 31),
        };
      case 'custom':
        return {
          start: new Date(customStart + 'T00:00:00'),
          end: new Date(customEnd + 'T23:59:59'),
        };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, customStart, customEnd]);

  // ── Filtered receipts ──────────────────────────────
  const filtered = useMemo(() => {
    return receipts.filter((r) => {
      const d = new Date(r.receipt_date);
      return d >= dateRange.start && d <= dateRange.end;
    });
  }, [receipts, dateRange]);

  const totalAmount = useMemo(
    () => filtered.reduce((s, r) => s + r.amount, 0),
    [filtered]
  );

  // ── Export handler (rate-limited & cached) ─────────
  const handleExport = async () => {
    if (filtered.length === 0) return;

    // Rate-limit check
    const { allowed, remaining, resetMs } = checkExportRateLimit();
    if (!allowed) {
      const mins = Math.ceil(resetMs / 60_000);
      setRateLimitMsg(`Export limit reached (10/hr). Try again in ${mins} min.`);
      return;
    }
    setRateLimitMsg(null);

    setExporting(true);
    setDone(false);

    // Yield to UI to show loading state
    await new Promise((r) => setTimeout(r, 50));

    try {
      const options: ExportOptions = {
        dateRange,
        groupBy: groupBy === 'none' ? undefined : groupBy,
        includeSummary,
        includeImages,
        includeTaxSummary: includeTax,
        format,
      };

      const dateLabel = `${formatShortDate(dateRange.start)}-${formatShortDate(dateRange.end)}`
        .replace(/\s+/g, '')
        .replace(/,/g, '');

      // Build cache key
      const cacheKey = buildCacheKey(
        filtered.length,
        format,
        dateRange.start.toISOString(),
        dateRange.end.toISOString(),
        { groupBy, includeSummary, includeImages, includeTax },
      );

      switch (format) {
        case 'xlsx': {
          const cached = getCachedExport(cacheKey);
          let buf: Uint8Array;
          if (cached && cached instanceof Uint8Array) {
            buf = cached;
          } else {
            buf = await generateExpenseReport(filtered, options);
            setCachedExport(cacheKey, buf);
          }
          downloadBlob(buf, `expense-report-${dateLabel}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          break;
        }
        case 'csv': {
          const cached = getCachedExport(cacheKey);
          let csv: string;
          if (cached && typeof cached === 'string') {
            csv = cached;
          } else {
            csv = generateCSV(filtered);
            setCachedExport(cacheKey, csv);
          }
          downloadBlob(csv, `expense-report-${dateLabel}.csv`, 'text/csv;charset=utf-8');
          break;
        }
        case 'quickbooks': {
          const cached = getCachedExport(cacheKey);
          let qb: string;
          if (cached && typeof cached === 'string') {
            qb = cached;
          } else {
            qb = generateQuickBooksImport(filtered);
            setCachedExport(cacheKey, qb);
          }
          downloadBlob(qb, `quickbooks-import-${dateLabel}.csv`, 'text/csv;charset=utf-8');
          break;
        }
      }

      recordExport();
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  // ── Preset buttons ─────────────────────────────────
  const presets: { key: DatePreset; label: string }[] = [
    { key: 'this-month', label: 'This Month' },
    { key: 'last-month', label: 'Last Month' },
    { key: 'tax-year', label: `Tax Year ${now.getFullYear()}` },
    { key: 'all', label: 'All Time' },
  ];

  const formatOptions: { key: Format; label: string; icon: typeof FileSpreadsheet; desc: string }[] = [
    { key: 'xlsx', label: 'Excel (.xlsx)', icon: FileSpreadsheet, desc: 'Full report with formatting' },
    { key: 'csv', label: 'CSV', icon: FileText, desc: 'Simple spreadsheet format' },
    { key: 'quickbooks', label: 'QuickBooks', icon: BarChart3, desc: 'QuickBooks CSV import' },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-blue-600" />
            Export Receipts
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-1">
          {/* ── Date Range ──────────────────────────── */}
          <div className="space-y-2.5">
            <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Date Range
            </Label>
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
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
              <button
                onClick={() => setPreset('custom')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  preset === 'custom'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Custom
              </button>
            </div>

            {preset === 'custom' && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Start Date</Label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">End Date</Label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── Format ──────────────────────────────── */}
          <div className="space-y-2.5">
            <Label className="text-sm font-semibold text-gray-700">Format</Label>
            <div className="grid grid-cols-3 gap-2">
              {formatOptions.map((f) => {
                const Icon = f.icon;
                const isActive = format === f.key;
                return (
                  <button
                    key={f.key}
                    onClick={() => setFormat(f.key)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                      isActive
                        ? 'border-blue-600 bg-blue-50/50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className={`text-xs font-medium ${isActive ? 'text-blue-700' : 'text-gray-600'}`}>
                      {f.label}
                    </span>
                    <span className="text-[10px] text-gray-400 leading-tight hidden sm:block">
                      {f.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Options ─────────────────────────────── */}
          <div className="space-y-2.5">
            <Label className="text-sm font-semibold text-gray-700">Options</Label>

            {format === 'xlsx' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">Group By</Label>
                  <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="driver">Driver</SelectItem>
                      <SelectItem value="truck">Truck</SelectItem>
                      <SelectItem value="category">Category</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2.5">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <Checkbox
                      checked={includeSummary}
                      onCheckedChange={(v) => setIncludeSummary(v === true)}
                    />
                    <div>
                      <p className="text-sm text-gray-700">Include summary sheet</p>
                      <p className="text-xs text-gray-400">Totals by category, driver & truck</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <Checkbox
                      checked={includeImages}
                      onCheckedChange={(v) => setIncludeImages(v === true)}
                    />
                    <div>
                      <p className="text-sm text-gray-700">Include receipt images</p>
                      <p className="text-xs text-gray-400">Adds hyperlinks to receipt photos</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <Checkbox
                      checked={includeTax}
                      onCheckedChange={(v) => setIncludeTax(v === true)}
                    />
                    <div>
                      <p className="text-sm text-gray-700">Tax summary (IRS-ready)</p>
                      <p className="text-xs text-gray-400">Schedule C categories & deductions</p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {format !== 'xlsx' && (
              <p className="text-xs text-gray-400 py-1">
                {format === 'csv'
                  ? 'Standard CSV with all receipt fields. Opens in any spreadsheet app.'
                  : 'Formatted for QuickBooks CSV import. Expense accounts auto-mapped from categories.'}
              </p>
            )}
          </div>

          {/* ── Preview ─────────────────────────────── */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Export Preview</span>
              </div>
              <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">
                {filtered.length} receipt{filtered.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-400">Total Amount</p>
                <p className="font-semibold text-gray-900">{formatMoney(totalAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Date Range</p>
                <p className="font-semibold text-gray-900 text-xs">
                  {preset === 'all'
                    ? 'All Time'
                    : `${formatShortDate(dateRange.start)} — ${formatShortDate(dateRange.end)}`}
                </p>
              </div>
            </div>
            {filtered.length === 0 && (
              <p className="text-xs text-red-500 mt-1">
                No receipts found in this date range.
              </p>
            )}
          </div>

          {/* ── Progress / Success ──────────────────── */}
          {exporting && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating report...
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          )}

          {done && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">
              <Check className="h-4 w-4" />
              Report downloaded successfully!
            </div>
          )}

          {rateLimitMsg && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              <span className="font-medium">⏱</span>
              {rateLimitMsg}
            </div>
          )}

          {/* ── Actions ─────────────────────────────── */}
          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-700 gap-2"
              onClick={handleExport}
              disabled={exporting || filtered.length === 0}
            >
              {exporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Export {filtered.length} Receipt{filtered.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
