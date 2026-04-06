
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Truck, Package, ChevronRight, AlertTriangle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

interface Order {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  payment_method: string;
  payment_status?: string;
  fulfillment_status?: string;
  fulfillment_type?: string;
  delivery_date?: string;
  delivery_time?: string;
  pickup_date?: string;
  pickup_time?: string;
  confirmation_token?: string | null;
  order_items: Array<any>;
}

interface OrderHistoryProps {
  orders: Order[];
}

const OrderHistory = ({ orders }: OrderHistoryProps) => {
  const navigate = useNavigate();

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (e) {
      return dateString;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending_review':
        return 'bg-orange-100 text-orange-800';
      case 'awaiting_customer_confirmation':
        return 'bg-amber-100 text-amber-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'out_for_delivery':
        return 'bg-blue-100 text-blue-800';
      case 'preparing':
        return 'bg-purple-100 text-purple-800';
      case 'confirmed':
        return 'bg-teal-100 text-teal-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatusLabel = (status: string) => {
    if (status.toLowerCase() === 'awaiting_customer_confirmation') {
      return 'Awaiting Your Confirmation';
    }
    // Convert snake_case to Title Case
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const getPaymentBadgeClass = (paymentStatus: string) => {
    switch (paymentStatus.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-lg overflow-hidden">
        <div className="p-8 text-center">
          <h3 className="text-lg font-medium text-gray-900">No orders found</h3>
          <p className="mt-2 text-gray-500">You haven't placed any orders yet.</p>
          <Button
            className="mt-4"
            onClick={() => navigate('/')}
          >
            Browse Menu
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg overflow-hidden">
      {/* Mobile Card Layout */}
      <div className="md:hidden divide-y divide-gray-100">
        {orders.map((order) => {
          const deliveryStatus = order.fulfillment_status || order.status || 'pending';
          const scheduledDate = order.fulfillment_type === 'pickup' ? order.pickup_date : order.delivery_date;
          const scheduledTime = order.fulfillment_type === 'pickup' ? order.pickup_time : order.delivery_time;

          const needsConfirmation = deliveryStatus === 'awaiting_customer_confirmation' && order.confirmation_token;

          return (
            <div key={order.id} className={`p-4 ${needsConfirmation ? 'bg-amber-50 border-l-4 border-amber-400' : 'hover:bg-gray-50'} transition-colors`}>
              {/* Clickable area — goes to order detail */}
              <button
                onClick={() => navigate(`/order/${order.id}`)}
                className="w-full text-left"
              >
                {/* Top row: Order ID + Date */}
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-900 text-sm">
                    #{order.id.substring(0, 8).toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDate(order.created_at)}
                  </span>
                </div>

                {/* Middle row: Fulfillment type + Status */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      order.fulfillment_type === 'delivery'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {order.fulfillment_type === 'delivery' ? (
                      <>
                        <Truck className="h-3 w-3 mr-1" />
                        Delivery
                      </>
                    ) : (
                      <>
                        <Package className="h-3 w-3 mr-1" />
                        Pickup
                      </>
                    )}
                  </Badge>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusBadgeClass(deliveryStatus)}`}>
                    {formatStatusLabel(deliveryStatus)}
                  </span>
                  {needsConfirmation && (
                    <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Action Required
                    </Badge>
                  )}
                </div>

                {/* Scheduled time */}
                {scheduledDate && scheduledTime && (
                  <div className="text-xs text-gray-500 mb-2">
                    {scheduledDate} at {scheduledTime}
                  </div>
                )}

                {/* Bottom row: Total + Items */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900">
                      ${order.total_amount.toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {order.order_items?.length || 0} item(s)
                    </span>
                  </div>
                  {!needsConfirmation && <ChevronRight className="h-4 w-4 text-gray-400" />}
                </div>
              </button>

              {/* Review Order CTA — only for orders awaiting confirmation */}
              {needsConfirmation && (
                <Button
                  size="sm"
                  className="w-full mt-3 bg-amber-600 hover:bg-amber-700"
                  onClick={() => navigate(`/order-confirm/${order.id}?token=${order.confirmation_token}`)}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Review & Confirm Order
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop Table Layout */}
      <div className="hidden md:block">
        <Table>
          <TableCaption>Your order history</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Scheduled Time</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => {
              const deliveryStatus = order.fulfillment_status || order.status || 'pending';

              return (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">
                    #{order.id.substring(0, 8).toUpperCase()}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(order.created_at)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        order.fulfillment_type === 'delivery'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }
                    >
                      {order.fulfillment_type === 'delivery' ? (
                        <>
                          <Truck className="h-3 w-3 mr-1" />
                          Delivery
                        </>
                      ) : (
                        <>
                          <Package className="h-3 w-3 mr-1" />
                          Pickup
                        </>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {order.order_items?.length || 0} item(s)
                  </TableCell>
                  <TableCell className="font-semibold">
                    ${order.total_amount.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap ${getStatusBadgeClass(deliveryStatus)}`}>
                      {formatStatusLabel(deliveryStatus)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm capitalize">{order.payment_method}</div>
                  </TableCell>
                  <TableCell className="min-w-[150px]">
                    {order.fulfillment_type === 'pickup' ? (
                      order.pickup_date && order.pickup_time ? (
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">{order.pickup_date}</div>
                          <div className="text-amber-600 font-medium">{order.pickup_time}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm italic">Not scheduled</span>
                      )
                    ) : (
                      order.delivery_date && order.delivery_time ? (
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">{order.delivery_date}</div>
                          <div className="text-blue-600 font-medium">{order.delivery_time}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm italic">Not scheduled</span>
                      )
                    )}
                  </TableCell>
                  <TableCell className="flex gap-2">
                    {deliveryStatus === 'awaiting_customer_confirmation' && order.confirmation_token ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => navigate(`/order-confirm/${order.id}?token=${order.confirmation_token}`)}
                          className="bg-amber-600 hover:bg-amber-700"
                        >
                          Confirm Order
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/order/${order.id}`)}
                        >
                          Details
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/order/${order.id}`)}
                      >
                        View Details
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default OrderHistory;
