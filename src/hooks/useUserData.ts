/**
 * React hook wrapping the user-data edge function.
 *
 * Provides typed helpers for profile, addresses, cart, orders,
 * reviews, and catering — all authenticated via Clerk JWT.
 */

import { useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

async function callUserData(
  token: string | null,
  action: string,
  payload: Record<string, unknown> = {},
) {
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${SUPABASE_URL}/functions/v1/user-data`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action, ...payload }),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error || `user-data request failed (${res.status})`);
  }

  return json;
}

export function useUserData() {
  const { getToken } = useAuth();

  const call = useCallback(
    async (action: string, payload: Record<string, unknown> = {}) => {
      const token = await getToken();
      return callUserData(token, action, payload);
    },
    [getToken],
  );

  return {
    // Profile
    getProfile: useCallback(() => call("profile.get"), [call]),
    updateProfile: useCallback(
      (data: Record<string, unknown>) => call("profile.update", data),
      [call],
    ),

    // Addresses
    listAddresses: useCallback(() => call("addresses.list"), [call]),
    getAddress: useCallback(
      (id: string) => call("addresses.get", { id }),
      [call],
    ),
    createAddress: useCallback(
      (data: Record<string, unknown>) => call("addresses.create", data),
      [call],
    ),
    updateAddress: useCallback(
      (data: Record<string, unknown>) => call("addresses.update", data),
      [call],
    ),
    deleteAddress: useCallback(
      (id: string) => call("addresses.delete", { id }),
      [call],
    ),
    setDefaultAddress: useCallback(
      (id: string) => call("addresses.setDefault", { id }),
      [call],
    ),

    // Cart
    getCart: useCallback(() => call("cart.get"), [call]),
    addCartItem: useCallback(
      (data: Record<string, unknown>) => call("cart.addItem", data),
      [call],
    ),
    updateCartQuantity: useCallback(
      (id: string, quantity: number) =>
        call("cart.updateQuantity", { id, quantity }),
      [call],
    ),
    updateCartWeight: useCallback(
      (id: string, weight: number) =>
        call("cart.updateWeight", { id, weight }),
      [call],
    ),
    removeCartItem: useCallback(
      (id: string) => call("cart.removeItem", { id }),
      [call],
    ),

    // Orders
    listOrders: useCallback(() => call("orders.list"), [call]),
    getOrder: useCallback(
      (id: string) => call("orders.get", { id }),
      [call],
    ),

    // Reviews
    submitReview: useCallback(
      (data: Record<string, unknown>) => call("review.submit", data),
      [call],
    ),

    // Catering
    submitCateringRequest: useCallback(
      (data: Record<string, unknown>) => call("catering.submit", data),
      [call],
    ),

    // Raw call for custom actions
    call,
  };
}
