
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ProductImageUpload } from '@/components/products/ProductImageUpload';
import { Switch } from '@/components/ui/switch';

interface Category {
  id: string;
  name: string;
}

const MenuItemSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters long" }),
  description: z.string().optional(),
  price: z.coerce.number().min(0, { message: "Price must be a positive number" }),
  category_id: z.string().min(1, { message: "Category is required" }),
  sub_category: z.string().optional(),
  is_vegetarian: z.boolean().default(false),
  is_spicy: z.boolean().default(false),
  serves_people: z.coerce.number().min(1, { message: "Must serve at least 1 person" }).optional().nullable(),
});

export type MenuItemFormValues = z.infer<typeof MenuItemSchema>;

interface MenuItemFormProps {
  onSubmit: (data: MenuItemFormValues, image: File | null) => Promise<void>;
  isSubmitting: boolean;
  categories: Category[];
  defaultValues?: Partial<MenuItemFormValues>;
  submitLabel?: string;
  currentImageUrl?: string | null;
}

export const MenuItemForm = ({ 
  onSubmit, 
  isSubmitting,
  categories,
  defaultValues = {
    name: '',
    description: '',
    price: 0,
    category_id: '',
    sub_category: '',
    is_vegetarian: false,
    is_spicy: false,
    serves_people: null,
  }, 
  submitLabel = "Create Menu Item",
  currentImageUrl,
}: MenuItemFormProps) => {
  const [selectedImage, setSelectedImage] = React.useState<File | null>(null);
  
  const form = useForm<MenuItemFormValues>({
    resolver: zodResolver(MenuItemSchema),
    defaultValues,
  });

  const handleSubmit = async (data: MenuItemFormValues) => {
    await onSubmit(data, selectedImage);
    if (!defaultValues.name) {
      form.reset();
      setSelectedImage(null);
    }
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
                <FormLabel>Menu Item Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter menu item name" {...field} />
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
                <FormControl>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    {...field}
                  >
                    <option value="" disabled>Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <ProductImageUpload
          selectedImage={selectedImage}
          onImageSelect={setSelectedImage}
          currentImageUrl={currentImageUrl ?? undefined}
        />
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter item description" 
                  className="h-20"
                  {...field} 
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price ($)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="serves_people"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Serves (People)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="1" 
                    min="1" 
                    placeholder="e.g., 10"
                    {...field} 
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="sub_category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sub Category (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="E.g., Vegetarian, Spicy, etc." {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="is_vegetarian"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Vegetarian</FormLabel>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="is_spicy"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Spicy</FormLabel>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        
        <Button 
          type="submit" 
          className="w-full bg-food-red hover:bg-food-red/90" 
          disabled={isSubmitting}
        >
          {isSubmitting ? "Processing..." : submitLabel}
        </Button>
      </form>
    </Form>
  );
};
