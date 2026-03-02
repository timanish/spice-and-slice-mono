
import React, { useState, useRef, useEffect } from 'react';
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useUser } from '@/hooks/use-user';
import { supabase } from '@/integrations/supabase/client';
import { PromoCodeValidationResult } from '@/types/promoCode';
import { useIsMobile } from '@/hooks/use-mobile';

interface PromoCodeInputProps {
  promoCode?: string;
  onChange?: (code: string) => void;
  onApply: ((code: string) => Promise<void>) | ((promo: { code: string; discount: number; id: string }) => void);
  subtotal?: number;
}

const PromoCodeInput: React.FC<PromoCodeInputProps> = ({ promoCode: initialCode = '', onChange, onApply, subtotal = 0 }) => {
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState('');
  const [validating, setValidating] = useState(false);
  const { toast } = useToast();
  const { user } = useUser();
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCode = e.target.value;
    setCode(newCode);
    if (onChange) onChange(newCode);
  };

  // Effect to handle focus and scrolling when input is focused
  useEffect(() => {
    const handleFocus = () => {
      if (isMobile && inputRef.current) {
        // Delay needed for keyboard to appear before scrolling
        setTimeout(() => {
          inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    };

    const inputElement = inputRef.current;
    if (inputElement) {
      inputElement.addEventListener('focus', handleFocus);
      return () => {
        inputElement.removeEventListener('focus', handleFocus);
      };
    }
  }, [isMobile]);

  const validatePromoCode = async () => {
    setValidating(true);
    setError('');
    
    try {
      // Normalize code - trim and convert to lowercase
      const normalizedCode = code.trim().toLowerCase();
      
      // Fixed the generic type parameters here
      const { data, error } = await supabase.rpc('validate_promo_code', {
        _code: normalizedCode,
        _user_id: user?.id || '00000000-0000-0000-0000-000000000000',
        _order_amount: subtotal
      });

      if (error) throw error;
      
      if (Array.isArray(data) && data.length > 0) {
        const result = data[0] as PromoCodeValidationResult;
        
        if (result.valid) {
          // Determine which type of onApply we're dealing with
          if (typeof onApply === 'function' && onApply.length === 1) {
            // It's the string version from CartContent
            (onApply as (code: string) => Promise<void>)(normalizedCode);
          } else {
            // It's the object version from CartSummary
            (onApply as (promo: { code: string; discount: number; id: string }) => void)({
              code: normalizedCode,
              discount: result.discount,
              id: result.promo_id
            });
          }
          
          toast({
            title: "Promo code applied",
            description: result.message
          });
        } else {
          setError(result.message);
        }
      } else {
        setError('Invalid response from server');
      }
    } catch (error) {
      console.error('Error validating promo code:', error);
      setError('Failed to validate promo code');
    } finally {
      setValidating(false);
    }
  };

  const handleApplyPromoCode = () => {
    if (!code) {
      setError('Please enter a promo code');
      return;
    }

    validatePromoCode();
  };

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          type="text"
          placeholder="Promo code"
          value={code}
          onChange={handleCodeChange}
          disabled={validating}
          className="flex-1 h-11 border-gray-300 focus:border-food-red focus:ring-food-red"
        />
        <Button
          onClick={handleApplyPromoCode}
          disabled={validating}
          className="bg-food-red hover:bg-food-red/90 whitespace-nowrap h-11 px-6 font-semibold"
        >
          {validating ? 'Validating...' : 'Apply'}
        </Button>
      </div>
      {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
    </div>
  );
};

export default PromoCodeInput;
