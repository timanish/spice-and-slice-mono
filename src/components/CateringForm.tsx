
import React, { useState, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { useProductFetcher, useMenuItemFetcher } from '@/hooks/products/useProductFetcher';
import { MenuItem } from '@/hooks/products/types';
import { cateringFormSchema, SelectedMenuItem, GroupedMenuItems } from './catering/types';
import MenuSelectionDialog from './catering/MenuSelectionDialog';
import SelectedMenuItems from './catering/SelectedMenuItems';
import CateringFormFields from './catering/CateringFormFields';
import { useCateringService } from './catering/cateringService';
import { z } from 'zod';
import { usePostHogTracking } from '@/hooks/usePostHogTracking'; 

const CateringForm = () => {
  const [spiceLevel, setSpiceLevel] = useState("medium");
  const [selectedItems, setSelectedItems] = useState<SelectedMenuItem[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { trackEvent } = usePostHogTracking();
  
  const { data: fetchedMenuItems, isLoading: menuLoading } = useMenuItemFetcher();
  const menuItems = useMemo(() => fetchedMenuItems || [], [fetchedMenuItems]);
  const { sendCateringEnquiry } = useCateringService();
  
  React.useEffect(() => {
    trackEvent('catering_form_opened', {});
  }, [trackEvent]);
  
  const form = useForm<z.infer<typeof cateringFormSchema>>({
    resolver: zodResolver(cateringFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      eventType: "",
      venue: "",
      dietaryRestrictions: "",
      additionalInfo: ""
    }
  });

  const groupedMenuItems: GroupedMenuItems = useMemo(() => {
    return menuItems.reduce((acc, item) => {
      const cat = item.category?.name || 'Other';
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(item);
      return acc;
    }, {} as GroupedMenuItems);
  }, [menuItems]);

  const addItem = (menuItem: MenuItem) => {
    setSelectedItems(prev => {
      const existingItemIndex = prev.findIndex(item => item.menuItem.id === menuItem.id);
      if (existingItemIndex >= 0) {
        const updated = [...prev];
        updated[existingItemIndex] = {
          ...updated[existingItemIndex],
          quantity: updated[existingItemIndex].quantity + 1
        };
        return updated;
      } else {
        return [...prev, { menuItem, quantity: 1 }];
      }
    });
    setIsDialogOpen(false);
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }
    setSelectedItems(prev => {
      return prev.map(item => {
        if (item.menuItem.id === itemId) {
          return { ...item, quantity };
        }
        return item;
      });
    });
  };

  const removeItem = (itemId: string) => {
    setSelectedItems(prev => prev.filter(item => item.menuItem.id !== itemId));
  };

  const onSubmit = async (data: z.infer<typeof cateringFormSchema>) => {
    if (selectedItems.length === 0) {
      form.setError("root", { 
        type: "manual",
        message: "Please select at least one menu item."
      });
      return;
    }

    try {
      setLoading(true);
      const success = await sendCateringEnquiry({ ...data, selectedItems, spiceLevel });
      if (success) {
        trackEvent('catering_request_submitted', {
          event_type: data.eventType,
          guest_count: selectedItems.reduce((sum, item) => sum + item.quantity, 0),
        });
        form.reset();
        setSelectedItems([]);
        setSpiceLevel("medium");
      }
    } catch (error: any) {
      console.error('Submission error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-serif">Catering Enquiry Form</CardTitle>
          <CardDescription>Let Spice &amp; Slice Bazaar cater your next event with authentic Indo-Nepali cuisine. Fill out the form below and our catering team will contact you with pricing and options.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <CateringFormFields 
                form={form} 
                spiceLevel={spiceLevel}
                setSpiceLevel={setSpiceLevel}
              />
              
              {/* Menu Selection */}
              <div className="bg-gray-50 p-4 rounded-md border">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Menu Selection</h3>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="flex items-center gap-2">
                        <Plus className="h-4 w-4" /> Add Item
                      </Button>
                    </DialogTrigger>
                    <MenuSelectionDialog 
                      groupedMenuItems={groupedMenuItems} 
                      menuLoading={menuLoading} 
                      onAddItem={addItem} 
                    />
                  </Dialog>
                </div>
                
                <SelectedMenuItems 
                  selectedItems={selectedItems}
                  updateItemQuantity={updateItemQuantity}
                  removeItem={removeItem}
                />
                
                {form.formState.errors.root && (
                  <div className="text-red-500 text-sm mt-2">
                    {form.formState.errors.root.message}
                  </div>
                )}
              </div>
              
              <Button type="submit" className="w-full bg-food-red hover:bg-food-red/90" disabled={loading}>
                {loading ? "Submitting..." : "Submit Enquiry"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CateringForm;
