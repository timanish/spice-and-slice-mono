import { fetchWithAuth } from "@/lib/auth-token";
import { MAX_RETRIES, RETRY_DELAY } from "./types";

export const createTimeout = (ms: number) => {
  return new Promise<never>((_, reject) => {
    setTimeout(
      () => reject(new Error(`Operation timed out after ${ms}ms`)),
      ms,
    );
  });
};

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch cart items via the user-data edge function.
 * Returns shaped CartItem[] directly from the server.
 */
export const fetchCartViaEdge = async (retryCount = 0): Promise<any[]> => {
  try {
    const res = await fetchWithAuth("user-data", { action: "cart.get" });
    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error || "Failed to fetch cart");
    }

    return json.data || [];
  } catch (error: any) {
    console.error(
      `Error fetching cart (attempt ${retryCount + 1}):`,
      error,
    );

    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying in ${RETRY_DELAY}ms...`);
      await delay(RETRY_DELAY);
      return fetchCartViaEdge(retryCount + 1);
    }

    throw error;
  }
};
