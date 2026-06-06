
interface ProfileTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const ProfileTabs = ({ activeTab, setActiveTab }: ProfileTabsProps) => {
  return (
    <div className="flex space-x-2 mb-6 border-b">
      <button
        onClick={() => setActiveTab('profile')}
        className={`pb-2 px-4 ${activeTab === 'profile' 
          ? 'border-b-2 border-primary font-medium' 
          : 'text-gray-500'}`}
      >
        Profile
      </button>
      <button
        onClick={() => setActiveTab('orders')}
        className={`pb-2 px-4 ${activeTab === 'orders' 
          ? 'border-b-2 border-primary font-medium' 
          : 'text-gray-500'}`}
      >
        Order History
      </button>
      <button
        onClick={() => setActiveTab('subscription')}
        className={`pb-2 px-4 ${activeTab === 'subscription' 
          ? 'border-b-2 border-primary font-medium' 
          : 'text-gray-500'}`}
      >
        Lunch Box Subscription
      </button>
      <button
        onClick={() => setActiveTab('catering')}
        className={`pb-2 px-4 ${activeTab === 'catering' 
          ? 'border-b-2 border-primary font-medium' 
          : 'text-gray-500'}`}
      >
        Catering Requests
      </button>
    </div>
  );
};

export default ProfileTabs;
