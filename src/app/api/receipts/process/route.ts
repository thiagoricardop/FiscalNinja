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
import { processReceipt } from '@/lib/ocr/vision';
import { getCurrentUser, hasPermission, effectiveOwnerId } from '@/lib/auth/rbac';
import { TIER_RECEIPT_LIMIT, type SubscriptionTier } from '@/lib/payments/stripe';
import { supabaseAdmin } from '@/lib/supabase/admin';

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

    // Effective owner for data ownership
    const ownerId = effectiveOwnerId(rbacUser);

    // ── Usage limit check (server-side) ──────────────
    const { data: ownerProfile } = await supabaseAdmin
      .from('profiles')
      .select('subscription_tier')
      .eq('id', ownerId)
      .single();

    const tier = (ownerProfile?.subscription_tier ?? 'solo') as SubscriptionTier;
    const limit = TIER_RECEIPT_LIMIT[tier] ?? 200;

    if (limit !== -1) {
      const now = new Date();
      const startOfMonth = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
      ).toISOString();

      const { count } = await supabaseAdmin
        .from('receipts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', ownerId)
        .gte('created_at', startOfMonth);

      if ((count ?? 0) >= limit) {
        return NextResponse.json(
          {
            error: `Monthly receipt limit reached (${count}/${limit}). Upgrade your plan to continue.`,
            code: 'USAGE_LIMIT',
          },
          { status: 429 },
        );
      }
    }

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
