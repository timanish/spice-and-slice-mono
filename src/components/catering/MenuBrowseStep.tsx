import React, { useState, useMemo, useRef, useEffect } from 'react';
import MenuItemCard from './MenuItemCard';
import CategoryTabs from './CategoryTabs';
import EventSummarySidebar from './EventSummarySidebar';
import EventSummaryBottomSheet from './EventSummaryBottomSheet';
import { SelectedMenuItem } from './types';
import { useMenuItemFetcher } from '@/hooks/products/useProductFetcher';
import { MenuItem } from '@/hooks/products/types';
import { Loader2, ArrowLeft } from 'lucide-react';

interface MenuBrowseStepProps {
  guestCount: number;
  selectedItems: SelectedMenuItem[];
  onUpdateItems: (items: SelectedMenuItem[]) => void;
  onProceedToDetails: () => void;
  onBack?: () => void;
}

const MenuBrowseStep: React.FC<MenuBrowseStepProps> = ({
  guestCount,
  selectedItems,
  onUpdateItems,
  onProceedToDetails,
  onBack
}) => {
  const { data: menuItems, isLoading } = useMenuItemFetcher();
  const [activeCategory, setActiveCategory] = useState<string>('');
  const categoryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Group menu items by category
  const groupedItems = useMemo(() => {
    if (!menuItems) return {};
    
    const grouped = menuItems.reduce((acc, item) => {
      const categoryName = item.category?.name || 'Uncategorized';
      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }
      acc[categoryName].push(item);
      return acc;
    }, {} as { [key: string]: MenuItem[] });

    return grouped;
  }, [menuItems]);

  const categories = useMemo(() => 
    Object.keys(groupedItems).filter(cat => cat && cat !== 'undefined'), 
    [groupedItems]
  );

  // Set first category as active on load
  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0]);
    }
  }, [categories, activeCategory]);

  // Handle category change with smooth scroll
  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    const element = categoryRefs.current[category];
    if (element) {
      const offset = 150; // Account for sticky header
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({
        top: elementPosition - offset,
        behavior: 'smooth'
      });
    }
  };

  // Track scroll position to update active category
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200;
      
      for (const category of categories) {
        const element = categoryRefs.current[category];
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveCategory(category);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [categories]);

  const getItemQuantity = (itemId: string): number => {
    const found = selectedItems.find(item => item.menuItem.id === itemId);
    return found ? found.quantity : 0;
  };

  const handleAddItem = (menuItem: MenuItem) => {
    const existingIndex = selectedItems.findIndex(item => item.menuItem.id === menuItem.id);
    
    if (existingIndex >= 0) {
      const updated = [...selectedItems];
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: updated[existingIndex].quantity + 1
      };
      onUpdateItems(updated);
    } else {
      onUpdateItems([...selectedItems, { menuItem, quantity: 1 }]);
    }
  };

  const handleIncreaseItem = (menuItem: MenuItem) => {
    const updated = selectedItems.map(item =>
      item.menuItem.id === menuItem.id
        ? { ...item, quantity: item.quantity + 1 }
        : item
    );
    onUpdateItems(updated);
  };

  const handleDecreaseItem = (menuItem: MenuItem) => {
    const existingItem = selectedItems.find(item => item.menuItem.id === menuItem.id);
    
    if (existingItem && existingItem.quantity > 1) {
      const updated = selectedItems.map(item =>
        item.menuItem.id === menuItem.id
          ? { ...item, quantity: item.quantity - 1 }
          : item
      );
      onUpdateItems(updated);
    } else {
      handleRemoveItem(menuItem.id);
    }
  };

  const handleRemoveItem = (itemId: string) => {
    onUpdateItems(selectedItems.filter(item => item.menuItem.id !== itemId));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-[#8B0000]" />
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-gray-50 to-white min-h-screen">
      {/* Back Button */}
      {onBack && (
        <div className="container mx-auto px-4 pt-6">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Guest Count
          </button>
        </div>
      )}

      {/* Category Navigation */}
      <CategoryTabs
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
      />

      {/* Main Content Area */}
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Menu Items - Left/Main Section */}
          <div className="lg:col-span-2">
            {categories.map((category) => (
              <div
                key={category}
                ref={(el) => (categoryRefs.current[category] = el)}
                className="mb-16"
              >
                {/* Category Header */}
                <div className="mb-8">
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
                    {category}
                  </h2>
                  <p className="text-gray-600 text-base">
                    {groupedItems[category]?.length || 0} items available for catering
                  </p>
                  <div className="h-1 w-20 bg-[#8B0000] mt-4 rounded-full"></div>
                </div>

                {/* Items Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {groupedItems[category]?.map((item) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      quantity={getItemQuantity(item.id)}
                      guestCount={guestCount}
                      onAdd={() => handleAddItem(item)}
                      onIncrease={() => handleIncreaseItem(item)}
                      onDecrease={() => handleDecreaseItem(item)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Event Summary - Right Sidebar (Desktop Only) */}
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <EventSummarySidebar
                selectedItems={selectedItems}
                guestCount={guestCount}
                onRemoveItem={handleRemoveItem}
                onProceedToDetails={onProceedToDetails}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sheet (Mobile Only) */}
      <EventSummaryBottomSheet
        selectedItems={selectedItems}
        guestCount={guestCount}
        onRemoveItem={handleRemoveItem}
        onProceedToDetails={onProceedToDetails}
      />
    </div>
  );
};

export default MenuBrowseStep;
