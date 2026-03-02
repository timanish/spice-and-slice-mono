import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminCrud } from '@/hooks/useAdminCrud';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';

interface HeroSlide {
  id: string;
  title: string;
  description: string;
  sub_description: string | null;
  image_url: string;
  button_text: string | null;
  button_link: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface SlideFormData {
  title: string;
  description: string;
  sub_description: string;
  image_url: string;
  button_text: string;
  button_link: string;
  is_active: boolean;
  display_order: number;
}

const AdminHeroSlidesPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { insert, update, remove } = useAdminCrud();
  const [editingSlide, setEditingSlide] = useState<HeroSlide | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<SlideFormData>({
    title: '',
    description: '',
    sub_description: '',
    image_url: '',
    button_text: '',
    button_link: '',
    is_active: true,
    display_order: 1
  });

  // Fetch hero slides
  const { data: slides, isLoading } = useQuery({
    queryKey: ['admin-hero-slides'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hero_slides')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as HeroSlide[];
    }
  });

  // Create slide mutation
  const createSlideMutation = useMutation({
    mutationFn: async (slideData: SlideFormData) => {
      const result = await insert('hero_slides', slideData);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-hero-slides'] });
      queryClient.invalidateQueries({ queryKey: ['hero-slides'] });
      toast({ title: 'Success', description: 'Slide created successfully!' });
      resetForm();
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Update slide mutation
  const updateSlideMutation = useMutation({
    mutationFn: async ({ id, slideData }: { id: string; slideData: SlideFormData }) => {
      const result = await update('hero_slides', slideData, [{ column: 'id', operator: 'eq', value: id }]);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-hero-slides'] });
      queryClient.invalidateQueries({ queryKey: ['hero-slides'] });
      toast({ title: 'Success', description: 'Slide updated successfully!' });
      resetForm();
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Delete slide mutation
  const deleteSlideMutation = useMutation({
    mutationFn: async (id: string) => {
      await remove('hero_slides', [{ column: 'id', operator: 'eq', value: id }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-hero-slides'] });
      queryClient.invalidateQueries({ queryKey: ['hero-slides'] });
      toast({ title: 'Success', description: 'Slide deleted successfully!' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      sub_description: '',
      image_url: '',
      button_text: '',
      button_link: '',
      is_active: true,
      display_order: 1
    });
    setEditingSlide(null);
    setShowForm(false);
  };

  const handleEdit = (slide: HeroSlide) => {
    setEditingSlide(slide);
    setFormData({
      title: slide.title,
      description: slide.description,
      sub_description: slide.sub_description || '',
      image_url: slide.image_url,
      button_text: slide.button_text || '',
      button_link: slide.button_link || '',
      is_active: slide.is_active,
      display_order: slide.display_order
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingSlide) {
      updateSlideMutation.mutate({ id: editingSlide.id, slideData: formData });
    } else {
      createSlideMutation.mutate(formData);
    }
  };

  return (
    <AdminLayout title="Hero Slides">
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Hero Carousel Management</h1>
            <Button onClick={() => setShowForm(true)} disabled={showForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add New Slide
            </Button>
          </div>

          {/* Form for creating/editing slides */}
          {showForm && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>
                  {editingSlide ? 'Edit Slide' : 'Create New Slide'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Title</label>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Slide title"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Display Order</label>
                      <Input
                        type="number"
                        value={formData.display_order}
                        onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                        min="1"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Description</label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Main description"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Sub Description (Optional)</label>
                    <Textarea
                      value={formData.sub_description}
                      onChange={(e) => setFormData({ ...formData, sub_description: e.target.value })}
                      placeholder="Additional description"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Image URL</label>
                    <Input
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Button Text (Optional)</label>
                      <Input
                        value={formData.button_text}
                        onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
                        placeholder="Shop Now"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Button Link (Optional)</label>
                      <Input
                        value={formData.button_link}
                        onChange={(e) => setFormData({ ...formData, button_link: e.target.value })}
                        placeholder="#products-section or /menu"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <label className="text-sm font-medium">Active</label>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" disabled={createSlideMutation.isPending || updateSlideMutation.isPending}>
                      <Save className="mr-2 h-4 w-4" />
                      {editingSlide ? 'Update' : 'Create'} Slide
                    </Button>
                    <Button type="button" variant="outline" onClick={resetForm}>
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Slides list */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">Loading slides...</div>
            ) : slides?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No slides found. Create your first slide!
              </div>
            ) : (
              slides?.map((slide) => (
                <Card key={slide.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">{slide.title}</h3>
                        <Badge variant={slide.is_active ? "default" : "secondary"}>
                          {slide.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="outline">Order: {slide.display_order}</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(slide)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => deleteSlideMutation.mutate(slide.id)}
                          disabled={deleteSlideMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-1">
                        <img 
                          src={slide.image_url} 
                          alt={slide.title}
                          className="w-full h-32 object-cover rounded"
                        />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <p className="text-sm">{slide.description}</p>
                        {slide.sub_description && (
                          <p className="text-xs text-muted-foreground">{slide.sub_description}</p>
                        )}
                        {slide.button_text && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-medium">Button:</span>
                            <span>{slide.button_text}</span>
                            {slide.button_link && (
                              <>
                                <span>→</span>
                                <span className="text-muted-foreground">{slide.button_link}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
    </AdminLayout>
  );
};

export default AdminHeroSlidesPage;