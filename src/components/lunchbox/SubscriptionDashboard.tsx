import { useState } from 'react';
import { format, addDays, isSameDay, startOfDay } from 'date-fns';
import { useUser } from '@clerk/clerk-react';
import { 
  MapPin, 
  Calendar, 
  CreditCard, 
  Pause, 
  Play, 
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Utensils,
  Sparkles,
  CalendarDays,
  ListOrdered
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import DeliveryCalendar from './DeliveryCalendar';
import { 
  usePauseLunchBoxSubscription, 
  useResumeLunchBoxSubscription,
  useUpdateDeliverySchedule,
  useUpcomingDeliveries
} from '@/hooks/useLunchBoxSubscription';
import type { LunchBoxSubscription } from '@/integrations/supabase/types/lunchbox';
import { cn } from '@/lib/utils';

interface SubscriptionDashboardProps {
  subscription: LunchBoxSubscription;
}

const SubscriptionDashboard = ({ subscription }: SubscriptionDashboardProps) => {
  const { toast } = useToast();
  const { user } = useUser();
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [tempSchedule, setTempSchedule] = useState<Date[]>([]);
  const [activeTab, setActiveTab] = useState(
    subscription.subscription_type === 'custom' ? 'calendar' : 'upcoming'
  );

  const pauseMutation = usePauseLunchBoxSubscription();
  const resumeMutation = useResumeLunchBoxSubscription();
  const updateScheduleMutation = useUpdateDeliverySchedule();
  const { data: upcomingDeliveries = [] } = useUpcomingDeliveries(subscription.id);

  const statusConfig = {
    active: { 
      label: 'Active', 
      color: 'bg-green-500', 
      icon: CheckCircle 
    },
    paused: { 
      label: 'Paused', 
      color: 'bg-orange-500', 
      icon: Pause 
    },
    cancelled: { 
      label: 'Cancelled', 
      color: 'bg-red-500', 
      icon: AlertCircle 
    },
  };

  const typeConfig = {
    weekly: { label: 'Weekly Plan', color: 'bg-purple-100 text-purple-700' },
    monthly: { label: 'Monthly Plan', color: 'bg-indigo-100 text-indigo-700' },
    custom: { label: 'Custom Plan', color: 'bg-pink-100 text-pink-700' },
  };

  const config = statusConfig[subscription.status];
  const StatusIcon = config.icon;

  const handlePause = async () => {
    if (!user?.id) return;
    
    try {
      await pauseMutation.mutateAsync({ id: subscription.id, userId: user.id });
      toast({
        title: "Subscription Paused",
        description: "Your lunch box deliveries have been paused.",
      });
      setShowPauseDialog(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to pause subscription. Please try again.",
      });
    }
  };

  const handleResume = async () => {
    if (!user?.id) return;
    
    try {
      await resumeMutation.mutateAsync({ id: subscription.id, userId: user.id });
      toast({
        title: "Subscription Resumed",
        description: "Your lunch box deliveries have been resumed.",
      });
      setShowResumeDialog(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to resume subscription. Please try again.",
      });
    }
  };

  const handleSaveSchedule = async () => {
    if (tempSchedule.length !== subscription.total_delivery_days) {
      toast({
        variant: "destructive",
        title: "Invalid Selection",
        description: `Please select exactly ${subscription.total_delivery_days} days.`,
      });
      return;
    }

    try {
      const scheduleStrings = tempSchedule.map(date => format(date, 'yyyy-MM-dd'));
      await updateScheduleMutation.mutateAsync({
        subscriptionId: subscription.id,
        newSchedule: scheduleStrings,
      });
      toast({
        title: "Schedule Updated",
        description: "Your delivery schedule has been updated successfully.",
      });
      setEditingSchedule(false);
    } catch (error) {
      console.error('Schedule update error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      const errorMessage = error && typeof error === 'object' && 'message' in error 
        ? (error as Error).message 
        : "Failed to update schedule. Please try again.";
      
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    }
  };

  const startEditingSchedule = () => {
    setTempSchedule(subscription.delivery_schedule.map(d => new Date(d)));
    setEditingSchedule(true);
  };

  const canModifySchedule = subscription.subscription_type === 'custom' && 
                           subscription.status === 'active';

  // Get tomorrow's delivery
  const tomorrow = startOfDay(addDays(new Date(), 1));
  const tomorrowDelivery = upcomingDeliveries.find(delivery => 
    isSameDay(new Date(delivery.delivery_date), tomorrow)
  );

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Lunch Box Subscription</h1>
          <p className="text-gray-600 mt-1">Manage your delivery schedule and preferences</p>
        </div>
        <Badge className={cn(config.color, "text-white px-4 py-2 text-base")}>
          <StatusIcon className="h-4 w-4 mr-2" />
          {config.label}
        </Badge>
      </div>

      {/* Tomorrow's Delivery Highlight Card */}
      {subscription.status === 'active' && tomorrowDelivery && (
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
              {/* Left: Icon & Text */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center animate-pulse">
                    <Utensils className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-green-900">Tomorrow's Delivery</h3>
                      <Sparkles className="h-5 w-5 text-yellow-500" />
                    </div>
                    <p className="text-sm text-green-700">
                      {format(tomorrow, 'EEEE, MMMM d')} • 12:00 PM - 1:00 PM
                    </p>
                  </div>
                </div>

                {tomorrowDelivery.menu_item ? (
                  <div className="ml-15 pl-3 border-l-4 border-green-500">
                    <p className="text-2xl font-bold text-gray-900 mb-1">
                      🍱 {tomorrowDelivery.menu_item.name}
                    </p>
                    {tomorrowDelivery.menu_item.description && (
                      <p className="text-sm text-gray-700">
                        {tomorrowDelivery.menu_item.description}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="ml-15 pl-3 border-l-4 border-orange-400">
                    <p className="text-lg font-semibold text-orange-900 mb-1">
                      Menu will be assigned soon
                    </p>
                    <p className="text-sm text-orange-700">
                      Our team is planning tomorrow's delicious meal for you!
                    </p>
                  </div>
                )}
              </div>

              {/* Right: Menu Image */}
              {tomorrowDelivery.menu_item?.image_url && (
                <div className="w-full md:w-48 h-48 rounded-lg overflow-hidden shadow-lg border-4 border-white">
                  <img
                    src={tomorrowDelivery.menu_item.image_url}
                    alt={tomorrowDelivery.menu_item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid lg:grid-cols-[35%_65%] gap-6">
        {/* Left Panel - Subscription Details */}
        <div className="space-y-6">
          {/* Plan Type Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Package className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Subscription Plan</CardTitle>
                  <CardDescription>Your current plan details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Badge className={cn(typeConfig[subscription.subscription_type].color, "text-sm px-3 py-1")}>
                  {typeConfig[subscription.subscription_type].label}
                </Badge>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Start Date:</span>
                  <span className="font-medium">{format(new Date(subscription.start_date), 'MMM d, yyyy')}</span>
                </div>
                {subscription.end_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">End Date:</span>
                    <span className="font-medium">{format(new Date(subscription.end_date), 'MMM d, yyyy')}</span>
                  </div>
                )}
                {subscription.next_delivery_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Next Delivery:</span>
                    <span className="font-medium text-green-600">
                      {format(new Date(subscription.next_delivery_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
                {subscription.total_delivery_days && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Days:</span>
                    <span className="font-medium">{subscription.total_delivery_days} days</span>
                  </div>
                )}
              </div>

              {/* Pricing (if approved) */}
              {subscription.status === 'active' && subscription.total_price && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-gray-700">
                      <CreditCard className="h-4 w-4" />
                      <span className="font-semibold">Pricing</span>
                    </div>
                    {subscription.price_per_day && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Per Day:</span>
                        <span className="font-medium">${subscription.price_per_day.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-bold">
                      <span>Total:</span>
                      <span className="text-green-600">${subscription.total_price.toFixed(2)}</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Delivery Address Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Delivery Address</CardTitle>
                  <CardDescription>Where we'll deliver</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="font-semibold text-gray-900">{subscription.company}</div>
              <div className="text-gray-600">{subscription.address_line1}</div>
              {subscription.address_line2 && (
                <div className="text-gray-600">{subscription.address_line2}</div>
              )}
              <div className="text-gray-600">
                {subscription.city}, {subscription.state} {subscription.postal_code}
              </div>
              {subscription.delivery_instructions && (
                <>
                  <Separator className="my-2" />
                  <div className="text-gray-600">
                    <span className="font-medium">Instructions:</span> {subscription.delivery_instructions}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          {subscription.status === 'active' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowPauseDialog(true)}
                  disabled={pauseMutation.isPending}
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Pause Subscription
                </Button>
              </CardContent>
            </Card>
          )}

          {subscription.status === 'paused' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => setShowResumeDialog(true)}
                  disabled={resumeMutation.isPending}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Resume Subscription
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Panel - Tabbed Content */}
        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {/* Tab Header with Modify Button */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="calendar" className="flex-1 sm:flex-initial">
                  <CalendarDays className="h-4 w-4 mr-2" />
                  Calendar
                </TabsTrigger>
                <TabsTrigger value="upcoming" className="flex-1 sm:flex-initial">
                  <ListOrdered className="h-4 w-4 mr-2" />
                  Upcoming Deliveries
                </TabsTrigger>
              </TabsList>
              
              {/* Modify Schedule Button - Desktop: right of tabs, Mobile: below tabs */}
              {canModifySchedule && activeTab === 'calendar' && (
                <div className="w-full sm:w-auto">
                  {!editingSchedule ? (
                    <Button onClick={startEditingSchedule} className="w-full sm:w-auto">
                      <Calendar className="h-4 w-4 mr-2" />
                      Modify Schedule
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setEditingSchedule(false)}
                        className="flex-1 sm:flex-initial"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveSchedule}
                        disabled={updateScheduleMutation.isPending}
                        className="flex-1 sm:flex-initial"
                      >
                        {updateScheduleMutation.isPending ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Calendar Tab Content */}
            <TabsContent value="calendar" className="mt-0">
              {subscription.subscription_type === 'custom' && subscription.delivery_schedule.length > 0 ? (
                <DeliveryCalendar
                  selectedDates={
                    editingSchedule
                      ? tempSchedule
                      : subscription.delivery_schedule.map(d => new Date(d))
                  }
                  onDatesChange={setTempSchedule}
                  totalDaysAllowed={subscription.total_delivery_days || 0}
                  isReadOnly={!editingSchedule}
                  minDate={new Date(subscription.start_date)}
                  existingDeliveries={upcomingDeliveries.map(d => ({
                    date: new Date(d.delivery_date),
                    status: d.status,
                  }))}
                />
              ) : (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <CalendarDays className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600 font-medium mb-2">Calendar view available for custom plans only</p>
                    <p className="text-sm text-gray-500">
                      Switch to the Upcoming Deliveries tab to view your scheduled deliveries
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Upcoming Deliveries Tab Content */}
            <TabsContent value="upcoming" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Deliveries</CardTitle>
                  <CardDescription>Your scheduled lunch box deliveries</CardDescription>
                </CardHeader>
                <CardContent>
                  {upcomingDeliveries.length > 0 ? (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                      {upcomingDeliveries.map((delivery) => (
                        <div
                          key={delivery.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                              <Calendar className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">
                                {format(new Date(delivery.delivery_date), 'EEEE, MMM d, yyyy')}
                              </div>
                              {delivery.menu_item ? (
                                <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                                  <Utensils className="h-3 w-3" />
                                  {delivery.menu_item.name}
                                </div>
                              ) : (
                                <div className="text-sm text-orange-600 flex items-center gap-1 mt-1">
                                  <AlertCircle className="h-3 w-3" />
                                  Menu not assigned yet
                                </div>
                              )}
                            </div>
                          </div>
                          <Badge 
                            variant="secondary"
                            className="capitalize"
                          >
                            {delivery.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <ListOrdered className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-600 font-medium mb-2">
                        No upcoming deliveries scheduled
                      </p>
                      <p className="text-sm text-gray-500">
                        Your delivery schedule will appear here once set up
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Pause Dialog */}
      <AlertDialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pause Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Your lunch box deliveries will be paused. You can resume anytime. No deliveries will be made while paused.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePause} disabled={pauseMutation.isPending}>
              {pauseMutation.isPending ? 'Pausing...' : 'Pause Subscription'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Resume Dialog */}
      <AlertDialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resume Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Your lunch box deliveries will resume. Deliveries will start from the next scheduled date.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResume} disabled={resumeMutation.isPending}>
              {resumeMutation.isPending ? 'Resuming...' : 'Resume Subscription'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SubscriptionDashboard;
