import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useUser as useClerkUser, useAuth } from "@clerk/clerk-react";
import { useUserData } from "@/hooks/useUserData";
import { Phone, MapPin } from "lucide-react";
import { useMapboxAddressAutofill } from "@/hooks/useMapboxAddressAutofill";

interface OnboardingFormProps {
  onComplete?: () => void;
  onSkip?: () => void;
  initialData?: {
    fullName?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  };
}

export const OnboardingForm = ({ onComplete, onSkip, initialData }: OnboardingFormProps) => {
  const { toast } = useToast();
  const { user } = useClerkUser();
  const { getToken } = useAuth();
  const { updateProfile, createAddress } = useUserData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const addressInputRef2 = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    fullName: initialData?.fullName || "",
    phone: initialData?.phone || "",
    addressLine1: initialData?.addressLine1 || "",
    addressLine2: initialData?.addressLine2 || "",
    city: initialData?.city || "",
    state: initialData?.state || "",
    postalCode: initialData?.postalCode || "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

  useEffect(() => {
    if (!mapboxToken) {
      console.error('VITE_MAPBOX_ACCESS_TOKEN is not set in environment variables');
    } else {
      // console.log('Mapbox token loaded successfully in onboarding');
    }
  }, [mapboxToken]);

  useMapboxAddressAutofill({
    accessToken: mapboxToken,
    inputRef: addressInputRef,
    onAddressSelect: (address) => {
      setFormData((prevData) => ({
        ...prevData,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2 || '',
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
      }));
      setErrors((prevErrors) => ({ ...prevErrors, addressLine1: '' }));
    },
  });

  useMapboxAddressAutofill({
    accessToken: mapboxToken,
    inputRef: addressInputRef2,
    onAddressSelect: (address) => {
      setFormData((prevData) => ({
        ...prevData,
        addressLine2: address.addressLine1,
      }));
    },
  });

  const formatPhoneNumber = (value: string) => {
    const phoneNumber = value.replace(/\D/g, "");
    
    if (phoneNumber.length <= 3) {
      return phoneNumber;
    } else if (phoneNumber.length <= 6) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    } else {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData({ ...formData, phone: formatted });
    if (errors.phone) {
      setErrors({ ...errors, phone: "" });
    }
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [field]: e.target.value });
    
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }

    const phoneDigits = formData.phone.replace(/\D/g, "");
    if (!phoneDigits) {
      newErrors.phone = "Phone number is required";
    } else if (phoneDigits.length < 10) {
      newErrors.phone = "Please enter a valid 10-digit phone number";
    }

    if (!formData.addressLine1.trim()) {
      newErrors.addressLine1 = "Address is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields correctly.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      await updateProfile({
        full_name: formData.fullName,
        phone_number: formData.phone,
        profile_completed: true,
        onboarding_shown: true,
      });

      if (formData.addressLine1 && formData.city && formData.state && formData.postalCode) {
        const result = await createAddress({
          label: 'Home',
          address_line1: formData.addressLine1,
          city: formData.city,
          state: formData.state,
          postal_code: formData.postalCode,
          is_default: true,
        });

        const addressRecord = result.data;

        if (addressRecord) {
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
                addressId: addressRecord.id,
                addressLine1: formData.addressLine1,
                city: formData.city,
                state: formData.state,
                postalCode: formData.postalCode,
              }),
            });

            if (!distResponse.ok) {
              const errData = await distResponse.json().catch(() => ({}));
              console.error('Distance calculation error:', errData);
            }
          } catch (distanceErr) {
            console.error('Distance calculation failed:', distanceErr);
          } finally {
            setIsCalculatingDistance(false);
          }
        }
      }

      toast({
        title: "Profile Updated!",
        description: "Your information has been saved successfully.",
      });

      onComplete?.();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    try {
      if (!user?.id) {
        onSkip?.();
        return;
      }

      await updateProfile({ onboarding_shown: true });
      
      toast({
        title: "Profile setup skipped",
        description: "You can complete your profile anytime from your account settings.",
      });
      
      onSkip?.();
    } catch (error) {
      console.error("Error skipping onboarding:", error);
      onSkip?.();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Contact Information Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Phone className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Contact Information</h3>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName">
              Full Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="fullName"
              placeholder="Enter your full name"
              value={formData.fullName}
              onChange={handleChange("fullName")}
              className={errors.fullName ? "border-destructive" : ""}
            />
            {errors.fullName && (
              <p className="text-xs text-destructive">{errors.fullName}</p>
            )}
          </div>

          {/* Phone Number - Required */}
          <div className="space-y-2">
            <Label htmlFor="phone">
              Phone Number <span className="text-destructive">*</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(555) 123-4567"
              value={formData.phone}
              onChange={handlePhoneChange}
              maxLength={14}
              className={errors.phone ? "border-destructive" : ""}
            />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone}</p>
            )}
            <p className="text-xs text-muted-foreground">We'll use this for order updates</p>
          </div>
        </div>
      </div>

      {/* Delivery Address Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Delivery Address</h3>
        </div>

        <div className="space-y-4">
          {/* Address Line 1 - Required */}
          <div className="space-y-2">
            <Label htmlFor="addressLine1">
              Street Address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="addressLine1"
              ref={addressInputRef}
              placeholder="Start typing your address..."
              value={formData.addressLine1}
              onChange={handleChange("addressLine1")}
              className={errors.addressLine1 ? "border-destructive" : ""}
              autoComplete="address-line1"
            />
            {errors.addressLine1 && (
              <p className="text-xs text-destructive">{errors.addressLine1}</p>
            )}
          </div>

          {/* Address Line 2 - Optional */}
          <div className="space-y-2">
            <Label htmlFor="addressLine2">
              Apartment, Suite, etc. <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              id="addressLine2"
              ref={addressInputRef2}
              placeholder="Apartment, suite, etc."
              value={formData.addressLine2}
              onChange={handleChange("addressLine2")}
              autoComplete="address-line2"
            />
          </div>

          {/* City, State, Postal Code - Optional but grouped */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="Enter city"
                value={formData.city}
                onChange={handleChange("city")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                placeholder="Enter state"
                value={formData.state}
                onChange={handleChange("state")}
                maxLength={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input
                id="postalCode"
                placeholder="12345"
                value={formData.postalCode}
                onChange={handleChange("postalCode")}
                maxLength={10}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 pt-6">
        <Button
          type="submit"
          disabled={isSubmitting || isCalculatingDistance}
          className="flex-1 bg-primary hover:bg-primary/90"
        >
          {isCalculatingDistance 
            ? "Calculating delivery distance..." 
            : isSubmitting 
            ? "Saving..." 
            : "Save & Continue"}
        </Button>
        
        {onSkip && (
          <Button
            type="button"
            variant="outline"
            onClick={handleSkip}
            disabled={isSubmitting || isCalculatingDistance}
            className="flex-1"
          >
            Complete Later
          </Button>
        )}
      </div>

      <p className="text-xs text-center text-muted-foreground">
        <span className="text-destructive">*</span> Required fields
      </p>
    </form>
  );
};
