import { fetchWithAuth } from "@/lib/auth-token";

/**
 * Single source of truth for "is this user's profile complete enough to
 * check out?" — checks that the profile has a phone number and at least
 * one address, which is the actual business requirement. The
 * `profile_completed` column on profiles is a weak signal that can drift
 * (e.g. autoCreateProfile sets it false on first auth even if onboarding
 * later adds the missing fields) so we ignore it here.
 *
 * Cache policy: only cache positive results. A "false" answer should
 * resolve the moment the user fills in the missing data — never serve a
 * stale no. Positive results are cached for 5 minutes to keep the hot path
 * off the network.
 */

const globalProfileCache = new Map<string, { timestamp: number }>();
const PROFILE_CACHE_TTL = 300000; // 5 minutes
const localStorageKey = (userId: string) => `profile_complete_${userId}`;

function readCachedComplete(userId: string): boolean {
  const mem = globalProfileCache.get(userId);
  if (mem && Date.now() - mem.timestamp < PROFILE_CACHE_TTL) return true;

  const raw = localStorage.getItem(localStorageKey(userId));
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw);
    // Only trust entries that explicitly flag isComplete=true. This also
    // correctly rejects stale false entries written by the previous cache
    // implementation, which stored both outcomes.
    if (
      parsed &&
      parsed.isComplete === true &&
      Date.now() - parsed.timestamp < PROFILE_CACHE_TTL
    ) {
      globalProfileCache.set(userId, { timestamp: parsed.timestamp });
      return true;
    }
  } catch {
    // ignore malformed entries
  }
  return false;
}

function writeCachedComplete(userId: string) {
  const timestamp = Date.now();
  globalProfileCache.set(userId, { timestamp });
  try {
    localStorage.setItem(
      localStorageKey(userId),
      JSON.stringify({ isComplete: true, timestamp }),
    );
  } catch {
    // storage full or unavailable — ignore
  }
}

/**
 * Invalidate both in-memory and localStorage caches for a given user.
 * Call this after profile/address mutations so the next check is fresh.
 */
export function invalidateProfileCompletenessCache(userId: string) {
  globalProfileCache.delete(userId);
  try {
    localStorage.removeItem(localStorageKey(userId));
  } catch {
    // ignore
  }
}

export const checkProfileComplete = async (
  userId: string,
): Promise<boolean> => {
  if (readCachedComplete(userId)) return true;

  try {
    const [profileRes, addressRes] = await Promise.all([
      fetchWithAuth("user-data", { action: "profile.get" }),
      fetchWithAuth("user-data", { action: "addresses.list" }),
    ]);

    const profileJson = profileRes.ok ? await profileRes.json() : null;
    const addressJson = addressRes.ok ? await addressRes.json() : null;

    const profileData = profileJson?.data;
    const addressData = addressJson?.data;

    const isComplete = !!(
      profileData?.phone_number &&
      addressData &&
      addressData.length > 0
    );

    if (isComplete) writeCachedComplete(userId);
    return isComplete;
  } catch (error) {
    console.error("Error checking profile:", error);
    return false;
  }
};
