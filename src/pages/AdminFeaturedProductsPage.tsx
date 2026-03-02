import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCrud } from "@/hooks/useAdminCrud";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Star, X, Plus, Search } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  category?: { id: string; name: string } | null;
}

interface FeaturedProduct {
  id: string;
  product_id: string;
  display_order: number;
  products: Product;
}

const AdminFeaturedProductsPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { insert, remove, upsert } = useAdminCrud();
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const { data: featuredProducts, isLoading: loadingFeatured } = useQuery({
    queryKey: ["admin-featured-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("featured_products")
        .select("*, products(*, category:categories(id, name))")
        .order("display_order");
      
      if (error) throw error;
      
      // Map price_per_unit to price for consistency
      return data?.map(fp => ({
        ...fp,
        products: {
          ...fp.products,
          price: fp.products.price_per_unit
        }
      })) as FeaturedProduct[];
    },
  });

  const { data: allProducts, isLoading: loadingProducts } = useQuery({
    queryKey: ["product-search-featured", productSearchTerm],
    queryFn: async () => {
      if (!productSearchTerm || productSearchTerm.length < 2) return [];
      
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price_per_unit, image_url, category:categories(id, name)")
        .ilike('name', `%${productSearchTerm}%`)
        .order("name")
        .limit(20);
      
      if (error) throw error;
      return data?.map(p => ({ ...p, price: p.price_per_unit })) as Product[];
    },
    enabled: productSearchTerm.length >= 2,
  });

  const addMutation = useMutation({
    mutationFn: async (productId: string) => {
      // Get the next display order
      const maxOrder = featuredProducts?.reduce((max, fp) =>
        fp.display_order > max ? fp.display_order : max, 0) || 0;

      await insert("featured_products", {
        product_id: productId,
        display_order: maxOrder + 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-featured-products"] });
      toast({ title: "Product added to featured section" });
      setSelectedProductId("");
    },
    onError: (error: Error) => {
      toast({ title: "Error adding product", description: error.message, variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      await remove("featured_products", [{ column: "id", operator: "eq", value: id }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-featured-products"] });
      toast({ title: "Product removed from featured section" });
    },
    onError: (error: Error) => {
      toast({ title: "Error removing product", description: error.message, variant: "destructive" });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (items: { id: string; display_order: number }[]) => {
      await upsert("featured_products", items as Record<string, unknown>[]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-featured-products"] });
      toast({ title: "Order updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error updating order", description: error.message, variant: "destructive" });
    },
  });

  const handleAdd = () => {
    if (!selectedProduct) return;
    
    // Check if already featured
    const alreadyFeatured = featuredProducts?.some(fp => fp.product_id === selectedProduct.id);
    if (alreadyFeatured) {
      toast({ title: "Product already featured", variant: "destructive" });
      return;
    }

    // Check limit
    if (featuredProducts && featuredProducts.length >= 6) {
      toast({ title: "Maximum 6 featured products allowed", variant: "destructive" });
      return;
    }

    addMutation.mutate(selectedProduct.id);
    setSelectedProduct(null);
    setSelectedProductId("");
    setProductSearchTerm("");
  };

  const handleRemove = (id: string) => {
    if (window.confirm("Remove this product from featured section?")) {
      removeMutation.mutate(id);
    }
  };

  const moveUp = (index: number) => {
    if (!featuredProducts || index === 0) return;
    
    const newOrder = [...featuredProducts];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    
    const updates = newOrder.map((item, idx) => ({
      id: item.id,
      display_order: idx + 1,
    }));
    
    reorderMutation.mutate(updates);
  };

  const moveDown = (index: number) => {
    if (!featuredProducts || index === featuredProducts.length - 1) return;
    
    const newOrder = [...featuredProducts];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    
    const updates = newOrder.map((item, idx) => ({
      id: item.id,
      display_order: idx + 1,
    }));
    
    reorderMutation.mutate(updates);
  };

  const availableProducts = allProducts?.filter(
    p => !featuredProducts?.some(fp => fp.product_id === p.id)
  ) || [];

  return (
    <AdminLayout title="Featured Products">
      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-8 w-8 text-yellow-500" />
            <h1 className="text-3xl font-bold text-gray-900">Featured Products</h1>
          </div>
          <p className="text-gray-600">
            Select up to 6 products to showcase in the "Best Sellers" section on the home page
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Add Featured Product</CardTitle>
            <CardDescription>
              {featuredProducts && featuredProducts.length >= 6 
                ? "Maximum limit reached (6/6)" 
                : `${featuredProducts?.length || 0}/6 products featured`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="product">Search Product</Label>
                <div className="relative">
                  {selectedProduct ? (
                    <div className="flex items-center gap-2 p-2 border rounded-md">
                      {selectedProduct.image_url && (
                        <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-10 h-10 object-cover rounded" />
                      )}
                      <div className="flex-1">
                        <div className="font-medium">{selectedProduct.name}</div>
                        <div className="text-sm text-gray-500">${selectedProduct.price.toFixed(2)}</div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedProduct(null);
                          setSelectedProductId("");
                          setProductSearchTerm("");
                        }}
                      >
                        Change
                      </Button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="product"
                        type="text"
                        placeholder="Type to search products (min 2 characters)..."
                        value={productSearchTerm}
                        onChange={(e) => setProductSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                      {productSearchTerm.length >= 2 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                          {loadingProducts ? (
                            <div className="p-4 text-center text-gray-500">Searching...</div>
                          ) : availableProducts.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">No products found</div>
                          ) : (
                            availableProducts.map((product) => (
                              <button
                                key={product.id}
                                type="button"
                                className="w-full flex items-center gap-3 p-3 hover:bg-gray-100 text-left"
                                onClick={() => {
                                  setSelectedProduct(product);
                                  setSelectedProductId(product.id);
                                  setProductSearchTerm("");
                                }}
                              >
                                {product.image_url && (
                                  <img src={product.image_url} alt={product.name} className="w-12 h-12 object-cover rounded" />
                                )}
                                <div className="flex-1">
                                  <div className="font-medium">{product.name}</div>
                                  <div className="text-sm text-gray-500">
                                    ${product.price.toFixed(2)} • {product.category?.name || 'N/A'}
                                  </div>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={handleAdd}
                  disabled={!selectedProduct || (featuredProducts && featuredProducts.length >= 6) || addMutation.isPending}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {loadingFeatured || loadingProducts ? (
          <div className="text-center py-12">Loading featured products...</div>
        ) : (
          <div className="space-y-4">
            {featuredProducts?.map((featured, index) => (
              <Card key={featured.id}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <img
                      src={featured.products.image_url || "/placeholder.svg"}
                      alt={featured.products.name}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{featured.products.name}</h3>
                      <p className="text-sm text-gray-600">
                        ${featured.products.price.toFixed(2)} · {featured.products.category?.name || 'N/A'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Display Order: {featured.display_order}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => moveUp(index)}
                        disabled={index === 0 || reorderMutation.isPending}
                      >
                        ↑
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => moveDown(index)}
                        disabled={index === featuredProducts.length - 1 || reorderMutation.isPending}
                      >
                        ↓
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRemove(featured.id)}
                        disabled={removeMutation.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loadingFeatured && featuredProducts?.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No featured products yet. Add some products to showcase them on the home page!
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminFeaturedProductsPage;
