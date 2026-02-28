export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          company_name: string;
          email: string;
          role: 'owner' | 'manager' | 'driver';
          parent_user_id: string | null;
          subscription_tier: 'solo' | 'fleet' | 'enterprise';
          subscription_status: 'active' | 'cancelled' | 'past_due';
          stripe_customer_id: string | null;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          company_name: string;
          email: string;
          role?: 'owner' | 'manager' | 'driver';
          parent_user_id?: string | null;
          subscription_tier?: 'solo' | 'fleet' | 'enterprise';
          subscription_status?: 'active' | 'cancelled' | 'past_due';
          stripe_customer_id?: string | null;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_name?: string;
          email?: string;
          role?: 'owner' | 'manager' | 'driver';
          parent_user_id?: string | null;
          subscription_tier?: 'solo' | 'fleet' | 'enterprise';
          subscription_status?: 'active' | 'cancelled' | 'past_due';
          stripe_customer_id?: string | null;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      team_members: {
        Row: {
          id: string;
          owner_id: string;
          user_id: string | null;
          role: 'owner' | 'manager' | 'driver';
          invited_email: string;
          invited_at: string;
          accepted_at: string | null;
          active: boolean;
          permissions: Record<string, boolean>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          user_id?: string | null;
          role?: 'owner' | 'manager' | 'driver';
          invited_email: string;
          invited_at?: string;
          accepted_at?: string | null;
          active?: boolean;
          permissions?: Record<string, boolean>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          user_id?: string | null;
          role?: 'owner' | 'manager' | 'driver';
          invited_email?: string;
          invited_at?: string;
          accepted_at?: string | null;
          active?: boolean;
          permissions?: Record<string, boolean>;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      trucks: {
        Row: {
          id: string;
          user_id: string;
          truck_number: string;
          license_plate: string | null;
          vin: string | null;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          truck_number: string;
          license_plate?: string | null;
          vin?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          truck_number?: string;
          license_plate?: string | null;
          vin?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      drivers: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          email: string | null;
          phone: string | null;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      receipts: {
        Row: {
          id: string;
          user_id: string;
          driver_id: string | null;
          truck_id: string | null;
          image_url: string;
          receipt_date: string;
          vendor: string;
          amount: number;
          tax_amount: number | null;
          category: 'fuel' | 'tolls' | 'maintenance' | 'insurance' | 'other';
          payment_method: 'cash' | 'credit' | 'debit' | 'company_card' | 'other';
          notes: string | null;
          ocr_confidence: number | null;
          needs_review: boolean;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          driver_id?: string | null;
          truck_id?: string | null;
          image_url: string;
          receipt_date: string;
          vendor: string;
          amount: number;
          tax_amount?: number | null;
          category?: 'fuel' | 'tolls' | 'maintenance' | 'insurance' | 'other';
          payment_method?: 'cash' | 'credit' | 'debit' | 'company_card' | 'other';
          notes?: string | null;
          ocr_confidence?: number | null;
          needs_review?: boolean;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          driver_id?: string | null;
          truck_id?: string | null;
          image_url?: string;
          receipt_date?: string;
          vendor?: string;
          amount?: number;
          tax_amount?: number | null;
          category?: 'fuel' | 'tolls' | 'maintenance' | 'insurance' | 'other';
          payment_method?: 'cash' | 'credit' | 'debit' | 'company_card' | 'other';
          notes?: string | null;
          ocr_confidence?: number | null;
          needs_review?: boolean;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      expense_categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          tax_deductible: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          tax_deductible?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          tax_deductible?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_monthly_expenses: {
        Args: { p_user_id: string; p_year: number; p_month: number };
        Returns: {
          total_amount: number;
          total_receipts: number;
          avg_amount: number;
          category: 'fuel' | 'tolls' | 'maintenance' | 'insurance' | 'other';
          category_total: number;
          category_count: number;
        }[];
      };
      get_driver_expenses: {
        Args: { p_user_id: string; p_start_date: string; p_end_date: string };
        Returns: {
          driver_id: string;
          driver_name: string;
          total_amount: number;
          receipt_count: number;
          avg_amount: number;
        }[];
      };
      get_truck_expenses: {
        Args: { p_user_id: string; p_start_date: string; p_end_date: string };
        Returns: {
          truck_id: string;
          truck_number: string;
          total_amount: number;
          receipt_count: number;
          fuel_cost: number;
          maintenance_cost: number;
        }[];
      };
      get_dashboard_stats: {
        Args: { p_user_id: string; p_start_date?: string; p_end_date?: string };
        Returns: Record<string, unknown>;
      };
      get_receipts_needing_review: {
        Args: { p_user_id: string };
        Returns: {
          id: string;
          receipt_date: string;
          vendor: string;
          amount: number;
          category: 'fuel' | 'tolls' | 'maintenance' | 'insurance' | 'other';
          ocr_confidence: number;
          created_at: string;
        }[];
      };
    };
    Enums: {
      user_role: 'owner' | 'manager' | 'driver';
      subscription_tier: 'solo' | 'fleet' | 'enterprise';
      subscription_status: 'active' | 'cancelled' | 'past_due';
      expense_category: 'fuel' | 'tolls' | 'maintenance' | 'insurance' | 'other';
      payment_method: 'cash' | 'credit' | 'debit' | 'company_card' | 'other';
    };
    CompositeTypes: Record<string, never>;
  };
};
