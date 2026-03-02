
import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { uploadImage } from '@/lib/upload-image';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useCategoriesFetcher } from '@/hooks/useCategoriesFetcher';
import { MenuItemForm, MenuItemFormValues } from './MenuItemForm';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Plus, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string | null;
  category?: { id: string; name: string } | null;
  sub_category: string | null;
  is_vegetarian: boolean;
  is_spicy: boolean;
  image_url: string | null;
  serves_people: number | null;
  created_at: string;
  updated_at: string;
}

export const MenuItems = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Fetch categories
  const { data: categories = [] } = useCategoriesFetcher();

  // Fetch menu items
  const { data: menuItems, isLoading, error, refetch } = useQuery({
    queryKey: ['menu-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*, category:categories(id, name)')
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Group menu items by category
  const groupedItems = React.useMemo(() => {
    if (!menuItems) return {};
    
    return menuItems.reduce((acc: Record<string, MenuItem[]>, item: MenuItem) => {
      const categoryName = item.category?.name || 'Uncategorized';
      if (!acc[categoryName]) acc[categoryName] = [];
      acc[categoryName].push(item);
      return acc;
    }, {});
  }, [menuItems]);

  // Get category names from grouped items
  const categoryNames = React.useMemo(() => {
    return Object.keys(groupedItems).sort();
  }, [groupedItems]);

  // Filter items based on search and category
  const filteredItems = React.useMemo(() => {
    if (!menuItems) return [];
    
    let filtered = menuItems;
    
    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category?.name === selectedCategory);
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.category?.name?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [menuItems, selectedCategory, searchQuery]);

  // Create new menu item
  const handleCreateMenuItem = async (data: MenuItemFormValues, image: File | null) => {
    try {
      setIsSubmitting(true);
      
      let imageUrl = null;
      if (image) {
        // Upload image
        const fileExt = image.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        
        imageUrl = await uploadImage(image, fileName, { requireAdmin: true });
      }

      // Insert menu item
      const { error } = await supabase
        .from('menu_items')
        .insert({
          name: data.name,
          description: data.description || null,
          price: data.price,
          category_id: data.category_id,
          sub_category: data.sub_category || null,
          is_vegetarian: data.is_vegetarian,
          is_spicy: data.is_spicy,
          serves_people: data.serves_people || null,
          image_url: imageUrl
        });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Menu item created successfully",
      });

      setIsCreateOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      await queryClient.invalidateQueries({ queryKey: ['all-menu_items'] });
      
    } catch (error: any) {
      console.error('Error creating menu item:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create menu item",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Update menu item
  const handleUpdateMenuItem = async (data: MenuItemFormValues, image: File | null) => {
    if (!editItem) return;
    
    try {
      setIsSubmitting(true);
      
      let imageUrl = editItem.image_url;
      if (image) {
        // Delete old image if it exists
        if (editItem.image_url) {
          const oldImageName = editItem.image_url.split('/').pop();
          if (oldImageName) {
            await supabase.storage
              .from('menu-items')
              .remove([oldImageName]);
          }
        }
        
        // Upload new image
        const fileExt = image.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        
        imageUrl = await uploadImage(image, fileName, { requireAdmin: true });
      }

      // Update menu item
      const { error } = await supabase
        .from('menu_items')
        .update({
          name: data.name,
          description: data.description || null,
          price: data.price,
          category_id: data.category_id,
          sub_category: data.sub_category || null,
          is_vegetarian: data.is_vegetarian,
          is_spicy: data.is_spicy,
          serves_people: data.serves_people || null,
          image_url: imageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', editItem.id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Menu item updated successfully",
      });
      
      setIsEditOpen(false);
      setEditItem(null);
      await queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      await queryClient.invalidateQueries({ queryKey: ['all-menu_items'] });
      
    } catch (error: any) {
      console.error('Error updating menu item:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update menu item",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Delete menu item
  const handleDeleteMenuItem = async (item: MenuItem) => {
    if (!confirm(`Are you sure you want to delete ${item.name}?`)) return;
    
    try {
      // Delete image if it exists
      if (item.image_url) {
        const imageName = item.image_url.split('/').pop();
        if (imageName) {
          await supabase.storage
            .from('menu-items')
            .remove([imageName]);
        }
      }
      
      // Delete menu item
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', item.id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Menu item deleted successfully",
      });
      
      await queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      await queryClient.invalidateQueries({ queryKey: ['all-menu_items'] });
      
    } catch (error: any) {
      console.error('Error deleting menu item:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete menu item",
      });
    }
  };
  
  const toggleCategory = (category: string) => {
    setSelectedCategory(category);
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Menu Items</h2>
          <p className="text-gray-500 text-sm mt-1">
            {menuItems?.length || 0} total items across {categoryNames.length} categories
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Menu Item
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search menu items by name, description, or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto">
          <TabsTrigger value="all">All ({menuItems?.length || 0})</TabsTrigger>
          {categoryNames.map((category) => (
            <TabsTrigger key={category} value={category}>
              {category} ({groupedItems[category]?.length || 0})
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
          ) : error ? (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="py-8 text-center">
                <p className="text-red-600 mb-4">Failed to load menu items</p>
                <Button variant="outline" onClick={() => refetch()}>
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : filteredItems.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-500">
                  {searchQuery ? 'No items match your search.' : 'No menu items found.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => (
                <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative h-48 bg-gray-100">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            const fallback = document.createElement('div');
                            fallback.className = 'w-full h-full flex flex-col items-center justify-center text-gray-400';
                            fallback.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg><p class="text-xs mt-2">No Image</p>';
                            parent.appendChild(fallback);
                          }
                        }}
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <circle cx="8.5" cy="8.5" r="1.5"></circle>
                          <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                        <p className="text-xs mt-2">No Image</p>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-2">
                      {item.is_vegetarian && (
                        <Badge className="bg-green-500">Veg</Badge>
                      )}
                      {item.is_spicy && (
                        <Badge className="bg-red-500">Spicy</Badge>
                      )}
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg line-clamp-1">{item.name}</h3>
                        <p className="text-sm text-gray-500">{item.category?.name || 'Uncategorized'}</p>
                      </div>
                      <p className="font-bold text-lg text-food-red ml-2">
                        ${item.price.toFixed(2)}
                      </p>
                    </div>
                    {item.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                        {item.description}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setEditItem(item);
                          setIsEditOpen(true);
                        }}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteMenuItem(item)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Menu Item</DialogTitle>
          </DialogHeader>
          <MenuItemForm
            onSubmit={handleCreateMenuItem}
            isSubmitting={isSubmitting}
            categories={categories}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Menu Item</DialogTitle>
          </DialogHeader>
          {editItem && (
            <MenuItemForm
              onSubmit={handleUpdateMenuItem}
              isSubmitting={isSubmitting}
              categories={categories}
              defaultValues={{
                name: editItem.name,
                description: editItem.description || '',
                price: editItem.price,
                category_id: editItem.category_id || '',
                sub_category: editItem.sub_category || '',
                is_vegetarian: editItem.is_vegetarian,
                is_spicy: editItem.is_spicy,
                serves_people: editItem.serves_people,
              }}
              submitLabel="Update Menu Item"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
