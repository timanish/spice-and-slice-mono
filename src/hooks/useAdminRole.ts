import { useQuery } from "@tanstack/react-query";
import { useUser } from "@clerk/clerk-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to check if the current user has admin role
 *
 * @returns {boolean} isAdmin - true if user has admin role
 * @returns {boolean} isLoading - true while checking role
 * @returns {Error|null} error - error if role check failed
 */
export const useAdminRole = () => {
  const { user, isLoaded } = useUser();

  const {
    data: isAdmin = false,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["adminRole", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (error) {
        if (error.code === "PGRST116") return false;
        throw error;
      }

      return data?.role === "admin";
    },
    enabled: isLoaded && !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return {
    isAdmin,
    isLoading: isLoading || !isLoaded,
    error,
  };
};
