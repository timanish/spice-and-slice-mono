
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";

interface EmptyCartProps {
  onClose: () => void;
}

const EmptyCart: React.FC<EmptyCartProps> = ({ onClose }) => {
  const navigate = useNavigate();

  const handleBrowseMenu = () => {
    onClose();
    navigate('/products');
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <h3 className="text-lg font-medium">Your cart is empty</h3>
      <p className="text-gray-500 mt-2">Add some delicious items from our menu!</p>
      <Button className="mt-4" onClick={handleBrowseMenu}>
        Browse Menu
      </Button>
    </div>
  );
};

export default EmptyCart;
