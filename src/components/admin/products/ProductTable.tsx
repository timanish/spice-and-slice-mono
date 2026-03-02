
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2 } from 'lucide-react';

interface ProductTableProps {
  products: any[];
  onEdit: (product: any) => void;
  onDelete: (product: any) => void;
  onRestore: (product: any) => void;
}

const ProductTable: React.FC<ProductTableProps> = ({
  products,
  onEdit,
  onDelete,
  onRestore
}) => {
  if (products.length === 0) {
    return (
      <div className="text-center p-6 bg-muted/50 rounded-lg">
        <p className="text-muted-foreground">
          No products found matching your criteria
        </p>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>{product.category?.name || 'N/A'}</TableCell>
                <TableCell>${product.price_per_unit}</TableCell>
                <TableCell>
                  {product.is_weighted 
                    ? `${product.inventory_weight || 0} ${product.unit_of_measure || 'lb'}` 
                    : product.inventory_count}
                </TableCell>
                <TableCell>
                  {product.is_active ? (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                      Active
                    </span>
                  ) : (
                    <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
                      Inactive
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button 
                      size="sm"
                      onClick={() => onEdit(product)}
                    >
                      Edit
                    </Button>
                    
                    {product.is_active ? (
                      <Button 
                        size="sm"
                        variant="destructive"
                        onClick={() => onDelete(product)}
                      >
                        Delete
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRestore(product)}
                      >
                        Restore
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default ProductTable;
