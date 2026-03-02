
import React, { useEffect, useState } from 'react';
import DeliveryTimeSelector from '@/components/DeliveryTimeSelector';

const CartDeliverySection: React.FC = () => {
  const [deliveryTimeSelected, setDeliveryTimeSelected] = useState(false);
  
  useEffect(() => {
    const hasDeliveryDate = !!localStorage.getItem('selectedDeliveryDate');
    const hasDeliveryTime = !!localStorage.getItem('selectedDeliveryTime');
    setDeliveryTimeSelected(hasDeliveryDate && hasDeliveryTime);
  }, []);

  return (
    <div className="px-4 py-3 bg-gray-50 border-y border-gray-200">
      <h3 className="font-semibold text-gray-900 mb-5">Choose Delivery Time</h3>
      <DeliveryTimeSelector />
    </div>
  );
};

export default CartDeliverySection;
