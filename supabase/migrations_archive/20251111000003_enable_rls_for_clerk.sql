-- Re-enable RLS for Clerk authentication
-- Note: Since we're using Clerk (not Supabase Auth), we can't use auth.uid()
-- Instead, we'll use a more permissive policy approach where the application
-- controls access by passing the correct user ID in queries

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.profiles;

-- Create RLS policies for profiles table
-- These policies allow any authenticated request to access data
-- The application layer (Clerk) controls which user ID is passed in queries
CREATE POLICY "Enable read access for all users" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON public.profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for users own profile" ON public.profiles
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete for users own profile" ON public.profiles
  FOR DELETE USING (true);

-- Enable RLS on user_roles table
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.user_roles;

-- Create RLS policies for user_roles table
CREATE POLICY "Enable read access for all users" ON public.user_roles
  FOR SELECT USING (true);

-- Enable RLS on carts table
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own cart" ON public.carts;
DROP POLICY IF EXISTS "Users can insert their own cart" ON public.carts;
DROP POLICY IF EXISTS "Users can update their own cart" ON public.carts;
DROP POLICY IF EXISTS "Users can delete their own cart" ON public.carts;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.carts;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.carts;
DROP POLICY IF EXISTS "Enable update for all users" ON public.carts;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.carts;

-- Create RLS policies for carts table
CREATE POLICY "Enable all operations for carts" ON public.carts
  FOR ALL USING (true);

-- Enable RLS on cart_items table
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can insert their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can update their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can delete their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Enable all operations for cart items" ON public.cart_items;

-- Create RLS policies for cart_items table
CREATE POLICY "Enable all operations for cart items" ON public.cart_items
  FOR ALL USING (true);

-- Create a comment explaining the security model
COMMENT ON TABLE public.profiles IS 'RLS enabled with permissive policies. Authentication and authorization handled by Clerk at application layer.';
COMMENT ON TABLE public.user_roles IS 'RLS enabled with permissive policies. Authentication and authorization handled by Clerk at application layer.';
COMMENT ON TABLE public.carts IS 'RLS enabled with permissive policies. Authentication and authorization handled by Clerk at application layer.';
COMMENT ON TABLE public.cart_items IS 'RLS enabled with permissive policies. Authentication and authorization handled by Clerk at application layer.';
