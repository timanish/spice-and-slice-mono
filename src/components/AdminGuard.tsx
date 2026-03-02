
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/hooks/use-user-clerk';
import { useToast } from '@/hooks/use-toast';

export const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const { user, isAdmin, isCheckingRole, checkAdminRole, isLoaded } = useUser();
  const [initialized, setInitialized] = useState(false);
  const { toast } = useToast();
  const hasShownToast = useRef(false);

  useEffect(() => {
    if (user && !initialized && isLoaded) {
      checkAdminRole(true);
      setInitialized(true);
    }
  }, [user, checkAdminRole, initialized, isLoaded]);

  useEffect(() => {
    if (!isCheckingRole && isLoaded) {
      if (!user) {
        if (!hasShownToast.current) {
          toast({
            title: "Authentication required",
            description: "Please log in to access admin features"
          });
          hasShownToast.current = true;
        }
        navigate('/auth', { replace: true });
        return;
      }
      
      if (initialized && !isAdmin) {
        if (!hasShownToast.current) {
          toast({
            variant: "destructive",
            title: "Access denied",
            description: "You don't have permission to access this area"
          });
          hasShownToast.current = true;
        }
        navigate('/', { replace: true });
        return;
      }
    }
  }, [user, isAdmin, isCheckingRole, navigate, initialized, toast, isLoaded]);

  useEffect(() => {
    return () => {
      hasShownToast.current = false;
    };
  }, []);

  if (isCheckingRole || !initialized || !isLoaded) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return isAdmin ? <>{children}</> : null;
};
