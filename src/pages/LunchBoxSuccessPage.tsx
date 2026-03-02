import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useUser as useClerkUser } from '@clerk/clerk-react';
import { useQueryClient } from '@tanstack/react-query';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const LunchBoxSuccessPage = () => {
  const { user } = useClerkUser();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      navigate('/lunch-box', { replace: true });
      return;
    }

    if (!user || isComplete || isProcessing) return;

    setIsProcessing(true);

    supabase.functions
      .invoke('complete-lunchbox-subscription', {
        body: { sessionId },
      })
      .then(({ data, error }) => {
        if (error) {
          console.error('Error completing subscription:', error);

          if (
            error.message?.includes('Payment not completed') ||
            error.message?.includes('Session not complete')
          ) {
            toast({
              title: 'Payment Incomplete',
              description: 'Your payment was not completed. Please try again.',
              variant: 'destructive',
            });
            navigate('/lunch-box', { replace: true });
          } else {
            toast({
              title: 'Warning',
              description:
                'Your payment was successful, but there was an issue setting up your subscription. Please contact support.',
              variant: 'destructive',
            });
          }
        } else {
          console.log('Subscription created successfully:', data);
          setIsComplete(true);

          // Invalidate lunch box queries so dashboard picks up the new subscription
          queryClient.invalidateQueries({ queryKey: ['lunchBoxSubscription'] });
          queryClient.invalidateQueries({ queryKey: ['allLunchBoxSubscriptions'] });
        }
      })
      .catch((err) => {
        console.error('Error completing subscription:', err);
        toast({
          title: 'Error',
          description:
            'There was an issue processing your subscription. Please contact support.',
          variant: 'destructive',
        });
      })
      .finally(() => {
        setIsProcessing(false);
      });
  }, [sessionId, user, isComplete, isProcessing, navigate, toast, queryClient]);

  if (isProcessing) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navigation />
        <div className="flex-grow container mx-auto py-12 px-4">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <div className="flex justify-center">
              <Loader2 className="w-24 h-24 text-food-red animate-spin" />
            </div>
            <h1 className="text-3xl font-serif font-bold">Setting Up Your Subscription...</h1>
            <p className="text-lg text-gray-700">
              Please wait while we finalize your lunch box subscription.
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />
      <div className="flex-grow container mx-auto py-12 px-4">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <div className="flex justify-center">
            <CheckCircle className="w-24 h-24 text-green-500" />
          </div>
          <h1 className="text-3xl font-serif font-bold">Subscription Confirmed!</h1>
          <p className="text-lg text-gray-700">
            Thank you for subscribing to the Lunch Box Delivery Program. Your payment has been
            processed and your subscription is now active.
          </p>

          {user?.primaryEmailAddress && (
            <p className="text-gray-600">
              A confirmation email has been sent to {user.primaryEmailAddress.emailAddress}.
            </p>
          )}

          <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild>
              <Link to="/lunch-box">View My Subscription</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/">Continue Shopping</Link>
            </Button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default LunchBoxSuccessPage;
