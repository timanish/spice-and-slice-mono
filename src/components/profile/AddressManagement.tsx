import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useUser as useClerkUser } from '@clerk/clerk-react';
import { MapPin, Edit, Trash2, Star, Plus, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import AddressForm from './AddressForm';
import { useUserData } from '@/hooks/useUserData';

interface Address {
  id: string;
  label: string;
  address_line1: string;
  city: string;
  state: string;
  postal_code: string;
  distance_from_store?: number;
  is_default: boolean;
  is_active: boolean;
}

const AddressManagement = () => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);
  const { user } = useClerkUser();
  const { toast } = useToast();
  const { listAddresses, setDefaultAddress, deleteAddress } = useUserData();

  const loadAddresses = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const result = await listAddresses();
      setAddresses(result.data || []);
    } catch (error) {
      console.error('Error loading addresses:', error);
      toast({
        title: 'Error',
        description: 'Failed to load addresses',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, [user?.id]);

  const handleSetDefault = async (addressId: string) => {
    if (!user?.id) return;

    try {
      await setDefaultAddress(addressId);

      setAddresses(prevAddresses =>
        prevAddresses.map(addr => ({
          ...addr,
          is_default: addr.id === addressId
        }))
      );

      toast({
        title: 'Success',
        description: 'Default address updated',
      });

      await loadAddresses();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to set default address',
        variant: 'destructive',
      });
      await loadAddresses();
    }
  };

  const handleDelete = async () => {
    if (!deletingAddressId) return;

    try {
      await deleteAddress(deletingAddressId);

      toast({
        title: 'Success',
        description: 'Address deleted successfully',
      });

      setDeletingAddressId(null);
      loadAddresses();
    } catch (error) {
      console.error('Error deleting address:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete address',
        variant: 'destructive',
      });
    }
  };

  const handleAddNew = () => {
    setEditingAddressId(null);
    setShowForm(true);
  };

  const handleEdit = (addressId: string) => {
    setEditingAddressId(addressId);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingAddressId(null);
    loadAddresses();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-food-orange" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Delivery Addresses</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage your saved delivery locations
          </p>
        </div>
        <Button onClick={handleAddNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Add New Address
        </Button>
      </div>

      {/* Address List */}
      {addresses.length === 0 ? (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <MapPin className="h-16 w-16 text-gray-300" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">No Addresses Yet</h3>
              <p className="text-gray-600 mt-2">
                Add your first delivery address to get started with orders
              </p>
            </div>
            <Button onClick={handleAddNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Your First Address
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {addresses.map((address) => (
            <Card
              key={`${address.id}-${address.is_default}`}
              className="relative hover:shadow-md transition-shadow"
            >
              <CardContent className="p-4">
                {/* Labels and Actions */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={address.is_default ? 'default' : 'outline'} className="gap-1">
                      {address.is_default && <Star className="h-3 w-3 fill-current" />}
                      {address.label}
                    </Badge>
                    {address.is_default && (
                      <Badge variant="secondary" className="text-xs">
                        Default
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(address.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeletingAddressId(address.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Address Details */}
                <div className="space-y-1 text-sm mb-3">
                  <p className="font-medium text-gray-900">{address.address_line1}</p>
                  <p className="text-gray-600">
                    {address.city}, {address.state} {address.postal_code}
                  </p>
                  {address.distance_from_store && (
                    <p className="text-xs text-gray-500">
                      {address.distance_from_store.toFixed(1)} miles from store
                    </p>
                  )}
                </div>

                {/* Set as Default Button */}
                {!address.is_default && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSetDefault(address.id)}
                    className="w-full text-xs gap-1"
                  >
                    <Star className="h-3 w-3" />
                    Set as Default
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Address Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAddressId ? 'Edit Address' : 'Add New Address'}
            </DialogTitle>
            <DialogDescription>
              {editingAddressId
                ? 'Update your delivery address details'
                : 'Add a new delivery address to your account'}
            </DialogDescription>
          </DialogHeader>
          <AddressForm
            addressId={editingAddressId}
            onSuccess={handleFormSuccess}
            onCancel={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingAddressId} onOpenChange={() => setDeletingAddressId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Address?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this address? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AddressManagement;
