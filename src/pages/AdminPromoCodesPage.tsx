
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RefreshCw, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import PromoCodeForm from '@/components/admin/PromoCodeForm';
import PromoCodeList from '@/components/admin/PromoCodeList';
import { supabase } from '@/integrations/supabase/client';
import { useAdminCrud } from '@/hooks/useAdminCrud';
import { useToast } from '@/hooks/use-toast';
import { PromoCode } from '@/types/promoCode';
import { useUser } from '@/hooks/use-user';

const AdminPromoCodesPage = () => {
  const { toast } = useToast();
  const { remove } = useAdminCrud();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const { 
    data: promoCodes, 
    isLoading, 
    isError, 
    error, 
    refetch,
    isRefetching 
  } = useQuery({
    queryKey: ['promoCodes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message || 'Failed to fetch promo codes');
      }

      return data as PromoCode[];
    }
  });

  const handleDeletePromoCode = async (id: string) => {
    try {
      await remove('promo_codes', [{ column: 'id', operator: 'eq', value: id }]);
      await refetch();
    } catch (error: any) {
      console.error('Error deleting promo code:', error);
      toast({
        title: "Delete failed",
        description: error.message || "There was a problem deleting the promo code",
        variant: "destructive",
      });
    }
  };

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false);
    refetch();
    toast({
      title: "Promo code created",
      description: "The new promo code has been successfully created.",
    });
  };

  const activePromoCodes = promoCodes?.filter(promo => promo.is_active) || [];
  const inactivePromoCodes = promoCodes?.filter(promo => !promo.is_active) || [];

  return (
    <AdminLayout title="Promo Codes">
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Manage Promo Codes</h1>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => refetch()}
                disabled={isRefetching}
              >
                <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              </Button>
              
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Promo Code
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Create New Promo Code</DialogTitle>
                    <DialogDescription>
                      Fill out the form to create a new promotional code.
                    </DialogDescription>
                  </DialogHeader>
                  <PromoCodeForm onSuccess={handleCreateSuccess} />
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow">
            {isLoading ? (
              <div className="flex justify-center items-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
              </div>
            ) : isError ? (
              <div className="bg-red-50 border border-red-200 p-6 rounded-lg text-center">
                <p className="text-red-600 mb-4">{(error as Error)?.message || "Failed to load promo codes"}</p>
                <Button 
                  variant="outline" 
                  onClick={() => refetch()}
                  disabled={isRefetching}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
                  Try Again
                </Button>
              </div>
            ) : (
              <Tabs defaultValue="active" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="active">
                    Active ({activePromoCodes.length})
                  </TabsTrigger>
                  <TabsTrigger value="inactive">
                    Inactive ({inactivePromoCodes.length})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="active" className="p-4">
                  <PromoCodeList 
                    promoCodes={activePromoCodes} 
                    onDelete={handleDeletePromoCode}
                    onRefresh={() => refetch()}
                  />
                </TabsContent>
                
                <TabsContent value="inactive" className="p-4">
                  <PromoCodeList 
                    promoCodes={inactivePromoCodes} 
                    onDelete={handleDeletePromoCode}
                    onRefresh={() => refetch()}
                  />
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
    </AdminLayout>
  );
};

export default AdminPromoCodesPage;
