import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ProductCard from "@/components/ProductCard";
import { Star, TrendingUp, ChevronLeft, ChevronRight, Plus, Minus, ShoppingCart, Weight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRef, useState } from "react";
import { useCartStore } from "@/stores/cart";
import { useUser, useClerk } from "@clerk/clerk-react";
import { useToast } from "@/hooks/use-toast";
import WeightedProductDialog from "@/components/product/WeightedProductDialog";
import { usePostHogTracking } from "@/hooks/usePostHogTracking";

interface FeaturedProduct {
  product_id: string;
  products: {
    id: string;
    name: string;
    description: string;
    price_per_unit: number;
    inventory_count: number;
    image_url?: string;
    is_weighted?: boolean;
    unit_of_measure?: string;
    category_id?: string;
    brand?: string;
  };
}

const FeaturedProductsSection = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const items = useCartStore((state) => state.items);
  const addToCart = useCartStore((state) => state.addToCart);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeFromCart = useCartStore((state) => state.removeFromCart);
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
  
  const getCartItem = (productId: string) => {
    return items.find(item => item.product_id === productId);
  };
  
  const handleAddToCart = async (productId: string, product?: FeaturedProduct['products']) => {
    if (!isSignedIn) {
      toast({
        title: "Please sign in",
        description: "You need to be logged in to add items to your cart",
      });
      redirectToSignIn();
      return;
    }
    
    // Track featured product click
    if (product) {
      trackEvent('featured_product_clicked', {
        product_id: product.id,
        product_name: product.name,
        section: 'featured',
      });
    }
    
    if (product?.is_weighted) {
      setWeightedProduct({
        id: product.id,
        name: product.name,
        price_per_unit: product.price_per_unit,
        unit_of_measure: product.unit_of_measure,
        image_url: product.image_url
      });
      setIsWeightDialogOpen(true);
      return;
    }
    
    await addToCart(productId, undefined, undefined, undefined, product ? {
      name: product.name,
      price_per_unit: product.price_per_unit,
      is_weighted: product.is_weighted,
      unit_of_measure: product.unit_of_measure,
      image_url: product.image_url,
      category: product.category,
    } : undefined);
  };

  const handleAddWeightedToCart = async (productId: string, weight: number) => {
    await addToCart(productId, weight, undefined, undefined, weightedProduct ? {
      name: weightedProduct.name,
      price_per_unit: weightedProduct.price_per_unit,
      is_weighted: true,
      unit_of_measure: weightedProduct.unit_of_measure,
      image_url: weightedProduct.image_url,
    } : undefined);
    toast({
      title: "Added to cart",
      description: `${weight} ${weightedProduct?.unit_of_measure || 'lb'} added to your cart`,
    });
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
  
  const { data: featuredProducts, isLoading } = useQuery({
    queryKey: ["featured-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("featured_products")
        .select(`
          product_id,
          products (
            id,
            name,
            description,
            price_per_unit,
            inventory_count,
            image_url,
            is_weighted,
            unit_of_measure,
            category_id,
            brand
          )
        `)
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .limit(6);

      if (error) {
        console.error("Featured products fetch error:", error);
        throw error;
      }
      return data as FeaturedProduct[];
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

  if (isLoading) {
    return (
      <section className="py-12">
        <div className="container">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-gray-200 rounded w-64"></div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-96 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!featuredProducts || featuredProducts.length === 0) return null;

  // Split products: first one is the hero, rest are smaller cards
  const heroProduct = featuredProducts[0];
  const sideProducts = featuredProducts.slice(1, 5); // Get up to 4 products for the side

  return (
    <section className="py-16 bg-gradient-to-b from-white to-gray-50 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-food-red/5 rounded-full blur-3xl -z-0"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-food-orange/5 rounded-full blur-3xl -z-0"></div>
      
      <div className="container relative z-10">
        {/* Header Section */}
        <div className="flex flex-col gap-2 mb-8">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-food-red/20 blur-xl rounded-full animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-food-red to-food-orange p-3 rounded-2xl shadow-lg">
                <Star className="h-7 w-7 text-white fill-white" />
              </div>
            </div>
            <div>
              <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-food-brown to-food-red bg-clip-text text-transparent">
                You Can't Go Wrong With These
              </h2>
              <div className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="bg-food-red/10 text-food-red border-food-red/20 font-normal">
                  <TrendingUp className="h-3 w-3 mr-1" />
                   Favorites This Week
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* TikTok-Style Layout: 1 Large + 4 Small Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Large Hero Card - Left Side */}
          {heroProduct && (
            <div className="relative group overflow-hidden rounded-3xl shadow-2xl bg-white border-2 border-gray-100 hover:border-food-red/30 transition-all duration-500">
              {/* #1 Badge */}
              <div className="absolute top-4 left-4 z-20">
                <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900 shadow-lg font-bold px-4 py-2 text-sm">
                  <Star className="h-4 w-4 mr-1 fill-yellow-900" />
                  #1 Best Seller
                </Badge>
              </div>
              
              {/* Image */}
              <div className="relative h-96 md:h-[500px] overflow-hidden bg-gray-100">
                <img
                  src={heroProduct.products.image_url || '/placeholder.svg'}
                  alt={heroProduct.products.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
              </div>
              
              {/* Content Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <h3 className="text-2xl font-bold mb-2">{heroProduct.products.name}</h3>
                {heroProduct.products.description && (
                  <p className="text-sm text-white/90 mb-3 line-clamp-2">{heroProduct.products.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-3xl font-bold">${heroProduct.products.price_per_unit.toFixed(2)}</span>
                    {heroProduct.products.unit_of_measure && (
                      <span className="text-white/80 text-sm ml-1">/ {heroProduct.products.unit_of_measure}</span>
                    )}
                  </div>
                  {getCartItem(heroProduct.products.id) ? (
                    heroProduct.products.is_weighted ? (
                      <Badge className="bg-white text-food-red border-food-red">
                        <Weight className="h-4 w-4 mr-1" />
                        {getCartItem(heroProduct.products.id)?.weight || 0} {heroProduct.products.unit_of_measure || 'lb'} in cart
                      </Badge>
                    ) : (
                      <div className="flex items-center gap-2 bg-white rounded-lg p-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDecrement(heroProduct.products.id)}
                          className="h-8 w-8 p-0 text-food-red hover:bg-food-red/10"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="text-food-red font-bold min-w-[2rem] text-center">
                          {getCartItem(heroProduct.products.id)?.quantity}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleIncrement(heroProduct.products.id)}
                          className="h-8 w-8 p-0 text-food-red hover:bg-food-red/10"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  ) : (
                    <Button 
                      onClick={() => handleAddToCart(heroProduct.products.id, heroProduct.products)}
                      className="bg-food-red hover:bg-food-red/90 text-white shadow-lg"
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Add to Cart
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Small Cards Grid - Right Side */}
          <div className="grid grid-cols-2 gap-4">
            {sideProducts.map((item, index) => (
              <div
                key={item.product_id}
                className="relative group overflow-hidden rounded-2xl shadow-lg bg-white border border-gray-100 hover:border-food-red/30 hover:shadow-xl transition-all duration-500 flex flex-col"
              >
                {/* Rank Badge */}
                <div className="absolute top-2 right-2 z-20">
                  <Badge 
                    className={`
                      ${index === 0 ? 'bg-gradient-to-r from-gray-300 to-gray-500 text-gray-900' : ''}
                      ${index === 1 ? 'bg-gradient-to-r from-amber-600 to-amber-800 text-amber-100' : ''}
                      ${index > 1 ? 'bg-gray-200 text-gray-700' : ''}
                      shadow-md font-bold px-2 py-1 text-xs
                    `}
                  >
                    #{index + 2}
                  </Badge>
                </div>
                
                {/* Image */}
                <div className="relative h-40 overflow-hidden bg-gray-100">
                  <img
                    src={item.products.image_url || '/placeholder.svg'}
                    alt={item.products.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                </div>
                
                {/* Content */}
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-semibold text-sm mb-2 line-clamp-2 flex-1">{item.products.name}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-food-red">
                      ${item.products.price_per_unit.toFixed(2)}
                    </span>
                    {getCartItem(item.products.id) ? (
                      item.products.is_weighted ? (
                        <Badge variant="outline" className="text-xs">
                          {getCartItem(item.products.id)?.weight || 0} {item.products.unit_of_measure || 'lb'}
                        </Badge>
                      ) : (
                        <div className="flex items-center gap-1 bg-food-red/10 rounded-md p-0.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDecrement(item.products.id)}
                            className="h-6 w-6 p-0 text-food-red hover:bg-food-red/20"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-food-red font-bold text-xs min-w-[1.5rem] text-center">
                            {getCartItem(item.products.id)?.quantity}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleIncrement(item.products.id)}
                            className="h-6 w-6 p-0 text-food-red hover:bg-food-red/20"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      )
                    ) : (
                      <Button 
                        onClick={() => handleAddToCart(item.products.id, item.products)}
                        size="sm" 
                        variant="outline" 
                        className="text-xs"
                      >
                        Add
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* View All Link */}
        {featuredProducts.length > 5 && (
          <div className="text-center mt-8">
            <Button variant="outline" size="lg" className="group">
              View All Best Sellers
              <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        )}
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

export default FeaturedProductsSection;
