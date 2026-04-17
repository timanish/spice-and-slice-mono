import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle,
  ChefHat,
  Clock,
  Loader2,
  Mail,
  MapPin,
  Package,
  Truck,
  XCircle,
} from "lucide-react";

import Navigation from "@/components/Navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

type StatusKey =
  | "pending_review"
  | "awaiting_customer_confirmation"
  | "confirmed"
  | "preparing"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

const STATUS_CONFIG: Record<
  StatusKey,
  { label: string; color: string; Icon: typeof Clock; description: string }
> = {
  pending_review: {
    label: "Pending review",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    Icon: Clock,
    description: "Our team is reviewing your order. You'll get an email when it's ready to confirm.",
  },
  awaiting_customer_confirmation: {
    label: "Awaiting your confirmation",
    color: "bg-orange-100 text-orange-800 border-orange-200",
    Icon: Mail,
    description: "Please confirm the reviewed order and complete payment.",
  },
  confirmed: {
    label: "Confirmed",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    Icon: CheckCircle,
    description: "Your payment was received and your order is queued for preparation.",
  },
  preparing: {
    label: "Preparing",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    Icon: ChefHat,
    description: "Our kitchen is preparing your order.",
  },
  out_for_delivery: {
    label: "Out for delivery",
    color: "bg-orange-100 text-orange-800 border-orange-200",
    Icon: Truck,
    description: "Your order is on its way.",
  },
  delivered: {
    label: "Delivered",
    color: "bg-green-100 text-green-800 border-green-200",
    Icon: Package,
    description: "Your order has been delivered. Enjoy!",
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-100 text-red-800 border-red-200",
    Icon: XCircle,
    description: "This order was cancelled.",
  },
};

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  price_per_unit: number;
  combo_id?: string;
  combo_name?: string;
  is_addon?: boolean;
  products?: {
    name?: string;
    unit_of_measure?: string;
    is_weighted?: boolean;
  };
}

interface Order {
  id: string;
  total_amount: number;
  tax_amount: number;
  delivery_fee: number;
  fulfillment_status: StatusKey | string;
  payment_status: string;
  payment_method: string;
  fulfillment_type: "delivery" | "pickup";
  delivery_address_line1?: string;
  delivery_city?: string;
  delivery_state?: string;
  delivery_postal_code?: string;
  delivery_date?: string;
  delivery_time?: string;
  pickup_date?: string;
  pickup_time?: string;
  confirmation_token?: string;
  confirmation_token_expires_at?: string;
  created_at: string;
}

const GuestOrderTrackingPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchOrder = async () => {
      if (!orderId || !token) {
        setError("Missing order id or tracking token. Please use the link from your email.");
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/guest-get-order`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ orderId, token }),
          },
        );

        const payload = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(payload?.error || "Unable to load order");
        }
        if (cancelled) return;
        setOrder(payload.order);
        setItems(payload.orderItems || []);
        setCustomerName(payload.customerName || "");
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unable to load order");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchOrder();

    // Poll every 10s while in fast-changing states. Stops once the order
    // settles into preparing/out_for_delivery/delivered/cancelled.
    const poll = setInterval(() => {
      if (!order) return;
      const fast = new Set([
        "pending_review",
        "awaiting_customer_confirmation",
        "confirmed",
      ]);
      if (!fast.has(order.fulfillment_status)) {
        clearInterval(poll);
        return;
      }
      fetchOrder();
    }, 10000);

    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [orderId, token, order?.fulfillment_status]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Navigation />
        <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-food-red" />
          <p className="mt-4 text-sm text-gray-500">Loading your order...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Navigation />
        <div className="container mx-auto max-w-2xl px-4 py-16">
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-900">Unable to load order</CardTitle>
              <CardDescription className="text-red-700">
                {error ||
                  "This tracking link is invalid or has expired. Please use the latest link from your email."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/">
                <Button variant="outline">
                  Return home
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const statusKey = (order.fulfillment_status as StatusKey) ?? "pending_review";
  const status = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.pending_review;
  const StatusIcon = status.Icon;

  const confirmationExpired =
    order.confirmation_token_expires_at &&
    new Date(order.confirmation_token_expires_at) < new Date();
  const canConfirm =
    order.fulfillment_status === "awaiting_customer_confirmation" &&
    order.confirmation_token &&
    !confirmationExpired;

  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.price_per_unit,
    0,
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navigation />

      <div className="container mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-serif font-bold text-food-brown">
            Order status
          </h1>
          {customerName && (
            <p className="text-gray-600 mt-1">Hi {customerName} —</p>
          )}
          <p className="text-sm text-gray-500 mt-1">
            Reference: <span className="font-mono">#{order.id.slice(0, 8).toUpperCase()}</span>
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-food-orange/10 to-food-red/10">
              <StatusIcon className="h-6 w-6 text-food-red" />
            </div>
            <div className="flex-1">
              <Badge variant="outline" className={status.color}>
                {status.label}
              </Badge>
              <CardDescription className="mt-2">
                {status.description}
              </CardDescription>
            </div>
          </CardHeader>
          {canConfirm && (
            <CardContent>
              <Link
                to={`/order-confirm/${order.id}?token=${order.confirmation_token}`}
              >
                <Button className="w-full bg-gradient-to-r from-food-red to-food-orange">
                  Review & confirm your order
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <p className="mt-2 text-xs text-gray-500 text-center">
                You won't be charged until you confirm on the next page.
              </p>
            </CardContent>
          )}
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {order.fulfillment_type === "delivery" ? (
                <MapPin className="h-5 w-5 text-food-red" />
              ) : (
                <Package className="h-5 w-5 text-food-red" />
              )}
              {order.fulfillment_type === "delivery" ? "Delivery" : "Pickup"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-700">
            {order.fulfillment_type === "delivery" ? (
              <>
                <p>
                  {order.delivery_address_line1}, {order.delivery_city}, {order.delivery_state} {order.delivery_postal_code}
                </p>
                {(order.delivery_date || order.delivery_time) && (
                  <p className="text-gray-500">
                    {order.delivery_date} · {order.delivery_time}
                  </p>
                )}
              </>
            ) : (
              <p className="text-gray-500">
                {order.pickup_date} · {order.pickup_time}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Items</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {items.map((item) => (
                <li key={item.id} className="py-3 flex justify-between text-sm">
                  <div className="flex-1 pr-4">
                    <p className="font-medium text-gray-900">
                      {item.products?.name || "Item"}
                      {item.is_addon && (
                        <span className="text-gray-400 text-xs ml-1">
                          (add-on)
                        </span>
                      )}
                    </p>
                    {item.combo_name && (
                      <p className="text-xs text-gray-500">
                        Part of {item.combo_name}
                      </p>
                    )}
                    <p className="text-gray-500">
                      {item.products?.is_weighted
                        ? `${item.quantity} ${item.products?.unit_of_measure || "lb"}`
                        : `Qty ${item.quantity}`}
                    </p>
                  </div>
                  <p className="text-gray-900 whitespace-nowrap">
                    ${(item.quantity * item.price_per_unit).toFixed(2)}
                  </p>
                </li>
              ))}
            </ul>
            <div className="mt-4 space-y-1 text-sm border-t pt-4">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {order.tax_amount > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Tax</span>
                  <span>${order.tax_amount.toFixed(2)}</span>
                </div>
              )}
              {order.delivery_fee > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Delivery fee</span>
                  <span>${order.delivery_fee.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t">
                <span>Total</span>
                <span>${Number(order.total_amount).toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-500">
          Questions? Email{" "}
          <a
            href="mailto:spiceandslicedfw@gmail.com"
            className="text-food-red underline"
          >
            spiceandslicedfw@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
};

export default GuestOrderTrackingPage;
