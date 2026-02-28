/**
 * PDF Expense Report Generator — v2
 *
 * Two modes:
 *   "full"    — Multi-page professional report (Cover, Executive Summary,
 *               Detailed Tables, Visual Analytics, Tax Summary)
 *   "summary" — Everything on a single LETTER page: header, KPIs, mini pie,
 *               category breakdown, top receipts, and tax savings
 *
 * Uses @react-pdf/renderer exclusively — no puppeteer required.
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Svg,
  Rect,
  Circle,
  Line as SvgLine,
  G,
  Path,
  pdf,
} from '@react-pdf/renderer';

// Disable the default hyphenation callback so @react-pdf does not try to
// fetch the Inter font (or any other remote font) at render time.
Font.registerHyphenationCallback((word) => [word]);

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════

export type ReportMode = 'full' | 'summary';

export interface PDFReceipt {
  id: string;
  vendor: string;
  amount: number;
  receipt_date: string;
  tax_amount: number | null;
  category: string;
  payment_method: string;
  driver_name: string | null;
  truck_number: string | null;
  notes: string | null;
}

export interface PDFReportData {
  companyName: string;
  dateRange: { start: Date; end: Date };
  receipts: PDFReceipt[];
  taxBracket?: number;
  mode?: ReportMode;
}

interface CategorySummary {
  category: string;
  label: string;
  amount: number;
  tax: number;
  count: number;
  pct: number;
  color: string;
}

interface DriverSummary {
  name: string;
  total: number;
  count: number;
  avg: number;
}

// ═══════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════

const BRAND = '#1E3A5F';
const BRAND_LIGHT = '#2563EB';
const ACCENT = '#3B82F6';
const ACCENT_BG = '#EFF6FF';
const ACCENT_BG2 = '#DBEAFE';
const DARK = '#0F172A';
const TEXT_COLOR = '#334155';
const MUTED = '#64748B';
const LIGHT = '#F8FAFC';
const BORDER = '#E2E8F0';
const WHITE = '#FFFFFF';
const GREEN = '#166534';
const GREEN_BG = '#DCFCE7';
const AMBER_BG = '#FEF3C7';
const AMBER = '#92400E';

const CATEGORY_COLORS: Record<string, string> = {
  fuel: '#3B82F6',
  tolls: '#F59E0B',
  maintenance: '#EF4444',
  insurance: '#8B5CF6',
  other: '#64748B',
};

const CATEGORY_LABELS: Record<string, string> = {
  fuel: 'Fuel',
  tolls: 'Tolls',
  maintenance: 'Maintenance',
  insurance: 'Insurance',
  other: 'Other',
};

const IRS_LINES: Record<string, string> = {
  fuel: 'Line 9 — Car & Truck Expenses',
  tolls: 'Line 9 — Car & Truck Expenses',
  maintenance: 'Line 21 — Repairs & Maintenance',
  insurance: 'Line 15 — Insurance',
  other: 'Line 27a — Other Expenses',
};

// ═══════════════════════════════════════════════════════
// STYLESHEET
// ═══════════════════════════════════════════════════════

const s = StyleSheet.create({
  /* ---------- Page shell ---------- */
  page: {
    paddingTop: 60,
    paddingBottom: 56,
    paddingHorizontal: 44,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: TEXT_COLOR,
  },
  /* ---------- Running header ---------- */
  runningHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 36,
    backgroundColor: BRAND,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 44,
  },
  runningHeaderText: {
    fontSize: 7,
    color: WHITE,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
  },
  runningHeaderSub: {
    fontSize: 6,
    color: ACCENT_BG2,
  },
  /* ---------- Running footer ---------- */
  runningFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 32,
    borderTopWidth: 0.5,
    borderTopColor: BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 44,
  },
  footerText: {
    fontSize: 6,
    color: MUTED,
  },
  /* ---------- Cover ---------- */
  coverPage: { padding: 0, fontFamily: 'Helvetica' },
  coverBg: {
    height: '100%',
    width: '100%',
    backgroundColor: BRAND,
    padding: 60,
    justifyContent: 'space-between',
  },
  coverTopBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 14,
    marginBottom: 40,
  },
  coverTopBadgeText: {
    fontSize: 8,
    color: ACCENT_BG2,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  coverCompany: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: ACCENT_BG2,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  coverTitle: {
    fontSize: 40,
    fontFamily: 'Helvetica-Bold',
    color: WHITE,
    lineHeight: 1.1,
    marginBottom: 6,
  },
  coverSubtitle: {
    fontSize: 15,
    color: ACCENT_BG2,
    marginBottom: 50,
  },
  coverStatRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 40,
  },
  coverStatBox: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 6,
    paddingVertical: 14,
    paddingHorizontal: 20,
    minWidth: 130,
  },
  coverStatLabel: {
    fontSize: 7,
    color: ACCENT_BG2,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  coverStatValue: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: WHITE,
  },
  coverFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  coverFooterText: {
    fontSize: 8,
    color: ACCENT_BG2,
  },
  coverGenBadge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  coverGenText: {
    fontSize: 7,
    color: WHITE,
    fontFamily: 'Helvetica-Bold',
  },
  /* ---------- Section Headers ---------- */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
    gap: 8,
  },
  sectionAccent: {
    width: 3,
    height: 16,
    borderRadius: 2,
    backgroundColor: BRAND_LIGHT,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
  },
  sectionSub: {
    fontSize: 8,
    color: MUTED,
    marginLeft: 'auto',
  },
  /* ---------- KPI Cards ---------- */
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: BORDER,
    borderRadius: 6,
    padding: 12,
    backgroundColor: WHITE,
  },
  kpiCardHighlight: {
    flex: 1,
    borderRadius: 6,
    padding: 12,
    backgroundColor: ACCENT_BG,
    borderWidth: 0.5,
    borderColor: ACCENT,
  },
  kpiLabel: {
    fontSize: 6.5,
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  kpiValue: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
  },
  kpiSub: {
    fontSize: 7,
    color: MUTED,
    marginTop: 2,
  },
  /* ---------- Tables ---------- */
  table: { marginBottom: 12 },
  tHead: {
    flexDirection: 'row',
    backgroundColor: BRAND,
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    gap: 2,
  },
  th: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    color: WHITE,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
    gap: 2,
  },
  tRowAlt: { backgroundColor: LIGHT },
  td: { fontSize: 8, color: TEXT_COLOR },
  tdBold: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: DARK },
  /* Subtotal / Grand total */
  subtotalRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 6,
    backgroundColor: ACCENT_BG,
    marginTop: 1,
    marginBottom: 12,
  },
  grandRow: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 6,
    backgroundColor: BRAND,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    marginTop: 4,
  },
  grandText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: WHITE,
  },
  /* ---------- Charts ---------- */
  chartBox: { marginBottom: 18 },
  chartLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
    marginBottom: 6,
  },
  /* ---------- Insight pills ---------- */
  insightPill: {
    backgroundColor: ACCENT_BG,
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginBottom: 4,
  },
  insightText: {
    fontSize: 7.5,
    color: BRAND_LIGHT,
  },
  /* ---------- Tax highlight ---------- */
  taxCard: {
    backgroundColor: GREEN_BG,
    borderRadius: 6,
    padding: 14,
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taxLabel: { fontSize: 9, color: GREEN },
  taxValue: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: GREEN },
  /* ---------- Disclaimer ---------- */
  disclaimer: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: AMBER_BG,
    borderRadius: 4,
  },
  disclaimerTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: AMBER,
  },
  disclaimerBody: {
    fontSize: 6,
    color: AMBER,
    marginTop: 2,
    lineHeight: 1.4,
  },

  /* ========= SUMMARY (1-page) ========= */
  sumPage: {
    paddingTop: 0,
    paddingBottom: 24,
    paddingHorizontal: 28,
    fontFamily: 'Helvetica',
    fontSize: 7,
    color: TEXT_COLOR,
  },
  sumHeader: {
    backgroundColor: BRAND,
    marginHorizontal: -28,
    paddingHorizontal: 28,
    paddingTop: 18,
    paddingBottom: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  sumCompany: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: ACCENT_BG2,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  sumTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: WHITE,
  },
  sumDate: {
    fontSize: 7,
    color: ACCENT_BG2,
  },
  sumSection: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
    marginTop: 8,
    marginBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
    paddingBottom: 2,
  },
  sumKpiRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  sumKpi: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: BORDER,
    borderRadius: 4,
    padding: 6,
  },
  sumKpiLabel: {
    fontSize: 5.5,
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  sumKpiValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
  },
  sumTh: {
    fontSize: 5.5,
    fontFamily: 'Helvetica-Bold',
    color: WHITE,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  sumTd: { fontSize: 6.5, color: TEXT_COLOR },
  sumTdBold: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: DARK },
  sumFooter: {
    position: 'absolute',
    bottom: 8,
    left: 28,
    right: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sumFooterText: { fontSize: 5, color: MUTED },
});

// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════

function fmt(n: number): string {
  if (n == null || isNaN(n)) return '$0.00';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtK(n: number): string {
  if (n == null || isNaN(n)) return '$0';
  if (n >= 1000) return '$' + (n / 1000).toFixed(1) + 'k';
  return fmt(n);
}

function fmtDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

function fmtDateShort(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function fmtLong(d: Date): string {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function cap(str: string): string {
  if (!str) return '—';
  return str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function computeCategories(receipts: PDFReceipt[]): CategorySummary[] {
  const map = new Map<string, { amount: number; tax: number; count: number }>();
  for (const r of receipts) {
    const existing = map.get(r.category) ?? { amount: 0, tax: 0, count: 0 };
    existing.amount += r.amount;
    existing.tax += r.tax_amount ?? 0;
    existing.count += 1;
    map.set(r.category, existing);
  }
  const total = receipts.reduce((sum, r) => sum + r.amount, 0);
  return [...map.entries()]
    .map(([cat, d]) => ({
      category: cat,
      label: CATEGORY_LABELS[cat] ?? cap(cat),
      pct: total > 0 ? d.amount / total : 0,
      color: CATEGORY_COLORS[cat] ?? '#64748B',
      ...d,
    }))
    .sort((a, b) => b.amount - a.amount);
}

function computeDrivers(receipts: PDFReceipt[]): DriverSummary[] {
  const map = new Map<string, { total: number; count: number }>();
  for (const r of receipts) {
    const name = r.driver_name ?? 'Unassigned';
    const existing = map.get(name) ?? { total: 0, count: 0 };
    existing.total += r.amount;
    existing.count += 1;
    map.set(name, existing);
  }
  return [...map.entries()]
    .map(([name, d]) => ({ name, avg: d.count > 0 ? d.total / d.count : 0, ...d }))
    .sort((a, b) => b.total - a.total);
}

function computeTimeSeries(receipts: PDFReceipt[]): { label: string; amount: number }[] {
  const map = new Map<string, number>();
  const sorted = [...receipts].sort(
    (a, b) => new Date(a.receipt_date).getTime() - new Date(b.receipt_date).getTime(),
  );
  for (const r of sorted) {
    const d = new Date(r.receipt_date);
    const key = `${d.getMonth() + 1}/${d.getDate()}`;
    map.set(key, (map.get(key) ?? 0) + r.amount);
  }
  return [...map.entries()].map(([label, amount]) => ({ label, amount }));
}

// ═══════════════════════════════════════════════════════
// COLUMN WIDTHS
// ═══════════════════════════════════════════════════════

const COL = {
  num: '5%', date: '10%', vendor: '20%', cat: '12%',
  amount: '14%', tax: '12%', method: '14%', driver: '15%',
};

const COL_SUM = {
  date: '13%', vendor: '25%', cat: '15%',
  amount: '15%', driver: '16%', method: '14%',
};

// ═══════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════

function RunningHeader({ company, dateStr }: { company: string; dateStr: string }) {
  return (
    <View style={s.runningHeader} fixed>
      <Text style={s.runningHeaderText}>{company}  •  Expense Report</Text>
      <Text style={s.runningHeaderSub}>{dateStr}</Text>
    </View>
  );
}

function RunningFooter({ generatedDate }: { generatedDate: string }) {
  return (
    <View style={s.runningFooter} fixed>
      <Text
        style={s.footerText}
        render={({ pageNumber, totalPages }) =>
          `Page ${pageNumber} of ${totalPages}`
        }
      />
      <Text style={s.footerText}>Generated {generatedDate} • FiscalNinja</Text>
    </View>
  );
}

function SectionHead({ title, right }: { title: string; right?: string }) {
  return (
    <View style={s.sectionHeader}>
      <View style={s.sectionAccent} />
      <Text style={s.sectionTitle}>{title}</Text>
      {right ? <Text style={s.sectionSub}>{right}</Text> : null}
    </View>
  );
}

// ═══════════════════════════════════════════════════════
// SVG CHARTS
// ═══════════════════════════════════════════════════════

function PieChartSvg({ data, size = 130 }: { data: CategorySummary[]; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 8;
  const ri = r * 0.55;

  // Empty data guard
  if (!data || data.length === 0) {
    return (
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={cx} cy={cy} r={r} fill={LIGHT} />
        <Circle cx={cx} cy={cy} r={ri - 3} fill={WHITE} />
      </Svg>
    );
  }

  let cumAngle = -Math.PI / 2;
  const slices: React.ReactElement[] = [];

  /** Helper – push one donut arc sector */
  const pushArc = (key: string, sa: number, ea: number, color: string) => {
    const x1o = cx + r * Math.cos(sa);
    const y1o = cy + r * Math.sin(sa);
    const x2o = cx + r * Math.cos(ea);
    const y2o = cy + r * Math.sin(ea);
    const x1i = cx + ri * Math.cos(ea);
    const y1i = cy + ri * Math.sin(ea);
    const x2i = cx + ri * Math.cos(sa);
    const y2i = cy + ri * Math.sin(sa);
    const la = (ea - sa) > Math.PI ? 1 : 0;
    const d = `M ${x1o} ${y1o} A ${r} ${r} 0 ${la} 1 ${x2o} ${y2o} L ${x1i} ${y1i} A ${ri} ${ri} 0 ${la} 0 ${x2i} ${y2i} Z`;
    slices.push(<Path key={key} d={d} fill={color} />);
  };

  for (let i = 0; i < data.length; i++) {
    const angle = data[i].pct * 2 * Math.PI;
    if (angle < 0.001) continue;

    // Full-circle arcs are degenerate in SVG (start === end point).
    // Split into two semicircles to avoid a zero-length arc path.
    if (angle > Math.PI * 1.999) {
      const mid = cumAngle + Math.PI;
      pushArc(`${i}a`, cumAngle, mid, data[i].color);
      pushArc(`${i}b`, mid, cumAngle + angle, data[i].color);
    } else {
      pushArc(String(i), cumAngle, cumAngle + angle, data[i].color);
    }
    cumAngle += angle;
  }

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices}
      <Circle cx={cx} cy={cy} r={ri - 3} fill={WHITE} />
    </Svg>
  );
}

function BarChartSvg({
  data,
  width = 260,
  height = 120,
  barColor = BRAND_LIGHT,
}: {
  data: { name: string; value: number }[];
  width?: number;
  height?: number;
  barColor?: string;
}) {
  if (!data.length)
    return (
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Rect x={0} y={0} width={width} height={height} rx={3} fill={LIGHT} />
      </Svg>
    );
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const bw = Math.min(22, (width - 40) / data.length - 4);
  const left = 40;
  const bottom = height - 18;
  const ch = bottom - 8;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <SvgLine x1={left} y1={6} x2={left} y2={bottom} stroke={BORDER} strokeWidth={0.5} />
      {[0.25, 0.5, 0.75, 1].map((p, i) => {
        const y = bottom - ch * p;
        return (
          <SvgLine
            key={i}
            x1={left}
            y1={y}
            x2={width - 4}
            y2={y}
            stroke={LIGHT}
            strokeWidth={0.5}
          />
        );
      })}
      {data.slice(0, 8).map((d, i) => {
        const h = (d.value / maxVal) * ch;
        const x = left + 8 + i * (bw + 4);
        return (
          <Rect key={i} x={x} y={bottom - h} width={bw} height={h} fill={barColor} rx={2} />
        );
      })}
      <SvgLine x1={left} y1={bottom} x2={width - 4} y2={bottom} stroke={BORDER} strokeWidth={0.5} />
    </Svg>
  );
}

function LineChartSvg({
  data,
  width = 480,
  height = 130,
}: {
  data: { label: string; amount: number }[];
  width?: number;
  height?: number;
}) {
  if (data.length < 2)
    return (
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Rect x={0} y={0} width={width} height={height} rx={3} fill={LIGHT} />
      </Svg>
    );
  const maxVal = Math.max(...data.map((d) => d.amount), 1);
  const left = 40;
  const right = width - 8;
  const top = 8;
  const bottom = height - 16;
  const cw = right - left;
  const ch = bottom - top;

  const pts = data.map((d, i) => ({
    x: left + (i / (data.length - 1)) * cw,
    y: bottom - (d.amount / maxVal) * ch,
  }));
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const area = line + ` L ${pts[pts.length - 1].x} ${bottom} L ${pts[0].x} ${bottom} Z`;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {[0.25, 0.5, 0.75, 1].map((p, i) => {
        const y = bottom - ch * p;
        return (
          <SvgLine key={i} x1={left} y1={y} x2={right} y2={y} stroke={LIGHT} strokeWidth={0.5} />
        );
      })}
      <SvgLine x1={left} y1={top} x2={left} y2={bottom} stroke={BORDER} strokeWidth={0.5} />
      <SvgLine x1={left} y1={bottom} x2={right} y2={bottom} stroke={BORDER} strokeWidth={0.5} />
      <Path d={area} fill={ACCENT_BG2} opacity={0.5} />
      <Path d={line} stroke={BRAND_LIGHT} strokeWidth={1.5} fill="none" />
      {pts.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={2} fill={BRAND_LIGHT} />
      ))}
    </Svg>
  );
}

/** Horizontal stacked bar for summary mode */
function StackedBarSvg({
  data,
  width,
  height,
}: {
  data: CategorySummary[];
  width: number;
  height: number;
}) {
  const total = data.reduce((sum, d) => sum + d.amount, 0);
  if (total === 0) {
    return (
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Rect x={0} y={0} width={width} height={height} rx={3} fill={LIGHT} />
      </Svg>
    );
  }
  let x = 0;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect x={0} y={0} width={width} height={height} rx={3} fill={LIGHT} />
      {data.map((d, i) => {
        const w = (d.amount / total) * width;
        const seg = (
          <Rect
            key={i}
            x={x}
            y={0}
            width={w}
            height={height}
            fill={d.color}
            rx={i === 0 ? 3 : 0}
          />
        );
        x += w;
        return seg;
      })}
    </Svg>
  );
}

// ═══════════════════════════════════════════════════════
// FULL REPORT (multi-page)
// ═══════════════════════════════════════════════════════

function FullReport({ data }: { data: PDFReportData }) {
  const { companyName, dateRange, receipts, taxBracket = 22 } = data;
  const sorted = [...receipts].sort(
    (a, b) => new Date(a.receipt_date).getTime() - new Date(b.receipt_date).getTime(),
  );
  const totalExpenses = sorted.reduce((sum, r) => sum + r.amount, 0);
  const totalTax = sorted.reduce((sum, r) => sum + (r.tax_amount ?? 0), 0);
  const avgExpense = sorted.length > 0 ? totalExpenses / sorted.length : 0;

  const categories = computeCategories(sorted);
  const drivers = computeDrivers(sorted);
  const timeSeries = computeTimeSeries(sorted);

  const grouped = new Map<string, PDFReceipt[]>();
  for (const r of sorted) {
    const arr = grouped.get(r.category) ?? [];
    arr.push(r);
    grouped.set(r.category, arr);
  }

  const dateStr = `${fmtLong(dateRange.start)} — ${fmtLong(dateRange.end)}`;
  const generatedDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const insights: string[] = [];
  if (categories.length > 0) {
    insights.push(
      `${categories[0].label} is the largest expense category at ${(categories[0].pct * 100).toFixed(0)}% of total spending.`,
    );
  }
  if (drivers.length > 0) {
    insights.push(
      `${drivers[0].name} leads spending with ${fmt(drivers[0].total)} across ${drivers[0].count} receipts.`,
    );
  }
  if (sorted.length > 0) {
    insights.push(
      `Average receipt value is ${fmt(avgExpense)} over ${sorted.length} transactions.`,
    );
  }
  if (categories.length > 1) {
    const smallest = categories[categories.length - 1];
    insights.push(
      `${smallest.label} accounts for only ${(smallest.pct * 100).toFixed(1)}% of expenses.`,
    );
  }

  return (
    <Document title={`Expense Report — ${companyName}`} author="FiscalNinja">
      {/* ═══════ COVER ═══════ */}
      <Page size="LETTER" style={s.coverPage}>
        <View style={s.coverBg}>
          {/* Top area */}
          <View>
            <View style={s.coverTopBadge}>
              <Text style={s.coverTopBadgeText}>FiscalNinja Report</Text>
            </View>
            <Text style={s.coverCompany}>{companyName}</Text>
            <Text style={s.coverTitle}>Expense{'\n'}Report</Text>
            <Text style={s.coverSubtitle}>{dateStr}</Text>
          </View>

          {/* Stats */}
          <View style={s.coverStatRow}>
            <View style={s.coverStatBox}>
              <Text style={s.coverStatLabel}>Total Expenses</Text>
              <Text style={s.coverStatValue}>{fmt(totalExpenses)}</Text>
            </View>
            <View style={s.coverStatBox}>
              <Text style={s.coverStatLabel}>Receipts</Text>
              <Text style={s.coverStatValue}>{sorted.length}</Text>
            </View>
            <View style={s.coverStatBox}>
              <Text style={s.coverStatLabel}>Avg / Receipt</Text>
              <Text style={s.coverStatValue}>{fmt(avgExpense)}</Text>
            </View>
          </View>

          {/* Bottom */}
          <View style={s.coverFooter}>
            <Text style={s.coverFooterText}>
              Powered by FiscalNinja • Trucking Expense Management
            </Text>
            <View style={s.coverGenBadge}>
              <Text style={s.coverGenText}>Generated {generatedDate}</Text>
            </View>
          </View>
        </View>
      </Page>

      {/* ═══════ EXECUTIVE SUMMARY ═══════ */}
      <Page size="LETTER" style={s.page}>
        <RunningHeader company={companyName} dateStr={dateStr} />

        <SectionHead title="Executive Summary" />

        {/* KPI cards */}
        <View style={s.kpiRow}>
          <View style={s.kpiCardHighlight}>
            <Text style={s.kpiLabel}>Total Expenses</Text>
            <Text style={[s.kpiValue, { color: BRAND_LIGHT }]}>{fmt(totalExpenses)}</Text>
            <Text style={s.kpiSub}>{sorted.length} receipts</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Average Receipt</Text>
            <Text style={s.kpiValue}>{fmt(avgExpense)}</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Sales Tax Paid</Text>
            <Text style={s.kpiValue}>{fmt(totalTax)}</Text>
          </View>
          <View style={[s.kpiCard, { backgroundColor: GREEN_BG, borderColor: GREEN }]}>
            <Text style={s.kpiLabel}>Est. Tax Savings</Text>
            <Text style={[s.kpiValue, { color: GREEN }]}>
              {fmt((totalExpenses * taxBracket) / 100)}
            </Text>
            <Text style={s.kpiSub}>{taxBracket}% bracket</Text>
          </View>
        </View>

        {/* Top Categories */}
        <SectionHead title="Top Categories" right={`${categories.length} categories`} />
        <View style={s.table}>
          <View style={s.tHead}>
            <Text style={[s.th, { width: '5%' }]}></Text>
            <Text style={[s.th, { width: '30%' }]}>Category</Text>
            <Text style={[s.th, { width: '20%', textAlign: 'right' }]}>Amount</Text>
            <Text style={[s.th, { width: '15%', textAlign: 'right' }]}>Receipts</Text>
            <Text style={[s.th, { width: '15%', textAlign: 'right' }]}>% Total</Text>
            <Text style={[s.th, { width: '15%', textAlign: 'right' }]}>Tax</Text>
          </View>
          {categories.map((cat, i) => (
            <View key={cat.category} style={[s.tRow, i % 2 === 1 ? s.tRowAlt : {}]}>
              <View style={{ width: '5%', justifyContent: 'center' }}>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    backgroundColor: cat.color,
                  }}
                />
              </View>
              <Text style={[s.tdBold, { width: '30%' }]}>{cat.label}</Text>
              <Text style={[s.td, { width: '20%', textAlign: 'right' }]}>
                {fmt(cat.amount)}
              </Text>
              <Text style={[s.td, { width: '15%', textAlign: 'right' }]}>{cat.count}</Text>
              <Text style={[s.td, { width: '15%', textAlign: 'right' }]}>
                {(cat.pct * 100).toFixed(1)}%
              </Text>
              <Text style={[s.td, { width: '15%', textAlign: 'right' }]}>
                {fmt(cat.tax)}
              </Text>
            </View>
          ))}
        </View>

        {/* Driver Performance */}
        <SectionHead title="Driver Performance" right={`${drivers.length} drivers`} />
        <View style={s.table}>
          <View style={s.tHead}>
            <Text style={[s.th, { width: '35%' }]}>Driver</Text>
            <Text style={[s.th, { width: '20%', textAlign: 'right' }]}>Total Spent</Text>
            <Text style={[s.th, { width: '15%', textAlign: 'right' }]}>Receipts</Text>
            <Text style={[s.th, { width: '15%', textAlign: 'right' }]}>Avg / Rcpt</Text>
            <Text style={[s.th, { width: '15%', textAlign: 'right' }]}>% Total</Text>
          </View>
          {drivers.slice(0, 6).map((d, i) => (
            <View key={d.name} style={[s.tRow, i % 2 === 1 ? s.tRowAlt : {}]}>
              <Text style={[s.tdBold, { width: '35%' }]}>{d.name}</Text>
              <Text style={[s.td, { width: '20%', textAlign: 'right' }]}>
                {fmt(d.total)}
              </Text>
              <Text style={[s.td, { width: '15%', textAlign: 'right' }]}>{d.count}</Text>
              <Text style={[s.td, { width: '15%', textAlign: 'right' }]}>
                {fmt(d.avg)}
              </Text>
              <Text style={[s.td, { width: '15%', textAlign: 'right' }]}>
                {totalExpenses > 0
                  ? ((d.total / totalExpenses) * 100).toFixed(1)
                  : '0'}
                %
              </Text>
            </View>
          ))}
        </View>

        {/* Key Insights */}
        <SectionHead title="Key Insights" />
        {insights.map((t, i) => (
          <View key={i} style={s.insightPill}>
            <Text style={s.insightText}>• {t}</Text>
          </View>
        ))}

        <RunningFooter generatedDate={generatedDate} />
      </Page>

      {/* ═══════ DETAILED EXPENSES ═══════ */}
      <Page size="LETTER" style={s.page} wrap>
        <RunningHeader company={companyName} dateStr={dateStr} />

        <SectionHead
          title="Detailed Expenses"
          right={`${sorted.length} receipts — grouped by category`}
        />

        {[...grouped.entries()].map(([cat, items]) => {
          const catTotal = items.reduce((sum, r) => sum + r.amount, 0);
          const catTax = items.reduce((sum, r) => sum + (r.tax_amount ?? 0), 0);

          return (
            <View key={cat} wrap={false} style={{ marginBottom: 14 }}>
              {/* Category ribbon */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 4,
                }}
              >
                <View
                  style={{
                    width: 4,
                    height: 14,
                    borderRadius: 2,
                    backgroundColor: CATEGORY_COLORS[cat] ?? MUTED,
                  }}
                />
                <Text
                  style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: DARK }}
                >
                  {CATEGORY_LABELS[cat] ?? cap(cat)}
                </Text>
                <Text style={{ fontSize: 7, color: MUTED }}>
                  — {items.length} receipt{items.length !== 1 ? 's' : ''} •{' '}
                  {fmt(catTotal)}
                </Text>
              </View>

              {/* Table */}
              <View style={s.tHead}>
                <Text style={[s.th, { width: COL.num }]}>#</Text>
                <Text style={[s.th, { width: COL.date }]}>Date</Text>
                <Text style={[s.th, { width: COL.vendor }]}>Vendor</Text>
                <Text style={[s.th, { width: COL.amount, textAlign: 'right' }]}>
                  Amount
                </Text>
                <Text style={[s.th, { width: COL.tax, textAlign: 'right' }]}>Tax</Text>
                <Text style={[s.th, { width: COL.method }]}>Method</Text>
                <Text style={[s.th, { width: COL.driver }]}>Driver</Text>
              </View>
              {items.map((r, idx) => (
                <View
                  key={r.id}
                  style={[s.tRow, idx % 2 === 1 ? s.tRowAlt : {}]}
                  wrap={false}
                >
                  <Text style={[s.td, { width: COL.num, color: MUTED }]}>
                    {idx + 1}
                  </Text>
                  <Text style={[s.td, { width: COL.date }]}>
                    {fmtDate(r.receipt_date)}
                  </Text>
                  <Text style={[s.td, { width: COL.vendor }]}>
                    {r.vendor.length > 24 ? r.vendor.slice(0, 22) + '…' : r.vendor}
                  </Text>
                  <Text
                    style={[
                      s.td,
                      {
                        width: COL.amount,
                        textAlign: 'right',
                        fontFamily: 'Helvetica-Bold',
                      },
                    ]}
                  >
                    {fmt(r.amount)}
                  </Text>
                  <Text style={[s.td, { width: COL.tax, textAlign: 'right' }]}>
                    {r.tax_amount ? fmt(r.tax_amount) : '—'}
                  </Text>
                  <Text style={[s.td, { width: COL.method }]}>
                    {cap(r.payment_method)}
                  </Text>
                  <Text style={[s.td, { width: COL.driver }]}>
                    {r.driver_name ?? '—'}
                  </Text>
                </View>
              ))}
              {/* Subtotal */}
              <View style={s.subtotalRow}>
                <Text style={[s.tdBold, { width: '48%' }]}>
                  Subtotal — {CATEGORY_LABELS[cat] ?? cap(cat)}
                </Text>
                <Text style={[s.tdBold, { width: '26%', textAlign: 'right' }]}>
                  {fmt(catTotal)}
                </Text>
                <Text style={[s.tdBold, { width: '26%', textAlign: 'right' }]}>
                  Tax: {fmt(catTax)}
                </Text>
              </View>
            </View>
          );
        })}

        {/* Grand Total */}
        <View style={s.grandRow}>
          <Text style={[s.grandText, { width: '48%' }]}>GRAND TOTAL</Text>
          <Text style={[s.grandText, { width: '26%', textAlign: 'right' }]}>
            {fmt(totalExpenses)}
          </Text>
          <Text style={[s.grandText, { width: '26%', textAlign: 'right' }]}>
            Tax: {fmt(totalTax)}
          </Text>
        </View>

        <RunningFooter generatedDate={generatedDate} />
      </Page>

      {/* ═══════ VISUAL ANALYTICS ═══════ */}
      <Page size="LETTER" style={s.page}>
        <RunningHeader company={companyName} dateStr={dateStr} />

        <SectionHead title="Visual Analytics" />

        {/* Pie + legend */}
        <View
          style={[
            s.chartBox,
            { flexDirection: 'row', alignItems: 'center', gap: 24 },
          ]}
        >
          <View>
            <Text style={s.chartLabel}>Category Breakdown</Text>
            <PieChartSvg data={categories} size={140} />
          </View>
          <View style={{ gap: 8, flex: 1 }}>
            {categories.map((cat) => (
              <View
                key={cat.category}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    backgroundColor: cat.color,
                  }}
                />
                <Text
                  style={{
                    fontSize: 8,
                    fontFamily: 'Helvetica-Bold',
                    color: DARK,
                    width: 75,
                  }}
                >
                  {cat.label}
                </Text>
                <Text style={{ fontSize: 8, color: TEXT_COLOR }}>{fmt(cat.amount)}</Text>
                <Text style={{ fontSize: 7, color: MUTED, marginLeft: 4 }}>
                  ({(cat.pct * 100).toFixed(1)}%)
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Spending over time */}
        {timeSeries.length >= 2 && (
          <View style={s.chartBox}>
            <Text style={s.chartLabel}>Spending Over Time</Text>
            <LineChartSvg data={timeSeries} width={500} height={130} />
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginTop: 2,
              }}
            >
              <Text style={{ fontSize: 6, color: MUTED }}>
                {timeSeries[0].label}
              </Text>
              <Text style={{ fontSize: 6, color: MUTED }}>
                {timeSeries[timeSeries.length - 1].label}
              </Text>
            </View>
          </View>
        )}

        {/* Driver bar chart */}
        {drivers.length > 0 && (
          <View
            style={[
              s.chartBox,
              { flexDirection: 'row', alignItems: 'flex-end', gap: 20 },
            ]}
          >
            <View>
              <Text style={s.chartLabel}>Spending by Driver</Text>
              <BarChartSvg
                data={drivers.slice(0, 8).map((d) => ({ name: d.name, value: d.total }))}
                width={280}
                height={130}
              />
            </View>
            <View style={{ gap: 5, flex: 1, marginBottom: 18 }}>
              {drivers.slice(0, 8).map((d) => (
                <View
                  key={d.name}
                  style={{
                    flexDirection: 'row',
                    gap: 4,
                    alignItems: 'center',
                  }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      backgroundColor: BRAND_LIGHT,
                    }}
                  />
                  <Text style={{ fontSize: 7, color: DARK, flex: 1 }}>{d.name}</Text>
                  <Text
                    style={{
                      fontSize: 7,
                      fontFamily: 'Helvetica-Bold',
                      color: TEXT_COLOR,
                    }}
                  >
                    {fmt(d.total)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <RunningFooter generatedDate={generatedDate} />
      </Page>

      {/* ═══════ TAX DEDUCTION SUMMARY ═══════ */}
      <Page size="LETTER" style={s.page}>
        <RunningHeader company={companyName} dateStr={dateStr} />

        <SectionHead
          title="Tax Deduction Summary"
          right={`IRS Schedule C • Tax Year ${dateRange.start.getFullYear()}`}
        />

        {/* KPI */}
        <View style={s.kpiRow}>
          <View style={s.kpiCardHighlight}>
            <Text style={s.kpiLabel}>Total Deductible</Text>
            <Text style={[s.kpiValue, { color: BRAND_LIGHT }]}>
              {fmt(totalExpenses)}
            </Text>
          </View>
          <View
            style={[s.kpiCard, { backgroundColor: GREEN_BG, borderColor: GREEN }]}
          >
            <Text style={s.kpiLabel}>Est. Tax Savings ({taxBracket}%)</Text>
            <Text style={[s.kpiValue, { color: GREEN }]}>
              {fmt((totalExpenses * taxBracket) / 100)}
            </Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Sales Tax Paid</Text>
            <Text style={s.kpiValue}>{fmt(totalTax)}</Text>
          </View>
        </View>

        {/* IRS breakdown table */}
        <SectionHead title="Deductions by IRS Schedule C Line" />
        <View style={s.table}>
          <View style={s.tHead}>
            <Text style={[s.th, { width: '36%' }]}>Schedule C Line</Text>
            <Text style={[s.th, { width: '18%' }]}>Category</Text>
            <Text style={[s.th, { width: '10%', textAlign: 'right' }]}>Count</Text>
            <Text style={[s.th, { width: '18%', textAlign: 'right' }]}>Expense</Text>
            <Text style={[s.th, { width: '18%', textAlign: 'right' }]}>Tax Paid</Text>
          </View>
          {categories.map((cat, i) => (
            <View
              key={cat.category}
              style={[s.tRow, i % 2 === 1 ? s.tRowAlt : {}]}
            >
              <Text style={[s.td, { width: '36%' }]}>
                {IRS_LINES[cat.category] ?? 'Line 27a — Other'}
              </Text>
              <Text style={[s.tdBold, { width: '18%' }]}>{cat.label}</Text>
              <Text style={[s.td, { width: '10%', textAlign: 'right' }]}>
                {cat.count}
              </Text>
              <Text style={[s.td, { width: '18%', textAlign: 'right' }]}>
                {fmt(cat.amount)}
              </Text>
              <Text style={[s.td, { width: '18%', textAlign: 'right' }]}>
                {fmt(cat.tax)}
              </Text>
            </View>
          ))}
          <View style={s.grandRow}>
            <Text style={[s.grandText, { width: '54%' }]}>TOTAL DEDUCTIBLE</Text>
            <Text style={[s.grandText, { width: '10%', textAlign: 'right' }]}>
              {sorted.length}
            </Text>
            <Text style={[s.grandText, { width: '18%', textAlign: 'right' }]}>
              {fmt(totalExpenses)}
            </Text>
            <Text style={[s.grandText, { width: '18%', textAlign: 'right' }]}>
              {fmt(totalTax)}
            </Text>
          </View>
        </View>

        {/* Savings highlight */}
        <View style={s.taxCard}>
          <View>
            <Text style={s.taxLabel}>Estimated Tax Savings</Text>
            <Text style={{ fontSize: 7, color: GREEN, marginTop: 2 }}>
              Based on {taxBracket}% marginal tax bracket
            </Text>
          </View>
          <Text style={s.taxValue}>
            {fmt((totalExpenses * taxBracket) / 100)}
          </Text>
        </View>

        {/* Disclaimer */}
        <View style={s.disclaimer}>
          <Text style={s.disclaimerTitle}>Disclaimer</Text>
          <Text style={s.disclaimerBody}>
            This report is for informational purposes only and does not constitute
            tax advice. All amounts are in USD. Please consult a qualified tax
            professional for guidance on your specific tax situation. Generated on{' '}
            {generatedDate}.
          </Text>
        </View>

        <RunningFooter generatedDate={generatedDate} />
      </Page>
    </Document>
  );
}

// ═══════════════════════════════════════════════════════
// SUMMARY REPORT (1-page)
// ═══════════════════════════════════════════════════════

function SummaryReport({ data }: { data: PDFReportData }) {
  const { companyName, dateRange, receipts, taxBracket = 22 } = data;
  const sorted = [...receipts].sort(
    (a, b) => new Date(a.receipt_date).getTime() - new Date(b.receipt_date).getTime(),
  );
  const totalExpenses = sorted.reduce((sum, r) => sum + r.amount, 0);
  const totalTax = sorted.reduce((sum, r) => sum + (r.tax_amount ?? 0), 0);
  const avgExpense = sorted.length > 0 ? totalExpenses / sorted.length : 0;
  const savings = (totalExpenses * taxBracket) / 100;

  const categories = computeCategories(sorted);
  const drivers = computeDrivers(sorted);

  const dateStr = `${fmtLong(dateRange.start)} — ${fmtLong(dateRange.end)}`;
  const generatedDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Top receipts — highest amounts (limit to 8 for single-page fit)
  const topReceipts = [...sorted].sort((a, b) => b.amount - a.amount).slice(0, 8);

  return (
    <Document title={`Expense Summary — ${companyName}`} author="FiscalNinja">
      <Page size="LETTER" style={s.sumPage}>
        {/* ── Header strip ── */}
        <View style={s.sumHeader}>
          <View>
            <Text style={s.sumCompany}>{companyName}</Text>
            <Text style={s.sumTitle}>Expense Summary</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.sumDate}>{dateStr}</Text>
            <Text style={[s.sumDate, { marginTop: 2, fontSize: 6 }]}>
              Generated {generatedDate}
            </Text>
          </View>
        </View>

        {/* ── KPIs ── */}
        <View style={s.sumKpiRow}>
          <View
            style={[s.sumKpi, { backgroundColor: ACCENT_BG, borderColor: ACCENT }]}
          >
            <Text style={s.sumKpiLabel}>Total Expenses</Text>
            <Text style={[s.sumKpiValue, { color: BRAND_LIGHT }]}>
              {fmt(totalExpenses)}
            </Text>
          </View>
          <View style={s.sumKpi}>
            <Text style={s.sumKpiLabel}>Receipts</Text>
            <Text style={s.sumKpiValue}>{sorted.length}</Text>
          </View>
          <View style={s.sumKpi}>
            <Text style={s.sumKpiLabel}>Avg / Receipt</Text>
            <Text style={s.sumKpiValue}>{fmt(avgExpense)}</Text>
          </View>
          <View style={s.sumKpi}>
            <Text style={s.sumKpiLabel}>Tax Paid</Text>
            <Text style={s.sumKpiValue}>{fmt(totalTax)}</Text>
          </View>
          <View
            style={[s.sumKpi, { backgroundColor: GREEN_BG, borderColor: GREEN }]}
          >
            <Text style={s.sumKpiLabel}>Est. Savings ({taxBracket}%)</Text>
            <Text style={[s.sumKpiValue, { color: GREEN }]}>{fmt(savings)}</Text>
          </View>
        </View>

        {/* ── Two-column: Pie+legend | Drivers + Tax ── */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
          {/* Left — Pie */}
          <View style={{ width: '42%' }}>
            <Text style={s.sumSection}>Category Breakdown</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <PieChartSvg data={categories} size={80} />
              <View style={{ gap: 3, flex: 1 }}>
                {categories.map((cat) => (
                  <View
                    key={cat.category}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 1,
                        backgroundColor: cat.color,
                      }}
                    />
                    <Text style={{ fontSize: 6, color: DARK, width: 48 }}>
                      {cat.label}
                    </Text>
                    <Text style={{ fontSize: 6, color: MUTED }}>
                      {fmtK(cat.amount)}
                    </Text>
                    <Text style={{ fontSize: 5, color: MUTED }}>
                      {' '}
                      ({(cat.pct * 100).toFixed(0)}%)
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Stacked bar */}
            <View style={{ marginTop: 6 }}>
              <StackedBarSvg data={categories} width={200} height={10} />
            </View>
          </View>

          {/* Right — Drivers + Tax */}
          <View style={{ width: '58%' }}>
            <Text style={s.sumSection}>Driver Spending</Text>
            <View style={{ gap: 2 }}>
              {drivers.slice(0, 5).map((d, i) => {
                const pct =
                  totalExpenses > 0 ? (d.total / totalExpenses) * 100 : 0;
                const barW = 80;
                const fillW = Math.max((pct / 100) * barW, 1.5);
                return (
                  <View
                    key={d.name}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      paddingVertical: 1.5,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 6,
                        color: MUTED,
                        width: 10,
                        textAlign: 'right',
                      }}
                    >
                      {i + 1}.
                    </Text>
                    <Text
                      style={{
                        fontSize: 6.5,
                        fontFamily: 'Helvetica-Bold',
                        color: DARK,
                        width: 70,
                      }}
                    >
                      {d.name}
                    </Text>
                    <Svg width={barW} height={6} viewBox={`0 0 ${barW} 6`}>
                      <Rect x={0} y={0} width={barW} height={6} rx={3} fill={LIGHT} />
                      <Rect x={0} y={0} width={fillW} height={6} rx={3} fill={BRAND_LIGHT} />
                    </Svg>
                    <Text
                      style={{
                        fontSize: 6,
                        fontFamily: 'Helvetica-Bold',
                        color: TEXT_COLOR,
                        width: 42,
                        textAlign: 'right',
                      }}
                    >
                      {fmt(d.total)}
                    </Text>
                    <Text
                      style={{
                        fontSize: 5,
                        color: MUTED,
                        width: 24,
                        textAlign: 'right',
                      }}
                    >
                      {d.count} rcpt
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Mini IRS summary */}
            <Text style={[s.sumSection, { marginTop: 6 }]}>
              Tax Deductions (IRS Sch. C)
            </Text>
            {categories.slice(0, 4).map((cat) => (
              <View
                key={cat.category}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingVertical: 1.5,
                  borderBottomWidth: 0.3,
                  borderBottomColor: BORDER,
                }}
              >
                <Text style={{ fontSize: 6, color: MUTED }}>
                  {IRS_LINES[cat.category] ?? 'Line 27a'}
                </Text>
                <Text
                  style={{
                    fontSize: 6,
                    fontFamily: 'Helvetica-Bold',
                    color: DARK,
                  }}
                >
                  {fmt(cat.amount)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Top Receipts Table ── */}
        <Text style={s.sumSection}>
          Top {Math.min(topReceipts.length, 10)} Receipts by Amount
        </Text>
        <View>
          <View style={[s.tHead, { paddingVertical: 3, paddingHorizontal: 4 }]}>
            <Text style={[s.sumTh, { width: COL_SUM.date }]}>Date</Text>
            <Text style={[s.sumTh, { width: COL_SUM.vendor }]}>Vendor</Text>
            <Text style={[s.sumTh, { width: COL_SUM.cat }]}>Category</Text>
            <Text
              style={[s.sumTh, { width: COL_SUM.amount, textAlign: 'right' }]}
            >
              Amount
            </Text>
            <Text style={[s.sumTh, { width: COL_SUM.driver }]}>Driver</Text>
            <Text style={[s.sumTh, { width: COL_SUM.method }]}>Method</Text>
          </View>
          {topReceipts.map((r, i) => (
            <View
              key={r.id}
              style={[
                s.tRow,
                { paddingVertical: 2.5, paddingHorizontal: 4 },
                i % 2 === 1 ? s.tRowAlt : {},
              ]}
            >
              <Text style={[s.sumTd, { width: COL_SUM.date }]}>
                {fmtDateShort(r.receipt_date)}
              </Text>
              <Text style={[s.sumTd, { width: COL_SUM.vendor }]}>
                {r.vendor.length > 26 ? r.vendor.slice(0, 24) + '…' : r.vendor}
              </Text>
              <Text style={[s.sumTd, { width: COL_SUM.cat }]}>
                {CATEGORY_LABELS[r.category] ?? cap(r.category)}
              </Text>
              <Text
                style={[
                  s.sumTdBold,
                  { width: COL_SUM.amount, textAlign: 'right' },
                ]}
              >
                {fmt(r.amount)}
              </Text>
              <Text style={[s.sumTd, { width: COL_SUM.driver }]}>
                {r.driver_name ?? '—'}
              </Text>
              <Text style={[s.sumTd, { width: COL_SUM.method }]}>
                {cap(r.payment_method)}
              </Text>
            </View>
          ))}
          {/* Total row */}
          <View
            style={{
              flexDirection: 'row',
              paddingVertical: 3,
              paddingHorizontal: 4,
              backgroundColor: BRAND,
              borderRadius: 4,
              marginTop: 4,
            }}
          >
            <Text style={[s.grandText, { fontSize: 7, width: '60%' }]}>
              TOTAL — ALL {sorted.length} RECEIPTS
            </Text>
            <Text
              style={[
                s.grandText,
                { fontSize: 7, width: '40%', textAlign: 'right' },
              ]}
            >
              {fmt(totalExpenses)}
            </Text>
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={s.sumFooter}>
          <Text style={s.sumFooterText}>{companyName} • Expense Summary</Text>
          <Text style={s.sumFooterText}>
            Generated {generatedDate} • FiscalNinja
          </Text>
        </View>
      </Page>
    </Document>
  );
}

// ═══════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════

/**
 * Generate a professional PDF expense report.
 *
 * @param data - Report data including receipts, company name, date range
 * @param data.mode - "full" for multi-page detailed report, "summary" for 1-page overview
 * @returns Blob of the generated PDF
 */
export async function generatePDFReport(
  data: PDFReportData,
): Promise<Blob> {
  if (!data.receipts || data.receipts.length === 0) {
    throw new Error('No receipts to generate report.');
  }

  const mode = data.mode ?? 'full';

  // Sanitise receipts — guard against null fields from the database
  const safeReceipts: PDFReceipt[] = data.receipts.map((r) => ({
    ...r,
    vendor: r.vendor ?? 'Unknown Vendor',
    category: r.category ?? 'other',
    payment_method: r.payment_method ?? 'unknown',
    receipt_date: r.receipt_date ?? new Date().toISOString(),
    amount: typeof r.amount === 'number' && !isNaN(r.amount) ? r.amount : 0,
    tax_amount: typeof r.tax_amount === 'number' && !isNaN(r.tax_amount) ? r.tax_amount : null,
  }));

  const safeData: PDFReportData = { ...data, receipts: safeReceipts };

  try {
    const doc =
      mode === 'summary' ? (
        <SummaryReport data={safeData} />
      ) : (
        <FullReport data={safeData} />
      );
    const blob = await pdf(doc).toBlob();
    return blob;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : '';
    console.error(`[PDF] ${mode} report render failed:`, msg, '\n', stack);
    throw new Error(
      `PDF generation failed (${mode} mode): ${msg}`,
    );
  }
}

/**
 * Generate and immediately trigger a browser download for the PDF.
 */
export async function downloadPDFReport(data: PDFReportData): Promise<void> {
  const blob = await generatePDFReport(data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;

  const mode = data.mode ?? 'full';
  const startStr = data.dateRange.start.toISOString().split('T')[0];
  const endStr = data.dateRange.end.toISOString().split('T')[0];
  a.download = `expense-${mode === 'summary' ? 'summary' : 'report'}-${startStr}-to-${endStr}.pdf`;

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
