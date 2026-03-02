import { Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { LunchBoxSubscription } from '@/integrations/supabase/types/lunchbox';

interface PendingApprovalViewProps {
  subscription: LunchBoxSubscription;
}

const PendingApprovalView = ({ subscription }: PendingApprovalViewProps) => {
  return (
    <div className="container max-w-4xl mx-auto px-4 py-12">
      <Card className="border-2 border-yellow-200 bg-yellow-50">
        <CardContent className="pt-8 pb-8">
          <div className="flex flex-col items-center text-center space-y-6">
            {/* Icon */}
            <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center">
              <Clock className="h-10 w-10 text-yellow-600" />
            </div>

            {/* Title */}
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-gray-900">
                Subscription Pending Approval
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl">
                Thank you for submitting your custom lunch box plan! Our team is reviewing your request and will get back to you within 24 hours.
              </p>
            </div>

            {/* Details */}
            <div className="w-full max-w-md bg-white rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Plan Type:</span>
                <Badge className="bg-pink-100 text-pink-700">Custom Plan</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total Days:</span>
                <span className="font-semibold">{subscription.total_delivery_days} days</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Start Date:</span>
                <span className="font-semibold">
                  {format(new Date(subscription.start_date), 'MMM d, yyyy')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Submitted:</span>
                <span className="font-semibold">
                  {format(new Date(subscription.created_at), 'MMM d, yyyy')}
                </span>
              </div>
            </div>

            {/* What happens next */}
            <div className="w-full max-w-2xl space-y-4 pt-4">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center justify-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                What Happens Next?
              </h3>
              <div className="space-y-3 text-left">
                {[
                  {
                    step: '1',
                    title: 'Review & Pricing',
                    description: 'Our team reviews your delivery schedule and calculates custom pricing based on your requirements.',
                  },
                  {
                    step: '2',
                    title: 'Approval Notification',
                    description: "You'll receive an email with the approved pricing and payment link within 24 hours.",
                  },
                  {
                    step: '3',
                    title: 'Payment & Activation',
                    description: 'Once payment is complete, your subscription will be activated and deliveries will begin as scheduled.',
                  },
                ].map((item) => (
                  <div
                    key={item.step}
                    className="flex gap-4 p-4 bg-white rounded-lg border border-gray-200"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{item.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              <AlertCircle className="inline h-4 w-4 mr-2" />
              Questions? Contact us at{' '}
              <a href="mailto:support@spiceslicebazaar.com" className="font-semibold underline">
                support@spiceslicebazaar.com
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PendingApprovalView;
