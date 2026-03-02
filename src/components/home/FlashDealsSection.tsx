import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Zap, Clock, ChevronLeft, ChevronRight, ShoppingCart, Flame, Plus, Minus, Weight } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useCartStore } from "@/stores/cart";
import { useUser, useClerk } from "@clerk/clerk-react";
import { useToast } from "@/hooks/use-toast";
import WeightedProductDialog from "@/components/product/WeightedProductDialog";
import { usePostHogTracking } from "@/hooks/usePostHogTracking";

interface FlashDeal {
  id: string;
  discount_percentage: number;
  end_date: string;
  products: {
    id: string;
    name: string;
    description: string;
    price_per_unit: number;
    inventory_count: number;
    image_url?: string;
    is_weighted?: boolean;
    unit_of_measure?: string;
    category?: string;
    brand?: string;
  };
}

const FlashDealsSection = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const items = useCartStore((state) => state.items);
  const addToCart = useCartStore((state) => state.addToCart);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeFromCart = useCartStore((state) => state.removeFromCart);
  const [dealTimers, setDealTimers] = useState<{ [key: string]: string }>({});
  const { isSignedIn } = useUser();
  const { redirectToSignIn } = useClerk();
  const { toast } = useToast();
  const { trackEvent } = usePostHogTracking();
  const [weightedProduct, setWeightedProduct] = useState<{
    id: string;
    name: string;
    price_per_unit: number;
    unit_of_measure?: string;
    image_url?: string;
  } | null>(null);
  const [isWeightDialogOpen, setIsWeightDialogOpen] = useState(false);
  const [pendingDealInfo, setPendingDealInfo] = useState<{
    discountPercentage: number;
    flashDealId: string;
  } | null>(null);
  
  const getCartItem = (productId: string) => {
    return items.find(item => item.product_id === productId);
  };

  const { data: flashDeals, isLoading } = useQuery({
    queryKey: ["flash-deals"],
    queryFn: async () => {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from("flash_deals")
        .select(`
          id,
          product_id,
          discount_percentage,
          start_date,
          end_date,
          is_active,
          products (
            id,
            name,
            description,
            price_per_unit,
            inventory_count,
            image_url,
            is_weighted,
            unit_of_measure,
            brand
          )
        `)
        .eq("is_active", true)
        .gte("end_date", now)
        .order("discount_percentage", { ascending: false });
      
      if (error) throw error;
      return data as unknown as FlashDeal[];
    },
  });

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 350;
      const newPosition = direction === 'left' 
        ? scrollContainerRef.current.scrollLeft - scrollAmount
        : scrollContainerRef.current.scrollLeft + scrollAmount;
      
      scrollContainerRef.current.scrollTo({
        left: newPosition,
        behavior: 'smooth'
      });
    }
  };

  const handleAddToCart = async (productId: string, discountPercentage: number, flashDealId: string, product?: FlashDeal['products']) => {
    if (!isSignedIn) {
      toast({
        title: "Please sign in",
        description: "You need to be logged in to add items to your cart",
      });
      redirectToSignIn();
      return;
    }
    
    if (product) {
      trackEvent('flash_deal_clicked', {
        product_id: product.id,
        product_name: product.name,
        discount_percentage: discountPercentage,
      });
    }
    
    // Check if product is weighted
    if (product?.is_weighted) {
      setWeightedProduct({
        id: product.id,
        name: product.name,
        price_per_unit: product.price_per_unit,
        unit_of_measure: product.unit_of_measure,
        image_url: product.image_url
      });
      setPendingDealInfo({ discountPercentage, flashDealId });
      setIsWeightDialogOpen(true);
      return;
    }
    
    await addToCart(productId, undefined, discountPercentage, flashDealId);
  };
  
  const handleAddWeightedToCart = async (productId: string, weight: number) => {
    if (pendingDealInfo) {
      await addToCart(productId, weight, pendingDealInfo.discountPercentage, pendingDealInfo.flashDealId);
    } else {
      await addToCart(productId, weight);
    }
    toast({
      title: "Added to cart",
      description: `${weight} ${weightedProduct?.unit_of_measure || 'lb'} added to your cart`,
    });
    setPendingDealInfo(null);
  };
  
  const handleIncrement = async (productId: string) => {
    if (!isSignedIn) {
      redirectToSignIn();
      return;
    }
    const cartItem = getCartItem(productId);
    if (cartItem) {
      await updateQuantity(productId, cartItem.quantity + 1);
    }
  };
  
  const handleDecrement = async (productId: string) => {
    if (!isSignedIn) {
      redirectToSignIn();
      return;
    }
    const cartItem = getCartItem(productId);
    if (cartItem) {
      if (cartItem.quantity === 1) {
        await removeFromCart(productId);
      } else {
        await updateQuantity(productId, cartItem.quantity - 1);
      }
    }
  };

  const calculateStockPercentage = (inventory: number) => {
    // Simulate stock urgency - show between 10-40% remaining
    const basePercentage = Math.min((inventory / 100) * 100, 100);
    return Math.max(10, Math.min(40, basePercentage));
  };

  useEffect(() => {
    if (!flashDeals || flashDeals.length === 0) return;

    const calculateTimeLeft = () => {
      const timers: { [key: string]: string } = {};
      flashDeals.forEach((deal) => {
        const now = new Date();
        const endDate = new Date(deal.end_date);
        const difference = endDate.getTime() - now.getTime();

        if (difference > 0) {
          const days = Math.floor(difference / (1000 * 60 * 60 * 24));
          const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
          const minutes = Math.floor((difference / 1000 / 60) % 60);

          if (days > 0) {
            timers[deal.id] = `${days}d ${hours}h`;
          } else if (hours > 0) {
            timers[deal.id] = `${hours}h ${minutes}m`;
          } else {
            timers[deal.id] = `${minutes}m`;
          }
        } else {
          timers[deal.id] = "Expired";
        }
      });
      setDealTimers(timers);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [flashDeals]);

  if (isLoading) {
    return (
      <section className="py-12 bg-gradient-to-br from-food-red/10 via-food-orange/5 to-transparent">
        <div className="container">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-gray-200 rounded w-64"></div>
            <div className="flex gap-4 overflow-hidden">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="min-w-[280px] h-[420px] bg-gray-200 rounded-2xl"></div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!flashDeals || flashDeals.length === 0) {
    return null;
  }

  return (
    <section className="py-12 bg-gradient-to-br from-food-red/10 via-food-orange/5 to-transparent relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-food-red/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-food-orange/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      
      <div className="container relative z-10">
        {/* Header with Global Countdown */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Flame className="h-10 w-10 text-food-red fill-food-red animate-pulse" />
              <Zap className="h-6 w-6 text-yellow-500 fill-yellow-500 absolute -top-1 -right-1 animate-bounce" />
            </div>
            <div>
              <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-food-red via-food-orange to-food-red bg-clip-text text-transparent">
                Flash Deals
              </h2>
              <p className="text-muted-foreground text-sm">Limited time! Grab them before they're gone</p>
            </div>
          </div>

          {/* Scroll Controls */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => scroll('left')}
              className="rounded-full shadow-md hover:shadow-lg transition-all hover:scale-105 hidden md:flex"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => scroll('right')}
              className="rounded-full shadow-md hover:shadow-lg transition-all hover:scale-105 hidden md:flex"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Horizontal Scroll Container */}
        <div 
          ref={scrollContainerRef}
          className="flex overflow-x-auto gap-6 pb-4 snap-x snap-mandatory scrollbar-hide scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {flashDeals.map((deal) => {
            const stockPercentage = calculateStockPercentage(deal.products.inventory_count);
            const originalPrice = deal.products.price_per_unit;
            const discountedPrice = originalPrice * (1 - deal.discount_percentage / 100);
            
            return (
              <div 
                key={deal.id}
                className="snap-start flex-shrink-0 w-[280px] md:w-[320px] relative group"
              >
                {/* Modern Product Card */}
                <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border-2 border-gray-100 hover:border-food-red/30 relative">
                  {/* Floating Countdown Bubble - Top Right */}
                  <div className="absolute -top-3 -right-3 z-20">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-food-red to-food-orange rounded-full blur-md opacity-70 animate-pulse"></div>
                      <div className="relative bg-gradient-to-r from-food-red to-food-orange text-white rounded-full p-3 shadow-xl border-4 border-white">
                        <Clock className="h-4 w-4 mb-1 mx-auto" />
                        <div className="text-xs font-bold text-center whitespace-nowrap">
                          {dealTimers[deal.id] || 'Loading...'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Discount Badge - Top Left */}
                  <div className="absolute top-3 left-3 z-20">
                    <Badge className="bg-food-red text-white px-3 py-1.5 text-base font-bold shadow-lg transform -rotate-3">
                      {deal.discount_percentage}% OFF
                    </Badge>
                  </div>

                  {/* Product Image */}
                  <Link to={`/products`}>
                    <div className="relative h-56 overflow-hidden bg-gray-100">
                      <img
                        src={deal.products.image_url || '/placeholder.svg'}
                        alt={deal.products.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    </div>
                  </Link>

                  {/* Stock Count */}
                  <div className="px-4 pt-3 pb-2">
                    <div className="flex items-center justify-center">
                      <span className="text-xs font-semibold text-food-red flex items-center gap-1">
                        <Flame className="h-3 w-3" />
                        Only {Math.max(3, Math.ceil(deal.products.inventory_count * 0.2))} left!
                      </span>
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="px-4 pb-4">
                    <Link to={`/products`}>
                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 hover:text-food-red transition-colors">
                        {deal.products.name}
                      </h3>
                    </Link>
                    
                    {/* Pricing */}
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-2xl font-bold text-food-red">
                        ${discountedPrice.toFixed(2)}
                      </span>
                      <span className="text-sm text-gray-400 line-through">
                        ${originalPrice.toFixed(2)}
                      </span>
                    </div>

                    {/* Urgency Text */}
                    <p className="text-xs text-food-orange font-semibold mb-3 flex items-center gap-1">
                      <Zap className="h-3 w-3 fill-food-orange" />
                      Hurry! Selling Out Fast
                    </p>

                    {/* Add to Cart Button or Quantity Controls */}
                    {getCartItem(deal.products.id) ? (
                      deal.products.is_weighted ? (
                        <Badge variant="outline" className="w-full justify-center py-2">
                          <Weight className="h-4 w-4 mr-1" />
                          {getCartItem(deal.products.id)?.weight || 0} {deal.products.unit_of_measure || 'lb'} in cart
                        </Badge>
                      ) : (
                        <div className="flex items-center justify-between bg-gradient-to-r from-food-red/10 to-food-orange/10 rounded-lg p-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDecrement(deal.products.id)}
                            className="h-8 w-8 p-0 text-food-red hover:bg-food-red/20"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <div className="flex flex-col items-center">
                            <span className="text-xs text-muted-foreground">In Cart</span>
                            <span className="text-food-red font-bold text-lg">
                              {getCartItem(deal.products.id)?.quantity}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleIncrement(deal.products.id)}
                            className="h-8 w-8 p-0 text-food-red hover:bg-food-red/20"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      )
                    ) : (
                      <Button 
                        onClick={() => handleAddToCart(deal.products.id, deal.discount_percentage, deal.id, deal.products)}
                        className="w-full bg-gradient-to-r from-food-red to-food-orange hover:from-food-red/90 hover:to-food-orange/90 text-white shadow-md hover:shadow-lg transition-all group/btn"
                      >
                        <ShoppingCart className="h-4 w-4 mr-2 group-hover/btn:animate-bounce" />
                        Add to Cart
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <WeightedProductDialog
        product={weightedProduct}
        isOpen={isWeightDialogOpen}
        onOpenChange={setIsWeightDialogOpen}
        onAddToCart={handleAddWeightedToCart}
      />
    </section>
  );
};

export default FlashDealsSection;