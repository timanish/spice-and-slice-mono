
import React, { useMemo } from 'react';
import Navigation from '@/components/Navigation';
import Menu from '@/components/Menu';
import CallToAction from '@/components/CallToAction';
import Footer from '@/components/Footer';
import { useMenuItemFetcher } from '@/hooks/products/useProductFetcher';
import { MenuItem } from '@/hooks/products/types';

const MenuPage = () => {
  // Memoize the product fetcher hook to prevent unnecessary re-renders
  const { isLoading } = useMenuItemFetcher();

  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />
      <div className="py-8 bg-gray-50">
        <div className="container">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-center mb-4">Our Menu</h1>
          <p className="text-center max-w-2xl mx-auto mb-8 text-gray-600">
            Explore our diverse menu offerings, made with the freshest ingredients and crafted with care.
          </p>
        </div>
      </div>
      
      {isLoading ? (
        <div className="container py-12 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <Menu />
      )}
      
      <CallToAction />
      <Footer />
    </div>
  );
};

export default MenuPage;
