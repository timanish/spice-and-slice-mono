
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useResetPasswordLogic = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isValidResetLink, setIsValidResetLink] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const initializePasswordReset = useCallback(async () => {

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      
      const isRecoveryType = urlParams.get('type') === 'recovery' || hashParams.get('type') === 'recovery';
      const hasTokens = urlParams.has('token_hash') || hashParams.has('access_token') || urlParams.has('token') || urlParams.has('refresh_token');
      if (isRecoveryType || hasTokens) {
        const token = urlParams.get('token') || urlParams.get('token_hash') || hashParams.get('token') || hashParams.get('token_hash');
        const type = urlParams.get('type') || hashParams.get('type');
        
        if (token && type === 'recovery') {
          
          try {
            const { data, error } = await supabase.auth.verifyOtp({
              token_hash: token,
              type: 'recovery'
            });
            
            if (error) {
              console.error('OTP verification failed:', error);
            } else if (data.session) {
              setIsValidResetLink(true);
              window.history.replaceState(null, '', window.location.pathname);
              return;
            }
          } catch (otpError) {
            console.error('OTP verification error:', otpError);
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setErrorMsg('Error accessing your session. Please try requesting a new password reset.');
        } else if (session && session.user) {
          setIsValidResetLink(true);
          window.history.replaceState(null, '', window.location.pathname);
        } else {
          setErrorMsg('Invalid or expired reset link. Please request a new password reset.');
        }
      } else {
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setErrorMsg('Error accessing your session. Please try requesting a new password reset.');
        } else if (session) {
          setIsValidResetLink(true);
        } else {
          setErrorMsg('No valid reset session found. Please click the reset link in your email.');
        }
      }
      
    } catch (error: any) {
      console.error('Unexpected error during password reset initialization:', error);
      setErrorMsg('An error occurred. Please try again or request a new password reset link.');
    } finally {
      setIsInitializing(false);
    }
  }, []);

  const handleResetPassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match.');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters.');
      }
      
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      toast({
        title: "Password updated successfully",
        description: "Your password has been updated. You can now sign in with your new password.",
      });
      await supabase.auth.signOut();
      
      setTimeout(() => {
        navigate('/auth');
      }, 2000);
    } catch (error: any) {
      console.error('Password reset error:', error);
      setErrorMsg(error.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [password, confirmPassword, toast, navigate]);

  const handleBackToAuth = useCallback(() => {
    navigate('/auth');
  }, [navigate]);

  useEffect(() => {
    initializePasswordReset();
  }, [initializePasswordReset]);

  return {
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    loading,
    errorMsg,
    isValidResetLink,
    isInitializing,
    handleResetPassword,
    handleBackToAuth
  };
};
