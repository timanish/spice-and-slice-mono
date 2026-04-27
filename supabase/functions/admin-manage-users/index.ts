/**
 * admin-manage-users
 *
 * Admin-only gateway for listing users and changing their role.
 *
 * Actions:
 *   - "list":       Paginated profiles with current role.
 *                   Body: { search?, limit?, offset? }
 *                   Returns: { users: [...], total }
 *   - "set_role":   Promote/demote a user. Idempotent: deletes any existing
 *                   user_roles rows for the target and inserts one with the
 *                   requested role. Self-demotion is blocked to avoid lockout.
 *                   Body: { targetUserId, role: "admin" | "user" }
 *                   Returns: { success: true, role }
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { authenticateRequest } from "../_shared/clerk-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const getServiceRoleClient = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  return createClient(supabaseUrl, serviceRoleKey);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const serviceClient = getServiceRoleClient();

    const authHeader =
      req.headers.get("Authorization") || req.headers.get("authorization");
    let adminUserId: string;

    try {
      adminUserId = await authenticateRequest(authHeader, serviceClient, true);
    } catch (authError) {
      const isForbidden = authError.message === "Admin access required";
      return new Response(
        JSON.stringify({
          error: isForbidden ? "Forbidden - Admin access required" : "Unauthorized",
          details: authError.message,
        }),
        {
          status: isForbidden ? 403 : 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { action } = body || {};

    if (action === "list") {
      const search = typeof body.search === "string" ? body.search.trim() : "";
      const limit = Math.min(Math.max(Number(body.limit) || 50, 1), 200);
      const offset = Math.max(Number(body.offset) || 0, 0);

      let query = serviceClient
        .from("profiles")
        .select("id, full_name, email, phone_number, created_at, is_guest", { count: "exact" })
        .order("created_at", { ascending: false });

      if (search) {
        // Match against email or full_name. Escape % and _ to keep ilike safe.
        const escaped = search.replace(/[\\%_]/g, "\\$&");
        query = query.or(`email.ilike.%${escaped}%,full_name.ilike.%${escaped}%`);
      }

      const { data: profiles, error: profilesError, count } = await query.range(
        offset,
        offset + limit - 1,
      );

      if (profilesError) {
        console.error("Failed to list profiles:", profilesError);
        return new Response(
          JSON.stringify({ error: "Failed to list users", details: profilesError.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const userIds = (profiles || []).map((p) => p.id);
      let rolesByUser = new Map<string, string>();

      if (userIds.length > 0) {
        const { data: roleRows, error: rolesError } = await serviceClient
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", userIds);

        if (rolesError) {
          console.error("Failed to fetch roles:", rolesError);
          return new Response(
            JSON.stringify({ error: "Failed to fetch roles", details: rolesError.message }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        // If a user has multiple rows (no unique constraint), prefer "admin".
        for (const row of roleRows || []) {
          const current = rolesByUser.get(row.user_id);
          if (current === "admin") continue;
          rolesByUser.set(row.user_id, row.role);
        }
      }

      const users = (profiles || []).map((p) => ({
        ...p,
        role: rolesByUser.get(p.id) || "user",
      }));

      return new Response(
        JSON.stringify({ users, total: count ?? users.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    if (action === "set_role") {
      const targetUserId = typeof body.targetUserId === "string" ? body.targetUserId : "";
      const role = body.role;

      if (!targetUserId) {
        return new Response(
          JSON.stringify({ error: "Missing targetUserId" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (role !== "admin" && role !== "user") {
        return new Response(
          JSON.stringify({ error: "Invalid role. Must be 'admin' or 'user'." }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Block admins from demoting themselves to avoid getting locked out.
      if (targetUserId === adminUserId && role !== "admin") {
        return new Response(
          JSON.stringify({
            error: "Cannot change your own role",
            details:
              "Ask another admin to demote you. This prevents accidental admin lockout.",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Verify the target profile exists.
      const { data: target, error: targetError } = await serviceClient
        .from("profiles")
        .select("id")
        .eq("id", targetUserId)
        .maybeSingle();

      if (targetError || !target) {
        return new Response(
          JSON.stringify({ error: "Target user not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Idempotent: clear any existing rows, then insert the new one. Also
      // self-heals duplicate rows since user_roles has no unique on user_id.
      const { error: deleteError } = await serviceClient
        .from("user_roles")
        .delete()
        .eq("user_id", targetUserId);

      if (deleteError) {
        console.error("Failed to clear existing roles:", deleteError);
        return new Response(
          JSON.stringify({ error: "Failed to update role", details: deleteError.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const { error: insertError } = await serviceClient
        .from("user_roles")
        .insert({ user_id: targetUserId, role });

      if (insertError) {
        console.error("Failed to insert role:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to update role", details: insertError.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      console.log(
        `Admin ${adminUserId} set role of ${targetUserId} to ${role}`,
      );

      return new Response(
        JSON.stringify({ success: true, role }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action", details: `action="${action}"` }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("admin-manage-users unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
