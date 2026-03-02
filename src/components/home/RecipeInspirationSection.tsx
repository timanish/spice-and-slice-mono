import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, ChefHat, Sparkles, ArrowRight, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useCartStore } from "@/stores/cart";
import { useToast } from "@/hooks/use-toast";

interface Recipe {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  servings: number | null;
  difficulty: string | null;
  ingredients: string | null;
  instructions: string | null;
}

interface RecipeProduct {
  product_id: string;
  quantity: string | null;
  amount: number;
  unit: string;
  notes: string | null;
  display_order: number;
  products: {
    id: string;
    name: string;
    price_per_unit: number;
    image_url: string | null;
    is_weighted: boolean;
    unit_of_measure: string | null;
  };
}

const RecipeInspirationSection = () => {
  const [selectedRecipeIndex, setSelectedRecipeIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [ingredientsAdded, setIngredientsAdded] = useState(false);
  const { toast } = useToast();
  const addToCart = useCartStore((state) => state.addToCart);

  // Reset ingredientsAdded when recipe changes
  useEffect(() => {
    setIngredientsAdded(false);
  }, [selectedRecipeIndex]);

  const { data: recipes, isLoading } = useQuery({
    queryKey: ["recipes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipes")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .limit(4);

      if (error) throw error;
      return data as unknown as Recipe[];
    },
  });

  // Fetch products for the selected recipe
  const { data: recipeProducts, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["recipe-products", recipes?.[selectedRecipeIndex]?.id],
    queryFn: async () => {
      if (!recipes || !recipes[selectedRecipeIndex]) return [];
      
      const { data, error } = await supabase
        .from("recipe_products")
        .select(`
          product_id,
          quantity,
          amount,
          unit,
          notes,
          display_order,
          products:product_id (
            id,
            name,
            price_per_unit,
            image_url,
            is_weighted,
            unit_of_measure
          )
        `)
        .eq("recipe_id", recipes[selectedRecipeIndex].id)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as RecipeProduct[];
    },
    enabled: !!recipes && recipes.length > 0,
  });

  const handleAddRecipeToCart = async () => {
    if (!recipeProducts || recipeProducts.length === 0) {
      toast({
        title: "No Products",
        description: "This recipe doesn't have any products associated with it yet.",
        variant: "destructive",
      });
      return;
    }

    setIsAddingToCart(true);
    try {
      // Add all products from the recipe to cart with their specified quantities
      for (const recipeProduct of recipeProducts) {
        const product = recipeProduct.products;
        const amount = recipeProduct.amount || 1;
        const unit = recipeProduct.unit || "piece";
        
        // Check if product is weighted and unit is weight-based
        const weightUnits = ['kg', 'g', 'lb', 'lbs', 'oz'];
        const isWeightUnit = weightUnits.includes(unit.toLowerCase());
        
        if (product.is_weighted && isWeightUnit) {
          // Convert amount to the product's base unit if needed
          let weight = amount;
          
          // Convert to pounds if product uses lb and recipe uses other weight units
          if (product.unit_of_measure === 'lb' || product.unit_of_measure === 'lbs') {
            if (unit.toLowerCase() === 'kg') {
              weight = amount * 2.20462; // kg to lb
            } else if (unit.toLowerCase() === 'g') {
              weight = amount * 0.00220462; // g to lb
            } else if (unit.toLowerCase() === 'oz') {
              weight = amount / 16; // oz to lb
            }
          }
          
          await addToCart(product.id, weight);
        } else {
          // For non-weighted products or count-based units, use quantity
          await addToCart(product.id, undefined, amount);
        }
      }

      setIngredientsAdded(true);
      toast({
        title: "Added to Cart!",
        description: `${recipeProducts.length} ingredient${recipeProducts.length > 1 ? 's' : ''} added to your cart.`,
      });
    } catch (error) {
      console.error("Error adding recipe to cart:", error);
      toast({
        title: "Error",
        description: "Failed to add items to cart. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAddingToCart(false);
    }
  };

  if (isLoading) {
    return (
      <section className="py-16 bg-gradient-to-br from-food-orange/10 to-food-red/5">
        <div className="container">
          <div className="animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="h-[600px] bg-gray-200 rounded-3xl"></div>
              <div className="space-y-6">
                <div className="h-12 bg-gray-200 rounded w-3/4"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!recipes || recipes.length === 0) return null;

  const selectedRecipe = recipes[selectedRecipeIndex];

  const getDifficultyColor = (difficulty: string | null) => {
    switch (difficulty?.toLowerCase()) {
      case "easy":
        return "bg-green-100 text-green-800 border-green-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "hard":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <section className="py-16 bg-gradient-to-br from-food-orange/10 to-food-red/5 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-food-orange/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-food-red/10 rounded-full blur-3xl"></div>

      <div className="container relative z-10">
        {/* Header */}
        <div className="flex justify-between items-start mb-12">
          <div className="text-center flex-1">
            <div className="flex items-center justify-center gap-3 mb-4">
              <ChefHat className="h-10 w-10 text-food-red" />
              <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-food-brown to-food-red bg-clip-text text-transparent">
                Recipe Inspiration
              </h2>
            </div>
            <p className="text-muted-foreground text-lg">
              Discover delicious dishes we prepare fresh for our lunch program
            </p>
          </div>
          
          {/* Add Ingredients Button - Top Right */}
          {recipeProducts && recipeProducts.length > 0 && (
            <div className="hidden lg:block">
              <Button 
                size="lg" 
                className={ingredientsAdded 
                  ? "bg-green-600 text-white hover:bg-green-700 font-bold shadow-lg whitespace-nowrap" 
                  : "bg-food-red text-white hover:bg-food-red/90 font-bold shadow-lg whitespace-nowrap"
                }
                onClick={handleAddRecipeToCart}
                disabled={isAddingToCart || isLoadingProducts || ingredientsAdded}
              >
                {isAddingToCart ? (
                  <>
                    <Clock className="h-5 w-5 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : ingredientsAdded ? (
                  <>
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    Ingredients in Cart
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    Add Ingredients to Cart
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Main Recipe Display - Product Detail Style */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
          {/* Left: Large Image with Flip */}
          <div className="space-y-4">
            {/* Main Image - Flip Card */}
            <div 
              className="relative h-[500px] lg:h-[600px] rounded-3xl overflow-hidden shadow-2xl"
              style={{ perspective: '1000px' }}
            >
              <div
                className={`relative w-full h-full transition-transform duration-700 transform-gpu ${
                  isFlipped ? '[transform:rotateY(180deg)]' : ''
                }`}
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Front - Recipe Image */}
                <div
                  className="absolute inset-0 w-full h-full bg-white border-4 border-white rounded-3xl overflow-hidden"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <img
                    src={selectedRecipe.image_url}
                    alt={selectedRecipe.title}
                    className="w-full h-full object-cover"
                  />
                  {/* View Recipe Button */}
                  <Button
                    onClick={() => setIsFlipped(true)}
                    className="absolute top-6 right-6 bg-food-red hover:bg-food-red/90 text-white font-bold shadow-lg px-6 py-3"
                    size="lg"
                  >
                    <ChefHat className="h-5 w-5 mr-2" />
                    View Recipe
                  </Button>
                </div>

                {/* Back - Recipe Details */}
                <div
                  className="absolute inset-0 w-full h-full bg-gradient-to-br from-food-brown to-food-red border-4 border-white rounded-3xl overflow-hidden"
                  style={{ 
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)'
                  }}
                >
                  <div className="w-full h-full overflow-y-auto p-8 text-white">
                    {/* Back Button */}
                    <Button
                      onClick={() => setIsFlipped(false)}
                      variant="outline"
                      className="mb-6 bg-white/20 border-white/40 text-white hover:bg-white/30 backdrop-blur-sm"
                    >
                      <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
                      Back to Image
                    </Button>

                    <h3 className="text-3xl font-bold mb-4">{selectedRecipe.title}</h3>
                    
                    {/* Recipe Info */}
                    <div className="flex gap-6 mb-6 pb-6 border-b border-white/30">
                      {selectedRecipe.difficulty && (
                        <div>
                          <p className="text-white/70 text-sm mb-1">Difficulty</p>
                          <Badge className={`${getDifficultyColor(selectedRecipe.difficulty)} text-base font-bold px-4 py-2`}>
                            {selectedRecipe.difficulty}
                          </Badge>
                        </div>
                      )}
                      {selectedRecipe.prep_time_minutes && (
                        <div>
                          <p className="text-white/70 text-sm mb-1">Prep Time</p>
                          <p className="text-xl font-bold">{selectedRecipe.prep_time_minutes} min</p>
                        </div>
                      )}
                      {selectedRecipe.cook_time_minutes && (
                        <div>
                          <p className="text-white/70 text-sm mb-1">Cook Time</p>
                          <p className="text-xl font-bold">{selectedRecipe.cook_time_minutes} min</p>
                        </div>
                      )}
                      {selectedRecipe.servings && (
                        <div>
                          <p className="text-white/70 text-sm mb-1">Servings</p>
                          <p className="text-xl font-bold">{selectedRecipe.servings}</p>
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    {selectedRecipe.description && (
                      <div className="mb-6">
                        <h4 className="text-xl font-bold mb-3 flex items-center gap-2">
                          <Sparkles className="h-5 w-5" />
                          About This Dish
                        </h4>
                        <p className="text-white/90 leading-relaxed text-base">
                          {selectedRecipe.description}
                        </p>
                      </div>
                    )}

                    {/* Ingredients from Recipe Products */}
                    {recipeProducts && recipeProducts.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-xl font-bold mb-3 flex items-center gap-2">
                          <ChefHat className="h-5 w-5" />
                          Ingredients
                        </h4>
                        <ul className="space-y-2 text-white/90">
                          {recipeProducts.map((ingredient, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-yellow-400 mt-1">•</span>
                              <div className="flex-1">
                                <span className="font-medium">{ingredient.amount} {ingredient.unit}</span>
                                <span className="ml-2">{ingredient.products.name}</span>
                                {ingredient.notes && (
                                  <span className="block text-sm text-white/70 mt-0.5 ml-0">
                                    ({ingredient.notes})
                                  </span>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Fallback to text-based ingredients if no structured ingredients */}
                    {(!recipeProducts || recipeProducts.length === 0) && selectedRecipe.ingredients && (
                      <div className="mb-6">
                        <h4 className="text-xl font-bold mb-3 flex items-center gap-2">
                          <ChefHat className="h-5 w-5" />
                          Ingredients
                        </h4>
                        <ul className="space-y-2 text-white/90">
                          {(() => {
                            try {
                              // Parse newline-separated string or array
                              const ingredientsList = typeof selectedRecipe.ingredients === 'string' 
                                ? selectedRecipe.ingredients.split('\n').filter(i => i.trim())
                                : Array.isArray(selectedRecipe.ingredients) 
                                  ? selectedRecipe.ingredients
                                  : [];
                              return ingredientsList.length > 0
                                ? ingredientsList.map((ingredient, index) => (
                                    <li key={index} className="flex items-start gap-2">
                                      <span className="text-yellow-400 mt-1">•</span>
                                      <span>{ingredient}</span>
                                    </li>
                                  ))
                                : <li className="text-white/70">No ingredients available</li>;
                            } catch (e) {
                              return <li className="text-white/70">No ingredients available</li>;
                            }
                          })()}
                        </ul>
                      </div>
                    )}

                    {/* Instructions */}
                    {selectedRecipe.instructions && (
                      <div className="mb-6">
                        <h4 className="text-xl font-bold mb-3 flex items-center gap-2">
                          <Clock className="h-5 w-5" />
                          Instructions
                        </h4>
                        <ol className="space-y-3 text-white/90">
                          {(() => {
                            try {
                              // Parse newline-separated string or array
                              const instructionsList = typeof selectedRecipe.instructions === 'string' 
                                ? selectedRecipe.instructions.split('\n').filter(i => i.trim())
                                : Array.isArray(selectedRecipe.instructions) 
                                  ? selectedRecipe.instructions
                                  : [];
                              return instructionsList.length > 0
                                ? instructionsList.map((instruction, index) => (
                                    <li key={index} className="flex gap-3">
                                      <span className="flex-shrink-0 w-7 h-7 bg-white/20 rounded-full flex items-center justify-center font-bold text-sm">
                                        {index + 1}
                                      </span>
                                      <span className="flex-1 pt-0.5">{instruction}</span>
                                    </li>
                                  ))
                                : <li className="text-white/70">No instructions available</li>;
                            } catch (e) {
                              return <li className="text-white/70">No instructions available</li>;
                            }
                          })()}
                        </ol>
                      </div>
                    )}

                    {/* CTA Section */}
                    <div className="space-y-4 mt-8">
                      {/* Add Ingredients to Cart */}
                      {recipeProducts && recipeProducts.length > 0 && (
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                          <h4 className="text-xl font-bold mb-3 flex items-center gap-2">
                            <ShoppingCart className="h-5 w-5" />
                            Shop Ingredients
                          </h4>
                          <p className="text-white/90 mb-4">
                            Get all {recipeProducts.length} ingredient{recipeProducts.length > 1 ? 's' : ''} for this recipe delivered to your door!
                          </p>
                          <Button 
                            size="lg" 
                            className={ingredientsAdded 
                              ? "w-full bg-green-600 text-white hover:bg-green-700 font-bold" 
                              : "w-full bg-food-red text-white hover:bg-food-red/90 font-bold"
                            }
                            onClick={handleAddRecipeToCart}
                            disabled={isAddingToCart || isLoadingProducts || ingredientsAdded}
                          >
                            {isAddingToCart ? (
                              <>
                                <Clock className="h-5 w-5 mr-2 animate-spin" />
                                Adding to Cart...
                              </>
                            ) : ingredientsAdded ? (
                              <>
                                <ShoppingCart className="h-5 w-5 mr-2" />
                                Ingredients in Cart
                              </>
                            ) : (
                              <>
                                <ShoppingCart className="h-5 w-5 mr-2" />
                                Add Ingredients to Cart
                              </>
                            )}
                          </Button>
                        </div>
                      )}

                      {/* Join Lunch Program */}
                      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                        <h4 className="text-xl font-bold mb-3">Want to try this?</h4>
                        <p className="text-white/90 mb-4">
                          Join our lunch program and enjoy dishes like this every week!
                        </p>
                        <Link to="/lunch-box">
                          <Button 
                            size="lg" 
                            className="w-full bg-white text-food-red hover:bg-white/90 font-bold"
                          >
                            Join Now
                            <ArrowRight className="ml-2 h-5 w-5" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Thumbnail Gallery */}
            {recipes.length > 1 && (
              <div className="flex gap-3 justify-center">
                {recipes.map((recipe, index) => (
                  <button
                    key={recipe.id}
                    onClick={() => {
                      setSelectedRecipeIndex(index);
                      setIsFlipped(false); // Reset flip when changing recipe
                    }}
                    className={`relative w-24 h-24 rounded-xl overflow-hidden border-3 transition-all ${
                      selectedRecipeIndex === index
                        ? 'border-food-red shadow-lg scale-105'
                        : 'border-gray-200 hover:border-food-red/50 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={recipe.image_url}
                      alt={recipe.title}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Recipe Details & CTA */}
          <div className="flex flex-col justify-center space-y-6">
            {/* Recipe Title & Badge */}
            <div>
              <Badge className="bg-food-red/10 text-food-red border-food-red/20 mb-3 text-sm font-semibold px-4 py-1">
                <Sparkles className="h-4 w-4 mr-1" />
                FEATURED RECIPE
              </Badge>
              <h3 className="text-4xl font-bold text-food-brown mb-3">
                {selectedRecipe.title}
              </h3>
            </div>

            {/* Recipe Metadata */}
            <div className="flex gap-6 text-base">
              {selectedRecipe.prep_time_minutes && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="bg-food-orange/10 p-2 rounded-lg">
                    <Clock className="h-5 w-5 text-food-orange" />
                  </div>
                  <div>
                    <p className="text-xs font-medium">Prep Time</p>
                    <p className="font-semibold text-food-brown">{selectedRecipe.prep_time_minutes} min</p>
                  </div>
                </div>
              )}
              {selectedRecipe.servings && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="bg-food-red/10 p-2 rounded-lg">
                    <Users className="h-5 w-5 text-food-red" />
                  </div>
                  <div>
                    <p className="text-xs font-medium">Servings</p>
                    <p className="font-semibold text-food-brown">{selectedRecipe.servings} people</p>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            {selectedRecipe.description && (
              <div className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-2xl p-6">
                <p className="text-muted-foreground leading-relaxed text-base">
                  {selectedRecipe.description}
                </p>
              </div>
            )}

            {/* CTA Box - Join Lunch Program */}
            <div className="bg-gradient-to-br from-food-red to-food-orange rounded-2xl p-6 text-white shadow-2xl mt-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                  <ChefHat className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h4 className="text-2xl font-bold mb-2">
                    Love This Dish?
                  </h4>
                  <p className="text-white/90 text-base leading-relaxed">
                    We make exciting dishes like this and more! Join our lunch program and enjoy fresh, delicious meals prepared daily by Nepali chefs.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/lunch-box" className="flex-1">
                  <Button 
                    size="lg" 
                    className="w-full bg-white text-food-red hover:bg-white/90 font-bold text-base shadow-lg group"
                  >
                    Join Our Lunch Program
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="flex items-center gap-6 mt-6 pt-6 border-t border-white/20 text-sm">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  <span>Fresh Daily</span>
                </div>
                <div className="flex items-center gap-2">
                  <ChefHat className="h-4 w-4" />
                  <span>Chef Prepared</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>500+ Members</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RecipeInspirationSection;
