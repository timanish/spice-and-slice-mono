
import React from 'react';

const DeliveryMap: React.FC = () => {
  return (
    <div className="p-6 bg-gray-100 border border-gray-200 rounded-md">
      <p className="font-medium text-center">Delivery Information</p>
      <div className="mt-4 text-sm space-y-1">
        <p><strong>From:</strong> Spice & Slice Bazaar, 7451 N Beach St #172, Fort Worth, TX 76137</p>
        <p><strong>Estimated Delivery Time:</strong> 30-45 minutes</p>
      </div>
    </div>
  );
};

export default DeliveryMap;
