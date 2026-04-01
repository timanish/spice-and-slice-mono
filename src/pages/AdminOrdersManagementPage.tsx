import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, SUPABASE_URL } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAuth } from '@clerk/clerk-react';
import { useAdminRole } from "@/hooks/useAdminRole";
import { useProductFetcher } from "@/hooks/products/useProductFetcher";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Package,
  Clock,
  MapPin,
  User,
  Mail,
  Phone,
  Calendar,
  Truck,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChefHat,
  FileText,
  Globe,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";

type FulfillmentStatus = 'pending_review' | 'pending' | 'awaiting_customer_confirmation' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';

interface Order {
  id: string;
  created_at: string;
  user_id: string;
  total_amount: number;
  status: string;
  payment_method: string;
  payment_status: string;
  fulfillment_status: FulfillmentStatus;
  fulfillment_type: string;
  delivery_date?: string;
  delivery_time?: string;
  pickup_date?: string;
  pickup_time?: string;
  delivery_fee?: number;
  delivery_zone?: string;
  cancelled_at?: string;
  address_id?: string;
  card_last4?: string;
  card_brand?: string;
  card_exp_month?: number;
  card_exp_year?: number;
  profiles?: {
    full_name?: string;
    email?: string;
    phone_number?: string;
  };
  user_addresses?: {
    label?: string;
    address_line1?: string;
    city?: string;
    state?: string;
    postal_code?: string;
  } | null;
  order_items?: Array<{
    id: string;
    quantity: number;
    original_quantity?: number;
    price_per_unit: number;
    products?: {
      name: string;
      image_url?: string;
    };
  }>;
}

const AdminOrdersManagementPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [fulfillmentTypeFilter, setFulfillmentTypeFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderDetailsOpen, setOrderDetailsOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [estimatedTime, setEstimatedTime] = useState("");
  const [driverNotes, setDriverNotes] = useState("");
  const [newStatus, setNewStatus] = useState<FulfillmentStatus | "">("");
  const [adjustedQuantities, setAdjustedQuantities] = useState<Record<string, number>>({});
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [adjustedDeliveryFee, setAdjustedDeliveryFee] = useState<number | undefined>(undefined);
  const [alternativeItems, setAlternativeItems] = useState<Record<string, { productId: string; productName: string; pricePerUnit: number }>>({});
  const [showAlternativeFor, setShowAlternativeFor] = useState<string | null>(null);
  const [alternativeSearchQuery, setAlternativeSearchQuery] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin, isLoading: isCheckingRole } = useAdminRole();
  const { getToken } = useAuth();
  const { data: allProducts = [] } = useProductFetcher();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-orders", statusFilter, fulfillmentTypeFilter],
    queryFn: async () => {
      if (!isAdmin) {
        throw new Error('Unauthorized - admin access required');
      }

      const token = await getToken();
      
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/admin-get-orders`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filters: {
              status: statusFilter !== "all" ? statusFilter : null,
              fulfillmentType: fulfillmentTypeFilter !== "all" ? fulfillmentTypeFilter : null,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to fetch orders');
      }

      const result = await response.json();
      return result.orders as Order[];
    },
    enabled: isAdmin,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      orderId,
      status,
      estimatedTime,
      notes,
    }: {
      orderId: string;
      status: FulfillmentStatus;
      estimatedTime?: string;
      notes?: string;
    }) => {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/admin-update-order`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId,
            status,
            estimatedTime,
            notes,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to update order');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast({
        title: "Status Updated",
        description: "Order status updated and email sent to customer",
      });
      setSelectedOrder(null);
      setNewStatus("");
      setEstimatedTime("");
      setDriverNotes("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  const sendForConfirmationMutation = useMutation({
    mutationFn: async ({
      orderId,
      itemAdjustments,
      newDeliveryFee,
    }: {
      orderId: string;
      itemAdjustments?: Array<{ orderItemId: string; newQuantity?: number; newProductId?: string; newPricePerUnit?: number; originalProductName?: string }>;
      newDeliveryFee?: number;
    }) => {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/admin-adjust-order`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'send_for_confirmation',
            orderId,
            itemAdjustments,
            newDeliveryFee,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Failed to send confirmation');
      }

      const result = await response.json();
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast({
        title: "Sent for Confirmation",
        description: "Customer will receive an email with the confirmation link",
      });
      setOrderDetailsOpen(false);
      setViewingOrder(null);
      setAdjustedQuantities({});
      setAlternativeItems({});
      setAdjustedDeliveryFee(undefined);
      setShowAlternativeFor(null);
      setAlternativeSearchQuery("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send confirmation: " + (error instanceof Error ? error.message : "Unknown error"),
        variant: "destructive",
      });
      console.error(error);
    },
  });

  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/admin-adjust-order`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'cancel',
            orderId,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Failed to cancel order');
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast({
        title: "Order Cancelled",
        description: "Customer has been notified",
      });
      setOrderDetailsOpen(false);
      setViewingOrder(null);
      setOrderToCancel(null);
      setIsCancelConfirmOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to cancel order",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  // Filter orders by search query
  const filteredOrders = orders.filter((order) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      order.id.toLowerCase().includes(searchLower) ||
      order.profiles?.email?.toLowerCase().includes(searchLower) ||
      order.profiles?.full_name?.toLowerCase().includes(searchLower)
    );
  });

  // Filter products for alternative picker
  const filteredAlternativeProducts = useMemo(() => {
    if (!alternativeSearchQuery.trim()) return [];
    const query = alternativeSearchQuery.toLowerCase();
    return allProducts.filter(product =>
      product.name?.toLowerCase().includes(query) ||
      product.category?.name?.toLowerCase().includes(query) ||
      (product.tags && product.tags.some((tag: string) => tag.toLowerCase().includes(query)))
    );
  }, [alternativeSearchQuery, allProducts]);

  const getStatusIcon = (status: FulfillmentStatus) => {
    switch (status) {
      case "pending_review":
        return <AlertTriangle className="h-4 w-4" />;
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "awaiting_customer_confirmation":
        return <Mail className="h-4 w-4" />;
      case "confirmed":
        return <CheckCircle className="h-4 w-4" />;
      case "preparing":
        return <ChefHat className="h-4 w-4" />;
      case "out_for_delivery":
        return <Truck className="h-4 w-4" />;
      case "delivered":
        return <Package className="h-4 w-4" />;
      case "cancelled":
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: FulfillmentStatus) => {
    switch (status) {
      case "pending_review":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "awaiting_customer_confirmation":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "confirmed":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "preparing":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "out_for_delivery":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "delivered":
        return "bg-green-100 text-green-800 border-green-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatStatusLabel = (status: FulfillmentStatus) => {
    return status.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  };

  const handleStatusChange = (order: Order) => {
    setSelectedOrder(order);
    setNewStatus(order.fulfillment_status);
    setEstimatedTime("");
    setDriverNotes("");
  };

  const handleViewOrderDetails = (order: Order) => {
    setViewingOrder(order);
    setAdjustedQuantities({});
    setAlternativeItems({});
    setAdjustedDeliveryFee(undefined);
    setShowAlternativeFor(null);
    setAlternativeSearchQuery("");
    setOrderDetailsOpen(true);
  };

  const handleUpdateStatus = () => {
    if (!selectedOrder || !newStatus) return;

    updateStatusMutation.mutate({
      orderId: selectedOrder.id,
      status: newStatus as FulfillmentStatus,
      estimatedTime: estimatedTime || undefined,
      notes: driverNotes || undefined,
    });
  };

  // Statistics
  const stats = {
    total: filteredOrders.length,
    pendingReview: filteredOrders.filter((o) => o.fulfillment_status === "pending_review").length,
    pending: filteredOrders.filter((o) => o.fulfillment_status === "pending").length,
    preparing: filteredOrders.filter((o) => o.fulfillment_status === "preparing").length,
    outForDelivery: filteredOrders.filter((o) => o.fulfillment_status === "out_for_delivery").length,
    delivered: filteredOrders.filter((o) => o.fulfillment_status === "delivered").length,
  };

  return (
    <AdminLayout title="Order Management">
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Order Management & Delivery Status
          </h1>
          <p className="text-gray-600">
            Manage order fulfillment and send status updates to customers
          </p>
        </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-gray-600">Total Orders</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-orange-600">{stats.pendingReview}</div>
                <div className="text-sm text-gray-600">Pending Review</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <div className="text-sm text-gray-600">Pending</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-purple-600">{stats.preparing}</div>
                <div className="text-sm text-gray-600">Preparing</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-orange-600">{stats.outForDelivery}</div>
                <div className="text-sm text-gray-600">Out for Delivery</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
                <div className="text-sm text-gray-600">Delivered</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Search Orders</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Order ID, customer name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label>Status Filter</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending_review">Pending Review</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="awaiting_customer_confirmation">Awaiting Confirmation</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="preparing">Preparing</SelectItem>
                      <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Fulfillment Type</Label>
                  <Select value={fulfillmentTypeFilter} onValueChange={setFulfillmentTypeFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="delivery">Delivery</SelectItem>
                      <SelectItem value="pickup">Pickup</SelectItem>
                      <SelectItem value="nationwide">Nationwide</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Orders List */}
          {isLoading ? (
            <div className="text-center py-12">Loading orders...</div>
          ) : filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                No orders found
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <Card
                  key={order.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleViewOrderDetails(order)}
                >
                  <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-lg">
                            Order #{order.id.substring(0, 8).toUpperCase()}
                          </CardTitle>
                          <Badge className={getStatusColor(order.fulfillment_status)}>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(order.fulfillment_status)}
                              {formatStatusLabel(order.fulfillment_status)}
                            </div>
                          </Badge>
                          <Badge variant="outline" className={order.fulfillment_type === "nationwide" ? "border-blue-300 text-blue-700" : ""}>
                            {order.fulfillment_type === "delivery" ? (
                              <Truck className="h-3 w-3 mr-1" />
                            ) : order.fulfillment_type === "nationwide" ? (
                              <Globe className="h-3 w-3 mr-1" />
                            ) : (
                              <Package className="h-3 w-3 mr-1" />
                            )}
                            {order.fulfillment_type === "nationwide" ? "nationwide shipping" : order.fulfillment_type}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          {format(new Date(order.created_at), "PPP p")}
                        </div>
                      </div>
                      <Button
                        onClick={() => handleViewOrderDetails(order)}
                        variant={order.fulfillment_status === "pending_review" ? "default" : "outline"}
                        disabled={order.fulfillment_status === "delivered" || order.fulfillment_status === "cancelled"}
                      >
                        {order.fulfillment_status === "pending_review" ? "Review Order" : "Update Status"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Customer Info */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Customer Information
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-start gap-2">
                            <User className="h-4 w-4 text-gray-400 mt-0.5" />
                            <span>{order.profiles?.full_name || "N/A"}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <Mail className="h-4 w-4 text-gray-400 mt-0.5" />
                            <span className="break-all">{order.profiles?.email || "N/A"}</span>
                          </div>
                          {order.profiles?.phone_number && (
                            <div className="flex items-start gap-2">
                              <Phone className="h-4 w-4 text-gray-400 mt-0.5" />
                              <span>{order.profiles.phone_number}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Fulfillment Info */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {order.fulfillment_type === "nationwide" ? "Nationwide Shipping Details" : order.fulfillment_type === "delivery" ? "Delivery Details" : "Pickup Details"}
                        </h4>
                        <div className="space-y-2 text-sm">
                          {(order.fulfillment_type === "delivery" || order.fulfillment_type === "nationwide") ? (
                            <>
                              {order.fulfillment_type === "nationwide" && (
                                <div className="text-blue-700 bg-blue-50 rounded px-2 py-1 text-xs font-medium inline-flex items-center gap-1 mb-1">
                                  <Globe className="h-3 w-3" />
                                  Nationwide Shipping
                                </div>
                              )}
                              {order.user_addresses ? (
                                <div>
                                  {order.user_addresses.address_line1}<br />
                                  {order.user_addresses.city}, {order.user_addresses.state} {order.user_addresses.postal_code}
                                </div>
                              ) : (
                                <div className="text-gray-500 italic">Address not available</div>
                              )}
                              {order.delivery_date && (
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-gray-400" />
                                  <span>{order.delivery_date} {order.delivery_time}</span>
                                </div>
                              )}
                              {order.delivery_zone && order.fulfillment_type !== "nationwide" && (
                                <div className="text-gray-600">Zone: {order.delivery_zone}</div>
                              )}
                            </>
                          ) : (
                            <>
                              <div className="text-gray-600 font-medium">Pickup at store</div>
                              {order.pickup_date && order.pickup_time && (
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-gray-400" />
                                  <span className="font-medium">{order.pickup_date}</span>
                                </div>
                              )}
                              {order.pickup_time && (
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-gray-400" />
                                  <span>{order.pickup_time}</span>
                                </div>
                              )}
                              {!order.pickup_date && !order.pickup_time && (
                                <div className="text-gray-500 text-xs">Schedule not specified</div>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Order Info */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Order Details
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-gray-600">Items: </span>
                            {order.order_items?.length || 0}
                          </div>
                          <div>
                            <span className="text-gray-600">Total: </span>
                            <span className="font-semibold">${order.total_amount.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Payment: </span>
                            {order.payment_method === 'card' && order.card_last4 ? (
                              <span>
                                <span className="capitalize">{order.card_brand || 'Card'}</span>
                                {' '}•••• {order.card_last4}
                                {order.card_exp_month && order.card_exp_year && (
                                  <span className="text-gray-500 text-sm ml-2">
                                    (Exp: {order.card_exp_month.toString().padStart(2, '0')}/{order.card_exp_year.toString().slice(-2)})
                                  </span>
                                )}
                              </span>
                            ) : (
                              order.payment_method.toUpperCase()
                            )}
                            {order.payment_status && ` (${order.payment_status})`}
                          </div>
                          {order.delivery_fee && (
                            <div>
                              <span className="text-gray-600">Delivery Fee: </span>
                              ${order.delivery_fee.toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

        {/* Order Details Dialog */}
        <Dialog open={orderDetailsOpen} onOpenChange={setOrderDetailsOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Order Details</DialogTitle>
              <DialogDescription>
                Order #{viewingOrder?.id.substring(0, 8).toUpperCase()}
              </DialogDescription>
            </DialogHeader>
            {viewingOrder && (
              <div className="space-y-6">
                {/* Status Banner */}
                {viewingOrder.fulfillment_status === "pending_review" && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-orange-900">Order Awaiting Review</p>
                      <p className="text-sm text-orange-800">Review items and adjust quantities before sending to customer for confirmation</p>
                    </div>
                  </div>
                )}
                {viewingOrder.fulfillment_status === "awaiting_customer_confirmation" && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                    <Mail className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-blue-900">Waiting for Customer Confirmation</p>
                      <p className="text-sm text-blue-800">Customer has been emailed a confirmation link. They have 48 hours to confirm and complete payment.</p>
                    </div>
                  </div>
                )}

                {/* Customer Information */}
                <div>
                  <h4 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Customer Information
                  </h4>
                  <div className="space-y-2 text-sm bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 w-24">Name:</span>
                      <span className="font-medium">{viewingOrder.profiles?.full_name || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 w-24">Email:</span>
                      <span className="break-all">{viewingOrder.profiles?.email || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 w-24">Phone:</span>
                      <span>{viewingOrder.profiles?.phone_number || "N/A"}</span>
                    </div>
                  </div>
                </div>

                {/* Fulfillment Information */}
                <div>
                  <h4 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {viewingOrder.fulfillment_type === "nationwide" ? "Nationwide Shipping Details" : viewingOrder.fulfillment_type === "delivery" ? "Delivery Details" : "Pickup Details"}
                  </h4>
                  <div className="space-y-2 text-sm bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-start gap-2">
                      <span className="text-gray-600 w-24">Type:</span>
                      <span className="capitalize font-medium">{viewingOrder.fulfillment_type}</span>
                    </div>
                    {(viewingOrder.fulfillment_type === "delivery" || viewingOrder.fulfillment_type === "nationwide") && (
                      <>
                        {viewingOrder.user_addresses && (
                          <div className="flex items-start gap-2">
                            <span className="text-gray-600 w-24">Address:</span>
                            <span>
                              {viewingOrder.user_addresses.address_line1}<br />
                              {viewingOrder.user_addresses.city}, {viewingOrder.user_addresses.state} {viewingOrder.user_addresses.postal_code}
                            </span>
                          </div>
                        )}
                        {viewingOrder.delivery_date && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600 w-24">Date:</span>
                            <span>{viewingOrder.delivery_date} {viewingOrder.delivery_time}</span>
                          </div>
                        )}
                        {viewingOrder.delivery_zone && viewingOrder.fulfillment_type !== "nationwide" && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600 w-24">Zone:</span>
                            <span>{viewingOrder.delivery_zone}</span>
                          </div>
                        )}
                      </>
                    )}
                    {viewingOrder.fulfillment_type === "pickup" && (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 w-24">Date:</span>
                          <span>{viewingOrder.pickup_date || "Not scheduled"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 w-24">Time:</span>
                          <span>{viewingOrder.pickup_time || "Not scheduled"}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Order Items */}
                <div>
                  <h4 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Order Items ({viewingOrder.order_items?.length || 0})
                  </h4>
                  <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                    {(!viewingOrder.order_items || viewingOrder.order_items.length === 0) ? (
                      <p className="text-gray-500 text-sm">No items in this order</p>
                    ) : (() => {
                      // Group items by combo_id
                      const comboMap = new Map<string | null, any[]>();
                      const processedIds = new Set<string>();

                      viewingOrder.order_items.forEach(item => {
                        const key = item.combo_id || `regular-${item.id}`;
                        if (!comboMap.has(key)) {
                          comboMap.set(key, []);
                        }
                        comboMap.get(key)!.push(item);
                        processedIds.add(item.id);
                      });

                      const elements: JSX.Element[] = [];
                      comboMap.forEach((items, key) => {
                        const isCombo = key.startsWith('combo-') || items[0].combo_id;

                        if (isCombo && items[0].combo_id) {
                          // Render as combo group
                          const comboItem = items[0]; // First item has the price
                          const displayQuantity = adjustedQuantities[comboItem.id] ?? comboItem.quantity;
                          const isAdjusted = adjustedQuantities[comboItem.id] !== undefined && adjustedQuantities[comboItem.id] !== comboItem.quantity;

                          elements.push(
                            <div key={key} className="border-b pb-3 last:border-b-0">
                              <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-2">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <p className="font-semibold text-sm text-blue-900">{comboItem.combo_name || "Combo"}</p>
                                    <p className="text-xs text-blue-700 mt-1">{items.length} items included</p>
                                    <div className="mt-1 space-y-1">
                                      {items.map(i => (
                                        <p key={i.id} className="text-xs text-blue-600">• {i.products?.name || "Unknown"}</p>
                                      ))}
                                    </div>

                                    {viewingOrder.fulfillment_status === "pending_review" && (
                                      <div className="mt-2 space-y-2">
                                        <div className="flex items-center gap-2">
                                          <label className="text-xs text-gray-600">Combos:</label>
                                          <Input
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            value={displayQuantity}
                                            onChange={(e) => setAdjustedQuantities(prev => ({
                                              ...prev,
                                              [comboItem.id]: parseFloat(e.target.value) || 0
                                            }))}
                                            className="w-24 h-8 text-sm"
                                          />
                                          <span className="text-xs text-gray-500">@ ${comboItem.price_per_unit.toFixed(2)}</span>
                                        </div>
                                        {isAdjusted && (
                                          <p className="text-xs text-orange-600">
                                            Original: {comboItem.quantity}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <p className="font-medium text-sm whitespace-nowrap ml-4 text-blue-900">
                                    ${(displayQuantity * comboItem.price_per_unit).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        } else {
                          // Render as regular item
                          const item = items[0];
                          const displayQuantity = adjustedQuantities[item.id] ?? item.quantity;
                          const isAdjusted = adjustedQuantities[item.id] !== undefined && adjustedQuantities[item.id] !== item.quantity;
                          const showOriginalQuantity = item.original_quantity && item.original_quantity !== item.quantity;
                          const hasAlternative = alternativeItems[item.id];

                          elements.push(
                            <div key={item.id} className="border-b pb-3 last:border-b-0">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  {hasAlternative ? (
                                    <p className="font-medium text-sm">
                                      <span className="line-through text-gray-400">{item.products?.name || "Unknown Product"}</span>
                                      <br />
                                      <span className="text-food-orange">→ {hasAlternative.productName}</span>
                                    </p>
                                  ) : (
                                    <p className="font-medium text-sm">{item.products?.name || "Unknown Product"}</p>
                                  )}
                                  {viewingOrder.fulfillment_status === "pending_review" ? (
                                    <div className="mt-2 space-y-2">
                                      <div className="flex items-center gap-2">
                                        <label className="text-xs text-gray-600">Quantity:</label>
                                        <Input
                                          type="number"
                                          min="0.01"
                                          step="0.01"
                                          value={displayQuantity}
                                          onChange={(e) => setAdjustedQuantities(prev => ({
                                            ...prev,
                                            [item.id]: parseFloat(e.target.value) || 0
                                          }))}
                                          className="w-24 h-8 text-sm"
                                        />
                                        <span className="text-xs text-gray-500">@ ${(hasAlternative?.pricePerUnit ?? item.price_per_unit).toFixed(2)}</span>
                                      </div>
                                      {isAdjusted && (
                                        <p className="text-xs text-orange-600">
                                          Original: {item.quantity}
                                        </p>
                                      )}
                                      <div className="flex items-center gap-2">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setShowAlternativeFor(showAlternativeFor === item.id ? null : item.id)}
                                          className="text-xs h-7"
                                        >
                                          {hasAlternative ? "Change Alternative" : "Suggest Alternative"}
                                        </Button>
                                        {hasAlternative && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setAlternativeItems(prev => {
                                              const next = { ...prev };
                                              delete next[item.id];
                                              return next;
                                            })}
                                            className="text-xs h-7 text-red-600 hover:text-red-700"
                                          >
                                            Remove
                                          </Button>
                                        )}
                                      </div>
                                      {showAlternativeFor === item.id && (
                                        <div className="mt-2 p-2 bg-gray-100 rounded border border-gray-200">
                                          <input
                                            type="text"
                                            placeholder="Search products..."
                                            value={alternativeSearchQuery}
                                            onChange={(e) => setAlternativeSearchQuery(e.target.value)}
                                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded mb-2"
                                          />
                                          <div className="max-h-40 overflow-y-auto space-y-1">
                                            {filteredAlternativeProducts.length > 0 ? (
                                              filteredAlternativeProducts.map(product => (
                                                <button
                                                  key={product.id}
                                                  onClick={() => {
                                                    setAlternativeItems(prev => ({
                                                      ...prev,
                                                      [item.id]: {
                                                        productId: product.id,
                                                        productName: product.name,
                                                        pricePerUnit: product.price_per_unit,
                                                      }
                                                    }));
                                                    setShowAlternativeFor(null);
                                                    setAlternativeSearchQuery("");
                                                  }}
                                                  className="w-full text-left text-sm px-2 py-1 hover:bg-gray-200 rounded text-gray-700"
                                                >
                                                  {product.name}
                                                  <span className="text-gray-500 text-xs ml-1">${product.price_per_unit.toFixed(2)}</span>
                                                </button>
                                              ))
                                            ) : (
                                              <p className="text-xs text-gray-500 px-2 py-1">No products found</p>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ) : showOriginalQuantity ? (
                                    <p className="text-xs text-gray-600 mt-1">
                                      Original: <span className="line-through">{item.original_quantity}</span> → Adjusted: <span className="font-medium text-orange-600">{item.quantity}</span>
                                    </p>
                                  ) : (
                                    <p className="text-xs text-gray-600 mt-1">
                                      Qty: {item.quantity} × ${item.price_per_unit.toFixed(2)}
                                    </p>
                                  )}
                                </div>
                                <p className="font-medium text-sm whitespace-nowrap ml-4">
                                  ${(displayQuantity * (hasAlternative?.pricePerUnit ?? item.price_per_unit)).toFixed(2)}
                                </p>
                              </div>
                            </div>
                          );
                        }
                      });

                      return elements;
                    })()}
                  </div>
                </div>

                {/* Order Summary */}
                <div>
                  <h4 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Order Summary
                  </h4>
                  <div className="space-y-2 text-sm bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">
                        ${viewingOrder.order_items?.reduce((sum, item) => sum + item.quantity * item.price_per_unit, 0).toFixed(2) || "0.00"}
                      </span>
                    </div>
                    {(viewingOrder.delivery_fee > 0 || viewingOrder.fulfillment_type === "delivery") && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Delivery Fee:</span>
                        {viewingOrder.fulfillment_status === "pending_review" && viewingOrder.fulfillment_type === "delivery" ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">$</span>
                            <Input
                              type="number"
                              step="0.01"
                              value={adjustedDeliveryFee ?? viewingOrder.delivery_fee ?? 0}
                              onChange={(e) => setAdjustedDeliveryFee(parseFloat(e.target.value) || 0)}
                              className="w-20 h-8 text-sm"
                            />
                          </div>
                        ) : (
                          <span className="font-medium">${(adjustedDeliveryFee ?? viewingOrder.delivery_fee ?? 0).toFixed(2)}</span>
                        )}
                      </div>
                    )}
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-gray-700 font-semibold">Total:</span>
                      <span className="text-lg font-bold text-food-red">${viewingOrder.total_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment:</span>
                      <span className="font-medium">
                        {viewingOrder.payment_method === 'card' && viewingOrder.card_last4 ? (
                          <>
                            <span className="capitalize">{viewingOrder.card_brand || 'Card'}</span>
                            {' '}•••• {viewingOrder.card_last4}
                          </>
                        ) : (
                          viewingOrder.payment_method.toUpperCase()
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <Badge className={getStatusColor(viewingOrder.fulfillment_status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(viewingOrder.fulfillment_status)}
                          {formatStatusLabel(viewingOrder.fulfillment_status)}
                        </div>
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {viewingOrder.fulfillment_status === "pending_review" && (
                    <>
                      <Button
                        onClick={() => {
                          const changedItems = Object.entries(adjustedQuantities)
                            .filter(([itemId, newQty]) => {
                              const item = viewingOrder.order_items?.find(i => i.id === itemId);
                              return item && newQty !== item.quantity;
                            })
                            .map(([itemId, newQuantity]) => ({
                              orderItemId: itemId,
                              newQuantity,
                            }));

                          // Merge in alternative product swaps
                          const alternativeAdjustments = Object.entries(alternativeItems).map(([itemId, alt]) => ({
                            orderItemId: itemId,
                            newProductId: alt.productId,
                            newPricePerUnit: alt.pricePerUnit,
                            originalProductName: viewingOrder.order_items?.find(i => i.id === itemId)?.products?.name,
                            // keep existing quantity unless also changed
                            newQuantity: adjustedQuantities[itemId] ?? viewingOrder.order_items?.find(i => i.id === itemId)?.quantity,
                          }));

                          // Deduplicate: alternativeAdjustments take precedence
                          const mergedAdjustments = [
                            ...changedItems.filter(ci => !alternativeItems[ci.orderItemId]),
                            ...alternativeAdjustments,
                          ];

                          sendForConfirmationMutation.mutate({
                            orderId: viewingOrder.id,
                            itemAdjustments: mergedAdjustments.length > 0 ? mergedAdjustments : undefined,
                            newDeliveryFee: adjustedDeliveryFee,
                          });
                        }}
                        disabled={sendForConfirmationMutation.isPending}
                        className="w-full bg-food-red hover:bg-food-red/90"
                      >
                        {sendForConfirmationMutation.isPending ? "Sending..." : "Send for Confirmation"}
                      </Button>
                      <Button
                        onClick={() => {
                          setOrderToCancel(viewingOrder);
                          setIsCancelConfirmOpen(true);
                        }}
                        variant="destructive"
                        className="w-full"
                        disabled={sendForConfirmationMutation.isPending}
                      >
                        Cancel Order
                      </Button>
                    </>
                  )}
                  {viewingOrder.fulfillment_status === "awaiting_customer_confirmation" && (
                    <>
                      <Button
                        onClick={() => {
                          sendForConfirmationMutation.mutate({
                            orderId: viewingOrder.id,
                          });
                        }}
                        disabled={sendForConfirmationMutation.isPending}
                        className="w-full bg-food-red hover:bg-food-red/90"
                      >
                        {sendForConfirmationMutation.isPending ? "Sending..." : "Resend Confirmation Email"}
                      </Button>
                      <Button
                        onClick={() => {
                          setOrderToCancel(viewingOrder);
                          setIsCancelConfirmOpen(true);
                        }}
                        variant="destructive"
                        className="w-full"
                        disabled={sendForConfirmationMutation.isPending}
                      >
                        Cancel Order
                      </Button>
                    </>
                  )}
                  {viewingOrder.fulfillment_status !== "pending_review" && viewingOrder.fulfillment_status !== "awaiting_customer_confirmation" && (
                    <Button
                      onClick={() => {
                        setOrderDetailsOpen(false);
                        setSelectedOrder(viewingOrder);
                        setNewStatus(viewingOrder.fulfillment_status);
                        setEstimatedTime("");
                        setDriverNotes("");
                      }}
                      className="w-full bg-food-red hover:bg-food-red/90"
                    >
                      Update Status
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Cancel Confirmation Dialog */}
        <Dialog open={isCancelConfirmOpen} onOpenChange={setIsCancelConfirmOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Cancel Order</DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel this order? The customer will be notified via email.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Order #{orderToCancel?.id.substring(0, 8).toUpperCase()}
              </p>
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => {
                    if (orderToCancel) {
                      cancelOrderMutation.mutate(orderToCancel.id);
                    }
                  }}
                  disabled={cancelOrderMutation.isPending}
                  variant="destructive"
                  className="flex-1"
                >
                  {cancelOrderMutation.isPending ? "Cancelling..." : "Yes, Cancel Order"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsCancelConfirmOpen(false)}
                  disabled={cancelOrderMutation.isPending}
                  className="flex-1"
                >
                  Keep Order
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Status Update Dialog */}
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Update Order Status</DialogTitle>
              <DialogDescription>
                Change order status and notify customer via email
              </DialogDescription>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4">
                <div>
                  <Label>Order #{selectedOrder.id.substring(0, 8).toUpperCase()}</Label>
                  <div className="text-sm text-gray-600">
                    Customer: {selectedOrder.profiles?.full_name}
                  </div>
                </div>

                <div>
                  <Label>New Status</Label>
                  <Select value={newStatus} onValueChange={(value) => setNewStatus(value as FulfillmentStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="preparing">Preparing</SelectItem>
                      <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(newStatus === "confirmed" || newStatus === "out_for_delivery") && (
                  <div>
                    <Label>Estimated Delivery Time (Optional)</Label>
                    <Input
                      type="time"
                      value={estimatedTime}
                      onChange={(e) => setEstimatedTime(e.target.value)}
                      placeholder="HH:MM"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Customer will be notified with this estimated time
                    </p>
                  </div>
                )}

                {newStatus === "out_for_delivery" && (
                  <div>
                    <Label>Driver Notes (Optional)</Label>
                    <Textarea
                      value={driverNotes}
                      onChange={(e) => setDriverNotes(e.target.value)}
                      placeholder="Any special instructions for the driver..."
                      rows={3}
                    />
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleUpdateStatus}
                    disabled={!newStatus || updateStatusMutation.isPending}
                    className="flex-1"
                  >
                    {updateStatusMutation.isPending ? "Updating..." : "Send Email & Update"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedOrder(null)}
                    disabled={updateStatusMutation.isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminOrdersManagementPage;
