import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { SUPABASE_URL } from '@/integrations/supabase/client';
import {
  Clock,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Package,
  TrendingUp,
  CreditCard,
  AlertTriangle,
} from 'lucide-react';

interface OrderDetails {
  id: string;
  payment_method: 'card' | 'cash';
  fulfillment_type: 'delivery' | 'pickup' | 'nationwide';
  total_amount: number;
  delivery_fee: number;
  discount_amount: number;
  tax_amount: number;
  taxable_amount: number;
  delivery_date?: string;
  delivery_time?: string;
  pickup_date?: string;
  pickup_time?: string;
  delivery_address_line1?: string;
  delivery_city?: string;
  delivery_state?: string;
  delivery_postal_code?: string;
  confirmation_token_expires_at?: string;
}

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  original_quantity?: number;
  price_per_unit: number;
  tax_amount: number;
}

const OrderConfirmPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if token is expired
  const isTokenExpired = order?.confirmation_token_expires_at
    ? new Date(order.confirmation_token_expires_at) < new Date()
    : false;

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId || !token) {
        setError('Invalid confirmation link');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        // Fetch order details - validates token and returns order
        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/confirm-customer-order`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              orderId,
              token,
              action: 'get', // Just fetch, don't confirm yet
            }),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to load order details');
        }

        const result = await response.json();

        if (result.success && result.order) {
          setOrder(result.order);

          // Format order items for display
          const formatted = result.orderItems.map((item: any) => ({
            id: item.id,
            product_name: item.products?.name || 'Product',
            quantity: item.quantity,
            original_quantity: item.original_quantity,
            price_per_unit: item.price_per_unit,
            tax_amount: item.tax_amount,
          }));

          setOrderItems(formatted);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        console.error('Error fetching order:', err);
        setError(err instanceof Error ? err.message : 'Failed to load order details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, token]);

  const handleConfirm = async () => {
    if (!orderId || !token) return;

    setIsConfirming(true);
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/confirm-customer-order`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId,
            token,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to confirm order');
      }

      const result = await response.json();

      if (result.paymentMethod === 'card' && result.stripeUrl) {
        // Redirect to Stripe for payment
        window.location.href = result.stripeUrl;
      } else if (result.paymentMethod === 'cash') {
        // Cash order confirmed
        toast({
          title: 'Order Confirmed!',
          description: 'Your order has been confirmed and is being prepared.',
        });
        setTimeout(() => {
          navigate('/order-success');
        }, 1500);
      }
    } catch (err) {
      console.error('Confirmation error:', err);
      const message = err instanceof Error ? err.message : 'Failed to confirm order';
      toast({
        title: 'Confirmation Failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsConfirming(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Navigation />
        <div className="container max-w-2xl mx-auto px-4 py-16">
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-900">
                <AlertTriangle className="h-5 w-5" />
                Invalid Confirmation Link
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-700 mb-4">
                This confirmation link is missing or invalid. Please check your email for the correct link.
              </p>
              <Button onClick={() => navigate('/')} className="w-full">
                Return Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Navigation />
        <div className="container max-w-2xl mx-auto px-4 py-16">
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-900">Error</CardTitle>
              <CardDescription className="text-red-700">
                {error || 'Order not found'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/')} className="w-full">
                Return Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isTokenExpired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Navigation />
        <div className="container max-w-2xl mx-auto px-4 py-16">
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-900">
                <Clock className="h-5 w-5" />
                Confirmation Link Expired
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-orange-700 mb-4">
                This confirmation link has expired. Confirmation links are valid for 48 hours.
              </p>
              <p className="text-orange-700 mb-6">
                Please contact us at{' '}
                <a
                  href="mailto:spiceandslicedfw@gmail.com"
                  className="font-semibold underline hover:no-underline"
                >
                  spiceandslicedfw@gmail.com
                </a>{' '}
                to confirm your order.
              </p>
              <Button onClick={() => navigate('/')} className="w-full">
                Return Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const subtotal = order.taxable_amount;
  const hasAdjustments = orderItems.some((item) => item.original_quantity && item.original_quantity !== item.quantity);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navigation />
      <div className="container max-w-3xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-orange-100 rounded-full">
              <Package className="h-8 w-8 text-orange-700" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Review & Confirm Your Order
          </h1>
          <p className="text-lg text-gray-600">
            Order #<span className="font-mono font-semibold">{orderId?.substring(0, 8).toUpperCase()}</span>
          </p>
        </div>

        {/* Adjustments Notice */}
        {hasAdjustments && (
          <Card className="mb-8 border-orange-200 bg-orange-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-orange-900 mb-1">
                    Items Adjusted
                  </p>
                  <p className="text-orange-800 text-sm">
                    Some items were adjusted based on our available inventory. Strikethrough shows original quantity, bold shows adjusted quantity.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Items */}
        {orderItems.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {orderItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-start py-4 border-b last:border-b-0">
                    <div className="flex-grow">
                      <p className="font-medium text-gray-900">{item.product_name}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {item.original_quantity && item.original_quantity !== item.quantity ? (
                          <>
                            <span className="line-through text-gray-400">
                              {item.original_quantity}
                            </span>
                            {' → '}
                            <span className="font-bold text-orange-600">
                              {item.quantity}
                            </span>
                          </>
                        ) : (
                          <span>{item.quantity}</span>
                        )}
                        {' × $'}
                        {item.price_per_unit.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        ${(item.quantity * item.price_per_unit).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pricing Summary */}
        <Card className="mb-8 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle>Pricing Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-gray-700">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {order.delivery_fee > 0 && (
              <div className="flex justify-between text-gray-700">
                <span>Delivery Fee</span>
                <span>${order.delivery_fee.toFixed(2)}</span>
              </div>
            )}
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-green-700">
                <span>Discount</span>
                <span>-${order.discount_amount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-700">
              <span>Tax</span>
              <span>${order.tax_amount.toFixed(2)}</span>
            </div>
            <Separator className="bg-blue-200" />
            <div className="flex justify-between font-bold text-lg text-gray-900">
              <span>Total</span>
              <span className="text-blue-600">${order.total_amount.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Fulfillment Details */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Fulfillment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Type:</span>
              <span className="font-medium capitalize">{order.fulfillment_type}</span>
            </div>

            {order.fulfillment_type === 'delivery' && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery Date:</span>
                  <span className="font-medium">{order.delivery_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery Time:</span>
                  <span className="font-medium">{order.delivery_time}</span>
                </div>
                {order.delivery_address_line1 && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-gray-600 mb-2">Delivery Address:</p>
                    <p className="font-medium">
                      {order.delivery_address_line1}
                      <br />
                      {order.delivery_city}, {order.delivery_state} {order.delivery_postal_code}
                    </p>
                  </div>
                )}
              </>
            )}

            {order.fulfillment_type === 'pickup' && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pickup Date:</span>
                  <span className="font-medium">{order.pickup_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pickup Time:</span>
                  <span className="font-medium">{order.pickup_time}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Confirmation Action */}
        <Card className={order.payment_method === 'card' ? 'mb-8 border-blue-200 bg-blue-50' : 'mb-8'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {order.payment_method === 'card' ? (
                <>
                  <CreditCard className="h-5 w-5" />
                  Ready to Pay
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  Confirm Order
                </>
              )}
            </CardTitle>
            <CardDescription>
              {order.payment_method === 'card'
                ? 'Click below to proceed to payment'
                : 'Confirm your order for cash on delivery'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              size="lg"
              className="w-full"
              onClick={handleConfirm}
              disabled={isConfirming}
            >
              {isConfirming ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Processing...
                </>
              ) : order.payment_method === 'card' ? (
                <>
                  Confirm & Pay ${order.total_amount.toFixed(2)}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  Confirm Order
                  <CheckCircle className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Support Info */}
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="pt-6">
            <p className="text-gray-700 text-sm mb-2">
              <span className="font-semibold">Questions or changes?</span>
            </p>
            <p className="text-gray-600 text-sm">
              Contact us at{' '}
              <a
                href="mailto:spiceandslicedfw@gmail.com"
                className="font-medium text-blue-600 hover:underline"
              >
                spiceandslicedfw@gmail.com
              </a>{' '}
              before confirming your order.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OrderConfirmPage;
