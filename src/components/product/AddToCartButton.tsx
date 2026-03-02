
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingCart } from "lucide-react";

interface AddToCartButtonProps {
  isDisabled: boolean;
  isLoading: boolean;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
  showIcon?: boolean;
}

const AddToCartButton = ({ 
  isDisabled, 
  isLoading, 
  label, 
  onClick,
  variant = 'default',
  size = 'default',
  showIcon = true
}: AddToCartButtonProps) => {
  return (
    <Button 
      onClick={onClick}
      disabled={isDisabled}
      variant={variant}
      size={size}
      className="w-full"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Adding...
        </>
      ) : (
        <>
          {showIcon && <ShoppingCart className="mr-2 h-4 w-4" />}
          {label}
        </>
      )}
    </Button>
  );
};

export default AddToCartButton;
