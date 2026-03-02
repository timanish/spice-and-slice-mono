import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';
import { useAuth } from '@clerk/clerk-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Calendar, MapPin, Search, CheckCircle, Clock, XCircle, Truck, CalendarDays } from 'lucide-react';
import type { LunchBoxSubscription } from '@/integrations/supabase/types/lunchbox';
import DeliveriesTab from '@/components/lunchbox/admin/DeliveriesTab';
import MenuPlanningTab from '@/components/lunchbox/admin/MenuPlanningTab';
import { useAdminRole } from '@/hooks/useAdminRole';

const AdminLunchBoxSubscriptionsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'cancelled'>('all');
  const [activeTab, setActiveTab] = useState('subscriptions');
  const { isAdmin, isLoading: isCheckingRole } = useAdminRole();
  const { getToken } = useAuth();

  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ['adminLunchBoxSubscriptions'],
    queryFn: async () => {
      if (!isAdmin) {
        throw new Error('Unauthorized - admin access required');
      }

      const token = await getToken();
      
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/admin-get-subscriptions`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to fetch subscriptions');
      }

      const result = await response.json();
      return result.subscriptions as LunchBoxSubscription[];
    },
    enabled: isAdmin, 
  });

  const filteredSubscriptions = subscriptions?.filter(sub => {
    const matchesSearch = searchTerm === '' || 
      sub.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.city.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Active
          </Badge>
        );
      case 'paused':
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Paused
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const stats = {
    total: subscriptions?.length || 0,
    active: subscriptions?.filter(s => s.status === 'active').length || 0,
    paused: subscriptions?.filter(s => s.status === 'paused').length || 0,
    cancelled: subscriptions?.filter(s => s.status === 'cancelled').length || 0,
    weekly: subscriptions?.filter(s => s.subscription_type === 'weekly' && s.status === 'active').length || 0,
    monthly: subscriptions?.filter(s => s.subscription_type === 'monthly' && s.status === 'active').length || 0,
  };

  return (
    <AdminLayout title="Lunch Box Subscriptions">
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="h-8 w-8" />
            Lunch Box Management
          </h1>
          <p className="text-gray-600 mt-2">Manage subscriptions, deliveries, and menu planning</p>
        </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="subscriptions" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Subscriptions
          </TabsTrigger>
          <TabsTrigger value="deliveries" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Deliveries
          </TabsTrigger>
          <TabsTrigger value="menu-planning" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Menu Planning
          </TabsTrigger>
        </TabsList>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-gray-600">Total</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                <p className="text-xs text-gray-600">Active</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-yellow-600">{stats.paused}</div>
                <p className="text-xs text-gray-600">Paused</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
                <p className="text-xs text-gray-600">Cancelled</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-600">{stats.weekly}</div>
                <p className="text-xs text-gray-600">Weekly</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-purple-600">{stats.monthly}</div>
                <p className="text-xs text-gray-600">Monthly</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by company, user ID, or city..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={statusFilter === 'all' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('all')}
                    size="sm"
                  >
                    All
                  </Button>
                  <Button
                    variant={statusFilter === 'active' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('active')}
                    size="sm"
                  >
                    Active
                  </Button>
                  <Button
                    variant={statusFilter === 'paused' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('paused')}
                    size="sm"
                  >
                    Paused
                  </Button>
                  <Button
                    variant={statusFilter === 'cancelled' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('cancelled')}
                    size="sm"
                  >
                    Cancelled
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subscriptions List */}
          {isLoading ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-gray-500">Loading subscriptions...</p>
              </CardContent>
            </Card>
          ) : filteredSubscriptions && filteredSubscriptions.length > 0 ? (
            <div className="space-y-4">
              {filteredSubscriptions.map((subscription) => (
                <Card key={subscription.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-lg">{subscription.company}</CardTitle>
                          {getStatusBadge(subscription.status)}
                          <Badge variant="outline">
                            {subscription.subscription_type === 'weekly' ? 'Weekly - $59.99' : 
                             subscription.subscription_type === 'monthly' ? 'Monthly - $199.99' :
                             `Custom - $${subscription.total_price || '0.00'}`}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">User ID: {subscription.user_id}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="flex items-start gap-2">
                        <Calendar className="h-4 w-4 text-gray-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold">Start Date</p>
                          <p className="text-sm text-gray-600">
                            {new Date(subscription.start_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      {subscription.next_delivery_date && subscription.status === 'active' && (
                        <div className="flex items-start gap-2">
                          <Clock className="h-4 w-4 text-[#8B1A1A] mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold">Next Delivery</p>
                            <p className="text-sm text-gray-600">
                              {new Date(subscription.next_delivery_date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold">Delivery Address</p>
                          <p className="text-sm text-gray-600">
                            {subscription.address_line1}
                            {subscription.address_line2 && `, ${subscription.address_line2}`}
                            <br />
                            {subscription.city}, {subscription.state} {subscription.postal_code}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {subscription.delivery_instructions && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm font-semibold mb-1">Delivery Instructions</p>
                        <p className="text-sm text-gray-600">{subscription.delivery_instructions}</p>
                      </div>
                    )}
                    
                    <div className="mt-4 pt-4 border-t text-xs text-gray-500">
                      Created: {new Date(subscription.created_at).toLocaleString()}
                      {subscription.cancelled_at && (
                        <> • Cancelled: {new Date(subscription.cancelled_at).toLocaleString()}</>
                      )}
                      {subscription.paused_at && (
                        <> • Paused: {new Date(subscription.paused_at).toLocaleString()}</>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-gray-500">No subscriptions found</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Deliveries Tab */}
        <TabsContent value="deliveries">
          <DeliveriesTab />
        </TabsContent>

        {/* Menu Planning Tab */}
        <TabsContent value="menu-planning">
          <MenuPlanningTab />
        </TabsContent>
      </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminLunchBoxSubscriptionsPage;
