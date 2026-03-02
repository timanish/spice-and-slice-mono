
import { useEffect, useState } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ProfileCompletionPopover from '@/components/profile/ProfileCompletionPopover';

interface EmailConfirmationHandlerProps {
  onError: (error: string) => void;
  onLoading: (loading: boolean) => void;
}

export const EmailConfirmationHandler = ({ onError, onLoading }: EmailConfirmationHandlerProps) => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { toast } = useToast();
  const [showProfilePopover, setShowProfilePopover] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');
      
      if (errorParam) {
        
        let userFriendlyMessage = 'Email confirmation failed.';
        if (errorParam === 'access_denied' && errorDescription?.includes('invalid or has expired')) {
          userFriendlyMessage = 'The email confirmation link has expired or is invalid. Please try signing up again.';
        } else if (errorDescription) {
          userFriendlyMessage = decodeURIComponent(errorDescription);
        }
        
        onError(userFriendlyMessage);
        toast({
          variant: "destructive",
          title: "Email confirmation failed",
          description: userFriendlyMessage,
        });
        
        const newUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, '', newUrl);
        return;
      }

      const confirmationType = searchParams.get('type');
      const isEmailConfirmation = !confirmationType || confirmationType === 'signup' || confirmationType === 'email_change';
      const hasConfirmationParams = searchParams.get('token_hash') || 
                                   searchParams.get('code') || 
                                   searchParams.get('token');

      if (hasConfirmationParams && isEmailConfirmation) {
        // console.log('Processing email confirmation - Supabase will handle it automatically');
        onLoading(true);
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          // console.log('EmailConfirmationHandler - Auth state change:', event, session?.user?.email);
          
          if (event === 'SIGNED_IN' && session?.user) {
            const urlParams = new URLSearchParams(window.location.search);
            const hasConfirmationParams = urlParams.get('code') || urlParams.get('token_hash') || urlParams.get('token');
            
            if (hasConfirmationParams) {
              // console.log('User signed in via email confirmation');
              setUserEmail(session.user.email || '');
              setShowProfilePopover(true);
              
              toast({
                title: "Email confirmed!",
                description: "Welcome! Please complete your profile to get started.",
              });
              
              const newUrl = window.location.origin + window.location.pathname;
              window.history.replaceState({}, '', newUrl);
              
              onLoading(false);
              subscription.unsubscribe();
            }
          }
        });

        setTimeout(() => {
          subscription.unsubscribe();
          onLoading(false);
        }, 10000);
      }
    };

    handleEmailConfirmation();
  }, [searchParams, location.search, toast, onError, onLoading]);

  return (
    <ProfileCompletionPopover
      isOpen={showProfilePopover}
      onClose={() => setShowProfilePopover(false)}
      userEmail={userEmail}
    />
  );
};
