import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminCrud } from '@/hooks/useAdminCrud';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Check, X } from 'lucide-react';

const AdminLunchBoxMenuPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { update } = useAdminCrud();

  // Fetch all menu items
  const { data: menuItems = [], isLoading } = useQuery({
    queryKey: ['adminMenuItems'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Toggle lunch box eligible
  const toggleMutation = useMutation({
    mutationFn: async ({ id, currentValue }: { id: string; currentValue: boolean }) => {
      await update('menu_items', { lunch_box_eligible: !currentValue }, [
        { column: 'id', operator: 'eq', value: id },
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminMenuItems'] });
      toast({
        title: "Updated",
        description: "Lunch box eligibility updated successfully",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update menu item",
      });
      console.error('Error updating menu item:', error);
    },
  });

  const eligibleCount = menuItems.filter(item => item.lunch_box_eligible).length;

  return (
    <AdminLayout title="Lunch Box Menu">
      <div className="p-8">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Lunch Box Menu Management</h1>
              <p className="text-gray-600 mt-2">
                Select which menu items are available for lunch box subscriptions
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Eligible Items</p>
              <p className="text-3xl font-bold text-[#8B1A1A]">{eligibleCount}</p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading menu items...</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuItems.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <div className="relative h-48">
                  <img 
                    src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop'}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3">
                    {item.lunch_box_eligible ? (
                      <Badge className="bg-green-500 text-white">
                        <Check className="h-3 w-3 mr-1" />
                        Eligible
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <X className="h-3 w-3 mr-1" />
                        Not Eligible
                      </Badge>
                    )}
                  </div>
                </div>
                
                <CardHeader>
                  <CardTitle className="text-lg">{item.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      {item.sub_category || 'Menu Item'}
                    </Badge>
                    {item.is_vegetarian && (
                      <Badge variant="outline" className="text-xs text-green-600">
                        Veg
                      </Badge>
                    )}
                    {item.is_spicy && (
                      <Badge variant="outline" className="text-xs text-red-600">
                        Spicy
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {item.description}
                  </p>
                  
                  <div className="flex items-center justify-between pt-4 border-t">
                    <label htmlFor={`switch-${item.id}`} className="text-sm font-medium">
                      Lunch Box Eligible
                    </label>
                    <Switch
                      id={`switch-${item.id}`}
                      checked={item.lunch_box_eligible || false}
                      onCheckedChange={() => toggleMutation.mutate({ 
                        id: item.id, 
                        currentValue: item.lunch_box_eligible || false 
                      })}
                      disabled={toggleMutation.isPending}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminLunchBoxMenuPage;
