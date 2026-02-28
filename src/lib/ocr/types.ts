/* =====================================================
 * OCR Types — FiscalNinja (Gemini AI)
 * ===================================================== */

/** Structured data extracted from a receipt image by Gemini. */
export interface ReceiptData {
  /** Vendor / merchant name. */
  vendor: string;
  /** Total amount in dollars. */
  total: number;
  /** Transaction date as ISO string (YYYY-MM-DD). */
  date: string;
  /** Tax amount if found on the receipt. */
  taxAmount: number | null;
  /** Auto-detected category. */
  category: 'fuel' | 'tolls' | 'maintenance' | 'insurance' | 'other';
  /** Payment method detected on the receipt. */
  paymentMethod: 'cash' | 'credit' | 'debit' | 'company_card' | 'other';
  /** Line items if readable. */
  lineItems: LineItem[];
  /** The full raw text Gemini read from the receipt. */
  rawText: string;
  /** Confidence score 0‒100 from Gemini's own assessment. */
  confidence: number;
  /** `true` when confidence < 80 — flagged for manual review. */
  needsReview: boolean;
}

/** A single line item from the receipt. */
export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

/** Result of client‐side image validation before upload. */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/** Gemini response JSON shape we request. */
export interface GeminiReceiptResponse {
  vendor: string;
  total: number;
  date: string;
  taxAmount: number | null;
  subtotal: number | null;
  category: string;
  paymentMethod: string;
  lineItems: LineItem[];
  rawText: string;
  confidence: number;
}

/** Configuration for the Gemini receipt processor. */
export interface GeminiOcrConfig {
  /** Primary Gemini model to use. */
  model: string;
  /** Fallback models tried in order when the primary is rate-limited. */
  fallbackModels: string[];
  /** Confidence threshold below which needsReview = true. */
  reviewThreshold: number;
  /** Max retries per model for transient failures. */
  maxRetries: number;
  /** Base retry delay in ms (doubled each retry). */
  retryDelayMs: number;
  /** Max file size in bytes. */
  maxFileSizeBytes: number;
  /** Accepted MIME types. */
  allowedMimeTypes: string[];
}

export const DEFAULT_GEMINI_CONFIG: GeminiOcrConfig = {
  model: 'gemini-2.5-flash-lite',
  fallbackModels: ['gemini-2.5-flash', 'gemini-3.0-flash-preview'],
  reviewThreshold: 80,
  maxRetries: 2,
  retryDelayMs: 500,
  maxFileSizeBytes: 10 * 1024 * 1024, // 10 MB
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
  ],
};
