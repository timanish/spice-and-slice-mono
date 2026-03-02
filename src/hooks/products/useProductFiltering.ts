import { useMemo } from "react";
import { ProductFiltersType } from "@/components/product-filters";
import { Product } from "./types";

export const useProductFiltering = (
  allProducts: Product[] = [],
  filters: ProductFiltersType
) => {
  const filteredProducts = useMemo(() => {
    console.log("[useProductFiltering] Starting filter with:", {
      totalProducts: allProducts.length,
      searchTerm: filters.searchTerm,
      categories: filters.categories,
      brands: filters.brands,
    });

    if (!allProducts || allProducts.length === 0) {
      console.log("[useProductFiltering] No products to filter");
      return [];
    }

    const filtered = allProducts.filter((product) => {
      // Search term filter - search in name, description, brand, and category
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesName = product.name.toLowerCase().includes(searchLower);
        const matchesDescription = product.description
          ?.toLowerCase()
          .includes(searchLower);
        const matchesBrand = product.brand?.toLowerCase().includes(searchLower);
        const matchesCategory = product.category?.name
          ?.toLowerCase()
          .includes(searchLower);

        if (
          !matchesName &&
          !matchesDescription &&
          !matchesBrand &&
          !matchesCategory
        ) {
          return false;
        }
      }

      // Category filter - case insensitive comparison
      if (
        filters.categories.length > 0 &&
        !filters.categories.some(
          (cat) => cat.toLowerCase() === product.category?.name?.toLowerCase()
        )
      ) {
        return false;
      }

      // Brand filter
      if (
        filters.brands.length > 0 &&
        product.brand &&
        !filters.brands.includes(product.brand)
      ) {
        return false;
      }

      // Price range filter - only apply if explicitly set by user
      if (
        filters.priceRangeModified &&
        (product.price_per_unit < filters.priceRange[0] ||
          product.price_per_unit > filters.priceRange[1])
      ) {
        return false;
      }

      return true;
    });

    console.log("[useProductFiltering] Filtered results:", {
      inputCount: allProducts.length,
      outputCount: filtered.length,
      searchTerm: filters.searchTerm,
    });

    return filtered;
  }, [allProducts, filters]);

  return filteredProducts;
};
