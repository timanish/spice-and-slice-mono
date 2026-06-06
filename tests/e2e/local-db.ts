import { createClient } from "@supabase/supabase-js";

// Local stack + well-known local service-role key (NOT secret — same on every
// machine). The edge runtime reserves SUPABASE_* names, so these use neutral
// names and have built-in local defaults.
export const LOCAL_SUPABASE_URL = process.env.LOCAL_SUPABASE_URL || "http://127.0.0.1:54321";
export const LOCAL_SERVICE_KEY =
  process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

/** Service-role client against the LOCAL stack (bypasses RLS — for test assertions/setup). */
export const adminDb = () =>
  createClient(LOCAL_SUPABASE_URL, LOCAL_SERVICE_KEY, { auth: { persistSession: false } });
