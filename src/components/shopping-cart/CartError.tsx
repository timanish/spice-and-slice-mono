
import React from 'react';
import { RefreshCw, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface CartErrorProps {
  errorMessage: string | null;
  retryFetch: () => void;
  isRateLimited?: boolean;
}

const CartError = ({ errorMessage, retryFetch, isRateLimited = false }: CartErrorProps) => {
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>
        {isRateLimited ? "Rate limit exceeded" : "Error loading cart"}
      </AlertTitle>
      <AlertDescription>
        {isRateLimited 
          ? "Too many requests. Please wait a moment before trying again." 
          : errorMessage || "Something went wrong loading your cart"}
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-2 w-full"
          onClick={retryFetch}
          disabled={isRateLimited}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          {isRateLimited ? "Please wait..." : "Try Again"}
        </Button>
      </AlertDescription>
    </Alert>
  );
};

export default CartError;
