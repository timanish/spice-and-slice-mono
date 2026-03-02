
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

const DeliveryAddressInfo: React.FC = () => {
  // Hardcoded delivery information
  const storeAddress = "Spice & Slice Bazaar, 7451 N Beach St #172, Fort Worth, TX 76137";
  
  return (
    <Card className="bg-muted/30">
      <CardContent className="pt-6">
        <div className="mb-4">
          <h3 className="text-lg font-medium mb-2">Delivery Information</h3>
          
          <div className="space-y-3">
            <div className="flex items-start">
              <div className="bg-primary/10 text-primary p-1 rounded-md mr-3 mt-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">From:</p>
                <p className="font-medium">{storeAddress}</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-accent/20 text-accent-foreground p-1 rounded-md mr-3 mt-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">To:</p>
                <p className="text-sm text-muted-foreground">
                  Please select a delivery address at checkout
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground mt-4 pt-2 border-t border-border">
          <p>Estimated delivery time: 30-45 minutes (varies by location)</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DeliveryAddressInfo;
