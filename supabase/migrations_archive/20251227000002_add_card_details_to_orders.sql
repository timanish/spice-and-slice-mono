-- Add card payment details to orders table
-- These fields store minimal card information for display purposes (last 4 digits, brand, expiration)
ALTER TABLE orders
ADD COLUMN card_last4 TEXT,
ADD COLUMN card_brand TEXT,
ADD COLUMN card_exp_month INTEGER,
ADD COLUMN card_exp_year INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN orders.card_last4 IS 'Last 4 digits of card used for payment (for display only)';
COMMENT ON COLUMN orders.card_brand IS 'Card brand (e.g., visa, mastercard, amex, discover)';
COMMENT ON COLUMN orders.card_exp_month IS 'Card expiration month (1-12)';
COMMENT ON COLUMN orders.card_exp_year IS 'Card expiration year (e.g., 2025)';
