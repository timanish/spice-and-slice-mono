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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Zap, Clock, Search } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
}

interface FlashDeal {
  id: string;
  product_id: string;
  discount_percentage: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  products: Product;
}

const AdminFlashDealsPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { insert, update, remove } = useAdminCrud();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<FlashDeal | null>(null);
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    product_id: "",
    discount_percentage: 20,
    start_date: "",
    end_date: "",
    is_active: true,
  });

  const { data: flashDeals, isLoading: loadingDeals } = useQuery({
    queryKey: ["admin-flash-deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flash_deals")
        .select(`*, products(id, name, price_per_unit, image_url)`)
        .order("start_date", { ascending: false });
      
      if (error) throw error;
      
      // Map price_per_unit to price for consistency
      return data?.map(deal => ({
        ...deal,
        products: {
          ...deal.products,
          price: deal.products.price_per_unit
        }
      })) as FlashDeal[];
    },
  });

  const { data: allProducts, isLoading: loadingProducts } = useQuery({
    queryKey: ["product-search-deals", productSearchTerm],
    queryFn: async () => {
      if (!productSearchTerm || productSearchTerm.length < 2) return [];
      
      console.log('🔍 Searching for products:', productSearchTerm);
      
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price_per_unit, image_url")
        .ilike("name", `%${productSearchTerm}%`)
        .order("name")
        .limit(20);
      
      if (error) {
        console.error('❌ Error searching products:', error);
        throw error;
      }
      
      console.log('✅ Found products:', data?.length);
      const products = data.map(p => ({ ...p, price: p.price_per_unit })) as Product[];
      console.log('Products:', products);
      return products;
    },
    enabled: productSearchTerm.length >= 2,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!selectedProduct) throw new Error("Please select a product");

      await insert("flash_deals", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-flash-deals"] });
      toast({ title: "Flash deal created successfully" });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error creating flash deal", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      await update("flash_deals", data as Record<string, unknown>, [{ column: "id", operator: "eq", value: id }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-flash-deals"] });
      toast({ title: "Flash deal updated successfully" });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error updating flash deal", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await remove("flash_deals", [{ column: "id", operator: "eq", value: id }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-flash-deals"] });
      toast({ title: "Flash deal deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error deleting flash deal", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      product_id: "",
      discount_percentage: 20,
      start_date: "",
      end_date: "",
      is_active: true,
    });
    setEditingDeal(null);
    setSelectedProduct(null);
    setProductSearchTerm("");
  };

  // Format ISO date to datetime-local format (YYYY-MM-DDTHH:MM)
  const formatDate = (isoDate: string) => {
    if (!isoDate) return "";
    const date = new Date(isoDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto-calculate is_active based on date range and toggle
    const now = new Date();
    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);
    const isInDateRange = now >= start && now <= end;
    
    // Only active if toggle is on AND we're within date range
    const submitData = {
      ...formData,
      is_active: formData.is_active && isInDateRange,
    };
    
    if (editingDeal) {
      updateMutation.mutate({ id: editingDeal.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleEdit = (deal: FlashDeal) => {
    setEditingDeal(deal);
    setSelectedProduct({
      id: deal.products.id,
      name: deal.products.name,
      price: deal.products.price,
      image_url: deal.products.image_url,
    });
    setFormData({
      product_id: deal.product_id,
      discount_percentage: deal.discount_percentage,
      start_date: formatDate(deal.start_date),
      end_date: formatDate(deal.end_date),
      is_active: deal.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this flash deal?")) {
      deleteMutation.mutate(id);
    }
  };

  const calculateDiscountedPrice = (originalPrice: number, discountPercent: number) => {
    return (originalPrice * (1 - discountPercent / 100)).toFixed(2);
  };

  const isCurrentlyActive = (deal: FlashDeal) => {
    const now = new Date();
    const start = new Date(deal.start_date);
    const end = new Date(deal.end_date);
    return now >= start && now <= end && deal.is_active;
  };

  return (
    <AdminLayout title="Flash Deals">
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-8 w-8 text-yellow-500" />
              <h1 className="text-3xl font-bold text-gray-900">Manage Flash Deals</h1>
            </div>
            <p className="text-gray-600">Create and manage time-limited deals with countdown timers</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                Add Flash Deal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingDeal ? "Edit Flash Deal" : "Add New Flash Deal"}</DialogTitle>
                <DialogDescription>
                  {editingDeal ? "Update the flash deal details" : "Create a new time-limited deal"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="product_search">Search Product *</Label>
                  <div className="space-y-2">
                    {selectedProduct ? (
                      <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                        <div className="flex items-center gap-3">
                          {selectedProduct.image_url && (
                            <img
                              src={selectedProduct.image_url}
                              alt={selectedProduct.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          )}
                          <div>
                            <p className="font-medium">{selectedProduct.name}</p>
                            <p className="text-sm text-gray-500">${selectedProduct.price.toFixed(2)}</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedProduct(null);
                            setFormData({ ...formData, product_id: "" });
                          }}
                        >
                          Change
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="relative">
                          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="product_search"
                            placeholder="Search products by name or category..."
                            value={productSearchTerm}
                            onChange={(e) => setProductSearchTerm(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        {productSearchTerm.length >= 2 && (
                          <div className="max-h-60 overflow-y-auto border rounded-lg">
                            {loadingProducts && (
                              <p className="p-3 text-sm text-gray-500">Searching...</p>
                            )}
                            {!loadingProducts && allProducts?.length === 0 && (
                              <p className="p-3 text-sm text-gray-500">No products found</p>
                            )}
                            {allProducts?.map((product) => (
                              <button
                                key={product.id}
                                type="button"
                                onClick={() => {
                                  setSelectedProduct(product);
                                  setFormData({ ...formData, product_id: product.id });
                                  setProductSearchTerm("");
                                }}
                                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 border-b last:border-b-0 text-left"
                              >
                                {product.image_url && (
                                  <img
                                    src={product.image_url}
                                    alt={product.name}
                                    className="w-10 h-10 object-cover rounded"
                                  />
                                )}
                                <div>
                                  <p className="font-medium text-sm">{product.name}</p>
                                  <p className="text-xs text-gray-500">${product.price.toFixed(2)}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="discount_percentage">Discount Percentage *</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="discount_percentage"
                      type="number"
                      value={formData.discount_percentage}
                      onChange={(e) => setFormData({ ...formData, discount_percentage: parseInt(e.target.value) })}
                      min={1}
                      max={99}
                      required
                      className="w-24"
                    />
                    <span className="text-sm text-gray-600">%</span>
                    {formData.product_id && (
                      <span className="text-sm text-gray-600">
                        Final price: ${calculateDiscountedPrice(
                          allProducts?.find(p => p.id === formData.product_id)?.price || 0,
                          formData.discount_percentage
                        )}
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_date">Start Date & Time *</Label>
                    <Input
                      id="start_date"
                      type="datetime-local"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_date">End Date & Time *</Label>
                    <Input
                      id="end_date"
                      type="datetime-local"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="is_active">Enabled</Label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Deal will only show if enabled AND current date/time is within the date range
                  </p>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingDeal ? "Update" : "Create"} Flash Deal
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loadingDeals || loadingProducts ? (
          <div className="text-center py-12">Loading flash deals...</div>
        ) : (
          <div className="space-y-4">
            {flashDeals?.map((deal) => (
              <Card key={deal.id}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <img
                      src={deal.products.image_url || "/placeholder.svg"}
                      alt={deal.products.name}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{deal.products.name}</h3>
                        {isCurrentlyActive(deal) && (
                          <Badge className="bg-yellow-500">
                            <Zap className="h-3 w-3 mr-1" />
                            Live Now
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm mb-2">
                        <span className="text-gray-500 line-through">${deal.products.price.toFixed(2)}</span>
                        <span className="text-2xl font-bold text-food-red">
                          ${calculateDiscountedPrice(deal.products.price, deal.discount_percentage)}
                        </span>
                        <Badge variant="destructive">{deal.discount_percentage}% OFF</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4" />
                        <span>
                          {new Date(deal.start_date).toLocaleString()} - {new Date(deal.end_date).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-col gap-1 items-end">
                        <span className={`px-2 py-1 rounded-full text-xs text-center whitespace-nowrap ${
                          deal.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                        }`}>
                          {deal.is_active ? "Enabled" : "Disabled"}
                        </span>
                        {isCurrentlyActive(deal) && (
                          <span className="px-2 py-1 rounded-full text-xs text-center whitespace-nowrap bg-yellow-100 text-yellow-800">
                            Showing Now
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(deal)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(deal.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loadingDeals && flashDeals?.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No flash deals yet. Create time-limited deals to boost sales!
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminFlashDealsPage;
