import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCrud } from "@/hooks/useAdminCrud";
import { uploadImage } from "@/lib/upload-image";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProductFormValues } from "@/lib/validations/product";

export const useProductManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { insert, update } = useAdminCrud();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [productToDelete, setProductToDelete] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState<boolean | null>(true); // Default to showing active products
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [imageFilter, setImageFilter] = useState<
    "all" | "with-image" | "without-image" | "default-image"
  >("all");

  // Fetch products based on active filter
  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products", { activeFilter }],
    queryFn: async () => {
      let allProducts: any[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      // Fetch all products in batches of 1000
      while (hasMore) {
        let query = supabase
          .from("products")
          .select(
            `
            *,
            category:categories(id, name)
          `,
            { count: "exact" }
          )
          .order("created_at", { ascending: false })
          .range(from, from + pageSize - 1);

        // Apply filter if set
        if (activeFilter !== null) {
          query = query.eq("is_active", activeFilter);
        }

        const { data, error } = await query;

        if (error) throw error;

        if (data && data.length > 0) {
          allProducts = [...allProducts, ...data];
          from += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      return allProducts;
    },
  });

  // Get unique categories from products for filter dropdown
  const categories = products
    ? Array.from(
        new Set(products.map((p) => p.category?.name).filter(Boolean))
      ).sort()
    : [];

  // Filter products based on search term, category, and image filter
  const filteredProducts = products
    ? products.filter((product) => {
        // Search term filter
        const matchesSearch =
          searchTerm === "" ||
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (product.description &&
            product.description
              .toLowerCase()
              .includes(searchTerm.toLowerCase()));

        // Category filter
        const matchesCategory =
          categoryFilter === null || product.category?.name === categoryFilter;

        // Image filter
        let matchesImageFilter = true;
        if (imageFilter === "with-image") {
          matchesImageFilter = !!product.image_url;
        } else if (imageFilter === "without-image") {
          matchesImageFilter = !product.image_url;
        } else if (imageFilter === "default-image") {
          matchesImageFilter = product.has_default_image === true;
        }

        return matchesSearch && matchesCategory && matchesImageFilter;
      })
    : [];

  const handleCreate = async (
    data: ProductFormValues,
    selectedImage: File | null
  ) => {
    try {
      setIsSubmitting(true);

      let imageUrl = null;
      if (selectedImage) {
        const fileExt = selectedImage.name.split(".").pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `${fileName}`;

        imageUrl = await uploadImage(selectedImage, filePath, { requireAdmin: true });
      }

      await insert("products", {
        name: data.name,
        description: data.description,
        price_per_unit: data.price_per_unit,
        inventory_count: data.inventory_count || 0,
        inventory_weight: data.inventory_weight || 0,
        track_inventory: data.track_inventory !== false,
        low_stock_threshold: data.low_stock_threshold || 10,
        low_stock_weight_threshold: data.low_stock_weight_threshold || 10,
        upc_code: data.upc_code,
        category_id: data.category_id,
        image_url: imageUrl,
        is_weighted: data.is_weighted || false,
        unit_of_measure: data.unit_of_measure || "lb",
        min_order_value: data.min_order_value,
        min_order_unit: data.min_order_unit,
        tax_rate: data.tax_rate,
        priority: data.priority ?? 0,
        shippable_nationwide: data.shippable_nationwide,
        sub_category: data.sub_category || null,
        is_active: true,
      });

      toast({
        title: "Success",
        description: "Product created successfully",
      });

      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    } catch (error: any) {
      console.error("Error creating product:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create product",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProductUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;

    try {
      // Mark the product as inactive rather than deleting it
      await update("products", { is_active: false }, [
        { column: "id", operator: "eq", value: productToDelete.id },
      ]);

      toast({
        title: "Success",
        description: "Product deleted successfully",
      });

      setProductToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    } catch (error: any) {
      console.error("Error deleting product:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete product",
      });
    }
  };

  const handleRestoreProduct = async (product: any) => {
    try {
      await update("products", { is_active: true }, [
        { column: "id", operator: "eq", value: product.id },
      ]);

      toast({
        title: "Success",
        description: "Product restored successfully",
      });

      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    } catch (error: any) {
      console.error("Error restoring product:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to restore product",
      });
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setCategoryFilter(null);
    setActiveFilter(true);
    setImageFilter("all");
  };

  return {
    products: filteredProducts,
    isLoading,
    categories,
    searchTerm,
    setSearchTerm,
    activeFilter,
    setActiveFilter,
    categoryFilter,
    setCategoryFilter,
    imageFilter,
    setImageFilter,
    viewMode,
    setViewMode,
    editingProduct,
    setEditingProduct,
    productToDelete,
    setProductToDelete,
    isSubmitting,
    clearFilters,
    handleCreate,
    handleProductUpdated,
    handleDeleteProduct,
    handleRestoreProduct,
    handleSearchChange,
  };
};
