import { useUser as useClerkUser, useAuth } from "@clerk/clerk-react";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

type CachedAdminStatus = {
  isAdmin: boolean;
  timestamp: number;
};

const CACHE_DURATION = 5 * 60 * 1000;

declare global {
  interface Window {
    globalAdminCache?: Record<string, CachedAdminStatus>;
  }
}

if (typeof window !== 'undefined' && !window.globalAdminCache) {
  window.globalAdminCache = {};
}

export const useUser = () => {
  const { user: clerkUser, isLoaded } = useClerkUser();
  const { getToken } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isCheckingRole, setIsCheckingRole] = useState<boolean>(false);
  const lastCheckedUserIdRef = useRef<string | null>(null);
  const initializationRef = useRef<boolean>(false);
  const userId = useMemo(() => clerkUser?.id || null, [clerkUser?.id]);

  const getCachedAdminStatus = useCallback((userIdToCheck: string): CachedAdminStatus | null => {
    const globalCache = window.globalAdminCache || {};
    const cachedData = globalCache[userIdToCheck];

    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
      return cachedData;
    }

    const localStorageCacheKey = `admin_status_${userIdToCheck}`;
    const localCachedData = localStorage.getItem(localStorageCacheKey);

    if (localCachedData) {
      try {
        const parsedData = JSON.parse(localCachedData);
        if (Date.now() - parsedData.timestamp < CACHE_DURATION) {
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

  const updateAdminCache = useCallback((userIdToUpdate: string, isAdminValue: boolean) => {
    const cacheData = { isAdmin: isAdminValue, timestamp: Date.now() };

    if (window.globalAdminCache) {
      window.globalAdminCache[userIdToUpdate] = cacheData;
    }

    const localStorageCacheKey = `admin_status_${userIdToUpdate}`;
    localStorage.setItem(localStorageCacheKey, JSON.stringify(cacheData));
  }, []);

  const checkAdminRole = useCallback(async (forceCheck = false) => {
    if (!userId) {
      if (isAdmin) setIsAdmin(false);
      if (isCheckingRole) setIsCheckingRole(false);
      return;
    }

    if (isCheckingRole && lastCheckedUserIdRef.current === userId && !forceCheck) {
      return;
    }

    try {
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
    if (initializationRef.current && lastCheckedUserIdRef.current === userId) {
      return;
    }

    initializationRef.current = true;

    if (userId) {
      const cachedStatus = getCachedAdminStatus(userId);

      if (cachedStatus) {
        setIsAdmin(cachedStatus.isAdmin);
      } else if (lastCheckedUserIdRef.current !== userId) {
        checkAdminRole();
      }
    } else {
      lastCheckedUserIdRef.current = null;
      setIsAdmin(false);
      setIsCheckingRole(false);
    }
  }, [userId, getCachedAdminStatus, checkAdminRole]);

  return {
    user: clerkUser,
    isAdmin,
    isCheckingRole,
    checkAdminRole,
    isLoaded
  };
};
