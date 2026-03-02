import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useUser as useClerkUser, useAuth } from '@clerk/clerk-react';
import { useMapboxAddressAutofill } from '@/hooks/useMapboxAddressAutofill';
import { MapPin, Loader2 } from 'lucide-react';
import { useUserData } from '@/hooks/useUserData';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AddressFormProps {
  addressId?: string | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface AddressData {
  label: string;
  address_line1: string;
  city: string;
  state: string;
  postal_code: string;
  is_default: boolean;
}

const SUGGESTED_LABELS = ['Home', 'Work', 'Office', 'Apartment', 'Other'];

const AddressForm = ({ addressId, onSuccess, onCancel }: AddressFormProps) => {
  const [address, setAddress] = useState<AddressData>({
    label: '',
    address_line1: '',
    city: '',
    state: '',
    postal_code: '',
    is_default: false,
  });
  const [customLabel, setCustomLabel] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useClerkUser();
  const { getToken } = useAuth();
  const { getAddress, createAddress, updateAddress, setDefaultAddress } = useUserData();
  const addressInputRef = useRef<HTMLInputElement>(null);

  const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

  // Load existing address if editing
  useEffect(() => {
    const loadAddress = async () => {
      if (!addressId) return;

      setIsLoading(true);
      try {
        const result = await getAddress(addressId);
        const data = result.data;

        if (data) {
          setAddress({
            label: SUGGESTED_LABELS.includes(data.label) ? data.label : 'Other',
            address_line1: data.address_line1,
            city: data.city,
            state: data.state,
            postal_code: data.postal_code,
            is_default: data.is_default,
          });

          if (!SUGGESTED_LABELS.includes(data.label)) {
            setCustomLabel(data.label);
          }
        }
      } catch (error) {
        console.error('Error loading address:', error);
        toast({
          title: 'Error',
          description: 'Failed to load address',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadAddress();
  }, [addressId, getAddress]);

  // Mapbox autofill integration - only initialize if token and ref are available
  useMapboxAddressAutofill({
    accessToken: mapboxToken || '',
    inputRef: addressInputRef,
    onAddressSelect: (selectedAddress) => {
      setAddress((prev) => ({
        ...prev,
        address_line1: selectedAddress.addressLine1,
        city: selectedAddress.city,
        state: selectedAddress.state,
        postal_code: selectedAddress.postalCode,
      }));
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'You must be logged in',
        variant: 'destructive',
      });
      return;
    }

    if (!address.address_line1 || !address.city || !address.state || !address.postal_code) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required address fields',
        variant: 'destructive',
      });
      return;
    }

    const finalLabel = address.label === 'Other' ? customLabel.trim() : address.label;
    
    if (!finalLabel) {
      toast({
        title: 'Missing Label',
        description: 'Please provide a label for this address',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const addressPayload = {
        label: finalLabel,
        address_line1: address.address_line1,
        city: address.city,
        state: address.state,
        postal_code: address.postal_code,
        is_default: address.is_default,
      };

      let savedAddressId = addressId;

      if (addressId) {
        await updateAddress({ id: addressId, ...addressPayload });
      } else {
        const result = await createAddress(addressPayload);
        savedAddressId = result.data?.id;
      }

      if (address.is_default && savedAddressId) {
        await setDefaultAddress(savedAddressId);
      }

      setIsCalculatingDistance(true);

      try {
        const token = await getToken();
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

        const distResponse = await fetch(`${supabaseUrl}/functions/v1/calculate-delivery-distance`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            addressId: savedAddressId,
            addressLine1: address.address_line1,
            city: address.city,
            state: address.state,
            postalCode: address.postal_code,
          }),
        });

        if (!distResponse.ok) {
          const errData = await distResponse.json().catch(() => ({}));
          console.error('Distance calculation error:', errData);
        }
      } catch (distError) {
        console.error('Distance calculation failed:', distError);
      } finally {
        setIsCalculatingDistance(false);
      }

      toast({
        title: 'Success',
        description: addressId ? 'Address updated successfully' : 'Address added successfully',
      });

      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error('Error saving address:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save address',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-food-orange" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {/* Label Selection */}
        <div className="space-y-2">
          <Label htmlFor="label">Address Label *</Label>
          <Select 
            value={address.label || ''} 
            onValueChange={(value) => setAddress({ ...address, label: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a label" />
            </SelectTrigger>
            <SelectContent>
              {SUGGESTED_LABELS.map((label) => (
                <SelectItem key={label} value={label}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Custom Label Input (shown when "Other" is selected) */}
        {address.label === 'Other' && (
          <div className="space-y-2">
            <Label htmlFor="customLabel">Custom Label *</Label>
            <Input
              id="customLabel"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="e.g., Mom's House, Vacation Home"
              required
            />
          </div>
        )}

        {/* Street Address */}
        <div className="space-y-2">
          <Label htmlFor="address">Street Address *</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="address"
              ref={addressInputRef}
              value={address.address_line1}
              onChange={(e) => setAddress({ ...address, address_line1: e.target.value })}
              placeholder="123 Main St, Apt 4B"
              className="pl-10"
              required
            />
          </div>
          <p className="text-xs text-gray-500">
            Include apartment, suite, or unit number in this field
          </p>
        </div>

        {/* City */}
        <div className="space-y-2">
          <Label htmlFor="city">City *</Label>
          <Input
            id="city"
            value={address.city}
            onChange={(e) => setAddress({ ...address, city: e.target.value })}
            placeholder="Dallas"
            required
          />
        </div>

        {/* State and Postal Code */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="state">State *</Label>
            <Input
              id="state"
              value={address.state}
              onChange={(e) => setAddress({ ...address, state: e.target.value })}
              placeholder="TX"
              maxLength={2}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postal_code">ZIP Code *</Label>
            <Input
              id="postal_code"
              value={address.postal_code}
              onChange={(e) => setAddress({ ...address, postal_code: e.target.value })}
              placeholder="75001"
              required
            />
          </div>
        </div>

        {/* Set as Default Checkbox */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="is_default"
            checked={address.is_default}
            onCheckedChange={(checked) => setAddress({ ...address, is_default: checked as boolean })}
          />
          <Label htmlFor="is_default" className="text-sm font-normal cursor-pointer">
            Set as default delivery address
          </Label>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          disabled={isSubmitting || isCalculatingDistance}
          className="flex-1"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : isCalculatingDistance ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Calculating Distance...
            </>
          ) : (
            addressId ? 'Update Address' : 'Add Address'
          )}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting || isCalculatingDistance}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
};

export default AddressForm;
