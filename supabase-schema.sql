-- =====================================================
-- FiscalNinja Database Schema
-- PostgreSQL schema for Supabase
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. CUSTOM TYPES (ENUMS)
-- =====================================================

CREATE TYPE subscription_tier AS ENUM ('solo', 'fleet', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'past_due');
CREATE TYPE expense_category AS ENUM ('fuel', 'tolls', 'maintenance', 'insurance', 'other');
CREATE TYPE payment_method AS ENUM ('cash', 'credit', 'debit', 'company_card', 'other');
CREATE TYPE user_role AS ENUM ('owner', 'manager', 'driver');

-- =====================================================
-- 2. TABLES
-- =====================================================

-- PROFILES (extends auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    role user_role NOT NULL DEFAULT 'owner',
    parent_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    subscription_tier subscription_tier DEFAULT 'solo',
    subscription_status subscription_status DEFAULT 'active',
    stripe_customer_id TEXT UNIQUE,
    onboarding_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE profiles IS 'User profiles for trucking company owners/managers/drivers';

-- TRUCKS
CREATE TABLE trucks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    truck_number TEXT NOT NULL,
    license_plate TEXT,
    vin TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_truck_per_user UNIQUE(user_id, truck_number)
);

COMMENT ON TABLE trucks IS 'Trucks/vehicles in the fleet';

-- DRIVERS
CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_driver_email UNIQUE(user_id, email)
);

COMMENT ON TABLE drivers IS 'Drivers associated with trucking companies';

-- RECEIPTS
CREATE TABLE receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    truck_id UUID REFERENCES trucks(id) ON DELETE SET NULL,

    -- Receipt data
    image_url TEXT NOT NULL,
    receipt_date DATE NOT NULL,
    vendor TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
    tax_amount DECIMAL(10, 2) CHECK (tax_amount >= 0),

    -- Classification
    category expense_category DEFAULT 'other',
    payment_method payment_method DEFAULT 'other',
    notes TEXT,

    -- OCR metadata
    ocr_confidence DECIMAL(5, 2) CHECK (ocr_confidence >= 0 AND ocr_confidence <= 100),

    -- Review workflow
    needs_review BOOLEAN DEFAULT false,
    reviewed_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE receipts IS 'Receipt records with OCR data and expense tracking';

-- EXPENSE CATEGORIES (custom categories per user)
CREATE TABLE expense_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    tax_deductible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_category_per_user UNIQUE(user_id, name)
);

COMMENT ON TABLE expense_categories IS 'Custom expense categories defined by each user';

-- TEAM_MEMBERS (invite & membership tracking)
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    role user_role NOT NULL DEFAULT 'driver',
    invited_email TEXT NOT NULL,
    invite_token TEXT UNIQUE,
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    active BOOLEAN NOT NULL DEFAULT true,
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_invite UNIQUE(owner_id, invited_email)
);

COMMENT ON TABLE team_members IS 'Team invitations and memberships; links owners to managers/drivers';

-- =====================================================
-- 3. INDEXES
-- =====================================================

-- Profiles
CREATE INDEX idx_profiles_stripe_customer ON profiles(stripe_customer_id);
CREATE INDEX idx_profiles_subscription_status ON profiles(subscription_status);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_parent ON profiles(parent_user_id);

-- Team Members
CREATE INDEX idx_team_owner ON team_members(owner_id);
CREATE INDEX idx_team_user ON team_members(user_id);
CREATE INDEX idx_team_email ON team_members(invited_email);
CREATE INDEX idx_team_active ON team_members(owner_id, active) WHERE active = true;
CREATE INDEX idx_team_invite_token ON team_members(invite_token) WHERE invite_token IS NOT NULL;

-- Trucks
CREATE INDEX idx_trucks_user_id ON trucks(user_id);
CREATE INDEX idx_trucks_active ON trucks(user_id, active);

-- Drivers
CREATE INDEX idx_drivers_user_id ON drivers(user_id);
CREATE INDEX idx_drivers_active ON drivers(user_id, active);

-- Receipts (critical for query performance)
CREATE INDEX idx_receipts_user_id ON receipts(user_id);
CREATE INDEX idx_receipts_receipt_date ON receipts(receipt_date DESC);
CREATE INDEX idx_receipts_user_date ON receipts(user_id, receipt_date DESC);
CREATE INDEX idx_receipts_driver ON receipts(driver_id);
CREATE INDEX idx_receipts_truck ON receipts(truck_id);
CREATE INDEX idx_receipts_category ON receipts(category);
CREATE INDEX idx_receipts_needs_review ON receipts(user_id, needs_review) WHERE needs_review = true;
CREATE INDEX idx_receipts_created_at ON receipts(created_at DESC);

-- Expense categories
CREATE INDEX idx_expense_categories_user ON expense_categories(user_id);

-- =====================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- SECURITY-DEFINER helpers (bypass RLS, prevent recursion)
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

CREATE OR REPLACE FUNCTION effective_owner_id()
RETURNS UUID AS $$
  SELECT COALESCE(parent_user_id, id) FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- PROFILES
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Team members can view owner profile"
    ON profiles FOR SELECT USING (id = get_my_parent_user_id());
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- TEAM_MEMBERS
CREATE POLICY "Owner can view own team"
    ON team_members FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Members can view their membership"
    ON team_members FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Owner can insert team members"
    ON team_members FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owner can update team members"
    ON team_members FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Owner can delete team members"
    ON team_members FOR DELETE USING (owner_id = auth.uid());

-- TRUCKS
CREATE POLICY "Users can view own trucks"
    ON trucks FOR SELECT USING (user_id = effective_owner_id());
CREATE POLICY "Users can insert own trucks"
    ON trucks FOR INSERT WITH CHECK (user_id = effective_owner_id());
CREATE POLICY "Users can update own trucks"
    ON trucks FOR UPDATE USING (user_id = effective_owner_id());
CREATE POLICY "Users can delete own trucks"
    ON trucks FOR DELETE USING (user_id = effective_owner_id());

-- DRIVERS
CREATE POLICY "Users can view own drivers"
    ON drivers FOR SELECT USING (user_id = effective_owner_id());
CREATE POLICY "Users can insert own drivers"
    ON drivers FOR INSERT WITH CHECK (user_id = effective_owner_id());
CREATE POLICY "Users can update own drivers"
    ON drivers FOR UPDATE USING (user_id = effective_owner_id());
CREATE POLICY "Users can delete own drivers"
    ON drivers FOR DELETE USING (user_id = effective_owner_id());

-- RECEIPTS
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
CREATE POLICY "Users can insert own receipts"
    ON receipts FOR INSERT WITH CHECK (user_id = effective_owner_id());
CREATE POLICY "Owner and manager can update receipts"
    ON receipts FOR UPDATE
    USING (user_id = effective_owner_id() AND get_my_role() IN ('owner', 'manager'));
CREATE POLICY "Only owner can delete receipts"
    ON receipts FOR DELETE
    USING (user_id = auth.uid() AND get_my_role() = 'owner');

-- EXPENSE CATEGORIES
CREATE POLICY "Users can view own categories"
    ON expense_categories FOR SELECT USING (user_id = effective_owner_id());
CREATE POLICY "Users can insert own categories"
    ON expense_categories FOR INSERT WITH CHECK (user_id = effective_owner_id());
CREATE POLICY "Users can update own categories"
    ON expense_categories FOR UPDATE USING (user_id = effective_owner_id());
CREATE POLICY "Users can delete own categories"
    ON expense_categories FOR DELETE USING (user_id = effective_owner_id());

-- =====================================================
-- 5. TRIGGERS — auto-update updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_receipts_updated_at
    BEFORE UPDATE ON receipts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at
    BEFORE UPDATE ON team_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. HANDLE NEW USER SIGNUP
--    Auto-creates a profile row + default categories
--    when a user registers via Supabase Auth
-- =====================================================

-- Default expense categories seeder
CREATE OR REPLACE FUNCTION setup_default_categories(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO expense_categories (user_id, name, tax_deductible) VALUES
        (p_user_id, 'Fuel', true),
        (p_user_id, 'Tolls', true),
        (p_user_id, 'Maintenance & Repairs', true),
        (p_user_id, 'Insurance', true),
        (p_user_id, 'Parking', true),
        (p_user_id, 'Food & Lodging', true),
        (p_user_id, 'Other', true)
    ON CONFLICT (user_id, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function: runs AFTER INSERT on auth.users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, company_name, full_name, role, parent_user_id)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Company'),
        COALESCE(NEW.raw_user_meta_data->>'full_name', NULL),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'owner'),
        (NEW.raw_user_meta_data->>'parent_user_id')::UUID
    );

    -- Only seed default categories for owners
    IF COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'owner') = 'owner' THEN
        PERFORM setup_default_categories(NEW.id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- 7. DATABASE FUNCTIONS — common queries
-- =====================================================

-- Total expenses by month (grouped by category)
CREATE OR REPLACE FUNCTION get_monthly_expenses(
    p_user_id UUID,
    p_year INTEGER,
    p_month INTEGER
)
RETURNS TABLE (
    total_amount DECIMAL,
    total_receipts BIGINT,
    avg_amount DECIMAL,
    category expense_category,
    category_total DECIMAL,
    category_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        SUM(r.amount)::DECIMAL  AS total_amount,
        COUNT(*)::BIGINT        AS total_receipts,
        AVG(r.amount)::DECIMAL  AS avg_amount,
        r.category,
        SUM(r.amount)::DECIMAL  AS category_total,
        COUNT(*)::BIGINT        AS category_count
    FROM receipts r
    WHERE r.user_id = p_user_id
      AND EXTRACT(YEAR  FROM r.receipt_date) = p_year
      AND EXTRACT(MONTH FROM r.receipt_date) = p_month
    GROUP BY r.category;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Expenses by driver in a date range
CREATE OR REPLACE FUNCTION get_driver_expenses(
    p_user_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    driver_id UUID,
    driver_name TEXT,
    total_amount DECIMAL,
    receipt_count BIGINT,
    avg_amount DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id                                  AS driver_id,
        d.name                                AS driver_name,
        COALESCE(SUM(r.amount), 0)::DECIMAL   AS total_amount,
        COUNT(r.id)::BIGINT                   AS receipt_count,
        COALESCE(AVG(r.amount), 0)::DECIMAL   AS avg_amount
    FROM drivers d
    LEFT JOIN receipts r ON r.driver_id = d.id
        AND r.receipt_date BETWEEN p_start_date AND p_end_date
    WHERE d.user_id = p_user_id
      AND d.active = true
    GROUP BY d.id, d.name
    ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Expenses by truck in a date range
CREATE OR REPLACE FUNCTION get_truck_expenses(
    p_user_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    truck_id UUID,
    truck_number TEXT,
    total_amount DECIMAL,
    receipt_count BIGINT,
    fuel_cost DECIMAL,
    maintenance_cost DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id                                   AS truck_id,
        t.truck_number,
        COALESCE(SUM(r.amount), 0)::DECIMAL    AS total_amount,
        COUNT(r.id)::BIGINT                    AS receipt_count,
        COALESCE(SUM(CASE WHEN r.category = 'fuel' THEN r.amount ELSE 0 END), 0)::DECIMAL        AS fuel_cost,
        COALESCE(SUM(CASE WHEN r.category = 'maintenance' THEN r.amount ELSE 0 END), 0)::DECIMAL AS maintenance_cost
    FROM trucks t
    LEFT JOIN receipts r ON r.truck_id = t.id
        AND r.receipt_date BETWEEN p_start_date AND p_end_date
    WHERE t.user_id = p_user_id
      AND t.active = true
    GROUP BY t.id, t.truck_number
    ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dashboard summary stats
CREATE OR REPLACE FUNCTION get_dashboard_stats(
    p_user_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    v_start DATE := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '30 days');
    v_end   DATE := COALESCE(p_end_date, CURRENT_DATE);
BEGIN
    SELECT json_build_object(
        'total_receipts',     COUNT(*),
        'total_amount',       COALESCE(SUM(amount), 0),
        'avg_amount',         COALESCE(AVG(amount), 0),
        'needs_review_count', COUNT(*) FILTER (WHERE needs_review = true),
        'by_category', (
            SELECT json_object_agg(category, cat_data)
            FROM (
                SELECT category,
                       json_build_object('count', COUNT(*), 'total', SUM(amount)) AS cat_data
                FROM receipts
                WHERE user_id = p_user_id
                  AND receipt_date BETWEEN v_start AND v_end
                GROUP BY category
            ) cat
        ),
        'by_payment_method', (
            SELECT json_object_agg(payment_method, pm_data)
            FROM (
                SELECT payment_method,
                       json_build_object('count', COUNT(*), 'total', SUM(amount)) AS pm_data
                FROM receipts
                WHERE user_id = p_user_id
                  AND receipt_date BETWEEN v_start AND v_end
                GROUP BY payment_method
            ) pm
        )
    ) INTO result
    FROM receipts
    WHERE user_id = p_user_id
      AND receipt_date BETWEEN v_start AND v_end;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Receipts needing review
CREATE OR REPLACE FUNCTION get_receipts_needing_review(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    receipt_date DATE,
    vendor TEXT,
    amount DECIMAL,
    category expense_category,
    ocr_confidence DECIMAL,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT r.id, r.receipt_date, r.vendor, r.amount,
           r.category, r.ocr_confidence, r.created_at
    FROM receipts r
    WHERE r.user_id = p_user_id
      AND r.needs_review = true
    ORDER BY r.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. STORAGE BUCKET (receipt images)
--    Run separately or uncomment if storage is enabled
-- =====================================================

/*
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false);

CREATE POLICY "Users can view own receipt images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can upload own receipt images"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own receipt images"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);
*/
