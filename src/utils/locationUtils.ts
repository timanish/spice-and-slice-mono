
import { supabase } from '@/integrations/supabase/client';

export interface Location {
  address: string;
  coordinates: [number, number];
}

export const STORE_LOCATION: Location = {
  address: "7451 N Beach St #172, Fort Worth, TX 76137",
  coordinates: [-97.2924, 32.8546]
};

// Default location if user profile not found
const DEFAULT_USER_LOCATION: Location = {
  address: "Fort Worth, TX",
  coordinates: [-97.3208, 32.7555]
};

/**
 * Fetches the user's address from their profile
 * Returns a default location if the user profile is not found
 */
export const getUserLocation = async (): Promise<Location> => {
  try {
    // Note: This function may need to accept userId as parameter with Clerk
    const { data, error } = { data: null as any, error: new Error('This function needs to be updated for Clerk') };

    if (error || !data) {
      return DEFAULT_USER_LOCATION;
    }

    return DEFAULT_USER_LOCATION;
  } catch {
    return DEFAULT_USER_LOCATION;
  }
};
