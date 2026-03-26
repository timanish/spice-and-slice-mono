import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCartStore } from '@/stores/cart';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useUser as useClerkUser, useAuth } from '@clerk/clerk-react';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserData } from '@/hooks/useUserData';
import { useTaxCalculation } from '@/hooks/useTaxCalculation';
import { usePostHogTracking } from '@/hooks/usePostHogTracking';
import {
  ShoppingBag,
  Tag,
  CreditCard,
  DollarSign,
  ArrowRight,
  Sparkles,
  Package,
  Minus,
  Plus,
  Trash2,
  MapPin,
  Edit,
  X,
  Check,
  Clock,
  Truck,
  Globe,
  AlertTriangle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import Navigation from '@/components/Navigation';
import CartItemControls from '@/components/product/CartItemControls';
import DeliveryTimeSelector from '@/components/DeliveryTimeSelector';
import PickupTimeSelector from '@/components/PickupTimeSelector';
import DeliveryFeeBanner from '@/components/checkout/DeliveryFeeBanner';
import { FulfillmentTypeSelector } from '@/components/checkout/FulfillmentTypeSelector';
import { PickupInfo } from '@/components/checkout/PickupInfo';
import { useDeliveryFee } from '@/hooks/useDeliveryFee';
import { usePickupSettings } from '@/hooks/usePickupSettings';
import { calculatePickupReadyTime } from '@/utils/pickupUtils';
import { validateMinimumOrders, formatMinimumOrderErrors, validateShippingEligibility } from '@/utils/cartValidation';
import { format as formatDate } from 'date-fns';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { user } = useClerkUser();
  const { getToken } = useAuth();
  const { items, comboItems, removeFromCart, updateQuantity, fetchCart } = useCartStore();
  const { toast } = useToast();
  const { trackCheckoutStarted, trackEvent } = usePostHogTracking();
  const { listAddresses } = useUserData();
  const [fulfillmentType, setFulfillmentType] = useState<'delivery' | 'pickup' | 'nationwide'>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card');
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoId, setPromoId] = useState<string | null>(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isDeliveryTimeValid, setIsDeliveryTimeValid] = useState(false);
  const [isPickupTimeValid, setIsPickupTimeValid] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [userAddresses, setUserAddresses] = useState<any[]>([]);
  const hasShownDeliveryToast = useRef(false);
  const [showDeliveryError, setShowDeliveryError] = useState(false);
  const [showPickupError, setShowPickupError] = useState(false);
  const [showOrderReview, setShowOrderReview] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    distance_from_store?: number;
  } | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Auto-switch to card payment if delivery/nationwide is selected and cash was chosen
  useEffect(() => {
    if ((fulfillmentType === 'delivery' || fulfillmentType === 'nationwide') && paymentMethod === 'cash') {
      setPaymentMethod('card');
    }
  }, [fulfillmentType, paymentMethod]);

  const getPickupDateTime = () => {
    const pickupDate = localStorage.getItem('selectedPickupDate');
    const pickupTime = localStorage.getItem('selectedPickupTime');
   
     let formattedPickupDate = null;
     if (pickupDate) {
       try {
         const date = new Date(pickupDate);
         formattedPickupDate = formatDate(date, 'yyyy-MM-dd');
       } catch (e) {
         console.error('Error parsing pickup date:', e);
       }
     }
   
     return { 
       pickupDate: formattedPickupDate, 
       pickupTime: pickupTime 
     };
  };

  useEffect(() => {
    const fetchAddresses = async () => {
      if (!user) return;

      setIsLoadingProfile(true);
      try {
        const result = await listAddresses();
        const data = result.data || [];

        setUserAddresses(data);
        const defaultAddr = data.find((addr: any) => addr.is_default);
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
          setUserProfile(defaultAddr);
        } else if (data.length > 0) {
          setSelectedAddressId(data[0].id);
          setUserProfile(data[0]);
        }
      } catch (error) {
        console.error('Error fetching addresses:', error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchAddresses();
  }, [user, listAddresses]);

  const itemsSubtotal = items.reduce((sum, item) => {
    const basePrice = item.product.is_weighted && item.weight
      ? item.weight * item.product.price_per_unit
      : item.quantity * item.product.price_per_unit;

    const discount = item.discount_percentage || 0;
    const finalPrice = basePrice * (1 - discount / 100);

    return sum + finalPrice;
  }, 0);

  const comboSubtotal = comboItems.reduce((sum, item) => {
    const addonTotal = item.combo.items
      .filter((ci) => ci.is_addon && item.selected_addon_ids.includes(ci.id))
      .reduce((s, ci) => s + (ci.addon_price || 0), 0);
    return sum + (item.combo.combo_price + addonTotal) * item.quantity;
  }, 0);

  const subtotal = itemsSubtotal + comboSubtotal;

  const { calculateCartTax, calculateItemTax, categoryTaxRates, isLoading: isTaxLoading } = useTaxCalculation();
  
  const cartItemsForTax = items.map(item => {
    const basePrice = item.product.is_weighted && item.weight
      ? item.weight * item.product.price_per_unit
      : item.quantity * item.product.price_per_unit;
    
    const discount = item.discount_percentage || 0;
    const priceAfterDiscount = basePrice * (1 - discount / 100);
    
    return {
      price: priceAfterDiscount / (item.product.is_weighted && item.weight ? item.weight : item.quantity),
      quantity: item.product.is_weighted && item.weight ? item.weight : item.quantity,
      tax_rate: item.product.tax_rate || null,
      category: typeof item.product.category === 'object' ? (item.product.category as any)?.name || null : item.product.category || null,
    };
  });

  const { totalTax, taxableSubtotal } = calculateCartTax(cartItemsForTax);

  const orderTotalBeforeDelivery = subtotal + totalTax;
  const deliveryFeeData = useDeliveryFee(orderTotalBeforeDelivery, userProfile?.distance_from_store || null);
  const deliveryFee = (fulfillmentType === 'pickup' || fulfillmentType === 'nationwide') ? 0 : deliveryFeeData.deliveryFee;

  // Nationwide shipping eligibility
  const nationwideItems = items.filter(item => item.product.shippable_nationwide);
  const localOnlyItems = items.filter(item => !item.product.shippable_nationwide);
  const hasNationwideItems = nationwideItems.length > 0;
  const isOutsideDeliveryRange = !deliveryFeeData.isWithinDeliveryRange && (userProfile?.distance_from_store ?? 0) > 0;
  const isNationwideAvailable = isOutsideDeliveryRange && hasNationwideItems;
  const shippingValidation = validateShippingEligibility(items, fulfillmentType);
  const NATIONWIDE_MIN_DAYS_ADVANCE = 3;

  const { settings: pickupSettings, isPickupAvailable, validation: pickupValidation, isLoading: isPickupLoading } = usePickupSettings();
  const pickupReadyAt = pickupSettings ? calculatePickupReadyTime(pickupSettings.preparation_time_minutes) : null;

  useEffect(() => {
    // Auto-switch fulfillment type when outside delivery range
    if (!hasShownDeliveryToast.current &&
        !isLoadingProfile &&
        !isPickupLoading &&
        !deliveryFeeData.isLoading &&
        userProfile?.distance_from_store !== undefined &&
        userProfile?.distance_from_store !== null &&
        userProfile?.distance_from_store > 0 &&
        !deliveryFeeData.isWithinDeliveryRange &&
        fulfillmentType === 'delivery') {

      hasShownDeliveryToast.current = true;

      if (hasNationwideItems) {
        // Cart has nationwide-shippable items — switch to nationwide
        setFulfillmentType('nationwide');
        trackEvent('fulfillment_type_selected', {
          type: 'nationwide',
          previous_type: 'delivery',
          reason: 'outside_delivery_range_nationwide_available',
        });
        toast({
          title: "Nationwide shipping available",
          description: localOnlyItems.length > 0
            ? `Switched to nationwide shipping. ${localOnlyItems.length} local-only item(s) will need to be removed to proceed.`
            : "Your eligible items can be shipped nationwide!",
          variant: "default",
        });
      } else if (isPickupAvailable) {
        setFulfillmentType('pickup');
        trackEvent('fulfillment_type_selected', {
          type: 'pickup',
          previous_type: 'delivery',
        });
        toast({
          title: "Delivery unavailable",
          description: "Your location is outside our delivery range. Switched to pickup.",
          variant: "default",
        });
      } else {
        toast({
          title: "No fulfillment options available",
          description: "Neither delivery nor pickup is available. Please update your address or contact support.",
          variant: "destructive",
        });
      }
    }
  }, [isLoadingProfile, isPickupLoading, deliveryFeeData.isLoading, deliveryFeeData.isWithinDeliveryRange, userProfile?.distance_from_store, fulfillmentType, isPickupAvailable, toast]);

  const total = Math.max(subtotal - promoDiscount + totalTax + deliveryFee, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handleApplyPromoCode = async () => {
    if (!promoCode.trim()) {
      setPromoError('Please enter a promo code');
      return;
    }

    if (promoDiscount > 0 || promoId) {
      setPromoError('A promo code is already applied');
      return;
    }

    setIsApplyingPromo(true);
    setPromoError('');

    try {
      if (!user) {
        setPromoError('Please sign in to apply promo codes');
        setIsApplyingPromo(false);
        return;
      }

      const normalizedCode = promoCode.trim().toLowerCase();

      const { data, error } = await supabase.rpc('validate_promo_code', {
        _code: normalizedCode,
        _user_id: user.id,
        _order_amount: subtotal
      });

      if (error) throw error;

      if (data && data[0]) {
        const result = data[0];
        
        if (result.valid) {
          setPromoDiscount(result.discount);
          setPromoId(result.promo_id);
          setPromoError('');
          trackEvent('promo_code_applied', {
            code: promoCode,
            discount_amount: result.discount,
            success: true,
          });
        } else {
          setPromoError('Invalid or expired promo code');
          trackEvent('promo_code_failed', {
            code: promoCode,
            error_message: 'Invalid or expired promo code',
          });
        }
      } else {
        setPromoError('Invalid promo code');
        trackEvent('promo_code_failed', {
          code: promoCode,
          error_message: 'Invalid promo code',
        });
      }
    } catch (error) {
      console.error('Error applying promo code:', error);
      setPromoError('Failed to apply promo code');
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setPromoCode('');
    setPromoDiscount(0);
    setPromoId(null);
    setPromoError('');
  };

  const handleCheckout = async () => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be logged in to checkout",
        variant: "destructive",
      });
      return;
    }

    const validation = validateMinimumOrders(items);
    if (!validation.isValid) {
      toast({
        title: "Minimum order requirements not met",
        description: formatMinimumOrderErrors(validation),
        variant: "destructive",
        duration: 8000,
      });
      return;
    }

    if (fulfillmentType === 'delivery' || fulfillmentType === 'nationwide') {
      const deliveryDate = localStorage.getItem('selectedDeliveryDate');
      const deliveryTime = localStorage.getItem('selectedDeliveryTime');

      if (!deliveryDate || !deliveryTime) {
        setShowDeliveryError(true);
        toast({
          title: fulfillmentType === 'nationwide' ? "Shipping date required" : "Delivery time required",
          description: "Please select a delivery date and time to continue",
          variant: "destructive",
        });
        document.getElementById('delivery-time-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }

    if (fulfillmentType === 'nationwide' && !shippingValidation.isValid) {
      toast({
        title: "Some items can't ship nationwide",
        description: `Remove local-only items to proceed: ${shippingValidation.localOnlyItems.join(', ')}`,
        variant: "destructive",
        duration: 8000,
      });
      return;
    }

    if (fulfillmentType === 'pickup') {
      const { pickupDate, pickupTime } = getPickupDateTime();

      if (!pickupDate || !pickupTime) {
        setShowPickupError(true);
        toast({
          title: "Pickup time required",
          description: "Please select a pickup date and time to continue",
          variant: "destructive",
        });
        document.getElementById('pickup-time-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }

    setShowDeliveryError(false);
    setShowPickupError(false);
    setIsCheckingOut(true);

    trackCheckoutStarted(subtotal, items.length, fulfillmentType);

    try {
      const enrichedCartItems = items.map((item) => {
        const basePrice = item.product.is_weighted && item.weight
          ? item.weight * item.product.price_per_unit
          : item.quantity * item.product.price_per_unit;
        
        const discount = item.discount_percentage || 0;
        const priceAfterDiscount = basePrice * (1 - discount / 100);
        
        const pricePerUnit = item.product.is_weighted && item.weight
          ? (priceAfterDiscount / item.weight)
          : (priceAfterDiscount / item.quantity);
        const itemQuantity = item.product.is_weighted && item.weight ? item.weight : item.quantity;
        const itemTaxResult = calculateItemTax(
          pricePerUnit,
          itemQuantity,
          item.product.tax_rate || null,
          typeof item.product.category === 'object' ? (item.product.category as any)?.name || null : item.product.category || null
        );
        
        return {
          ...item,
          tax_amount: itemTaxResult.itemTaxAmount,
        };
      });

      if (paymentMethod === 'cash') {
        const deliveryDate = (fulfillmentType === 'delivery' || fulfillmentType === 'nationwide') ? localStorage.getItem('selectedDeliveryDate') : null;
        const deliveryTime = (fulfillmentType === 'delivery' || fulfillmentType === 'nationwide') ? localStorage.getItem('selectedDeliveryTime') : null;
        const { pickupDate, pickupTime } = getPickupDateTime();

        const requestBody = {
          userId: user.id,
          cartItems: enrichedCartItems,
          comboCartItems: comboItems,
          promoCodeId: promoId,
          promoDiscount: promoDiscount,
          fulfillmentType: fulfillmentType,
          addressId: (fulfillmentType === 'delivery' || fulfillmentType === 'nationwide') ? selectedAddressId : null,
          deliveryDate: deliveryDate,
          deliveryTime: deliveryTime,
          pickupDate: fulfillmentType === 'pickup' ? pickupDate : null,
          pickupTime: fulfillmentType === 'pickup' ? pickupTime : null,
          deliveryFee: deliveryFee,
          deliveryDistance: fulfillmentType === 'delivery' ? (userProfile?.distance_from_store || null) : null,
          deliveryZone: fulfillmentType === 'delivery' ? (deliveryFeeData.zone?.zone_name || null) : null,
          taxAmount: totalTax,
          taxableAmount: taxableSubtotal,
        };

        const token = await getToken();
        if (!token) {
          throw new Error('Authentication token not available');
        }

        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/create-cash-order`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          console.error("COD order error:", error);
          throw new Error('Failed to create order');
        }

        const cashOrderResult = await response.json();

        toast({
          title: "Order placed successfully!",
          description: "Your order has been placed with cash on delivery option.",
        });
        
        trackEvent('checkout_completed', {
          order_id: cashOrderResult?.orderId || 'unknown',
          total_amount: subtotal + totalTax + deliveryFee - promoDiscount,
          payment_method: 'cash',
          fulfillment_type: fulfillmentType,
          items_count: items.length,
          had_promo_code: !!promoId,
          discount_amount: promoDiscount,
          delivery_fee: deliveryFee,
          tax_amount: totalTax,
        });

        navigate("/order-success");
        // Don't fetch cart here - OrderSuccessPage will force refresh it
      } else {
        // Credit card payment flow - use Stripe checkout
        const deliveryDate = (fulfillmentType === 'delivery' || fulfillmentType === 'nationwide') ? localStorage.getItem('selectedDeliveryDate') : null;
        const deliveryTime = (fulfillmentType === 'delivery' || fulfillmentType === 'nationwide') ? localStorage.getItem('selectedDeliveryTime') : null;
        const { pickupDate, pickupTime } = getPickupDateTime();

         console.log('CheckoutPage - Card payment:', {
           fulfillmentType,
           pickupDate,
           pickupTime,
           deliveryDate,
           deliveryTime,
         });

        const successUrl = `${window.location.origin}/order-success`;
        const cancelUrl = `${window.location.origin}/checkout`;

        const requestBody = {
          cartItems: enrichedCartItems,
          comboCartItems: comboItems,
          successUrl,
          cancelUrl,
          promoCodeId: promoId,
          promoDiscount: promoDiscount,
          fulfillmentType: fulfillmentType,
          addressId: (fulfillmentType === 'delivery' || fulfillmentType === 'nationwide') ? selectedAddressId : null,
          deliveryDate: deliveryDate,
          deliveryTime: deliveryTime,
          pickupDate: fulfillmentType === 'pickup' ? pickupDate : null,
          pickupTime: fulfillmentType === 'pickup' ? pickupTime : null,
          deliveryFee: deliveryFee,
          deliveryDistance: fulfillmentType === 'delivery' ? (userProfile?.distance_from_store || null) : null,
          deliveryZone: fulfillmentType === 'delivery' ? (deliveryFeeData.zone?.zone_name || null) : null,
          taxAmount: totalTax,
          taxableAmount: taxableSubtotal,
        };

        const token = await getToken();
        if (!token) {
          throw new Error('Authentication token not available');
        }

        const response = await fetch(
          `${(supabase as any).supabaseUrl}/functions/v1/create-checkout`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          console.error("Stripe checkout error:", error);
          throw new Error('Failed to create checkout');
        }

        const checkoutData = await response.json();

        if (checkoutData?.url) {
          window.location.href = checkoutData.url;
        } else {
          throw new Error("No checkout URL returned");
        }
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: "Checkout failed",
        description: "Something went wrong. Please try again or contact support if the issue persists.",
        variant: "destructive",
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handlePreCheckout = () => {
    // Run the same validations as handleCheckout, but show dialog instead of proceeding
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be logged in to checkout",
        variant: "destructive",
      });
      return;
    }

    const validation = validateMinimumOrders(items);
    if (!validation.isValid) {
      toast({
        title: "Minimum order requirements not met",
        description: formatMinimumOrderErrors(validation),
        variant: "destructive",
        duration: 8000,
      });
      return;
    }

    if (fulfillmentType === 'delivery' || fulfillmentType === 'nationwide') {
      const deliveryDate = localStorage.getItem('selectedDeliveryDate');
      const deliveryTime = localStorage.getItem('selectedDeliveryTime');
      if (!deliveryDate || !deliveryTime) {
        setShowDeliveryError(true);
        toast({
          title: fulfillmentType === 'nationwide' ? "Shipping date required" : "Delivery time required",
          description: "Please select a delivery date and time to continue",
          variant: "destructive",
        });
        document.getElementById('delivery-time-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }

    if (fulfillmentType === 'nationwide' && !shippingValidation.isValid) {
      toast({
        title: "Some items can't ship nationwide",
        description: `Remove local-only items to proceed: ${shippingValidation.localOnlyItems.join(', ')}`,
        variant: "destructive",
        duration: 8000,
      });
      return;
    }

    if (fulfillmentType === 'pickup') {
      const { pickupDate, pickupTime } = getPickupDateTime();
      if (!pickupDate || !pickupTime) {
        setShowPickupError(true);
        toast({
          title: "Pickup time required",
          description: "Please select a pickup date and time to continue",
          variant: "destructive",
        });
        document.getElementById('pickup-time-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }

    setShowOrderReview(true);
  };

  const handleIncrement = async (productId: string, currentQuantity: number) => {
    await updateQuantity(productId, currentQuantity + 1);
  };

  const handleDecrement = async (productId: string, currentQuantity: number) => {
    // Find the item to check minimum requirements
    const item = items.find(i => i.product_id === productId);
    const minOrderValue = item?.product.min_order_value;
    const minOrderUnit = item?.product.min_order_unit;
    const minimumQuantity = (minOrderValue && minOrderUnit === 'pieces') ? minOrderValue : 1;

    if (currentQuantity <= minimumQuantity) {
      await removeFromCart(productId);
    } else {
      await updateQuantity(productId, currentQuantity - 1);
    }
  };

  if (items.length === 0 && comboItems.length === 0) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-16 pb-24">
          <div className="container mx-auto px-4 max-w-2xl text-center">
            <ShoppingBag className="h-24 w-24 mx-auto mb-6 text-gray-300" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Your Cart is Empty</h1>
            <p className="text-gray-600 mb-8">
              Looks like you haven't added any items to your cart yet.
            </p>
            <Button asChild size="lg">
              <Link to="/products">Start Shopping</Link>
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-2 pb-44 md:pb-32 lg:pb-20">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Checkout Steps Indicator */}
          {(() => {
            const isTimeSelected = (fulfillmentType === 'delivery' || fulfillmentType === 'nationwide')
              ? !!(localStorage.getItem('selectedDeliveryDate') && localStorage.getItem('selectedDeliveryTime'))
              : !!(localStorage.getItem('selectedPickupDate') && localStorage.getItem('selectedPickupTime'));

            const stepLabel = fulfillmentType === 'nationwide' ? 'Shipping' : fulfillmentType === 'delivery' ? 'Delivery' : 'Pickup';
            const stepIcon = fulfillmentType === 'nationwide' ? Globe : fulfillmentType === 'delivery' ? MapPin : Clock;

            const steps = [
              { label: 'Items', icon: Package, done: items.length > 0 },
              { label: stepLabel, icon: stepIcon, done: isTimeSelected },
              { label: 'Payment', icon: CreditCard, done: false },
            ];

            // Current step is the first incomplete one
            const currentStepIndex = steps.findIndex(s => !s.done);

            return (
              <div className="mb-6">
                <div className="flex items-center justify-between max-w-md mx-auto">
                  {steps.map((step, index) => {
                    const Icon = step.icon;
                    const isCompleted = step.done;
                    const isCurrent = index === (currentStepIndex === -1 ? steps.length - 1 : currentStepIndex);

                    return (
                      <React.Fragment key={step.label}>
                        {index > 0 && (
                          <div className={`flex-1 h-0.5 mx-1 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} />
                        )}
                        <div className="flex flex-col items-center gap-1">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                            isCompleted
                              ? 'bg-green-500 text-white'
                              : isCurrent
                                ? 'bg-food-red text-white ring-2 ring-food-red/20'
                                : 'bg-gray-100 text-gray-400'
                          }`}>
                            {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                          </div>
                          <span className={`text-xs font-medium ${
                            isCurrent ? 'text-food-red' : isCompleted ? 'text-green-600' : 'text-gray-400'
                          }`}>
                            {step.label}
                          </span>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Delivery Fee Banner - for delivery, nationwide, or if out of range */}
          {(fulfillmentType === 'delivery' || fulfillmentType === 'nationwide' || (!deliveryFeeData.isWithinDeliveryRange && deliveryFeeData.distance !== null && deliveryFeeData.distance > 30)) && (
            <DeliveryFeeBanner
              isFreeShipping={fulfillmentType === 'nationwide' ? true : deliveryFeeData.isFreeShipping}
              amountNeededForFreeShipping={deliveryFeeData.amountNeededForFreeShipping}
              deliveryFee={fulfillmentType === 'nationwide' ? 0 : deliveryFeeData.deliveryFee}
              distance={deliveryFeeData.distance}
              zoneName={deliveryFeeData.zone?.zone_name || null}
              isWithinDeliveryRange={deliveryFeeData.isWithinDeliveryRange}
              freeShippingThreshold={deliveryFeeData.freeShippingThreshold}
              cartTotal={orderTotalBeforeDelivery}
              deliveryAddress={userProfile ? {
                line1: userProfile.address_line1,
                line2: userProfile.address_line2,
                city: userProfile.city,
                state: userProfile.state,
                postalCode: userProfile.postal_code,
              } : null}
              hasNationwideItems={hasNationwideItems}
              nationwideItemCount={nationwideItems.length}
              localOnlyItemNames={localOnlyItems.map(i => i.product.name)}
            />
          )}

          {/* Fulfillment Type Selector */}
          <FulfillmentTypeSelector
            selectedType={fulfillmentType}
            onTypeChange={setFulfillmentType}
            isPickupAvailable={isPickupAvailable}
            pickupUnavailableMessage={pickupValidation?.message}
            isDeliveryAvailable={deliveryFeeData.isWithinDeliveryRange}
            deliveryUnavailableMessage={
              userProfile?.distance_from_store && userProfile.distance_from_store >= 30
                ? `Delivery is not available for your location (${userProfile.distance_from_store.toFixed(1)} miles from store). Maximum delivery distance is 30 miles.`
                : 'Delivery is not available for your location.'
            }
            isNationwideAvailable={isNationwideAvailable}
          />

          <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Left Column - Cart Items */}
            <div className="lg:col-span-2 space-y-4 md:space-y-6">
              <Card className="shadow-lg border-2">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center gap-2 mb-4 md:mb-6">
                    <Package className="h-4 w-4 md:h-5 md:w-5 text-food-red" />
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900">Order Items</h2>
                    <Badge variant="secondary" className="ml-auto">
                      {items.length + comboItems.length} {items.length + comboItems.length === 1 ? 'item' : 'items'}
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    {items.map((item) => {
                    const hasDiscount = item.discount_percentage != null && item.discount_percentage > 0;
                    const basePrice = item.product.is_weighted && item.weight
                      ? item.weight * item.product.price_per_unit
                      : item.quantity * item.product.price_per_unit;
                    const finalPrice = hasDiscount
                      ? basePrice * (1 - (item.discount_percentage || 0) / 100)
                      : basePrice;
                    
                    // Calculate per-item tax
                    const pricePerUnit = item.product.is_weighted && item.weight
                      ? (finalPrice / item.weight)
                      : (finalPrice / item.quantity);
                    const itemQuantity = item.product.is_weighted && item.weight ? item.weight : item.quantity;
                    const itemTaxResult = calculateItemTax(
                      pricePerUnit,
                      itemQuantity,
                      item.product.tax_rate || null,
                      typeof item.product.category === 'object' ? (item.product.category as any)?.name || null : item.product.category || null
                    );
                    
                    return (
                      <div 
                        key={item.id} 
                        className="flex flex-col sm:flex-row gap-3 md:gap-4 p-3 md:p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="relative flex-shrink-0 self-start">
                          <img
                            src={item.product.image_url || '/placeholder.svg'}
                            alt={item.product.name}
                            className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg shadow-md"
                          />
                          {hasDiscount && (
                            <Badge className="absolute -top-2 -right-2 bg-red-500 text-white shadow-lg">
                              {item.discount_percentage}% OFF
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900 text-sm md:text-base line-clamp-2 flex-1">
                              {item.product.name}
                            </h3>
                            <div className="text-right sm:hidden flex-shrink-0">
                              {hasDiscount && (
                                <p className="text-xs text-gray-400 line-through">
                                  {formatCurrency(basePrice)}
                                </p>
                              )}
                              <p className="text-base font-bold text-food-red">
                                {formatCurrency(finalPrice)}
                              </p>
                              {itemTaxResult.hasValidTaxRate && (
                                <p className="text-xs text-amber-600 font-medium mt-0.5">
                                  + Tax: {itemTaxResult.displayTax}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-xs md:text-sm text-gray-600 mb-2">
                            {hasDiscount ? (
                              <div className="flex items-center gap-2">
                                <span className="line-through text-gray-400">
                                  {formatCurrency(item.product.price_per_unit)}
                                </span>
                                <span className="font-semibold text-red-600">
                                  {formatCurrency(item.product.price_per_unit * (1 - (item.discount_percentage || 0) / 100))}
                                </span>
                              </div>
                            ) : (
                              <span>{formatCurrency(item.product.price_per_unit)}</span>
                            )}
                            {item.product.unit_of_measure && ` / ${item.product.unit_of_measure}`}
                          </div>
                          
                          <div className="flex items-center gap-2 md:gap-3">
                            {item.product.is_weighted ? (
                              <CartItemControls
                                productId={item.product_id}
                                quantity={item.quantity}
                                weight={item.weight}
                                isWeighted={item.product.is_weighted}
                                unitOfMeasure={item.product.unit_of_measure}
                                pricePerUnit={item.product.price_per_unit}
                                showRemove={true}
                                compact={true}
                                minOrderValue={item.product.min_order_value}
                                minOrderUnit={item.product.min_order_unit}
                              />
                            ) : (
                              <>
                                <div className="flex items-center gap-1 md:gap-2 bg-white rounded-lg border border-gray-200 p-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDecrement(item.product_id, item.quantity)}
                                    className="h-8 w-8 md:h-7 md:w-7 p-0 touch-manipulation"
                                  >
                                    <Minus className="h-3 w-3 md:h-3 md:w-3" />
                                  </Button>
                                  <span className="text-sm font-semibold min-w-[2rem] text-center">
                                    {item.quantity}
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleIncrement(item.product_id, item.quantity)}
                                    className="h-8 w-8 md:h-7 md:w-7 p-0 touch-manipulation"
                                  >
                                    <Plus className="h-3 w-3 md:h-3 md:w-3" />
                                  </Button>
                                </div>
                                
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeFromCart(item.product_id)}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 md:h-auto md:w-auto p-2 touch-manipulation"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="hidden sm:block text-right flex-shrink-0">
                          {hasDiscount && (
                            <p className="text-sm text-gray-400 line-through mb-1">
                              {formatCurrency(basePrice)}
                            </p>
                          )}
                          <p className="text-lg font-bold text-food-red">
                            {formatCurrency(finalPrice)}
                          </p>
                          {itemTaxResult.hasValidTaxRate && (
                            <p className="text-xs text-amber-600 font-medium mt-1">
                              + Tax: {itemTaxResult.displayTax}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}

                    {/* Combo Items */}
                    {comboItems.map((comboItem) => {
                      const addonTotal = comboItem.combo.items
                        .filter((ci) => ci.is_addon && comboItem.selected_addon_ids.includes(ci.id))
                        .reduce((s, ci) => s + (ci.addon_price || 0), 0);
                      const comboUnitPrice = comboItem.combo.combo_price + addonTotal;
                      const comboTotalPrice = comboUnitPrice * comboItem.quantity;

                      return (
                        <div
                          key={comboItem.id}
                          className="flex flex-col sm:flex-row gap-3 md:gap-4 p-3 md:p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                          <div className="relative flex-shrink-0 self-start">
                            {comboItem.combo.image_url ? (
                              <img
                                src={comboItem.combo.image_url}
                                alt={comboItem.combo.name}
                                className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg shadow-md"
                              />
                            ) : (
                              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg shadow-md bg-gradient-to-br from-food-orange/20 to-food-red/20 flex items-center justify-center">
                                <Package className="h-8 w-8 text-food-orange" />
                              </div>
                            )}
                            <Badge className="absolute -top-2 -right-2 bg-food-orange text-white shadow-lg text-[10px]">
                              Combo
                            </Badge>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2 mb-2">
                              <h3 className="font-semibold text-gray-900 text-sm md:text-base line-clamp-2 flex-1">
                                {comboItem.combo.name}
                              </h3>
                              <div className="text-right sm:hidden flex-shrink-0">
                                <p className="text-base font-bold text-food-red">
                                  {formatCurrency(comboTotalPrice)}
                                </p>
                              </div>
                            </div>

                            {/* Combo contents summary */}
                            <div className="text-xs text-gray-500 mb-2 space-y-0.5">
                              {comboItem.combo.items.filter(ci => !ci.is_addon).map(ci => (
                                <div key={ci.id} className="flex items-center gap-1">
                                  <Check className="h-3 w-3 text-green-600" />
                                  <span>{ci.product.name}</span>
                                </div>
                              ))}
                              {comboItem.combo.items
                                .filter(ci => ci.is_addon && comboItem.selected_addon_ids.includes(ci.id))
                                .map(ci => (
                                  <div key={ci.id} className="flex items-center gap-1">
                                    <Plus className="h-3 w-3 text-food-orange" />
                                    <span>{ci.product.name} (+{formatCurrency(ci.addon_price || 0)})</span>
                                  </div>
                                ))}
                            </div>

                            <div className="text-xs md:text-sm text-gray-600">
                              {formatCurrency(comboUnitPrice)} each &times; {comboItem.quantity}
                            </div>
                          </div>

                          <div className="hidden sm:block text-right flex-shrink-0">
                            <p className="text-lg font-bold text-food-red">
                              {formatCurrency(comboTotalPrice)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
            </div>

          {/* Right Column - Sticky Sidebar */}
            <div className="space-y-4 md:space-y-5">
              {/* Sticky container for desktop with max height and scroll */}
              <div className="lg:sticky lg:top-24 space-y-4 md:space-y-5 lg:max-h-[calc(100vh-15rem)] lg:overflow-y-auto lg:pr-2">
              
              {/* Conditional rendering based on fulfillment type */}
              {fulfillmentType === 'delivery' ? (
                <>
                  {/* Delivery Address Selector */}
                  <Card className="shadow-lg border-2">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 md:h-5 md:w-5 text-food-orange" />
                          <h3 className="text-base md:text-lg font-bold">Delivery Address</h3>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate('/profile')}
                          className="text-food-red hover:text-food-red"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Manage
                        </Button>
                      </div>

                      {isLoadingProfile ? (
                        <div className="animate-pulse space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      ) : userAddresses.length > 0 ? (
                        <div className="space-y-3">
                          {/* Address Selection Dropdown */}
                          <select
                            value={selectedAddressId || ''}
                            onChange={(e) => {
                              const addr = userAddresses.find(a => a.id === e.target.value);
                              setSelectedAddressId(e.target.value);
                              setUserProfile(addr || null);
                            }}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-food-orange focus:border-transparent"
                          >
                            {userAddresses.map(addr => (
                              <option key={addr.id} value={addr.id}>
                                {addr.label} - {addr.address_line1}
                              </option>
                            ))}
                          </select>

                          {/* Display Selected Address */}
                          {userProfile && (
                            <div className="space-y-1 text-sm bg-gray-50 p-3 rounded-lg">
                              <p className="font-semibold text-gray-900">{(userProfile as any).label || 'Address'}</p>
                              <p className="text-gray-700">{userProfile.address_line1}</p>
                              <p className="text-gray-600">
                                {userProfile.city}, {userProfile.state} {userProfile.postal_code}
                              </p>
                              {userProfile.distance_from_store && (
                                <p className="text-xs text-gray-500 mt-2">
                                  {userProfile.distance_from_store.toFixed(1)} miles from store
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <p className="text-sm text-yellow-800 mb-2">
                            No delivery address on file
                          </p>
                          <Button
                            size="sm"
                            onClick={() => navigate('/profile?action=add')}
                            className="bg-yellow-600 hover:bg-yellow-700 text-white"
                          >
                            Add Address
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Delivery Time Selection */}
                  <Card id="delivery-time-section" className={`shadow-lg border-2 ${showDeliveryError && !isDeliveryTimeValid ? 'border-red-500' : ''}`}>
                    <CardContent className="p-6">
                      <DeliveryTimeSelector
                        required={true}
                        onValidationChange={setIsDeliveryTimeValid}
                      />
                    </CardContent>
                  </Card>
                </>
              ) : fulfillmentType === 'nationwide' ? (
                <>
                  {/* Shipping Address */}
                  <Card className="shadow-lg border-2">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
                          <h3 className="text-base md:text-lg font-bold">Shipping Address</h3>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate('/profile')}
                          className="text-food-red hover:text-food-red"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Manage
                        </Button>
                      </div>

                      {isLoadingProfile ? (
                        <div className="animate-pulse space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      ) : userAddresses.length > 0 ? (
                        <div className="space-y-3">
                          <select
                            value={selectedAddressId || ''}
                            onChange={(e) => {
                              const addr = userAddresses.find(a => a.id === e.target.value);
                              setSelectedAddressId(e.target.value);
                              setUserProfile(addr || null);
                            }}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            {userAddresses.map(addr => (
                              <option key={addr.id} value={addr.id}>
                                {addr.label} - {addr.address_line1}
                              </option>
                            ))}
                          </select>
                          {userProfile && (
                            <div className="space-y-1 text-sm bg-blue-50 p-3 rounded-lg">
                              <p className="font-semibold text-gray-900">{(userProfile as any).label || 'Address'}</p>
                              <p className="text-gray-700">{userProfile.address_line1}</p>
                              <p className="text-gray-600">
                                {userProfile.city}, {userProfile.state} {userProfile.postal_code}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <p className="text-sm text-yellow-800 mb-2">
                            No shipping address on file
                          </p>
                          <Button
                            size="sm"
                            onClick={() => navigate('/profile?action=add')}
                            className="bg-yellow-600 hover:bg-yellow-700 text-white"
                          >
                            Add Address
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Local-only items warning */}
                  {!shippingValidation.isValid && shippingValidation.localOnlyItems.length > 0 && (
                    <Card className="shadow-lg border-2 border-amber-300">
                      <CardContent className="p-4 md:p-6">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-amber-900 mb-1">Some items can't ship nationwide</p>
                            <p className="text-sm text-amber-700 mb-2">
                              The following items are only available for local delivery or pickup:
                            </p>
                            <ul className="list-disc list-inside text-sm text-amber-800 space-y-1">
                              {shippingValidation.localOnlyItems.map((name) => (
                                <li key={name}>{name}</li>
                              ))}
                            </ul>
                            <p className="text-xs text-amber-600 mt-2">
                              Remove these items or switch to pickup to proceed.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Nationwide Delivery Date Selection */}
                  <Card id="delivery-time-section" className={`shadow-lg border-2 ${showDeliveryError && !isDeliveryTimeValid ? 'border-red-500' : ''}`}>
                    <CardContent className="p-6">
                      <DeliveryTimeSelector
                        required={true}
                        onValidationChange={setIsDeliveryTimeValid}
                        minDaysAdvance={NATIONWIDE_MIN_DAYS_ADVANCE}
                      />
                    </CardContent>
                  </Card>
                </>
              ) : (
                /* Pickup Time Selection */
                <>
                  <Card id="pickup-time-section" className={`shadow-lg border-2 ${showPickupError && !isPickupTimeValid ? 'border-red-500' : ''}`}>
                    <CardContent className="p-6">
                      <PickupTimeSelector
                        required={true}
                        onValidationChange={setIsPickupTimeValid}
                      />
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Payment Method - Show for both delivery and pickup */}
              <Card className="shadow-lg border-2">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="h-5 w-5 text-food-red" />
                    <h3 className="text-lg font-bold">Payment Method</h3>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => setPaymentMethod('card')}
                      className={`w-full p-4 rounded-lg border-2 transition-all ${
                        paymentMethod === 'card'
                          ? 'border-food-red bg-food-red/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          paymentMethod === 'card' ? 'border-food-red' : 'border-gray-300'
                        }`}>
                          {paymentMethod === 'card' && (
                            <div className="w-3 h-3 rounded-full bg-food-red" />
                          )}
                        </div>
                        <CreditCard className="h-5 w-5" />
                        <span className="font-semibold">Credit/Debit Card</span>
                      </div>
                    </button>

                    {/* Only show cash option for pickup */}
                    {fulfillmentType === 'pickup' && (
                      <button
                        onClick={() => setPaymentMethod('cash')}
                        className={`w-full p-4 rounded-lg border-2 transition-all ${
                          paymentMethod === 'cash'
                            ? 'border-food-red bg-food-red/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            paymentMethod === 'cash' ? 'border-food-red' : 'border-gray-300'
                          }`}>
                            {paymentMethod === 'cash' && (
                              <div className="w-3 h-3 rounded-full bg-food-red" />
                            )}
                          </div>
                          <DollarSign className="h-5 w-5" />
                          <span className="font-semibold">Cash on Pickup</span>
                        </div>
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Bottom Bar - Minimal Modern Design */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 z-50">
          <div className="container mx-auto px-6 py-3">
            <div className="max-w-7xl mx-auto">
              {/* Desktop Layout */}
              <div className="hidden md:flex items-center justify-between gap-6">
                {/* Total Price with Breakdown - Left */}
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <span>Subtotal: {formatCurrency(subtotal)}</span>
                    {promoDiscount > 0 && (
                      <span className="text-green-600">Promo: -{formatCurrency(promoDiscount)}</span>
                    )}
                    {totalTax > 0 && (
                      <span>Tax: {formatCurrency(totalTax)}</span>
                    )}
                    {deliveryFee > 0 && (
                      <span>Delivery: {formatCurrency(deliveryFee)}</span>
                    )}
                  </div>
                  <div className="border-l border-gray-200 pl-6">
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="text-2xl font-bold text-food-red tracking-tight">
                      {formatCurrency(total)}
                    </p>
                  </div>
                </div>

                {/* Promo Code and Pay Button - Right */}
                <div className="flex items-center gap-4">
                  {/* Promo Code Section */}
                  <div className="w-80">
                    {promoDiscount > 0 ? (
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-gray-500">Promo code:</span>
                        <span className="font-semibold text-gray-900">{promoCode}</span>
                        <span className="text-green-600 font-medium">-{formatCurrency(promoDiscount)}</span>
                        <button
                          onClick={handleRemovePromo}
                          className="ml-auto text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={promoCode}
                          onChange={(e) => {
                            setPromoCode(e.target.value.toUpperCase());
                            setPromoError('');
                          }}
                          placeholder="Add promo code"
                          className="flex-1 px-3 py-2 text-sm bg-transparent border border-gray-200 rounded-lg placeholder:text-gray-400 focus:border-food-red focus:outline-none transition-colors"
                        />
                        <button
                          onClick={handleApplyPromoCode}
                          disabled={isApplyingPromo}
                          className="px-3 py-2 text-sm font-medium text-food-red hover:text-food-red/80 disabled:opacity-50 transition-colors"
                        >
                          {isApplyingPromo ? '...' : 'Apply'}
                        </button>
                      </div>
                    )}
                    {promoError && (
                      <p className="text-xs text-red-600 mt-2">{promoError}</p>
                    )}
                  </div>

                  {/* Pay Button */}
                  <Button
                    onClick={handlePreCheckout}
                    disabled={isCheckingOut}
                    className="h-10 px-8 text-sm font-medium bg-gradient-to-r from-food-red to-food-orange hover:from-food-red/90 hover:to-food-orange/90 text-white rounded-lg transition-all disabled:opacity-50 shadow-md hover:shadow-lg"
                  >
                    {isCheckingOut ? (
                      <span className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                        Processing
                      </span>
                    ) : (
                      paymentMethod === 'card'
                        ? 'Pay Now'
                        : fulfillmentType === 'pickup'
                          ? 'Place Pickup Order'
                          : fulfillmentType === 'nationwide'
                            ? 'Place Shipping Order'
                            : 'Place Delivery Order'
                    )}
                  </Button>
                </div>
              </div>

              {/* Mobile Layout */}
              <div className="md:hidden space-y-2">
                {/* Total Price with Breakdown */}
                <div>
                  <div className="flex flex-wrap gap-2 mb-1 text-xs text-gray-600">
                    <span>Subtotal: {formatCurrency(subtotal)}</span>
                    {promoDiscount > 0 && (
                      <span className="text-green-600">Promo: -{formatCurrency(promoDiscount)}</span>
                    )}
                    {totalTax > 0 && (
                      <span>Tax: {formatCurrency(totalTax)}</span>
                    )}
                    {deliveryFee > 0 && (
                      <span>Delivery: {formatCurrency(deliveryFee)}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="text-xl font-bold text-food-red tracking-tight">
                      {formatCurrency(total)}
                    </p>
                  </div>
                </div>

                {/* Promo Code Section */}
                {promoDiscount > 0 ? (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Promo:</span>
                      <span className="font-semibold text-gray-900">{promoCode}</span>
                      <span className="text-green-600 font-medium">-{formatCurrency(promoDiscount)}</span>
                    </div>
                    <button
                      onClick={handleRemovePromo}
                      className="text-gray-400 hover:text-gray-600 p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => {
                        setPromoCode(e.target.value.toUpperCase());
                        setPromoError('');
                      }}
                      placeholder="Promo code"
                      className="flex-1 px-3 py-2 text-sm bg-transparent border border-gray-200 rounded-lg placeholder:text-gray-400 focus:border-food-red focus:outline-none transition-colors"
                    />
                    <button
                      onClick={handleApplyPromoCode}
                      disabled={isApplyingPromo}
                      className="px-3 py-2 text-sm font-medium text-food-red hover:text-food-red/80 disabled:opacity-50"
                    >
                      {isApplyingPromo ? '...' : 'Apply'}
                    </button>
                  </div>
                )}
                {promoError && (
                  <p className="text-xs text-red-600 -mt-2">{promoError}</p>
                )}

                {/* Pay Button */}
                <Button
                  onClick={handlePreCheckout}
                  disabled={isCheckingOut}
                  className="w-full h-10 text-sm font-medium bg-gradient-to-r from-food-red to-food-orange hover:from-food-red/90 hover:to-food-orange/90 text-white rounded-lg transition-all disabled:opacity-50 shadow-md"
                >
                  {isCheckingOut ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                    </span>
                  ) : (
                    paymentMethod === 'card' 
                      ? 'Pay Now' 
                      : fulfillmentType === 'pickup' 
                        ? 'Place Pickup Order' 
                        : 'Place Delivery Order'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order Review Dialog */}
      <Dialog open={showOrderReview} onOpenChange={setShowOrderReview}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Review Your Order</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Items Summary */}
            <div>
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Items</h4>
              <div className="space-y-2">
                {items.map((item) => {
                  const basePrice = item.product.is_weighted && item.weight
                    ? item.weight * item.product.price_per_unit
                    : item.quantity * item.product.price_per_unit;
                  const discount = item.discount_percentage || 0;
                  const finalPrice = basePrice * (1 - discount / 100);

                  return (
                    <div key={item.id} className="flex justify-between items-center text-sm">
                      <div className="flex-1 min-w-0">
                        <span className="text-gray-900">{item.product.name}</span>
                        <span className="text-gray-500 ml-1">
                          x{item.product.is_weighted && item.weight
                            ? `${item.weight} ${item.product.unit_of_measure || 'lb'}`
                            : item.quantity}
                        </span>
                      </div>
                      <span className="font-medium text-gray-900 ml-2">{formatCurrency(finalPrice)}</span>
                    </div>
                  );
                })}
                {comboItems.map((comboItem) => {
                  const addonTotal = comboItem.combo.items
                    .filter((ci) => ci.is_addon && comboItem.selected_addon_ids.includes(ci.id))
                    .reduce((s, ci) => s + (ci.addon_price || 0), 0);
                  const comboTotal = (comboItem.combo.combo_price + addonTotal) * comboItem.quantity;
                  return (
                    <div key={comboItem.id} className="flex justify-between items-center text-sm">
                      <div className="flex-1 min-w-0">
                        <span className="text-gray-900">{comboItem.combo.name}</span>
                        <span className="text-gray-500 ml-1">x{comboItem.quantity}</span>
                        <Badge className="ml-1 bg-food-orange text-white text-[9px] px-1 py-0">Combo</Badge>
                      </div>
                      <span className="font-medium text-gray-900 ml-2">{formatCurrency(comboTotal)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Fulfillment Details */}
            <div>
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {fulfillmentType === 'nationwide' ? 'Shipping' : fulfillmentType === 'delivery' ? 'Delivery' : 'Pickup'} Details
              </h4>
              <div className="text-sm space-y-1">
                <div className="flex items-center gap-2">
                  {fulfillmentType === 'nationwide' ? (
                    <Globe className="h-4 w-4 text-blue-600" />
                  ) : fulfillmentType === 'delivery' ? (
                    <Truck className="h-4 w-4 text-blue-600" />
                  ) : (
                    <Package className="h-4 w-4 text-amber-600" />
                  )}
                  <span className="font-medium capitalize">
                    {fulfillmentType === 'nationwide' ? 'Nationwide Shipping' : fulfillmentType}
                  </span>
                </div>
                {(fulfillmentType === 'delivery' || fulfillmentType === 'nationwide') && userProfile && (
                  <p className="text-gray-600 ml-6">
                    {userProfile.address_line1}, {userProfile.city}, {userProfile.state} {userProfile.postal_code}
                  </p>
                )}
                {(fulfillmentType === 'delivery' || fulfillmentType === 'nationwide') ? (
                  <p className="text-gray-600 ml-6">
                    {localStorage.getItem('selectedDeliveryDate')} at {localStorage.getItem('selectedDeliveryTime')}
                  </p>
                ) : (
                  <p className="text-gray-600 ml-6">
                    {localStorage.getItem('selectedPickupDate') && (() => {
                      try {
                        return formatDate(new Date(localStorage.getItem('selectedPickupDate')!), 'yyyy-MM-dd');
                      } catch { return localStorage.getItem('selectedPickupDate'); }
                    })()} at {localStorage.getItem('selectedPickupTime')}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            {/* Price Breakdown */}
            <div>
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Price Breakdown</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {promoDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Promo Discount</span>
                    <span>-{formatCurrency(promoDiscount)}</span>
                  </div>
                )}
                {totalTax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax</span>
                    <span>{formatCurrency(totalTax)}</span>
                  </div>
                )}
                {deliveryFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivery Fee</span>
                    <span>{formatCurrency(deliveryFee)}</span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span className="text-food-red">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="flex items-center gap-2 text-sm bg-gray-50 p-3 rounded-lg">
              {paymentMethod === 'card' ? (
                <CreditCard className="h-4 w-4 text-gray-600" />
              ) : (
                <DollarSign className="h-4 w-4 text-gray-600" />
              )}
              <span className="text-gray-700">
                Paying with {paymentMethod === 'card' ? 'Credit/Debit Card' : 'Cash on Pickup'}
              </span>
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => setShowOrderReview(false)}
              className="w-full sm:w-auto"
            >
              Go Back
            </Button>
            <Button
              onClick={() => {
                setShowOrderReview(false);
                handleCheckout();
              }}
              disabled={isCheckingOut}
              className="w-full sm:w-auto bg-gradient-to-r from-food-red to-food-orange hover:from-food-red/90 hover:to-food-orange/90 text-white"
            >
              {isCheckingOut ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                  Processing
                </span>
              ) : (
                paymentMethod === 'card' ? 'Confirm & Pay' : 'Confirm & Place Order'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CheckoutPage;
