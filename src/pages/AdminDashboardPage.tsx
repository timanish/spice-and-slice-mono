import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, ShoppingBag, DollarSign, Clock, Package, Truck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCrud } from "@/hooks/useAdminCrud";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const { select } = useAdminCrud();

  // Get today's date range in UTC
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // Fetch today's orders count + revenue
  const { data: todayStats } = useQuery({
    queryKey: ['admin-today-stats'],
    queryFn: async () => {
      const { data } = await select('orders', {
        columns: 'id, total_amount',
        filters: [
          { column: 'created_at', operator: 'gte', value: todayStart.toISOString() },
          { column: 'created_at', operator: 'lte', value: todayEnd.toISOString() },
        ],
      });

      const orders = data || [];
      return {
        count: orders.length,
        revenue: orders.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0),
      };
    },
    refetchInterval: 30000, // Refresh every 30s
  });

  // Fetch pending orders count
  const { data: pendingCount } = useQuery({
    queryKey: ['admin-pending-orders'],
    queryFn: async () => {
      const { data } = await select('orders', {
        columns: 'id',
        filters: [
          { column: 'status', operator: 'eq', value: 'pending' },
        ],
      });
      return data?.length || 0;
    },
    refetchInterval: 15000,
  });

  // Fetch active products count
  const { data: activeProducts } = useQuery({
    queryKey: ['admin-active-products'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('in_stock', true);

      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch recent orders
  const { data: recentOrders } = useQuery({
    queryKey: ['admin-recent-orders'],
    queryFn: async () => {
      const { data } = await select('orders', {
        columns: 'id, created_at, total_amount, status, fulfillment_type, fulfillment_status',
        order: { column: 'created_at', ascending: false },
        limit: 5,
      });
      return data || [];
    },
    refetchInterval: 15000,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status?.toLowerCase()) {
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
    return (status || 'pending')
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const statCards = [
    {
      title: "Today's Orders",
      value: todayStats?.count ?? '—',
      icon: ShoppingBag,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: "Today's Revenue",
      value: todayStats ? formatCurrency(todayStats.revenue) : '—',
      icon: DollarSign,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      title: 'Pending Orders',
      value: pendingCount ?? '—',
      icon: Clock,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
    },
    {
      title: 'Active Products',
      value: activeProducts ?? '—',
      icon: Package,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ];

  return (
    <AdminLayout title="Dashboard">
      <div className="p-6 md:p-8 space-y-8">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">
            Overview of your store's performance today.
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="shadow-sm">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${stat.bg}`}>
                      <Icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                  </div>
                  <p className="text-xs md:text-sm text-gray-500 mb-1">{stat.title}</p>
                  <p className="text-xl md:text-2xl font-bold text-gray-900">{stat.value}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Orders */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders && recentOrders.length > 0 ? (
              <div className="space-y-3">
                {recentOrders.map((order) => {
                  const status = order.fulfillment_status || order.status || 'pending';
                  return (
                    <div
                      key={order.id}
                      onClick={() => navigate(`/admin/orders`)}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <span className="font-medium text-sm text-gray-900">
                          #{order.id.substring(0, 8).toUpperCase()}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            order.fulfillment_type === 'delivery'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {order.fulfillment_type === 'delivery' ? (
                            <><Truck className="h-3 w-3 mr-1" />Delivery</>
                          ) : (
                            <><Package className="h-3 w-3 mr-1" />Pickup</>
                          )}
                        </Badge>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusBadgeClass(status)}`}>
                          {formatStatusLabel(status)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <span className="text-xs text-gray-500 hidden sm:block">
                          {format(new Date(order.created_at), 'MMM dd, h:mm a')}
                        </span>
                        <span className="font-semibold text-sm">
                          {formatCurrency(order.total_amount)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-sm text-center py-4">No orders yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Analytics Card */}
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Analytics & Reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 text-sm">
              Access detailed analytics and reports for your store.
            </p>
            <a
              href="https://us.posthog.com/project/293267/dashboard/1077354"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              <BarChart3 className="h-4 w-4" />
              View PostHog Analytics
            </a>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboardPage;
