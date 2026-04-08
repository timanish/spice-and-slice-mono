import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, X, ArrowRight, Users } from 'lucide-react';
import { SelectedMenuItem } from './types';

interface EventSummarySidebarProps {
  selectedItems: SelectedMenuItem[];
  onRemoveItem: (itemId: string) => void;
  onProceedToDetails: () => void;
  className?: string;
}

const EventSummarySidebar: React.FC<EventSummarySidebarProps> = ({
  selectedItems,
  onRemoveItem,
  onProceedToDetails,
  className = ''
}) => {
  const totalPeople = selectedItems.reduce((sum, item) => sum + item.servingCount, 0);

  return (
    <Card className={`border border-gray-200 shadow-xl rounded-2xl ${className}`}>
      <div className="p-7">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-[#8B0000] to-[#6B0000] p-3 rounded-xl shadow-md">
              <ShoppingBag className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-xl tracking-tight">Your Selection</h3>
              <p className="text-sm text-gray-500 font-medium">{selectedItems.length} {selectedItems.length === 1 ? 'dish' : 'dishes'}</p>
            </div>
          </div>
          {selectedItems.length > 0 && (
            <Badge className="bg-emerald-500 text-white text-sm px-3 py-1.5 font-semibold flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {totalPeople}
            </Badge>
          )}
        </div>

        <Separator className="mb-5" />

        {/* Selected Items */}
        <ScrollArea className="h-[300px] md:h-[400px] pr-4">
          {selectedItems.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="h-10 w-10 text-gray-400" />
              </div>
              <p className="text-gray-600 font-semibold text-base">No items selected</p>
              <p className="text-sm text-gray-500 mt-2">Browse the menu below to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedItems.map((item) => (
                <div
                  key={item.menuItem.id}
                  className="flex gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all duration-200 group"
                >
                  {/* Thumbnail */}
                  <img
                    src={item.menuItem.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&q=80'}
                    alt={item.menuItem.name}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  />

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-sm line-clamp-1">
                        {item.menuItem.name}
                      </h4>
                      <Button
                        onClick={() => onRemoveItem(item.menuItem.id)}
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1.5">
                      <Users className="h-3.5 w-3.5 text-[#8B0000]" />
                      <span className="text-sm font-semibold text-gray-700">
                        {item.servingCount} {item.servingCount === 1 ? 'person' : 'people'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Total & CTA */}
        {selectedItems.length > 0 && (
          <>
            <Separator className="my-4" />

            <div className="flex items-center justify-between text-sm mb-5">
              <span className="text-gray-600 font-medium">Total people served</span>
              <span className="font-bold text-lg text-[#8B0000] flex items-center gap-1">
                <Users className="h-4 w-4" />
                {totalPeople}
              </span>
            </div>

            <Button
              onClick={onProceedToDetails}
              className="w-full bg-gradient-to-r from-[#8B0000] to-[#A52A2A] hover:from-[#6B0000] hover:to-[#8B0000] text-white h-14 text-base font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Continue to Details
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>

            <p className="text-xs text-center text-gray-500 mt-4 leading-relaxed">
              💡 Final pricing will be confirmed via email
            </p>
          </>
        )}
      </div>
    </Card>
  );
};

export default EventSummarySidebar;
