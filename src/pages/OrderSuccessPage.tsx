import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { useCartStore } from '@/stores/cart';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useUser as useClerkUser } from '@clerk/clerk-react';
import { fetchWithAuth } from '@/lib/auth-token';
import { useToast } from '@/hooks/use-toast';
import { usePostHogTracking } from '@/hooks/usePostHogTracking';

const OrderSuccessPage = () => {
  const { forceRefreshCart } = useCartStore();
  const { user } = useClerkUser();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { trackEvent } = usePostHogTracking();
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [orderCreated, setOrderCreated] = useState(false);
  
  // Determine if this is a cash order (no session_id means cash payment)
  const sessionId = searchParams.get('session_id');
  const isCashOrder = !sessionId;
  
  useEffect(() => {
    
    // If we have a session_id, it means this is a Stripe payment success
    // We need to create the order in the database
    if (sessionId && user && !orderCreated && !isCreatingOrder) {
      setIsCreatingOrder(true);
      
      // Call edge function to complete the order (using Clerk JWT auth)
      fetchWithAuth('complete-stripe-order', { sessionId })
        .then(async (response) => {
          const data = await response.json();

          if (!response.ok) {
            console.error('Error completing order:', data.error);

            // Check if it's a payment not completed error
            if (data.error?.includes('Payment not completed') ||
                data.error?.includes('Session not complete')) {
              console.log('Payment was not completed, redirecting to checkout');
              toast({
                title: 'Payment Incomplete',
                description: 'Your payment was not completed. Please try again.',
                variant: 'destructive',
              });
              navigate('/checkout', { replace: true });
            } else {
              toast({
                title: 'Warning',
                description: 'Your payment was successful, but there was an issue saving your order. Please contact support.',
                variant: 'destructive',
              });
            }
          } else {
            console.log('Order created successfully:', data);
            setOrderCreated(true);

            if (data?.orderId) {
              trackEvent('order_success_viewed', {
                order_id: data.orderId,
              });

              if (data.orderDetails) {
                const details = data.orderDetails;
                trackEvent('checkout_completed', {
                  order_id: data.orderId,
                  total_amount: details.total_amount || 0,
                  payment_method: 'card',
                  fulfillment_type: details.fulfillment_type || 'delivery',
                  items_count: details.items_count || 0,
                  had_promo_code: !!details.promo_code_id,
                  discount_amount: details.discount_amount,
                  delivery_fee: details.delivery_fee,
                  tax_amount: details.tax_amount,
                });
              }
            }

            forceRefreshCart();
          }
        })
        .catch((err) => {
          console.error('Error completing order:', err);
          toast({
            title: 'Error',
            description: 'There was an issue processing your order. Please contact support.',
            variant: 'destructive',
          });
          navigate('/checkout', { replace: true });
        })
        .finally(() => {
          setIsCreatingOrder(false);
        });
    } else if (!sessionId) {
      // No session_id means this is a cash order (already created)
      // Track order success view for cash orders
      trackEvent('order_success_viewed', {
        order_id: 'cash-order',
      });
      
      // Force refresh the cart to show it's empty (bypass cache)
      const timeoutId = setTimeout(() => {
        forceRefreshCart();
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [searchParams, user, orderCreated, isCreatingOrder, forceRefreshCart, toast, navigate]);

  if (isCreatingOrder) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navigation />
        <div className="flex-grow container mx-auto py-12 px-4">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <div className="flex justify-center">
              <Loader2 className="w-24 h-24 text-food-red animate-spin" />
            </div>
            <h1 className="text-3xl font-serif font-bold">Processing Your Order...</h1>
            <p className="text-lg text-gray-700">
              Please wait while we complete your order.
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
          <h1 className="text-3xl font-serif font-bold">Order Successful!</h1>
          <p className="text-lg text-gray-700">
            {isCashOrder 
              ? "Thank you for your order. Please have the exact amount ready when your order arrives."
              : "Thank you for your order. Your payment has been processed successfully."}
          </p>
          
          {user?.primaryEmailAddress && (
            <p className="text-gray-600">
              A confirmation email has been sent to {user.primaryEmailAddress.emailAddress}.
            </p>
          )}
          
          <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild>
              <Link to="/">Continue Shopping</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/profile?tab=orders">View Your Orders</Link>
            </Button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default OrderSuccessPage;
