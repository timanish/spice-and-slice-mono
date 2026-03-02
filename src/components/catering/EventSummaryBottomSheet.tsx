import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ShoppingBag, X } from 'lucide-react';
import { SelectedMenuItem } from './types';

interface EventSummaryBottomSheetProps {
  selectedItems: SelectedMenuItem[];
  guestCount: number;
  onRemoveItem: (itemId: string) => void;
  onProceedToDetails: () => void;
}

const EventSummaryBottomSheet: React.FC<EventSummaryBottomSheetProps> = ({
  selectedItems,
  guestCount,
  onRemoveItem,
  onProceedToDetails
}) => {
  const calculateTotal = () => {
    return selectedItems.reduce((total, item) => {
      return total + (item.menuItem.price * item.quantity);
    }, 0);
  };

  const totalTrays = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = calculateTotal();
  const estimatedTax = subtotal * 0.08;
  const total = subtotal + estimatedTax;

  if (selectedItems.length === 0) return null;

  return (
    <>
      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-2xl z-50 md:hidden">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="flex-1 h-12 relative">
                  <ShoppingBag className="h-5 w-5 mr-2" />
                  <span className="font-semibold">{totalTrays} items</span>
                  <Badge className="absolute -top-2 -right-2 bg-[#8B0000]">
                    ${total.toFixed(0)}
                  </Badge>
                </Button>
              </SheetTrigger>
              
              <SheetContent side="bottom" className="h-[80vh]">
                <SheetHeader>
                  <SheetTitle className="text-left">Your Quote</SheetTitle>
                  <p className="text-sm text-gray-500 text-left">{guestCount} guests</p>
                </SheetHeader>

                {/* Items List */}
                <div className="mt-6 space-y-4 overflow-y-auto max-h-[50vh]">
                  {selectedItems.map((item) => (
                    <div 
                      key={item.menuItem.id}
                      className="flex gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <img 
                        src={item.menuItem.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&q=80'}
                        alt={item.menuItem.name}
                        className="w-16 h-16 rounded object-cover"
                      />
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <h4 className="font-semibold text-sm">{item.menuItem.name}</h4>
                          <Button
                            onClick={() => onRemoveItem(item.menuItem.id)}
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-gray-500">
                            {item.quantity} × ${item.menuItem.price.toFixed(2)}
                          </span>
                          <span className="font-bold text-sm">
                            ${(item.menuItem.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="mt-6 space-y-2 border-t pt-4">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span className="font-semibold">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Estimated Tax</span>
                    <span className="font-semibold">${estimatedTax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-[#8B0000]">${total.toFixed(2)}</span>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Button 
              onClick={onProceedToDetails}
              className="flex-1 h-12 bg-[#8B0000] hover:bg-[#6B0000]"
            >
              Continue
            </Button>
          </div>
        </div>
      </div>

      {/* Spacer to prevent content from being hidden under bottom bar */}
      <div className="h-24 md:hidden" />
    </>
  );
};

export default EventSummaryBottomSheet;
