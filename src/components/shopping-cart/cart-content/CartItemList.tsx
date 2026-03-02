
import React from 'react';
import { Separator } from '@/components/ui/separator';
import CartItem from '../CartItem';
import { CartItem as CartItemType } from '@/stores/cart/types';

interface CartItemListProps {
  items: CartItemType[];
  onRemoveItem: (productId: string) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
}

const CartItemList: React.FC<CartItemListProps> = ({ 
  items, 
  onRemoveItem, 
  onUpdateQuantity 
}) => {
  return (
    <>
      <div className="space-y-3 p-4">
        {items.map((item) => (
          <CartItem
            key={item.id}
            id={item.id}
            product_id={item.product_id}
            quantity={item.quantity}
            product={item.product}
            weight={item.weight}
            discount_percentage={item.discount_percentage}
            flash_deal_id={item.flash_deal_id}
            onRemove={() => onRemoveItem(item.product_id)}
            onUpdateQuantity={(quantity) => onUpdateQuantity(item.product_id, quantity)}
          />
        ))}
      </div>
      <Separator className="my-2" />
    </>
  );
};

export default CartItemList;
