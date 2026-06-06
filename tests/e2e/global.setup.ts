import { clerkSetup } from "@clerk/testing/playwright";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Test users. `+clerk_test` emails are Clerk's reserved test addresses — they
// verify with the fixed email code 424242 (handled by clerk.signIn), so no real
// inbox is needed. See tests/e2e/users.ts for the shared constants.
// ---------------------------------------------------------------------------
import { TEST_USERS } from "./users";

const CLERK_API = "https://api.clerk.com/v1";
const SECRET = process.env.CLERK_SECRET_KEY!;

// Local stack URL + well-known local service-role key (NOT secret — same on every
// machine). These are NOT taken from the functions env file because the edge
// runtime reserves SUPABASE_* names and refuses to load them from --env-file.
const LOCAL_SUPABASE_URL = process.env.LOCAL_SUPABASE_URL || "http://127.0.0.1:54321";
const LOCAL_SERVICE_KEY =
  process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

async function clerkFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${CLERK_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${SECRET}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`Clerk API ${path} → ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

/** Ensure a Clerk dev user exists for `email`; return its user id. */
async function ensureClerkUser(email: string, firstName: string): Promise<string> {
  const existing = await clerkFetch(`/users?email_address=${encodeURIComponent(email)}`);
  if (Array.isArray(existing) && existing.length > 0) return existing[0].id;

  const created = await clerkFetch(`/users`, {
    method: "POST",
    body: JSON.stringify({
      email_address: [email],
      password: "ClerkTest!sandbox-2026",
      skip_password_checks: true,
      skip_password_requirement: true,
      first_name: firstName,
    }),
  });
  return created.id;
}

export default async function globalSetup() {
  // 1. Initialise Clerk testing (reads CLERK_PUBLISHABLE_KEY / CLERK_SECRET_KEY).
  await clerkSetup();

  if (!SECRET) throw new Error("CLERK_SECRET_KEY missing — check supabase/functions/.env.test");

  const db = createClient(LOCAL_SUPABASE_URL, LOCAL_SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // 2. For each test user: ensure it exists in Clerk, then mirror it into the
  //    local `profiles` table (the clerk-webhook can't reach localhost).
  for (const u of Object.values(TEST_USERS)) {
    const userId = await ensureClerkUser(u.email, u.firstName);

    await db.from("profiles").upsert({
      id: userId,
      email: u.email,
      full_name: u.firstName,
      profile_completed: true,
      onboarding_shown: true,
    });

    let { data: cart } = await db.from("carts").select("id").eq("user_id", userId).maybeSingle();
    if (!cart) {
      const ins = await db.from("carts").insert({ user_id: userId }).select("id").single();
      cart = ins.data;
    }
    // Start every run with an empty cart for deterministic tests.
    if (cart) {
      await db.from("cart_items").delete().eq("cart_id", cart.id);
      await db.from("cart_combo_items").delete().eq("cart_id", cart.id);
    }

    if (u.admin) {
      const { data: role } = await db
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      if (!role) await db.from("user_roles").insert({ user_id: userId, role: "admin" });
    }

    // Stash the resolved id so specs can reference it if needed.
    u.id = userId;
  }

  console.log("[global-setup] test users ready:", Object.values(TEST_USERS).map((u) => `${u.email}=${u.id}`).join(", "));
}
