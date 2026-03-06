import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCartStore } from "@/stores/cart";
import { useUser, useClerk } from "@clerk/clerk-react";
import { useToast } from "@/hooks/use-toast";
import { ShoppingBag, Check, Package, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface ComboProduct {
  id: string;
  name: string;
  price_per_unit: number;
  image_url: string | null;
  is_weighted: boolean;
  unit_of_measure: string | null;
}

interface ComboItem {
  id: string;
  product_id: string;
  quantity: number;
  weight: number | null;
  is_addon: boolean;
  addon_price: number | null;
  position: number;
  products: ComboProduct;
}

interface ProductCombo {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  combo_price: number;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  combo_items: ComboItem[];
}

const ShopCombosSection = () => {
  const addCombo = useCartStore((state) => state.addCombo);
  const { isSignedIn } = useUser();
  const { redirectToSignIn } = useClerk();
  const { toast } = useToast();

  const { data: combos, isLoading } = useQuery({
    queryKey: ["active-combos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_combos")
        .select(
          `
        *,
        combo_items (
          id, product_id, quantity, weight, is_addon, addon_price, position,
          products:product_id (id, name, price_per_unit, image_url, is_weighted, unit_of_measure)
        )
      `
        )
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data as unknown as ProductCombo[];
    },
    staleTime: 1000 * 60 * 15,
  });

  if (isLoading || !combos || combos.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-food-orange/5 to-food-red/10 rounded-2xl p-6 lg:p-8">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-food-red to-food-orange flex items-center justify-center">
          <ShoppingBag className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-bold font-serif text-gray-900">
            Shop Combos
          </h2>
          <p className="text-sm text-muted-foreground">Bundle & Save</p>
        </div>
      </div>

      {/* Combo Cards - Vertically Stacked */}
      <div className="space-y-4">
        {combos.map((combo) => (
          <ComboCard
            key={combo.id}
            combo={combo}
            isSignedIn={!!isSignedIn}
            redirectToSignIn={redirectToSignIn}
            addCombo={addCombo}
            toast={toast}
          />
        ))}
      </div>
    </div>
  );
};

interface ComboCardProps {
  combo: ProductCombo;
  isSignedIn: boolean;
  redirectToSignIn: () => void;
  addCombo: (comboId: string, selectedAddonIds?: string[]) => Promise<void>;
  toast: ReturnType<typeof useToast>["toast"];
}

const ComboCard = ({
  combo,
  isSignedIn,
  redirectToSignIn,
  addCombo,
  toast,
}: ComboCardProps) => {
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  const coreItems = combo.combo_items
    .filter((item) => !item.is_addon)
    .sort((a, b) => a.position - b.position);

  const addonItems = combo.combo_items
    .filter((item) => item.is_addon)
    .sort((a, b) => a.position - b.position);

  // Calculate the total value of core items (what you'd pay individually)
  const coreItemsValue = coreItems.reduce((sum, item) => {
    const product = item.products;
    if (!product) return sum;
    if (item.weight) {
      return sum + product.price_per_unit * item.weight;
    }
    return sum + product.price_per_unit * item.quantity;
  }, 0);

  const savings = coreItemsValue - combo.combo_price;

  // Calculate total price including selected addons
  const selectedAddonTotal = addonItems
    .filter((item) => selectedAddonIds.includes(item.id))
    .reduce((sum, item) => sum + (item.addon_price || 0), 0);

  const totalPrice = combo.combo_price + selectedAddonTotal;

  const toggleAddon = (addonId: string) => {
    setSelectedAddonIds((prev) =>
      prev.includes(addonId)
        ? prev.filter((id) => id !== addonId)
        : [...prev, addonId]
    );
  };

  const handleAddToCart = async () => {
    if (!isSignedIn) {
      toast({
        title: "Please sign in",
        description: "You need to be logged in to add items to your cart",
      });
      redirectToSignIn();
      return;
    }

    setIsAdding(true);
    try {
      await addCombo(combo.id, selectedAddonIds);
      toast({
        title: "Added to cart",
        description: `${combo.name} has been added to your cart`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to add combo to cart. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const formatItemDetail = (item: ComboItem) => {
    const product = item.products;
    if (!product) return "";
    if (item.weight) {
      return `${item.weight} ${product.unit_of_measure || "lb"}`;
    }
    if (item.quantity > 1) {
      return `x${item.quantity}`;
    }
    return "";
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-4 lg:p-5">
      <div className="flex gap-4">
        {/* Combo Image */}
        {combo.image_url && (
          <div className="flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden">
            <img
              src={combo.image_url}
              alt={combo.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}

        {/* Combo Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 text-base lg:text-lg truncate">
              {combo.name}
            </h3>
            {savings > 0 && (
              <span className="flex-shrink-0 bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
                Save ${savings.toFixed(2)}
              </span>
            )}
          </div>

          {combo.description && (
            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
              {combo.description}
            </p>
          )}

          {/* Included Items */}
          <div className="space-y-1 mb-3">
            {coreItems.map((item) => (
              <div key={item.id} className="flex items-center gap-1.5 text-sm">
                <Check className="h-3.5 w-3.5 text-food-green flex-shrink-0" />
                <span className="text-gray-700 truncate">
                  {item.products?.name}
                </span>
                {formatItemDetail(item) && (
                  <span className="text-muted-foreground text-xs flex-shrink-0">
                    ({formatItemDetail(item)})
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Add-on Toggles */}
          {addonItems.length > 0 && (
            <div className="border-t border-gray-100 pt-2 mb-3 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Optional Add-ons
              </p>
              {addonItems.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-2 cursor-pointer group"
                >
                  <Checkbox
                    checked={selectedAddonIds.includes(item.id)}
                    onCheckedChange={() => toggleAddon(item.id)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                    + {item.products?.name}
                    {formatItemDetail(item) &&
                      ` (${formatItemDetail(item)})`}
                  </span>
                  <span className="text-sm font-medium text-food-red ml-auto flex-shrink-0">
                    +${(item.addon_price || 0).toFixed(2)}
                  </span>
                </label>
              ))}
            </div>
          )}

          {/* Price + Add to Cart */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-food-red">
                ${totalPrice.toFixed(2)}
              </span>
              {savings > 0 && (
                <span className="text-sm text-muted-foreground line-through">
                  ${(coreItemsValue + selectedAddonTotal).toFixed(2)}
                </span>
              )}
            </div>
            <Button
              onClick={handleAddToCart}
              disabled={isAdding}
              className="bg-food-red hover:bg-food-red/90 text-white text-sm px-4 py-2 h-9"
            >
              {isAdding ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  Adding...
                </>
              ) : (
                <>
                  <Package className="h-4 w-4 mr-1.5" />
                  Add to Cart
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopCombosSection;
