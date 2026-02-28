/* =====================================================
 * Receipt Processing — Gemini AI
 * src/lib/ocr/vision.ts
 *
 * Uses Gemini 2.0 Flash (free tier: ~1,500 req/day)
 * to read receipt images and extract structured data.
 *
 * Setup: get a free API key at https://aistudio.google.com/apikey
 *
 * Public functions:
 *   1. processReceipt(imageBuffer, mimeType)
 *   2. processReceiptFromBase64(base64, mimeType)
 *   3. validateReceiptImage(file)
 * ===================================================== */

import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  ReceiptData,
  GeminiReceiptResponse,
  ValidationResult,
  GeminiOcrConfig,
  DEFAULT_GEMINI_CONFIG,
} from './types';

// ─── Gemini client (lazy init) ───────────────────────

let _genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!_genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'Missing GEMINI_API_KEY env var. Get a free key at https://aistudio.google.com/apikey'
      );
    }
    _genAI = new GoogleGenerativeAI(apiKey);
  }
  return _genAI;
}

// ─── Prompt ──────────────────────────────────────────

const RECEIPT_PROMPT = `You are an expert receipt analyzer for a trucking company expense tracker called FiscalNinja.

Analyze the receipt image and extract ALL information. Return ONLY a valid JSON object (no markdown, no code fences, no explanation).

JSON schema:
{
  "vendor": "string — store/merchant name",
  "total": number — final total amount paid (use 0 if not found),
  "date": "string — date in YYYY-MM-DD format (use today's date if not found)",
  "taxAmount": number | null — tax amount if shown,
  "subtotal": number | null — subtotal before tax if shown,
  "category": "fuel" | "tolls" | "maintenance" | "insurance" | "other",
  "paymentMethod": "cash" | "credit" | "debit" | "company_card" | "other",
  "lineItems": [{"description": "string", "quantity": number, "unitPrice": number, "total": number}],
  "rawText": "string — full text you can read on the receipt",
  "confidence": number — your confidence 0-100 that the extracted data is correct
}

Category detection rules:
- "fuel" → gas stations, diesel, fuel purchases
- "tolls" → toll booths, E-ZPass, highway tolls
- "maintenance" → oil change, tires, parts, repairs, car wash
- "insurance" → insurance payments
- "other" → everything else

Payment method detection:
- Look for "VISA", "MASTERCARD", "AMEX", "DEBIT" → credit/debit
- Look for "CASH", "CHANGE" → cash
- Default to "other" if unclear

Be precise with amounts. Use period (.) for decimals. Do not include currency symbols in numbers.
If the image is not a receipt, set confidence to 0 and vendor to "Not a receipt".`;

// ─── 1. processReceipt ──────────────────────────────

/**
 * Process a receipt image buffer with Gemini AI.
 * Returns structured receipt data with confidence scoring.
 *
 * @param imageBuffer - Raw image bytes
 * @param mimeType    - e.g. "image/jpeg", "image/png"
 * @param config      - Optional config overrides
 */
export async function processReceipt(
  imageBuffer: Buffer,
  mimeType: string = 'image/jpeg',
  config: Partial<GeminiOcrConfig> = {}
): Promise<ReceiptData> {
  const base64 = imageBuffer.toString('base64');
  return processReceiptFromBase64(base64, mimeType, config);
}

// ─── 2. processReceiptFromBase64 ─────────────────────

/**
 * Process a receipt from a base64-encoded image string.
 * Useful when image is already base64 (e.g. from a client upload).
 */
export async function processReceiptFromBase64(
  base64Data: string,
  mimeType: string = 'image/jpeg',
  config: Partial<GeminiOcrConfig> = {}
): Promise<ReceiptData> {
  const cfg = { ...DEFAULT_GEMINI_CONFIG, ...config };
  const genAI = getGenAI();

  // Build list of models to try: primary + fallbacks
  const modelsToTry = [cfg.model, ...cfg.fallbackModels];
  let lastError: Error | null = null;

  for (const modelName of modelsToTry) {
    const model = genAI.getGenerativeModel({ model: modelName });

    for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
      try {
        console.debug(`[Gemini] Trying model "${modelName}" (attempt ${attempt + 1})...`);

        const result = await model.generateContent([
          RECEIPT_PROMPT,
          {
            inlineData: {
              data: base64Data,
              mimeType,
            },
          },
        ]);

        const response = result.response;
        const text = response.text();

        // Parse JSON — Gemini might wrap it in ```json ... ```
        const jsonStr = text
          .replace(/```json\s*/gi, '')
          .replace(/```\s*/g, '')
          .trim();

        const parsed: GeminiReceiptResponse = JSON.parse(jsonStr);

        // Validate the category and payment method
        const validCategories = ['fuel', 'tolls', 'maintenance', 'insurance', 'other'] as const;
        const validPayments = ['cash', 'credit', 'debit', 'company_card', 'other'] as const;

        const category = validCategories.includes(parsed.category as any)
          ? (parsed.category as ReceiptData['category'])
          : 'other';

        const paymentMethod = validPayments.includes(parsed.paymentMethod as any)
          ? (parsed.paymentMethod as ReceiptData['paymentMethod'])
          : 'other';

        const confidence = Math.max(0, Math.min(100, parsed.confidence ?? 0));

        console.debug(`[Gemini] Success with model "${modelName}"`);

        return {
          vendor: parsed.vendor || 'Unknown Vendor',
          total: typeof parsed.total === 'number' ? parsed.total : 0,
          date: parsed.date || new Date().toISOString().split('T')[0],
          taxAmount: typeof parsed.taxAmount === 'number' ? parsed.taxAmount : null,
          category,
          paymentMethod,
          lineItems: Array.isArray(parsed.lineItems) ? parsed.lineItems : [],
          rawText: parsed.rawText || '',
          confidence,
          needsReview: confidence < cfg.reviewThreshold,
        };
      } catch (err: any) {
        lastError = err;

        const status = err?.status ?? err?.httpStatusCode;
        const isRateLimit = status === 429;
        const isRetryable = isRateLimit || status === 503 || status === 500;

        // On 429 with quota exhausted (limit: 0), skip retries and move to next model
        if (isRateLimit && isQuotaExhausted(err)) {
          console.warn(
            `[Gemini] Model "${modelName}" quota exhausted, trying next model...`
          );
          break; // break inner retry loop → try next model
        }

        if (!isRetryable || attempt === cfg.maxRetries) break;

        // Use server-suggested retry delay if available, otherwise exponential backoff
        const serverDelay = parseRetryDelay(err);
        const delay = serverDelay ?? cfg.retryDelayMs * Math.pow(2, attempt);
        console.warn(
          `[Gemini] Attempt ${attempt + 1} failed (${status}), retrying in ${delay}ms...`
        );
        await sleep(delay);
      }
    }
  }

  console.error(`[Gemini] All models failed. Last error: ${lastError?.message}`);

  // Fallback: return empty data flagged for manual review
  return {
    vendor: 'Unknown Vendor',
    total: 0,
    date: new Date().toISOString().split('T')[0],
    taxAmount: null,
    category: 'other',
    paymentMethod: 'other',
    lineItems: [],
    rawText: '',
    confidence: 0,
    needsReview: true,
  };
}

// ─── 3. validateReceiptImage ─────────────────────────

/**
 * Pre-flight validation for a File object before upload.
 * Checks file size and MIME type.
 */
export function validateReceiptImage(
  file: { size: number; type: string },
  config: Partial<GeminiOcrConfig> = {}
): ValidationResult {
  const cfg = { ...DEFAULT_GEMINI_CONFIG, ...config };
  const errors: string[] = [];

  if (file.size > cfg.maxFileSizeBytes) {
    const maxMb = (cfg.maxFileSizeBytes / 1024 / 1024).toFixed(0);
    errors.push(`File exceeds the ${maxMb} MB limit.`);
  }

  if (!cfg.allowedMimeTypes.includes(file.type)) {
    errors.push(
      `Unsupported file type "${file.type}". Allowed: JPEG, PNG, WebP, PDF.`
    );
  }

  return { valid: errors.length === 0, errors };
}

// ─── Utility ─────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Check whether a 429 error indicates the quota is fully exhausted (limit: 0). */
function isQuotaExhausted(err: any): boolean {
  const msg = err?.message ?? err?.errorDetails?.toString() ?? '';
  return msg.includes('limit: 0') || msg.includes('quota');
}

/** Try to extract the server-suggested retry delay (in ms) from a 429 error. */
function parseRetryDelay(err: any): number | null {
  try {
    const msg = err?.message ?? '';
    // Match patterns like "retryDelay":"22s" or "Please retry in 22.2s"
    const match = msg.match(/retry.*?(\d+\.?\d*)\s*s/i);
    if (match) return Math.ceil(parseFloat(match[1]) * 1000);
  } catch {}
  return null;
}
