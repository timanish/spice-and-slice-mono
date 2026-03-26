import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, SUPABASE_URL } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAuth } from '@clerk/clerk-react';
import { useAdminRole } from "@/hooks/useAdminRole";
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
} from "lucide-react";
import { format } from "date-fns";

type FulfillmentStatus = 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';

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
  const [estimatedTime, setEstimatedTime] = useState("");
  const [driverNotes, setDriverNotes] = useState("");
  const [newStatus, setNewStatus] = useState<FulfillmentStatus | "">("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin, isLoading: isCheckingRole } = useAdminRole();
  const { getToken } = useAuth();

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

  // Filter orders by search query
  const filteredOrders = orders.filter((order) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      order.id.toLowerCase().includes(searchLower) ||
      order.profiles?.email?.toLowerCase().includes(searchLower) ||
      order.profiles?.full_name?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusIcon = (status: FulfillmentStatus) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
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
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-gray-600">Total Orders</div>
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
                      <SelectItem value="pending">Pending</SelectItem>
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
                <Card key={order.id} className="hover:shadow-md transition-shadow">
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
                        onClick={() => handleStatusChange(order)}
                        variant="outline"
                        disabled={order.fulfillment_status === "delivered" || order.fulfillment_status === "cancelled"}
                      >
                        Update Status
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
