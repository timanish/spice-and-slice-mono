
import { CardContent } from "@/components/ui/card";
import WeightSelector from "./WeightSelector";

interface ProductDetailsProps {
  name: string;
  pricePerUnit: number;
  inventoryCount: number;
  category?: string;
  brand?: string;
  isWeighted?: boolean;
  unitOfMeasure?: string;
  weight: number;
  productId: string;
  onWeightChange: (value: number) => void;
}

const ProductDetails = ({
  name,
  pricePerUnit,
  inventoryCount,
  category,
  brand,
  isWeighted,
  unitOfMeasure,
  weight,
  productId,
  onWeightChange
}: ProductDetailsProps) => {
  return (
    <CardContent>
      
      {isWeighted ? (
        <p className="text-lg font-semibold">
          ${pricePerUnit.toFixed(2)} / {unitOfMeasure || 'lb'}
        </p>
      ) : (
        <p className="text-lg font-semibold">${pricePerUnit.toFixed(2)}</p>
      )}
      
      {brand && (
        <p className="text-xs text-gray-500">Brand: {brand}</p>
      )}
      
      {isWeighted && (
        <WeightSelector
          productId={productId}
          weight={weight}
          unitOfMeasure={unitOfMeasure}
          pricePerUnit={pricePerUnit}
          onWeightChange={onWeightChange}
        />
      )}
    </CardContent>
  );
};

export default ProductDetails;
