import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCrud } from "@/hooks/useAdminCrud";
import { uploadImage } from "@/lib/upload-image";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check, X, Upload } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Quote, Star } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { usePendingReviews } from "@/hooks/usePendingReviews";

interface Testimonial {
  id: string;
  customer_name: string;
  customer_title?: string | null;
  customer_avatar_url?: string | null;
  customer_image: string | null;
  review: string;
  content?: string;
  rating: number;
  display_order: number;
  is_active: boolean;
  source: string;
  status: string;
  user_id: string | null;
  user_email: string | null;
  created_at: string;
}

const AdminTestimonialsPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { insert, update, remove } = useAdminCrud();
  const [activeTab, setActiveTab] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_title: "",
    customer_avatar_url: "",
    content: "",
    rating: 5,
    display_order: 1,
    is_active: true,
  });

  const { data: testimonials, isLoading } = useQuery({
    queryKey: ["admin-testimonials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .order("display_order")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Testimonial[];
    },
  });

  const { data: pendingReviews = [], isLoading: isPendingLoading } = usePendingReviews();

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { content, customer_title, customer_avatar_url, ...rest } = data;
      const submitData = {
        ...rest,
        customer_image: customer_avatar_url || null,
        review: content,
        source: "admin",
        status: "approved",
      };
      await insert("testimonials", submitData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
      toast({ title: "Testimonial created successfully" });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error creating testimonial", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const { content, customer_title, customer_avatar_url, ...rest } = data;
      const submitData = {
        ...rest,
        customer_image: customer_avatar_url || null,
        review: content,
      };
      await update("testimonials", submitData, [{ column: "id", operator: "eq", value: id }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
      toast({ title: "Testimonial updated successfully" });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error updating testimonial", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await remove("testimonials", [{ column: "id", operator: "eq", value: id }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
      queryClient.invalidateQueries({ queryKey: ["pending-reviews"] });
      toast({ title: "Testimonial deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error deleting testimonial", description: error.message, variant: "destructive" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      await update("testimonials", { status: "approved", is_active: true }, [{ column: "id", operator: "eq", value: id }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
      queryClient.invalidateQueries({ queryKey: ["pending-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["testimonials"] });
      toast({ title: "Review approved successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error approving review", description: error.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      await remove("testimonials", [{ column: "id", operator: "eq", value: id }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
      queryClient.invalidateQueries({ queryKey: ["pending-reviews"] });
      toast({ title: "Review rejected and deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error rejecting review", description: error.message, variant: "destructive" });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image under 5MB",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setImagePreview("");
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!selectedFile) return null;

    setIsUploading(true);
    try {
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `admin-${Date.now()}.${fileExt}`;
      const filePath = `testimonials/${fileName}`;

      return await uploadImage(selectedFile, filePath, { requireAdmin: true });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      customer_name: "",
      customer_title: "",
      customer_avatar_url: "",
      content: "",
      rating: 5,
      display_order: 1,
      is_active: true,
    });
    setSelectedFile(null);
    setImagePreview("");
    setEditingTestimonial(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalFormData = { ...formData };

    if (selectedFile) {
      const uploadedUrl = await uploadImage();
      if (!uploadedUrl) return;
      finalFormData.customer_avatar_url = uploadedUrl;
    }

    if (editingTestimonial) {
      updateMutation.mutate({ id: editingTestimonial.id, data: finalFormData });
    } else {
      createMutation.mutate(finalFormData);
    }
  };

  const handleEdit = (testimonial: Testimonial) => {
    setEditingTestimonial(testimonial);
    setFormData({
      customer_name: testimonial.customer_name,
      customer_title: testimonial.customer_title || "",
      customer_avatar_url: testimonial.customer_avatar_url || "",
      content: testimonial.review || testimonial.content || "",
      rating: testimonial.rating,
      display_order: testimonial.display_order,
      is_active: testimonial.is_active,
    });
    if (testimonial.customer_avatar_url) {
      setImagePreview(testimonial.customer_avatar_url);
    }
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this testimonial?")) {
      deleteMutation.mutate(id);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
              }`}
          />
        ))}
      </div>
    );
  };

  return (
    <AdminLayout title="Testimonials">
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Quote className="h-8 w-8 text-food-red" />
              <h1 className="text-3xl font-bold text-gray-900">Manage Testimonials</h1>
            </div>
            <p className="text-gray-600">Create and manage customer reviews displayed on the home page</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                Add Testimonial
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingTestimonial ? "Edit Testimonial" : "Add New Testimonial"}</DialogTitle>
                <DialogDescription>
                  {editingTestimonial ? "Update the testimonial details" : "Create a new customer review"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="customer_name">Customer Name *</Label>
                  <Input
                    id="customer_name"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    placeholder="e.g., John Doe"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="customer_title">Customer Title (Optional)</Label>
                  <Input
                    id="customer_title"
                    value={formData.customer_title}
                    onChange={(e) => setFormData({ ...formData, customer_title: e.target.value })}
                    placeholder="e.g., Food Enthusiast, Regular Customer"
                  />
                </div>
                <div>
                  <Label htmlFor="avatar_upload">Avatar Image (Optional)</Label>
                  {!imagePreview ? (
                    <div className="flex items-center gap-2">
                      <Input
                        id="avatar_upload"
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById("avatar_upload")?.click()}
                        className="w-full"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Choose Image
                      </Button>
                    </div>
                  ) : (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={handleRemoveImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <p className="text-sm text-gray-500 mt-1">Max 5MB</p>
                </div>
                <div>
                  <Label htmlFor="content">Review Content *</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Share the customer's feedback..."
                    required
                    rows={4}
                  />
                </div>
                <div>
                  <Label htmlFor="rating">Rating *</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="rating"
                      type="number"
                      min={1}
                      max={5}
                      value={formData.rating}
                      onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) })}
                      className="w-20"
                      required
                    />
                    {renderStars(formData.rating)}
                  </div>
                </div>
                <div>
                  <Label htmlFor="display_order">Display Order *</Label>
                  <Input
                    id="display_order"
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                    min={1}
                    required
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Active (show on home page)</Label>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isUploading}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending || isUploading}>
                    {isUploading ? "Uploading..." : editingTestimonial ? "Update" : "Create"} Testimonial
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>


        {isLoading ? (
          <div className="text-center py-12">Loading testimonials...</div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="all">
                All Reviews ({testimonials?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending Approval ({pendingReviews.length})
                {pendingReviews.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {pendingReviews.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* All Reviews Tab */}
            <TabsContent value="all" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {testimonials?.filter(t => t.source === 'admin' || t.status === 'approved').map((testimonial) => (
                  <Card key={testimonial.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-3">
                          <img
                            src={testimonial.customer_avatar_url || testimonial.customer_image || "/placeholder.svg"}
                            alt={testimonial.customer_name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-lg">{testimonial.customer_name}</CardTitle>
                              <Badge variant={testimonial.source === 'admin' ? 'default' : 'secondary'}>
                                {testimonial.source === 'admin' ? 'Admin' : 'User'}
                              </Badge>
                            </div>
                            {testimonial.customer_title && (
                              <CardDescription>{testimonial.customer_title}</CardDescription>
                            )}
                            {testimonial.user_email && (
                              <p className="text-xs text-gray-500">{testimonial.user_email}</p>
                            )}
                            {renderStars(testimonial.rating)}
                          </div>
                        </div>
                        {testimonial.source === 'admin' && (
                          <div className="flex space-x-2">
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => handleEdit(testimonial)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="destructive"
                              onClick={() => handleDelete(testimonial.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-4 italic">"{testimonial.review || testimonial.content}"</p>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">Order: {testimonial.display_order}</span>
                          <span className={`px-2 py-1 rounded-full text-xs ${testimonial.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                            }`}>
                            {testimonial.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        {testimonial.source === 'user' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(testimonial)}
                            >
                              <Pencil className="mr-1 h-3 w-3" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(testimonial.id)}
                            >
                              <Trash2 className="mr-1 h-3 w-3" />
                              Delete
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Pending Approval Tab */}
            <TabsContent value="pending" className="mt-6">
              {isPendingLoading ? (
                <div className="text-center py-12">Loading pending reviews...</div>
              ) : pendingReviews.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No pending reviews at the moment</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {pendingReviews.map((review) => (
                    <Card key={review.id} className="border-orange-200 bg-orange-50/30">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="flex items-start gap-3">
                            <img
                              src={review.customer_image || "/placeholder.svg"}
                              alt={review.customer_name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-lg">{review.customer_name}</CardTitle>
                                <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                                  Pending
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-600">{review.user_email}</p>
                              {renderStars(review.rating)}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-700 mb-4 italic">"{review.review}"</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            Submitted: {new Date(review.created_at).toLocaleDateString()}
                          </span>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => approveMutation.mutate(review.id)}
                              disabled={approveMutation.isPending}
                            >
                              <Check className="mr-1 h-4 w-4" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                if (window.confirm("Are you sure you want to reject and delete this review?")) {
                                  rejectMutation.mutate(review.id);
                                }
                              }}
                              disabled={rejectMutation.isPending}
                            >
                              <X className="mr-1 h-4 w-4" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminTestimonialsPage;
