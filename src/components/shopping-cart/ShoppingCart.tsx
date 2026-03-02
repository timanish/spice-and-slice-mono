
import { useState } from "react";
import { ShoppingCart as CartIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useCartLogic } from "./useCartLogic";
import CartContent from "./CartContent"; // Updated to use main CartContent file

interface ShoppingCartProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideButton?: boolean;
}

const ShoppingCart: React.FC<ShoppingCartProps> = ({ open, onOpenChange, hideButton = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { 
    isCheckingOut, 
    showMap, 
    handleCheckout, 
    items, 
    paymentMethod, 
    setPaymentMethod,
    isLoading 
  } = useCartLogic(
    open !== undefined ? open : isOpen,
    onOpenChange !== undefined ? onOpenChange : setIsOpen
  );

  // Handle cart close function
  const handleClose = () => {
    if (onOpenChange) {
      onOpenChange(false);
    } else {
      setIsOpen(false);
    }
  };

  return (
    <Sheet open={open !== undefined ? open : isOpen} onOpenChange={onOpenChange !== undefined ? onOpenChange : setIsOpen}>
      {!hideButton && (
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="relative">
            <CartIcon className="h-5 w-5" />
            {!isLoading && items.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
                {items.reduce((acc, item) => acc + item.quantity, 0)}
              </span>
            )}
          </Button>
        </SheetTrigger>
      )}
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b border-gray-200 bg-white">
          <SheetTitle className="text-2xl font-bold">Shopping Cart</SheetTitle>
        </SheetHeader>
        <div className="flex-1 flex flex-col overflow-hidden">
          <CartContent onClose={handleClose} />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ShoppingCart;
