
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import ProfileForm from '@/components/profile/ProfileForm';
import OrderHistory from '@/components/profile/OrderHistory';
import ProfileTabs from '@/components/profile/ProfileTabs';
import ProfileLoading from '@/components/profile/ProfileLoading';
import LunchBoxSubscriptionCard from '@/components/profile/LunchBoxSubscriptionCard';
import CateringRequests from '@/components/profile/CateringRequests';
import AddressManagement from '@/components/profile/AddressManagement';
import { useProfileData } from '@/hooks/useProfileData';
import { useOrderHistory } from '@/hooks/useOrderHistory';
import { usePostHogTracking } from '@/hooks/usePostHogTracking';

const ProfilePage = () => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'orders', 'subscription', or 'catering'
  const { trackEvent } = usePostHogTracking();
  
  const { profile, loading: profileLoading } = useProfileData();
  const { orders, loading: ordersLoading } = useOrderHistory(activeTab);
  
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['profile', 'orders', 'subscription', 'catering'].includes(tab)) {
      if (activeTab !== tab) {
        trackEvent('profile_tab_changed', {
          from_tab: activeTab,
          to_tab: tab,
        });
      }
      setActiveTab(tab);
    }
  }, [searchParams, activeTab, trackEvent]);
  
  // Track order history view
  useEffect(() => {
    if (activeTab === 'orders' && orders && !ordersLoading) {
      trackEvent('order_history_viewed', {
        orders_count: orders.length,
      });
    }
  }, [activeTab, orders, ordersLoading, trackEvent]);
  
  if ((activeTab === 'profile' && profileLoading) || 
      (activeTab === 'orders' && ordersLoading)) {
    return <ProfileLoading />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <div className="container max-w-5xl py-8 flex-1">
        <h1 className="text-3xl font-bold mb-8">My Account</h1>
        
        <ProfileTabs activeTab={activeTab} setActiveTab={setActiveTab} />
        
        {activeTab === 'profile' ? (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
              <ProfileForm initialProfile={profile} />
            </div>
            <div>
              <AddressManagement />
            </div>
          </div>
        ) : activeTab === 'orders' ? (
          <OrderHistory orders={orders} />
        ) : activeTab === 'subscription' ? (
          <LunchBoxSubscriptionCard />
        ) : (
          <CateringRequests />
        )}
      </div>
      <Footer />
    </div>
  );
};

export default ProfilePage;
