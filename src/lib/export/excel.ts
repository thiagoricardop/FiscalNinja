import XLSX from 'xlsx-js-style';
import { getWorkingUrl } from '@/components/ui/storage-image';

// ─── Types ───────────────────────────────────────────

export interface ExportReceipt {
  id: string;
  vendor: string;
  amount: number;
  receipt_date: string;
  tax_amount: number | null;
  category: string;
  payment_method: string;
  needs_review: boolean;
  notes: string | null;
  image_url: string;
  ocr_confidence: number | null;
  /** Resolved driver name (not FK) */
  driver_name: string | null;
  /** Resolved truck number (not FK) */
  truck_number: string | null;
}

export interface ExportOptions {
  dateRange: { start: Date; end: Date };
  groupBy?: 'driver' | 'truck' | 'category' | 'none';
  includeSummary: boolean;
  includeImages: boolean;
  includeTaxSummary: boolean;
  format: 'xlsx' | 'csv' | 'quickbooks';
}

// ─── Style Presets ───────────────────────────────────

const COLORS = {
  headerBg: '1E40AF',      // blue-800
  headerText: 'FFFFFF',
  titleBg: '1E3A5F',       // dark navy
  titleText: 'FFFFFF',
  totalBg: 'DBEAFE',       // blue-100
  totalText: '1E40AF',
  sectionBg: 'EFF6FF',     // blue-50
  sectionText: '1E40AF',
  altRowBg: 'F9FAFB',      // gray-50
  white: 'FFFFFF',
  borderColor: 'D1D5DB',   // gray-300
  lightBorder: 'E5E7EB',   // gray-200
  greenBg: 'DCFCE7',       // green-100
  greenText: '166534',
  amberBg: 'FEF3C7',       // amber-100
  amberText: '92400E',
  redBg: 'FEE2E2',
  redText: '991B1B',
};

interface CellStyle {
  font?: { bold?: boolean; color?: { rgb: string }; sz?: number; name?: string; italic?: boolean };
  fill?: { fgColor: { rgb: string } };
  alignment?: { horizontal?: string; vertical?: string; wrapText?: boolean };
  border?: Record<string, { style: string; color: { rgb: string } }>;
  numFmt?: string;
}

const THIN_BORDER = {
  top: { style: 'thin', color: { rgb: COLORS.lightBorder } },
  bottom: { style: 'thin', color: { rgb: COLORS.lightBorder } },
  left: { style: 'thin', color: { rgb: COLORS.lightBorder } },
  right: { style: 'thin', color: { rgb: COLORS.lightBorder } },
};

const MEDIUM_BORDER = {
  top: { style: 'medium', color: { rgb: COLORS.borderColor } },
  bottom: { style: 'medium', color: { rgb: COLORS.borderColor } },
  left: { style: 'medium', color: { rgb: COLORS.borderColor } },
  right: { style: 'medium', color: { rgb: COLORS.borderColor } },
};

const headerStyle: CellStyle = {
  font: { bold: true, color: { rgb: COLORS.headerText }, sz: 11, name: 'Calibri' },
  fill: { fgColor: { rgb: COLORS.headerBg } },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: MEDIUM_BORDER,
};

const titleStyle: CellStyle = {
  font: { bold: true, color: { rgb: COLORS.titleText }, sz: 14, name: 'Calibri' },
  fill: { fgColor: { rgb: COLORS.titleBg } },
  alignment: { horizontal: 'left', vertical: 'center' },
  border: MEDIUM_BORDER,
};

const sectionStyle: CellStyle = {
  font: { bold: true, color: { rgb: COLORS.sectionText }, sz: 11, name: 'Calibri' },
  fill: { fgColor: { rgb: COLORS.sectionBg } },
  alignment: { horizontal: 'left' },
  border: THIN_BORDER,
};

const totalStyle: CellStyle = {
  font: { bold: true, color: { rgb: COLORS.totalText }, sz: 11, name: 'Calibri' },
  fill: { fgColor: { rgb: COLORS.totalBg } },
  border: MEDIUM_BORDER,
};

const normalStyle = (alt: boolean): CellStyle => ({
  font: { sz: 10, name: 'Calibri' },
  fill: { fgColor: { rgb: alt ? COLORS.altRowBg : COLORS.white } },
  border: THIN_BORDER,
  alignment: { vertical: 'center' },
});

const currencyFmt = '$#,##0.00';

// ─── QuickBooks account mapping ──────────────────────

const QB_ACCOUNT_MAP: Record<string, string> = {
  fuel: 'Fuel Expense',
  tolls: 'Tolls & Parking',
  maintenance: 'Repairs & Maintenance',
  insurance: 'Insurance Expense',
  other: 'Other Expense',
};

// ─── IRS Schedule C mapping ──────────────────────────

const SCHEDULE_C_MAP: Record<string, { line: string; description: string }> = {
  fuel: { line: 'Line 9', description: 'Car and Truck Expenses' },
  tolls: { line: 'Line 9', description: 'Car and Truck Expenses' },
  maintenance: { line: 'Line 21', description: 'Repairs and Maintenance' },
  insurance: { line: 'Line 15', description: 'Insurance (other than health)' },
  other: { line: 'Line 27a', description: 'Other Expenses' },
};

// ─── Helpers ─────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function capitalize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function sortByDate(a: ExportReceipt, b: ExportReceipt): number {
  return new Date(a.receipt_date).getTime() - new Date(b.receipt_date).getTime();
}

function grouped<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of items) {
    const k = keyFn(item);
    if (!result[k]) result[k] = [];
    result[k].push(item);
  }
  return result;
}

function csvEscape(value: string): string {
  if (!value) return '""';
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return `"${value}"`;
}

/** Apply a style to a cell, creating it if needed. */
function styleCell(
  ws: XLSX.WorkSheet,
  row: number,
  col: number,
  style: CellStyle,
  value?: string | number,
) {
  const addr = XLSX.utils.encode_cell({ r: row, c: col });
  if (!ws[addr]) {
    ws[addr] = { v: value ?? '', t: typeof value === 'number' ? 'n' : 's' };
  }
  ws[addr].s = style;
  if (style.numFmt) {
    ws[addr].z = style.numFmt;
  }
}

/** Apply a style to a range of cells in a row. */
function styleRow(ws: XLSX.WorkSheet, row: number, colStart: number, colEnd: number, style: CellStyle) {
  for (let c = colStart; c <= colEnd; c++) {
    styleCell(ws, row, c, style);
  }
}

/**
 * Resolve image URLs to working signed URLs for the export.
 * Processes in batches to avoid overwhelming the network.
 */
async function resolveImageUrls(receipts: ExportReceipt[]): Promise<Map<string, string>> {
  const urlMap = new Map<string, string>();
  const toResolve = receipts.filter(
    (r) => r.image_url && r.image_url !== 'placeholder'
  );

  // Process in batches of 10
  const BATCH = 10;
  for (let i = 0; i < toResolve.length; i += BATCH) {
    const batch = toResolve.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map(async (r) => {
        const url = await getWorkingUrl(r.image_url);
        return { id: r.id, url };
      })
    );
    for (const result of results) {
      if (result.status === 'fulfilled') {
        urlMap.set(result.value.id, result.value.url);
      }
    }
  }
  return urlMap;
}

// ─── Main Export: XLSX ───────────────────────────────

export async function generateExpenseReport(
  receipts: ExportReceipt[],
  options: ExportOptions
): Promise<Uint8Array> {
  // Validate
  if (receipts.length === 0) throw new Error('No receipts to export.');

  const sorted = [...receipts].sort(sortByDate);
  const wb = XLSX.utils.book_new();

  // Resolve image URLs if needed
  let imageUrls: Map<string, string> | null = null;
  if (options.includeImages) {
    imageUrls = await resolveImageUrls(sorted);
  }

  // ════════════════════════════════════════════════════
  // SHEET 1: Expense Report
  // ════════════════════════════════════════════════════

  const HEADERS = [
    '#', 'Date', 'Vendor', 'Category', 'Amount', 'Tax',
    'Payment Method', 'Driver', 'Truck', 'Notes',
    ...(options.includeImages ? ['Receipt Image'] : []),
  ];
  const colCount = HEADERS.length;

  // Build the AOA (array of arrays)
  const aoa: (string | number)[][] = [];

  // Row 0: Title row (merged across all columns)
  aoa.push([
    `Expense Report — ${formatDate(options.dateRange.start.toISOString())} to ${formatDate(options.dateRange.end.toISOString())}`,
    ...Array(colCount - 1).fill(''),
  ]);

  // Row 1: Generated info
  aoa.push([
    `Generated on ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} • ${sorted.length} receipts`,
    ...Array(colCount - 1).fill(''),
  ]);

  // Row 2: Empty separator
  aoa.push(Array(colCount).fill(''));

  // Row 3: Headers
  aoa.push(HEADERS);

  // Data rows (starting at row 4)
  const totalAmount = sorted.reduce((s, r) => s + r.amount, 0);
  const totalTax = sorted.reduce((s, r) => s + (r.tax_amount ?? 0), 0);

  for (let i = 0; i < sorted.length; i++) {
    const r = sorted[i];
    const row: (string | number)[] = [
      i + 1,
      formatDate(r.receipt_date),
      r.vendor,
      capitalize(r.category),
      r.amount,
      r.tax_amount ?? 0,
      capitalize(r.payment_method),
      r.driver_name ?? '—',
      r.truck_number ?? '—',
      r.notes ?? '',
    ];
    if (options.includeImages) {
      row.push(imageUrls?.get(r.id) ?? '');
    }
    aoa.push(row);
  }

  // Total row
  const totalRowIdx = aoa.length;
  const totalRow: (string | number)[] = [
    '', '', 'TOTAL', '', totalAmount, totalTax,
    '', '', '', '',
  ];
  if (options.includeImages) totalRow.push('');
  aoa.push(totalRow);

  const ws1 = XLSX.utils.aoa_to_sheet(aoa);

  // Merge title row
  ws1['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } },
  ];

  // ── Style: Title row ──────────────────────────────
  styleRow(ws1, 0, 0, colCount - 1, titleStyle);

  // ── Style: Subtitle row ───────────────────────────
  styleRow(ws1, 1, 0, colCount - 1, {
    font: { italic: true, color: { rgb: '6B7280' }, sz: 9, name: 'Calibri' },
    fill: { fgColor: { rgb: COLORS.white } },
    alignment: { horizontal: 'left' },
    border: THIN_BORDER,
  });

  // ── Style: Header row (row 3) ─────────────────────
  for (let c = 0; c < colCount; c++) {
    styleCell(ws1, 3, c, headerStyle);
  }

  // ── Style: Data rows with alternating colors ──────
  for (let i = 0; i < sorted.length; i++) {
    const row = 4 + i;
    const alt = i % 2 === 1;
    const style = normalStyle(alt);

    for (let c = 0; c < colCount; c++) {
      styleCell(ws1, row, c, style);
    }

    // Currency format for Amount (col 4) and Tax (col 5)
    const amountAddr = XLSX.utils.encode_cell({ r: row, c: 4 });
    if (ws1[amountAddr]) {
      ws1[amountAddr].s = { ...style, numFmt: currencyFmt };
      ws1[amountAddr].z = currencyFmt;
    }
    const taxAddr = XLSX.utils.encode_cell({ r: row, c: 5 });
    if (ws1[taxAddr]) {
      ws1[taxAddr].s = { ...style, numFmt: currencyFmt };
      ws1[taxAddr].z = currencyFmt;
    }

    // Make image column a hyperlink
    if (options.includeImages) {
      const imgCol = colCount - 1;
      const imgAddr = XLSX.utils.encode_cell({ r: row, c: imgCol });
      const imgCell = ws1[imgAddr];
      if (imgCell && imgCell.v && String(imgCell.v).startsWith('http')) {
        const url = String(imgCell.v);
        imgCell.v = 'View Receipt';
        imgCell.l = { Target: url, Tooltip: 'Open receipt image' };
        imgCell.s = {
          ...style,
          font: { ...style.font, color: { rgb: '2563EB' }, sz: 10, name: 'Calibri' },
        };
      }
    }
  }

  // ── Style: Total row ──────────────────────────────
  for (let c = 0; c < colCount; c++) {
    styleCell(ws1, totalRowIdx, c, totalStyle);
  }
  const totalAmountAddr = XLSX.utils.encode_cell({ r: totalRowIdx, c: 4 });
  if (ws1[totalAmountAddr]) {
    ws1[totalAmountAddr].s = { ...totalStyle, numFmt: currencyFmt };
    ws1[totalAmountAddr].z = currencyFmt;
  }
  const totalTaxAddr = XLSX.utils.encode_cell({ r: totalRowIdx, c: 5 });
  if (ws1[totalTaxAddr]) {
    ws1[totalTaxAddr].s = { ...totalStyle, numFmt: currencyFmt };
    ws1[totalTaxAddr].z = currencyFmt;
  }

  // ── Column widths ─────────────────────────────────
  ws1['!cols'] = [
    { wch: 5 },   // #
    { wch: 12 },  // Date
    { wch: 28 },  // Vendor
    { wch: 16 },  // Category
    { wch: 14 },  // Amount
    { wch: 12 },  // Tax
    { wch: 16 },  // Payment Method
    { wch: 18 },  // Driver
    { wch: 14 },  // Truck
    { wch: 30 },  // Notes
    ...(options.includeImages ? [{ wch: 18 }] : []),
  ];

  // ── Row heights ───────────────────────────────────
  ws1['!rows'] = [
    { hpt: 30 }, // Title
    { hpt: 18 }, // Subtitle
    { hpt: 8 },  // Separator
    { hpt: 22 }, // Header
  ];

  // Freeze panes: freeze after row 3 (header) so data scrolls
  ws1['!freeze'] = { xSplit: 0, ySplit: 4 };

  // Update sheet range
  ws1['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: aoa.length - 1, c: colCount - 1 } });

  XLSX.utils.book_append_sheet(wb, ws1, 'Expense Report');

  // ════════════════════════════════════════════════════
  // SHEET 2: Summary
  // ════════════════════════════════════════════════════

  if (options.includeSummary) {
    const ws2 = buildSummarySheet(sorted, options, totalAmount, totalTax);
    XLSX.utils.book_append_sheet(wb, ws2, 'Summary');
  }

  // ════════════════════════════════════════════════════
  // SHEET 3: Tax Summary
  // ════════════════════════════════════════════════════

  if (options.includeTaxSummary) {
    const ws3 = buildTaxSheet(sorted, options, totalAmount, totalTax);
    XLSX.utils.book_append_sheet(wb, ws3, 'Tax Summary');
  }

  // ── Write ─────────────────────────────────────────
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(buf);
}

// ─── Summary Sheet Builder ───────────────────────────

function buildSummarySheet(
  sorted: ExportReceipt[],
  options: ExportOptions,
  totalAmount: number,
  totalTax: number,
): XLSX.WorkSheet {
  const aoa: (string | number)[][] = [];
  const COLS = 4; // A B C D

  // Row 0: Title
  aoa.push(['Expense Summary', '', '', '']);
  // Row 1: subtitle
  aoa.push([
    `${formatDate(options.dateRange.start.toISOString())} to ${formatDate(options.dateRange.end.toISOString())}`,
    '', '', '',
  ]);
  // Row 2: blank
  aoa.push(['', '', '', '']);

  // Row 3: Key metrics header
  aoa.push(['Key Metrics', '', '', '']);
  // Row 4-7: Metrics
  aoa.push(['Total Receipts', sorted.length, '', '']);
  aoa.push(['Total Expenses', totalAmount, '', '']);
  aoa.push(['Total Tax', totalTax, '', '']);
  aoa.push([
    'Average Per Receipt',
    sorted.length > 0 ? Math.round((totalAmount / sorted.length) * 100) / 100 : 0,
    '', '',
  ]);

  // Row 8: blank
  aoa.push(['', '', '', '']);

  // Row 9: By Category header
  aoa.push(['Expenses by Category', '', 'Amount', '% of Total']);
  const byCategory = grouped(sorted, (r) => r.category);
  const catEntries = Object.entries(byCategory)
    .map(([cat, items]) => ({
      name: capitalize(cat),
      total: items.reduce((s, r) => s + r.amount, 0),
      count: items.length,
    }))
    .sort((a, b) => b.total - a.total);

  for (const entry of catEntries) {
    const pct = totalAmount > 0 ? entry.total / totalAmount : 0;
    aoa.push(['', entry.name, entry.total, pct]);
  }

  // Blank
  aoa.push(['', '', '', '']);

  // By Driver header
  const driverHeaderRow = aoa.length;
  aoa.push(['Expenses by Driver', '', 'Amount', 'Receipts']);
  const byDriver = grouped(sorted, (r) => r.driver_name || 'Unassigned');
  const driverEntries = Object.entries(byDriver)
    .map(([name, items]) => ({
      name,
      total: items.reduce((s, r) => s + r.amount, 0),
      count: items.length,
    }))
    .sort((a, b) => b.total - a.total);

  for (const entry of driverEntries) {
    aoa.push(['', entry.name, entry.total, entry.count]);
  }

  // Blank
  aoa.push(['', '', '', '']);

  // By Truck header
  const truckHeaderRow = aoa.length;
  aoa.push(['Expenses by Truck', '', 'Amount', 'Receipts']);
  const byTruck = grouped(sorted, (r) => r.truck_number || 'Unassigned');
  const truckEntries = Object.entries(byTruck)
    .map(([name, items]) => ({
      name,
      total: items.reduce((s, r) => s + r.amount, 0),
      count: items.length,
    }))
    .sort((a, b) => b.total - a.total);

  for (const entry of truckEntries) {
    aoa.push(['', entry.name, entry.total, entry.count]);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Merges
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, // Title
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }, // Subtitle
    { s: { r: 3, c: 0 }, e: { r: 3, c: 3 } }, // Key Metrics header
  ];

  // ── Styling ───────────────────────────────────────

  // Title
  styleRow(ws, 0, 0, COLS - 1, titleStyle);
  // Subtitle
  styleRow(ws, 1, 0, COLS - 1, {
    font: { italic: true, color: { rgb: '6B7280' }, sz: 9, name: 'Calibri' },
    fill: { fgColor: { rgb: COLORS.white } },
    alignment: { horizontal: 'left' },
    border: THIN_BORDER,
  });

  // Key Metrics section header
  styleRow(ws, 3, 0, COLS - 1, sectionStyle);

  // Metrics rows 4-7
  for (let r = 4; r <= 7; r++) {
    const style = normalStyle(r % 2 === 0);
    styleCell(ws, r, 0, { ...style, font: { ...style.font, bold: true } });
    styleCell(ws, r, 1, style);
    styleCell(ws, r, 2, style);
    styleCell(ws, r, 3, style);
    // Format currency for rows 5,6,7 (Total Expenses, Tax, Avg)
    if (r >= 5) {
      const addr = XLSX.utils.encode_cell({ r, c: 1 });
      if (ws[addr] && typeof ws[addr].v === 'number') {
        ws[addr].z = currencyFmt;
        ws[addr].s = { ...style, numFmt: currencyFmt };
      }
    }
  }

  // Category section header (row 9)
  const catHeaderRow = 9;
  styleRow(ws, catHeaderRow, 0, COLS - 1, sectionStyle);

  // Category data rows
  for (let i = 0; i < catEntries.length; i++) {
    const r = catHeaderRow + 1 + i;
    const style = normalStyle(i % 2 === 0);
    styleCell(ws, r, 0, style);
    styleCell(ws, r, 1, { ...style, font: { ...style.font, bold: false } });
    // Amount
    const amtAddr = XLSX.utils.encode_cell({ r, c: 2 });
    if (ws[amtAddr]) { ws[amtAddr].s = style; ws[amtAddr].z = currencyFmt; }
    // Percentage
    const pctAddr = XLSX.utils.encode_cell({ r, c: 3 });
    if (ws[pctAddr]) { ws[pctAddr].s = style; ws[pctAddr].z = '0.0%'; }
  }

  // Driver section header
  styleRow(ws, driverHeaderRow, 0, COLS - 1, sectionStyle);
  for (let i = 0; i < driverEntries.length; i++) {
    const r = driverHeaderRow + 1 + i;
    const style = normalStyle(i % 2 === 0);
    for (let c = 0; c < COLS; c++) styleCell(ws, r, c, style);
    const amtAddr = XLSX.utils.encode_cell({ r, c: 2 });
    if (ws[amtAddr]) { ws[amtAddr].s = style; ws[amtAddr].z = currencyFmt; }
  }

  // Truck section header
  styleRow(ws, truckHeaderRow, 0, COLS - 1, sectionStyle);
  for (let i = 0; i < truckEntries.length; i++) {
    const r = truckHeaderRow + 1 + i;
    const style = normalStyle(i % 2 === 0);
    for (let c = 0; c < COLS; c++) styleCell(ws, r, c, style);
    const amtAddr = XLSX.utils.encode_cell({ r, c: 2 });
    if (ws[amtAddr]) { ws[amtAddr].s = style; ws[amtAddr].z = currencyFmt; }
  }

  // Column widths
  ws['!cols'] = [
    { wch: 28 }, // Section label
    { wch: 24 }, // Detail / Value
    { wch: 16 }, // Amount
    { wch: 14 }, // Extra
  ];

  ws['!rows'] = [{ hpt: 30 }, { hpt: 18 }];

  return ws;
}

// ─── Tax Summary Sheet Builder ───────────────────────

function buildTaxSheet(
  sorted: ExportReceipt[],
  options: ExportOptions,
  totalAmount: number,
  totalTax: number,
): XLSX.WorkSheet {
  const aoa: (string | number)[][] = [];
  const COLS = 5; // A-E

  // Row 0: Title
  aoa.push(['IRS Schedule C — Tax Summary', '', '', '', '']);
  // Row 1: Tax year
  const year = options.dateRange.start.getFullYear();
  aoa.push([`Tax Year ${year}`, '', '', '', '']);
  // Row 2: Period
  aoa.push([
    `Period: ${formatDate(options.dateRange.start.toISOString())} to ${formatDate(options.dateRange.end.toISOString())}`,
    '', '', '', '',
  ]);
  // Row 3: blank
  aoa.push(['', '', '', '', '']);

  // Row 4: Header
  aoa.push(['Schedule C Line', 'Category', '# Receipts', 'Total Expense', 'Sales Tax']);

  // Group by Schedule C line
  const byCategory = grouped(sorted, (r) => r.category);
  const lineGroups: Record<string, { categories: string[]; total: number; tax: number; count: number }> = {};

  for (const [cat, items] of Object.entries(byCategory)) {
    const mapping = SCHEDULE_C_MAP[cat] ?? SCHEDULE_C_MAP.other;
    const key = mapping.line;
    if (!lineGroups[key]) {
      lineGroups[key] = { categories: [], total: 0, tax: 0, count: 0 };
    }
    lineGroups[key].categories.push(capitalize(cat));
    lineGroups[key].total += items.reduce((s, r) => s + r.amount, 0);
    lineGroups[key].tax += items.reduce((s, r) => s + (r.tax_amount ?? 0), 0);
    lineGroups[key].count += items.length;
  }

  // Detail rows per category (not grouped by line — one row per category)
  const detailStartRow = aoa.length;
  for (const [cat, items] of Object.entries(byCategory)) {
    const mapping = SCHEDULE_C_MAP[cat] ?? SCHEDULE_C_MAP.other;
    const catTotal = items.reduce((s, r) => s + r.amount, 0);
    const catTax = items.reduce((s, r) => s + (r.tax_amount ?? 0), 0);
    aoa.push([
      `${mapping.line} — ${mapping.description}`,
      capitalize(cat),
      items.length,
      catTotal,
      catTax,
    ]);
  }
  const detailEndRow = aoa.length - 1;

  // Blank
  aoa.push(['', '', '', '', '']);

  // Totals section
  const totalsHeaderRow = aoa.length;
  aoa.push(['Summary', '', '', '', '']);
  aoa.push(['Total Deductible Expenses', '', sorted.length, totalAmount, '']);
  aoa.push(['Total Sales Tax Paid', '', '', totalTax, '']);
  aoa.push(['Net Deductible Amount', '', '', totalAmount - totalTax, '']);

  // Blank
  aoa.push(['', '', '', '', '']);

  // Notes section
  const notesRow = aoa.length;
  aoa.push(['Notes:', '', '', '', '']);
  aoa.push([
    '• This report is organized by IRS Schedule C expense categories.',
    '', '', '', '',
  ]);
  aoa.push([
    '• All amounts are in USD. Consult your tax advisor for deductibility.',
    '', '', '', '',
  ]);
  aoa.push([
    `• Report generated on ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`,
    '', '', '', '',
  ]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Merges
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: COLS - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: COLS - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: COLS - 1 } },
    { s: { r: totalsHeaderRow, c: 0 }, e: { r: totalsHeaderRow, c: COLS - 1 } },
  ];

  // ── Styling ───────────────────────────────────────

  // Title
  styleRow(ws, 0, 0, COLS - 1, {
    ...titleStyle,
    font: { bold: true, color: { rgb: COLORS.headerText }, sz: 14, name: 'Calibri' },
    fill: { fgColor: { rgb: '1E3A5F' } },
  });

  // Subtitle rows
  for (let r = 1; r <= 2; r++) {
    styleRow(ws, r, 0, COLS - 1, {
      font: { italic: true, color: { rgb: '6B7280' }, sz: 10, name: 'Calibri' },
      fill: { fgColor: { rgb: COLORS.white } },
      border: THIN_BORDER,
    });
  }

  // Column header (row 4)
  styleRow(ws, 4, 0, COLS - 1, headerStyle);

  // Detail data rows
  for (let r = detailStartRow; r <= detailEndRow; r++) {
    const idx = r - detailStartRow;
    const style = normalStyle(idx % 2 === 0);
    for (let c = 0; c < COLS; c++) styleCell(ws, r, c, style);
    // Currency
    const expAddr = XLSX.utils.encode_cell({ r, c: 3 });
    if (ws[expAddr]) { ws[expAddr].s = style; ws[expAddr].z = currencyFmt; }
    const taxAddr = XLSX.utils.encode_cell({ r, c: 4 });
    if (ws[taxAddr]) { ws[taxAddr].s = style; ws[taxAddr].z = currencyFmt; }
  }

  // Totals header
  styleRow(ws, totalsHeaderRow, 0, COLS - 1, sectionStyle);

  // Total rows
  for (let r = totalsHeaderRow + 1; r <= totalsHeaderRow + 3; r++) {
    const style: CellStyle = {
      ...totalStyle,
      font: { bold: true, color: { rgb: COLORS.totalText }, sz: 11, name: 'Calibri' },
    };
    for (let c = 0; c < COLS; c++) styleCell(ws, r, c, style);
    const amtAddr = XLSX.utils.encode_cell({ r, c: 3 });
    if (ws[amtAddr]) { ws[amtAddr].s = style; ws[amtAddr].z = currencyFmt; }
  }

  // Highlight Net Deductible row in green
  const netRow = totalsHeaderRow + 3;
  for (let c = 0; c < COLS; c++) {
    styleCell(ws, netRow, c, {
      font: { bold: true, color: { rgb: COLORS.greenText }, sz: 11, name: 'Calibri' },
      fill: { fgColor: { rgb: COLORS.greenBg } },
      border: MEDIUM_BORDER,
    });
  }
  const netAddr = XLSX.utils.encode_cell({ r: netRow, c: 3 });
  if (ws[netAddr]) { ws[netAddr].z = currencyFmt; }

  // Notes styling
  for (let r = notesRow; r < aoa.length; r++) {
    styleRow(ws, r, 0, COLS - 1, {
      font: { italic: true, color: { rgb: '6B7280' }, sz: 9, name: 'Calibri' },
      fill: { fgColor: { rgb: COLORS.white } },
      border: THIN_BORDER,
    });
  }
  // Notes header bold
  styleCell(ws, notesRow, 0, {
    font: { bold: true, italic: true, color: { rgb: '374151' }, sz: 9, name: 'Calibri' },
    fill: { fgColor: { rgb: COLORS.white } },
    border: THIN_BORDER,
  });

  // Column widths
  ws['!cols'] = [
    { wch: 36 }, // Schedule C Line
    { wch: 18 }, // Category
    { wch: 12 }, // # Receipts
    { wch: 18 }, // Total Expense
    { wch: 16 }, // Sales Tax
  ];

  ws['!rows'] = [{ hpt: 30 }, { hpt: 18 }, { hpt: 18 }];

  return ws;
}

// ─── CSV Export ──────────────────────────────────────

export function generateCSV(receipts: ExportReceipt[]): string {
  if (receipts.length === 0) return '';

  const sorted = [...receipts].sort(sortByDate);

  const headers = [
    'Date', 'Vendor', 'Category', 'Amount', 'Tax',
    'Payment Method', 'Driver', 'Truck', 'Notes', 'Receipt Image',
  ];

  const csvRows = [headers.join(',')];

  for (const r of sorted) {
    const row = [
      formatDate(r.receipt_date),
      csvEscape(r.vendor),
      capitalize(r.category),
      r.amount.toFixed(2),
      r.tax_amount != null ? r.tax_amount.toFixed(2) : '',
      csvEscape(capitalize(r.payment_method)),
      csvEscape(r.driver_name ?? ''),
      csvEscape(r.truck_number ?? ''),
      csvEscape(r.notes ?? ''),
      csvEscape(r.image_url && r.image_url !== 'placeholder' ? r.image_url : ''),
    ];
    csvRows.push(row.join(','));
  }

  // Totals
  const totalAmount = sorted.reduce((s, r) => s + r.amount, 0);
  const totalTax = sorted.reduce((s, r) => s + (r.tax_amount ?? 0), 0);
  csvRows.push(
    ['', '"TOTAL"', '', totalAmount.toFixed(2), totalTax.toFixed(2), '', '', '', '', ''].join(',')
  );

  return '\uFEFF' + csvRows.join('\r\n');
}

// ─── QuickBooks CSV Export ───────────────────────────

export function generateQuickBooksImport(receipts: ExportReceipt[]): string {
  if (receipts.length === 0) return '';

  const sorted = [...receipts].sort(sortByDate);

  const headers = ['Date', 'Description', 'Account', 'Amount', 'Memo'];
  const csvRows = [headers.join(',')];

  for (const r of sorted) {
    const account = QB_ACCOUNT_MAP[r.category] ?? 'Other Expense';
    const memo = [
      r.driver_name ? `Driver: ${r.driver_name}` : '',
      r.truck_number ? `Truck: ${r.truck_number}` : '',
      r.notes ?? '',
    ]
      .filter(Boolean)
      .join(' | ');

    csvRows.push(
      [
        formatDate(r.receipt_date),
        csvEscape(r.vendor),
        csvEscape(account),
        r.amount.toFixed(2),
        csvEscape(memo),
      ].join(',')
    );
  }

  return '\uFEFF' + csvRows.join('\r\n');
}

// ─── Download Trigger ────────────────────────────────

export function downloadBlob(data: Uint8Array | string, filename: string, mimeType: string): void {
  const blob = typeof data === 'string'
    ? new Blob([data], { type: mimeType })
    : new Blob([data.buffer as ArrayBuffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
