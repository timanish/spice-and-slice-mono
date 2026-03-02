import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RefreshCw, Plus, Clock, Settings, Trash2, Edit, GripVertical, MapPin, DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
import { supabase } from '@/integrations/supabase/client';
import { useAdminCrud } from '@/hooks/useAdminCrud';
import { useToast } from '@/hooks/use-toast';
import { useAllDeliverySlots, DeliveryTimeSlot } from '@/hooks/useDeliverySlots';
import { useRawDeliverySettings, DeliverySetting } from '@/hooks/useDeliverySettings';

interface DeliveryZone {
  id: string;
  zone_name: string;
  min_distance: number;
  max_distance: number;
  free_shipping_threshold: number;
  delivery_fee: number;
  is_active: boolean;
  display_order: number;
}

const AdminDeliverySettingsPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { insert, update, remove } = useAdminCrud();

  const { data: slots, isLoading: slotsLoading, refetch: refetchSlots } = useAllDeliverySlots();
  const { data: settings, isLoading: settingsLoading, refetch: refetchSettings } = useRawDeliverySettings();

  const [isSlotDialogOpen, setIsSlotDialogOpen] = useState(false);
  const [isSettingDialogOpen, setIsSettingDialogOpen] = useState(false);
  const [isZoneDialogOpen, setIsZoneDialogOpen] = useState(false);
  const [deleteSlotId, setDeleteSlotId] = useState<string | null>(null);
  const [deleteZoneId, setDeleteZoneId] = useState<string | null>(null);
  const [editingSlot, setEditingSlot] = useState<DeliveryTimeSlot | null>(null);
  const [editingSetting, setEditingSetting] = useState<DeliverySetting | null>(null);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);

  // Slot form state
  const [slotForm, setSlotForm] = useState({
    start_hour: 10,
    start_minute: 0,
    end_hour: 12,
    end_minute: 0,
    label: '',
    is_active: true,
    display_order: (slots?.length || 0) + 1,
  });

  // Setting form state
  const [settingValue, setSettingValue] = useState('');

  // Fetch delivery zones
  const { data: zones, isLoading: zonesLoading } = useQuery({
    queryKey: ['delivery-zones-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_zones')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as DeliveryZone[];
    },
  });

  // Zone form state
  const [zoneForm, setZoneForm] = useState({
    zone_name: '',
    min_distance: 0,
    max_distance: 5,
    free_shipping_threshold: 100,
    delivery_fee: 5.99,
    is_active: true,
    display_order: (zones?.length || 0) + 1,
  });

  // Toggle slot active status
  const toggleSlotMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      await update('delivery_time_slots', { is_active }, [{ column: 'id', operator: 'eq', value: id }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allDeliveryTimeSlots'] });
      queryClient.invalidateQueries({ queryKey: ['deliveryTimeSlots'] });
      toast({ title: 'Slot updated', description: 'Time slot status updated successfully.' });
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
        await update('delivery_time_slots', updateData, [{ column: 'id', operator: 'eq', value: id }]);
      } else {
        await insert('delivery_time_slots', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allDeliveryTimeSlots'] });
      queryClient.invalidateQueries({ queryKey: ['deliveryTimeSlots'] });
      setIsSlotDialogOpen(false);
      setEditingSlot(null);
      resetSlotForm();
      toast({ title: 'Success', description: 'Time slot saved successfully.' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Delete slot
  const deleteSlotMutation = useMutation({
    mutationFn: async (id: string) => {
      await remove('delivery_time_slots', [{ column: 'id', operator: 'eq', value: id }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allDeliveryTimeSlots'] });
      queryClient.invalidateQueries({ queryKey: ['deliveryTimeSlots'] });
      setDeleteSlotId(null);
      toast({ title: 'Deleted', description: 'Time slot deleted successfully.' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Update setting
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      await update('delivery_settings', { value }, [{ column: 'key', operator: 'eq', value: key }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rawDeliverySettings'] });
      queryClient.invalidateQueries({ queryKey: ['deliverySettings'] });
      setIsSettingDialogOpen(false);
      setEditingSetting(null);
      toast({ title: 'Success', description: 'Setting updated successfully.' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Toggle zone active status
  const toggleZoneMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      await update('delivery_zones', { is_active }, [{ column: 'id', operator: 'eq', value: id }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-zones-admin'] });
      queryClient.invalidateQueries({ queryKey: ['deliveryZones'] });
      toast({ title: 'Zone updated', description: 'Delivery zone status updated successfully.' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Create or update zone
  const saveZoneMutation = useMutation({
    mutationFn: async (data: typeof zoneForm & { id?: string }) => {
      if (data.id) {
        const { id, ...updateData } = data;
        await update('delivery_zones', updateData, [{ column: 'id', operator: 'eq', value: id }]);
      } else {
        await insert('delivery_zones', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-zones-admin'] });
      queryClient.invalidateQueries({ queryKey: ['deliveryZones'] });
      setIsZoneDialogOpen(false);
      setEditingZone(null);
      resetZoneForm();
      toast({ title: 'Success', description: 'Delivery zone saved successfully.' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Delete zone
  const deleteZoneMutation = useMutation({
    mutationFn: async (id: string) => {
      await remove('delivery_zones', [{ column: 'id', operator: 'eq', value: id }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-zones-admin'] });
      queryClient.invalidateQueries({ queryKey: ['deliveryZones'] });
      setDeleteZoneId(null);
      toast({ title: 'Deleted', description: 'Delivery zone deleted successfully.' });
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
      display_order: (slots?.length || 0) + 1,
    });
  };

  const resetZoneForm = () => {
    setZoneForm({
      zone_name: '',
      min_distance: 0,
      max_distance: 5,
      free_shipping_threshold: 100,
      delivery_fee: 5.99,
      is_active: true,
      display_order: (zones?.length || 0) + 1,
    });
  };

  const openSlotDialog = (slot?: DeliveryTimeSlot) => {
    if (slot) {
      setEditingSlot(slot);
      setSlotForm({
        start_hour: slot.start_hour,
        start_minute: slot.start_minute,
        end_hour: slot.end_hour,
        end_minute: slot.end_minute,
        label: slot.label,
        is_active: slot.is_active,
        display_order: slot.display_order,
      });
    } else {
      setEditingSlot(null);
      resetSlotForm();
    }
    setIsSlotDialogOpen(true);
  };

  const openSettingDialog = (setting: DeliverySetting) => {
    setEditingSetting(setting);
    setSettingValue(setting.value);
    setIsSettingDialogOpen(true);
  };

  const openZoneDialog = (zone?: DeliveryZone) => {
    if (zone) {
      setEditingZone(zone);
      setZoneForm({
        zone_name: zone.zone_name,
        min_distance: zone.min_distance,
        max_distance: zone.max_distance,
        free_shipping_threshold: zone.free_shipping_threshold,
        delivery_fee: zone.delivery_fee,
        is_active: zone.is_active,
        display_order: zone.display_order,
      });
    } else {
      setEditingZone(null);
      resetZoneForm();
    }
    setIsZoneDialogOpen(true);
  };

  const handleSaveSlot = () => {
    if (!slotForm.label) {
      toast({ title: 'Error', description: 'Label is required', variant: 'destructive' });
      return;
    }
    saveSlotMutation.mutate(editingSlot ? { ...slotForm, id: editingSlot.id } : slotForm);
  };

  const handleSaveSetting = () => {
    if (editingSetting) {
      updateSettingMutation.mutate({ key: editingSetting.key, value: settingValue });
    }
  };

  const handleSaveZone = () => {
    if (!zoneForm.zone_name) {
      toast({ title: 'Error', description: 'Zone name is required', variant: 'destructive' });
      return;
    }
    if (zoneForm.min_distance >= zoneForm.max_distance) {
      toast({ title: 'Error', description: 'Max distance must be greater than min distance', variant: 'destructive' });
      return;
    }
    saveZoneMutation.mutate(editingZone ? { ...zoneForm, id: editingZone.id } : zoneForm);
  };

  const formatTime = (hour: number, minute: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <AdminLayout title="Delivery Settings">
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Delivery Settings</h1>
            <p className="text-gray-600 mt-1">Manage delivery time slots and system settings</p>
          </div>
          <Button
            onClick={() => {
              refetchSlots();
              refetchSettings();
            }}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

          <Tabs defaultValue="slots" className="space-y-6">
            <TabsList className="grid w-full max-w-3xl grid-cols-3">
              <TabsTrigger value="slots">
                <Clock className="h-4 w-4 mr-2" />
                Time Slots
              </TabsTrigger>
              <TabsTrigger value="zones">
                <MapPin className="h-4 w-4 mr-2" />
                Delivery Zones
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings className="h-4 w-4 mr-2" />
                System Settings
              </TabsTrigger>
            </TabsList>

            {/* Time Slots Tab */}
            <TabsContent value="slots" className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  {slots?.length || 0} time slot{slots?.length !== 1 ? 's' : ''} configured
                </p>
                <Button onClick={() => openSlotDialog()} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Time Slot
                </Button>
              </div>

              {slotsLoading ? (
                <Card>
                  <CardContent className="p-6">
                    <p className="text-center text-gray-600">Loading time slots...</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {slots?.map((slot) => (
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

            {/* Delivery Zones Tab */}
            <TabsContent value="zones" className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  {zones?.length || 0} delivery zone{zones?.length !== 1 ? 's' : ''} configured
                </p>
                <Button onClick={() => openZoneDialog()} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Delivery Zone
                </Button>
              </div>

              {zonesLoading ? (
                <Card>
                  <CardContent className="p-6">
                    <p className="text-center text-gray-600">Loading delivery zones...</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {zones?.map((zone) => (
                    <Card key={zone.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <GripVertical className="h-5 w-5 text-gray-400" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold">{zone.zone_name}</p>
                                {!zone.is_active && (
                                  <Badge variant="secondary">Inactive</Badge>
                                )}
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm">
                                <div>
                                  <p className="text-gray-500">Distance Range</p>
                                  <p className="font-medium">{zone.min_distance} - {zone.max_distance} miles</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Delivery Fee</p>
                                  <p className="font-medium text-food-red">${zone.delivery_fee.toFixed(2)}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Free Shipping</p>
                                  <p className="font-medium">${zone.free_shipping_threshold.toFixed(2)}+</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Display Order</p>
                                  <p className="font-medium">#{zone.display_order}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`zone-active-${zone.id}`} className="text-sm">
                                Active
                              </Label>
                              <Switch
                                id={`zone-active-${zone.id}`}
                                checked={zone.is_active}
                                onCheckedChange={(checked) =>
                                  toggleZoneMutation.mutate({ id: zone.id, is_active: checked })
                                }
                              />
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openZoneDialog(zone)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteZoneId(zone.id)}
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

            {/* System Settings Tab */}
            <TabsContent value="settings" className="space-y-4">
              {settingsLoading ? (
                <Card>
                  <CardContent className="p-6">
                    <p className="text-center text-gray-600">Loading settings...</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {settings?.map((setting) => (
                    <Card key={setting.key}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg capitalize">
                              {setting.key.replace(/_/g, ' ')}
                            </CardTitle>
                            {setting.description && (
                              <CardDescription className="mt-1">
                                {setting.description}
                              </CardDescription>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openSettingDialog(setting)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2">
                          <Label className="text-sm text-gray-600">Current Value:</Label>
                          <Badge variant="outline">{setting.value}</Badge>
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
            <DialogTitle>{editingSlot ? 'Edit Time Slot' : 'Add Time Slot'}</DialogTitle>
            <DialogDescription>
              Configure a delivery time slot for customers to choose from.
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
              <Label htmlFor="display_order">Display Order</Label>
              <Input
                id="display_order"
                type="number"
                min="1"
                value={slotForm.display_order}
                onChange={(e) =>
                  setSlotForm({ ...slotForm, display_order: parseInt(e.target.value) || 1 })
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

      {/* Setting Edit Dialog */}
      <Dialog open={isSettingDialogOpen} onOpenChange={setIsSettingDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Setting</DialogTitle>
            <DialogDescription>
              {editingSetting?.description || 'Update system setting value'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="setting_key">Setting Key</Label>
              <Input
                id="setting_key"
                value={editingSetting?.key || ''}
                disabled
                className="bg-gray-100"
              />
            </div>
            <div>
              <Label htmlFor="setting_value">Value</Label>
              <Input
                id="setting_value"
                value={settingValue}
                onChange={(e) => setSettingValue(e.target.value)}
                placeholder="Enter value"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSettingDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSetting} disabled={updateSettingMutation.isPending}>
              {updateSettingMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Zone Create/Edit Dialog */}
      <Dialog open={isZoneDialogOpen} onOpenChange={setIsZoneDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingZone ? 'Edit Delivery Zone' : 'Add Delivery Zone'}</DialogTitle>
            <DialogDescription>
              Configure a delivery zone with distance range and pricing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="zone_name">Zone Name *</Label>
              <Input
                id="zone_name"
                value={zoneForm.zone_name}
                onChange={(e) => setZoneForm({ ...zoneForm, zone_name: e.target.value })}
                placeholder="e.g., Zone 1: 5-10 Miles"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="min_distance">Minimum Distance (miles) *</Label>
                <Input
                  id="min_distance"
                  type="number"
                  step="0.1"
                  min="0"
                  value={zoneForm.min_distance}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                    setZoneForm({ ...zoneForm, min_distance: isNaN(val) ? 0 : val });
                  }}
                />
              </div>
              <div>
                <Label htmlFor="max_distance">Maximum Distance (miles) *</Label>
                <Input
                  id="max_distance"
                  type="number"
                  step="0.1"
                  min="0"
                  value={zoneForm.max_distance}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                    setZoneForm({ ...zoneForm, max_distance: isNaN(val) ? 0 : val });
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="delivery_fee">
                  <DollarSign className="h-4 w-4 inline mr-1" />
                  Delivery Fee *
                </Label>
                <Input
                  id="delivery_fee"
                  type="number"
                  step="0.01"
                  min="0"
                  value={zoneForm.delivery_fee}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                    setZoneForm({ ...zoneForm, delivery_fee: isNaN(val) ? 0 : val });
                  }}
                  placeholder="5.99"
                />
                <p className="text-xs text-gray-500 mt-1">Amount charged for delivery in this zone</p>
              </div>
              <div>
                <Label htmlFor="free_shipping_threshold">
                  <DollarSign className="h-4 w-4 inline mr-1" />
                  Free Shipping Threshold *
                </Label>
                <Input
                  id="free_shipping_threshold"
                  type="number"
                  step="0.01"
                  min="0"
                  value={zoneForm.free_shipping_threshold}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                    setZoneForm({ ...zoneForm, free_shipping_threshold: isNaN(val) ? 0 : val });
                  }}
                  placeholder="100.00"
                />
                <p className="text-xs text-gray-500 mt-1">Order total for free delivery</p>
              </div>
            </div>
            <div>
              <Label htmlFor="display_order">Display Order</Label>
              <Input
                id="display_order"
                type="number"
                min="0"
                value={zoneForm.display_order}
                onChange={(e) => {
                  const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                  setZoneForm({ ...zoneForm, display_order: isNaN(val) ? 0 : val });
                }}
              />
              <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="zone_is_active"
                checked={zoneForm.is_active}
                onCheckedChange={(checked) =>
                  setZoneForm({ ...zoneForm, is_active: checked })
                }
              />
              <Label htmlFor="zone_is_active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsZoneDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveZone} disabled={saveZoneMutation.isPending}>
              {saveZoneMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Slot Confirmation Dialog */}
      <AlertDialog open={!!deleteSlotId} onOpenChange={() => setDeleteSlotId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Time Slot</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this time slot? This action cannot be undone.
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

      {/* Delete Zone Confirmation Dialog */}
      <AlertDialog open={!!deleteZoneId} onOpenChange={() => setDeleteZoneId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Delivery Zone</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this delivery zone? This action cannot be undone and may affect customers in this range.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteZoneId && deleteZoneMutation.mutate(deleteZoneId)}
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

export default AdminDeliverySettingsPage;
