// Type definitions for FiscalNinja

export interface Receipt {
  id: string;
  user_id: string;
  driver_id?: string | null;
  truck_id?: string | null;
  image_url: string;
  receipt_date: string;
  vendor: string;
  amount: number;
  tax_amount?: number | null;
  category: 'fuel' | 'tolls' | 'maintenance' | 'insurance' | 'other';
  payment_method: 'cash' | 'credit' | 'debit' | 'company_card' | 'other';
  notes?: string | null;
  ocr_confidence?: number | null;
  needs_review: boolean;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Driver {
  id: string;
  user_id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  active: boolean;
  created_at: string;
}

export interface Truck {
  id: string;
  user_id: string;
  truck_number: string;
  license_plate?: string | null;
  vin?: string | null;
  active: boolean;
  created_at: string;
}

export type UserRole = 'owner' | 'manager' | 'driver';

export interface Profile {
  id: string;
  company_name: string;
  email: string;
  role: UserRole;
  parent_user_id: string | null;
  subscription_tier: 'solo' | 'fleet' | 'enterprise';
  subscription_status: 'active' | 'inactive' | 'cancelled' | 'past_due';
  stripe_customer_id?: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  owner_id: string;
  user_id: string | null;
  role: UserRole;
  invited_email: string;
  invited_at: string;
  accepted_at: string | null;
  active: boolean;
  permissions: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCategory {
  id: string;
  user_id: string;
  name: string;
  tax_deductible: boolean;
  created_at: string;
}
