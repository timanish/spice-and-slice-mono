// Supabase Edge Function to calculate delivery distance
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { authenticateRequest } from "../_shared/clerk-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Store location: 7451 N Beach St #172, Fort Worth, TX 76137
const STORE_COORDINATES = {
  longitude: -97.29028208986522,
  latitude: 32.87486808855507,
};

interface RequestBody {
  addressId?: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  addressLine2?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const mapboxToken = Deno.env.get("MAPBOX_ACCESS_TOKEN") || "";

    if (!mapboxToken) {
      throw new Error("Mapbox access token not configured");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify Clerk JWT — extract userId from token instead of body
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    let userId: string;

    try {
      userId = await authenticateRequest(authHeader, supabase, false);
    } catch (authError: any) {
      console.error("Authentication failed:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body: RequestBody = await req.json();
    const {
      addressId,
      addressLine1,
      city,
      state,
      postalCode,
      addressLine2,
    } = body;

    if (!addressLine1 || !city || !state || !postalCode) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Build full address
    const addressParts = [addressLine1, addressLine2, city, state, postalCode]
      .filter(Boolean)
      .join(", ");

    console.log("Geocoding address:", addressParts);

    // Step 1: Geocode the address using Mapbox
    const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      addressParts,
    )}.json?access_token=${mapboxToken}&limit=1&country=US`;

    const geocodingResponse = await fetch(geocodingUrl);

    if (!geocodingResponse.ok) {
      throw new Error("Failed to geocode address");
    }

    const geocodingData = await geocodingResponse.json();

    if (!geocodingData.features || geocodingData.features.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Address not found. Please check the address and try again.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const feature = geocodingData.features[0];
    const [longitude, latitude] = feature.center;

    console.log("Geocoded to:", { latitude, longitude });

    // Step 2: Calculate driving distance using Mapbox Directions API
    const coordinates = `${STORE_COORDINATES.longitude},${STORE_COORDINATES.latitude};${longitude},${latitude}`;
    const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?access_token=${mapboxToken}&geometries=geojson`;

    const directionsResponse = await fetch(directionsUrl);

    if (!directionsResponse.ok) {
      throw new Error("Failed to calculate driving distance");
    }

    const directionsData = await directionsResponse.json();

    if (!directionsData.routes || directionsData.routes.length === 0) {
      return new Response(
        JSON.stringify({
          error: "No route found between store and delivery address",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const route = directionsData.routes[0];

    // Convert meters to miles (1 mile = 1609.34 meters)
    const distanceInMiles = parseFloat((route.distance / 1609.34).toFixed(2));

    // Convert seconds to minutes
    const durationInMinutes = Math.round(route.duration / 60);

    console.log("Calculated distance:", distanceInMiles, "miles");

    // Step 3: Update user_addresses or profiles with distance and coordinates
    // Always filter by verified userId to ensure ownership
    if (addressId) {
      const { error: updateError } = await supabase
        .from("user_addresses")
        .update({
          distance_from_store: distanceInMiles,
          latitude: latitude,
          longitude: longitude,
        })
        .eq("id", addressId)
        .eq("user_id", userId);

      if (updateError) {
        console.error("Error updating user_addresses:", updateError);
        throw updateError;
      }

      console.log("Address updated successfully:", addressId);
    } else {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          distance_from_store: distanceInMiles,
          latitude: latitude,
          longitude: longitude,
          distance_calculated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (updateError) {
        console.error("Error updating profile:", updateError);
        throw updateError;
      }

      console.log("Profile updated successfully for user:", userId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        distance: distanceInMiles,
        duration: durationInMinutes,
        latitude,
        longitude,
        message: `Delivery distance: ${distanceInMiles} miles (approximately ${durationInMinutes} minutes drive)`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in calculate-delivery-distance:", error);

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
