import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCrud } from "@/hooks/useAdminCrud";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  ShoppingBag,
  Search,
  Loader2,
} from "lucide-react";

/* ---------- Types ---------- */

interface ProductResult {
  id: string;
  name: string;
  price_per_unit: number;
  image_url: string | null;
  is_weighted: boolean;
  unit_of_measure: string | null;
}

interface ComboItemForm {
  /** Temporary client-side key for React list rendering */
  _key: string;
  product_id: string;
  product: ProductResult;
  quantity: number;
  weight: number | null;
  is_addon: boolean;
  addon_price: number | null;
  position: number;
}

interface ComboItem {
  id: string;
  product_id: string;
  quantity: number;
  weight: number | null;
  is_addon: boolean;
  addon_price: number | null;
  position: number;
  products: ProductResult;
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

/* ---------- Helpers ---------- */

const emptyFormData = () => ({
  name: "",
  description: "",
  image_url: "",
  combo_price: 0,
  display_order: 0,
  is_active: true,
});

let keyCounter = 0;
const nextKey = () => `item-${++keyCounter}`;

/* ---------- Component ---------- */

const AdminShopCombosPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { insert, update, remove } = useAdminCrud();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState<ProductCombo | null>(null);
  const [formData, setFormData] = useState(emptyFormData());
  const [comboItems, setComboItems] = useState<ComboItemForm[]>([]);
  const [productSearch, setProductSearch] = useState("");

  /* ---- Queries ---- */

  const { data: combos, isLoading } = useQuery({
    queryKey: ["admin-combos"],
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
        .order("display_order");
      if (error) throw error;
      return data as unknown as ProductCombo[];
    },
  });

  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ["product-search", productSearch],
    queryFn: async () => {
      if (!productSearch || productSearch.length < 2) return [];
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, name, price_per_unit, image_url, is_weighted, unit_of_measure"
        )
        .ilike("name", `%${productSearch}%`)
        .eq("is_active", true)
        .limit(10);
      if (error) throw error;
      return data as ProductResult[];
    },
    enabled: productSearch.length >= 2,
  });

  /* ---- Mutations ---- */

  const createMutation = useMutation({
    mutationFn: async () => {
      if (comboItems.length === 0)
        throw new Error("Add at least one product to the combo");

      // 1. Insert the combo and get its ID back
      const comboResult = await insert(
        "product_combos",
        {
          name: formData.name,
          description: formData.description || null,
          image_url: formData.image_url || null,
          combo_price: formData.combo_price,
          display_order: formData.display_order,
          is_active: formData.is_active,
        },
        "id"
      );

      const comboId =
        comboResult?.data?.[0]?.id ?? comboResult?.[0]?.id ?? null;
      if (!comboId) throw new Error("Failed to retrieve new combo ID");

      // 2. Insert combo items
      const itemRows = comboItems.map((item, idx) => ({
        combo_id: comboId,
        product_id: item.product_id,
        quantity: item.quantity,
        weight: item.weight,
        is_addon: item.is_addon,
        addon_price: item.is_addon ? item.addon_price : null,
        position: idx,
      }));

      await insert("combo_items", itemRows);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-combos"] });
      toast({ title: "Combo created successfully" });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating combo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingCombo) throw new Error("No combo selected for editing");
      if (comboItems.length === 0)
        throw new Error("Add at least one product to the combo");

      const comboId = editingCombo.id;

      // 1. Update the combo row
      await update(
        "product_combos",
        {
          name: formData.name,
          description: formData.description || null,
          image_url: formData.image_url || null,
          combo_price: formData.combo_price,
          display_order: formData.display_order,
          is_active: formData.is_active,
        },
        [{ column: "id", operator: "eq", value: comboId }]
      );

      // 2. Delete existing combo_items
      await remove("combo_items", [
        { column: "combo_id", operator: "eq", value: comboId },
      ]);

      // 3. Re-insert combo items
      const itemRows = comboItems.map((item, idx) => ({
        combo_id: comboId,
        product_id: item.product_id,
        quantity: item.quantity,
        weight: item.weight,
        is_addon: item.is_addon,
        addon_price: item.is_addon ? item.addon_price : null,
        position: idx,
      }));

      await insert("combo_items", itemRows);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-combos"] });
      toast({ title: "Combo updated successfully" });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating combo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await remove("product_combos", [
        { column: "id", operator: "eq", value: id },
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-combos"] });
      toast({ title: "Combo deleted successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting combo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({
      id,
      is_active,
    }: {
      id: string;
      is_active: boolean;
    }) => {
      await update(
        "product_combos",
        { is_active },
        [{ column: "id", operator: "eq", value: id }]
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-combos"] });
      toast({ title: "Combo status updated" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error toggling status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  /* ---- Form Helpers ---- */

  const resetForm = () => {
    setFormData(emptyFormData());
    setComboItems([]);
    setEditingCombo(null);
    setProductSearch("");
  };

  const handleEdit = (combo: ProductCombo) => {
    setEditingCombo(combo);
    setFormData({
      name: combo.name,
      description: combo.description || "",
      image_url: combo.image_url || "",
      combo_price: combo.combo_price,
      display_order: combo.display_order,
      is_active: combo.is_active,
    });
    setComboItems(
      combo.combo_items
        .sort((a, b) => a.position - b.position)
        .map((item) => ({
          _key: nextKey(),
          product_id: item.product_id,
          product: item.products,
          quantity: item.quantity,
          weight: item.weight,
          is_addon: item.is_addon,
          addon_price: item.addon_price,
          position: item.position,
        }))
    );
    setProductSearch("");
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this combo?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCombo) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const addProductToCombo = (product: ProductResult) => {
    setComboItems((prev) => [
      ...prev,
      {
        _key: nextKey(),
        product_id: product.id,
        product,
        quantity: 1,
        weight: product.is_weighted ? 1 : null,
        is_addon: false,
        addon_price: null,
        position: prev.length,
      },
    ]);
    setProductSearch("");
  };

  const removeComboItem = (key: string) => {
    setComboItems((prev) => prev.filter((item) => item._key !== key));
  };

  const updateComboItem = (
    key: string,
    updates: Partial<ComboItemForm>
  ) => {
    setComboItems((prev) =>
      prev.map((item) =>
        item._key === key ? { ...item, ...updates } : item
      )
    );
  };

  /* ---- Derived ---- */

  const coreCount = (items: ComboItem[]) =>
    items.filter((i) => !i.is_addon).length;
  const addonCount = (items: ComboItem[]) =>
    items.filter((i) => i.is_addon).length;

  const isSaving = createMutation.isPending || updateMutation.isPending;

  /* ---- Render ---- */

  return (
    <AdminLayout title="Shop Combos">
      <div className="p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShoppingBag className="h-8 w-8 text-food-red" />
              <h1 className="text-3xl font-bold text-gray-900">
                Shop Combos
              </h1>
            </div>
            <p className="text-gray-600">
              Create and manage product bundles with optional add-ons
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                Create Combo
              </Button>
            </DialogTrigger>

            {/* ---------- Create / Edit Dialog ---------- */}
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingCombo ? "Edit Combo" : "Create New Combo"}
                </DialogTitle>
                <DialogDescription>
                  {editingCombo
                    ? "Update the combo details and items"
                    : "Bundle products together at a special price"}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Name */}
                <div>
                  <Label htmlFor="combo_name">Name *</Label>
                  <Input
                    id="combo_name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g. Weekend BBQ Pack"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="combo_desc">Description</Label>
                  <Textarea
                    id="combo_desc"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Describe what makes this combo special..."
                    rows={3}
                  />
                </div>

                {/* Image URL */}
                <div>
                  <Label htmlFor="combo_image">Image URL</Label>
                  <Input
                    id="combo_image"
                    value={formData.image_url}
                    onChange={(e) =>
                      setFormData({ ...formData, image_url: e.target.value })
                    }
                    placeholder="https://..."
                  />
                </div>

                {/* Price & Order */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="combo_price">Combo Price ($) *</Label>
                    <Input
                      id="combo_price"
                      type="number"
                      min={0}
                      step={0.01}
                      value={formData.combo_price}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          combo_price: parseFloat(e.target.value) || 0,
                        })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="combo_order">Display Order</Label>
                    <Input
                      id="combo_order"
                      type="number"
                      min={0}
                      value={formData.display_order}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          display_order: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>

                {/* Active Toggle */}
                <div className="flex items-center space-x-2">
                  <Switch
                    id="combo_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_active: checked })
                    }
                  />
                  <Label htmlFor="combo_active">Active</Label>
                </div>

                {/* ---------- Combo Items Section ---------- */}
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">
                      Combo Items
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {comboItems.length} item
                      {comboItems.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Product Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search products to add..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Search Results Dropdown */}
                  {productSearch.length >= 2 && (
                    <div className="max-h-48 overflow-y-auto border rounded-lg">
                      {searchLoading && (
                        <p className="p-3 text-sm text-gray-500 flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Searching...
                        </p>
                      )}
                      {!searchLoading && searchResults?.length === 0 && (
                        <p className="p-3 text-sm text-gray-500">
                          No products found
                        </p>
                      )}
                      {searchResults?.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => addProductToCombo(product)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 border-b last:border-b-0 text-left"
                        >
                          {product.image_url && (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-10 h-10 object-cover rounded"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {product.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              ${product.price_per_unit.toFixed(2)}
                              {product.is_weighted
                                ? ` / ${product.unit_of_measure || "lb"}`
                                : ""}
                            </p>
                          </div>
                          <Plus className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Added Items List */}
                  {comboItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No items added yet. Search for products above.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {comboItems.map((item) => (
                        <div
                          key={item._key}
                          className="border rounded-lg p-3 bg-gray-50 space-y-3"
                        >
                          {/* Item header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              {item.product.image_url && (
                                <img
                                  src={item.product.image_url}
                                  alt={item.product.name}
                                  className="w-8 h-8 object-cover rounded flex-shrink-0"
                                />
                              )}
                              <span className="font-medium text-sm truncate">
                                {item.product.name}
                              </span>
                              {item.product.is_weighted && (
                                <Badge variant="outline" className="text-xs">
                                  Weighted
                                </Badge>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeComboItem(item._key)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* Item fields */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                              <Label className="text-xs">Quantity</Label>
                              <Input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) =>
                                  updateComboItem(item._key, {
                                    quantity:
                                      parseInt(e.target.value) || 1,
                                  })
                                }
                                className="h-8 text-sm"
                              />
                            </div>
                            {item.product.is_weighted && (
                              <div>
                                <Label className="text-xs">
                                  Weight ({item.product.unit_of_measure || "lb"})
                                </Label>
                                <Input
                                  type="number"
                                  min={0}
                                  step={0.01}
                                  value={item.weight ?? ""}
                                  onChange={(e) =>
                                    updateComboItem(item._key, {
                                      weight:
                                        parseFloat(e.target.value) || null,
                                    })
                                  }
                                  className="h-8 text-sm"
                                />
                              </div>
                            )}
                            <div className="flex items-end gap-2">
                              <div className="flex items-center space-x-2 pb-1">
                                <Switch
                                  id={`addon-${item._key}`}
                                  checked={item.is_addon}
                                  onCheckedChange={(checked) =>
                                    updateComboItem(item._key, {
                                      is_addon: checked,
                                      addon_price: checked
                                        ? item.addon_price ?? item.product.price_per_unit
                                        : null,
                                    })
                                  }
                                />
                                <Label
                                  htmlFor={`addon-${item._key}`}
                                  className="text-xs"
                                >
                                  Add-on
                                </Label>
                              </div>
                            </div>
                            {item.is_addon && (
                              <div>
                                <Label className="text-xs">
                                  Addon Price ($)
                                </Label>
                                <Input
                                  type="number"
                                  min={0}
                                  step={0.01}
                                  value={item.addon_price ?? ""}
                                  onChange={(e) =>
                                    updateComboItem(item._key, {
                                      addon_price:
                                        parseFloat(e.target.value) || null,
                                    })
                                  }
                                  className="h-8 text-sm"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Dialog Footer */}
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {editingCombo ? "Update" : "Create"} Combo
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* ---------- Combo List ---------- */}
        {isLoading ? (
          <div className="text-center py-12">Loading combos...</div>
        ) : (
          <div className="space-y-4">
            {combos?.map((combo) => (
              <Card key={combo.id}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    {/* Thumbnail */}
                    {combo.image_url ? (
                      <img
                        src={combo.image_url}
                        alt={combo.name}
                        className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <ShoppingBag className="h-8 w-8 text-gray-400" />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-lg">
                          {combo.name}
                        </h3>
                        <Badge
                          className={
                            combo.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }
                        >
                          {combo.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      {combo.description && (
                        <p className="text-sm text-gray-500 line-clamp-1 mb-2">
                          {combo.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-2xl font-bold text-food-red">
                          ${combo.combo_price.toFixed(2)}
                        </span>
                        <span className="text-gray-500">
                          {coreCount(combo.combo_items)} item
                          {coreCount(combo.combo_items) !== 1 ? "s" : ""}
                        </span>
                        {addonCount(combo.combo_items) > 0 && (
                          <span className="text-gray-500">
                            {addonCount(combo.combo_items)} add-on
                            {addonCount(combo.combo_items) !== 1 ? "s" : ""}
                          </span>
                        )}
                        <span className="text-gray-400">
                          Order: {combo.display_order}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 items-end flex-shrink-0">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={combo.is_active}
                          onCheckedChange={(checked) =>
                            toggleActiveMutation.mutate({
                              id: combo.id,
                              is_active: checked,
                            })
                          }
                        />
                        <span className="text-xs text-gray-500 w-14">
                          {combo.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(combo)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(combo.id)}
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

        {/* Empty State */}
        {!isLoading && combos?.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No combos yet. Create product bundles to boost sales!
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminShopCombosPage;
