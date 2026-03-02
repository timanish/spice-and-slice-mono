
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface CheckboxGroupProps {
  items: string[];
  selectedItems: string[];
  onChange: (item: string, checked: boolean) => void;
  idPrefix: string;
}

const CheckboxGroup: React.FC<CheckboxGroupProps> = ({
  items,
  selectedItems,
  onChange,
  idPrefix
}) => {
  
  return (
    <div className="space-y-2">
      {items.map(item => {
        const isChecked = selectedItems.includes(item);
        
        return (
          <div key={item} className="flex items-center space-x-2">
            <Checkbox
              id={`${idPrefix}-${item}`} 
              checked={isChecked}
              onCheckedChange={(checked) => {
                onChange(item, checked === true);
              }}
            />
            <Label 
              htmlFor={`${idPrefix}-${item}`}
              className="text-sm cursor-pointer"
            >
              {item}
            </Label>
          </div>
        );
      })}
    </div>
  );
};

export default CheckboxGroup;
