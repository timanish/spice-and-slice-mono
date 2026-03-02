
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DirectOrderTab from './DirectOrderTab';
import DeliveryPlatformsTab from './DeliveryPlatformsTab';

const OrderTabs = () => {
  return (
    <Tabs defaultValue="direct" className="w-full">
      <TabsList className="mb-8 mx-auto flex justify-center">
        <TabsTrigger value="direct" className="text-lg px-6">Order Directly</TabsTrigger>
        <TabsTrigger value="platforms" className="text-lg px-6">Delivery Platforms</TabsTrigger>
      </TabsList>
      
      <TabsContent value="direct">
        <DirectOrderTab />
      </TabsContent>
      
      <TabsContent value="platforms">
        <DeliveryPlatformsTab />
      </TabsContent>
    </Tabs>
  );
};

export default OrderTabs;
