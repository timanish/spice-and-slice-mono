export type SubscriptionType = "weekly" | "monthly" | "custom";
export type SubscriptionStatus = "active" | "paused" | "cancelled";

export type DeliveryStatus =
  | "scheduled"
  | "out_for_delivery"
  | "delivered"
  | "skipped"
  | "cancelled"
  | "failed";

export type NotificationType = "delivery_reminder" | "subscription_ending";

export interface LunchBoxSubscription {
  id: string;
  user_id: string;
  subscription_type: SubscriptionType;
  status: SubscriptionStatus;
  start_date: string;
  end_date?: string | null;
  next_delivery_date: string | null;
  company: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  delivery_instructions: string | null;
  delivery_schedule: string[]; // Array of date strings for custom plans
  total_delivery_days?: number | null;
  price_per_day?: number | null;
  total_price?: number | null;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
  paused_at: string | null;
  stripe_session_id?: string | null;
}

export interface LunchBoxDelivery {
  id: string;
  subscription_id: string;
  delivery_date: string;
  menu_item_id?: string | null;
  status: DeliveryStatus;
  scheduled_time: string;
  delivered_at?: string | null;
  driver_notes?: string | null;
  customer_notes?: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  menu_item?: {
    id: string;
    name: string;
    description?: string;
    image_url?: string;
    category?: string;
  };
}

export interface LunchBoxNotification {
  id: string;
  user_id: string;
  subscription_id?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  read_at?: string | null;
}

export interface CreateLunchBoxSubscriptionData {
  user_id: string;
  subscription_type: SubscriptionType;
  status?: SubscriptionStatus;
  start_date: string;
  end_date?: string;
  company: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  delivery_instructions?: string;
  delivery_schedule?: string[];
  total_delivery_days?: number;
  price_per_day?: number;
  total_price?: number;
}

export interface UpdateLunchBoxSubscriptionData {
  subscription_type?: SubscriptionType;
  status?: SubscriptionStatus;
  start_date?: string;
  next_delivery_date?: string;
  end_date?: string;
  company?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  delivery_instructions?: string;
  delivery_schedule?: string[];
  total_delivery_days?: number;
  price_per_day?: number;
  total_price?: number;
  paused_at?: string | null;
  cancelled_at?: string | null;
}

export interface CreateDeliveryData {
  subscription_id: string;
  delivery_date: string;
  menu_item_id?: string;
  status?: DeliveryStatus;
  scheduled_time?: string;
  customer_notes?: string;
}

export interface UpdateDeliveryData {
  status?: DeliveryStatus;
  menu_item_id?: string;
  delivered_at?: string;
  driver_notes?: string;
  customer_notes?: string;
}
