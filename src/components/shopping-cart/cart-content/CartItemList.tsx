
import React from 'react';
import { Separator } from '@/components/ui/separator';
import CartItem from '../CartItem';
import CartComboItemComponent from '../CartComboItem';
import { CartItem as CartItemType, CartComboItem as CartComboItemType } from '@/stores/cart/types';

interface CartItemListProps {
  items: CartItemType[];
  comboItems: CartComboItemType[];
  onRemoveItem: (productId: string) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveCombo: (cartComboItemId: string) => void;
  onUpdateComboQuantity: (cartComboItemId: string, quantity: number) => void;
  onToggleComboAddon: (cartComboItemId: string, comboItemId: string) => void;
}

const CartItemList: React.FC<CartItemListProps> = ({
  items,
  comboItems,
  onRemoveItem,
  onUpdateQuantity,
  onRemoveCombo,
  onUpdateComboQuantity,
  onToggleComboAddon,
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
        {comboItems.map((item) => (
          <CartComboItemComponent
            key={item.id}
            item={item}
            onRemove={() => onRemoveCombo(item.id)}
            onUpdateQuantity={(quantity) => onUpdateComboQuantity(item.id, quantity)}
            onToggleAddon={(comboItemId) => onToggleComboAddon(item.id, comboItemId)}
          />
        ))}
      </div>
      <Separator className="my-2" />
    </>
  );
};

export default CartItemList;
