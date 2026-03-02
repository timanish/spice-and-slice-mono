import { useState } from "react";
import { format, addDays } from "date-fns";
import {
  Calendar as CalendarIcon,
  Package,
  AlertCircle,
  Clock,
  MapPin,
  Utensils,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAllDeliveries,
  useDeliveriesByDate,
  useLunchBoxMenuItems,
  useAssignMenuToDelivery,
  useUpdateDeliveryStatus,
  useBulkGenerateMissingDeliveries,
  type DeliveryWithSubscription,
} from "@/hooks/admin/useAdminLunchBox";
import { cn } from "@/lib/utils";

interface DeliveriesTabProps {
  subscriptionFilter?: string;
}

const DeliveriesTab = ({ subscriptionFilter }: DeliveriesTabProps) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("");

  const { data: deliveries = [], isLoading } = useDeliveriesByDate(selectedDate);
  const { data: menuItems = [] } = useLunchBoxMenuItems();
  const assignMenuMutation = useAssignMenuToDelivery();
  const updateStatusMutation = useUpdateDeliveryStatus();
  const bulkGenerateMutation = useBulkGenerateMissingDeliveries();

  // Filter deliveries
  const filteredDeliveries = deliveries.filter((delivery) => {
    if (subscriptionFilter && delivery.subscription_id !== subscriptionFilter) {
      return false;
    }
    if (statusFilter !== "all" && delivery.status !== statusFilter) {
      return false;
    }
    if (
      cityFilter &&
      !delivery.subscription.city.toLowerCase().includes(cityFilter.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  // Group deliveries by menu assignment
  const deliveriesWithMenu = filteredDeliveries.filter((d) => d.menu_item_id);
  const deliveriesWithoutMenu = filteredDeliveries.filter((d) => !d.menu_item_id);

  // Get stats
  const stats = {
    total: filteredDeliveries.length,
    scheduled: filteredDeliveries.filter((d) => d.status === "scheduled").length,
    outForDelivery: filteredDeliveries.filter((d) => d.status === "out_for_delivery")
      .length,
    delivered: filteredDeliveries.filter((d) => d.status === "delivered").length,
    unassigned: deliveriesWithoutMenu.length,
  };

  const handleDateChange = (days: number) => {
    const newDate = addDays(new Date(selectedDate), days);
    setSelectedDate(format(newDate, "yyyy-MM-dd"));
  };

  const handleMenuAssignment = (deliveryId: string, menuItemId: string | null) => {
    assignMenuMutation.mutate({ deliveryId, menuItemId });
  };

  const handleStatusUpdate = (deliveryId: string, status: string) => {
    updateStatusMutation.mutate({ deliveryId, status });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      { variant: "default" | "secondary" | "destructive" | "outline"; color: string }
    > = {
      scheduled: { variant: "secondary", color: "bg-blue-100 text-blue-800" },
      out_for_delivery: { variant: "default", color: "bg-orange-100 text-orange-800" },
      delivered: { variant: "default", color: "bg-green-100 text-green-800" },
      cancelled: { variant: "destructive", color: "bg-red-100 text-red-800" },
      skipped: { variant: "outline", color: "bg-gray-100 text-gray-800" },
      failed: { variant: "destructive", color: "bg-red-100 text-red-800" },
    };

    const config = statusConfig[status] || statusConfig.scheduled;

    return (
      <Badge className={cn("capitalize", config.color)}>
        {status.replace("_", " ")}
      </Badge>
    );
  };

  const renderDeliveryCard = (delivery: DeliveryWithSubscription) => (
    <Card key={delivery.id} className="mb-3">
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          {/* Left: Subscription Info */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-[#8B1A1A]" />
              <span className="font-semibold">{delivery.subscription.company}</span>
              {getStatusBadge(delivery.status)}
            </div>

            <div className="flex items-start gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4 mt-0.5" />
              <div>
                <p>{delivery.subscription.address_line1}</p>
                {delivery.subscription.address_line2 && (
                  <p>{delivery.subscription.address_line2}</p>
                )}
                <p>
                  {delivery.subscription.city}, {delivery.subscription.state}{" "}
                  {delivery.subscription.postal_code}
                </p>
              </div>
            </div>

            {delivery.subscription.delivery_instructions && (
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                <p className="italic">{delivery.subscription.delivery_instructions}</p>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>{format(new Date(`2000-01-01T${delivery.scheduled_time}`), "h:mm a")}</span>
            </div>
          </div>

          {/* Right: Menu Assignment & Status */}
          <div className="flex flex-col gap-3 min-w-[280px]">
            {/* Menu Assignment */}
            <div>
              <Label className="text-xs text-gray-600 mb-1">Menu Item</Label>
              <Select
                value={delivery.menu_item_id || "none"}
                onValueChange={(value) => {
                  const menuId = value === "none" ? null : value;
                  handleMenuAssignment(delivery.id, menuId);
                }}
                disabled={assignMenuMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Assign menu item">
                    {delivery.menu_item ? (
                      <div className="flex items-center gap-2">
                        <Utensils className="h-4 w-4" />
                        <span>{delivery.menu_item.name}</span>
                      </div>
                    ) : (
                      "Not assigned"
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not assigned</SelectItem>
                  {menuItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Update */}
            <div>
              <Label className="text-xs text-gray-600 mb-1">Delivery Status</Label>
              <Select
                value={delivery.status}
                onValueChange={(value) => handleStatusUpdate(delivery.id, value)}
                disabled={updateStatusMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="skipped">Skipped</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Date Selector & Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Delivery Management
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                View and manage deliveries for a specific date
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => bulkGenerateMutation.mutate()}
              disabled={bulkGenerateMutation.isPending}
            >
              <RefreshCw
                className={cn(
                  "h-4 w-4 mr-2",
                  bulkGenerateMutation.isPending && "animate-spin"
                )}
              />
              Generate Missing Deliveries
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date Navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDateChange(-1)}
            >
              ← Previous Day
            </Button>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="max-w-[180px]"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDateChange(1)}
            >
              Next Day →
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(format(new Date(), "yyyy-MM-dd"))}
            >
              Today
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <Label className="text-xs">Status Filter</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="skipped">Skipped</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="text-xs">City Filter</Label>
              <Input
                placeholder="Filter by city..."
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-gray-600">Total Deliveries</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{stats.scheduled}</div>
            <p className="text-xs text-gray-600">Scheduled</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">
              {stats.outForDelivery}
            </div>
            <p className="text-xs text-gray-600">Out for Delivery</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
            <p className="text-xs text-gray-600">Delivered</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{stats.unassigned}</div>
            <p className="text-xs text-gray-600">No Menu</p>
          </CardContent>
        </Card>
      </div>

      {/* Deliveries List */}
      {isLoading ? (
        <Card>
          <CardContent className="pt-6 text-center text-gray-600">
            Loading deliveries...
          </CardContent>
        </Card>
      ) : filteredDeliveries.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-gray-600">
            <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p>No deliveries scheduled for this date</p>
            <p className="text-sm mt-2">
              Use "Generate Missing Deliveries" to create delivery records
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Unassigned Deliveries */}
          {deliveriesWithoutMenu.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                Menu Not Assigned ({deliveriesWithoutMenu.length})
              </h3>
              {deliveriesWithoutMenu.map(renderDeliveryCard)}
            </div>
          )}

          {/* Assigned Deliveries */}
          {deliveriesWithMenu.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Utensils className="h-5 w-5 text-green-500" />
                Menu Assigned ({deliveriesWithMenu.length})
              </h3>
              {deliveriesWithMenu.map(renderDeliveryCard)}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DeliveriesTab;
