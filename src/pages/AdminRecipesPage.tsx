import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCrud } from '@/hooks/useAdminCrud';
import { uploadImage } from "@/lib/upload-image";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ChefHat, Clock, Users, ShoppingCart, X, ArrowUp, ArrowDown, Upload } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

interface Recipe {
  id: string;
  title: string;
  description: string;
  image_url: string;
  prep_time_minutes: number;
  servings: number;
  difficulty: string;
  ingredients: string[];
  instructions: string[];
  display_order: number;
  is_active: boolean;
}

interface Product {
  id: string;
  name: string;
  price_per_unit: number;
  is_weighted: boolean;
}

interface IngredientInput {
  productId: string;
  productName: string; // For display purposes
  amount: number;
  unit: string;
  notes: string;
  displayOrder: number;
}

const AdminRecipesPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { insert, update, remove } = useAdminCrud();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [ingredientForm, setIngredientForm] = useState({
    amount: 1,
    unit: "piece",
    notes: "",
  });
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    prep_time_minutes: 30,
    servings: 4,
    difficulty: "Medium",
    ingredients: "",
    instructions: "",
    display_order: 1,
    is_active: true,
    ingredientsList: [] as IngredientInput[],
  });

  const { data: recipes, isLoading } = useQuery({
    queryKey: ["admin-recipes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipes")
        .select("*")
        .order("display_order");
      
      if (error) throw error;
      
      // Parse TEXT fields to arrays
      return data?.map(recipe => ({
        ...recipe,
        ingredients: recipe.ingredients ? recipe.ingredients.split('\n').filter(i => i.trim()) : [],
        instructions: recipe.instructions ? recipe.instructions.split('\n').filter(i => i.trim()) : []
      })) as Recipe[];
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price_per_unit, is_weighted")
        .order("name");
      
      if (error) throw error;
      return data as Product[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Upload image first
      if (!selectedFile) {
        throw new Error("Please select an image for the recipe");
      }
      
      setIsUploading(true);
      let imageUrl: string;
      try {
        const fileExt = selectedFile.name.split(".").pop();
        const sanitizedTitle = data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        const fileName = `recipe-${sanitizedTitle}-${Date.now()}.${fileExt}`;
        const filePath = `recipes/${fileName}`;

        imageUrl = await uploadImage(selectedFile, filePath, { requireAdmin: true });
      } finally {
        setIsUploading(false);
      }
      
      const submitData = {
        title: data.title,
        description: data.description,
        image_url: imageUrl,
        prep_time_minutes: data.prep_time_minutes,
        servings: data.servings,
        difficulty: data.difficulty,
        ingredients: data.ingredients,
        instructions: data.instructions,
        display_order: data.display_order,
        is_active: data.is_active,
      };
      const { data: recipeData } = await insert('recipes', submitData, '*');
      const recipe = recipeData?.[0];
      if (!recipe?.id) throw new Error('Failed to create recipe');

      // Insert recipe ingredients
      if (data.ingredientsList.length > 0) {
        const recipeIngredients = data.ingredientsList.map(ingredient => ({
          recipe_id: recipe.id,
          product_id: ingredient.productId,
          amount: ingredient.amount,
          unit: ingredient.unit,
          notes: ingredient.notes || null,
          display_order: ingredient.displayOrder,
          quantity: `${ingredient.amount} ${ingredient.unit}`, // Legacy field for backward compatibility
        }));
        await insert('recipe_products', recipeIngredients);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-recipes"] });
      toast({ title: "Recipe created successfully" });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error creating recipe", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      let imageUrl = editingRecipe?.image_url;
      
      // Upload new image if selected
      if (selectedFile) {
        setIsUploading(true);
        try {
          // Delete old image if it exists and is from our storage
          if (editingRecipe?.image_url && editingRecipe.image_url.includes('menu-items/recipes/')) {
            const oldImagePath = editingRecipe.image_url.split('menu-items/')[1];
            await supabase.storage
              .from("menu-items")
              .remove([oldImagePath]);
          }
          
          const fileExt = selectedFile.name.split(".").pop();
          const sanitizedTitle = data.title?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "recipe";
          const fileName = `recipe-${sanitizedTitle}-${Date.now()}.${fileExt}`;
          const filePath = `recipes/${fileName}`;

          imageUrl = await uploadImage(selectedFile, filePath, { requireAdmin: true });
        } finally {
          setIsUploading(false);
        }
      }
      
      const submitData = {
        title: data.title,
        description: data.description,
        image_url: imageUrl,
        prep_time_minutes: data.prep_time_minutes,
        servings: data.servings,
        difficulty: data.difficulty,
        ingredients: data.ingredients,
        instructions: data.instructions,
        display_order: data.display_order,
        is_active: data.is_active,
      };
      await update('recipes', submitData, [{ column: 'id', operator: 'eq', value: id }]);

      // Update recipe ingredients - delete existing and insert new
      if (data.ingredientsList !== undefined) {
        // Delete existing ingredients
        await remove('recipe_products', [{ column: 'recipe_id', operator: 'eq', value: id }]);

        // Insert new ingredients
        if (data.ingredientsList.length > 0) {
          const recipeIngredients = data.ingredientsList.map(ingredient => ({
            recipe_id: id,
            product_id: ingredient.productId,
            amount: ingredient.amount,
            unit: ingredient.unit,
            notes: ingredient.notes || null,
            display_order: ingredient.displayOrder,
            quantity: `${ingredient.amount} ${ingredient.unit}`, // Legacy field for backward compatibility
          }));
          await insert('recipe_products', recipeIngredients);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-recipes"] });
      toast({ title: "Recipe updated successfully" });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error updating recipe", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await remove('recipes', [{ column: 'id', operator: 'eq', value: id }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-recipes"] });
      toast({ title: "Recipe deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error deleting recipe", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      prep_time_minutes: 30,
      servings: 4,
      difficulty: "Medium",
      ingredients: "",
      instructions: "",
      display_order: 1,
      is_active: true,
      ingredientsList: [],
    });
    setEditingRecipe(null);
    setProductSearch("");
    setSelectedProductId("");
    setSelectedFile(null);
    setImagePreview("");
    setIngredientForm({ amount: 1, unit: "piece", notes: "" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate image is selected for new recipes
    if (!editingRecipe && !selectedFile) {
      toast({
        title: "Image required",
        description: "Please select an image for the recipe",
        variant: "destructive",
      });
      return;
    }
    
    if (editingRecipe) {
      updateMutation.mutate({ id: editingRecipe.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = async (recipe: Recipe) => {
    setEditingRecipe(recipe);
    
    // Fetch recipe ingredients with product details
    const { data: recipeIngredients } = await supabase
      .from("recipe_products")
      .select(`
        product_id,
        amount,
        unit,
        notes,
        display_order,
        products(name)
      `)
      .eq("recipe_id", recipe.id)
      .order("display_order", { ascending: true });
    
    const ingredientsList: IngredientInput[] = recipeIngredients?.map((ri: any, index) => ({
      productId: ri.product_id,
      productName: ri.products?.name || "Unknown Product",
      amount: ri.amount || 1,
      unit: ri.unit || "piece",
      notes: ri.notes || "",
      displayOrder: ri.display_order ?? index,
    })) || [];
    
    setFormData({
      title: recipe.title,
      description: recipe.description,
      prep_time_minutes: recipe.prep_time_minutes,
      servings: recipe.servings,
      difficulty: recipe.difficulty,
      ingredients: recipe.ingredients.join('\n'),
      instructions: recipe.instructions.join('\n'),
      display_order: recipe.display_order,
      is_active: recipe.is_active,
      ingredientsList: ingredientsList,
    });
    setImagePreview(recipe.image_url);
    setSelectedFile(null);
    setIsDialogOpen(true);
  };

  // Ingredient management functions
  const handleAddIngredient = () => {
    if (!selectedProductId) {
      toast({
        title: "No product selected",
        description: "Please select a product to add as an ingredient",
        variant: "destructive",
      });
      return;
    }

    const product = products?.find(p => p.id === selectedProductId);
    if (!product) return;

    const newIngredient: IngredientInput = {
      productId: selectedProductId,
      productName: product.name,
      amount: ingredientForm.amount,
      unit: ingredientForm.unit,
      notes: ingredientForm.notes,
      displayOrder: formData.ingredientsList.length,
    };

    setFormData({
      ...formData,
      ingredientsList: [...formData.ingredientsList, newIngredient],
    });

    // Reset ingredient form
    setSelectedProductId("");
    setIngredientForm({ amount: 1, unit: "piece", notes: "" });
    setProductSearch("");
  };

  const handleRemoveIngredient = (index: number) => {
    const updatedList = formData.ingredientsList
      .filter((_, i) => i !== index)
      .map((ing, i) => ({ ...ing, displayOrder: i }));
    setFormData({ ...formData, ingredientsList: updatedList });
  };

  const handleMoveIngredient = (index: number, direction: 'up' | 'down') => {
    const newList = [...formData.ingredientsList];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newList.length) return;
    
    // Swap items
    [newList[index], newList[targetIndex]] = [newList[targetIndex], newList[index]];
    
    // Update display orders
    const reorderedList = newList.map((ing, i) => ({ ...ing, displayOrder: i }));
    setFormData({ ...formData, ingredientsList: reorderedList });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image under 5MB",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);

      // Create preview
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

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this recipe?")) {
      deleteMutation.mutate(id);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy": return "bg-green-100 text-green-800";
      case "Medium": return "bg-yellow-100 text-yellow-800";
      case "Hard": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <AdminLayout title="Recipes">
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ChefHat className="h-8 w-8 text-food-red" />
              <h1 className="text-3xl font-bold text-gray-900">Manage Recipes</h1>
            </div>
            <p className="text-gray-600">Create and manage recipe cards displayed on the home page</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                Add Recipe
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>{editingRecipe ? "Edit Recipe" : "Add New Recipe"}</DialogTitle>
                <DialogDescription>
                  {editingRecipe ? "Update the recipe details" : "Create a new recipe card"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 px-1">
                <div>
                  <Label htmlFor="title">Recipe Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Spicy Samosa Chaat"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the recipe..."
                    required
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="recipeImage">Recipe Image *</Label>
                  {!imagePreview ? (
                    <div className="flex items-center gap-2">
                      <Input
                        id="recipeImage"
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById("recipeImage")?.click()}
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
                        alt="Recipe preview"
                        className="w-full h-48 object-cover rounded-lg border"
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
                  <p className="text-xs text-muted-foreground mt-1">
                    Max file size: 5MB. Recommended: 400x300px
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="prep_time_minutes">Prep Time (min) *</Label>
                    <Input
                      id="prep_time_minutes"
                      type="number"
                      value={formData.prep_time_minutes}
                      onChange={(e) => setFormData({ ...formData, prep_time_minutes: parseInt(e.target.value) })}
                      min={1}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="servings">Servings *</Label>
                    <Input
                      id="servings"
                      type="number"
                      value={formData.servings}
                      onChange={(e) => setFormData({ ...formData, servings: parseInt(e.target.value) })}
                      min={1}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="difficulty">Difficulty *</Label>
                    <Select value={formData.difficulty} onValueChange={(value) => setFormData({ ...formData, difficulty: value })}>
                      <SelectTrigger id="difficulty">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Easy">Easy</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="ingredients">Ingredients (one per line) *</Label>
                  <Textarea
                    id="ingredients"
                    value={formData.ingredients}
                    onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
                    placeholder="2 cups flour&#10;1 tsp salt&#10;3 tbsp oil"
                    required
                    rows={6}
                  />
                </div>
                <div>
                  <Label htmlFor="instructions">Instructions (one step per line) *</Label>
                  <Textarea
                    id="instructions"
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                    placeholder="Mix flour and salt&#10;Add oil and water&#10;Knead for 5 minutes"
                    required
                    rows={6}
                  />
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
                <div>
                  <Label className="flex items-center gap-2 mb-3">
                    <ShoppingCart className="h-4 w-4" />
                    Recipe Ingredients (for "Add to Cart" feature)
                  </Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add products with specific quantities that customers can add to cart
                  </p>
                  
                  {/* Add Ingredient Form */}
                  <div className="border rounded-lg p-4 bg-gray-50 mb-4">
                    <Label className="text-xs font-semibold text-gray-700 mb-2 block">Add Ingredient</Label>
                    <div className="grid grid-cols-1 gap-3">
                      {/* Product Selection */}
                      <div>
                        <Label htmlFor="product-search" className="text-xs mb-1">Product *</Label>
                        <Input
                          id="product-search"
                          placeholder="Search products..."
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          className="mb-2"
                        />
                        {productSearch && (
                          <div className="border rounded-md max-h-32 overflow-y-auto bg-white">
                            {products
                              ?.filter(product => 
                                product.name.toLowerCase().includes(productSearch.toLowerCase()) &&
                                !formData.ingredientsList.some(ing => ing.productId === product.id)
                              )
                              .map((product) => (
                                <button
                                  key={product.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedProductId(product.id);
                                    setProductSearch(product.name);
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                                >
                                  {product.name} - ${product.price_per_unit.toFixed(2)}{product.is_weighted ? '/lb' : ''}
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                      
                      {/* Amount and Unit */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor="ingredient-amount" className="text-xs mb-1">Amount *</Label>
                          <Input
                            id="ingredient-amount"
                            type="number"
                            step="0.1"
                            min="0.1"
                            value={ingredientForm.amount}
                            onChange={(e) => setIngredientForm({ ...ingredientForm, amount: parseFloat(e.target.value) || 1 })}
                            placeholder="e.g., 2, 0.5"
                          />
                        </div>
                        <div>
                          <Label htmlFor="ingredient-unit" className="text-xs mb-1">Unit *</Label>
                          <Select
                            value={ingredientForm.unit}
                            onValueChange={(value) => setIngredientForm({ ...ingredientForm, unit: value })}
                          >
                            <SelectTrigger id="ingredient-unit">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="piece">piece(s)</SelectItem>
                              <SelectItem value="cup">cup(s)</SelectItem>
                              <SelectItem value="tsp">tsp</SelectItem>
                              <SelectItem value="tbsp">tbsp</SelectItem>
                              <SelectItem value="kg">kg</SelectItem>
                              <SelectItem value="g">g</SelectItem>
                              <SelectItem value="lb">lb</SelectItem>
                              <SelectItem value="oz">oz</SelectItem>
                              <SelectItem value="ml">ml</SelectItem>
                              <SelectItem value="l">l</SelectItem>
                              <SelectItem value="serving">serving(s)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      {/* Notes */}
                      <div>
                        <Label htmlFor="ingredient-notes" className="text-xs mb-1">Notes (optional)</Label>
                        <Input
                          id="ingredient-notes"
                          value={ingredientForm.notes}
                          onChange={(e) => setIngredientForm({ ...ingredientForm, notes: e.target.value })}
                          placeholder="e.g., finely chopped, room temperature"
                        />
                      </div>
                      
                      <Button
                        type="button"
                        onClick={handleAddIngredient}
                        variant="outline"
                        size="sm"
                        disabled={!selectedProductId}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Ingredient
                      </Button>
                    </div>
                  </div>
                  
                  {/* Ingredients List */}
                  {formData.ingredientsList.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 border-b">
                        Ingredients List ({formData.ingredientsList.length})
                      </div>
                      <div className="divide-y max-h-64 overflow-y-auto">
                        {formData.ingredientsList.map((ingredient, index) => (
                          <div key={index} className="px-3 py-2 flex items-start gap-2 bg-white hover:bg-gray-50">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2">
                                <span className="font-medium text-sm">{ingredient.amount} {ingredient.unit}</span>
                                <span className="text-sm text-gray-700">{ingredient.productName}</span>
                              </div>
                              {ingredient.notes && (
                                <p className="text-xs text-gray-500 mt-1">{ingredient.notes}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMoveIngredient(index, 'up')}
                                disabled={index === 0}
                                className="h-7 w-7 p-0"
                              >
                                <ArrowUp className="h-3 w-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMoveIngredient(index, 'down')}
                                disabled={index === formData.ingredientsList.length - 1}
                                className="h-7 w-7 p-0"
                              >
                                <ArrowDown className="h-3 w-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveIngredient(index)}
                                className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="border rounded-lg p-6 text-center text-sm text-gray-500">
                      No ingredients added yet. Add products above to create the ingredient list.
                    </div>
                  )}
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
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending || isUploading}>
                    {isUploading ? "Uploading..." : (editingRecipe ? "Update" : "Create")} Recipe
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Loading recipes...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes?.map((recipe) => (
              <Card key={recipe.id}>
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <CardTitle className="text-lg">{recipe.title}</CardTitle>
                    <div className="flex space-x-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleEdit(recipe)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={() => handleDelete(recipe.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Badge className={getDifficultyColor(recipe.difficulty)}>
                      {recipe.difficulty}
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {recipe.prep_time_minutes}m
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {recipe.servings}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <img
                    src={recipe.image_url}
                    alt={recipe.title}
                    className="w-full h-40 object-cover rounded-lg mb-4"
                  />
                  <p className="text-sm text-gray-600 mb-4">{recipe.description}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Order: {recipe.display_order}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      recipe.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                    }`}>
                      {recipe.is_active ? "Active" : "Inactive"}
                    </span>
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

export default AdminRecipesPage;
