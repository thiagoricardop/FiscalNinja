-- ═══════════════════════════════════════════════════════
-- FIX: Recursive RLS policies on profiles table
--
-- The "Team members can view owner profile" policy had
-- an inline SELECT on profiles, causing infinite recursion.
-- All receipt policies that did inline SELECTs on profiles
-- were also affected.
--
-- Fix: SECURITY DEFINER helper functions that bypass RLS
-- when querying the profiles table.
-- ═══════════════════════════════════════════════════════

-- ── Helper functions (SECURITY DEFINER = bypasses RLS) ──

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role::text FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_my_parent_user_id()
RETURNS UUID AS $$
  SELECT parent_user_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_my_email()
RETURNS TEXT AS $$
  SELECT email FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ── Fix profiles SELECT policy ──────────────────────────

DROP POLICY IF EXISTS "Team members can view owner profile" ON profiles;
CREATE POLICY "Team members can view owner profile"
  ON profiles FOR SELECT
  USING (id = get_my_parent_user_id());

-- ── Fix receipts SELECT policy ──────────────────────────

DROP POLICY IF EXISTS "Receipts visible by role" ON receipts;
CREATE POLICY "Receipts visible by role"
  ON receipts FOR SELECT
  USING (
    CASE
      WHEN get_my_role() = 'owner'
        THEN user_id = auth.uid()
      WHEN get_my_role() = 'manager'
        THEN user_id = get_my_parent_user_id()
      WHEN get_my_role() = 'driver'
        THEN user_id = get_my_parent_user_id()
          AND driver_id = (
            SELECT d.id FROM drivers d
            WHERE d.user_id = get_my_parent_user_id()
              AND d.email = get_my_email()
            LIMIT 1
          )
      ELSE false
    END
  );

-- ── Fix receipts UPDATE policy ──────────────────────────

DROP POLICY IF EXISTS "Owner and manager can update receipts" ON receipts;
CREATE POLICY "Owner and manager can update receipts"
  ON receipts FOR UPDATE
  USING (
    user_id = effective_owner_id()
    AND get_my_role() IN ('owner', 'manager')
  );

-- ── Fix receipts DELETE policy ──────────────────────────

DROP POLICY IF EXISTS "Only owner can delete receipts" ON receipts;
CREATE POLICY "Only owner can delete receipts"
  ON receipts FOR DELETE
  USING (
    user_id = auth.uid()
    AND get_my_role() = 'owner'
  );
