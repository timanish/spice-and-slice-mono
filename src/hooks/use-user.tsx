
import { useUser as useClerkUser, useAuth } from '@clerk/clerk-react';
import { useState, useEffect, useCallback, useRef, useMemo } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Define a type for the cached admin status
type CachedAdminStatus = {
  isAdmin: boolean;
  timestamp: number;
};

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// Initialize the global cache
if (typeof window !== 'undefined' && !window.globalAdminCache) {
  window.globalAdminCache = {};
}

export const useUser = () => {
  const { user, isSignedIn } = useClerkUser();
  const { getToken } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isCheckingRole, setIsCheckingRole] = useState<boolean>(false);
  const lastCheckedUserIdRef = useRef<string | null>(null);
  const initializationRef = useRef<boolean>(false);

  // Memoize user ID to prevent unnecessary effect runs
  const userId = useMemo(() => user?.id || null, [user?.id]);

  // Check cache first and return cached value if valid
  const getCachedAdminStatus = useCallback((userIdToCheck: string): CachedAdminStatus | null => {
    // First try in-memory cache
    const globalCache = window.globalAdminCache || {};
    const cachedData = globalCache[userIdToCheck];

    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
      return cachedData;
    }

    // Then try localStorage
    const localStorageCacheKey = `admin_status_${userIdToCheck}`;
    const localCachedData = localStorage.getItem(localStorageCacheKey);

    if (localCachedData) {
      try {
        const parsedData = JSON.parse(localCachedData);
        if (Date.now() - parsedData.timestamp < CACHE_DURATION) {
          // Sync with in-memory cache
          if (window.globalAdminCache) {
            window.globalAdminCache[userIdToCheck] = parsedData;
          }

          return parsedData;
        }
      } catch (error) {
        localStorage.removeItem(localStorageCacheKey);
      }
    }

    return null;
  }, []);

  // Update cache with new admin status
  const updateAdminCache = useCallback((userIdToUpdate: string, isAdminValue: boolean) => {
    const cacheData = { isAdmin: isAdminValue, timestamp: Date.now() };

    // Update in-memory cache
    if (window.globalAdminCache) {
      window.globalAdminCache[userIdToUpdate] = cacheData;
    }

    // Update localStorage cache
    const localStorageCacheKey = `admin_status_${userIdToUpdate}`;
    localStorage.setItem(localStorageCacheKey, JSON.stringify(cacheData));
  }, []);

  // Memoize the checkAdminRole function to prevent recreating it on each render
  const checkAdminRole = useCallback(async (forceCheck = false) => {
    // Don't check if there's no user
    if (!userId) {
      if (isAdmin) setIsAdmin(false);
      if (isCheckingRole) setIsCheckingRole(false);
      return;
    }

    // Don't check if we're already checking the role for this user
    if (isCheckingRole && lastCheckedUserIdRef.current === userId && !forceCheck) {
      return;
    }

    try {
      // Always check cache first unless forcing a check
      if (!forceCheck) {
        const cachedStatus = getCachedAdminStatus(userId);
        if (cachedStatus) {
          setIsAdmin(cachedStatus.isAdmin);
          return;
        }
      }

      setIsCheckingRole(true);
      lastCheckedUserIdRef.current = userId;

      // Get Clerk JWT and call edge function with Authorization header
      const token = await getToken();

      const response = await fetch(`${SUPABASE_URL}/functions/v1/get-user-role`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Error checking admin role:', response.statusText);
        setIsAdmin(false);
      } else {
        const data = await response.json();
        const isAdminUser = data?.role === 'admin';
        setIsAdmin(isAdminUser);

        // Update cache with the new status
        updateAdminCache(userId, isAdminUser);
      }
    } catch (error) {
      console.error('Unexpected error checking admin role:', error);
      setIsAdmin(false);
    } finally {
      setIsCheckingRole(false);
    }
  }, [userId, isCheckingRole, getCachedAdminStatus, updateAdminCache, isAdmin, getToken]);

  useEffect(() => {
    // Prevent multiple initializations
    if (initializationRef.current && lastCheckedUserIdRef.current === userId) {
      return;
    }

    initializationRef.current = true;

    // User has changed or component mounted
    if (userId) {
      // Check if we have a valid cached status before making any API calls
      const cachedStatus = getCachedAdminStatus(userId);

      if (cachedStatus) {
        // Use cached value immediately to avoid UI flicker
        setIsAdmin(cachedStatus.isAdmin);
      } else if (lastCheckedUserIdRef.current !== userId) {
        // No valid cache and this is a different user - check role
        checkAdminRole();
      }
    } else {
      // No user, reset state
      lastCheckedUserIdRef.current = null;
      setIsAdmin(false);
      setIsCheckingRole(false);
    }
  }, [userId, getCachedAdminStatus, checkAdminRole]);

  return { user, isAdmin, isCheckingRole, checkAdminRole };
};
