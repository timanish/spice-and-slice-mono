import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useUser as useClerkUser } from '@clerk/clerk-react';
import { useUserData } from '@/hooks/useUserData';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertTriangle, Mail, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { usePostHogTracking } from '@/hooks/usePostHogTracking';

interface OrderItem {
  id: string;
  quantity: number;
  price_per_unit: number;
  combo_id?: string | null;
  combo_name?: string | null;
  product: {
    name: string;
    image_url?: string;
  };
}

interface Order {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  payment_method: string;
  fulfillment_type?: string;
  fulfillment_status?: string;
  delivery_date?: string;
  delivery_time?: string;
  pickup_date?: string;
  pickup_time?: string;
  discount_amount?: number;
  tax_amount?: number;
  taxable_amount?: number;
  delivery_fee?: number;
  address_id?: string;
  card_last4?: string;
  card_brand?: string;
  card_exp_month?: number;
  card_exp_year?: number;
  confirmation_token?: string | null;
  confirmation_token_expires_at?: string | null;
  order_items: OrderItem[];
  profiles: {
    full_name: string;
    email: string;
    phone_number: string;
  };
  user_addresses?: {
    label: string;
    address_line1: string;
    city: string;
    state: string;
    postal_code: string;
  } | null;
}

const OrderDetailsPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isSignedIn } = useClerkUser();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const { trackEvent } = usePostHogTracking();
  const { getOrder } = useUserData();

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!isSignedIn || !user?.id || !orderId) {
        navigate('/auth');
        return;
      }

      try {
        const result = await getOrder(orderId);
        const orderData = result.data;

        if (!orderData) throw new Error('Order not found');

        // Reshape order_items to match expected shape
        const shapedItems = (orderData.order_items || []).map((item: any) => ({
          id: item.id,
          quantity: item.quantity,
          price_per_unit: item.price_per_unit,
          combo_id: item.combo_id || null,
          combo_name: item.combo_name || null,
          product: item.products || { name: 'Unknown Product' },
        }));

        const fullOrder = {
          ...orderData,
          order_items: shapedItems,
        };

        setOrder(fullOrder as Order);

        trackEvent('order_details_viewed', {
          order_id: orderId || '',
          order_status: orderData?.status || 'unknown',
        });
      } catch (error: unknown) {
        console.error('Error fetching order:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load order details',
        });
        navigate('/profile');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId, user?.id, isSignedIn, navigate, toast, getOrder]);

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending_review':
        return 'bg-orange-100 text-orange-800';
      case 'awaiting_customer_confirmation':
        return 'bg-amber-100 text-amber-800';
      case 'confirmed':
        return 'bg-teal-100 text-teal-800';
      case 'preparing':
        return 'bg-purple-100 text-purple-800';
      case 'out_for_delivery':
        return 'bg-blue-100 text-blue-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatusLabel = (status: string) => {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">Loading order details...</div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">Order not found</div>
        </div>
        <Footer />
      </div>
    );
  }

  // Separate regular items and combo items
  const regularItems = order.order_items.filter(item => !item.combo_id);

  // Group combo items by combo_id
  const comboGroups = new Map<string, { name: string; items: OrderItem[]; totalPrice: number }>();
  for (const item of order.order_items.filter(i => i.combo_id)) {
    const key = item.combo_id!;
    if (!comboGroups.has(key)) {
      comboGroups.set(key, { name: item.combo_name || 'Combo', items: [], totalPrice: 0 });
    }
    const group = comboGroups.get(key)!;
    group.items.push(item);
    group.totalPrice += item.quantity * item.price_per_unit;
  }

  const subtotal = order.order_items.reduce(
    (sum, item) => sum + item.quantity * item.price_per_unit,
    0
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <div className="flex-1 container max-w-4xl py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/profile')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Orders
        </Button>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">Order Details</h1>
              <p className="text-gray-600">Order ID: {order.id}</p>
              <p className="text-gray-600">
                Placed on {format(new Date(order.created_at), 'MMMM dd, yyyy')} at{' '}
                {format(new Date(order.created_at), 'h:mm a')}
              </p>
            </div>
            <span
              className={`px-3 py-1 text-sm rounded-full ${getStatusBadgeClass(
                order.fulfillment_status || order.status
              )}`}
            >
              {formatStatusLabel(order.fulfillment_status || order.status)}
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {order.fulfillment_type === 'delivery' && order.user_addresses && (
              <div>
                <h3 className="font-semibold mb-2">Delivery Address</h3>
                <p className="text-gray-700">{order.profiles.full_name}</p>
                <p className="text-gray-700">{order.user_addresses.address_line1}</p>
                <p className="text-gray-700">
                  {order.user_addresses.city}, {order.user_addresses.state}{' '}
                  {order.user_addresses.postal_code}
                </p>
                <p className="text-gray-700 mt-2">{order.profiles.phone_number}</p>
              </div>
            )}

            <div className={order.fulfillment_type === 'pickup' ? 'md:col-span-2' : ''}>
              {order.fulfillment_type === 'pickup' ? (
                <>
                  <h3 className="font-semibold mb-2">Pickup Details</h3>
                  {order.pickup_date && order.pickup_time ? (
                    <>
                      <p className="text-gray-700">Pickup Date: {order.pickup_date}</p>
                      <p className="text-gray-700">Pickup Time: {order.pickup_time}</p>
                      <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="font-medium text-amber-900">Store Location</p>
                        <p className="text-gray-700 mt-1">Spice & Slice</p>
                        <p className="text-gray-600 text-sm">Please arrive during your scheduled time slot</p>
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-500">Not scheduled</p>
                  )}
                </>
              ) : (
                <>
                  <h3 className="font-semibold mb-2">Delivery Details</h3>
                  {order.delivery_date && order.delivery_time ? (
                    <>
                      <p className="text-gray-700">Date: {order.delivery_date}</p>
                      <p className="text-gray-700">Time: {order.delivery_time}</p>
                    </>
                  ) : (
                    <p className="text-gray-500">Not scheduled</p>
                  )}
                </>
              )}
              <h3 className="font-semibold mt-4 mb-2">Payment Method</h3>
              {order.payment_method === 'card' && order.card_last4 ? (
                <div className="text-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="capitalize">{order.card_brand || 'Card'}</span>
                    <span className="text-gray-400">••••</span>
                    <span>{order.card_last4}</span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-700 capitalize">{order.payment_method}</p>
              )}
            </div>
          </div>
        </div>

        {/* Status-specific action banners */}
        {order.fulfillment_status === 'pending_review' && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-6">
            <div className="flex gap-4">
              <AlertTriangle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-900 mb-2">Your Order is Being Reviewed</h3>
                <p className="text-orange-800 text-sm mb-3">
                  Our team is checking our inventory to ensure the items you ordered are available. Some items may come in different pre-packaged weights, so we verify the best match for you.
                </p>
                <div className="flex items-center gap-2 text-sm text-orange-700">
                  <Clock className="h-4 w-4" />
                  <span>Typical review time: 1–3 hours during business hours</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {order.fulfillment_status === 'awaiting_customer_confirmation' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6">
            <div className="flex gap-4">
              <Mail className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 mb-2">Action Required: Confirm Your Order</h3>
                <p className="text-amber-800 text-sm mb-3">
                  We've reviewed your order and may have made some adjustments based on our available inventory. Please review the details below and confirm to proceed with payment.
                </p>
                {order.confirmation_token && (
                  <>
                    {order.confirmation_token_expires_at && (
                      <p className="text-amber-700 text-xs mb-4">
                        Confirmation link expires: {format(new Date(order.confirmation_token_expires_at), 'MMMM dd, yyyy h:mm a')}
                      </p>
                    )}
                    <Button
                      onClick={() => navigate(`/order-confirm/${order.id}?token=${order.confirmation_token}`)}
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      Confirm {order.payment_method === 'card' ? '& Pay' : 'Order'}
                    </Button>
                  </>
                )}
                {!order.confirmation_token && (
                  <p className="text-amber-700 text-sm">
                    Please check your email for the confirmation link. The link works for 48 hours.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="font-semibold text-lg mb-4">Order Items</h3>
          {!order.order_items || order.order_items.length === 0 ? (
            <p className="text-gray-500">No items found in this order</p>
          ) : (
            <div className="space-y-4">
              {/* Regular items */}
              {regularItems.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center border-b pb-4"
                >
                  <div className="flex gap-4">
                    {item.product?.image_url && (
                      <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                    <div>
                      <p className="font-medium">{item.product?.name || 'Unknown Product'}</p>
                      <p className="text-sm text-gray-600">
                        {item.quantity} × ${item.price_per_unit.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <p className="font-medium">
                    ${(item.quantity * item.price_per_unit).toFixed(2)}
                  </p>
                </div>
              ))}

              {/* Combo groups */}
              {Array.from(comboGroups.entries()).map(([comboId, group]) => (
                <div key={comboId} className="border-b pb-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{group.name}</p>
                        <span className="text-xs bg-food-orange text-white px-2 py-0.5 rounded-full">Combo</span>
                      </div>
                    </div>
                    <p className="font-medium">${group.totalPrice.toFixed(2)}</p>
                  </div>
                  <div className="ml-4 space-y-1">
                    {group.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="text-gray-400">•</span>
                        <span>{item.product?.name || 'Unknown Product'}</span>
                        {item.quantity > 1 && <span className="text-gray-400">(x{item.quantity})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 pt-4 border-t space-y-2">
            <div className="flex justify-between text-gray-700">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Promo Discount</span>
                <span>-${order.discount_amount.toFixed(2)}</span>
              </div>
            )}
            {order.delivery_fee > 0 && (
              <div className="flex justify-between text-gray-700">
                <span>Delivery Fee</span>
                <span>${order.delivery_fee.toFixed(2)}</span>
              </div>
            )}
            {order.tax_amount > 0 && (
              <div className="flex justify-between text-gray-700">
                <span>Tax</span>
                <span>${order.tax_amount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-bold pt-2 border-t">
              <span>Total</span>
              <span>${order.total_amount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default OrderDetailsPage;
