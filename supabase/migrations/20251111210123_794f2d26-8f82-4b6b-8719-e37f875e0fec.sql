-- Drop existing permissive policies
DROP POLICY IF EXISTS "Enable all operations for carts" ON public.carts;
DROP POLICY IF EXISTS "Enable all operations for cart items" ON public.cart_items;

-- Create restrictive policies for carts table
CREATE POLICY "Users can view their own cart"
ON public.carts
FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create their own cart"
ON public.carts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own cart"
ON public.carts
FOR UPDATE
TO authenticated
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own cart"
ON public.carts
FOR DELETE
TO authenticated
USING (auth.uid()::text = user_id);

-- Create restrictive policies for cart_items table
CREATE POLICY "Users can view their own cart items"
ON public.cart_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.carts
    WHERE carts.id = cart_items.cart_id
    AND carts.user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can add items to their own cart"
ON public.cart_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.carts
    WHERE carts.id = cart_items.cart_id
    AND carts.user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can update items in their own cart"
ON public.cart_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.carts
    WHERE carts.id = cart_items.cart_id
    AND carts.user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can delete items from their own cart"
ON public.cart_items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.carts
    WHERE carts.id = cart_items.cart_id
    AND carts.user_id = auth.uid()::text
  )
);