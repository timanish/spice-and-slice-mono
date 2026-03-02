import { fetchWithAuth } from "@/lib/auth-token";

// Global profile cache (shared across components)
const globalProfileCache = new Map<
  string,
  {
    isComplete: boolean;
    timestamp: number;
  }
>();
const PROFILE_CACHE_TTL = 300000; // 5 minutes

// Function to check profile completeness (shared utility)
export const checkProfileComplete = async (
  userId: string
): Promise<boolean> => {
  // Check memory cache first
  const cachedProfile = globalProfileCache.get(userId);
  if (
    cachedProfile &&
    Date.now() - cachedProfile.timestamp < PROFILE_CACHE_TTL
  ) {
    return cachedProfile.isComplete;
  }

  // Check localStorage
  const localStorageKey = `profile_complete_${userId}`;
  const localData = localStorage.getItem(localStorageKey);
  if (localData) {
    try {
      const parsed = JSON.parse(localData);
      if (Date.now() - parsed.timestamp < PROFILE_CACHE_TTL) {
        globalProfileCache.set(userId, {
          isComplete: parsed.isComplete,
          timestamp: parsed.timestamp,
        });
        return parsed.isComplete;
      }
    } catch (e) {
      console.error("Error parsing localStorage profile cache", e);
    }
  }

  // Fetch from edge function
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

    // Update caches
    const timestamp = Date.now();
    globalProfileCache.set(userId, { isComplete, timestamp });
    localStorage.setItem(
      localStorageKey,
      JSON.stringify({ isComplete, timestamp })
    );

    return isComplete;
  } catch (error) {
    console.error("Error checking profile:", error);
    return false;
  }
};
