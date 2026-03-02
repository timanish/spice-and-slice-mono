import { Package, Truck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface FulfillmentTypeSelectorProps {
  selectedType: 'delivery' | 'pickup';
  onTypeChange: (type: 'delivery' | 'pickup') => void;
  isPickupAvailable: boolean;
  pickupUnavailableMessage?: string;
  isDeliveryAvailable?: boolean;
  deliveryUnavailableMessage?: string;
}

export function FulfillmentTypeSelector({
  selectedType,
  onTypeChange,
  isPickupAvailable,
  pickupUnavailableMessage,
  isDeliveryAvailable = true,
  deliveryUnavailableMessage,
}: FulfillmentTypeSelectorProps) {
  return (
    <Card className="shadow-lg border-2 mb-6">
      <CardContent className="p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">
          Choose Fulfillment Method
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Delivery Option */}
          <button
            onClick={() => isDeliveryAvailable && onTypeChange('delivery')}
            disabled={!isDeliveryAvailable}
            className={`p-4 md:p-6 rounded-xl border-2 transition-all text-left ${
              !isDeliveryAvailable
                ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50'
                : selectedType === 'delivery'
                ? 'border-food-red bg-food-red/5 shadow-md'
                : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-full ${
                selectedType === 'delivery' 
                  ? 'bg-food-red/10' 
                  : 'bg-gray-100'
              }`}>
                <Truck className={`h-6 w-6 ${
                  selectedType === 'delivery' 
                    ? 'text-food-red' 
                    : 'text-gray-600'
                }`} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-1">Delivery</h3>
                <p className="text-sm text-gray-600">
                  {isDeliveryAvailable
                    ? 'Get your order delivered to your address'
                    : deliveryUnavailableMessage || 'Delivery not available for your location'
                  }
                </p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-1 ${
                selectedType === 'delivery' 
                  ? 'border-food-red' 
                  : 'border-gray-300'
              }`}>
                {selectedType === 'delivery' && (
                  <div className="w-3 h-3 rounded-full bg-food-red" />
                )}
              </div>
            </div>
          </button>

          {/* Pickup Option */}
          <button
            onClick={() => isPickupAvailable && onTypeChange('pickup')}
            disabled={!isPickupAvailable}
            className={`p-4 md:p-6 rounded-xl border-2 transition-all text-left ${
              !isPickupAvailable
                ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50'
                : selectedType === 'pickup'
                ? 'border-food-red bg-food-red/5 shadow-md'
                : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-full ${
                selectedType === 'pickup' 
                  ? 'bg-food-red/10' 
                  : 'bg-gray-100'
              }`}>
                <Package className={`h-6 w-6 ${
                  selectedType === 'pickup' 
                    ? 'text-food-red' 
                    : 'text-gray-600'
                }`} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-1">Pickup</h3>
                <p className="text-sm text-gray-600">
                  {isPickupAvailable 
                    ? 'Pick up your order from our store'
                    : pickupUnavailableMessage || 'Currently unavailable'
                  }
                </p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-1 ${
                selectedType === 'pickup' 
                  ? 'border-food-red' 
                  : 'border-gray-300'
              }`}>
                {selectedType === 'pickup' && (
                  <div className="w-3 h-3 rounded-full bg-food-red" />
                )}
              </div>
            </div>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
