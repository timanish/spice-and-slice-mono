
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ProductSchema, type ProductFormValues } from '@/lib/validations/product';
import { ProductImageUpload } from './ProductImageUpload';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCategoriesFetcher } from '@/hooks/useCategoriesFetcher';

interface EditProductFormProps {
  product: {
    id: string;
    name: string;
    description: string | null;
    price_per_unit: number;
    inventory_count: number;
    inventory_weight?: number;
    track_inventory?: boolean;
    low_stock_threshold?: number;
    low_stock_weight_threshold?: number;
    upc_code: string;
    category_id: string;
    image_url: string | null;
    is_weighted?: boolean;
    unit_of_measure?: string;
    min_order_value?: number | null;
    min_order_unit?: 'pieces' | 'kg' | 'lbs' | null;
    tax_rate?: number | null;
  };
  onSubmit: (data: ProductFormValues, image: File | null) => Promise<void>;
  isSubmitting: boolean;
}

export const EditProductForm = ({ product, onSubmit, isSubmitting }: EditProductFormProps) => {
  const [selectedImage, setSelectedImage] = React.useState<File | null>(null);
  const { data: categories = [], isLoading: categoriesLoading } = useCategoriesFetcher();
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(ProductSchema),
    defaultValues: {
      name: product.name,
      description: product.description || '',
      price_per_unit: product.price_per_unit,
      inventory_count: product.inventory_count,
      inventory_weight: product.inventory_weight || 0,
      track_inventory: product.track_inventory !== false,
      low_stock_threshold: product.low_stock_threshold || 10,
      low_stock_weight_threshold: product.low_stock_weight_threshold || 10,
      upc_code: product.upc_code,
      category_id: product.category_id,
      is_weighted: product.is_weighted || false,
      unit_of_measure: product.unit_of_measure || 'lb',
      min_order_value: product.min_order_value,
      min_order_unit: product.min_order_unit,
      tax_rate: product.tax_rate ? product.tax_rate * 100 : null,
      priority: (product as any).priority ?? 0,
    },
  });

  // Reset form when product changes to ensure tax_rate conversion is applied
  React.useEffect(() => {
    form.reset({
      name: product.name,
      description: product.description || '',
      price_per_unit: product.price_per_unit,
      inventory_count: product.inventory_count,
      inventory_weight: product.inventory_weight || 0,
      track_inventory: product.track_inventory !== false,
      low_stock_threshold: product.low_stock_threshold || 10,
      low_stock_weight_threshold: product.low_stock_weight_threshold || 10,
      upc_code: product.upc_code,
      category_id: product.category_id,
      is_weighted: product.is_weighted || false,
      unit_of_measure: product.unit_of_measure || 'lb',
      min_order_value: product.min_order_value,
      min_order_unit: product.min_order_unit,
      tax_rate: product.tax_rate ? product.tax_rate * 100 : null,
      priority: (product as any).priority ?? 0,
    });
    setSelectedImage(null);
  }, [product.id, form, product]);

  const watchIsWeighted = form.watch('is_weighted');
  const watchMinOrderValue = form.watch('min_order_value');

  const handleSubmit = async (data: ProductFormValues) => {
    // Convert tax_rate from percentage (9) to decimal (0.09) before saving
    const submissionData = {
      ...data,
      tax_rate: data.tax_rate ? data.tax_rate / 100 : null,
    };
    await onSubmit(submissionData, selectedImage);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter product name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="category_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categoriesLoading ? (
                      <SelectItem value="loading" disabled>Loading categories...</SelectItem>
                    ) : categories.length === 0 ? (
                      <SelectItem value="empty" disabled>No categories available</SelectItem>
                    ) : (
                      categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display Priority (0-10)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="0" 
                    max="10" 
                    step="1"
                    placeholder="0"
                    {...field}
                    onChange={(e) => {
                      const value = Math.max(0, Math.min(10, parseInt(e.target.value) || 0));
                      field.onChange(value);
                    }}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Higher priority = shown first (10 highest, 0 lowest)
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <ProductImageUpload
          selectedImage={selectedImage}
          onImageSelect={setSelectedImage}
          currentImageUrl={product.image_url}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="price_per_unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {watchIsWeighted ? "Price per Unit of Measure ($)" : "Price ($)"}
                </FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    {...field}
                    onChange={(e) => field.onChange(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {watchIsWeighted ? (
            <FormField
              control={form.control}
              name="inventory_weight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Inventory Weight</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0" 
                      step="0.01" 
                      {...field}
                      onChange={(e) => field.onChange(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <FormField
              control={form.control}
              name="inventory_count"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Inventory Count</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0" 
                      step="1" 
                      {...field}
                      onChange={(e) => field.onChange(e.target.value === '' ? 0 : parseInt(e.target.value, 10))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <FormField
          control={form.control}
          name="upc_code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>UPC Code</FormLabel>
              <FormControl>
                <Input placeholder="Enter UPC code" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="is_weighted"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Sold by Weight
                  </FormLabel>
                  <p className="text-sm text-gray-500">
                    This product is priced per unit of weight
                  </p>
                </div>
              </FormItem>
            )}
          />
          
          {watchIsWeighted && (
            <FormField
              control={form.control}
              name="unit_of_measure"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit of Measure</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value || 'lb'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit of measure" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="lb">Pound (lb)</SelectItem>
                      <SelectItem value="oz">Ounce (oz)</SelectItem>
                      <SelectItem value="kg">Kilogram (kg)</SelectItem>
                      <SelectItem value="g">Gram (g)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter product description" 
                  className="h-32"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Minimum Order Section */}
        <div className="border rounded-lg p-4 space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm font-medium">Minimum Order Requirement (Optional)</h3>
            <p className="text-xs text-muted-foreground">
              Set a minimum orderable quantity or weight for this product (e.g., "Goat Leg - Min 6kg")
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="min_order_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum Value</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      min="0" 
                      placeholder="e.g., 6"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? null : parseFloat(e.target.value);
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="min_order_unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                    value={field.value ?? 'none'}
                    disabled={!watchMinOrderValue}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No minimum</SelectItem>
                      <SelectItem value="pieces">Pieces</SelectItem>
                      <SelectItem value="kg">Kilograms (kg)</SelectItem>
                      <SelectItem value="lbs">Pounds (lbs)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                  {watchMinOrderValue && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Select the unit for the minimum order value
                    </p>
                  )}
                </FormItem>
              )}
            />
          </div>

          {watchMinOrderValue && form.watch('min_order_unit') && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-xs text-blue-700">
                ℹ️ Customers must order at least <strong>{watchMinOrderValue} {form.watch('min_order_unit')}</strong> of this product
              </p>
            </div>
          )}
        </div>

        {/* Tax Rate Section (Optional) */}
        <div className="border rounded-lg p-4 space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm font-medium">Product Tax Rate (Optional)</h3>
            <p className="text-xs text-muted-foreground">
              Override category tax rate for this specific product. Leave empty to use category tax rate.
            </p>
          </div>
          
          <FormField
            control={form.control}
            name="tax_rate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tax Rate (%)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    max="100"
                    placeholder="e.g., 8.5 for 8.5%"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const value = e.target.value === '' ? null : parseFloat(e.target.value);
                      field.onChange(value);
                    }}
                  />
                </FormControl>
                <FormMessage />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter percentage (e.g., 8.5 for 8.5%). Leave empty to use category default.
                </p>
              </FormItem>
            )}
          />
        </div>
        
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </Form>
  );
};
