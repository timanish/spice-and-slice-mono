
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { ProductForm } from '@/components/products/ProductForm';
import { EditProductDialog } from '@/components/products/EditProductDialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import ProductFilters from '@/components/admin/products/ProductFilters';
import FilterIndicators from '@/components/admin/products/FilterIndicators';
import ProductGrid from '@/components/admin/products/ProductGrid';
import ProductTable from '@/components/admin/products/ProductTable';
import DeleteProductDialog from '@/components/admin/products/DeleteProductDialog';
import { useProductManagement } from '@/hooks/admin/useProductManagement';

const AdminProductsPage = () => {
  const navigate = useNavigate();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const {
    products,
    isLoading,
    categories,
    searchTerm,
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
    handleSearchChange
  } = useProductManagement();

  const handleCreateSuccess = async (data: any, image: File | null) => {
    await handleCreate(data, image);
    setIsCreateDialogOpen(false);
  };

  if (isLoading) {
    return (
      <AdminLayout title="Products">
        <div className="p-8">Loading...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Products">
      <div className="p-8">
        {/* Header with title and controls */}
        <ProductFilters
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          categories={categories}
          clearFilters={clearFilters}
          viewMode={viewMode}
          setViewMode={setViewMode}
          imageFilter={imageFilter}
          setImageFilter={setImageFilter}
        />
        
        {/* Filter indicators */}
        <FilterIndicators
          searchTerm={searchTerm}
          setSearchTerm={handleSearchChange}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          imageFilter={imageFilter}
          setImageFilter={setImageFilter}
          clearFilters={clearFilters}
        />
        
        {/* Products List Header with Add Button */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            Products ({products.length})
          </h2>
          
          {/* Add Product Modal */}
          {activeFilter !== false && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add New Product
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>Add New Product</DialogTitle>
                </DialogHeader>
                <div className="overflow-y-auto flex-1 pr-1">
                  <ProductForm
                    onSubmit={handleCreateSuccess}
                    isSubmitting={isSubmitting}
                  />
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
        
        {/* Products List */}
        <div className="mb-8">
          {viewMode === 'grid' ? (
            <ProductGrid
              products={products}
              onEdit={setEditingProduct}
              onDelete={setProductToDelete}
              onRestore={handleRestoreProduct}
            />
          ) : (
            <ProductTable
              products={products}
              onEdit={setEditingProduct}
              onDelete={setProductToDelete}
              onRestore={handleRestoreProduct}
            />
          )}
        </div>
      </div>

      {/* Edit Product Dialog */}
      {editingProduct && (
        <EditProductDialog
          product={editingProduct}
          isOpen={true}
          onClose={() => setEditingProduct(null)}
          onProductUpdated={handleProductUpdated}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteProductDialog
        product={productToDelete}
        isOpen={!!productToDelete}
        onClose={() => setProductToDelete(null)}
        onDelete={handleDeleteProduct}
      />
    </AdminLayout>
  );
};

export default AdminProductsPage;

