import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';
// import { useUser } from '@clerk/clerk-react';
// import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';
// import { Calendar, MapPin, AlertCircle, Clock, CheckCircle } from 'lucide-react';
// import { useLunchBoxSubscription, useCancelLunchBoxSubscription, usePauseLunchBoxSubscription, useResumeLunchBoxSubscription } from '@/hooks/useLunchBoxSubscription';
// import { useToast } from '@/hooks/use-toast';
// import { Alert, AlertDescription } from '@/components/ui/alert';

const LunchBoxSubscriptionCard = () => {
  // TODO: Uncomment when ready to enable lunch box subscriptions
  // const { user } = useUser();
  // const { toast } = useToast();
  // const { data: subscription, isLoading } = useLunchBoxSubscription(user?.id);
  // const cancelMutation = useCancelLunchBoxSubscription();
  // const pauseMutation = usePauseLunchBoxSubscription();
  // const resumeMutation = useResumeLunchBoxSubscription();

  // if (isLoading) {
  //   return (
  //     <Card>
  //       <CardHeader>
  //         <CardTitle className="flex items-center gap-2">
  //           <Package className="h-5 w-5" />
  //           Lunch Box Subscription
  //         </CardTitle>
  //       </CardHeader>
  //       <CardContent>
  //         <p className="text-gray-500">Loading subscription...</p>
  //       </CardContent>
  //     </Card>
  //   );
  // }

  // if (!subscription) {
  //   return (
  //     <Card>
  //       <CardHeader>
  //         <CardTitle className="flex items-center gap-2">
  //           <Package className="h-5 w-5" />
  //           Lunch Box Subscription
  //         </CardTitle>
  //         <CardDescription>
  //           Get fresh lunches delivered to your office daily
  //         </CardDescription>
  //       </CardHeader>
  //       <CardContent>
  //         <Alert>
  //           <AlertCircle className="h-4 w-4" />
  //           <AlertDescription>
  //             You don't have an active lunch box subscription. Visit the Lunch Box page to subscribe.
  //           </AlertDescription>
  //         </Alert>
  //         <Button className="mt-4 w-full" asChild>
  //           <a href="/lunch-box">Browse Plans</a>
  //         </Button>
  //       </CardContent>
  //     </Card>
  //   );
  // }

  // const handleCancel = async () => {
  //   if (!confirm('Are you sure you want to cancel your subscription? This action cannot be undone.')) {
  //     return;
  //   }

  //   try {
  //     await cancelMutation.mutateAsync(subscription.id);
  //     toast({
  //       title: "Subscription cancelled",
  //       description: "Your lunch box subscription has been cancelled.",
  //     });
  //   } catch (error) {
  //     toast({
  //       variant: "destructive",
  //       title: "Error",
  //       description: "Failed to cancel subscription. Please try again.",
  //     });
  //   }
  // };

  // const handlePause = async () => {
  //   try {
  //     await pauseMutation.mutateAsync(subscription.id);
  //     toast({
  //       title: "Subscription paused",
  //       description: "Your lunch box deliveries have been paused.",
  //     });
  //   } catch (error) {
  //     toast({
  //       variant: "destructive",
  //       title: "Error",
  //       description: "Failed to pause subscription. Please try again.",
  //     });
  //   }
  // };

  // const handleResume = async () => {
  //   try {
  //     await resumeMutation.mutateAsync(subscription.id);
  //     toast({
  //       title: "Subscription resumed",
  //       description: "Your lunch box deliveries have been resumed.",
  //     });
  //   } catch (error) {
  //     toast({
  //       variant: "destructive",
  //       title: "Error",
  //       description: "Failed to resume subscription. Please try again.",
  //     });
  //   }
  // };

  // const getStatusBadge = () => {
  //   switch (subscription.status) {
  //     case 'active':
  //       return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Active</Badge>;
  //     case 'paused':
  //       return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Paused</Badge>;
  //     case 'cancelled':
  //       return <Badge variant="destructive">Cancelled</Badge>;
  //     default:
  //       return <Badge variant="outline">{subscription.status}</Badge>;
  //   }
  // };

  // return (
  //   <Card>
  //     <CardHeader>
  //       <div className="flex items-start justify-between">
  //         <div>
  //           <CardTitle className="flex items-center gap-2">
  //             <Package className="h-5 w-5" />
  //             Lunch Box Subscription
  //           </CardTitle>
  //           <CardDescription className="mt-1">
  //             {subscription.subscription_type === 'weekly' ? 'Weekly Plan' : 'Monthly Plan'} - 
  //             {subscription.subscription_type === 'weekly' ? ' $59.99/week' : ' $199.99/month'}
  //           </CardDescription>
  //         </div>
  //         {getStatusBadge()}
  //       </div>
  //     </CardHeader>
  //     <CardContent className="space-y-6">
  //       {/* Delivery Information */}
  //       <div className="space-y-4">
  //         <div className="flex items-start gap-3">
  //           <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
  //           <div>
  //             <p className="text-sm font-semibold text-gray-700">Start Date</p>
  //             <p className="text-sm text-gray-600">
  //               {new Date(subscription.start_date).toLocaleDateString('en-US', { 
  //                 weekday: 'long', 
  //                 year: 'numeric', 
  //                 month: 'long', 
  //                 day: 'numeric' 
  //               })}
  //             </p>
  //           </div>
  //         </div>

  //         {subscription.next_delivery_date && subscription.status === 'active' && (
  //           <div className="flex items-start gap-3">
  //             <Clock className="h-5 w-5 text-[#8B1A1A] mt-0.5" />
  //             <div>
  //               <p className="text-sm font-semibold text-gray-700">Next Delivery</p>
  //               <p className="text-sm text-gray-600">
  //                 {new Date(subscription.next_delivery_date).toLocaleDateString('en-US', { 
  //                   weekday: 'long', 
  //                   year: 'numeric', 
  //                   month: 'long', 
  //                   day: 'numeric' 
  //                 })}
  //               </p>
  //             </div>
  //           </div>
  //         )}

  //         <div className="flex items-start gap-3">
  //           <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
  //           <div>
  //             <p className="text-sm font-semibold text-gray-700">Delivery Address</p>
  //             <p className="text-sm text-gray-600">
  //               {subscription.company}<br />
  //               {subscription.address_line1}<br />
  //               {subscription.address_line2 && <>{subscription.address_line2}<br /></>}
  //               {subscription.city}, {subscription.state} {subscription.postal_code}
  //             </p>
  //             {subscription.delivery_instructions && (
  //               <p className="text-sm text-gray-500 italic mt-2">
  //                 Note: {subscription.delivery_instructions}
  //               </p>
  //             )}
  //           </div>
  //         </div>
  //       </div>

  //       {/* Action Buttons */}
  //       {subscription.status !== 'cancelled' && (
  //         <div className="flex gap-2 pt-4 border-t">
  //           {subscription.status === 'active' ? (
  //             <Button 
  //               variant="outline" 
  //               onClick={handlePause}
  //               disabled={pauseMutation.isPending}
  //               className="flex-1"
  //             >
  //               {pauseMutation.isPending ? 'Pausing...' : 'Pause Deliveries'}
  //             </Button>
  //           ) : (
  //             <Button 
  //               variant="outline" 
  //               onClick={handleResume}
  //               disabled={resumeMutation.isPending}
  //               className="flex-1"
  //             >
  //               {resumeMutation.isPending ? 'Resuming...' : 'Resume Deliveries'}
  //             </Button>
  //           )}
  //           <Button 
  //             variant="destructive" 
  //             onClick={handleCancel}
  //             disabled={cancelMutation.isPending}
  //             className="flex-1"
  //           >
  //             {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Subscription'}
  //           </Button>
  //         </div>
  //       )}
  //     </CardContent>
  //   </Card>
  // );

  // COMING SOON - Temporary overlay while feature is in development
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Lunch Box Subscription
        </CardTitle>
        <CardDescription>
          Get fresh lunches delivered to your office daily
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-gray-100 p-6 mb-4">
            <Package className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Coming Soon</h3>
          <p className="text-gray-600 max-w-md">
            Lunch box subscriptions are currently under development. Check back soon for daily lunch delivery options!
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default LunchBoxSubscriptionCard;
