import { useState } from "react";
import { format, addDays } from "date-fns";
import {
  Utensils,
  Calendar as CalendarIcon,
  Package,
  MapPin,
  AlertCircle,
  Clock,
  Users,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  useDeliveriesByDate,
  useLunchBoxMenuItems,
  useAssignMenuBulk,
  type DeliveryWithSubscription,
} from "@/hooks/admin/useAdminLunchBox";
import { cn } from "@/lib/utils";

const MenuPlanningTab = () => {
  // Default to tomorrow
  const tomorrow = addDays(new Date(), 1);
  const [selectedDate, setSelectedDate] = useState<string>(
    format(tomorrow, "yyyy-MM-dd")
  );
  const [cityFilter, setCityFilter] = useState<string>("");
  const [bulkMenuItemId, setBulkMenuItemId] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: deliveries = [], isLoading } = useDeliveriesByDate(selectedDate);
  const { data: menuItems = [] } = useLunchBoxMenuItems();
  const assignMenuBulkMutation = useAssignMenuBulk();

  // Filter deliveries by city
  const filteredDeliveries = cityFilter
    ? deliveries.filter((d) =>
        d.subscription.city.toLowerCase().includes(cityFilter.toLowerCase())
      )
    : deliveries;

  // Stats
  const stats = {
    totalDeliveries: filteredDeliveries.length,
    withMenu: filteredDeliveries.filter((d) => d.menu_item_id).length,
    withoutMenu: filteredDeliveries.filter((d) => !d.menu_item_id).length,
    uniqueSubscribers: new Set(filteredDeliveries.map((d) => d.subscription_id))
      .size,
  };

  // Group deliveries by menu item
  const deliveriesByMenu = filteredDeliveries.reduce((acc, delivery) => {
    const menuName = delivery.menu_item?.name || "Unassigned";
    if (!acc[menuName]) {
      acc[menuName] = [];
    }
    acc[menuName].push(delivery);
    return acc;
  }, {} as Record<string, DeliveryWithSubscription[]>);

  const handleDateChange = (days: number) => {
    const newDate = addDays(new Date(selectedDate), days);
    setSelectedDate(format(newDate, "yyyy-MM-dd"));
  };

  const handleBulkAssign = () => {
    if (!bulkMenuItemId) return;

    // Get all delivery IDs for unassigned deliveries or all filtered deliveries
    const deliveryIds = filteredDeliveries
      .filter((d) => !d.menu_item_id) // Only assign to unassigned ones
      .map((d) => d.id);

    if (deliveryIds.length === 0) {
      return;
    }

    assignMenuBulkMutation.mutate(
      { deliveryIds, menuItemId: bulkMenuItemId },
      {
        onSuccess: () => {
          setIsDialogOpen(false);
          setBulkMenuItemId("");
        },
      }
    );
  };

  const handleBulkAssignAll = () => {
    if (!bulkMenuItemId) return;

    // Assign to ALL filtered deliveries regardless of current assignment
    const deliveryIds = filteredDeliveries.map((d) => d.id);

    if (deliveryIds.length === 0) {
      return;
    }

    assignMenuBulkMutation.mutate(
      { deliveryIds, menuItemId: bulkMenuItemId },
      {
        onSuccess: () => {
          setIsDialogOpen(false);
          setBulkMenuItemId("");
        },
      }
    );
  };

  const renderSubscriberCard = (delivery: DeliveryWithSubscription) => {
    const menuItem = delivery.menu_item;

    return (
      <Card key={delivery.id} className="mb-3">
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Left: Company & Address */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-[#8B1A1A]" />
                <span className="font-semibold">{delivery.subscription.company}</span>
                <Badge variant="outline" className="text-xs">
                  {delivery.subscription.subscription_type}
                </Badge>
              </div>

              <div className="flex items-start gap-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
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
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p className="italic">{delivery.subscription.delivery_instructions}</p>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>
                  Scheduled: {format(new Date(`2000-01-01T${delivery.scheduled_time}`), "h:mm a")}
                </span>
              </div>
            </div>

            {/* Right: Menu Preview */}
            <div className="md:w-72">
              {menuItem ? (
                <div className="border rounded-lg p-3 bg-green-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Utensils className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-semibold text-green-900">
                      Tomorrow's Menu
                    </span>
                  </div>
                  {menuItem.image_url && (
                    <img
                      src={menuItem.image_url}
                      alt={menuItem.name}
                      className="w-full h-32 object-cover rounded-md mb-2"
                    />
                  )}
                  <p className="font-semibold text-gray-900">{menuItem.name}</p>
                  {menuItem.description && (
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {menuItem.description}
                    </p>
                  )}
                  <p className="text-xs text-green-600 mt-2 font-medium">
                    ✓ Menu Assigned
                  </p>
                </div>
              ) : (
                <div className="border border-dashed border-gray-300 rounded-lg p-3 bg-gray-50 text-center">
                  <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 font-medium">Menu Not Assigned</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Use bulk assignment or Deliveries tab
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Date Selector */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Menu Planning
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Assign menu items to deliveries and view subscriber details
              </p>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#8B1A1A] hover:bg-[#6d1414]">
                  <Utensils className="h-4 w-4 mr-2" />
                  Bulk Assign Menu
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Bulk Menu Assignment</DialogTitle>
                  <DialogDescription>
                    Assign the same menu item to multiple deliveries on{" "}
                    {format(new Date(selectedDate), "EEEE, MMMM d, yyyy")}
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Label>Select Menu Item</Label>
                  <Select value={bulkMenuItemId} onValueChange={setBulkMenuItemId}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Choose menu item..." />
                    </SelectTrigger>
                    <SelectContent>
                      {menuItems.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-600 mt-2">
                    This will assign the menu to {stats.withoutMenu} unassigned{" "}
                    {stats.withoutMenu === 1 ? "delivery" : "deliveries"}
                  </p>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleBulkAssign}
                    disabled={!bulkMenuItemId || assignMenuBulkMutation.isPending}
                  >
                    Assign to Unassigned Only
                  </Button>
                  <Button
                    onClick={handleBulkAssignAll}
                    disabled={!bulkMenuItemId || assignMenuBulkMutation.isPending}
                    className="bg-[#8B1A1A] hover:bg-[#6d1414]"
                  >
                    Assign to All
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date Navigation */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleDateChange(-1)}>
              ← Previous
            </Button>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="max-w-[180px]"
            />
            <Button variant="outline" size="sm" onClick={() => handleDateChange(1)}>
              Next →
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(format(tomorrow, "yyyy-MM-dd"))}
            >
              Tomorrow
            </Button>
          </div>

          {/* City Filter */}
          <div className="max-w-xs">
            <Label className="text-xs">Filter by City</Label>
            <Input
              placeholder="Enter city name..."
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.totalDeliveries}</div>
            <p className="text-xs text-gray-600">Total Deliveries</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.withMenu}</div>
            <p className="text-xs text-gray-600">Menu Assigned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{stats.withoutMenu}</div>
            <p className="text-xs text-gray-600">Unassigned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {stats.uniqueSubscribers}
            </div>
            <p className="text-xs text-gray-600">Subscribers</p>
          </CardContent>
        </Card>
      </div>

      {/* Deliveries Grouped by Menu */}
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
            <p>No deliveries scheduled for {format(new Date(selectedDate), "MMMM d, yyyy")}</p>
            <p className="text-sm mt-2">
              Check the Deliveries tab to generate delivery records
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(deliveriesByMenu).map(([menuName, menuDeliveries]) => (
            <div key={menuName}>
              <div className="flex items-center gap-3 mb-3">
                {menuName === "Unassigned" ? (
                  <>
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <h3 className="text-lg font-semibold text-red-900">
                      {menuName} ({menuDeliveries.length})
                    </h3>
                  </>
                ) : (
                  <>
                    <Utensils className="h-5 w-5 text-green-500" />
                    <h3 className="text-lg font-semibold text-green-900">
                      {menuName} ({menuDeliveries.length})
                    </h3>
                  </>
                )}
              </div>
              {menuDeliveries.map(renderSubscriberCard)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MenuPlanningTab;
