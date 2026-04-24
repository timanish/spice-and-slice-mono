import { useState } from 'react';
import { Truck, CheckCircle, AlertCircle, MapPin, Phone, Globe } from 'lucide-react';
import { formatDistance } from '@/hooks/useDeliveryFee';
import { DeliveryLocationModal } from './DeliveryLocationModal';
import { Button } from '@/components/ui/button';

interface DeliveryFeeBannerProps {
  isFreeShipping: boolean;
  amountNeededForFreeShipping: number;
  deliveryFee: number;
  distance: number | null;
  zoneName: string | null;
  isWithinDeliveryRange: boolean;
  isQuoteRequired?: boolean;
  freeShippingThreshold: number;
  cartTotal: number;
  deliveryAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
  } | null;
  hasNationwideItems?: boolean;
  nationwideItemCount?: number;
  localOnlyItemNames?: string[];
}

const DeliveryFeeBanner = ({
  isFreeShipping,
  amountNeededForFreeShipping,
  deliveryFee,
  distance,
  zoneName,
  isWithinDeliveryRange,
  isQuoteRequired = false,
  freeShippingThreshold,
  cartTotal,
  deliveryAddress,
  hasNationwideItems = false,
  nationwideItemCount = 0,
  localOnlyItemNames = [],
}: DeliveryFeeBannerProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (distance === null) {
    return null;
  }

  if (isQuoteRequired) {
    return (
      <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <Truck className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-900 mb-1">
              Delivery Fee Calculated After Review
            </p>
            <p className="text-sm text-amber-800">
              You're {formatDistance(distance)} from our store — outside our standard delivery zones.
              Place your order as usual and our team will review it, calculate a custom delivery fee,
              and email you a link to confirm and pay.{" "}
              <span className="font-medium">No payment is taken until you approve the final total.</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isWithinDeliveryRange && distance > 30) {
    if (hasNationwideItems) {
      return (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex flex-col md:flex-row items-start gap-3">
            <Globe className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-blue-900 mb-1">
                Nationwide Shipping Available
              </p>
              <p className="text-sm text-blue-700 mb-1">
                Your location is {formatDistance(distance)} from our store — outside our local delivery range.
                However, {nationwideItemCount} {nationwideItemCount === 1 ? 'item' : 'items'} in your cart {nationwideItemCount === 1 ? 'is' : 'are'} eligible for nationwide shipping!
              </p>
              {localOnlyItemNames.length > 0 && (
                <div className="mt-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
                  <p className="font-medium">These items are local delivery only:</p>
                  <ul className="list-disc list-inside mt-1">
                    {localOnlyItemNames.map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                  <p className="mt-1 text-xs">Remove them to proceed with nationwide shipping, or switch to pickup.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-4">
        <div className="flex flex-col md:flex-row items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-red-900 mb-1">
              Outside Delivery Range
            </p>
            <p className="text-sm text-red-700 mb-3">
              Your location is {formatDistance(distance)} from our store — beyond our maximum delivery distance of 100 miles.
              Please select pickup or nationwide shipping, or contact us to discuss options.
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href="tel:+14695551234"
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                <Phone className="h-4 w-4" />
                Call Us: (682) 255-5004
              </a>
              <a
                href="/contact"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
              >
                Contact Form
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isFreeShipping) {
    return (
      <>
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-green-900 mb-1">
                  🎉 Free Delivery!
                </p>
                <p className="text-sm text-green-700">
                  Your order qualifies for free delivery! 
                  <span className="ml-1 text-green-600">
                    ({formatDistance(distance)} away)
                  </span>
                </p>
              </div>
            </div>
            {deliveryAddress && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 border-green-300 text-green-700 hover:bg-green-100 hover:text-green-900"
              >
                <MapPin className="h-4 w-4" />
                Preview Location
              </Button>
            )}
          </div>
        </div>
        {deliveryAddress && (
          <DeliveryLocationModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            deliveryAddress={deliveryAddress}
            distance={distance}
          />
        )}
      </>
    );
  }

  // Need more for free shipping
  // Calculate 90% threshold
  const ninetyPercentThreshold = freeShippingThreshold * 0.9;
  const isAbove90Percent = cartTotal > ninetyPercentThreshold;

  // console.log('📊 Banner Display Logic:', {
  //   cartTotal,
  //   freeShippingThreshold,
  //   ninetyPercentThreshold,
  //   isAbove90Percent,
  //   isFreeShipping,
  //   amountNeededForFreeShipping,
  // });

  return (
    <>
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 mb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <Truck className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              {isAbove90Percent ? (
                <>
                  <p className="font-semibold text-yellow-900 mb-1">
                    Add {formatCurrency(amountNeededForFreeShipping)} more for free delivery!
                  </p>
                  <p className="text-sm text-yellow-700">
                    Current delivery fee: {formatCurrency(deliveryFee)}
                    <span className="ml-1 text-yellow-600">
                      ({formatDistance(distance)} away)
                    </span>
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-yellow-900 mb-1">
                    Free delivery on order of {formatCurrency(freeShippingThreshold)} or more
                  </p>
                  <p className="text-sm text-yellow-700">
                    Current delivery fee: {formatCurrency(deliveryFee)}
                    <span className="ml-1 text-yellow-600">
                      ({formatDistance(distance)} away)
                    </span>
                  </p>
                </>
              )}
            </div>
          </div>
          {deliveryAddress && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 border-yellow-300 text-yellow-700 hover:bg-yellow-100 hover:text-yellow-900"
            >
              <MapPin className="h-4 w-4" />
              Preview Location
            </Button>
          )}
        </div>
      </div>
      {deliveryAddress && (
        <DeliveryLocationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          deliveryAddress={deliveryAddress}
          distance={distance}
        />
      )}
    </>
  );
};

export default DeliveryFeeBanner;
