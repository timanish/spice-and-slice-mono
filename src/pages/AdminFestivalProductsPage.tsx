import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCrud } from '@/hooks/useAdminCrud';
import { useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Search } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price_per_unit: number;
  category?: { id: string; name: string } | null;
  image_url: string | null;
}

interface FestivalProduct {
  id: string;
  product_id: string;
  display_order: number;
  product: Product;
}

interface Festival {
  id: string;
  name: string;
}

const AdminFestivalProductsPage = () => {
  const { festivalId } = useParams<{ festivalId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { insert, remove } = useAdminCrud();
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch festival details
  const { data: festival } = useQuery({
    queryKey: ["festival", festivalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("festivals")
        .select("id, name")
        .eq("id", festivalId)
        .single();
      
      if (error) throw error;
      return data as Festival;
    },
  });

  // Fetch products already in the festival
  const { data: festivalProducts, isLoading: loadingFestivalProducts } = useQuery({
    queryKey: ["festival-products", festivalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("festival_products")
        .select(`
          id,
          product_id,
          display_order,
          product:products(id, name, price_per_unit, image_url, category:categories(id, name))
        `)
        .eq("festival_id", festivalId)
        .order("display_order", { ascending: true });
      
      if (error) throw error;
      return data as FestivalProduct[];
    },
  });

  // Search for products to add
  const { data: searchResults, isLoading: searchingProducts } = useQuery({
    queryKey: ["product-search", searchTerm],
    queryFn: async () => {
      if (!searchTerm) return [];
      
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price_per_unit, image_url, category:categories(id, name)")
        .ilike("name", `%${searchTerm}%`)
        .limit(20);
      
      if (error) throw error;
      return data as Product[];
    },
    enabled: searchTerm.length > 0,
  });

  // Filter out products already in festival
  const availableProducts = searchResults?.filter(
    (product) => !festivalProducts?.some((fp) => fp.product_id === product.id)
  );

  const addProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const maxOrder = festivalProducts?.reduce((max, fp) =>
        Math.max(max, fp.display_order), 0) || 0;

      await insert('festival_products', {
        festival_id: festivalId,
        product_id: productId,
        display_order: maxOrder + 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["festival-products", festivalId] });
      toast({ title: "Product added to festival" });
      setSearchTerm("");
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error adding product", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const removeProductMutation = useMutation({
    mutationFn: async (festivalProductId: string) => {
      await remove('festival_products', [{ column: 'id', operator: 'eq', value: festivalProductId }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["festival-products", festivalId] });
      toast({ title: "Product removed from festival" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error removing product", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  return (
    <AdminLayout title="Festival Products">
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Manage Products for: {festival?.name}
          </h1>
          <p className="text-gray-600 mt-2">
            Add or remove products from this festival
          </p>
        </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Search and Add Products */}
            <Card>
              <CardHeader>
                <CardTitle>Add Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search products by name or category..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {searchingProducts && (
                      <p className="text-sm text-gray-500">Searching...</p>
                    )}
                    
                    {searchTerm && !searchingProducts && availableProducts?.length === 0 && (
                      <p className="text-sm text-gray-500">No products found</p>
                    )}

                    {availableProducts?.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          {product.image_url && (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          )}
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-gray-500">
                              {product.category?.name || 'N/A'} • ${product.price_per_unit.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => addProductMutation.mutate(product.id)}
                          disabled={addProductMutation.isPending}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Current Festival Products */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Current Products ({festivalProducts?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {loadingFestivalProducts && (
                    <p className="text-sm text-gray-500">Loading...</p>
                  )}

                  {festivalProducts?.length === 0 && !loadingFestivalProducts && (
                    <p className="text-sm text-gray-500">
                      No products added yet. Search and add products from the left.
                    </p>
                  )}

                  {festivalProducts?.map((fp) => (
                    <div
                      key={fp.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {fp.product.image_url && (
                          <img
                            src={fp.product.image_url}
                            alt={fp.product.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div>
                          <p className="font-medium">{fp.product.name}</p>
                          <p className="text-sm text-gray-500">
                            {fp.product.category?.name || 'N/A'} • ${fp.product.price_per_unit.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeProductMutation.mutate(fp.id)}
                        disabled={removeProductMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
    </AdminLayout>
  );
};

export default AdminFestivalProductsPage;
