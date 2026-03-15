import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminCrud } from '@/hooks/useAdminCrud';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Tag, Globe, Monitor } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

interface Category {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  product_count: number;
  active_products_count: number;
  inactive_products_count: number;
  tax_rate: number | null;
  shippable_nationwide: boolean;
  show_on_website: boolean;
}

interface ProductStatus {
  is_active: boolean;
}

const AdminCategoriesPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { insert, update, remove } = useAdminCrud();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    display_order: 1,
    tax_rate: '',
    priority: 0,
    is_active: true,
    shippable_nationwide: false,
    show_on_website: true,
  });

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      // Get categories with all products
      const { data, error } = await supabase
        .from('categories')
        .select(`
          *,
          products:products(is_active)
        `)
        .order('display_order');
      
      if (error) throw error;

      // Transform the data to include product counts
      return data.map(category => {
        const products = (category.products || []) as ProductStatus[];
        const activeCount = products.filter((p: ProductStatus) => p.is_active).length;
        const inactiveCount = products.filter((p: ProductStatus) => !p.is_active).length;
        
        return {
          ...category,
          product_count: products.length,
          active_products_count: activeCount,
          inactive_products_count: inactiveCount,
        };
      });
    },
  });

  // Toggle category active/inactive mutation (inline)
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ categoryId, newStatus }: { categoryId: string; newStatus: boolean }) => {
      // Get the current state
      const { data: currentCategory, error: fetchError } = await supabase
        .from('categories')
        .select('is_active')
        .eq('id', categoryId)
        .single();
      
      if (fetchError) throw fetchError;

      // Update category status
      await update('categories', {
        is_active: newStatus,
        updated_at: new Date().toISOString()
      }, [{ column: 'id', operator: 'eq', value: categoryId }]);

      // Handle product auto-deactivation/reactivation
      if (currentCategory.is_active !== newStatus) {
        if (!newStatus) {
          // Category was deactivated - auto-deactivate all active products
          await update('products', {
            is_active: false,
            auto_deactivated: true,
            updated_at: new Date().toISOString()
          }, [
            { column: 'category_id', operator: 'eq', value: categoryId },
            { column: 'is_active', operator: 'eq', value: true },
          ]);
        } else {
          // Category was reactivated - reactivate only auto-deactivated products
          await update('products', {
            is_active: true,
            auto_deactivated: false,
            updated_at: new Date().toISOString()
          }, [
            { column: 'category_id', operator: 'eq', value: categoryId },
            { column: 'auto_deactivated', operator: 'eq', value: true },
          ]);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products-metadata'] });
      toast({
        title: 'Success',
        description: 'Category status updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update category status',
      });
    },
  });

  // Create/Update category mutation
  const saveMutation = useMutation({
    mutationFn: async (data: { id?: string; name: string; description: string; display_order: number; tax_rate: number | null; priority: number; is_active?: boolean; shippable_nationwide?: boolean; show_on_website?: boolean }) => {
      const { id, name, description, display_order, tax_rate, priority, is_active, shippable_nationwide, show_on_website } = data;

      let categoryId = id;

      if (id) {
        // Get the current state to check if is_active changed
        const { data: currentCategory, error: fetchError } = await supabase
          .from('categories')
          .select('is_active')
          .eq('id', id)
          .single();
        
        if (fetchError) throw fetchError;

        // Update existing category
        await update('categories', {
          name,
          description,
          display_order,
          tax_rate,
          priority,
          is_active,
          shippable_nationwide,
          show_on_website,
          updated_at: new Date().toISOString()
        }, [{ column: 'id', operator: 'eq', value: id }]);

        // Handle product auto-deactivation/reactivation if is_active changed
        if (is_active !== undefined && currentCategory.is_active !== is_active) {
          if (!is_active) {
            // Category was deactivated - auto-deactivate all active products
            await update('products', {
              is_active: false,
              auto_deactivated: true,
              updated_at: new Date().toISOString()
            }, [
              { column: 'category_id', operator: 'eq', value: id },
              { column: 'is_active', operator: 'eq', value: true },
            ]);
          } else {
            // Category was reactivated - reactivate only auto-deactivated products
            await update('products', {
              is_active: true,
              auto_deactivated: false,
              updated_at: new Date().toISOString()
            }, [
              { column: 'category_id', operator: 'eq', value: id },
              { column: 'auto_deactivated', operator: 'eq', value: true },
            ]);
          }
        }
      } else {
        // Create new category
        const { data: newCategory } = await insert('categories', {
          name,
          description,
          display_order,
          tax_rate,
          priority,
          is_active: is_active !== undefined ? is_active : true,
          shippable_nationwide: shippable_nationwide || false,
          show_on_website: show_on_website !== undefined ? show_on_website : true,
        }, '*');
        categoryId = newCategory?.[0]?.id;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['category-tax-rates'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast({
        title: 'Success',
        description: editingCategory ? 'Category updated successfully' : 'Category created successfully',
      });
      setIsDialogOpen(false);
      setEditingCategory(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to save category',
      });
    },
  });

  // Delete category mutation
  const deleteMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      // Check if category has products
      const { data: products, error: checkError } = await supabase
        .from('products')
        .select('id')
        .eq('category_id', categoryId)
        .limit(1);
      
      if (checkError) throw checkError;
      
      if (products && products.length > 0) {
        throw new Error('Cannot delete category with existing products. Please reassign or delete the products first.');
      }

      // Delete the category (tax_rate is in the same table now)
      await remove('categories', [{ column: 'id', operator: 'eq', value: categoryId }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['category-tax-rates'] });
      toast({
        title: 'Success',
        description: 'Category deleted successfully',
      });
      setCategoryToDelete(null);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete category',
      });
      setCategoryToDelete(null);
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      display_order: 1,
      tax_rate: '',
      priority: 0,
      is_active: true,
      shippable_nationwide: false,
      show_on_website: true,
    });
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      display_order: category.display_order,
      tax_rate: category.tax_rate ? (category.tax_rate * 100).toString() : '',
      priority: (category as any).priority ?? 0,
      is_active: category.is_active,
      shippable_nationwide: category.shippable_nationwide || false,
      show_on_website: category.show_on_website !== false,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Category name is required',
      });
      return;
    }

    const tax_rate = formData.tax_rate ? parseFloat(formData.tax_rate) / 100 : null;

    saveMutation.mutate({
      id: editingCategory?.id,
      name: formData.name.trim(),
      description: formData.description.trim() || '',
      display_order: formData.display_order,
      tax_rate,
      priority: formData.priority,
      is_active: formData.is_active,
      shippable_nationwide: formData.shippable_nationwide,
      show_on_website: formData.show_on_website,
    });
  };

  const formatTaxRate = (rate: number | null) => {
    if (rate === null || rate === undefined) return 'No tax';
    return `${(rate * 100).toFixed(2)}%`;
  };

  if (isLoading) {
    return (
      <AdminLayout title="Categories">
        <div className="p-8">Loading...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Categories">
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Tag className="h-8 w-8" />
              Categories Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage product categories, tax rates, and organization
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingCategory(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                resetForm();
                setEditingCategory(null);
                setIsDialogOpen(true);
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCategory ? 'Edit Category' : 'Add New Category'}</DialogTitle>
                <DialogDescription>
                  {editingCategory ? 'Update category details and tax rate' : 'Create a new product category with optional tax rate'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Category Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Meat, Seafood, Vegetables"
                    required
                  />
                  {editingCategory && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Renaming will update the category for all {editingCategory.product_count} products
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional category description"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                  <Input
                    id="tax_rate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.tax_rate}
                    onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })}
                    placeholder="e.g., 9 for 9%"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave empty for no default tax. Products can override this.
                  </p>
                </div>

                <div>
                  <Label htmlFor="priority">Display Priority (0-10)</Label>
                  <Input
                    id="priority"
                    type="number"
                    min="0"
                    max="10"
                    step="1"
                    value={formData.priority}
                    onChange={(e) => {
                      const value = Math.max(0, Math.min(10, parseInt(e.target.value) || 0));
                      setFormData({ ...formData, priority: value });
                    }}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Higher priority = shown first (10 highest, 0 lowest). Used as tiebreaker when product priorities are equal.
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="is_active">Active</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Inactive categories and their products won't be visible to customers
                    </p>
                  </div>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="shippable_nationwide" className="flex items-center gap-1.5">
                      <Globe className="h-4 w-4 text-blue-600" />
                      Ships Nationwide (Default)
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Products in this category can be shipped nationwide by default. Individual products can override this.
                    </p>
                  </div>
                  <Switch
                    id="shippable_nationwide"
                    checked={formData.shippable_nationwide}
                    onCheckedChange={(checked) => setFormData({ ...formData, shippable_nationwide: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="show_on_website" className="flex items-center gap-1.5">
                      <Monitor className="h-4 w-4 text-purple-600" />
                      Show on Website
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Turn off to hide from the main website (e.g., TV-only menu categories)
                    </p>
                  </div>
                  <Switch
                    id="show_on_website"
                    checked={formData.show_on_website}
                    onCheckedChange={(checked) => setFormData({ ...formData, show_on_website: checked })}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => {
                    setIsDialogOpen(false);
                    setEditingCategory(null);
                    resetForm();
                  }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? (editingCategory ? 'Saving...' : 'Creating...') : (editingCategory ? 'Save Changes' : 'Create Category')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Categories List */}
        <Card>
          <CardHeader>
            <CardTitle>Categories ({categories.length})</CardTitle>
            <CardDescription>
              Manage all product categories and their settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categories.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No categories found. Categories are created automatically when you add products.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead>Default Tax Rate</TableHead>
                    <TableHead>Ships Nationwide</TableHead>
                    <TableHead>Website</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={category.is_active}
                            onCheckedChange={(checked) => 
                              toggleActiveMutation.mutate({ 
                                categoryId: category.id, 
                                newStatus: checked 
                              })
                            }
                            disabled={toggleActiveMutation.isPending}
                          />
                          <span className={category.is_active ? "text-green-600" : "text-gray-500"}>
                            {category.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{category.product_count} total</span>
                          <span className="text-xs text-green-600">{category.active_products_count} active</span>
                          <span className="text-xs text-gray-500">{category.inactive_products_count} inactive</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatTaxRate(category.tax_rate)}</TableCell>
                      <TableCell>
                        {category.shippable_nationwide ? (
                          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200 flex items-center gap-1 w-fit">
                            <Globe className="h-3 w-3" />
                            Yes
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-sm">Local only</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {category.show_on_website !== false ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                            Visible
                          </Badge>
                        ) : (
                          <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200 flex items-center gap-1 w-fit">
                            <Monitor className="h-3 w-3" />
                            TV Only
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(category)}
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setCategoryToDelete(category.id)}
                            disabled={category.product_count > 0}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation */}
        <AlertDialog open={!!categoryToDelete} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Category</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this category? This action cannot be undone.
                The category can only be deleted if it has no products.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => categoryToDelete && deleteMutation.mutate(categoryToDelete)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default AdminCategoriesPage;
