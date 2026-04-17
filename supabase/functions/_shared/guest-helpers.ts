/**
 * Shared helpers for guest (no-login) checkout.
 * Used by: create-guest-pending-order, claim-guest-profile
 */

// Store location: 7451 N Beach St #172, Fort Worth, TX 76137
// (matches calculate-delivery-distance/index.ts)
const STORE_COORDINATES = {
  longitude: -97.29028208986522,
  latitude: 32.87486808855507,
};

/**
 * Error code thrown when a guest attempts to check out with an email that
 * already belongs to a real (claimed) account. Callers should return 409 and
 * prompt the customer to sign in instead.
 */
export const EMAIL_BELONGS_TO_REAL_USER = "EMAIL_BELONGS_TO_REAL_USER";

/**
 * Find an unclaimed guest profile by email, or create a new one.
 * Refreshes phone/full_name on reuse so repeat guest checkouts see the latest.
 *
 * Throws EMAIL_BELONGS_TO_REAL_USER if the email is owned by a real profile.
 */
export async function findOrCreateGuestProfile(
  serviceClient: any,
  args: { email: string; phone: string; fullName: string },
): Promise<{ id: string; isExisting: boolean }> {
  const email = args.email.trim().toLowerCase();
  const phone = args.phone.trim();
  const fullName = args.fullName.trim();

  // NOTE: profiles.email does not currently have a UNIQUE constraint in
  // production (the base CREATE TABLE IF NOT EXISTS was a no-op against
  // an older schema). That means a given email can legitimately map to
  // multiple rows — typically a guest row plus a Clerk row that was
  // auto-created later. Handle this defensively: a single non-guest or
  // already-claimed match is still a reason to reject, and if there's no
  // such match, reuse the most recent unclaimed guest row.
  const { data: existing, error: lookupError } = await serviceClient
    .from("profiles")
    .select("id, is_guest, claimed_clerk_id, created_at")
    .eq("email", email)
    .order("created_at", { ascending: false });

  if (lookupError) {
    throw new Error(`Profile lookup failed: ${lookupError.message}`);
  }

  const rows = (existing || []) as Array<{
    id: string;
    is_guest: boolean;
    claimed_clerk_id: string | null;
  }>;

  const hasRealAccount = rows.some(
    (r) => !r.is_guest || r.claimed_clerk_id !== null,
  );
  if (hasRealAccount) {
    const err: any = new Error(EMAIL_BELONGS_TO_REAL_USER);
    err.code = EMAIL_BELONGS_TO_REAL_USER;
    throw err;
  }

  const reusable = rows.find((r) => r.is_guest && !r.claimed_clerk_id);
  if (reusable) {
    // Reuse guest profile, refresh contact details so the most recent
    // checkout's phone/name are used for notifications.
    const { error: updateError } = await serviceClient
      .from("profiles")
      .update({
        phone_number: phone,
        full_name: fullName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reusable.id);

    if (updateError) {
      console.error("Failed to refresh guest profile:", updateError);
      // Non-blocking; stale contact info is tolerable
    }

    return { id: reusable.id, isExisting: true };
  }

  const guestId = `guest_${crypto.randomUUID()}`;
  const { error: insertError } = await serviceClient
    .from("profiles")
    .insert({
      id: guestId,
      email,
      phone_number: phone,
      full_name: fullName,
      is_guest: true,
    });

  if (insertError) {
    throw new Error(`Failed to create guest profile: ${insertError.message}`);
  }

  return { id: guestId, isExisting: false };
}

/**
 * DB-backed rolling-window rate limit for guest endpoints.
 * Returns true if the IP has exceeded the limit within the window.
 */
export async function isGuestRateLimited(
  serviceClient: any,
  ip: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const now = new Date();
  const windowMs = windowSeconds * 1000;

  const { data: existing } = await serviceClient
    .from("guest_order_rate_limits")
    .select("attempts, first_attempt_at")
    .eq("ip", ip)
    .maybeSingle();

  if (!existing) {
    const { error: insertError } = await serviceClient
      .from("guest_order_rate_limits")
      .insert({
        ip,
        attempts: 1,
        first_attempt_at: now.toISOString(),
        last_attempt_at: now.toISOString(),
      });
    if (insertError && insertError.code !== "23505") {
      // Non-unique errors indicate a real problem; UNIQUE race means another
      // request beat us to insert — fall through to treat as not-limited.
      console.error("Rate limit insert failed:", insertError);
    }
    return false;
  }

  const firstAt = new Date(existing.first_attempt_at).getTime();
  const windowExpired = now.getTime() - firstAt > windowMs;

  if (windowExpired) {
    await serviceClient
      .from("guest_order_rate_limits")
      .update({
        attempts: 1,
        first_attempt_at: now.toISOString(),
        last_attempt_at: now.toISOString(),
      })
      .eq("ip", ip);
    return false;
  }

  const nextAttempts = (existing.attempts ?? 0) + 1;
  await serviceClient
    .from("guest_order_rate_limits")
    .update({
      attempts: nextAttempts,
      last_attempt_at: now.toISOString(),
    })
    .eq("ip", ip);

  return nextAttempts > limit;
}

/**
 * Geocode an address and calculate driving distance from the store via Mapbox.
 * Mirrors the logic in calculate-delivery-distance/index.ts but returns the
 * result instead of writing to a user_addresses row so the guest flow can
 * zone-validate before deciding whether to persist.
 */
export async function geocodeAndCalculateDistance(
  address: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
  },
  mapboxToken: string,
): Promise<{
  latitude: number;
  longitude: number;
  distanceMiles: number;
  durationMinutes: number;
}> {
  const addressParts = [
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.state,
    address.postalCode,
  ]
    .filter(Boolean)
    .join(", ");

  const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
    addressParts,
  )}.json?access_token=${mapboxToken}&limit=1&country=US`;

  const geocodingResponse = await fetch(geocodingUrl);
  if (!geocodingResponse.ok) {
    throw new Error("Failed to geocode address");
  }
  const geocodingData = await geocodingResponse.json();
  if (!geocodingData.features || geocodingData.features.length === 0) {
    throw new Error("Address not found. Please check the address and try again.");
  }
  const [longitude, latitude] = geocodingData.features[0].center;

  const coordinates = `${STORE_COORDINATES.longitude},${STORE_COORDINATES.latitude};${longitude},${latitude}`;
  const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?access_token=${mapboxToken}&geometries=geojson`;
  const directionsResponse = await fetch(directionsUrl);
  if (!directionsResponse.ok) {
    throw new Error("Failed to calculate driving distance");
  }
  const directionsData = await directionsResponse.json();
  if (!directionsData.routes || directionsData.routes.length === 0) {
    throw new Error("No route found between store and delivery address");
  }
  const route = directionsData.routes[0];
  const distanceMiles = parseFloat((route.distance / 1609.34).toFixed(2));
  const durationMinutes = Math.round(route.duration / 60);

  return { latitude, longitude, distanceMiles, durationMinutes };
}

/**
 * Find the delivery_zones row matching a given distance.
 * Returns null if outside all zones (caller should reject delivery).
 */
export async function findDeliveryZoneByDistance(
  serviceClient: any,
  distanceMiles: number,
): Promise<{ fee: number; zone: string | null } | null> {
  const { data: zones } = await serviceClient
    .from("delivery_zones")
    .select("delivery_fee, zone_name, min_distance, max_distance")
    .lte("min_distance", distanceMiles)
    .gte("max_distance", distanceMiles)
    .limit(1);

  if (!zones || zones.length === 0) return null;
  return {
    fee: zones[0].delivery_fee || 0,
    zone: zones[0].zone_name || null,
  };
}
