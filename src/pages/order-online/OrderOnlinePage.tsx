
import React from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import OrderTabs from './OrderTabs';
import PageHeader from './PageHeader';

const OrderOnlinePage = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />
      <PageHeader />
      <div className="container py-8">
        <OrderTabs />
      </div>
      <Footer />
    </div>
  );
};

export default OrderOnlinePage;
