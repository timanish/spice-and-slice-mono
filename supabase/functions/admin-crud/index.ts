// deno-lint-ignore-file no-explicit-any
/// <reference lib="deno.ns" />

/**
 * Admin CRUD Gateway — generic write/read proxy for admin users.
 *
 * Verifies Clerk JWT + admin role, enforces a table whitelist,
 * then proxies the requested operation via the service role client.
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { authenticateRequest } from "../_shared/clerk-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Tables that admins may operate on
const TABLE_WHITELIST = new Set([
  "products",
  "categories",
  "collections",
  "menu_items",
  "promo_codes",
  "flash_deals",
  "featured_products",
  "hero_slides",
  "testimonials",
  "festivals",
  "festival_products",
  "recipes",
  "recipe_products",
  "delivery_zones",
  "delivery_time_slots",
  "delivery_settings",
  "pickup_settings",
  "pickup_slots",
  "tiktok_videos",
  "tiktok_video_products",
  "orders",
  "order_items",
  "lunch_box_subscriptions",
  "lunch_box_deliveries",
  "print_jobs",
  // Read-only via this endpoint for admin dashboards:
  "profiles",
  "user_addresses",
  "catering_requests",
]);

// Tables admin can read but NOT mutate (select only)
const READ_ONLY_TABLES = new Set([
  "profiles",
  "user_addresses",
  "catering_requests",
]);

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

interface FilterSpec {
  column: string;
  operator: string;
  value: any;
}

function applyFilters(query: any, filters: FilterSpec[]) {
  for (const f of filters) {
    switch (f.operator) {
      case "eq":
        query = query.eq(f.column, f.value);
        break;
      case "neq":
        query = query.neq(f.column, f.value);
        break;
      case "gt":
        query = query.gt(f.column, f.value);
        break;
      case "gte":
        query = query.gte(f.column, f.value);
        break;
      case "lt":
        query = query.lt(f.column, f.value);
        break;
      case "lte":
        query = query.lte(f.column, f.value);
        break;
      case "like":
        query = query.like(f.column, f.value);
        break;
      case "ilike":
        query = query.ilike(f.column, f.value);
        break;
      case "in":
        query = query.in(f.column, f.value);
        break;
      case "is":
        query = query.is(f.column, f.value);
        break;
      default:
        throw new Error(`Unsupported filter operator: ${f.operator}`);
    }
  }
  return query;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const db = getServiceClient();

    // Authenticate — require admin role
    const authHeader = req.headers.get("Authorization");
    let userId: string;

    try {
      userId = await authenticateRequest(authHeader, db, true);
    } catch (authError: any) {
      return errorResponse("Unauthorized: " + authError.message, 401);
    }

    const body = await req.json();
    const {
      table,
      operation,
      data,
      filters = [],
      select: selectColumns = "*",
      order,
      limit,
      offset,
      count,
    } = body;

    // Validate table
    if (!table || typeof table !== "string") {
      return errorResponse("Missing or invalid 'table' field");
    }
    if (!TABLE_WHITELIST.has(table)) {
      return errorResponse(`Table '${table}' is not allowed`);
    }

    // Validate operation
    const validOps = ["select", "insert", "update", "delete", "upsert"];
    if (!operation || !validOps.includes(operation)) {
      return errorResponse(
        `Invalid operation '${operation}'. Must be one of: ${validOps.join(", ")}`,
      );
    }

    // Block writes on read-only tables
    if (READ_ONLY_TABLES.has(table) && operation !== "select") {
      return errorResponse(
        `Table '${table}' is read-only via admin-crud. Only 'select' is allowed.`,
      );
    }

    console.log(`Admin ${userId} → ${operation} on ${table}`);

    // Execute operation
    switch (operation) {
      case "select": {
        let query = db.from(table).select(selectColumns, count ? { count: "exact" } : undefined);
        if (filters.length > 0) {
          query = applyFilters(query, filters);
        }
        if (order) {
          query = query.order(order.column, {
            ascending: order.ascending !== false,
          });
        }
        if (limit) {
          const start = offset || 0;
          query = query.range(start, start + limit - 1);
        }

        const result = await query;
        if (result.error) throw result.error;
        return jsonResponse({
          data: result.data,
          ...(result.count !== undefined && result.count !== null
            ? { count: result.count }
            : {}),
        });
      }

      case "insert": {
        if (!data) return errorResponse("Missing 'data' for insert");
        const { data: inserted, error } = await db
          .from(table)
          .insert(data)
          .select(selectColumns);
        if (error) throw error;
        return jsonResponse({ data: inserted }, 201);
      }

      case "update": {
        if (!data) return errorResponse("Missing 'data' for update");
        if (filters.length === 0) {
          return errorResponse("Update requires at least one filter to prevent accidental bulk updates");
        }
        let query = db.from(table).update(data);
        query = applyFilters(query, filters);
        const { data: updated, error } = await query.select(selectColumns);
        if (error) throw error;
        return jsonResponse({ data: updated });
      }

      case "delete": {
        if (filters.length === 0) {
          return errorResponse("Delete requires at least one filter to prevent accidental bulk deletes");
        }
        let query = db.from(table).delete();
        query = applyFilters(query, filters);
        const { data: deleted, error } = await query.select(selectColumns);
        if (error) throw error;
        return jsonResponse({ data: deleted });
      }

      case "upsert": {
        if (!data) return errorResponse("Missing 'data' for upsert");
        const { data: upserted, error } = await db
          .from(table)
          .upsert(data)
          .select(selectColumns);
        if (error) throw error;
        return jsonResponse({ data: upserted });
      }

      default:
        return errorResponse(`Unhandled operation: ${operation}`);
    }
  } catch (error: any) {
    console.error("admin-crud error:", error);
    return errorResponse(error.message || "Internal server error", 500);
  }
});
