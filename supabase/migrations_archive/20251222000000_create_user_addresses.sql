-- Create user_addresses table for multiple delivery addresses per user
CREATE TABLE user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,  -- References profiles.id (Clerk user ID)
  
  -- Address fields (no address_line2 - users create separate entries for different locations)
  label TEXT NOT NULL,  -- e.g., "Home", "Work", "Office", "Mom's House"
  address_line1 TEXT NOT NULL,  -- Full street address including apt/suite if needed
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  
  -- Delivery calculation (calculated per address via edge function)
  distance_from_store DECIMAL(10, 2),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  distance_calculated_at TIMESTAMPTZ,
  
  -- Flags
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user address lookups
CREATE INDEX idx_user_addresses_user_id ON user_addresses(user_id);
CREATE INDEX idx_user_addresses_user_default ON user_addresses(user_id, is_default) WHERE is_default = true;
CREATE INDEX idx_user_addresses_active ON user_addresses(user_id, is_active) WHERE is_active = true;

-- Disable RLS (consistent with profiles table pattern)
ALTER TABLE user_addresses DISABLE ROW LEVEL SECURITY;

-- Note: Address fields were never added to profiles table in the current schema
-- Users will add addresses directly to user_addresses table via the application
-- Migration from profiles table is not needed as those columns don't exist

-- Add address_id column to orders table to track which address was used
ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_id UUID REFERENCES user_addresses(id);

-- Create index for orders by address
CREATE INDEX idx_orders_address_id ON orders(address_id);

-- Add comment explaining the migration
COMMENT ON TABLE user_addresses IS 'Stores multiple delivery addresses per user. Each address is a separate entry (no address_line2). Replaces single address storage in profiles table.';
COMMENT ON COLUMN user_addresses.label IS 'User-defined label like Home, Work, etc. Used for quick identification during checkout.';
COMMENT ON COLUMN user_addresses.address_line1 IS 'Full street address including apartment/suite/unit number. No separate line2 field.';
COMMENT ON COLUMN user_addresses.is_default IS 'True for the users preferred/primary address. Auto-selected at checkout.';
