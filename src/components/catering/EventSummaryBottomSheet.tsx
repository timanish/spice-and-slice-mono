import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ShoppingBag, X, Users } from 'lucide-react';
import { SelectedMenuItem } from './types';

interface EventSummaryBottomSheetProps {
  selectedItems: SelectedMenuItem[];
  onRemoveItem: (itemId: string) => void;
  onProceedToDetails: () => void;
}

const EventSummaryBottomSheet: React.FC<EventSummaryBottomSheetProps> = ({
  selectedItems,
  onRemoveItem,
  onProceedToDetails
}) => {
  const totalPeople = selectedItems.reduce((sum, item) => sum + item.servingCount, 0);

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
                  <span className="font-semibold">{selectedItems.length} {selectedItems.length === 1 ? 'dish' : 'dishes'}</span>
                  <Badge className="absolute -top-2 -right-2 bg-[#8B0000] flex items-center gap-0.5">
                    <Users className="h-3 w-3" />
                    {totalPeople}
                  </Badge>
                </Button>
              </SheetTrigger>

              <SheetContent side="bottom" className="h-[80vh]">
                <SheetHeader>
                  <SheetTitle className="text-left">Your Selection</SheetTitle>
                  <p className="text-sm text-gray-500 text-left">{selectedItems.length} {selectedItems.length === 1 ? 'dish' : 'dishes'} · {totalPeople} people total</p>
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
                        <div className="flex items-center gap-1.5 mt-1">
                          <Users className="h-3.5 w-3.5 text-[#8B0000]" />
                          <span className="text-sm font-semibold text-gray-700">
                            {item.servingCount} {item.servingCount === 1 ? 'person' : 'people'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="mt-6 border-t pt-4 flex items-center justify-between">
                  <span className="text-gray-600 font-medium">Total people served</span>
                  <span className="font-bold text-lg text-[#8B0000] flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {totalPeople}
                  </span>
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
