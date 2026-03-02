
import React from 'react';
import { Button } from '@/components/ui/button';
import { Filter, Image, ImageOff } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import AdminSearchInput from '@/components/product-filters/AdminSearchInput';

interface ProductFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  activeFilter: boolean | null;
  setActiveFilter: (value: boolean | null) => void;
  categoryFilter: string | null;
  setCategoryFilter: (value: string | null) => void;
  categories: string[];
  clearFilters: () => void;
  viewMode: 'grid' | 'table';
  setViewMode: (mode: 'grid' | 'table') => void;
  imageFilter: 'all' | 'with-image' | 'without-image' | 'default-image';
  setImageFilter: (filter: 'all' | 'with-image' | 'without-image' | 'default-image') => void;
}

const ProductFilters: React.FC<ProductFiltersProps> = ({
  searchTerm,
  onSearchChange,
  activeFilter,
  setActiveFilter,
  categoryFilter,
  setCategoryFilter,
  categories,
  clearFilters,
  viewMode,
  setViewMode,
  imageFilter,
  setImageFilter
}) => {
  return (
    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
      <h2 className="text-3xl font-bold">Product Management</h2>
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        {/* Search input */}
        <AdminSearchInput 
          value={searchTerm}
          onChange={onSearchChange}
          className="w-full sm:w-[200px] md:w-[300px]"
          minSearchLength={3}
        />
        
        {/* View mode toggle */}
        <div className="flex items-center bg-muted/30 rounded-md">
          <Button 
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
            size="sm" 
            onClick={() => setViewMode('grid')}
            className="rounded-r-none"
          >
            Grid
          </Button>
          <Button 
            variant={viewMode === 'table' ? 'secondary' : 'ghost'} 
            size="sm" 
            onClick={() => setViewMode('table')}
            className="rounded-l-none"
          >
            Table
          </Button>
        </div>
        
        {/* Filter dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 max-h-[400px] overflow-y-auto">
            <div className="p-2 font-medium">Status</div>
            <DropdownMenuItem onClick={() => setActiveFilter(true)}>
              {activeFilter === true ? "✓ " : ""}Active Products
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setActiveFilter(false)}>
              {activeFilter === false ? "✓ " : ""}Inactive Products
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setActiveFilter(null)}>
              {activeFilter === null ? "✓ " : ""}All Products
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <div className="p-2 font-medium">Images</div>
            <DropdownMenuItem onClick={() => setImageFilter('all')}>
              {imageFilter === 'all' ? "✓ " : ""}All Products
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setImageFilter('with-image')}>
              {imageFilter === 'with-image' ? "✓ " : ""}<Image className="h-4 w-4 inline mr-2" /> With Images
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setImageFilter('without-image')}>
              {imageFilter === 'without-image' ? "✓ " : ""}<ImageOff className="h-4 w-4 inline mr-2" /> Without Images
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setImageFilter('default-image')}>
              {imageFilter === 'default-image' ? "✓ " : ""}<ImageOff className="h-4 w-4 inline mr-2" /> Using Default Image
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <div className="p-2 font-medium">Categories</div>
            <DropdownMenuItem onClick={() => setCategoryFilter(null)}>
              {categoryFilter === null ? "✓ " : ""}All Categories
            </DropdownMenuItem>
            
            {categories.map((category) => (
              <DropdownMenuItem key={category} onClick={() => setCategoryFilter(category)}>
                {categoryFilter === category ? "✓ " : ""}{category}
              </DropdownMenuItem>
            ))}
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={clearFilters}>
              Reset Filters
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default ProductFilters;
