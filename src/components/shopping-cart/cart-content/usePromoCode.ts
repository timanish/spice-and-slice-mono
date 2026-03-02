
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';

interface UsePromoCodeProps {
  subtotal: number;
  onApplyPromo: (code: string) => Promise<void>;
}

export const usePromoCode = ({ subtotal, onApplyPromo }: UsePromoCodeProps) => {
  const [promoCode, setPromoCode] = useState('');
  const { toast } = useToast();
  const { user } = useUser();
  
  const handleApplyPromoCode = async (code: string) => {
    if (!code) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a promo code",
      });
      return;
    }

    if (!user) {
      toast({
        variant: "destructive",
        title: "Login Required",
        description: "Please login to apply promo codes",
      });
      return;
    }

    await onApplyPromo(code);
  };
  
  return {
    promoCode,
    setPromoCode,
    handleApplyPromoCode
  };
};
