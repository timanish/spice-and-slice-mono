import { useQuery } from '@tanstack/react-query';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, MapPin, Mail, Phone, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface CateringRequest {
  id: string;
  created_at: string;
  guest_count: number;
  event_type: string;
  event_date: string;
  event_time: string;
  venue: string;
  dietary_restrictions: string | null;
  additional_info: string | null;
  status: string;
  selected_items: any;
}

const CateringRequests = () => {
  const { user } = useUser();

  const { data: cateringRequests = [], isLoading } = useQuery({
    queryKey: ['cateringRequests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('catering_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as CateringRequest[];
    },
    enabled: !!user?.id,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8B1A1A]"></div>
      </div>
    );
  }

  if (cateringRequests.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Catering Requests</h3>
            <p className="text-gray-500 mb-6">
              You haven't submitted any catering requests yet.
            </p>
            <a
              href="/catering"
              className="inline-flex items-center px-6 py-3 bg-[#8B1A1A] text-white rounded-full hover:bg-[#8B1A1A]/90 transition-colors"
            >
              Request Catering
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Your Catering Requests</h2>
        <a
          href="/catering"
          className="inline-flex items-center px-4 py-2 bg-[#8B1A1A] text-white rounded-full hover:bg-[#8B1A1A]/90 transition-colors text-sm"
        >
          New Request
        </a>
      </div>

      {cateringRequests.map((request) => (
        <Card key={request.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl capitalize">{request.event_type} Event</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Submitted {format(new Date(request.created_at), 'MMM dd, yyyy')}
                </p>
              </div>
              <Badge className={getStatusColor(request.status)}>
                {request.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">Event Date</p>
                    <p className="text-sm text-gray-600">{request.event_date}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">Event Time</p>
                    <p className="text-sm text-gray-600">{request.event_time}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">Guest Count</p>
                    <p className="text-sm text-gray-600">{request.guest_count} guests</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">Venue</p>
                    <p className="text-sm text-gray-600">{request.venue}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {request.dietary_restrictions && (
                  <div>
                    <p className="text-sm font-medium mb-1">Dietary Requirements</p>
                    <p className="text-sm text-gray-600">{request.dietary_restrictions}</p>
                  </div>
                )}

                {request.selected_items && request.selected_items.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Selected Items</p>
                    <div className="space-y-1">
                      {request.selected_items.map((item: any, index: number) => (
                        <p key={index} className="text-sm text-gray-600">
                          • {item.quantity}x {item.menuItem?.name || item.name}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {request.additional_info && (
                  <div>
                    <p className="text-sm font-medium mb-1">Additional Information</p>
                    <p className="text-sm text-gray-600">{request.additional_info}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default CateringRequests;
