INSERT INTO delivery_settings (key, value, description)
VALUES (
  'delivery_minimum_order_amount',
  '50',
  'Minimum cart subtotal (USD, before tax/delivery fee) required to place a delivery order. Customers under this threshold must add more items, switch to pickup, or use nationwide shipping.'
)
ON CONFLICT (key) DO NOTHING;
