import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, ShoppingCart, Plus, Minus, Weight } from "lucide-react";
import { Link } from "react-router-dom";
import { useCartStore } from "@/stores/cart";
import { useUser, useClerk } from "@clerk/clerk-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import WeightedProductDialog from "@/components/product/WeightedProductDialog";

interface FestivalProduct {
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
    category?: { id: string; name: string } | null;
    brand?: string;
  };
}

interface Festival {
  id: string;
  name: string;
  description: string | null;
  banner_image: string | null;
  festival_products: FestivalProduct[];
}

const FestivalSection = () => {
  const items = useCartStore((state) => state.items);
  const addToCart = useCartStore((state) => state.addToCart);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeFromCart = useCartStore((state) => state.removeFromCart);
  const { isSignedIn } = useUser();
  const { redirectToSignIn } = useClerk();
  const { toast } = useToast();
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

  const handleAddToCart = async (productId: string, product?: FestivalProduct['products']) => {
    if (!isSignedIn) {
      toast({
        title: "Please sign in",
        description: "You need to be logged in to add items to your cart",
      });
      redirectToSignIn();
      return;
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
      setIsWeightDialogOpen(true);
      return;
    }
    
    await addToCart(productId);
  };
  
  const handleAddWeightedToCart = async (productId: string, weight: number) => {
    await addToCart(productId, weight);
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

  const { data: festivals, isLoading } = useQuery({
    queryKey: ["active-festivals"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("festivals")
        .select(`
          id,
          name,
          description,
          banner_image,
          festival_products (
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
              brand,
              category:categories(id, name)
            )
          )
        `)
        .eq("is_active", true)
        .lte("start_date", now)
        .gte("end_date", now)
        .order("display_order", { ascending: true })
        .limit(1);

      if (error) throw error;
      return data as unknown as Festival[];
    },
  });

  if (isLoading) {
    return (
      <section className="py-16 bg-white">
        <div className="container">
          <div className="animate-pulse space-y-8">
            <div className="h-64 bg-gray-200 rounded-2xl"></div>
            <div className="grid grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-80 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!festivals || festivals.length === 0) return null;

  const festival = festivals[0];
  const products = festival.festival_products || [];

  if (products.length === 0) return null;

  // Group products by category for featured sub-collections
  const categorizedProducts = products.reduce((acc, item) => {
    const category = item.products.category?.name || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, FestivalProduct[]>);

  // Get top 3 categories with most products
  const topCategories = Object.entries(categorizedProducts)
    .sort(([, a], [, b]) => b.length - a.length)
    .slice(0, 3);

  return (
    <section className="py-16 bg-white relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-food-red/5 rounded-full blur-3xl -z-0"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-food-orange/5 rounded-full blur-3xl -z-0"></div>
      
      <div className="container relative z-10 space-y-12">
        {/* 1. Full-Width Festival Banner (Tighter) */}
        {festival.banner_image ? (
          <div className="relative h-56 rounded-3xl overflow-hidden shadow-2xl border border-gray-100">
            <img
              src={festival.banner_image}
              alt={festival.name}
              className="w-full h-full object-cover"
            />
            {/* Decorative overlay with Nepali motifs effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent"></div>
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }}></div>
            
            {/* Content */}
            <div className="absolute inset-0 flex flex-col justify-center px-12">
              <div className="flex items-center gap-3 mb-3">
                <Sparkles className="h-8 w-8 text-yellow-400 fill-yellow-400 animate-pulse" />
                <Badge className="bg-yellow-400 text-yellow-900 font-bold px-4 py-1 text-sm">
                  FESTIVAL SPECIAL
                </Badge>
              </div>
              <h2 className="text-5xl font-bold text-white mb-3 drop-shadow-lg">
                {festival.name}
              </h2>
              {festival.description && (
                <p className="text-xl text-white/90 max-w-2xl drop-shadow-md">
                  {festival.description}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="relative h-56 rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-food-red via-food-orange to-food-red border border-food-red/20">
            {/* Decorative pattern */}
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }}></div>
            
            {/* Content */}
            <div className="absolute inset-0 flex flex-col justify-center px-12">
              <div className="flex items-center gap-3 mb-3">
                <Sparkles className="h-8 w-8 text-yellow-300 fill-yellow-300 animate-pulse" />
                <Badge className="bg-yellow-400 text-yellow-900 font-bold px-4 py-1 text-sm">
                  FESTIVAL SPECIAL
                </Badge>
              </div>
              <h2 className="text-5xl font-bold text-white mb-3 drop-shadow-lg">
                {festival.name}
              </h2>
              {festival.description && (
                <p className="text-xl text-white/90 max-w-2xl drop-shadow-md">
                  {festival.description}
                </p>
              )}
            </div>
          </div>
        )}

        {/* 2. Featured Sub-Categories (3-column mini collections) */}
        {topCategories.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {topCategories.map(([categoryName, categoryProducts]) => {
              // Find first product with an image, or use category default
              const productWithImage = categoryProducts.find(p => p.products.image_url);
              const categoryImage = productWithImage?.products.image_url;
              
              const categoryEmoji = 
                categoryName.toLowerCase().includes('meat') ? '🍖' :
                categoryName.toLowerCase().includes('snack') || categoryName.toLowerCase().includes('sweet') ? '🍬' :
                categoryName.toLowerCase().includes('gift') || categoryName.toLowerCase().includes('pack') ? '🎁' :
                categoryName.toLowerCase().includes('spice') ? '🌶️' :
                categoryName.toLowerCase().includes('vegetable') ? '🥬' :
                categoryName.toLowerCase().includes('grocery') ? '🛒' :
                '✨';
              
              // Default category background images
              const defaultCategoryImage = 
                categoryName.toLowerCase().includes('meat') ? 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=800&q=80' :
                categoryName.toLowerCase().includes('snack') || categoryName.toLowerCase().includes('sweet') ? 'https://images.unsplash.com/photo-1514517521153-1be72277b32f?w=800&q=80' :
                categoryName.toLowerCase().includes('gift') || categoryName.toLowerCase().includes('pack') ? 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=800&q=80' :
                categoryName.toLowerCase().includes('spice') ? 'https://images.unsplash.com/photo-1596040033229-a0b551b28cdc?w=800&q=80' :
                categoryName.toLowerCase().includes('vegetable') ? 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&q=80' :
                categoryName.toLowerCase().includes('grocery') ? 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80' :
                'https://images.unsplash.com/photo-1534670007418-fbb7f6cf32c3?w=800&q=80'; // Generic food pattern

              return (
                <Link
                  key={categoryName}
                  to={`/products?category=${encodeURIComponent(categoryName)}`}
                  className="group"
                >
                  <div className="relative h-32 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-food-red/30">
                    {/* Background image */}
                    <img
                      src={categoryImage || defaultCategoryImage}
                      alt={categoryName}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                    
                    {/* Content */}
                    <div className="absolute inset-0 flex flex-col justify-end p-5">
                      <div className="text-3xl mb-2">{categoryEmoji}</div>
                      <h3 className="text-white font-bold text-lg mb-1">
                        {categoryName}
                      </h3>
                      <p className="text-white/80 text-sm flex items-center gap-2">
                        {categoryProducts.length} items
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* 3. Product Grid (Cleaner, Premium Style) */}
        <div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {products.slice(0, 8).map((item) => (
              <div
                key={item.product_id}
                className="group bg-white rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-gray-200"
              >
                {/* Image */}
                <div className="relative h-56 overflow-hidden bg-gray-50">
                  <img
                    src={item.products.image_url || '/placeholder.svg'}
                    alt={item.products.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Category Tag */}
                  {item.products.category?.name && (
                    <Badge 
                      variant="secondary" 
                      className="absolute top-3 left-3 bg-red-900 backdrop-blur-sm border-0 shadow-md text-xs font-medium"
                    >
                      {item.products.category.name}
                    </Badge>
                  )}
                </div>

                {/* Content */}
                <div className="p-5 space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-base line-clamp-2 text-gray-900 min-h-[3rem]">
                      {item.products.name}
                    </h3>
                    {item.products.brand && (
                      <p className="text-xs text-muted-foreground">
                        by {item.products.brand}
                      </p>
                    )}
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-food-red">
                      ${item.products.price_per_unit.toFixed(2)}
                    </span>
                    {item.products.unit_of_measure && (
                      <span className="text-sm text-muted-foreground">
                        / {item.products.unit_of_measure}
                      </span>
                    )}
                  </div>

                  {/* Add to Cart Button or Quantity Controls */}
                  {getCartItem(item.products.id) ? (
                    item.products.is_weighted ? (
                      <Badge variant="outline" className="w-full justify-center py-2">
                        <Weight className="h-4 w-4 mr-1" />
                        {getCartItem(item.products.id)?.weight || 0} {item.products.unit_of_measure || 'lb'} in cart
                      </Badge>
                    ) : (
                      <div className="flex items-center justify-between bg-food-brown/10 rounded-lg p-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDecrement(item.products.id)}
                          className="h-8 w-8 p-0 text-food-brown hover:bg-food-brown/20"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <div className="flex flex-col items-center">
                          <span className="text-xs text-muted-foreground">In Cart</span>
                          <span className="text-food-brown font-bold text-lg">
                            {getCartItem(item.products.id)?.quantity}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleIncrement(item.products.id)}
                          className="h-8 w-8 p-0 text-food-brown hover:bg-food-brown/20"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  ) : (
                    <Button
                      onClick={() => handleAddToCart(item.products.id, item.products)}
                      className="w-full bg-food-brown hover:bg-food-brown/90 text-white shadow-sm"
                      size="default"
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Add to Cart
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Shop All Link */}
          {products.length > 8 && (
            <div className="text-center mt-10">
              <Link to={`/products?festival=${encodeURIComponent(festival.name)}`}>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="group border-2 border-food-red text-food-red hover:bg-food-red hover:text-white px-8"
                >
                  Shop All {festival.name} Products
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          )}
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

export default FestivalSection;
