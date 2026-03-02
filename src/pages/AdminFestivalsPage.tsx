import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCrud } from "@/hooks/useAdminCrud";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Calendar } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Festival {
  id: string;
  name: string;
  description: string;
  banner_image: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

const AdminFestivalsPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { insert, update, remove } = useAdminCrud();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFestival, setEditingFestival] = useState<Festival | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    banner_image: "",
    start_date: "",
    end_date: "",
    is_active: true,
  });

  const { data: festivals, isLoading } = useQuery({
    queryKey: ["admin-festivals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("festivals")
        .select("*")
        .order("start_date", { ascending: false });
      
      if (error) throw error;
      return data as Festival[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      await insert("festivals", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-festivals"] });
      toast({ title: "Festival created successfully" });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error creating festival", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      await update("festivals", data as Record<string, unknown>, [{ column: "id", operator: "eq", value: id }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-festivals"] });
      toast({ title: "Festival updated successfully" });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error updating festival", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await remove("festivals", [{ column: "id", operator: "eq", value: id }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-festivals"] });
      toast({ title: "Festival deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error deleting festival", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      banner_image: "",
      start_date: "",
      end_date: "",
      is_active: true,
    });
    setEditingFestival(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto-calculate is_active based on date range
    const now = new Date();
    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);
    const isWithinDateRange = now >= start && now <= end;
    
    const submitData = {
      ...formData,
      banner_image: formData.banner_image || null,
      is_active: formData.is_active && isWithinDateRange, // Only active if toggle is on AND within date range
    };
    
    if (editingFestival) {
      updateMutation.mutate({ id: editingFestival.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleEdit = (festival: Festival) => {
    setEditingFestival(festival);
    // Format dates for input[type="date"] which expects YYYY-MM-DD
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    };
    
    setFormData({
      name: festival.name,
      description: festival.description,
      banner_image: festival.banner_image || "",
      start_date: formatDate(festival.start_date),
      end_date: formatDate(festival.end_date),
      is_active: festival.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this festival? This will also remove all associated products.")) {
      deleteMutation.mutate(id);
    }
  };

  const isCurrentlyActive = (festival: Festival) => {
    const now = new Date();
    const start = new Date(festival.start_date);
    const end = new Date(festival.end_date);
    return now >= start && now <= end && festival.is_active;
  };

  return (
    <AdminLayout title="Festivals">
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Festivals</h1>
            <p className="text-gray-600 mt-2">Create and manage seasonal festival sections with date ranges</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                Add Festival
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingFestival ? "Edit Festival" : "Add New Festival"}</DialogTitle>
                <DialogDescription>
                  {editingFestival ? "Update the festival details" : "Create a new seasonal festival section"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Festival Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Diwali Festival, Christmas Sale"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the festival and its special offerings"
                    required
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="banner_image">Banner Image URL (Optional)</Label>
                  <Input
                    id="banner_image"
                    value={formData.banner_image}
                    onChange={(e) => setFormData({ ...formData, banner_image: e.target.value })}
                    placeholder="https://example.com/banner.jpg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_date">Start Date *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_date">End Date *</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <div>
                    <Label htmlFor="is_active">Enable Festival</Label>
                    <p className="text-xs text-gray-500 mt-1">
                      Festival will only show on home page if enabled AND current date is within the date range
                    </p>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingFestival ? "Update" : "Create"} Festival
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Loading festivals...</div>
        ) : (
          <div className="space-y-4">
            {festivals?.map((festival) => (
              <Card key={festival.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle>{festival.name}</CardTitle>
                        {isCurrentlyActive(festival) && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            Live Now
                          </span>
                        )}
                      </div>
                      <CardDescription className="flex items-center gap-2 mt-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(festival.start_date).toLocaleDateString()} - {new Date(festival.end_date).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleEdit(festival)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={() => handleDelete(festival.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {festival.banner_image && (
                    <img
                      src={festival.banner_image}
                      alt={festival.name}
                      className="w-full h-32 object-cover rounded-lg mb-4"
                    />
                  )}
                  <p className="text-sm text-gray-600 mb-4">{festival.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        festival.is_active ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"
                      }`}>
                        {festival.is_active ? "Enabled" : "Disabled"}
                      </span>
                      {isCurrentlyActive(festival) && (
                        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          Showing Now
                        </span>
                      )}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.location.href = `/admin/festivals/${festival.id}/products`}
                    >
                      Manage Products
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminFestivalsPage;
