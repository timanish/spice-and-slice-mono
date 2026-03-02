
import React from 'react';
import { Button } from '@/components/ui/button';
import { Image, ImageOff } from 'lucide-react';

interface FilterIndicatorsProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  categoryFilter: string | null;
  setCategoryFilter: (category: string | null) => void;
  activeFilter: boolean | null;
  setActiveFilter: (active: boolean | null) => void;
  imageFilter: 'all' | 'with-image' | 'without-image' | 'default-image';
  setImageFilter: (filter: 'all' | 'with-image' | 'without-image' | 'default-image') => void;
  clearFilters: () => void;
}

const FilterIndicators: React.FC<FilterIndicatorsProps> = ({
  searchTerm,
  setSearchTerm,
  categoryFilter,
  setCategoryFilter,
  activeFilter,
  setActiveFilter,
  imageFilter,
  setImageFilter,
  clearFilters,
}) => {
  // Only show if filters are applied
  if (!(searchTerm || categoryFilter || activeFilter !== true || imageFilter !== 'all')) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {searchTerm && (
        <div className="bg-secondary/50 text-sm px-3 py-1 rounded-full flex items-center gap-1">
          Search: {searchTerm}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-5 w-5 p-0 ml-1" 
            onClick={() => setSearchTerm('')}
          >
            ×
          </Button>
        </div>
      )}
      
      {categoryFilter && (
        <div className="bg-secondary/50 text-sm px-3 py-1 rounded-full flex items-center gap-1">
          Category: {categoryFilter}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-5 w-5 p-0 ml-1" 
            onClick={() => setCategoryFilter(null)}
          >
            ×
          </Button>
        </div>
      )}
      
      {activeFilter !== true && (
        <div className="bg-secondary/50 text-sm px-3 py-1 rounded-full flex items-center gap-1">
          {activeFilter === false ? 'Showing: Inactive' : 'Showing: All'}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-5 w-5 p-0 ml-1" 
            onClick={() => setActiveFilter(true)}
          >
            ×
          </Button>
        </div>
      )}
      
      {imageFilter !== 'all' && (
        <div className="bg-secondary/50 text-sm px-3 py-1 rounded-full flex items-center gap-1">
          {imageFilter === 'with-image' ? (
            <>
              <Image className="h-3 w-3 mr-1" /> 
              With Images
            </>
          ) : imageFilter === 'without-image' ? (
            <>
              <ImageOff className="h-3 w-3 mr-1" /> 
              Without Images
            </>
          ) : (
            <>
              <ImageOff className="h-3 w-3 mr-1" /> 
              Using Default Image
            </>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-5 w-5 p-0 ml-1" 
            onClick={() => setImageFilter('all')}
          >
            ×
          </Button>
        </div>
      )}
      
      <Button variant="ghost" size="sm" onClick={clearFilters} className="text-sm">
        Clear All
      </Button>
    </div>
  );
};

export default FilterIndicators;
