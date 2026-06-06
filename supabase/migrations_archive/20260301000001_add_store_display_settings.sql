-- Add store display settings to delivery_settings (used as generic key-value store)
INSERT INTO delivery_settings (key, value, description)
VALUES ('show_tax_on_product_cards', 'true', 'Show tax amount on product cards in the product grid')
ON CONFLICT (key) DO NOTHING;
