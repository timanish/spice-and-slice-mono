import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import WeightSelector from "./WeightSelector";

interface Product {
  id: string;
  name: string;
  price_per_unit: number;
  unit_of_measure?: string;
  image_url?: string;
}

interface WeightedProductDialogProps {
  product: Product | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToCart: (productId: string, weight: number) => Promise<void>;
  currentWeight?: number;
}

const WeightedProductDialog = ({
  product,
  isOpen,
  onOpenChange,
  onAddToCart,
  currentWeight
}: WeightedProductDialogProps) => {
  const [weight, setWeight] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (isOpen && currentWeight) {
      setWeight(currentWeight);
    } else if (isOpen) {
      setWeight(1);
    }
  }, [isOpen, currentWeight]);

  if (!product) return null;

  const handleAddToCart = async () => {
    setIsAdding(true);
    try {
      await onAddToCart(product.id, weight);
      onOpenChange(false);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
          <DialogDescription>
            Select the weight you would like to order.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex justify-center">
             {product.image_url && (
                <img 
                  src={product.image_url} 
                  alt={product.name} 
                  className="h-32 w-32 object-cover rounded-md"
                />
             )}
          </div>
          <WeightSelector
            productId={product.id}
            weight={weight}
            unitOfMeasure={product.unit_of_measure}
            pricePerUnit={product.price_per_unit}
            onWeightChange={setWeight}
          />
        </div>
        <DialogFooter>
          <Button onClick={handleAddToCart} disabled={isAdding} className="w-full">
            {isAdding ? "Adding..." : `Add ${weight} ${product.unit_of_measure || 'lb'} to Cart`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WeightedProductDialog;
