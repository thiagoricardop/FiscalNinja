-- =====================================================
-- FiscalNinja — RBAC Migration
-- Role-Based Access Control: owner / manager / driver
-- Run in your Supabase SQL Editor
-- =====================================================

-- ─── 1. New ENUM ────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('owner', 'manager', 'driver');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 2. ALTER profiles ──────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'owner',
  ADD COLUMN IF NOT EXISTS parent_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN profiles.role IS 'RBAC role: owner has full access, manager can view/edit, driver is limited';
COMMENT ON COLUMN profiles.parent_user_id IS 'For manager/driver accounts — points to the owner';

CREATE INDEX IF NOT EXISTS idx_profiles_parent ON profiles(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role   ON profiles(role);

-- ─── 3. team_members table ──────────────────────────

CREATE TABLE IF NOT EXISTS team_members (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  role          user_role NOT NULL DEFAULT 'driver',
  invited_email TEXT NOT NULL,
  invited_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at   TIMESTAMP WITH TIME ZONE,
  active        BOOLEAN NOT NULL DEFAULT true,
  permissions   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_invite UNIQUE(owner_id, invited_email)
);

COMMENT ON TABLE team_members IS 'Team invitations and memberships; links owners to managers/drivers';

CREATE INDEX IF NOT EXISTS idx_team_owner   ON team_members(owner_id);
CREATE INDEX IF NOT EXISTS idx_team_user    ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_email   ON team_members(invited_email);
CREATE INDEX IF NOT EXISTS idx_team_active  ON team_members(owner_id, active) WHERE active = true;

-- auto-update updated_at
CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON team_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 4. Enable RLS on team_members ──────────────────

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Owners can see their own team rows
CREATE POLICY "Owners can view own team"
  ON team_members FOR SELECT
  USING (auth.uid() = owner_id);

-- Members can view the invite that refers to them
CREATE POLICY "Members can view own membership"
  ON team_members FOR SELECT
  USING (auth.uid() = user_id);

-- Only owners can create invites
CREATE POLICY "Owners can invite members"
  ON team_members FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Only owners can update their team rows
CREATE POLICY "Owners can update own team"
  ON team_members FOR UPDATE
  USING (auth.uid() = owner_id);

-- Only owners can remove members
CREATE POLICY "Owners can delete own team"
  ON team_members FOR DELETE
  USING (auth.uid() = owner_id);

-- ─── 5. UPDATE existing RLS policies ────────────────
-- Managers and drivers must also be able to read their
-- owner's trucks, drivers, and receipts.
-- We use a helper function so policies stay clean.

-- Helper: returns the effective owner_id (self if owner, parent_user_id otherwise)
CREATE OR REPLACE FUNCTION effective_owner_id()
RETURNS UUID AS $$
  SELECT CASE
    WHEN (SELECT role FROM profiles WHERE id = auth.uid()) = 'owner'
      THEN auth.uid()
    ELSE
      (SELECT parent_user_id FROM profiles WHERE id = auth.uid())
  END;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ── Profiles ──

-- Allow managers/drivers to read their owner's profile (for company_name, etc.)
CREATE POLICY "Team members can view owner profile"
  ON profiles FOR SELECT
  USING (
    id = (SELECT parent_user_id FROM profiles WHERE id = auth.uid())
  );

-- ── Trucks ──

DROP POLICY IF EXISTS "Users can view own trucks" ON trucks;
CREATE POLICY "Users and team can view trucks"
  ON trucks FOR SELECT
  USING (user_id = effective_owner_id());

-- Only owner can mutate trucks (existing insert/update/delete policies already
-- check auth.uid() = user_id, which is correct — managers/drivers don't own trucks)

-- ── Drivers ──

DROP POLICY IF EXISTS "Users can view own drivers" ON drivers;
CREATE POLICY "Users and team can view drivers"
  ON drivers FOR SELECT
  USING (user_id = effective_owner_id());

-- ── Receipts ──

-- SELECT: owner sees all, manager sees all for that owner, driver sees own
DROP POLICY IF EXISTS "Users can view own receipts" ON receipts;
CREATE POLICY "Receipts visible by role"
  ON receipts FOR SELECT
  USING (
    CASE
      -- owner sees all their receipts
      WHEN (SELECT role FROM profiles WHERE id = auth.uid()) = 'owner'
        THEN user_id = auth.uid()
      -- manager sees all receipts for the owner they belong to
      WHEN (SELECT role FROM profiles WHERE id = auth.uid()) = 'manager'
        THEN user_id = (SELECT parent_user_id FROM profiles WHERE id = auth.uid())
      -- driver sees only receipts they uploaded (driver_id matches the
      -- drivers row whose email matches this auth user)
      WHEN (SELECT role FROM profiles WHERE id = auth.uid()) = 'driver'
        THEN user_id = (SELECT parent_user_id FROM profiles WHERE id = auth.uid())
          AND driver_id = (
            SELECT d.id FROM drivers d
            WHERE d.user_id = (SELECT parent_user_id FROM profiles WHERE id = auth.uid())
              AND d.email = (SELECT email FROM profiles WHERE id = auth.uid())
            LIMIT 1
          )
      ELSE false
    END
  );

-- INSERT: owner & manager & driver can insert (user_id must match owner)
DROP POLICY IF EXISTS "Users can insert own receipts" ON receipts;
CREATE POLICY "Team can insert receipts"
  ON receipts FOR INSERT
  WITH CHECK (user_id = effective_owner_id());

-- UPDATE: owner & manager only
DROP POLICY IF EXISTS "Users can update own receipts" ON receipts;
CREATE POLICY "Owner and manager can update receipts"
  ON receipts FOR UPDATE
  USING (
    user_id = effective_owner_id()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'manager')
  );

-- DELETE: owner only
DROP POLICY IF EXISTS "Users can delete own receipts" ON receipts;
CREATE POLICY "Only owner can delete receipts"
  ON receipts FOR DELETE
  USING (
    user_id = auth.uid()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'owner'
  );

-- ── Expense categories ──

DROP POLICY IF EXISTS "Users can view own categories" ON expense_categories;
CREATE POLICY "Users and team can view categories"
  ON expense_categories FOR SELECT
  USING (user_id = effective_owner_id());

-- Only owner can mutate categories (existing policies already restrict to auth.uid() = user_id)

-- ─── 6. UPDATE handle_new_user() to set role ───────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, company_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Company'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'owner')
  );

  -- Only seed default categories for owners
  IF COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'owner') = 'owner' THEN
    PERFORM setup_default_categories(NEW.id);
  END IF;

  -- If a parent_user_id was passed via metadata, set it
  IF NEW.raw_user_meta_data->>'parent_user_id' IS NOT NULL THEN
    UPDATE public.profiles
      SET parent_user_id = (NEW.raw_user_meta_data->>'parent_user_id')::UUID
      WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
