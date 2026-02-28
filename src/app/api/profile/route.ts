/* =====================================================
 * GET  /api/profile        → read company_name, email
 * PATCH /api/profile       → update company_name
 *
 * Uses supabaseAdmin (service-role) to bypass RLS,
 * while still verifying the user session via auth.
 * ===================================================== */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/rbac';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('company_name, email')
    .eq('id', user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const companyName = body.company_name;

  if (typeof companyName !== 'string' || companyName.trim().length === 0) {
    return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ company_name: companyName.trim() })
    .eq('id', user.id);

  if (error) {
    console.error('[profile] update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
