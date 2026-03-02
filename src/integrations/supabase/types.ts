export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      cart_items: {
        Row: {
          cart_id: string
          created_at: string | null
          discount_percentage: number | null
          flash_deal_id: string | null
          id: string
          product_id: string
          quantity: number
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          cart_id: string
          created_at?: string | null
          discount_percentage?: number | null
          flash_deal_id?: string | null
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          cart_id?: string
          created_at?: string | null
          discount_percentage?: number | null
          flash_deal_id?: string | null
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_flash_deal_id_fkey"
            columns: ["flash_deal_id"]
            isOneToOne: false
            referencedRelation: "flash_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "carts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          priority: number | null
          tax_rate: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          priority?: number | null
          tax_rate?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          priority?: number | null
          tax_rate?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      catering_requests: {
        Row: {
          additional_info: string | null
          created_at: string | null
          dietary_restrictions: string | null
          email: string
          event_date: string
          event_time: string
          event_type: string
          guest_count: number
          id: string
          name: string
          phone: string
          selected_items: Json
          status: string | null
          updated_at: string | null
          user_id: string
          venue: string
        }
        Insert: {
          additional_info?: string | null
          created_at?: string | null
          dietary_restrictions?: string | null
          email: string
          event_date: string
          event_time: string
          event_type: string
          guest_count: number
          id?: string
          name: string
          phone: string
          selected_items?: Json
          status?: string | null
          updated_at?: string | null
          user_id: string
          venue: string
        }
        Update: {
          additional_info?: string | null
          created_at?: string | null
          dietary_restrictions?: string | null
          email?: string
          event_date?: string
          event_time?: string
          event_type?: string
          guest_count?: number
          id?: string
          name?: string
          phone?: string
          selected_items?: Json
          status?: string | null
          updated_at?: string | null
          user_id?: string
          venue?: string
        }
        Relationships: []
      }
      collections: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          display_order: number
          id: string
          image_url: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collections_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      delivery_time_slots: {
        Row: {
          created_at: string | null
          day_of_week: number | null
          display_order: number
          end_hour: number
          end_minute: number
          id: string
          is_active: boolean
          label: string
          start_hour: number
          start_minute: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_week?: number | null
          display_order: number
          end_hour: number
          end_minute?: number
          id?: string
          is_active?: boolean
          label: string
          start_hour: number
          start_minute?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_week?: number | null
          display_order?: number
          end_hour?: number
          end_minute?: number
          id?: string
          is_active?: boolean
          label?: string
          start_hour?: number
          start_minute?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      delivery_zones: {
        Row: {
          created_at: string | null
          delivery_fee: number
          display_order: number | null
          free_shipping_threshold: number
          id: string
          is_active: boolean | null
          max_distance: number
          min_distance: number
          updated_at: string | null
          zone_name: string
        }
        Insert: {
          created_at?: string | null
          delivery_fee: number
          display_order?: number | null
          free_shipping_threshold: number
          id?: string
          is_active?: boolean | null
          max_distance: number
          min_distance: number
          updated_at?: string | null
          zone_name: string
        }
        Update: {
          created_at?: string | null
          delivery_fee?: number
          display_order?: number | null
          free_shipping_threshold?: number
          id?: string
          is_active?: boolean | null
          max_distance?: number
          min_distance?: number
          updated_at?: string | null
          zone_name?: string
        }
        Relationships: []
      }
      featured_products: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          product_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          product_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "featured_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      festival_products: {
        Row: {
          created_at: string
          display_order: number
          festival_id: string
          id: string
          product_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          festival_id: string
          id?: string
          product_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          festival_id?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "festival_products_festival_id_fkey"
            columns: ["festival_id"]
            isOneToOne: false
            referencedRelation: "festivals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "festival_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      festivals: {
        Row: {
          banner_image: string | null
          created_at: string
          description: string | null
          display_order: number
          end_date: string
          id: string
          is_active: boolean
          name: string
          start_date: string
          updated_at: string
        }
        Insert: {
          banner_image?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          end_date: string
          id?: string
          is_active?: boolean
          name: string
          start_date: string
          updated_at?: string
        }
        Update: {
          banner_image?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          end_date?: string
          id?: string
          is_active?: boolean
          name?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      flash_deals: {
        Row: {
          created_at: string
          discount_percentage: number
          end_date: string
          id: string
          is_active: boolean
          product_id: string
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          discount_percentage: number
          end_date: string
          id?: string
          is_active?: boolean
          product_id: string
          start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          discount_percentage?: number
          end_date?: string
          id?: string
          is_active?: boolean
          product_id?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flash_deals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      hero_slides: {
        Row: {
          button_link: string | null
          button_text: string | null
          created_at: string
          description: string
          display_order: number
          id: string
          image_url: string
          is_active: boolean
          sub_description: string | null
          title: string
          updated_at: string
        }
        Insert: {
          button_link?: string | null
          button_text?: string | null
          created_at?: string
          description: string
          display_order?: number
          id?: string
          image_url: string
          is_active?: boolean
          sub_description?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          button_link?: string | null
          button_text?: string | null
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          image_url?: string
          is_active?: boolean
          sub_description?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      lunch_box_deliveries: {
        Row: {
          created_at: string | null
          customer_notes: string | null
          delivered_at: string | null
          delivery_date: string
          driver_notes: string | null
          id: string
          menu_item_id: string | null
          scheduled_time: string | null
          status: string
          subscription_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_notes?: string | null
          delivered_at?: string | null
          delivery_date: string
          driver_notes?: string | null
          id?: string
          menu_item_id?: string | null
          scheduled_time?: string | null
          status?: string
          subscription_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_notes?: string | null
          delivered_at?: string | null
          delivery_date?: string
          driver_notes?: string | null
          id?: string
          menu_item_id?: string | null
          scheduled_time?: string | null
          status?: string
          subscription_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lunch_box_deliveries_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lunch_box_deliveries_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "lunch_box_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      lunch_box_notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          read: boolean | null
          read_at: string | null
          subscription_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          read_at?: string | null
          subscription_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          read_at?: string | null
          subscription_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lunch_box_notifications_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "lunch_box_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      lunch_box_subscriptions: {
        Row: {
          address_line1: string
          address_line2: string | null
          cancelled_at: string | null
          city: string
          company: string
          created_at: string | null
          delivery_instructions: string | null
          delivery_schedule: Json | null
          end_date: string | null
          id: string
          next_delivery_date: string | null
          paused_at: string | null
          postal_code: string
          price_per_day: number | null
          start_date: string
          state: string
          status: string
          subscription_type: string
          total_delivery_days: number | null
          total_price: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          cancelled_at?: string | null
          city: string
          company: string
          created_at?: string | null
          delivery_instructions?: string | null
          delivery_schedule?: Json | null
          end_date?: string | null
          id?: string
          next_delivery_date?: string | null
          paused_at?: string | null
          postal_code: string
          price_per_day?: number | null
          start_date: string
          state: string
          status?: string
          subscription_type: string
          total_delivery_days?: number | null
          total_price?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          cancelled_at?: string | null
          city?: string
          company?: string
          created_at?: string | null
          delivery_instructions?: string | null
          delivery_schedule?: Json | null
          end_date?: string | null
          id?: string
          next_delivery_date?: string | null
          paused_at?: string | null
          postal_code?: string
          price_per_day?: number | null
          start_date?: string
          state?: string
          status?: string
          subscription_type?: string
          total_delivery_days?: number | null
          total_price?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          category_id: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean | null
          is_spicy: boolean | null
          is_vegetarian: boolean | null
          lunch_box_eligible: boolean | null
          name: string
          price: number
          serves_people: number | null
          sub_category: string | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_spicy?: boolean | null
          is_vegetarian?: boolean | null
          lunch_box_eligible?: boolean | null
          name: string
          price: number
          serves_people?: number | null
          sub_category?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_spicy?: boolean | null
          is_vegetarian?: boolean | null
          lunch_box_eligible?: boolean | null
          name?: string
          price?: number
          serves_people?: number | null
          sub_category?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          price_per_unit: number
          product_id: string
          quantity: number
          tax_amount: number | null
          tax_rate: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          price_per_unit: number
          product_id: string
          quantity: number
          tax_amount?: number | null
          tax_rate?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          price_per_unit?: number
          product_id?: string
          quantity?: number
          tax_amount?: number | null
          tax_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_id: string | null
          cancelled_at: string | null
          card_brand: string | null
          card_exp_month: number | null
          card_exp_year: number | null
          card_last4: string | null
          created_at: string | null
          delivery_address_label: string | null
          delivery_address_line1: string | null
          delivery_city: string | null
          delivery_date: string | null
          delivery_distance: number | null
          delivery_fee: number | null
          delivery_postal_code: string | null
          delivery_state: string | null
          delivery_time: string | null
          delivery_zone: string | null
          discount_amount: number | null
          estimated_delivery_time: string | null
          fulfillment_status: string | null
          fulfillment_type: string
          id: string
          payment_method: string
          payment_status: string | null
          pickup_date: string | null
          pickup_ready_at: string | null
          pickup_reminder_scheduled_for: string | null
          pickup_reminder_sent_at: string | null
          pickup_time: string | null
          promo_code_id: string | null
          status: string
          stripe_session_id: string | null
          tax_amount: number | null
          taxable_amount: number | null
          total_amount: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address_id?: string | null
          cancelled_at?: string | null
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last4?: string | null
          created_at?: string | null
          delivery_address_label?: string | null
          delivery_address_line1?: string | null
          delivery_city?: string | null
          delivery_date?: string | null
          delivery_distance?: number | null
          delivery_fee?: number | null
          delivery_postal_code?: string | null
          delivery_state?: string | null
          delivery_time?: string | null
          delivery_zone?: string | null
          discount_amount?: number | null
          estimated_delivery_time?: string | null
          fulfillment_status?: string | null
          fulfillment_type?: string
          id?: string
          payment_method: string
          payment_status?: string | null
          pickup_date?: string | null
          pickup_ready_at?: string | null
          pickup_reminder_scheduled_for?: string | null
          pickup_reminder_sent_at?: string | null
          pickup_time?: string | null
          promo_code_id?: string | null
          status?: string
          stripe_session_id?: string | null
          tax_amount?: number | null
          taxable_amount?: number | null
          total_amount: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address_id?: string | null
          cancelled_at?: string | null
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last4?: string | null
          created_at?: string | null
          delivery_address_label?: string | null
          delivery_address_line1?: string | null
          delivery_city?: string | null
          delivery_date?: string | null
          delivery_distance?: number | null
          delivery_fee?: number | null
          delivery_postal_code?: string | null
          delivery_state?: string | null
          delivery_time?: string | null
          delivery_zone?: string | null
          discount_amount?: number | null
          estimated_delivery_time?: string | null
          fulfillment_status?: string | null
          fulfillment_type?: string
          id?: string
          payment_method?: string
          payment_status?: string | null
          pickup_date?: string | null
          pickup_ready_at?: string | null
          pickup_reminder_scheduled_for?: string | null
          pickup_reminder_sent_at?: string | null
          pickup_time?: string | null
          promo_code_id?: string | null
          status?: string
          stripe_session_id?: string | null
          tax_amount?: number | null
          taxable_amount?: number | null
          total_amount?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "user_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pickup_settings: {
        Row: {
          closing_time: string
          created_at: string | null
          default_max_orders_per_slot: number
          delivery_time_buffer_minutes: number | null
          id: string
          is_pickup_enabled: boolean
          last_order_cutoff_minutes: number
          max_days_advance: number
          min_advance_hours: number
          opening_time: string
          preparation_time_minutes: number
          store_address_line1: string
          store_address_line2: string | null
          store_city: string
          store_phone: string | null
          store_postal_code: string
          store_state: string
          timezone: string
          updated_at: string | null
          use_delivery_slots: boolean
        }
        Insert: {
          closing_time?: string
          created_at?: string | null
          default_max_orders_per_slot?: number
          delivery_time_buffer_minutes?: number | null
          id?: string
          is_pickup_enabled?: boolean
          last_order_cutoff_minutes?: number
          max_days_advance?: number
          min_advance_hours?: number
          opening_time?: string
          preparation_time_minutes?: number
          store_address_line1: string
          store_address_line2?: string | null
          store_city: string
          store_phone?: string | null
          store_postal_code: string
          store_state: string
          timezone?: string
          updated_at?: string | null
          use_delivery_slots?: boolean
        }
        Update: {
          closing_time?: string
          created_at?: string | null
          default_max_orders_per_slot?: number
          delivery_time_buffer_minutes?: number | null
          id?: string
          is_pickup_enabled?: boolean
          last_order_cutoff_minutes?: number
          max_days_advance?: number
          min_advance_hours?: number
          opening_time?: string
          preparation_time_minutes?: number
          store_address_line1?: string
          store_address_line2?: string | null
          store_city?: string
          store_phone?: string | null
          store_postal_code?: string
          store_state?: string
          timezone?: string
          updated_at?: string | null
          use_delivery_slots?: boolean
        }
        Relationships: []
      }
      pickup_slots: {
        Row: {
          created_at: string | null
          end_hour: number
          end_minute: number
          id: string
          is_active: boolean
          label: string
          max_orders_per_slot: number
          start_hour: number
          start_minute: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_hour: number
          end_minute: number
          id?: string
          is_active?: boolean
          label: string
          max_orders_per_slot?: number
          start_hour: number
          start_minute: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_hour?: number
          end_minute?: number
          id?: string
          is_active?: boolean
          label?: string
          max_orders_per_slot?: number
          start_hour?: number
          start_minute?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      print_jobs: {
        Row: {
          claimed_at: string | null
          created_at: string | null
          error_message: string | null
          failed_at: string | null
          id: string
          order_id: string
          printed_at: string | null
          retry_count: number | null
          status: string
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          order_id: string
          printed_at?: string | null
          retry_count?: number | null
          status?: string
        }
        Update: {
          claimed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          order_id?: string
          printed_at?: string | null
          retry_count?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "print_jobs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          auto_deactivated: boolean | null
          brand: string | null
          category_id: string
          created_at: string | null
          deactivated_by_category: boolean | null
          description: string | null
          has_default_image: boolean | null
          id: string
          image_url: string | null
          inventory_count: number | null
          inventory_weight: number | null
          is_active: boolean | null
          is_weighted: boolean | null
          low_stock_threshold: number | null
          low_stock_weight_threshold: number | null
          min_order_unit: string | null
          min_order_value: number | null
          name: string
          price_per_unit: number
          priority: number | null
          sub_category: string | null
          tags: string[] | null
          tax_rate: number | null
          track_inventory: boolean | null
          unit_of_measure: string | null
          upc_code: string | null
          updated_at: string | null
        }
        Insert: {
          auto_deactivated?: boolean | null
          brand?: string | null
          category_id: string
          created_at?: string | null
          deactivated_by_category?: boolean | null
          description?: string | null
          has_default_image?: boolean | null
          id?: string
          image_url?: string | null
          inventory_count?: number | null
          inventory_weight?: number | null
          is_active?: boolean | null
          is_weighted?: boolean | null
          low_stock_threshold?: number | null
          low_stock_weight_threshold?: number | null
          min_order_unit?: string | null
          min_order_value?: number | null
          name: string
          price_per_unit: number
          priority?: number | null
          sub_category?: string | null
          tags?: string[] | null
          tax_rate?: number | null
          track_inventory?: boolean | null
          unit_of_measure?: string | null
          upc_code?: string | null
          updated_at?: string | null
        }
        Update: {
          auto_deactivated?: boolean | null
          brand?: string | null
          category_id?: string
          created_at?: string | null
          deactivated_by_category?: boolean | null
          description?: string | null
          has_default_image?: boolean | null
          id?: string
          image_url?: string | null
          inventory_count?: number | null
          inventory_weight?: number | null
          is_active?: boolean | null
          is_weighted?: boolean | null
          low_stock_threshold?: number | null
          low_stock_weight_threshold?: number | null
          min_order_unit?: string | null
          min_order_value?: number | null
          name?: string
          price_per_unit?: number
          priority?: number | null
          sub_category?: string | null
          tags?: string[] | null
          tax_rate?: number | null
          track_inventory?: boolean | null
          unit_of_measure?: string | null
          upc_code?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          onboarding_shown: boolean | null
          phone_number: string | null
          profile_completed: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          onboarding_shown?: boolean | null
          phone_number?: string | null
          profile_completed?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          onboarding_shown?: boolean | null
          phone_number?: string | null
          profile_completed?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string | null
          current_uses: number | null
          description: string | null
          discount_amount: number | null
          discount_percentage: number | null
          discount_type: string
          discount_value: number | null
          end_date: string | null
          id: string
          is_active: boolean | null
          is_sitewide: boolean | null
          max_uses: number | null
          min_order_amount: number | null
          minimum_order_amount: number | null
          start_date: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          current_uses?: number | null
          description?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          discount_type: string
          discount_value?: number | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          is_sitewide?: boolean | null
          max_uses?: number | null
          min_order_amount?: number | null
          minimum_order_amount?: number | null
          start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          current_uses?: number | null
          description?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          discount_type?: string
          discount_value?: number | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          is_sitewide?: boolean | null
          max_uses?: number | null
          min_order_amount?: number | null
          minimum_order_amount?: number | null
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      recipe_products: {
        Row: {
          amount: number | null
          created_at: string
          display_order: number | null
          id: string
          notes: string | null
          product_id: string
          quantity: string | null
          recipe_id: string
          unit: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          display_order?: number | null
          id?: string
          notes?: string | null
          product_id: string
          quantity?: string | null
          recipe_id: string
          unit?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          display_order?: number | null
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: string | null
          recipe_id?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_products_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          cook_time_minutes: number | null
          created_at: string
          description: string | null
          difficulty: string | null
          display_order: number
          id: string
          image_url: string
          ingredients: string | null
          instructions: string | null
          is_active: boolean
          prep_time_minutes: number | null
          servings: number | null
          title: string
          updated_at: string
        }
        Insert: {
          cook_time_minutes?: number | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          display_order?: number
          id?: string
          image_url: string
          ingredients?: string | null
          instructions?: string | null
          is_active?: boolean
          prep_time_minutes?: number | null
          servings?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          cook_time_minutes?: number | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          display_order?: number
          id?: string
          image_url?: string
          ingredients?: string | null
          instructions?: string | null
          is_active?: boolean
          prep_time_minutes?: number | null
          servings?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          created_at: string
          customer_image: string | null
          customer_name: string
          display_order: number
          id: string
          is_active: boolean
          rating: number
          review: string
          source: string
          status: string
          updated_at: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          customer_image?: string | null
          customer_name: string
          display_order?: number
          id?: string
          is_active?: boolean
          rating: number
          review: string
          source?: string
          status?: string
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          customer_image?: string | null
          customer_name?: string
          display_order?: number
          id?: string
          is_active?: boolean
          rating?: number
          review?: string
          source?: string
          status?: string
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      tiktok_sync_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          status: string | null
          sync_completed_at: string | null
          sync_started_at: string | null
          videos_added: number | null
          videos_fetched: number | null
          videos_updated: number | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          status?: string | null
          sync_completed_at?: string | null
          sync_started_at?: string | null
          videos_added?: number | null
          videos_fetched?: number | null
          videos_updated?: number | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          status?: string | null
          sync_completed_at?: string | null
          sync_started_at?: string | null
          videos_added?: number | null
          videos_fetched?: number | null
          videos_updated?: number | null
        }
        Relationships: []
      }
      tiktok_video_products: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          product_id: string
          tiktok_video_id: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          product_id: string
          tiktok_video_id: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          product_id?: string
          tiktok_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tiktok_video_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tiktok_video_products_tiktok_video_id_fkey"
            columns: ["tiktok_video_id"]
            isOneToOne: false
            referencedRelation: "tiktok_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      tiktok_videos: {
        Row: {
          author_name: string | null
          author_url: string | null
          created_at: string | null
          display_order: number | null
          duration: number | null
          embed_html: string | null
          id: string
          is_active: boolean | null
          like_count: number | null
          published_at: string | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string | null
          video_file_url: string | null
          video_id: string
          video_url: string
          view_count: number | null
        }
        Insert: {
          author_name?: string | null
          author_url?: string | null
          created_at?: string | null
          display_order?: number | null
          duration?: number | null
          embed_html?: string | null
          id?: string
          is_active?: boolean | null
          like_count?: number | null
          published_at?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
          video_file_url?: string | null
          video_id: string
          video_url: string
          view_count?: number | null
        }
        Update: {
          author_name?: string | null
          author_url?: string | null
          created_at?: string | null
          display_order?: number | null
          duration?: number | null
          embed_html?: string | null
          id?: string
          is_active?: boolean | null
          like_count?: number | null
          published_at?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
          video_file_url?: string | null
          video_id?: string
          video_url?: string
          view_count?: number | null
        }
        Relationships: []
      }
      user_addresses: {
        Row: {
          address_line1: string
          city: string
          created_at: string | null
          distance_calculated_at: string | null
          distance_from_store: number | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          label: string
          latitude: number | null
          longitude: number | null
          postal_code: string
          state: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address_line1: string
          city: string
          created_at?: string | null
          distance_calculated_at?: string | null
          distance_from_store?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          label: string
          latitude?: number | null
          longitude?: number | null
          postal_code: string
          state: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address_line1?: string
          city?: string
          created_at?: string | null
          distance_calculated_at?: string | null
          distance_from_store?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          label?: string
          latitude?: number | null
          longitude?: number | null
          postal_code?: string
          state?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auto_generate_subscription_deliveries: {
        Args: { p_subscription_id: string }
        Returns: number
      }
      bulk_generate_missing_deliveries: {
        Args: never
        Returns: {
          generated_count: number
          subscription_id: string
        }[]
      }
      calculate_next_delivery_date: {
        Args: { p_subscription_id: string }
        Returns: string
      }
      check_product_inventory: {
        Args: { product_id: string; requested_quantity: number }
        Returns: boolean
      }
      deduct_product_inventory: {
        Args: { product_id: string; quantity: number }
        Returns: boolean
      }
      generate_deliveries_for_subscription: {
        Args: { p_delivery_dates: string[]; p_subscription_id: string }
        Returns: undefined
      }
      get_category_product_stats: {
        Args: { category_id_param: string }
        Returns: {
          active_products: number
          auto_inactive: number
          inactive_products: number
          manually_inactive: number
          total_products: number
        }[]
      }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      restore_product_inventory: {
        Args: { product_id: string; quantity: number }
        Returns: boolean
      }
      validate_profile_access: {
        Args: { profile_id: string; requesting_user_id: string }
        Returns: boolean
      }
      validate_promo_code: {
        Args: { _code: string; _order_amount: number; _user_id: string }
        Returns: {
          discount: number
          message: string
          promo_id: string
          valid: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
