import { useMemo } from 'react';
import { useCartStore } from '@/stores/cart';

export const useCartItem = (productId: string) => {
  const { items } = useCartStore();
  
  const cartItem = useMemo(() => {
    return items.find(item => item.product_id === productId);
  }, [items, productId]);
  
  return {
    cartItem,
    isInCart: !!cartItem,
    quantity: cartItem?.quantity || 0,
    weight: cartItem?.weight || 1
  };
};