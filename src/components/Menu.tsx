
import React, { useState, useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMenuItemFetcher } from '@/hooks/products/useProductFetcher';
import type { MenuItem } from '@/hooks/products/types';

interface GroupedMenuItems {
  [key: string]: MenuItem[];
}

const MenuItemComponent = ({ item }: { item: MenuItem }) => (
  <div className="flex justify-between items-center p-4 border-b last:border-0">
    <div>
      <div className="flex items-center gap-2">
        <h4 className="font-medium">{item.name}</h4>
        {item.is_spicy && <span className="text-xs bg-food-red text-white px-1 rounded">Spicy</span>}
        {item.is_vegetarian && <span className="text-xs bg-food-green text-white px-1 rounded">Vegetarian</span>}
      </div>
      <p className="text-sm text-gray-600 mt-1">{item.description}</p>
    </div>
    <div className="font-semibold">${item.price.toFixed(2)}</div>
  </div>
);

const MenuComponent = () => {
  const { data: menuItems = [], isLoading: loading } = useMenuItemFetcher();
  const [activeTab, setActiveTab] = useState("");
  const categories = useMemo(() => {
    return Array.from(new Set(menuItems.map(item => item.category?.name).filter(Boolean))) as string[];
  }, [menuItems]);
  
  useEffect(() => {
    if (categories.length > 0 && !activeTab) {
      setActiveTab(categories[0]);
    }
  }, [categories, activeTab]);
  
  const groupedMenuItems: GroupedMenuItems = useMemo(() => {
    return menuItems.reduce((acc, item) => {
      const cat = item.category?.name || 'Other';
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(item);
      return acc;
    }, {} as GroupedMenuItems);
  }, [menuItems]);
  
  return (
    <div className="container py-12">
      <h2 className="text-3xl md:text-4xl font-serif font-bold text-center mb-4">Our Menu</h2>
      <p className="text-center max-w-2xl mx-auto mb-8 text-gray-600">
        Authentic Indo-Nepali cuisine prepared with the freshest ingredients and traditional spices.
      </p>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Menu items are currently unavailable. Please check back later.
        </div>
      ) : (
        <Tabs defaultValue={categories[0]} value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap justify-center mb-8">
            {categories.map((category) => (
              <TabsTrigger 
                key={category} 
                value={category}
                className="px-6 py-3 data-[state=active]:bg-food-red data-[state=active]:text-white"
              >
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {categories.map((category) => (
            <TabsContent key={category} value={category}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-center text-2xl font-serif">{category}</CardTitle>
                  <CardDescription className="text-center">
                    {category === "Appetizers" && "Flavorful starters to begin your meal"}
                    {category === "Tandoori" && "Marinated and cooked in our traditional clay oven"}
                    {category === "Curries" && "Rich and aromatic curry dishes with your choice of protein"}
                    {category === "Nepali" && "Authentic Himalayan and Nepali specialties"}
                    {category === "Biryani" && "Fragrant rice dishes with your choice of protein"}
                    {category === "Breads" && "Freshly baked breads and traditional sides"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md">
                    {groupedMenuItems[category]?.map((item) => (
                      <MenuItemComponent key={item.id} item={item} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
};

export default MenuComponent;
