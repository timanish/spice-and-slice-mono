
import React from 'react';
import { ShoppingCartIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface CartButtonProps {
  totalItems: number;
  onClick: () => void;
}

const CartButton: React.FC<CartButtonProps> = ({ totalItems, onClick }) => {
  return (
    <Button 
      variant="ghost" 
      size="icon"
      className="relative p-2 text-gray-600 hover:text-food-red" 
      onClick={onClick}
    >
      <ShoppingCartIcon className="h-5 w-5" />
      {totalItems > 0 && (
        <span className="absolute -top-1 -right-1 bg-food-red text-white w-5 h-5 rounded-full text-xs flex items-center justify-center">
          {totalItems}
        </span>
      )}
    </Button>
  );
};

export default CartButton;
