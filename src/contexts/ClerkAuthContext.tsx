import { createContext, ReactNode, useEffect } from 'react';
import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { registerTokenGetter } from '@/lib/auth-token';

interface AuthContextType {
  user: ReturnType<typeof useClerkUser>['user'];
  isLoading: boolean;
  isSignedIn: boolean;
  signOut: () => Promise<void>;
  redirectToHome: () => void;
}

const ClerkAuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { isLoaded, isSignedIn, signOut: clerkSignOut, getToken } = useClerkAuth();
  const { user } = useClerkUser();
  const navigate = useNavigate();

  // Register Clerk's getToken for non-React contexts (Zustand stores)
  useEffect(() => {
    registerTokenGetter(getToken);
  }, [getToken]);

  const signOut = async () => {
    await clerkSignOut();
    navigate('/');
  };

  const redirectToHome = () => {
    navigate('/');
  };

  const value: AuthContextType = {
    user: isSignedIn ? user : null,
    isLoading: !isLoaded,
    isSignedIn: isSignedIn || false,
    signOut,
    redirectToHome,
  };

  return (
    <ClerkAuthContext.Provider value={value}>
      {children}
    </ClerkAuthContext.Provider>
  );
};

// Export useAuth from a separate file to avoid Fast Refresh issues
export { ClerkAuthContext };
