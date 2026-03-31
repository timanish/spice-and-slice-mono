import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useUserData } from '@/hooks/useUserData';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock, Mail, ArrowRight } from 'lucide-react';

const OrderPendingPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { getOrder } = useUserData();
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;

      try {
        setIsLoading(true);
        console.log('Fetching order:', orderId);

        if (typeof getOrder !== 'function') {
          console.error('getOrder is not a function:', typeof getOrder, getOrder);
          throw new Error('getOrder is not available');
        }

        const result = await getOrder(orderId);
        console.log('Order fetch result:', result);

        if (result?.data) {
          setOrder(result.data);
        } else {
          console.error('No data in result:', result);
          setError('Order not found');
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error('Error fetching order:', err);
        console.error('Error details:', {
          message: errorMsg,
          type: typeof err,
          stack: err instanceof Error ? err.stack : 'N/A'
        });
        setError(`Failed to load order details: ${errorMsg}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, getOrder]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Navigation />
        <div className="container max-w-2xl mx-auto px-4 py-16">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-12 bg-gray-300 rounded-full w-12 mx-auto mb-6"></div>
              <div className="h-6 bg-gray-300 rounded w-48 mx-auto mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-64 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Navigation />
        <div className="container max-w-2xl mx-auto px-4 py-16">
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-900">Error</CardTitle>
              <CardDescription className="text-red-700">{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/profile?tab=orders">
                <Button className="w-full">
                  Return to Orders
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navigation />
      <div className="container max-w-2xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-amber-100 rounded-full">
              <Clock className="h-8 w-8 text-amber-700" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Order Received!
          </h1>
          <p className="text-lg text-gray-600 mb-2">
            Your order is being reviewed
          </p>
          <p className="text-sm text-gray-500">
            Order #<span className="font-mono font-semibold">{orderId?.substring(0, 8).toUpperCase()}</span>
          </p>
        </div>

        {/* Main Card */}
        <Card className="mb-8 border-2 border-amber-100 bg-white">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50 border-b-2 border-amber-100">
            <CardTitle className="text-xl text-amber-900">What Happens Next?</CardTitle>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="space-y-8">
              {/* Step 1 */}
              <div className="flex gap-6">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-amber-100 border-2 border-amber-300">
                    <span className="text-amber-900 font-bold">1</span>
                  </div>
                </div>
                <div className="flex-grow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    Our Team Reviews Your Order
                  </h3>
                  <p className="text-gray-600">
                    We're checking our inventory to ensure the exact items you ordered are available. Some items may come in different pre-packaged weights, so our team verifies the best match for you.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-6">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-100 border-2 border-blue-300">
                    <Mail className="h-5 w-5 text-blue-900" />
                  </div>
                </div>
                <div className="flex-grow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    Check Your Email
                  </h3>
                  <p className="text-gray-600">
                    You'll receive an email with your reviewed order details. If any items were adjusted, you'll see the original quantity crossed out and the new quantity shown, along with the updated price.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-6">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-100 border-2 border-green-300">
                    <CheckCircle className="h-5 w-5 text-green-900" />
                  </div>
                </div>
                <div className="flex-grow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    Confirm & Pay
                  </h3>
                  <p className="text-gray-600">
                    Click the confirmation link in the email to review your order and complete payment. The link works for 48 hours, but typically we review orders within a few hours.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Box */}
        <Card className="mb-8 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <p className="text-blue-900">
              <span className="font-semibold">Typical review time:</span> 1-3 hours during business hours
            </p>
            <p className="text-blue-900 mt-2">
              <span className="font-semibold">Questions?</span> Contact us at{' '}
              <a href="mailto:spiceandslicedfw@gmail.com" className="font-medium underline hover:no-underline">
                spiceandslicedfw@gmail.com
              </a>
            </p>
          </CardContent>
        </Card>

        {/* Order Summary Card */}
        {order && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Order ID:</span>
                <span className="font-mono font-semibold">{orderId?.substring(0, 8).toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-sm font-medium">
                  Pending Review
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Fulfillment Type:</span>
                <span className="capitalize font-medium">{order?.fulfillment_type}</span>
              </div>
              {order?.total_amount && (
                <div className="flex justify-between pt-4 border-t border-gray-200">
                  <span className="font-semibold text-gray-900">Total:</span>
                  <span className="font-bold text-lg text-gray-900">
                    ${order.total_amount.toFixed(2)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* CTA Buttons */}
        <div className="space-y-4">
          <Link to="/profile?tab=orders" className="block">
            <Button className="w-full" variant="outline">
              View All Orders
            </Button>
          </Link>
          <Link to="/" className="block">
            <Button className="w-full">
              Continue Shopping
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderPendingPage;
