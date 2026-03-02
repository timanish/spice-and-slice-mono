import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShoppingCart, Minus, Plus } from "lucide-react";

interface QuantitySelectorProps {
  productId: string;
  quantity: number;
  pricePerUnit: number;
  minOrderValue?: number | null;
  minOrderUnit?: string | null;
  onQuantityChange: (value: number) => void;
}

const QuantitySelector = ({ 
  productId, 
  quantity, 
  pricePerUnit,
  minOrderValue,
  minOrderUnit,
  onQuantityChange 
}: QuantitySelectorProps) => {
  const minQuantity = minOrderValue && minOrderUnit === 'pieces' ? minOrderValue : 1;

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (value >= minQuantity && value <= 999) {
      onQuantityChange(value);
    }
  };

  const incrementQuantity = () => {
    if (quantity < 999) {
      onQuantityChange(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > minQuantity) {
      onQuantityChange(quantity - 1);
    }
  };

  return (
    <div className="mt-2">
      <div className="flex items-center">
        <ShoppingCart className="h-4 w-4 mr-2 text-gray-500" />
        <Label htmlFor={`quantity-${productId}`} className="text-sm font-medium">
          Quantity
        </Label>
      </div>
      <div className="space-y-2 mt-1">
        <div className="flex items-center justify-center gap-2">
          <Button 
            type="button" 
            variant="outline" 
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={decrementQuantity}
            disabled={quantity <= minQuantity}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <Input
            id={`quantity-${productId}`}
            type="number"
            min={minQuantity}
            max="999"
            step="1"
            value={quantity}
            onChange={handleQuantityChange}
            className="w-20 text-center h-8 flex-shrink-0"
            placeholder="Qty"
          />
          <Button 
            type="button" 
            variant="outline" 
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={incrementQuantity}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <div className="text-center">
          <span className="text-sm font-medium text-foreground">
            Total: ${(quantity * pricePerUnit).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default QuantitySelector;
