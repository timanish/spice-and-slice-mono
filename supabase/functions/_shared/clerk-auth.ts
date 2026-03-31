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

  const verifyOptions: {
    issuer?: string;
  } = {};

  if (issuerUrl) {
    verifyOptions.issuer = issuerUrl;
  }

  const { payload } = await jwtVerify(token, jwks, verifyOptions);

  const clerkPayload = payload as ClerkJWTPayload;

  // Extract user ID — Clerk uses `sub` as the canonical user ID
  const userId =
    clerkPayload.sub || clerkPayload.user_id || clerkPayload.clerk_user_id;

  if (!userId) {
    throw new Error("No user ID in token");
  }

  return userId;
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

  return authHeader.replace("Bearer ", "");
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
    throw new Error("User not found");
  }

  if (requireAdmin) {
    const isAdmin = await isUserAdmin(supabase, userId);
    if (!isAdmin) {
      throw new Error("Admin access required");
    }
  }

  return userId;
}
