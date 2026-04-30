/**
 * Clerk JWT Authentication Helper
 *
 * This module provides server-side JWT verification for Clerk tokens
 * using JWKS (JSON Web Key Set) via the jose library.
 *
 * SECURITY: JWT signatures are cryptographically verified against
 * Clerk's published public keys. Tokens cannot be forged.
 */

import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTPayload,
} from "https://deno.land/x/jose@v5.2.2/index.ts";

// Module-level JWKS cache — persists across warm invocations
let cachedJWKS: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS(): ReturnType<typeof createRemoteJWKSet> {
  if (cachedJWKS) return cachedJWKS;

  const jwksUrl = Deno.env.get("CLERK_JWKS_URL");
  if (!jwksUrl) {
    throw new Error(
      "CLERK_JWKS_URL environment variable is not set. " +
        "Set it to your Clerk JWKS endpoint, e.g. https://<your-clerk-domain>/.well-known/jwks.json",
    );
  }

  cachedJWKS = createRemoteJWKSet(new URL(jwksUrl));
  return cachedJWKS;
}

interface ClerkJWTPayload extends JWTPayload {
  sub: string;
  user_id?: string;
  clerk_user_id?: string;
  email?: string;
}

/**
 * Verify Clerk JWT token using JWKS and extract user ID.
 *
 * 1. Verifies signature against Clerk's published JWKS
 * 2. Checks `exp` / `nbf` / `iat` automatically (jose handles this)
 * 3. Validates `iss` claim against CLERK_ISSUER_URL
 * 4. Extracts user ID from `sub` claim
 *
 * @param token - The raw JWT (without "Bearer " prefix)
 * @returns Verified user ID
 * @throws Error if token is invalid, expired, or forged
 */
export async function verifyClerkToken(token: string): Promise<string> {
  if (!token) {
    throw new Error("No token provided");
  }

  const jwks = getJWKS();

  const issuerUrl = Deno.env.get("CLERK_ISSUER_URL");
  console.log("verifyClerkToken: CLERK_ISSUER_URL env var:", issuerUrl ? "SET" : "NOT SET");

  const verifyOptions: {
    issuer?: string;
  } = {};

  if (issuerUrl) {
    verifyOptions.issuer = issuerUrl;
  }

  try {
    const { payload } = await jwtVerify(token, jwks, verifyOptions);

    const clerkPayload = payload as ClerkJWTPayload;
    console.log("verifyClerkToken: JWT verified successfully. User ID:", clerkPayload.sub);

    // Extract user ID — Clerk uses `sub` as the canonical user ID
    const userId =
      clerkPayload.sub || clerkPayload.user_id || clerkPayload.clerk_user_id;

    if (!userId) {
      throw new Error("No user ID in token");
    }

    return userId;
  } catch (error) {
    console.error("verifyClerkToken: JWT verification failed");
    console.error("verifyClerkToken: Error name:", error instanceof Error ? error.name : typeof error);
    console.error("verifyClerkToken: Error message:", error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractToken(authHeader: string | null): string {
  if (!authHeader) {
    console.error("extractToken: No authorization header provided");
    throw new Error("Missing authorization header");
  }

  console.log("extractToken: Auth header length:", authHeader.length);
  console.log("extractToken: Auth header starts with 'Bearer':", authHeader.startsWith("Bearer "));

  if (!authHeader.startsWith("Bearer ")) {
    throw new Error("Invalid authorization header format");
  }

  const token = authHeader.replace("Bearer ", "");

  // Decode and log JWT claims (without verifying signature)
  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      console.log("extractToken: JWT payload issuer (iss):", payload.iss);
      console.log("extractToken: JWT subject (sub):", payload.sub);
      console.log("extractToken: JWT audience (aud):", payload.aud);
    }
  } catch (e) {
    console.log("extractToken: Could not decode JWT payload for logging");
  }

  return token;
}

/**
 * Verify user exists in database
 */
export async function verifyUserExists(
  supabase: any,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .single();

  if (error || !data) {
    return false;
  }

  return true;
}

/**
 * Check if user has admin role
 */
export async function isUserAdmin(
  supabase: any,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return false;
    }
    throw error;
  }

  return data?.role === "admin";
}

/**
 * Fetch user from Clerk API and create their profile if missing.
 * Handles existing customers who logged in before the production migration.
 */
async function autoCreateProfile(supabase: any, userId: string): Promise<void> {
  const clerkSecretKey = Deno.env.get("CLERK_SECRET_KEY");
  if (!clerkSecretKey) {
    throw new Error("User not found");
  }

  const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
    headers: { Authorization: `Bearer ${clerkSecretKey}` },
  });

  if (!res.ok) {
    throw new Error("User not found");
  }

  const user = await res.json();
  const email = user.email_addresses?.[0]?.email_address ?? "";
  const firstName = user.first_name ?? "";
  const lastName = user.last_name ?? "";
  const fullName = `${firstName} ${lastName}`.trim() || user.username || "User";

  const { error } = await supabase.from("profiles").insert({
    id: userId,
    email,
    full_name: fullName,
    profile_completed: false,
    onboarding_shown: false,
  });

  if (error) {
    if (error.code === "23505") {
      // 23505 can mean two different things:
      //   (a) profiles_pkey conflict — race with the Clerk webhook that
      //       inserted this same user_id moments earlier. Safe to continue.
      //   (b) idx_profiles_email_unique conflict — a different user_id
      //       already owns this email (older Clerk account or unclaimed
      //       guest profile). NO row exists for the current user_id, and
      //       continuing would later FK-violate downstream (e.g. carts).
      // Re-query by id to disambiguate.
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      if (!existing) {
        console.error(
          `autoCreateProfile: email ${email} already belongs to a different account; cannot create profile for ${userId}`,
        );
        throw new Error(
          `EMAIL_ALREADY_IN_USE: An account with email ${email} already exists. Sign in with that account, or use the guest-claim flow if it was a guest checkout.`,
        );
      }
      // (a) confirmed — profile row exists for this userId, continue.
    } else {
      throw new Error("Failed to create profile: " + error.message);
    }
  }

  console.log(`Auto-created profile for ${userId} (${email})`);

  // Ensure a default user_roles row exists. The Clerk webhook normally creates
  // this on user.created, but if the webhook didn't fire (or its role insert
  // silently errored) we'd be left with a profile but no role, which breaks
  // admin checks and role-scoped queries.
  const { data: existingRole } = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (!existingRole) {
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: "user" });
    if (roleError) {
      console.error(`Failed to create default role for ${userId}:`, roleError);
    } else {
      console.log(`Auto-created default user role for ${userId}`);
    }
  }
}

/**
 * Complete authentication flow: verify JWT (JWKS), check user exists, verify admin role
 *
 * @param authHeader - The Authorization header value
 * @param supabase - Supabase client with service role
 * @param requireAdmin - Whether to require admin role (default: false)
 * @returns Verified user ID
 * @throws Error if authentication fails
 */
export async function authenticateRequest(
  authHeader: string | null,
  supabase: any,
  requireAdmin = false,
): Promise<string> {
  const token = extractToken(authHeader);
  const userId = await verifyClerkToken(token);

  const userExists = await verifyUserExists(supabase, userId);
  if (!userExists) {
    await autoCreateProfile(supabase, userId);
  }

  if (requireAdmin) {
    const isAdmin = await isUserAdmin(supabase, userId);
    if (!isAdmin) {
      throw new Error("Admin access required");
    }
  }

  return userId;
}
