-- Add address snapshot fields to orders table
-- This ensures order addresses are immutable and don't change if user modifies/deletes their saved addresses
ALTER TABLE orders
ADD COLUMN delivery_address_line1 TEXT,
ADD COLUMN delivery_city TEXT,
ADD COLUMN delivery_state TEXT,
ADD COLUMN delivery_postal_code TEXT,
ADD COLUMN delivery_address_label TEXT;

-- Add comments for documentation
COMMENT ON COLUMN orders.delivery_address_line1 IS 'Snapshot of delivery address at order time (immutable)';
COMMENT ON COLUMN orders.delivery_city IS 'Snapshot of delivery city at order time (immutable)';
COMMENT ON COLUMN orders.delivery_state IS 'Snapshot of delivery state at order time (immutable)';
COMMENT ON COLUMN orders.delivery_postal_code IS 'Snapshot of delivery postal code at order time (immutable)';
COMMENT ON COLUMN orders.delivery_address_label IS 'Snapshot of delivery address label at order time (immutable, e.g., Home, Work)';
COMMENT ON COLUMN orders.address_id IS 'Reference to user_addresses table for historical tracking (address may be modified or deleted by user)';
