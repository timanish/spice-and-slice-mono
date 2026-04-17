import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { useCartStore } from '@/stores/cart';
import { clearCartStorage } from '@/stores/cart/store';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { useUser as useClerkUser } from '@clerk/clerk-react';
import { fetchAnonymous, fetchWithAuth } from '@/lib/auth-token';
import { usePostHogTracking } from '@/hooks/usePostHogTracking';
import { PostCheckoutSignupPrompt } from '@/components/checkout/PostCheckoutSignupPrompt';

const OrderSuccessPage = () => {
  const { forceRefreshCart } = useCartStore();
  const { user } = useClerkUser();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { trackEvent } = usePostHogTracking();
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [orderCreated, setOrderCreated] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const orderAttempted = useRef(false);

  // Determine if this is a cash order (no session_id means cash payment)
  const sessionId = searchParams.get('session_id');
  const guestTrackingToken = searchParams.get('guestTrackingToken');
  const orderIdParam = searchParams.get('orderId');
  const isCashOrder = !sessionId;
  const isGuestCompletion = !!sessionId && !!guestTrackingToken;

  useEffect(() => {

    // If we have a session_id, it means this is a Stripe payment success
    // We need to create the order in the database.
    // Branches on auth: authenticated users send a JWT; guests send the
    // guest_tracking_token that was propagated through the Stripe success_url.
    // useRef guard prevents React StrictMode double-invocation.
    const canAttempt =
      sessionId &&
      !orderAttempted.current &&
      (isGuestCompletion || !!user);

    if (canAttempt) {
      orderAttempted.current = true;
      setIsCreatingOrder(true);

      const request = isGuestCompletion
        ? fetchAnonymous('complete-stripe-order', {
            sessionId,
            guestTrackingToken,
          })
        : fetchWithAuth('complete-stripe-order', { sessionId });

      request
        .then(async (response) => {
          // Handle non-JSON responses (e.g. gateway errors)
          const text = await response.text();
          let data: any;
          try {
            data = JSON.parse(text);
          } catch {
            console.error('Non-JSON response:', response.status, text);
            setOrderError(`Server error (${response.status}): ${text.substring(0, 200)}`);
            return;
          }

          if (!response.ok) {
            console.error('Error completing order:', response.status, data.error);

            // Check if it's a payment not completed error
            if (data.error?.includes('Payment not completed') ||
                data.error?.includes('Session not complete')) {
              console.log('Payment was not completed, redirecting to checkout');
              navigate('/checkout', { replace: true });
            } else {
              // Show error state on the page instead of a toast
              setOrderError(data.error || `Server error (${response.status})`);
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

            if (isGuestCompletion) {
              // Guest flow: no server cart to refresh. Clear local cart so
              // the UI doesn't keep showing the just-purchased items.
              clearCartStorage();
              useCartStore.setState({ items: [], comboItems: [] });
            } else {
              forceRefreshCart();
            }
          }
        })
        .catch((err) => {
          console.error('Error completing order:', err);
          setOrderError(err.message || 'Network error — please check your connection and try again.');
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
  }, [sessionId, user, isGuestCompletion, guestTrackingToken]);

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

  if (orderError) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navigation />
        <div className="flex-grow container mx-auto py-12 px-4">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <div className="flex justify-center">
              <AlertTriangle className="w-24 h-24 text-amber-500" />
            </div>
            <h1 className="text-3xl font-serif font-bold">Order Could Not Be Completed</h1>
            <p className="text-lg text-gray-700">
              Your payment was successful, but we had trouble saving your order.
              Don't worry — you have not been charged twice.
            </p>
            <p className="text-gray-600">
              Please contact us so we can resolve this for you.
            </p>
            {orderError && (
              <p className="text-xs text-gray-400 bg-gray-50 rounded p-3 font-mono break-all">
                Error: {orderError}
              </p>
            )}
            <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild>
                <Link to="/">Go to Homepage</Link>
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

          {isGuestCompletion && orderCreated && orderIdParam && guestTrackingToken && (
            <PostCheckoutSignupPrompt
              orderId={orderIdParam}
              guestTrackingToken={guestTrackingToken}
            />
          )}

          <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild>
              <Link to="/">Continue Shopping</Link>
            </Button>
            <Button variant="outline" asChild>
              {isGuestCompletion && orderIdParam && guestTrackingToken ? (
                <Link
                  to={`/guest-track/${orderIdParam}?token=${encodeURIComponent(
                    guestTrackingToken,
                  )}`}
                >
                  View Order Status
                </Link>
              ) : (
                <Link to="/profile?tab=orders">View Your Orders</Link>
              )}
            </Button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default OrderSuccessPage;
