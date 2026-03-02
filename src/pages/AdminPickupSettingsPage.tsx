import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Save, Package, Clock, Plus, Edit, Trash2, GripVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminCrud } from '@/hooks/useAdminCrud';
import { useToast } from '@/hooks/use-toast';

interface PickupSlot {
  id: string;
  label: string;
  start_hour: number;
  start_minute: number;
  end_hour: number;
  end_minute: number;
  is_active: boolean;
  max_orders_per_slot: number;
}

const pickupSettingsSchema = z.object({
  preparation_time_minutes: z.coerce.number().min(15, 'Must be at least 15 minutes').max(240, 'Cannot exceed 4 hours'),
  store_address_line1: z.string().min(1, 'Address is required'),
  store_address_line2: z.string().optional(),
  store_city: z.string().min(1, 'City is required'),
  store_state: z.string().min(2, 'State is required').max(2, 'Use 2-letter state code'),
  store_postal_code: z.string().min(5, 'Valid ZIP code required'),
  store_phone: z.string().optional(),
  opening_time: z.string().regex(/^\d{2}:\d{2}:\d{2}$/, 'Must be in HH:MM:SS format'),
  closing_time: z.string().regex(/^\d{2}:\d{2}:\d{2}$/, 'Must be in HH:MM:SS format'),
  last_order_cutoff_minutes: z.coerce.number().min(0, 'Cannot be negative').max(180, 'Cannot exceed 3 hours'),
  is_pickup_enabled: z.boolean(),
});

type PickupSettingsFormData = z.infer<typeof pickupSettingsSchema>;

const AdminPickupSettingsPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { insert, update, remove } = useAdminCrud();
  const [isSaving, setIsSaving] = useState(false);

  // Pickup slots state
  const [isSlotDialogOpen, setIsSlotDialogOpen] = useState(false);
  const [deleteSlotId, setDeleteSlotId] = useState<string | null>(null);
  const [editingSlot, setEditingSlot] = useState<PickupSlot | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['pickup-settings-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pickup_settings')
        .select('*')
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch pickup slots
  const { data: pickupSlots, isLoading: slotsLoading } = useQuery({
    queryKey: ['pickup-slots-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pickup_slots')
        .select('*')
        .order('start_hour', { ascending: true });

      if (error) throw error;
      return data as PickupSlot[];
    },
  });

  // Slot form state
  const [slotForm, setSlotForm] = useState({
    start_hour: 10,
    start_minute: 0,
    end_hour: 12,
    end_minute: 0,
    label: '',
    is_active: true,
    max_orders_per_slot: 15,
  });

  const form = useForm<PickupSettingsFormData>({
    resolver: zodResolver(pickupSettingsSchema),
    values: settings ? {
      preparation_time_minutes: settings.preparation_time_minutes,
      store_address_line1: settings.store_address_line1,
      store_address_line2: settings.store_address_line2 || '',
      store_city: settings.store_city,
      store_state: settings.store_state,
      store_postal_code: settings.store_postal_code,
      store_phone: settings.store_phone || '',
      opening_time: settings.opening_time,
      closing_time: settings.closing_time,
      last_order_cutoff_minutes: settings.last_order_cutoff_minutes,
      is_pickup_enabled: settings.is_pickup_enabled,
    } : undefined,
  });

  // Toggle slot active status
  const toggleSlotMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      await update('pickup_slots', { is_active }, [{ column: 'id', operator: 'eq', value: id }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pickup-slots-admin'] });
      queryClient.invalidateQueries({ queryKey: ['pickupSlots'] });
      toast({ title: 'Slot updated', description: 'Pickup slot status updated successfully.' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Create or update slot
  const saveSlotMutation = useMutation({
    mutationFn: async (data: typeof slotForm & { id?: string }) => {
      if (data.id) {
        const { id, ...updateData } = data;
        await update('pickup_slots', updateData, [{ column: 'id', operator: 'eq', value: id }]);
      } else {
        await insert('pickup_slots', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pickup-slots-admin'] });
      queryClient.invalidateQueries({ queryKey: ['pickupSlots'] });
      setIsSlotDialogOpen(false);
      setEditingSlot(null);
      resetSlotForm();
      toast({ title: 'Success', description: 'Pickup slot saved successfully.' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Delete slot
  const deleteSlotMutation = useMutation({
    mutationFn: async (id: string) => {
      await remove('pickup_slots', [{ column: 'id', operator: 'eq', value: id }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pickup-slots-admin'] });
      queryClient.invalidateQueries({ queryKey: ['pickupSlots'] });
      setDeleteSlotId(null);
      toast({ title: 'Deleted', description: 'Pickup slot deleted successfully.' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const resetSlotForm = () => {
    setSlotForm({
      start_hour: 10,
      start_minute: 0,
      end_hour: 12,
      end_minute: 0,
      label: '',
      is_active: true,
      max_orders_per_slot: 15,
    });
  };

  const openSlotDialog = (slot?: PickupSlot) => {
    if (slot) {
      setEditingSlot(slot);
      setSlotForm({
        start_hour: slot.start_hour,
        start_minute: slot.start_minute,
        end_hour: slot.end_hour,
        end_minute: slot.end_minute,
        label: slot.label,
        is_active: slot.is_active,
        max_orders_per_slot: slot.max_orders_per_slot,
      });
    } else {
      setEditingSlot(null);
      resetSlotForm();
    }
    setIsSlotDialogOpen(true);
  };

  const handleSaveSlot = () => {
    if (!slotForm.label) {
      toast({ title: 'Error', description: 'Label is required', variant: 'destructive' });
      return;
    }
    saveSlotMutation.mutate(editingSlot ? { ...slotForm, id: editingSlot.id } : slotForm);
  };

  const formatTime = (hour: number, minute: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  const onSubmit = async (data: PickupSettingsFormData) => {
    setIsSaving(true);
    try {
      await update(
        'pickup_settings',
        { ...data, updated_at: new Date().toISOString() },
        [{ column: 'id', operator: 'eq', value: settings?.id }],
      );

      await queryClient.invalidateQueries({ queryKey: ['pickup-settings'] });
      await queryClient.invalidateQueries({ queryKey: ['pickup-settings-admin'] });

      toast({
        title: "Settings saved",
        description: "Pickup settings have been updated successfully.",
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: "Save failed",
        description: error.message || "Failed to save pickup settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Pickup Settings">
        <div className="p-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-food-red" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Pickup Settings">
      <div className="p-8">
        <div className="flex items-center gap-3 mb-6">
          <Package className="h-8 w-8 text-food-red" />
          <div>
            <h1 className="text-3xl font-bold">Pickup Settings</h1>
            <p className="text-gray-600">Configure store pickup options, hours, and time slots</p>
          </div>
        </div>

          <Tabs defaultValue="settings" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="settings">
                <Package className="h-4 w-4 mr-2" />
                General Settings
              </TabsTrigger>
              <TabsTrigger value="slots">
                <Clock className="h-4 w-4 mr-2" />
                Pickup Slots
              </TabsTrigger>
            </TabsList>

            {/* General Settings Tab */}
            <TabsContent value="settings">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Pickup Availability */}
              <Card>
                <CardHeader>
                  <CardTitle>Pickup Availability</CardTitle>
                  <CardDescription>Enable or disable pickup orders</CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="is_pickup_enabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Enable Pickup Orders</FormLabel>
                          <FormDescription>
                            Allow customers to place pickup orders
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Preparation Time */}
              <Card>
                <CardHeader>
                  <CardTitle>Preparation Time</CardTitle>
                  <CardDescription>How long it takes to prepare orders</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="preparation_time_minutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preparation Time (minutes)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormDescription>
                          Minimum time needed to prepare an order for pickup
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="last_order_cutoff_minutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Order Cutoff (minutes before closing)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormDescription>
                          Stop accepting pickup orders this many minutes before closing
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Store Hours */}
              <Card>
                <CardHeader>
                  <CardTitle>Store Hours</CardTitle>
                  <CardDescription>When customers can pick up orders</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="opening_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Opening Time</FormLabel>
                          <FormControl>
                            <Input type="time" step="1" {...field} />
                          </FormControl>
                          <FormDescription>Format: HH:MM:SS</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="closing_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Closing Time</FormLabel>
                          <FormControl>
                            <Input type="time" step="1" {...field} />
                          </FormControl>
                          <FormDescription>Format: HH:MM:SS</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Store Address */}
              <Card>
                <CardHeader>
                  <CardTitle>Store Address</CardTitle>
                  <CardDescription>Pickup location displayed to customers</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="store_address_line1"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address Line 1</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="7451 N Beach St" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="store_address_line2"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address Line 2 (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="#172" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="store_city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Fort Worth" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="store_state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="TX" maxLength={2} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="store_postal_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ZIP Code</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="76137" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="store_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="(817) 123-4567" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Submit Button */}
              <div className="flex justify-end">
                <Button type="submit" disabled={isSaving} size="lg">
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </form>
          </Form>
        </TabsContent>

        {/* Pickup Slots Tab */}
        <TabsContent value="slots" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {pickupSlots?.length || 0} pickup slot{pickupSlots?.length !== 1 ? 's' : ''} configured
            </p>
            <Button onClick={() => openSlotDialog()} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Pickup Slot
            </Button>
          </div>

          {slotsLoading ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-gray-600">Loading pickup slots...</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pickupSlots?.map((slot) => (
                <Card key={slot.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <GripVertical className="h-5 w-5 text-gray-400" />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{slot.label}</p>
                            {!slot.is_active && (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            {formatTime(slot.start_hour, slot.start_minute)} - {formatTime(slot.end_hour, slot.end_minute)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Max {slot.max_orders_per_slot} orders per slot
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`active-${slot.id}`} className="text-sm">
                            Active
                          </Label>
                          <Switch
                            id={`active-${slot.id}`}
                            checked={slot.is_active}
                            onCheckedChange={(checked) =>
                              toggleSlotMutation.mutate({ id: slot.id, is_active: checked })
                            }
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openSlotDialog(slot)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteSlotId(slot.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>

  {/* Slot Create/Edit Dialog */}
  <Dialog open={isSlotDialogOpen} onOpenChange={setIsSlotDialogOpen}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>{editingSlot ? 'Edit Pickup Slot' : 'Add Pickup Slot'}</DialogTitle>
        <DialogDescription>
          Configure a pickup time slot for customers to choose from.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label htmlFor="label">Display Label *</Label>
          <Input
            id="label"
            value={slotForm.label}
            onChange={(e) => setSlotForm({ ...slotForm, label: e.target.value })}
            placeholder="e.g., 10:00 AM - 12:00 PM"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="start_hour">Start Hour (0-23)</Label>
            <Input
              id="start_hour"
              type="number"
              min="0"
              max="23"
              value={slotForm.start_hour}
              onChange={(e) =>
                setSlotForm({ ...slotForm, start_hour: parseInt(e.target.value) || 0 })
              }
            />
          </div>
          <div>
            <Label htmlFor="start_minute">Start Minute (0-59)</Label>
            <Input
              id="start_minute"
              type="number"
              min="0"
              max="59"
              value={slotForm.start_minute}
              onChange={(e) =>
                setSlotForm({ ...slotForm, start_minute: parseInt(e.target.value) || 0 })
              }
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="end_hour">End Hour (0-23)</Label>
            <Input
              id="end_hour"
              type="number"
              min="0"
              max="23"
              value={slotForm.end_hour}
              onChange={(e) =>
                setSlotForm({ ...slotForm, end_hour: parseInt(e.target.value) || 0 })
              }
            />
          </div>
          <div>
            <Label htmlFor="end_minute">End Minute (0-59)</Label>
            <Input
              id="end_minute"
              type="number"
              min="0"
              max="59"
              value={slotForm.end_minute}
              onChange={(e) =>
                setSlotForm({ ...slotForm, end_minute: parseInt(e.target.value) || 0 })
              }
            />
          </div>
        </div>
        <div>
          <Label htmlFor="max_orders">Max Orders Per Slot</Label>
          <Input
            id="max_orders"
            type="number"
            min="1"
            value={slotForm.max_orders_per_slot}
            onChange={(e) =>
              setSlotForm({ ...slotForm, max_orders_per_slot: parseInt(e.target.value) || 15 })
            }
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="is_active"
            checked={slotForm.is_active}
            onCheckedChange={(checked) =>
              setSlotForm({ ...slotForm, is_active: checked })
            }
          />
          <Label htmlFor="is_active">Active</Label>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => setIsSlotDialogOpen(false)}>
          Cancel
        </Button>
        <Button onClick={handleSaveSlot} disabled={saveSlotMutation.isPending}>
          {saveSlotMutation.isPending ? 'Saving...' : 'Save'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  {/* Delete Confirmation Dialog */}
  <AlertDialog open={!!deleteSlotId} onOpenChange={() => setDeleteSlotId(null)}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete Pickup Slot</AlertDialogTitle>
        <AlertDialogDescription>
          Are you sure you want to delete this pickup slot? This action cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          onClick={() => deleteSlotId && deleteSlotMutation.mutate(deleteSlotId)}
          className="bg-red-600 hover:bg-red-700"
        >
          Delete
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
    </AdminLayout>
  );
};

export default AdminPickupSettingsPage;
