import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { ArrowLeft, CreditCard, Loader2, MapPin, Package } from "lucide-react";

import Navigation from "@/components/Navigation";
import DeliveryTimeSelector from "@/components/DeliveryTimeSelector";
import PickupTimeSelector from "@/components/PickupTimeSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useMapboxAddressAutofill } from "@/hooks/useMapboxAddressAutofill";
import { useCartStore } from "@/stores/cart";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string;

type Fulfillment = "delivery" | "pickup";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const GuestCheckoutPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isLoaded, isSignedIn } = useUser();
  const { items, comboItems } = useCartStore();
  const addressInputRef = useRef<HTMLInputElement>(null);

  const [fulfillmentType, setFulfillmentType] = useState<Fulfillment>("delivery");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [deliveryTimeValid, setDeliveryTimeValid] = useState(false);
  const [pickupTimeValid, setPickupTimeValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Signed-in users belong on the authenticated checkout.
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate("/checkout", { replace: true });
    }
  }, [isLoaded, isSignedIn, navigate]);

  // Empty cart → bounce to products.
  useEffect(() => {
    if (items.length === 0 && comboItems.length === 0) {
      navigate("/products", { replace: true });
    }
  }, [items.length, comboItems.length, navigate]);

  useMapboxAddressAutofill({
    accessToken: MAPBOX_TOKEN || "",
    inputRef: addressInputRef,
    onAddressSelect: (picked) => {
      setAddressLine1(picked.addressLine1);
      setCity(picked.city);
      setState(picked.state);
      setPostalCode(picked.postalCode);
    },
  });

  const subtotal = items.reduce((sum, item) => {
    const base = item.product?.is_weighted && item.weight
      ? item.weight * (item.product?.price_per_unit || 0)
      : item.quantity * (item.product?.price_per_unit || 0);
    const discount = item.discount_percentage || 0;
    return sum + base * (1 - discount / 100);
  }, 0);

  const readyToSubmit = (() => {
    if (items.length === 0 && comboItems.length === 0) return false;
    if (!EMAIL_RE.test(email.trim())) return false;
    if (phone.trim().length < 7) return false;
    if (fullName.trim().length < 2) return false;
    if (fulfillmentType === "delivery") {
      if (!addressLine1 || !city || !state || !postalCode) return false;
      if (!deliveryTimeValid) return false;
    }
    if (fulfillmentType === "pickup" && !pickupTimeValid) return false;
    return true;
  })();

  const handleSubmit = async () => {
    if (!readyToSubmit || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const deliveryDate =
        fulfillmentType === "delivery"
          ? localStorage.getItem("selectedDeliveryDate")
          : null;
      const deliveryTime =
        fulfillmentType === "delivery"
          ? localStorage.getItem("selectedDeliveryTime")
          : null;

      let pickupDate: string | null = null;
      let pickupTime: string | null = null;
      if (fulfillmentType === "pickup") {
        const pickupIso = localStorage.getItem("selectedPickupDate");
        pickupDate = pickupIso ? pickupIso.substring(0, 10) : null;
        pickupTime = localStorage.getItem("selectedPickupTime");
      }

      const body = {
        paymentMethod: "card" as const,
        fulfillmentType,
        cartItems: items,
        comboCartItems: comboItems,
        deliveryDate,
        deliveryTime,
        pickupDate,
        pickupTime,
        guest: {
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          fullName: fullName.trim(),
        },
        address:
          fulfillmentType === "delivery"
            ? {
                addressLine1,
                addressLine2: addressLine2 || undefined,
                city,
                state,
                postalCode,
                label: "Delivery",
              }
            : undefined,
      };

      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/create-guest-pending-order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify(body),
        },
      );

      const payload = await res.json().catch(() => ({}));

      if (res.status === 409 && payload?.error === "ACCOUNT_EXISTS") {
        toast({
          title: "You already have an account",
          description:
            "Please sign in to continue checkout with your existing account.",
          variant: "destructive",
        });
        navigate(`/auth?redirect_url=${encodeURIComponent("/checkout")}`);
        return;
      }

      if (res.status === 429) {
        toast({
          title: "Too many attempts",
          description:
            "Please wait a bit before trying checkout again.",
          variant: "destructive",
        });
        return;
      }

      if (!res.ok) {
        throw new Error(payload?.error || payload?.details || "Checkout failed");
      }

      toast({
        title: "Order received",
        description:
          "We'll email you shortly with next steps. Keep an eye on your inbox.",
      });
      const trackingToken = payload.guestTrackingToken;
      if (trackingToken) {
        navigate(
          `/guest-track/${payload.orderId}?token=${encodeURIComponent(trackingToken)}`,
        );
      } else {
        navigate(`/order-pending/${payload.orderId}`);
      }
    } catch (err) {
      console.error("Guest checkout error:", err);
      const message = err instanceof Error ? err.message : "Please try again.";
      toast({
        title: "Checkout failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-food-red" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-food-orange/5 to-food-red/5">
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-6">
          <Link
            to="/products"
            className="inline-flex items-center text-sm text-gray-600 hover:text-food-red transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Continue shopping
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-food-brown mb-2">
            Guest Checkout
          </h1>
          <p className="text-gray-600">
            Already have an account?{" "}
            <Link
              to={`/auth?redirect_url=${encodeURIComponent("/checkout")}`}
              className="text-food-red font-medium hover:underline"
            >
              Sign in
            </Link>{" "}
            for saved addresses and faster checkout.
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="guest-name">Full name</Label>
                <Input
                  id="guest-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  autoComplete="name"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="guest-email">Email</Label>
                  <Input
                    id="guest-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Order confirmations and tracking go here.
                  </p>
                </div>
                <div>
                  <Label htmlFor="guest-phone">Phone</Label>
                  <Input
                    id="guest-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    autoComplete="tel"
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How would you like to get your order?</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs
                value={fulfillmentType}
                onValueChange={(value) =>
                  setFulfillmentType(value as Fulfillment)
                }
              >
                <TabsList className="grid grid-cols-2 mb-6">
                  <TabsTrigger value="delivery">
                    <MapPin className="w-4 h-4 mr-2" />
                    Delivery
                  </TabsTrigger>
                  <TabsTrigger value="pickup">
                    <Package className="w-4 h-4 mr-2" />
                    Pickup
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="delivery" className="space-y-6 mt-0">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="address-line1">Street address</Label>
                      <Input
                        id="address-line1"
                        ref={addressInputRef}
                        value={addressLine1}
                        onChange={(e) => setAddressLine1(e.target.value)}
                        placeholder="Start typing your address..."
                        autoComplete="street-address"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="address-line2">Apt / suite (optional)</Label>
                      <Input
                        id="address-line2"
                        value={addressLine2}
                        onChange={(e) => setAddressLine2(e.target.value)}
                        placeholder="Apt 4B"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="state">State</Label>
                        <Input
                          id="state"
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          placeholder="TX"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="postal">ZIP</Label>
                        <Input
                          id="postal"
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value)}
                          autoComplete="postal-code"
                          required
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      We'll confirm your address is within our delivery area when
                      you place the order.
                    </p>
                  </div>

                  <div>
                    <DeliveryTimeSelector
                      required
                      onValidationChange={setDeliveryTimeValid}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="pickup" className="mt-0">
                  <PickupTimeSelector
                    required
                    onValidationChange={setPickupTimeValid}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <CreditCard className="w-5 h-5 mr-2 text-food-red" />
                Payment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg border bg-gradient-to-br from-food-orange/5 to-food-red/5">
                <p className="font-medium text-gray-900">Credit or debit card</p>
                <p className="text-sm text-gray-600 mt-1">
                  Secure payment via Stripe. You'll enter card details after our
                  team reviews your order. No charge until you confirm.
                </p>
                <p className="text-xs text-gray-500 mt-3">
                  Guest checkout is card-only. Sign in to use cash on pickup.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.product_id}
                  className="flex justify-between items-start text-sm"
                >
                  <div className="flex-1 pr-4">
                    <p className="font-medium text-gray-900">
                      {item.product?.name || "Item"}
                    </p>
                    <p className="text-gray-500">
                      {item.product?.is_weighted && item.weight
                        ? `${item.weight} ${item.product?.unit_of_measure || "lb"}`
                        : `Qty ${item.quantity}`}
                    </p>
                  </div>
                  <p className="text-gray-900 whitespace-nowrap">
                    ${(
                      (item.product?.is_weighted && item.weight
                        ? item.weight * (item.product?.price_per_unit || 0)
                        : item.quantity * (item.product?.price_per_unit || 0)) *
                      (1 - (item.discount_percentage || 0) / 100)
                    ).toFixed(2)}
                  </p>
                </div>
              ))}
              {comboItems.length > 0 && (
                <p className="text-sm text-gray-500">
                  Plus {comboItems.length} combo
                  {comboItems.length > 1 ? "s" : ""}
                </p>
              )}
              <div className="pt-3 border-t flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-500">
                Taxes and delivery fees are calculated and shown for confirmation
                after our team reviews your order.
              </p>
            </CardContent>
          </Card>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!readyToSubmit || isSubmitting}
            className="w-full h-12 text-base bg-gradient-to-r from-food-red to-food-orange hover:from-food-red/90 hover:to-food-orange/90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Placing order...
              </>
            ) : (
              "Submit order for review"
            )}
          </Button>
          <p className="text-center text-xs text-gray-500">
            By placing this order you agree to our{" "}
            <Link to="/terms" className="underline">
              terms
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="underline">
              privacy policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
};

export default GuestCheckoutPage;
