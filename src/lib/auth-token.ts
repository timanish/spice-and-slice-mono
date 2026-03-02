/**
 * Auth token provider for non-React contexts (e.g. Zustand stores).
 *
 * Clerk's `useAuth().getToken()` is a React hook and can't be called
 * from Zustand actions. Instead, we register the getter once from a
 * React component and expose it globally.
 */

type TokenGetter = () => Promise<string | null>;

let _getToken: TokenGetter | null = null;

/**
 * Register Clerk's getToken function. Call once from a top-level
 * React component (e.g. App or AuthProvider).
 */
export function registerTokenGetter(getter: TokenGetter) {
  _getToken = getter;
}

/**
 * Get the current Clerk JWT. Throws if registerTokenGetter hasn't
 * been called yet.
 */
export async function getClerkToken(): Promise<string> {
  if (!_getToken) {
    throw new Error(
      "Token getter not registered. Call registerTokenGetter() from a React component first.",
    );
  }
  const token = await _getToken();
  if (!token) {
    throw new Error("No auth token available — user may not be signed in.");
  }
  return token;
}

/**
 * Helper to call a Supabase edge function with Clerk JWT auth.
 */
export async function fetchWithAuth(
  functionPath: string,
  body: Record<string, unknown>,
): Promise<Response> {
  const token = await getClerkToken();
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  return fetch(`${supabaseUrl}/functions/v1/${functionPath}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}
