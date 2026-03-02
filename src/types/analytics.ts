// Type-safe PostHog event definitions

export const ANALYTICS_EVENTS = {
  // Authentication & User Flow
  USER_SIGNED_UP: "user_signed_up",
  USER_SIGNED_IN: "user_signed_in",
  USER_SIGNED_OUT: "user_signed_out",
  PROFILE_COMPLETED: "profile_completed",
  ONBOARDING_STARTED: "onboarding_started",
  ONBOARDING_COMPLETED: "onboarding_completed",

  // Product Discovery
  PRODUCT_VIEWED: "product_viewed",
  PRODUCT_SEARCHED: "product_searched",
  CATEGORY_FILTERED: "category_filtered",
  PRICE_FILTERED: "price_filtered",
  SORT_CHANGED: "sort_changed",
  FLASH_DEAL_CLICKED: "flash_deal_clicked",

  // Cart Operations
  PRODUCT_ADDED_TO_CART: "product_added_to_cart",
  CART_VIEWED: "cart_viewed",
  CART_ITEM_REMOVED: "cart_item_removed",
  CART_QUANTITY_UPDATED: "cart_quantity_updated",

  // Checkout Funnel
  CHECKOUT_STARTED: "checkout_started",
  FULFILLMENT_TYPE_SELECTED: "fulfillment_type_selected",
  DELIVERY_ADDRESS_SELECTED: "delivery_address_selected",
  DELIVERY_TIME_SELECTED: "delivery_time_selected",
  PICKUP_TIME_SELECTED: "pickup_time_selected",
  PAYMENT_METHOD_SELECTED: "payment_method_selected",
  PROMO_CODE_APPLIED: "promo_code_applied",
  PROMO_CODE_FAILED: "promo_code_failed",
  CHECKOUT_COMPLETED: "checkout_completed",
  CHECKOUT_ABANDONED: "checkout_abandoned",

  // Order Management
  ORDER_SUCCESS_VIEWED: "order_success_viewed",
  ORDER_DETAILS_VIEWED: "order_details_viewed",
  ORDER_HISTORY_VIEWED: "order_history_viewed",

  // Catering
  CATERING_FORM_OPENED: "catering_form_opened",
  CATERING_REQUEST_SUBMITTED: "catering_request_submitted",

  // LunchBox
  LUNCHBOX_SUBSCRIPTION_STARTED: "lunchbox_subscription_started",
  LUNCHBOX_SUBSCRIPTION_COMPLETED: "lunchbox_subscription_completed",

  // Navigation & Page Views
  PAGE_VIEWED: "page_viewed",
  NAVIGATION_CLICKED: "navigation_clicked",
  HERO_SLIDE_VIEWED: "hero_slide_viewed",
  HERO_CTA_CLICKED: "hero_cta_clicked",
  FOOTER_LINK_CLICKED: "footer_link_clicked",
  COLLECTION_CLICKED: "collection_clicked",
  FEATURED_PRODUCT_CLICKED: "featured_product_clicked",
  RECIPE_CLICKED: "recipe_clicked",

  // TikTok
  TIKTOK_VIDEO_VIEWED: "tiktok_video_viewed",
  TIKTOK_VIDEO_CLICKED: "tiktok_video_clicked",
  TIKTOK_VIDEO_PLAYED: "tiktok_video_played",
  TIKTOK_VIDEO_SWIPED: "tiktok_video_swiped",

  // Profile & Account
  PROFILE_UPDATED: "profile_updated",
  ADDRESS_ADDED: "address_added",
  ADDRESS_UPDATED: "address_updated",
  ADDRESS_DELETED: "address_deleted",
  PROFILE_TAB_CHANGED: "profile_tab_changed",

  // Admin
  ADMIN_PRODUCT_CREATED: "admin_product_created",
  ADMIN_PRODUCT_EDITED: "admin_product_edited",
  ADMIN_ORDER_STATUS_UPDATED: "admin_order_status_updated",
  ADMIN_CATEGORY_PRIORITY_CHANGED: "admin_category_priority_changed",
} as const;

// Event property types
export interface AnalyticsEventProperties {
  // Authentication
  [ANALYTICS_EVENTS.USER_SIGNED_UP]: {
    method: "email" | "google";
    timestamp: string;
  };
  [ANALYTICS_EVENTS.USER_SIGNED_IN]: {
    method: "email" | "google";
    user_id: string;
  };
  [ANALYTICS_EVENTS.USER_SIGNED_OUT]: {
    session_duration?: number;
  };
  [ANALYTICS_EVENTS.PROFILE_COMPLETED]: {
    has_address: boolean;
    has_phone: boolean;
  };

  // Product Discovery
  [ANALYTICS_EVENTS.PRODUCT_VIEWED]: {
    product_id: string;
    product_name: string;
    category: string;
    price: number;
    is_weighted?: boolean;
    from_page?: string;
  };
  [ANALYTICS_EVENTS.PRODUCT_SEARCHED]: {
    query: string;
    results_count: number;
  };
  [ANALYTICS_EVENTS.CATEGORY_FILTERED]: {
    categories: string[];
    products_shown: number;
  };
  [ANALYTICS_EVENTS.PRICE_FILTERED]: {
    min: number;
    max: number;
    products_shown: number;
  };
  [ANALYTICS_EVENTS.SORT_CHANGED]: {
    sort_by: "price-asc" | "price-desc" | "relevance" | "in-stock";
  };
  [ANALYTICS_EVENTS.FLASH_DEAL_CLICKED]: {
    product_id: string;
    product_name: string;
    discount_percentage: number;
  };

  // Cart
  [ANALYTICS_EVENTS.PRODUCT_ADDED_TO_CART]: {
    product_id: string;
    product_name: string;
    category: string;
    price: number;
    quantity?: number;
    weight?: number;
    is_weighted: boolean;
    from_page: string;
    has_flash_deal?: boolean;
    discount_percentage?: number;
  };
  [ANALYTICS_EVENTS.CART_VIEWED]: {
    items_count: number;
    total_value: number;
  };
  [ANALYTICS_EVENTS.CART_ITEM_REMOVED]: {
    product_id: string;
    product_name: string;
  };
  [ANALYTICS_EVENTS.CART_QUANTITY_UPDATED]: {
    product_id: string;
    product_name: string;
    old_quantity: number;
    new_quantity: number;
  };

  // Checkout
  [ANALYTICS_EVENTS.CHECKOUT_STARTED]: {
    cart_value: number;
    items_count: number;
    fulfillment_type: "delivery" | "pickup";
  };
  [ANALYTICS_EVENTS.FULFILLMENT_TYPE_SELECTED]: {
    type: "delivery" | "pickup";
    previous_type?: "delivery" | "pickup";
  };
  [ANALYTICS_EVENTS.DELIVERY_ADDRESS_SELECTED]: {
    distance_from_store?: number;
    delivery_zone?: string;
    is_new_address: boolean;
  };
  [ANALYTICS_EVENTS.DELIVERY_TIME_SELECTED]: {
    date: string;
    time_slot: string;
  };
  [ANALYTICS_EVENTS.PICKUP_TIME_SELECTED]: {
    date: string;
    time_slot: string;
  };
  [ANALYTICS_EVENTS.PAYMENT_METHOD_SELECTED]: {
    method: "card" | "cash";
    previous_method?: "card" | "cash";
  };
  [ANALYTICS_EVENTS.PROMO_CODE_APPLIED]: {
    code: string;
    discount_amount: number;
    success: boolean;
  };
  [ANALYTICS_EVENTS.PROMO_CODE_FAILED]: {
    code: string;
    error_message: string;
  };
  [ANALYTICS_EVENTS.CHECKOUT_COMPLETED]: {
    order_id: string;
    total_amount: number;
    payment_method: "card" | "cash";
    fulfillment_type: "delivery" | "pickup";
    items_count: number;
    had_promo_code: boolean;
    discount_amount?: number;
    delivery_fee?: number;
    tax_amount?: number;
  };
  [ANALYTICS_EVENTS.CHECKOUT_ABANDONED]: {
    stage: string;
    cart_value: number;
    items_count: number;
    fulfillment_type?: "delivery" | "pickup";
  };

  // Orders
  [ANALYTICS_EVENTS.ORDER_SUCCESS_VIEWED]: {
    order_id: string;
  };
  [ANALYTICS_EVENTS.ORDER_DETAILS_VIEWED]: {
    order_id: string;
    order_status: string;
  };
  [ANALYTICS_EVENTS.ORDER_HISTORY_VIEWED]: {
    orders_count: number;
  };

  // Catering
  [ANALYTICS_EVENTS.CATERING_FORM_OPENED]: Record<string, never>;
  [ANALYTICS_EVENTS.CATERING_REQUEST_SUBMITTED]: {
    event_type: string;
    guest_count?: number;
    event_date?: string;
  };

  // LunchBox
  [ANALYTICS_EVENTS.LUNCHBOX_SUBSCRIPTION_STARTED]: {
    plan_type: "weekly" | "monthly" | "custom";
  };
  [ANALYTICS_EVENTS.LUNCHBOX_SUBSCRIPTION_COMPLETED]: {
    plan_type: "weekly" | "monthly" | "custom";
    total_price: number;
    delivery_days?: number;
  };

  // Navigation & Page Views
  [ANALYTICS_EVENTS.PAGE_VIEWED]: {
    page_path: string;
    page_title: string;
    referrer?: string;
  };
  [ANALYTICS_EVENTS.NAVIGATION_CLICKED]: {
    link_text: string;
    destination: string;
    location: "header" | "mobile_menu" | "admin_sidebar";
  };
  [ANALYTICS_EVENTS.HERO_SLIDE_VIEWED]: {
    slide_title: string;
    slide_index: number;
  };
  [ANALYTICS_EVENTS.HERO_CTA_CLICKED]: {
    slide_title: string;
    cta_text: string;
    destination: string;
  };
  [ANALYTICS_EVENTS.FOOTER_LINK_CLICKED]: {
    link_text: string;
    destination: string;
    section: string;
  };
  [ANALYTICS_EVENTS.COLLECTION_CLICKED]: {
    collection_id: string;
    collection_name: string;
  };
  [ANALYTICS_EVENTS.FEATURED_PRODUCT_CLICKED]: {
    product_id: string;
    product_name: string;
    section: "featured" | "flash_deals";
  };
  [ANALYTICS_EVENTS.RECIPE_CLICKED]: {
    recipe_id: string;
    recipe_title: string;
  };

  // TikTok
  [ANALYTICS_EVENTS.TIKTOK_VIDEO_VIEWED]: {
    video_id: string;
    video_url: string;
    author: string;
  };
  [ANALYTICS_EVENTS.TIKTOK_VIDEO_CLICKED]: {
    video_id: string;
    video_url: string;
  };
  [ANALYTICS_EVENTS.TIKTOK_VIDEO_PLAYED]: {
    video_id: string;
    video_url: string;
    is_muted: boolean;
  };
  [ANALYTICS_EVENTS.TIKTOK_VIDEO_SWIPED]: {
    direction: 'left' | 'right';
    from_index: number;
    to_index: number;
    video_id: string;
  };

  // Profile & Account
  [ANALYTICS_EVENTS.PROFILE_UPDATED]: {
    fields_changed: string[];
    has_complete_profile: boolean;
  };
  [ANALYTICS_EVENTS.ADDRESS_ADDED]: {
    is_default: boolean;
    has_delivery_zone: boolean;
  };
  [ANALYTICS_EVENTS.ADDRESS_UPDATED]: {
    address_id: string;
    fields_changed: string[];
  };
  [ANALYTICS_EVENTS.ADDRESS_DELETED]: {
    address_id: string;
    was_default: boolean;
  };
  [ANALYTICS_EVENTS.PROFILE_TAB_CHANGED]: {
    from_tab: string;
    to_tab: string;
  };

  // Admin
  [ANALYTICS_EVENTS.ADMIN_PRODUCT_CREATED]: {
    product_id: string;
    category: string;
  };
  [ANALYTICS_EVENTS.ADMIN_PRODUCT_EDITED]: {
    product_id: string;
    fields_changed: string[];
  };
  [ANALYTICS_EVENTS.ADMIN_ORDER_STATUS_UPDATED]: {
    order_id: string;
    old_status: string;
    new_status: string;
  };
  [ANALYTICS_EVENTS.ADMIN_CATEGORY_PRIORITY_CHANGED]: {
    category: string;
    new_priority: number;
  };
}

// Helper type for event tracking
export type AnalyticsEvent = keyof AnalyticsEventProperties;
