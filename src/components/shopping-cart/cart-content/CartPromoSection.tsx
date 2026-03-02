
import React, { useEffect, useRef } from 'react';
import PromoCodeInput from '../PromoCodeInput';
import { usePromoCode } from './usePromoCode';
import ProfileWarning from './ProfileWarning';
import { useIsMobile } from '@/hooks/use-mobile';

interface CartPromoSectionProps {
  subtotal: number;
  onApplyPromo: (code: string) => Promise<void>;
  showProfileWarning: boolean;
}

const CartPromoSection: React.FC<CartPromoSectionProps> = ({ 
  subtotal, 
  onApplyPromo,
  showProfileWarning
}) => {
  const { promoCode, setPromoCode, handleApplyPromoCode } = usePromoCode({
    subtotal,
    onApplyPromo
  });
  
  const sectionRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  
  // Ensure this section is visible when needed on mobile
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting && isMobile) {
          // If section is out of view on mobile, we might need to scroll it into view
          // This helps when keyboard appears and pushes content up
          const scrollHandler = () => {
            if (sectionRef.current && document.activeElement instanceof HTMLInputElement) {
              if (sectionRef.current.contains(document.activeElement)) {
                sectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }
          };
          
          window.addEventListener('resize', scrollHandler);
          return () => {
            window.removeEventListener('resize', scrollHandler);
          };
        }
      },
      { threshold: 0.1 }
    );
    
    const currentSection = sectionRef.current;
    if (currentSection) {
      observer.observe(currentSection);
    }
    
    return () => {
      if (currentSection) {
        observer.unobserve(currentSection);
      }
    };
  }, [isMobile]);
  
  return (
    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200" ref={sectionRef}>
      <PromoCodeInput
        promoCode={promoCode}
        onChange={setPromoCode}
        onApply={handleApplyPromoCode}
        subtotal={subtotal}
      />
      
      <ProfileWarning showWarning={showProfileWarning} />
    </div>
  );
};

export default CartPromoSection;
