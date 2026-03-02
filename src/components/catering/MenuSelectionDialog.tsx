
import React from 'react';
import { GroupedMenuItems, SelectedMenuItem } from './types';
import { MenuItem } from '@/hooks/products/types';
import { ChevronDown } from 'lucide-react';
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface MenuSelectionDialogProps {
  groupedMenuItems: GroupedMenuItems;
  menuLoading: boolean;
  onAddItem: (menuItem: MenuItem) => void;
}

const MenuSelectionDialog: React.FC<MenuSelectionDialogProps> = ({ 
  groupedMenuItems, 
  menuLoading, 
  onAddItem 
}) => {
  return (
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
      <DialogHeader>
        <DialogTitle>Add Menu Items</DialogTitle>
        <DialogDescription>
          Select items from our menu to add to your catering enquiry.
        </DialogDescription>
      </DialogHeader>
      
      {menuLoading ? (
        <div className="flex justify-center py-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <div className="space-y-4 mt-4">
          {Object.entries(groupedMenuItems).map(([category, items]) => (
            <Collapsible key={category} className="border rounded-md">
              <CollapsibleTrigger className="flex justify-between items-center w-full p-4 text-left font-medium">
                <span>{category}</span>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4">
                <div className="space-y-2">
                  {items.map(item => (
                    <div key={item.id} className="flex justify-between items-center p-2 hover:bg-gray-100 rounded-md">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        {item.description && <p className="text-sm text-gray-500">{item.description}</p>}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => onAddItem(item)}>
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      )}
    </DialogContent>
  );
};

export default MenuSelectionDialog;
