-- Fix the Spices & Masala collection image URL
UPDATE public.collections
SET image_url = 'https://images.unsplash.com/photo-1596040033229-a0b57a1790d8?auto=format&fit=crop&w=400&q=80'
WHERE name = 'Spices & Masala';
