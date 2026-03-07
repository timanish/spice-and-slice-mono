
import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { uploadImage } from '@/lib/upload-image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAdminCrud } from '@/hooks/useAdminCrud';
import { EditProductForm } from './EditProductForm';
import type { ProductFormValues } from '@/lib/validations/product';

interface EditProductDialogProps {
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
    category?: { id: string; name: string; tax_rate?: number | null };
    image_url: string | null;
    is_weighted?: boolean;
    unit_of_measure?: string;
    min_order_value?: number | null;
    min_order_unit?: 'pieces' | 'kg' | 'lbs' | null;
    tax_rate?: number | null;
    shippable_nationwide?: boolean | null;
  };
  isOpen: boolean;
  onClose: () => void;
  onProductUpdated: () => void;
}

export const EditProductDialog = ({ 
  product, 
  isOpen, 
  onClose,
  onProductUpdated 
}: EditProductDialogProps) => {
  const { toast } = useToast();
  const { update } = useAdminCrud();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (data: ProductFormValues, selectedImage: File | null) => {
    try {
      setIsSubmitting(true);

      let imageUrl = product.image_url;
      if (selectedImage) {
        const fileExt = selectedImage.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;

        imageUrl = await uploadImage(selectedImage, fileName, { requireAdmin: true });
      }

      await update(
        'products',
        {
          name: data.name,
          description: data.description,
          price_per_unit: data.price_per_unit,
          inventory_count: data.inventory_count,
          inventory_weight: data.inventory_weight,
          track_inventory: data.track_inventory,
          low_stock_threshold: data.low_stock_threshold,
          low_stock_weight_threshold: data.low_stock_weight_threshold,
          upc_code: data.upc_code,
          category_id: data.category_id,
          image_url: imageUrl,
          is_weighted: data.is_weighted || false,
          unit_of_measure: data.unit_of_measure || 'lb',
          min_order_value: data.min_order_value,
          min_order_unit: data.min_order_unit,
          tax_rate: data.tax_rate,
          priority: data.priority ?? 0,
          shippable_nationwide: data.shippable_nationwide,
          updated_at: new Date().toISOString(),
        },
        [{ column: 'id', operator: 'eq', value: product.id }],
      );
      
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
      
      onProductUpdated();
      onClose();
      
    } catch (error: any) {
      console.error('Error updating product:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update product",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 pr-1">
          <EditProductForm
            product={product}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
