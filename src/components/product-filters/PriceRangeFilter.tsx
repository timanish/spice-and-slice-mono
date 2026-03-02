
import React from 'react';
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

interface PriceRangeFilterProps {
  minPrice: number;
  maxPrice: number;
  value: [number, number];
  onChange: (values: [number, number]) => void;
}

const PriceRangeFilter: React.FC<PriceRangeFilterProps> = ({ 
  minPrice, 
  maxPrice, 
  value, 
  onChange 
}) => {
  return (
    <>
      <SliderPrimitive.Root
        className="relative flex w-full touch-none select-none items-center"
        min={minPrice}
        max={maxPrice}
        step={1}
        value={[value[0], value[1]]}
        onValueChange={(values) => onChange([values[0], values[1]])}
      >
        <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
          <SliderPrimitive.Range className="absolute h-full bg-primary" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
        <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
      </SliderPrimitive.Root>
      <div className="flex justify-between text-xs text-muted-foreground mt-2">
        <span>${value[0].toFixed(2)}</span>
        <span>${value[1].toFixed(2)}</span>
      </div>
    </>
  );
};

export default PriceRangeFilter;
