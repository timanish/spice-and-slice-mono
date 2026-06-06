INSERT INTO delivery_settings (key, value, description)
VALUES ('lunch_box_enabled', 'true', 'Enable or disable the Lunch Box program page. When disabled, shows a Coming Soon page.')
ON CONFLICT (key) DO NOTHING;
