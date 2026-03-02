-- Update Zone 0 (0-5 Miles) and Zone 1 (5-10 Miles) delivery settings
-- Both zones now have $5.99 delivery fee with free shipping above $100

-- Update Zone 0 (0-5 Miles): Add $5.99 delivery fee, $100 free shipping threshold
UPDATE delivery_zones 
SET 
  zone_name = 'Zone 0: 0-5 Miles',
  delivery_fee = 5.99,
  free_shipping_threshold = 100.0,
  updated_at = NOW()
WHERE 
  min_distance = 0.0 
  AND max_distance = 5.0;

-- Add comment documenting the change
COMMENT ON TABLE delivery_zones IS 'Configuration for distance-based delivery zones and fees. Updated 2025-12-19: Zone 0 (0-5 miles) and Zone 1 (5-10 miles) both now charge $5.99 with free shipping above $100';
