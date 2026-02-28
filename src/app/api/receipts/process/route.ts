/* =====================================================
 * POST /api/receipts/process
 *
 * Accepts a receipt image (multipart/form-data),
 * sends it to Gemini AI for extraction, and returns
 * the structured data for the user to review/edit
 * before saving.
 *
 * Does NOT write to the database — the client handles
 * saving after user confirmation.
 * ===================================================== */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { processReceipt } from '@/lib/ocr/vision';
import { getCurrentUser, hasPermission, effectiveOwnerId } from '@/lib/auth/rbac';

export const maxDuration = 30; // Vercel function timeout

export async function POST(req: NextRequest) {
  try {
    // ── Auth + RBAC ──────────────────────────────────
    const rbacUser = await getCurrentUser();

    if (!rbacUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(rbacUser, 'receipts.upload')) {
      return NextResponse.json(
        { error: 'Forbidden — you do not have permission to upload receipts.' },
        { status: 403 },
      );
    }

    // We still need a Supabase client for any DB work, so create one
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    // Effective owner for data ownership
    const ownerId = effectiveOwnerId(rbacUser);

    // ── Parse multipart form ─────────────────────────
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, WebP, PDF.' },
        { status: 400 }
      );
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Max 10 MB.' },
        { status: 400 }
      );
    }

    // ── Process with Gemini AI ───────────────────────
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const result = await processReceipt(buffer, file.type);

    return NextResponse.json({
      success: true,
      extraction: {
        vendor: result.vendor,
        total: result.total,
        date: result.date,
        taxAmount: result.taxAmount,
        category: result.category,
        paymentMethod: result.paymentMethod,
        lineItems: result.lineItems,
        rawText: result.rawText,
        confidence: result.confidence,
        needsReview: result.needsReview,
      },
    });
  } catch (err: any) {
    console.error('[Process Receipt]', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
