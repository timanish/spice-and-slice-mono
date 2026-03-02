
import React from 'react';
import DeliveryPlatforms from '@/components/DeliveryPlatforms';

const DeliveryPlatformsTab = () => {
  return (
    <div>
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-serif font-bold mb-6">Order Through Delivery Platforms</h2>
        <p className="mb-6 text-gray-600">
          You can also order our delicious food through these popular delivery services:
        </p>
      </div>
      
      <DeliveryPlatforms />
    </div>
  );
};

export default DeliveryPlatformsTab;
