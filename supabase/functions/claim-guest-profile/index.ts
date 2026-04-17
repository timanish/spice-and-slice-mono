/**
 * claim-guest-profile
 *
 * Called after a guest user creates a Clerk account post-checkout.
 * Looks up any unclaimed guest profile row matching the authenticated user's
 * email and atomically reparents its orders/addresses onto the real profile
 * via the claim_guest_profile RPC. Idempotent — safe to call multiple times.
 *
 * Called from: PostCheckoutSignupPrompt, after Clerk signUp completes.
 * Returns: { success: true, ordersClaimed: number }
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { authenticateRequest } from "../_shared/clerk-auth.ts";
import { alertError } from "../_shared/alert.ts";

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

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  let verifiedUserId: string | null = null;

  try {
    const serviceClient = getServiceRoleClient();

    const authHeader =
      req.headers.get("Authorization") || req.headers.get("authorization");
    try {
      verifiedUserId = await authenticateRequest(authHeader, serviceClient, false);
    } catch (authError: any) {
      console.error("Authentication failed:", authError);
      return json({ error: "Unauthorized", details: authError.message }, 401);
    }

    // Normally authenticateRequest's autoCreateProfile has populated the
    // profile row with the user's email. When a guest already occupies the
    // same email, the insert hits a UNIQUE(email) collision and is silently
    // skipped — so we may find no row (or a row without email). In that case
    // fetch the email directly from Clerk so the RPC can reconcile both
    // rows in one atomic step.
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("email")
      .eq("id", verifiedUserId)
      .maybeSingle();

    let clerkEmail = profile?.email?.trim().toLowerCase() || "";

    if (!clerkEmail) {
      const clerkSecretKey = Deno.env.get("CLERK_SECRET_KEY");
      if (!clerkSecretKey) {
        console.error("CLERK_SECRET_KEY not configured; cannot resolve email");
        return json({ error: "Server misconfigured." }, 500);
      }
      const clerkRes = await fetch(
        `https://api.clerk.com/v1/users/${verifiedUserId}`,
        { headers: { Authorization: `Bearer ${clerkSecretKey}` } },
      );
      if (!clerkRes.ok) {
        console.error("Failed to fetch Clerk user for email lookup:", clerkRes.status);
        return json({ error: "Account email unavailable. Please retry." }, 400);
      }
      const clerkUser = await clerkRes.json();
      clerkEmail = (clerkUser.email_addresses?.[0]?.email_address || "")
        .trim()
        .toLowerCase();
    }

    if (!clerkEmail) {
      return json({ error: "Account email unavailable. Please retry." }, 400);
    }

    const { data: ordersClaimed, error: rpcError } = await serviceClient.rpc(
      "claim_guest_profile",
      {
        _real_user_id: verifiedUserId,
        _clerk_email: clerkEmail,
      },
    );

    if (rpcError) {
      console.error("claim_guest_profile RPC failed:", rpcError);
      await alertError(
        "claim-guest-profile",
        new Error(rpcError.message),
        { userId: verifiedUserId, email: clerkEmail },
        "warning",
      );
      return json(
        { error: "Failed to claim guest orders", details: rpcError.message },
        500,
      );
    }

    const claimedCount = typeof ordersClaimed === "number" ? ordersClaimed : 0;
    console.log(
      `Guest claim complete: user=${verifiedUserId}, orders reparented=${claimedCount}`,
    );

    return json({ success: true, ordersClaimed: claimedCount }, 200);
  } catch (error: any) {
    console.error("Unexpected error in claim-guest-profile:", error);
    await alertError(
      "claim-guest-profile",
      error,
      { userId: verifiedUserId },
      "critical",
    );
    return json({ error: "Internal server error", details: error.message }, 500);
  }
});
