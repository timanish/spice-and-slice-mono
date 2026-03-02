import { MapPin, Clock, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatPickupTime, formatStoreHours } from '@/utils/pickupUtils';
import type { PickupSettingsData } from '@/hooks/usePickupSettings';

interface PickupInfoProps {
  settings: PickupSettingsData;
  readyAt: Date;
}

export function PickupInfo({ settings, readyAt }: PickupInfoProps) {
  const fullAddress = [
    settings.store_address_line1,
    settings.store_address_line2,
    `${settings.store_city}, ${settings.store_state} ${settings.store_postal_code}`,
  ].filter(Boolean).join(', ');

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Store Location */}
      <Card className="shadow-lg border-2">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-start gap-3 mb-4">
            <MapPin className="h-5 w-5 text-food-orange mt-0.5" />
            <div>
              <h3 className="text-base md:text-lg font-bold mb-2">Pickup Location</h3>
              <p className="text-gray-700 text-sm md:text-base">{fullAddress}</p>
              {settings.store_phone && (
                <p className="text-gray-600 text-sm mt-1">Phone: {settings.store_phone}</p>
              )}
            </div>
          </div>

          {/* Store Hours */}
          <div className="flex items-start gap-3 pt-4 border-t border-gray-200">
            <Clock className="h-5 w-5 text-food-red mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm md:text-base mb-1">Store Hours</h4>
              <p className="text-gray-700 text-sm md:text-base">
                {formatStoreHours(settings)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Central Time</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pickup Instructions */}
      <Card className="shadow-lg border-2 border-blue-100 bg-blue-50/30">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm md:text-base mb-2 text-blue-900">
                Pickup Instructions
              </h4>
              <ul className="space-y-1.5 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>Please bring your order confirmation (email or receipt)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>Have your order number ready for quick pickup</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>Orders can be picked up anytime after the ready time</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>Please arrive before store closing time</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
