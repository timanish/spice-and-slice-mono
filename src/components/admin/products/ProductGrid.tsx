
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Trash2, ImageIcon } from 'lucide-react';

interface ProductGridProps {
  products: any[];
  onEdit: (product: any) => void;
  onDelete: (product: any) => void;
  onRestore: (product: any) => void;
}

const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  onEdit,
  onDelete,
  onRestore
}) => {
  if (products.length === 0) {
    return (
      <div className="col-span-full text-center p-6 bg-muted/50 rounded-lg">
        <p className="text-muted-foreground">
          No products found matching your criteria
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => (
        <Card key={product.id} className={!product.is_active ? "opacity-70" : ""}>
          {/* Product image */}
          <AspectRatio ratio={16/9} className="bg-muted">
            {product.image_url ? (
              <img 
                src={product.image_url}
                alt={product.name}
                className="object-cover w-full h-full"
                onError={(e) => {
                  // Fallback if image fails to load
                  e.currentTarget.src = "/placeholder.svg";
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <ImageIcon className="h-10 w-10 text-muted-foreground" />
              </div>
            )}
          </AspectRatio>
          
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              {product.name}
              {!product.is_active && (
                <span className="bg-muted text-xs px-2 py-1 rounded-md">
                  Inactive
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-2">{product.description}</p>
            <p className="font-semibold">${product.price_per_unit}</p>
            <p className="text-sm text-gray-500">
              Stock: {product.is_weighted 
                ? `${product.inventory_weight || 0} ${product.unit_of_measure || 'lb'}` 
                : product.inventory_count}
            </p>
            <p className="text-xs text-gray-500 mt-1">Category: {product.category?.name || 'N/A'}</p>
            <div className="flex mt-4 space-x-2">
              <Button onClick={() => onEdit(product)}>
                Edit
              </Button>
              
              {product.is_active ? (
                <Button 
                  variant="destructive"
                  onClick={() => onDelete(product)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => onRestore(product)}
                >
                  Restore
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ProductGrid;
