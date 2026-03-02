import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import { useToast } from '@/components/ui/use-toast';
import { checkProfileComplete } from '@/utils/profileUtils';

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate('/auth');
    }
  }, [isLoaded, isSignedIn, navigate]);

  useEffect(() => {
    const checkProfile = async () => {
      if (!user) return;
      
      const currentPath = window.location.pathname;
      const isOnProtectedPage = !['/auth', '/profile', '/onboarding', '/', '/catering', '/lunch-box', '/contact'].includes(currentPath);
      
      if (isOnProtectedPage) {
        const isComplete = await checkProfileComplete(user.id);
        if (!isComplete) {
          toast({
            title: "Profile Incomplete",
            description: "Please complete your profile information",
            variant: "destructive",
          });
          navigate('/profile');
        }
      }
    };

    if (isSignedIn && user) {
      checkProfile();
    }
  }, [isSignedIn, user, navigate, toast]);

  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return isSignedIn ? <>{children}</> : null;
};
