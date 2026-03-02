
// NOTE: This page is for Supabase Auth email confirmation
// With Clerk authentication, email verification is handled automatically by Clerk
// This page may not be needed anymore

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ProfileCompletionPopover from '@/components/profile/ProfileCompletionPopover';

const ConfirmEmailPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showProfilePopover, setShowProfilePopover] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');

  const token = searchParams.get('token');
  const type = searchParams.get('type');

  useEffect(() => {
    const confirmEmail = async () => {
      if (!token || type !== 'signup') {
        setError('Invalid confirmation link.');
        setLoading(false);
        return;
      }

      try {
        console.log('Confirming email with token:', token);
        
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'signup'
        });
        
        if (error) {
          console.error('Email confirmation error:', error);
          setError('Email confirmation failed. The link may be invalid or expired.');
          toast({
            variant: "destructive",
            title: "Confirmation failed",
            description: error.message,
          });
        } else if (data.user) {
          console.log('Email confirmed successfully:', data.user);
          
          // Set user email and show profile completion popover
          setUserEmail(data.user.email || '');
          setShowProfilePopover(true);
          
          toast({
            title: "Email confirmed!",
            description: "Please complete your profile to get started.",
          });
        }
      } catch (error: any) {
        console.error('Unexpected confirmation error:', error);
        setError('An unexpected error occurred during confirmation.');
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message,
        });
      } finally {
        setLoading(false);
      }
    };

    confirmEmail();
  }, [token, type, toast]);

  const handleProfilePopoverClose = () => {
    setShowProfilePopover(false);
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Confirming your email...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
          <div>
            <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
              Email Confirmation Error
            </h2>
          </div>
          
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>

          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/auth')}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Email Confirmed!
          </h2>
          <p className="mt-2 text-gray-600">
            Your email has been successfully confirmed.
          </p>
        </div>
      </div>
      
      <ProfileCompletionPopover
        isOpen={showProfilePopover}
        onClose={handleProfilePopoverClose}
        userEmail={userEmail}
      />
    </div>
  );
};

export default ConfirmEmailPage;
