
import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CartItem as CartItemType } from "@/stores/cart";
import CartItemControls from "@/components/product/CartItemControls";
import { Tag } from "lucide-react";

interface CartItemProps extends CartItemType {
  onRemove: () => void;
  onUpdateQuantity: (quantity: number) => void;
}

const CartItem = ({ id, product_id, quantity, product, weight, discount_percentage, onRemove, onUpdateQuantity }: CartItemProps) => {
  const isWeighted = product.is_weighted || false;
  const hasDiscount = discount_percentage != null && discount_percentage > 0;
  
  // Calculate base price
  const basePrice = isWeighted 
    ? (weight || 0) * product.price_per_unit 
    : quantity * product.price_per_unit;
  
  // Calculate discounted price
  const discountedPrice = hasDiscount
    ? basePrice * (1 - (discount_percentage || 0) / 100)
    : basePrice;
  
  const pricePerUnit = hasDiscount
    ? product.price_per_unit * (1 - (discount_percentage || 0) / 100)
    : product.price_per_unit;

  // console.log('CartItem Debug:', {
  //   product: product.name,
  //   hasDiscount,
  //   discount_percentage,
  //   quantity,
  //   isWeighted,
  //   weight,
  //   price_per_unit: product.price_per_unit,
  //   calculation: `${quantity} * ${product.price_per_unit} = ${quantity * product.price_per_unit}`,
  //   basePrice,
  //   discountedPrice
  // });

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start gap-4 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 text-lg">{product.name}</h3>
            {hasDiscount && (
              <Badge className="bg-red-500 text-white">
                <Tag className="h-3 w-3 mr-1" />
                {discount_percentage}% OFF
              </Badge>
            )}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {hasDiscount ? (
              <div className="flex items-center gap-2">
                <span className="line-through text-gray-400">
                  ${product.price_per_unit.toFixed(2)}
                </span>
                <span className="font-semibold text-red-600">
                  ${pricePerUnit.toFixed(2)}
                </span>
                <span>
                  {isWeighted 
                    ? `per ${product.unit_of_measure || 'lb'}`
                    : 'each'
                  }
                </span>
              </div>
            ) : (
              <p>
                {isWeighted 
                  ? `$${product.price_per_unit.toFixed(2)} per ${product.unit_of_measure || 'lb'}`
                  : `$${product.price_per_unit.toFixed(2)} each`
                }
              </p>
            )}
          </div>
        </div>
        <div className="text-right">
          {hasDiscount && (
            <p className="text-sm text-gray-400 line-through">
              ${basePrice.toFixed(2)}
            </p>
          )}
          <p className={`font-bold text-lg ${hasDiscount ? 'text-red-600' : 'text-gray-900'}`}>
            ${hasDiscount? discountedPrice.toFixed(2) : basePrice.toFixed(2)}
          </p>
        </div>
      </div>
      <div className="flex justify-end">
        <CartItemControls
          productId={product_id}
          quantity={quantity}
          weight={weight}
          isWeighted={isWeighted}
          unitOfMeasure={product.unit_of_measure}
          pricePerUnit={product.price_per_unit}
          showRemove={true}
          minOrderValue={product.min_order_value}
          minOrderUnit={product.min_order_unit}
        />
      </div>
    </div>
  );
};

export default CartItem;
