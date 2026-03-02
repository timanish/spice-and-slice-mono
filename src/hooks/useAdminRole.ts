import { useQuery } from "@tanstack/react-query";
import { useUser as useClerkUser, useAuth } from "@clerk/clerk-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

/**
 * Hook to check if the current user has admin role.
 * Uses the get-user-role edge function (service-role access)
 * instead of querying the RLS-locked user_roles table directly.
 */
export const useAdminRole = () => {
  const { user, isLoaded } = useClerkUser();
  const { getToken } = useAuth();

  const {
    data: isAdmin = false,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["adminRole", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;

      const token = await getToken();
      if (!token) return false;

      const response = await fetch(`${SUPABASE_URL}/functions/v1/get-user-role`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) return false;

      const data = await response.json();
      return data?.role === 'admin';
    },
    enabled: isLoaded && !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  return {
    isAdmin,
    isLoading: isLoading || !isLoaded,
    error,
  };
};
