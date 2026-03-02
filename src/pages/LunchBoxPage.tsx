
import { useState } from 'react';
import { useUser as useClerkUser, useClerk } from '@clerk/clerk-react';
import { useQuery } from '@tanstack/react-query';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, CheckCircle, Utensils, ArrowRight, Loader2 } from 'lucide-react';
import LunchBoxSubscriptionForm from '@/components/lunchbox/LunchBoxSubscriptionForm';
import SubscriptionDashboard from '@/components/lunchbox/SubscriptionDashboard';
import { useLunchBoxSubscription } from '@/hooks/useLunchBoxSubscription';
import { supabase } from '@/integrations/supabase/client';

const LunchBoxPage = () => {
  const { user, isSignedIn } = useClerkUser();
  const { openSignIn } = useClerk();
  const [showSubscriptionForm, setShowSubscriptionForm] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  // Fetch user's active subscription
  const { data: subscription, isLoading: isLoadingSubscription } = useLunchBoxSubscription(user?.id);

  const handleSubscribeClick = () => {
    if (!isSignedIn || !user) {
      // Open Clerk sign-in modal
      openSignIn();
      return;
    }
    setShowSubscriptionForm(true);
  };

  // Fetch lunch box eligible menu items from database
  const { data: menuItems = [], isLoading } = useQuery({
    queryKey: ['lunchBoxMenuItems'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('lunch_box_eligible', true)
        .order('name');

      if (error) throw error;
      return data || [];
    },
  });

  // Show loading state while checking subscription
  if (isSignedIn && isLoadingSubscription) {
    return (
      <div className="flex flex-col min-h-screen bg-white">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-[#8B1A1A] mx-auto" />
            <p className="text-gray-600">Loading your subscription...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // If user has active or paused subscription, show dashboard
  if (subscription && (subscription.status === 'active' || subscription.status === 'paused')) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Navigation />
        <main className="flex-1">
          <SubscriptionDashboard subscription={subscription} />
        </main>
        <Footer />
      </div>
    );
  }

  // Default: Show marketing page for new users or those without active subscriptions
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navigation />

      <main className="flex-1">
        {/* Hero Section - Split Screen Design */}
        <section className="relative bg-gradient-to-br from-[#FFF0E8] to-[#FFFAF5] overflow-hidden">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 min-h-[600px] lg:min-h-[700px] items-center py-16 lg:py-0">
              {/* Left Column - Text Content */}
              <div className="flex flex-col justify-center space-y-8 lg:space-y-10 z-10">
                <div className="space-y-6">
                  <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-bold text-[#3E1F1F] leading-tight">
                    Lunch Box Delivery Program
                  </h1>
                  <p className="text-xl md:text-2xl text-gray-600 max-w-lg leading-relaxed">
                    Enjoy fresh, healthy lunches delivered to your office Monday through Friday.
                    Choose from our curated selection of delicious meals, delivered hot between 12-1 PM.
                  </p>
                </div>

                <Button
                  onClick={handleSubscribeClick}
                  size="lg"
                  className="bg-[#8B1A1A] hover:bg-[#8B1A1A]/90 text-white rounded-full h-16 px-10 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 w-fit"
                >
                  {user ? 'Subscribe Now' : 'Get Started - Sign Up'}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>

              {/* Right Column - Hero Image */}
              <div className="relative lg:absolute lg:right-0 lg:top-0 lg:h-full lg:w-1/2 flex items-center justify-center lg:justify-end">
                <div className="relative w-full max-w-lg lg:max-w-none lg:w-[110%] lg:-mr-[10%]">
                  <img
                    src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&h=1200&fit=crop"
                    alt="Fresh lunch box"
                    className="rounded-3xl lg:rounded-none object-cover w-full h-[400px] lg:h-[700px] shadow-2xl"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works - Visual Simplification */}
        <section className="py-20 lg:py-32 bg-white">
          <div className="container mx-auto px-4 max-w-6xl">
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-[#3E1F1F] text-center mb-16 lg:mb-24">
              How It Works
            </h2>

            <div className="grid md:grid-cols-3 gap-12 lg:gap-16 relative">
              {/* Connecting Line - Desktop Only */}
              <div className="hidden md:block absolute top-16 left-[16.666%] right-[16.666%] h-0.5 border-t-2 border-dashed border-[#E5C4B0]" />

              {[
                {
                  icon: Calendar,
                  number: "1",
                  title: "Choose Your Plan",
                  description: "Select weekly or monthly subscription that works best for you"
                },
                {
                  icon: Utensils,
                  number: "2",
                  title: "We Prepare Fresh",
                  description: "Our chefs prepare your meals daily with fresh, locally-sourced ingredients"
                },
                {
                  icon: Clock,
                  number: "3",
                  title: "Delivered Hot",
                  description: "Enjoy hot, delicious lunch delivered between 12:00 - 1:00 PM"
                }
              ].map((step, index) => (
                <div key={index} className="text-center relative">
                  {/* Icon Circle */}
                  <div className="relative inline-block mb-8">
                    <div className="w-32 h-32 rounded-full bg-[#FFF8F0] flex items-center justify-center relative z-10">
                      <step.icon className="h-12 w-12 text-[#D94A4A] stroke-[3px]" />
                    </div>
                    <span className="absolute -top-2 -left-2 w-8 h-8 bg-[#8B1A1A] text-white rounded-full flex items-center justify-center text-sm font-serif font-bold">
                      {step.number}
                    </span>
                  </div>

                  <h3 className="text-2xl font-serif font-semibold text-[#3E1F1F] mb-4">
                    {step.title}
                  </h3>
                  <p className="text-base text-gray-600 leading-relaxed max-w-xs mx-auto">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Sample Menu - Card Grid System */}
        <section className="py-20 lg:py-32 bg-[#FFFAF5]">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-serif font-bold text-[#3E1F1F] mb-6">
                Sample Weekly Menu
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Our menu rotates weekly with fresh, seasonal options
              </p>
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-gray-600">Loading menu items...</p>
              </div>
            ) : menuItems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">No menu items available yet. Check back soon!</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {menuItems.slice(0, 6).map((item, index) => (
                  <div
                    key={item.id}
                    className="group relative bg-white rounded-3xl overflow-hidden shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.12)] transition-all duration-300 hover:-translate-y-2 cursor-pointer"
                    onMouseEnter={() => setHoveredCard(index)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    {/* Image Section */}
                    <div className={`relative overflow-hidden transition-all duration-300 ${hoveredCard === index ? 'h-40' : 'h-60'}`}>
                      <img
                        src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop'}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/20 to-transparent" />
                    </div>

                    {/* Content Section */}
                    <div className="p-6">
                      <h3 className="text-2xl font-serif font-semibold text-[#3E1F1F] mb-3">
                        {item.name}
                      </h3>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                          {item.category}
                        </Badge>
                        {item.is_vegetarian && (
                          <Badge variant="outline" className="rounded-full px-3 py-1 text-xs text-green-600 border-green-300">
                            Veg
                          </Badge>
                        )}
                        {item.spice_level && item.spice_level > 0 && (
                          <Badge variant="outline" className="rounded-full px-3 py-1 text-xs text-red-600 border-red-300">
                            Spicy
                          </Badge>
                        )}
                      </div>

                      {/* Hover Content */}
                      <div className={`transition-all duration-300 ${hoveredCard === index ? 'opacity-100 max-h-40' : 'opacity-0 max-h-0 overflow-hidden'}`}>
                        <div className="border-t border-gray-200 pt-4 mt-2">
                          {item.ingredients && (
                            <p className="text-sm text-gray-600 mb-3 flex items-start">
                              <Utensils className="h-4 w-4 mr-2 mt-0.5 text-[#D94A4A] flex-shrink-0" />
                              <span>{item.ingredients}</span>
                            </p>
                          )}
                          <p className="text-sm text-gray-500 leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Program Benefits & Pricing */}
        <section className="py-20 lg:py-32 bg-white">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 mb-20">
              {/* Program Benefits */}
              <div>
                <h3 className="text-3xl font-serif font-bold text-[#3E1F1F] mb-8">
                  Program Benefits
                </h3>
                <div className="space-y-4">
                  {[
                    "Monday-Friday delivery schedule",
                    "Fresh, locally-sourced ingredients",
                    "Vegetarian and dietary options available",
                    "Flexible subscription management",
                    "Eco-friendly packaging",
                    "No delivery fees for subscribers"
                  ].map((benefit, index) => (
                    <div key={index} className="flex items-center group">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mr-4 group-hover:bg-green-500 transition-colors duration-200">
                        <CheckCircle className="h-4 w-4 text-green-600 group-hover:text-white transition-colors duration-200" />
                      </div>
                      <span className="text-base text-gray-700">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Details */}
              <div>
                <h3 className="text-3xl font-serif font-bold text-[#3E1F1F] mb-8">
                  Delivery Details
                </h3>
                <div className="bg-white rounded-2xl border border-gray-200 p-8 space-y-5">
                  <div className="flex justify-between items-center pb-5 border-b border-gray-100">
                    <span className="text-gray-600 font-medium">Delivery Time:</span>
                    <span className="text-gray-900 font-semibold">12:00 PM - 1:00 PM</span>
                  </div>
                  <div className="flex justify-between items-center pb-5 border-b border-gray-100">
                    <span className="text-gray-600 font-medium">Delivery Days:</span>
                    <span className="text-gray-900 font-semibold">Monday - Friday</span>
                  </div>
                  <div className="flex justify-between items-center pb-5 border-b border-gray-100">
                    <span className="text-gray-600 font-medium">Price per Meal:</span>
                    <span className="text-[#8B1A1A] font-bold text-xl">$12.99</span>
                  </div>
                  <div className="flex justify-between items-center pb-5 border-b border-gray-100">
                    <span className="text-gray-600 font-medium">Weekly Subscription:</span>
                    <span className="text-[#8B1A1A] font-bold text-xl">$59.99</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium">Monthly Subscription:</span>
                    <span className="text-[#8B1A1A] font-bold text-xl">$199.99</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing Plans - 2 Card Comparison */}
            <div>
              <h2 className="text-4xl md:text-5xl font-serif font-bold text-[#3E1F1F] text-center mb-16">
                Choose Your Plan
              </h2>

              <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {/* Weekly Plan */}
                <div className="bg-white rounded-2xl border-2 border-gray-200 p-10 flex flex-col">
                  <h3 className="text-2xl font-serif font-semibold text-[#3E1F1F] mb-6">
                    Weekly Plan
                  </h3>

                  <div className="mb-8 pb-8 border-b border-gray-200">
                    <div className="flex items-baseline mb-2">
                      <span className="text-5xl font-bold text-gray-900">$59.99</span>
                      <span className="text-gray-500 ml-2">/week</span>
                    </div>
                    <p className="text-sm text-gray-600">($12.99 per meal)</p>
                  </div>

                  <div className="space-y-4 mb-10 flex-grow">
                    {[
                      "5 lunches delivered",
                      "Monday through Friday",
                      "Cancel anytime",
                      "Flexible scheduling"
                    ].map((feature, index) => (
                      <div key={index} className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={handleSubscribeClick}
                    variant="outline"
                    className="w-full h-14 rounded-full border-2 border-[#8B1A1A] text-[#8B1A1A] hover:bg-[#8B1A1A] hover:text-white font-semibold text-base transition-all duration-300"
                  >
                    Subscribe Weekly
                  </Button>
                </div>

                {/* Monthly Plan - Highlighted */}
                <div className="relative bg-[#FFF5F5] rounded-2xl border-2 border-[#D94A4A] p-10 flex flex-col shadow-[0_0_0_4px_rgba(217,74,74,0.1)]">
                  {/* Best Value Badge */}
                  <div className="absolute -top-3 right-6">
                    <Badge className="bg-[#8B1A1A] text-white px-4 py-1.5 rounded-full text-xs font-semibold shadow-lg">
                      BEST VALUE
                    </Badge>
                  </div>

                  <h3 className="text-2xl font-serif font-semibold text-[#3E1F1F] mb-6">
                    Monthly Plan
                  </h3>

                  <div className="mb-8 pb-8 border-b border-[#D94A4A]/20">
                    <div className="flex items-baseline mb-2">
                      <span className="text-5xl font-bold text-gray-900">$199.99</span>
                      <span className="text-gray-500 ml-2">/month</span>
                    </div>
                    <p className="text-sm text-green-600 font-semibold">(15% savings!)</p>
                  </div>

                  <div className="space-y-4 mb-10 flex-grow">
                    {[
                      "20+ lunches per month",
                      "Priority delivery",
                      "No commitment required",
                      "Maximum flexibility"
                    ].map((feature, index) => (
                      <div key={index} className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={handleSubscribeClick}
                    className="w-full h-14 rounded-full bg-[#8B1A1A] hover:bg-[#8B1A1A]/90 text-white font-bold text-base shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                  >
                    Subscribe Monthly
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Subscription Form Modal */}
        {showSubscriptionForm && user && (
          <LunchBoxSubscriptionForm
            isOpen={showSubscriptionForm}
            onClose={() => setShowSubscriptionForm(false)}
          />
        )}
      </main>

      {/* Mobile Sticky CTA Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] p-4 z-50 safe-area-inset-bottom">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-600">From</p>
            <p className="text-xl font-bold text-[#8B1A1A]">$59.99/week</p>
          </div>
          <Button
            onClick={handleSubscribeClick}
            className="flex-1 h-12 rounded-full bg-[#8B1A1A] hover:bg-[#8B1A1A]/90 text-white font-semibold shadow-lg"
          >
            Subscribe Now
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default LunchBoxPage;
