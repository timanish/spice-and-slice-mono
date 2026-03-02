
import React from 'react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CreditCard, Banknote } from "lucide-react";

interface PaymentMethodSelectorProps {
  paymentMethod: 'card' | 'cash';
  setPaymentMethod: (method: 'card' | 'cash') => void;
}

const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({ 
  paymentMethod, 
  setPaymentMethod 
}) => {
  return (
    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
      <h3 className="font-semibold text-gray-900 mb-3">Payment Method</h3>
      <RadioGroup 
        value={paymentMethod} 
        onValueChange={(value) => setPaymentMethod(value as 'card' | 'cash')}
        className="space-y-3"
      >
        <div className="flex items-center space-x-3 p-3 border rounded-lg bg-white hover:bg-gray-50 cursor-pointer transition-colors">
          <RadioGroupItem value="card" id="card" />
          <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer flex-1">
            <CreditCard className="w-5 h-5 text-gray-600" />
            <span className="font-medium">Credit Card</span>
          </Label>
        </div>
        <div className="flex items-center space-x-3 p-3 border rounded-lg bg-white hover:bg-gray-50 cursor-pointer transition-colors">
          <RadioGroupItem value="cash" id="cash" />
          <Label htmlFor="cash" className="flex items-center gap-2 cursor-pointer flex-1">
            <Banknote className="w-5 h-5 text-gray-600" />
            <span className="font-medium">Cash on Delivery</span>
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
};

export default PaymentMethodSelector;
