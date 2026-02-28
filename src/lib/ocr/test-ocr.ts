/* =====================================================
 * Gemini AI Receipt Test — FiscalNinja
 * src/lib/ocr/test-ocr.ts
 *
 * Usage:
 *   npx tsx src/lib/ocr/test-ocr.ts [path-to-image]
 *
 * Defaults to /public/test-receipt.jpg if no arg given.
 * Requires GEMINI_API_KEY in .env.local
 * ===================================================== */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env vars from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { processReceipt } from './vision';

const DIVIDER = '─'.repeat(50);

async function main() {
  const imagePath =
    process.argv[2] ??
    path.resolve(process.cwd(), 'public', 'test-receipt.jpg');

  console.log(DIVIDER);
  console.log('FiscalNinja — Gemini AI Receipt Test');
  console.log(DIVIDER);

  // Check API key
  if (!process.env.GEMINI_API_KEY) {
    console.error(`
❌  GEMINI_API_KEY not found in .env.local

To fix this:
  1. Go to https://aistudio.google.com/apikey
  2. Click "Create API Key" (it's free)
  3. Add to your .env.local:
     GEMINI_API_KEY=your_key_here
`);
    process.exit(1);
  }
  console.log('✅  GEMINI_API_KEY found');

  // Read image
  console.log(`\nImage : ${imagePath}`);
  if (!fs.existsSync(imagePath)) {
    console.error(
      `\n❌  File not found: ${imagePath}\n` +
        'Place a receipt image at public/test-receipt.jpg or pass a path as argument.\n'
    );
    process.exit(1);
  }

  const raw = fs.readFileSync(imagePath);
  const sizeMb = (raw.byteLength / 1024 / 1024).toFixed(2);
  console.log(`Size  : ${sizeMb} MB (${raw.byteLength.toLocaleString()} bytes)`);

  // Detect MIME type from extension
  const ext = path.extname(imagePath).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
  };
  const mimeType = mimeMap[ext] ?? 'image/jpeg';
  console.log(`Type  : ${mimeType}`);

  // Process with Gemini
  console.log('\n🤖  Sending to Gemini AI...');
  const start = performance.now();
  const result = await processReceipt(raw, mimeType);
  const elapsed = ((performance.now() - start) / 1000).toFixed(2);
  console.log(`   Done in ${elapsed}s`);

  // Results
  console.log('\n' + DIVIDER);
  console.log('EXTRACTED DATA');
  console.log(DIVIDER);
  console.log(`Vendor      : ${result.vendor}`);
  console.log(`Total       : $${result.total.toFixed(2)}`);
  console.log(`Date        : ${result.date}`);
  console.log(`Tax         : ${result.taxAmount !== null ? '$' + result.taxAmount.toFixed(2) : '—'}`);
  console.log(`Category    : ${result.category}`);
  console.log(`Payment     : ${result.paymentMethod}`);
  console.log(`Confidence  : ${result.confidence}%`);
  console.log(`Needs Review: ${result.needsReview ? 'YES ⚠️' : 'NO ✅'}`);

  if (result.lineItems.length > 0) {
    console.log(`\nLine Items (${result.lineItems.length}):`);
    for (const item of result.lineItems) {
      console.log(`  • ${item.description} — $${item.total.toFixed(2)}`);
    }
  }

  console.log('\n' + DIVIDER);
  console.log('RAW TEXT (first 500 chars)');
  console.log(DIVIDER);
  console.log(result.rawText.slice(0, 500) || '(empty)');

  // Assertions
  console.log('\n' + DIVIDER);
  console.log('VALIDATION');
  console.log(DIVIDER);

  const checks = [
    { label: 'Vendor extracted', pass: result.vendor !== 'Unknown Vendor' },
    { label: 'Total > $0', pass: result.total > 0 },
    { label: 'Date is valid', pass: /^\d{4}-\d{2}-\d{2}$/.test(result.date) },
    { label: 'Category detected', pass: result.category !== 'other' || result.confidence >= 50 },
    { label: 'Confidence ≥ 50%', pass: result.confidence >= 50 },
    { label: 'Raw text non-empty', pass: result.rawText.length > 0 },
  ];

  let allPassed = true;
  for (const c of checks) {
    const icon = c.pass ? '✅' : '❌';
    console.log(`  ${icon}  ${c.label}`);
    if (!c.pass) allPassed = false;
  }

  console.log(
    allPassed
      ? '\n🎉  All checks passed!'
      : '\n⚠️  Some checks failed — receipt may need manual review.'
  );

  console.log('\n' + DIVIDER);
  console.log('Done.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
