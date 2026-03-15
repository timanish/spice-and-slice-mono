import * as z from "zod";

export const ProductSchema = z
  .object({
    name: z.string().min(2, { message: "Name must be at least 2 characters" }),
    description: z
      .string()
      .min(10, { message: "Description must be at least 10 characters" })
      .optional()
      .nullable()
      .or(z.literal("")),
    price_per_unit: z.coerce
      .number()
      .positive({ message: "Price must be a positive number" }),
    inventory_count: z.coerce
      .number()
      .int()
      .nonnegative({
        message: "Inventory count must be a non-negative integer",
      })
      .optional()
      .default(0),
    inventory_weight: z.coerce
      .number()
      .nonnegative({ message: "Inventory weight must be non-negative" })
      .optional()
      .default(0),
    track_inventory: z.boolean().optional().default(true),
    low_stock_threshold: z.coerce
      .number()
      .int()
      .nonnegative()
      .optional()
      .default(10),
    low_stock_weight_threshold: z.coerce
      .number()
      .nonnegative()
      .optional()
      .default(10),
    upc_code: z.string().optional().nullable().or(z.literal("")),
    category_id: z.string().uuid({ message: "Category is required" }),
    is_weighted: z.boolean().optional().default(false),
    unit_of_measure: z.string().optional().nullable(),
    min_order_value: z.coerce
      .number()
      .positive({ message: "Minimum order must be positive" })
      .optional()
      .nullable(),
    min_order_unit: z.enum(["pieces", "kg", "lbs"]).optional().nullable(),
    tax_rate: z.coerce
      .number()
      .min(0, { message: "Tax rate cannot be negative" })
      .max(100, { message: "Tax rate cannot exceed 100%" })
      .optional()
      .nullable(),
    priority: z.coerce
      .number()
      .int()
      .min(0, { message: "Priority must be at least 0" })
      .max(10, { message: "Priority cannot exceed 10" })
      .optional()
      .default(0),
    shippable_nationwide: z.boolean().nullable().optional().default(null),
    sub_category: z.string().optional().nullable().or(z.literal("")),
  })
  .refine(
    (data) => {
      // If one minimum order field is set, both must be set
      const hasMinValue =
        data.min_order_value !== null && data.min_order_value !== undefined;
      const hasMinUnit =
        data.min_order_unit !== null && data.min_order_unit !== undefined;
      return (hasMinValue && hasMinUnit) || (!hasMinValue && !hasMinUnit);
    },
    {
      message:
        "Both minimum order value and unit must be set together, or both left empty",
      path: ["min_order_value"],
    }
  )
  .refine(
    (data) => {
      // If weighted, unit_of_measure is required
      if (data.is_weighted && !data.unit_of_measure) {
        return false;
      }
      return true;
    },
    {
      message: "Unit of measure is required for weight-based items",
      path: ["unit_of_measure"],
    }
  );

export type ProductFormValues = z.infer<typeof ProductSchema>;
