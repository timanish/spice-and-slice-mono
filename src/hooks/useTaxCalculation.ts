import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CategoryTaxRate {
  id: string;
  category: string;
  tax_rate: number;
  created_at: string;
  updated_at: string;
}

interface TaxCalculationResult {
  itemTaxAmount: number;
  itemTaxRate: number | null;
  displayTax: string;
  hasValidTaxRate: boolean;
}

/**
 * Hook to fetch categories with tax rates from the database
 */
export const useCategoryTaxRates = () => {
  return useQuery({
    queryKey: ["category-tax-rates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, tax_rate")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;

      // Map to old format for backward compatibility
      return (data || []).map((cat) => ({
        id: cat.id,
        category: cat.name,
        tax_rate: cat.tax_rate || 0,
        created_at: "",
        updated_at: "",
      })) as CategoryTaxRate[];
    },
  });
};

/**
 * Calculate tax for a single item following the hierarchy:
 * Product tax_rate > Category tax_rate > null (no tax)
 *
 * @param price - Item price per unit (after any discounts)
 * @param quantity - Number of items
 * @param productTaxRate - Product-specific tax rate (0-1 decimal, nullable)
 * @param category - Product category
 * @param categoryTaxRates - Array of category tax rates from database
 * @returns Tax calculation result with amount, rate, display string, and validity flag
 */
export const calculateItemTax = (
  price: number,
  quantity: number,
  productTaxRate: number | null,
  category: string,
  categoryTaxRates: CategoryTaxRate[]
): TaxCalculationResult => {
  // Step 1: Determine which tax rate to use (product > category > null)
  let applicableTaxRate: number | null = null;

  if (productTaxRate !== null && productTaxRate !== undefined) {
    // Product has specific tax rate - use it
    applicableTaxRate = productTaxRate;
  } else {
    // Check if category has a tax rate
    const categoryTax = categoryTaxRates.find((ct) => ct.category === category);
    if (categoryTax) {
      applicableTaxRate = categoryTax.tax_rate;
    }
    // If no category tax rate found, applicableTaxRate remains null (no tax)
  }

  // Step 2: Calculate tax amount
  if (applicableTaxRate === null || applicableTaxRate === 0) {
    return {
      itemTaxAmount: 0,
      itemTaxRate: null,
      displayTax: "$0.00",
      hasValidTaxRate: false,
    };
  }

  // Calculate: (price * quantity) * tax_rate
  // No rounding during calculation - keep exact decimal
  const subtotal = price * quantity;
  const taxAmount = subtotal * applicableTaxRate;

  return {
    itemTaxAmount: taxAmount,
    itemTaxRate: applicableTaxRate,
    displayTax: `$${taxAmount.toFixed(2)}`,
    hasValidTaxRate: true,
  };
};

/**
 * Calculate total tax for multiple cart items
 * Delivery fees are tax-exempt
 *
 * @param items - Array of cart items with price, quantity, tax_rate, category
 * @param categoryTaxRates - Array of category tax rates
 * @returns Total tax amount and taxable subtotal
 */
export const calculateCartTax = (
  items: Array<{
    price: number;
    quantity: number;
    tax_rate: number | null;
    category: string;
  }>,
  categoryTaxRates: CategoryTaxRate[]
): { totalTax: number; taxableSubtotal: number } => {
  let totalTax = 0;
  let taxableSubtotal = 0;

  items.forEach((item) => {
    const itemSubtotal = item.price * item.quantity;
    const { itemTaxAmount, hasValidTaxRate } = calculateItemTax(
      item.price,
      item.quantity,
      item.tax_rate,
      item.category,
      categoryTaxRates
    );

    if (hasValidTaxRate) {
      taxableSubtotal += itemSubtotal;
    }
    totalTax += itemTaxAmount;
  });

  return {
    totalTax,
    taxableSubtotal,
  };
};

/**
 * Format tax rate as percentage for display
 * @param taxRate - Tax rate as decimal (0-1)
 * @returns Formatted percentage string (e.g., "8.5%")
 */
export const formatTaxRate = (taxRate: number | null): string => {
  if (taxRate === null || taxRate === undefined) return "0%";
  return `${(taxRate * 100).toFixed(2)}%`;
};

/**
 * Hook to manage tax calculations with category tax rates
 */
export const useTaxCalculation = () => {
  const { data: categoryTaxRates = [], isLoading } = useCategoryTaxRates();

  return {
    categoryTaxRates,
    isLoading,
    calculateItemTax: (
      price: number,
      quantity: number,
      productTaxRate: number | null,
      category: string
    ) =>
      calculateItemTax(
        price,
        quantity,
        productTaxRate,
        category,
        categoryTaxRates
      ),
    calculateCartTax: (
      items: Array<{
        price: number;
        quantity: number;
        tax_rate: number | null;
        category: string;
      }>
    ) => calculateCartTax(items, categoryTaxRates),
    formatTaxRate,
  };
};
