
import React from 'react';
import { SelectedMenuItem } from './types';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface SelectedMenuItemsProps {
  selectedItems: SelectedMenuItem[];
  updateItemQuantity: (itemId: string, quantity: number) => void;
  removeItem: (itemId: string) => void;
}

const SelectedMenuItems: React.FC<SelectedMenuItemsProps> = ({
  selectedItems,
  updateItemQuantity,
  removeItem
}) => {
  if (selectedItems.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        No items selected. Click "Add Item" to build your menu.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {selectedItems.map(item => (
        <div key={item.menuItem.id} className="flex justify-between items-center border-b pb-3">
          <div className="flex-1">
            <p className="font-medium">{item.menuItem.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center border rounded-md">
              <Button type="button" variant="ghost" size="sm" className="px-2 h-8" onClick={() => updateItemQuantity(item.menuItem.id, item.quantity - 1)}>
                -
              </Button>
              <span className="w-8 text-center">{item.quantity}</span>
              <Button type="button" variant="ghost" size="sm" className="px-2 h-8" onClick={() => updateItemQuantity(item.menuItem.id, item.quantity + 1)}>
                +
              </Button>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(item.menuItem.id)}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SelectedMenuItems;
