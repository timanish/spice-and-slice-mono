import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUser } from "./use-user";
import { useUser as useClerkUser, useAuth } from "@clerk/clerk-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

/**
 * Hook to check if user needs to complete onboarding
 * Redirects to onboarding page if profile is incomplete
 */
export const useProfileCompletion = (skipCheck = false) => {
  const { user } = useUser();
  const { user: clerkUser, isLoaded } = useClerkUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [profileCompleted, setProfileCompleted] = useState<boolean | null>(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 5;

  const checkProfileCompletion = useCallback(async () => {
    if (
      skipCheck ||
      location.pathname === "/onboarding" ||
      location.pathname === "/auth"
    ) {
      setIsChecking(false);
      return;
    }

    if (!isLoaded) return;
    if (!clerkUser?.id) {
      setIsChecking(false);
      return;
    }

    try {
      const token = await getToken();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/user-data`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "profile.get" }),
      });

      if (!res.ok) {
        // Profile might not exist yet (webhook hasn't fired)
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current += 1;
          setTimeout(checkProfileCompletion, 2000);
          return;
        }
        console.error("Profile not found after max retries.");
        setIsChecking(false);
        return;
      }

      const json = await res.json();
      const data = json.data;

      if (!data) {
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current += 1;
          setTimeout(checkProfileCompletion, 2000);
          return;
        }
        setIsChecking(false);
        return;
      }

      retryCountRef.current = 0;

      const shouldShowOnboarding = data.onboarding_shown === false;
      setProfileCompleted(shouldShowOnboarding ? false : true);

      if (shouldShowOnboarding && location.pathname !== "/onboarding") {
        navigate("/onboarding", {
          replace: true,
          state: { from: location },
        });
      }
    } catch (error) {
      console.error("Error in profile completion check:", error);
    } finally {
      setIsChecking(false);
    }
  }, [skipCheck, location.pathname, isLoaded, clerkUser?.id, getToken, navigate, location]);

  useEffect(() => {
    checkProfileCompletion();
  }, [checkProfileCompletion]);

  return {
    isChecking,
    profileCompleted,
  };
};
