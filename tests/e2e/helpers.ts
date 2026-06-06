import type { Page } from "@playwright/test";
import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";

type TestUser = { email: string };

/**
 * Sign in a seeded `+clerk_test` user. Must be called after navigating to a
 * page that loads Clerk (we go to "/" first). The email-code 424242 is handled
 * automatically by clerk.signIn for test emails.
 */
export async function signInAs(page: Page, user: TestUser) {
  await setupClerkTestingToken({ page });
  await page.goto("/");
  await clerk.signIn({
    page,
    signInParams: { strategy: "email_code", identifier: user.email },
  });
}

/** Mint the current Clerk session JWT (the same token the app sends to edge functions). */
export async function getClerkToken(page: Page): Promise<string> {
  const token = await page.evaluate(async () => {
    // @ts-expect-error Clerk is attached to window by the SDK
    return (await window.Clerk?.session?.getToken()) as string | null;
  });
  if (!token) throw new Error("No Clerk session token — is the user signed in?");
  return token;
}

const FN_BASE = (process.env.LOCAL_SUPABASE_URL || "http://127.0.0.1:54321") + "/functions/v1";

/** Call a local edge function. Pass a token for Clerk-authenticated functions. */
export async function callFunction(
  name: string,
  body: unknown,
  token?: string,
): Promise<{ status: number; json: any }> {
  const res = await fetch(`${FN_BASE}/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}
