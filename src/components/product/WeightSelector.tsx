
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Weight, Minus, Plus } from "lucide-react";

interface WeightSelectorProps {
  productId: string;
  weight: number;
  unitOfMeasure?: string;
  pricePerUnit: number;
  onWeightChange: (value: number) => void;
}

const WeightSelector = ({ 
  productId, 
  weight, 
  unitOfMeasure = 'lb', 
  pricePerUnit,
  onWeightChange 
}: WeightSelectorProps) => {
  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    // Enforce minimum 0.5 lb and maximum 50 lb
    if (value < 0.5) {
      onWeightChange(0.5);
    } else if (value > 50) {
      onWeightChange(50);
    } else {
      onWeightChange(value);
    }
  };

  const incrementWeight = () => {
    const newWeight = Math.round((weight + 0.5) * 100) / 100;
    // Enforce maximum 50 lb
    onWeightChange(Math.min(50, newWeight));
  };

  const decrementWeight = () => {
    // Enforce minimum 0.5 lb
    onWeightChange(Math.max(0.5, Math.round((weight - 0.5) * 100) / 100));
  };

  return (
    <div className="mt-2">
      <div className="flex items-center">
        <Weight className="h-4 w-4 mr-2 text-gray-500" />
        <Label htmlFor={`weight-${productId}`} className="text-sm font-medium">
          Weight ({unitOfMeasure})
        </Label>
      </div>
      <div className="space-y-2 mt-1">
        <div className="flex items-center justify-center gap-2">
          <Button 
            type="button" 
            variant="outline" 
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={decrementWeight}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <Input
            id={`weight-${productId}`}
            type="number"
            min="0.5"
            max="50"
            step="0.5"
            value={weight}
            onChange={handleWeightChange}
            className="w-20 text-center h-8 flex-shrink-0"
            placeholder="Weight"
          />
          <Button 
            type="button" 
            variant="outline" 
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={incrementWeight}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <div className="text-center">
          <span className="text-sm font-medium text-foreground">
            Total: ${(weight * pricePerUnit).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default WeightSelector;
