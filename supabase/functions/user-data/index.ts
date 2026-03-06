// deno-lint-ignore-file no-explicit-any
/// <reference lib="deno.ns" />

/**
 * User Data Gateway — authenticated user data access via Clerk JWT.
 *
 * All queries use the service role client but are scoped to the
 * verified userId from the JWT. This replaces direct anon-key
 * access to sensitive tables.
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { authenticateRequest } from "../_shared/clerk-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

// --------------- Action handlers ---------------

async function handleProfileGet(db: any, userId: string) {
  const { data, error } = await db
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return jsonResponse({ data });
}

async function handleProfileUpdate(db: any, userId: string, payload: any) {
  const allowed = ["full_name", "phone_number", "profile_completed", "onboarding_shown"];
  const updates: any = {};
  for (const key of allowed) {
    if (payload[key] !== undefined) updates[key] = payload[key];
  }
  if (Object.keys(updates).length === 0) {
    return errorResponse("No valid fields to update");
  }
  const { data, error } = await db
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();
  if (error) throw error;
  return jsonResponse({ data });
}

// --- Addresses ---

async function handleAddressesList(db: any, userId: string) {
  const { data, error } = await db
    .from("user_addresses")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return jsonResponse({ data });
}

async function handleAddressesGet(db: any, userId: string, payload: any) {
  const { data, error } = await db
    .from("user_addresses")
    .select("*")
    .eq("id", payload.id)
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  return jsonResponse({ data });
}

async function handleAddressesCreate(db: any, userId: string, payload: any) {
  const { data, error } = await db
    .from("user_addresses")
    .insert({
      user_id: userId,
      label: payload.label,
      address_line1: payload.address_line1,
      city: payload.city,
      state: payload.state,
      postal_code: payload.postal_code,
      is_default: payload.is_default || false,
      is_active: true,
    })
    .select()
    .single();
  if (error) throw error;
  return jsonResponse({ data }, 201);
}

async function handleAddressesUpdate(db: any, userId: string, payload: any) {
  if (!payload.id) return errorResponse("Missing address id");
  const allowed = ["label", "address_line1", "city", "state", "postal_code", "is_default"];
  const updates: any = {};
  for (const key of allowed) {
    if (payload[key] !== undefined) updates[key] = payload[key];
  }
  const { data, error } = await db
    .from("user_addresses")
    .update(updates)
    .eq("id", payload.id)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return jsonResponse({ data });
}

async function handleAddressesDelete(db: any, userId: string, payload: any) {
  if (!payload.id) return errorResponse("Missing address id");
  // Soft delete
  const { error } = await db
    .from("user_addresses")
    .update({ is_active: false })
    .eq("id", payload.id)
    .eq("user_id", userId);
  if (error) throw error;
  return jsonResponse({ success: true });
}

async function handleAddressesSetDefault(db: any, userId: string, payload: any) {
  if (!payload.id) return errorResponse("Missing address id");
  // Unset all defaults for this user
  await db
    .from("user_addresses")
    .update({ is_default: false })
    .eq("user_id", userId);
  // Set the new default
  const { data, error } = await db
    .from("user_addresses")
    .update({ is_default: true })
    .eq("id", payload.id)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return jsonResponse({ data });
}

// --- Cart ---

async function getOrCreateCart(db: any, userId: string): Promise<string> {
  const { data: existing } = await db
    .from("carts")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (existing) return existing.id;

  const { data: created, error } = await db
    .from("carts")
    .insert({ user_id: userId })
    .select("id")
    .single();
  if (error) throw error;
  return created.id;
}

async function handleCartGet(db: any, userId: string) {
  const cartId = await getOrCreateCart(db, userId);

  const { data: items, error } = await db
    .from("cart_items")
    .select(`
      id,
      product_id,
      quantity,
      weight,
      discount_percentage,
      flash_deal_id,
      products:product_id (
        id, name, price_per_unit, is_weighted, unit_of_measure,
        image_url, tax_rate, category_id, min_order_value,
        min_order_unit, is_active
      )
    `)
    .eq("cart_id", cartId);

  if (error) throw error;

  // Reshape to match frontend CartItem shape
  const shaped = (items || []).map((item: any) => ({
    id: item.id,
    product_id: item.product_id,
    quantity: item.quantity,
    weight: item.weight,
    discount_percentage: item.discount_percentage,
    flash_deal_id: item.flash_deal_id,
    product: item.products,
  }));

  // Fetch combo items in cart
  const { data: comboCartItems, error: comboError } = await db
    .from("cart_combo_items")
    .select(`
      id,
      combo_id,
      quantity,
      selected_addon_ids,
      product_combos:combo_id (
        id, name, description, image_url, combo_price
      )
    `)
    .eq("cart_id", cartId);

  if (comboError) throw comboError;

  // For each combo cart item, fetch its combo_items with product details
  const shapedCombos = await Promise.all(
    (comboCartItems || []).map(async (cci: any) => {
      const { data: items } = await db
        .from("combo_items")
        .select(`
          id, product_id, quantity, weight, is_addon, addon_price, position,
          products:product_id (id, name, price_per_unit, image_url, is_weighted, unit_of_measure)
        `)
        .eq("combo_id", cci.combo_id)
        .order("position");

      return {
        id: cci.id,
        combo_id: cci.combo_id,
        quantity: cci.quantity,
        selected_addon_ids: cci.selected_addon_ids || [],
        combo: {
          ...cci.product_combos,
          items: (items || []).map((i: any) => ({
            id: i.id,
            product_id: i.product_id,
            quantity: i.quantity,
            weight: i.weight,
            is_addon: i.is_addon,
            addon_price: i.addon_price,
            position: i.position,
            product: i.products,
          })),
        },
      };
    })
  );

  return jsonResponse({ data: shaped, comboData: shapedCombos, cartId });
}

async function handleCartAddItem(db: any, userId: string, payload: any) {
  const cartId = await getOrCreateCart(db, userId);

  // Check if item already exists
  const { data: existing } = await db
    .from("cart_items")
    .select("id, quantity, weight")
    .eq("cart_id", cartId)
    .eq("product_id", payload.product_id)
    .maybeSingle();

  if (existing) {
    const updates: any = {};
    if (payload.weight !== undefined) {
      updates.weight = payload.weight;
    } else {
      updates.quantity = (existing.quantity || 0) + (payload.quantity || 1);
    }
    if (payload.discount_percentage !== undefined) {
      updates.discount_percentage = payload.discount_percentage;
    }
    if (payload.flash_deal_id !== undefined) {
      updates.flash_deal_id = payload.flash_deal_id;
    }

    const { data, error } = await db
      .from("cart_items")
      .update(updates)
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw error;
    return jsonResponse({ data });
  }

  const { data, error } = await db
    .from("cart_items")
    .insert({
      cart_id: cartId,
      product_id: payload.product_id,
      quantity: payload.quantity || 1,
      weight: payload.weight || null,
      discount_percentage: payload.discount_percentage || null,
      flash_deal_id: payload.flash_deal_id || null,
    })
    .select()
    .single();
  if (error) throw error;
  return jsonResponse({ data }, 201);
}

async function handleCartUpdateQuantity(db: any, userId: string, payload: any) {
  if (!payload.id) return errorResponse("Missing cart item id");
  const cartId = await getOrCreateCart(db, userId);

  if (payload.quantity <= 0) {
    // Remove item
    const { error } = await db
      .from("cart_items")
      .delete()
      .eq("id", payload.id)
      .eq("cart_id", cartId);
    if (error) throw error;
    return jsonResponse({ success: true, removed: true });
  }

  const { data, error } = await db
    .from("cart_items")
    .update({ quantity: payload.quantity })
    .eq("id", payload.id)
    .eq("cart_id", cartId)
    .select()
    .single();
  if (error) throw error;
  return jsonResponse({ data });
}

async function handleCartUpdateWeight(db: any, userId: string, payload: any) {
  if (!payload.id) return errorResponse("Missing cart item id");
  const cartId = await getOrCreateCart(db, userId);

  const { data, error } = await db
    .from("cart_items")
    .update({ weight: payload.weight })
    .eq("id", payload.id)
    .eq("cart_id", cartId)
    .select()
    .single();
  if (error) throw error;
  return jsonResponse({ data });
}

async function handleCartRemoveItem(db: any, userId: string, payload: any) {
  if (!payload.id) return errorResponse("Missing cart item id");
  const cartId = await getOrCreateCart(db, userId);

  const { error } = await db
    .from("cart_items")
    .delete()
    .eq("id", payload.id)
    .eq("cart_id", cartId);
  if (error) throw error;
  return jsonResponse({ success: true });
}

// --- Cart Combos ---

async function handleCartAddCombo(db: any, userId: string, payload: any) {
  const cartId = await getOrCreateCart(db, userId);

  const { data, error } = await db
    .from("cart_combo_items")
    .insert({
      cart_id: cartId,
      combo_id: payload.combo_id,
      quantity: 1,
      selected_addon_ids: payload.selected_addon_ids || [],
    })
    .select()
    .single();
  if (error) throw error;
  return jsonResponse({ data }, 201);
}

async function handleCartRemoveCombo(db: any, userId: string, payload: any) {
  if (!payload.id) return errorResponse("Missing cart combo item id");
  const cartId = await getOrCreateCart(db, userId);

  const { error } = await db
    .from("cart_combo_items")
    .delete()
    .eq("id", payload.id)
    .eq("cart_id", cartId);
  if (error) throw error;
  return jsonResponse({ success: true });
}

async function handleCartUpdateComboQuantity(db: any, userId: string, payload: any) {
  if (!payload.id) return errorResponse("Missing cart combo item id");
  const cartId = await getOrCreateCart(db, userId);

  if (payload.quantity <= 0) {
    const { error } = await db
      .from("cart_combo_items")
      .delete()
      .eq("id", payload.id)
      .eq("cart_id", cartId);
    if (error) throw error;
    return jsonResponse({ success: true, removed: true });
  }

  const { data, error } = await db
    .from("cart_combo_items")
    .update({ quantity: payload.quantity })
    .eq("id", payload.id)
    .eq("cart_id", cartId)
    .select()
    .single();
  if (error) throw error;
  return jsonResponse({ data });
}

async function handleCartToggleComboAddon(db: any, userId: string, payload: any) {
  if (!payload.id) return errorResponse("Missing cart combo item id");
  const cartId = await getOrCreateCart(db, userId);

  const { data, error } = await db
    .from("cart_combo_items")
    .update({ selected_addon_ids: payload.selected_addon_ids })
    .eq("id", payload.id)
    .eq("cart_id", cartId)
    .select()
    .single();
  if (error) throw error;
  return jsonResponse({ data });
}

// --- Orders ---

async function handleOrdersList(db: any, userId: string) {
  const { data, error } = await db
    .from("orders")
    .select(`
      *,
      order_items (
        id, product_id, quantity, price_per_unit, tax_rate, tax_amount,
        products:product_id ( name, image_url, is_weighted, unit_of_measure )
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return jsonResponse({ data });
}

async function handleOrdersGet(db: any, userId: string, payload: any) {
  if (!payload.id) return errorResponse("Missing order id");
  const { data, error } = await db
    .from("orders")
    .select(`
      *,
      order_items (
        id, product_id, quantity, price_per_unit, tax_rate, tax_amount,
        products:product_id ( name, image_url, is_weighted, unit_of_measure )
      )
    `)
    .eq("id", payload.id)
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  return jsonResponse({ data });
}

// --- Reviews ---

async function handleReviewSubmit(db: any, userId: string, payload: any) {
  const { data, error } = await db
    .from("testimonials")
    .insert({
      user_id: userId,
      customer_name: payload.customer_name,
      rating: payload.rating,
      review_text: payload.review_text,
      image_url: payload.image_url || null,
      status: "pending",
    })
    .select()
    .single();
  if (error) throw error;
  return jsonResponse({ data }, 201);
}

// --- Catering ---

async function handleCateringSubmit(db: any, userId: string, payload: any) {
  const { data, error } = await db
    .from("catering_requests")
    .insert({
      user_id: userId,
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      event_date: payload.event_date,
      event_type: payload.event_type,
      guest_count: payload.guest_count,
      message: payload.message,
      budget_range: payload.budget_range || null,
    })
    .select()
    .single();
  if (error) throw error;
  return jsonResponse({ data }, 201);
}

// --------------- Router ---------------

const actionHandlers: Record<string, (db: any, userId: string, payload: any) => Promise<Response>> = {
  "profile.get": handleProfileGet,
  "profile.update": handleProfileUpdate,
  "addresses.list": handleAddressesList,
  "addresses.get": handleAddressesGet,
  "addresses.create": handleAddressesCreate,
  "addresses.update": handleAddressesUpdate,
  "addresses.delete": handleAddressesDelete,
  "addresses.setDefault": handleAddressesSetDefault,
  "cart.get": handleCartGet,
  "cart.addItem": handleCartAddItem,
  "cart.updateQuantity": handleCartUpdateQuantity,
  "cart.updateWeight": handleCartUpdateWeight,
  "cart.removeItem": handleCartRemoveItem,
  "cart.addCombo": handleCartAddCombo,
  "cart.removeCombo": handleCartRemoveCombo,
  "cart.updateComboQuantity": handleCartUpdateComboQuantity,
  "cart.toggleComboAddon": handleCartToggleComboAddon,
  "orders.list": handleOrdersList,
  "orders.get": handleOrdersGet,
  "review.submit": handleReviewSubmit,
  "catering.submit": handleCateringSubmit,
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const db = getServiceClient();

    // Authenticate
    const authHeader = req.headers.get("Authorization");
    let userId: string;

    try {
      userId = await authenticateRequest(authHeader, db, false);
    } catch (authError: any) {
      return errorResponse("Unauthorized: " + authError.message, 401);
    }

    const body = await req.json();
    const { action, ...payload } = body;

    if (!action || typeof action !== "string") {
      return errorResponse("Missing or invalid 'action' field");
    }

    const handler = actionHandlers[action];
    if (!handler) {
      return errorResponse(`Unknown action: ${action}`);
    }

    return await handler(db, userId, payload);
  } catch (error: any) {
    console.error("user-data error:", error);
    return errorResponse(error.message || "Internal server error", 500);
  }
});
