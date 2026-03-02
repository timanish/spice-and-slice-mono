export interface PromoCode {
  id: string;
  code: string;
  // New standard columns used by application
  discount_percentage: number | null;
  discount_amount: number | null;
  minimum_order_amount: number | null;
  // Legacy columns from base schema (kept for compatibility)
  discount_type?: string;
  discount_value?: number;
  min_order_amount?: number | null;
  description: string;
  is_sitewide: boolean;
  is_active: boolean;
  current_uses: number;
  max_uses: number | null;
  end_date: string | null;
  start_date: string;
  updated_at?: string;
  created_at: string;
}

export interface PromoCodeValidationResult {
  valid: boolean;
  message: string;
  discount: number;
  promo_id: string;
}
