import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TvMenuBoard, TvMenuBoardConfig, DEFAULT_CONFIG, RESTAURANT_THEME } from "@/types/tv-menu";
import { MenuItem } from "@/hooks/products/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Upload, X, ArrowUp, ArrowDown } from "lucide-react";
import { uploadImage } from "@/lib/upload-image";
import { useToast } from "@/hooks/use-toast";
import { HEADING_FONTS, BODY_FONTS, googleFontsHref } from "@/components/tv-menu/fonts";

interface Props {
  board: TvMenuBoard;
  open: boolean;
  onClose: () => void;
  onSave: (config: TvMenuBoardConfig, slug?: string) => void;
  isSaving: boolean;
}

export function TvMenuBoardEditor({ board, open, onClose, onSave, isSaving }: Props) {
  const { toast } = useToast();
  const [config, setConfig] = useState<TvMenuBoardConfig>({
    ...DEFAULT_CONFIG,
    ...board.config,
    theme: { ...DEFAULT_CONFIG.theme, ...(board.config?.theme ?? {}) },
  });
  const [slug, setSlug] = useState((board as any).slug ?? "");
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop() ?? "png";
      const filePath = `tv-menu/logo-${board.id}-${Date.now()}.${ext}`;
      const url = await uploadImage(file, filePath, { requireAdmin: true });
      update("logo_image_url", url);
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err?.message ?? "Could not upload logo",
        variant: "destructive",
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleBackgroundUpload = async (file: File) => {
    setUploadingBg(true);
    try {
      const ext = file.name.split(".").pop() ?? "png";
      const filePath = `tv-menu/bg-${board.id}-${Date.now()}.${ext}`;
      const url = await uploadImage(file, filePath, { requireAdmin: true });
      update("background_image_url", url);
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err?.message ?? "Could not upload background image",
        variant: "destructive",
      });
    } finally {
      setUploadingBg(false);
    }
  };

  const handleStaticImageUpload = async (file: File, atIndex?: number) => {
    const idx = atIndex ?? config.static_images?.length ?? 0;
    setUploadingIdx(idx);
    try {
      const ext = file.name.split(".").pop() ?? "png";
      const filePath = `tv-menu/${board.id}-${Date.now()}-${idx}.${ext}`;
      const url = await uploadImage(file, filePath, { requireAdmin: true });
      const next = [...(config.static_images ?? [])];
      next[idx] = url;
      update("static_images", next);
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err?.message ?? "Could not upload image",
        variant: "destructive",
      });
    } finally {
      setUploadingIdx(null);
    }
  };

  const moveStaticImage = (from: number, to: number) => {
    const list = [...(config.static_images ?? [])];
    if (to < 0 || to >= list.length) return;
    const [item] = list.splice(from, 1);
    list.splice(to, 0, item);
    update("static_images", list);
  };

  const removeStaticImage = (idx: number) => {
    const next = [...(config.static_images ?? [])];
    next.splice(idx, 1);
    update("static_images", next);
  };

  // Fetch ALL active categories (including TV-only ones hidden from website)
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["all-categories-for-tv"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch items based on data source
  const dataSource = config.data_source ?? "menu_items";

  const { data: menuItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["all-items-for-tv", dataSource],
    queryFn: async () => {
      const items: MenuItem[] = [];

      if (dataSource === "menu_items" || dataSource === "both") {
        const { data, error } = await supabase
          .from("menu_items")
          .select("*, category:categories(id, name)")
          .eq("is_available", true)
          .order("name");
        if (error) throw error;
        if (data) items.push(...(data as any as MenuItem[]));
      }

      if (dataSource === "products" || dataSource === "both") {
        const { data, error } = await supabase
          .from("products")
          .select("*, category:categories(id, name)")
          .eq("is_active", true)
          .order("name");
        if (error) throw error;
        if (data) {
          items.push(
            ...data.map((p: any) => ({
              id: p.id,
              name: p.name,
              description: p.description,
              price: p.price_per_unit,
              category_id: p.category_id,
              category: p.category,
              sub_category: p.sub_category,
              is_vegetarian: null,
              is_spicy: null,
              image_url: p.image_url,
              serves_people: null,
              created_at: p.created_at,
              updated_at: p.updated_at,
            } as MenuItem)),
          );
        }
      }

      return items;
    },
  });

  useEffect(() => {
    setConfig({
      ...DEFAULT_CONFIG,
      ...board.config,
      theme: { ...DEFAULT_CONFIG.theme, ...(board.config?.theme ?? {}) },
    });
    setSlug((board as any).slug ?? "");
  }, [board]);

  // Load all curated fonts so the picker buttons preview in their own typeface.
  useEffect(() => {
    const href = googleFontsHref([...HEADING_FONTS, ...BODY_FONTS]);
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
    return () => {
      link.remove();
    };
  }, []);

  const update = <K extends keyof TvMenuBoardConfig>(key: K, value: TvMenuBoardConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const updateTheme = (key: string, value: string | number) => {
    setConfig((prev) => ({
      ...prev,
      theme: { ...prev.theme, [key]: value },
    }));
  };

  const toggleCategory = (catId: string) => {
    const ids = config.category_ids ?? [];
    update(
      "category_ids",
      ids.includes(catId) ? ids.filter((id) => id !== catId) : [...ids, catId],
    );
  };

  const toggleExcludedItem = (itemId: string) => {
    const ids = config.excluded_item_ids ?? [];
    update(
      "excluded_item_ids",
      ids.includes(itemId) ? ids.filter((id) => id !== itemId) : [...ids, itemId],
    );
  };

  // Items in selected categories for exclusion toggles
  const selectedCatIds = new Set(config.category_ids ?? []);
  const filteredItems = menuItems.filter(
    (item) => item.category_id && selectedCatIds.has(item.category_id),
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Board: {board.name}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="content" className="flex-1 min-h-0">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="layout">Layout</TabsTrigger>
            <TabsTrigger value="display">Display</TabsTrigger>
            <TabsTrigger value="theme">Theme</TabsTrigger>
          </TabsList>

          {/* Content Tab */}
          <TabsContent value="content" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-6">
                {/* Data Source */}
                <div>
                  <Label className="text-sm font-semibold">Data Source</Label>
                  <p className="text-xs text-gray-500 mb-2">
                    Choose where to pull items from
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { value: "menu_items", label: "Menu Items", desc: "Restaurant menu" },
                      { value: "products", label: "Products", desc: "Store products" },
                      { value: "both", label: "Both", desc: "Combined" },
                    ] as const).map(({ value, label, desc }) => (
                      <button
                        key={value}
                        onClick={() => update("data_source", value)}
                        className={`p-3 rounded-lg border-2 text-left transition-colors ${
                          (config.data_source ?? "menu_items") === value
                            ? "border-food-red bg-food-red/5"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="text-sm font-medium">{label}</div>
                        <div className="text-xs text-gray-500">{desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Categories */}
                <div>
                  <Label className="text-sm font-semibold">Categories to Display</Label>
                  <p className="text-xs text-gray-500 mb-3">
                    Select which menu categories appear on the TV display. Drag order determines display order.
                  </p>
                  {categoriesLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <div className="space-y-2">
                      {categories.map((cat) => (
                        <label
                          key={cat.id}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg border hover:bg-gray-50 cursor-pointer"
                        >
                          <Checkbox
                            checked={(config.category_ids ?? []).includes(cat.id)}
                            onCheckedChange={() => toggleCategory(cat.id)}
                          />
                          <span className="text-sm font-medium">{cat.name}</span>
                          {!(cat as any).show_on_website && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                              TV Only
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section Headers — custom label + numbering per board */}
                {(config.category_ids?.length ?? 0) > 0 && (
                  <div>
                    <Label className="text-sm font-semibold">Section Headers</Label>
                    <p className="text-xs text-gray-500 mb-3">
                      Custom label per section (defaults to the category name). Editable any
                      time — no need to touch the background image.
                    </p>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-sm">Show section numbers (1. 2. 3.)</Label>
                      <Switch
                        checked={config.show_section_numbers ?? true}
                        onCheckedChange={(v) => update("show_section_numbers", v)}
                      />
                    </div>
                    <div className="space-y-2">
                      {(config.category_ids ?? []).map((id, i) => {
                        const cat = categories.find((c) => c.id === id);
                        if (!cat) return null;
                        return (
                          <div key={id} className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 w-6 text-right flex-shrink-0">
                              {(config.show_section_numbers ?? true) ? `${i + 1}.` : ""}
                            </span>
                            <Input
                              value={config.section_labels?.[id] ?? ""}
                              placeholder={cat.name}
                              onChange={(e) => {
                                const next = { ...(config.section_labels ?? {}) };
                                if (e.target.value.trim()) next[id] = e.target.value;
                                else delete next[id];
                                update("section_labels", next);
                              }}
                              className="flex-1 text-sm"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Item Exclusions */}
                {filteredItems.length > 0 && (
                  <div>
                    <Label className="text-sm font-semibold">Exclude Specific Items</Label>
                    <p className="text-xs text-gray-500 mb-3">
                      Toggle off items you don't want to show on the TV menu.
                    </p>
                    <div className="space-y-1">
                      {filteredItems.map((item) => (
                        <label
                          key={item.id}
                          className="flex items-center justify-between px-3 py-2 rounded-lg border hover:bg-gray-50 cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={!(config.excluded_item_ids ?? []).includes(item.id)}
                              onCheckedChange={() => toggleExcludedItem(item.id)}
                            />
                            <span className="text-sm">{item.name}</span>
                          </div>
                          {config.show_prices && (
                            <span className="text-sm text-gray-500">
                              ${item.price.toFixed(2)}
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Layout Tab */}
          <TabsContent value="layout" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-6">
                {/* Layout Style */}
                <div>
                  <Label className="text-sm font-semibold">Layout Style</Label>
                  <div className="grid grid-cols-3 gap-3 mt-2">
                    {(["classic", "modern", "grid", "restaurant", "static_images"] as const).map((layout) => (
                      <button
                        key={layout}
                        onClick={() => update("layout", layout)}
                        className={`p-4 rounded-lg border-2 text-center transition-colors ${
                          config.layout === layout
                            ? "border-food-red bg-food-red/5"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="text-sm font-medium capitalize">
                          {layout === "static_images" ? "Static Images" : layout}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {layout === "classic" && "Dark, dotted leaders"}
                          {layout === "modern" && "Light, card-based"}
                          {layout === "grid" && "Dense, compact cards"}
                          {layout === "restaurant" && "Framed panels, ribbon headers"}
                          {layout === "static_images" && "Upload menu images"}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Static Images uploader — static_images layout only */}
                {config.layout === "static_images" && (
                  <div>
                    <Label className="text-sm font-semibold">Menu Images</Label>
                    <p className="text-xs text-gray-500 mb-3">
                      Upload PNG/JPG images. With <code className="bg-gray-100 px-1 rounded">?screen=N&of=M</code> on each TV, image #N is shown on screen N. Without those params, all images cycle (uses Page Duration from Display tab).
                    </p>

                    <div className="space-y-2">
                      {(config.static_images ?? []).map((url, i) => (
                        <div
                          key={`${url}-${i}`}
                          className="flex items-center gap-2 p-2 border rounded-lg bg-white"
                        >
                          <span className="text-xs font-mono text-gray-500 w-6 text-center">
                            #{i + 1}
                          </span>
                          <img
                            src={url}
                            alt=""
                            className="w-20 h-12 object-cover rounded border bg-gray-100"
                          />
                          <span className="flex-1 text-xs text-gray-600 truncate" title={url}>
                            {url.split("/").pop()}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => moveStaticImage(i, i - 1)}
                            disabled={i === 0}
                            className="h-7 w-7 p-0"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => moveStaticImage(i, i + 1)}
                            disabled={i === (config.static_images?.length ?? 0) - 1}
                            className="h-7 w-7 p-0"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removeStaticImage(i)}
                            className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <label className="flex items-center justify-center w-full h-20 mt-2 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                      {uploadingIdx !== null ? (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Uploading…
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Upload className="h-4 w-4" />
                          Click to add menu image (PNG/JPG)
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleStaticImageUpload(f);
                          e.target.value = "";
                        }}
                        disabled={uploadingIdx !== null}
                      />
                    </label>
                  </div>
                )}

                {/* Accent Images — restaurant layout only */}
                {config.layout === "restaurant" && (
                  <div>
                    <Label className="text-sm font-semibold">Accent Dish Photos</Label>
                    <p className="text-xs text-gray-500 mb-3">
                      Up to 4 hero dish photos placed at the corners (TL, TR, BR, BL). Paste image URLs.
                    </p>
                    <div className="space-y-2">
                      {[0, 1, 2, 3].map((i) => {
                        const slotLabel = ["Top-Left", "Top-Right", "Bottom-Right", "Bottom-Left"][i];
                        const value = config.accent_images?.[i] ?? "";
                        return (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 w-24 flex-shrink-0">{slotLabel}</span>
                            <Input
                              placeholder="https://…"
                              value={value}
                              onChange={(e) => {
                                const next = [...(config.accent_images ?? [])];
                                while (next.length <= i) next.push("");
                                next[i] = e.target.value;
                                update("accent_images", next);
                              }}
                              className="flex-1 text-xs"
                            />
                            {value && (
                              <img
                                src={value}
                                alt=""
                                className="w-9 h-9 rounded-full object-cover border"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Columns */}
                <div>
                  <Label className="text-sm font-semibold">Columns</Label>
                  <div className="flex gap-3 mt-2">
                    {[1, 2, 3, 4].map((n) => (
                      <button
                        key={n}
                        onClick={() => update("columns", n)}
                        className={`px-6 py-2 rounded-lg border-2 font-medium transition-colors ${
                          config.columns === n
                            ? "border-food-red bg-food-red/5 text-food-red"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggles */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Group by Sub-category</Label>
                      <p className="text-xs text-gray-500">
                        Show sub-category headers within each category section
                      </p>
                    </div>
                    <Switch
                      checked={config.group_by_subcategory ?? true}
                      onCheckedChange={(v) => update("group_by_subcategory", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Show Images</Label>
                    <Switch
                      checked={config.show_images}
                      onCheckedChange={(v) => update("show_images", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Show Descriptions</Label>
                    <Switch
                      checked={config.show_descriptions}
                      onCheckedChange={(v) => update("show_descriptions", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Show Prices</Label>
                    <Switch
                      checked={config.show_prices}
                      onCheckedChange={(v) => update("show_prices", v)}
                    />
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Display Tab */}
          <TabsContent value="display" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-6">
                {/* Display Mode */}
                <div>
                  <Label className="text-sm font-semibold">Display Mode</Label>
                  <p className="text-xs text-gray-500 mb-2">
                    How the menu animates on the TV screen
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { value: "pages", label: "Sliding Pages", desc: "Full-screen pages that slide automatically" },
                      { value: "scroll", label: "Continuous Scroll", desc: "Smooth scrolling like a ticker" },
                      { value: "static", label: "Static", desc: "No animation, fixed display" },
                    ] as const).map(({ value, label, desc }) => (
                      <button
                        key={value}
                        onClick={() => update("display_mode", value)}
                        className={`p-3 rounded-lg border-2 text-left transition-colors ${
                          (config.display_mode ?? "pages") === value
                            ? "border-food-red bg-food-red/5"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="text-sm font-medium">{label}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Page duration (pages mode) */}
                {(config.display_mode ?? "pages") === "pages" && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-semibold">Page Duration</Label>
                      <span className="text-sm text-gray-500 font-mono">
                        {config.page_duration ?? 10}s
                      </span>
                    </div>
                    <Slider
                      value={[config.page_duration ?? 10]}
                      onValueChange={([v]) => update("page_duration", v)}
                      min={5}
                      max={30}
                      step={1}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      How long each page is shown before sliding to the next
                    </p>
                  </div>
                )}

                {/* Scroll speed (scroll mode) */}
                {(config.display_mode ?? "pages") === "scroll" && (
                  <div>
                    <Label className="text-sm font-semibold">Scroll Speed</Label>
                    <div className="flex gap-3 mt-2">
                      {(["slow", "medium", "fast"] as const).map((speed) => (
                        <button
                          key={speed}
                          onClick={() => update("scroll_speed", speed)}
                          className={`px-4 py-2 rounded-lg border-2 text-sm font-medium capitalize transition-colors ${
                            config.scroll_speed === speed
                              ? "border-food-red bg-food-red/5 text-food-red"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          {speed}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Multi-screen */}
                <div>
                  <Label className="text-sm font-semibold">Number of TV Screens</Label>
                  <p className="text-xs text-gray-500 mb-2">
                    Split the menu across multiple screens. Use <code className="bg-gray-100 px-1 rounded">/tv-menu?screen=1&of=2</code> and <code className="bg-gray-100 px-1 rounded">/tv-menu?screen=2&of=2</code> on each TV.
                  </p>
                  <div className="flex gap-3">
                    {[1, 2, 3].map((n) => (
                      <button
                        key={n}
                        onClick={() => update("total_screens", n)}
                        className={`px-6 py-2 rounded-lg border-2 font-medium transition-colors ${
                          (config.total_screens ?? 1) === n
                            ? "border-food-red bg-food-red/5 text-food-red"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        {n === 1 ? "1 (Single)" : n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* URL Slug */}
                <div>
                  <Label className="text-sm font-semibold">URL Slug</Label>
                  <Input
                    className="mt-2"
                    value={slug}
                    onChange={(e) =>
                      setSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, "-")
                          .replace(/-+/g, "-")
                          .replace(/^-|-$/g, ""),
                      )
                    }
                    placeholder="e.g., meat-shop"
                  />
                  {slug && (
                    <p className="text-xs text-gray-500 mt-1">
                      URL: <code className="bg-gray-100 px-1 rounded">/tv-menu/{slug}</code>
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-semibold">Header Text</Label>
                  <Input
                    className="mt-2"
                    value={config.header_text}
                    onChange={(e) => update("header_text", e.target.value)}
                    placeholder="Our Menu"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Used as the header title (and as the logo's alt text / fallback).
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-semibold">Header Logo</Label>
                  <p className="text-xs text-gray-500 mb-2">
                    Upload a logo (PNG with transparency works best) to replace the text
                    title in the header.
                  </p>
                  {config.logo_image_url ? (
                    <div className="flex items-center gap-2 p-2 border rounded-lg bg-white">
                      <img
                        src={config.logo_image_url}
                        alt=""
                        className="h-10 w-auto max-w-[140px] object-contain rounded bg-gray-800 px-1"
                      />
                      <span className="flex-1 text-xs text-gray-600 truncate">
                        {config.logo_image_url.split("/").pop()}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => update("logo_image_url", undefined)}
                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center w-full h-16 border-2 border-dashed rounded-lg cursor-pointer bg-white hover:bg-gray-100 transition-colors">
                      {uploadingLogo ? (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Upload className="h-4 w-4" /> Upload logo (PNG/SVG)
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleLogoUpload(f);
                          e.target.value = "";
                        }}
                        disabled={uploadingLogo}
                      />
                    </label>
                  )}
                  {config.logo_image_url && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-xs">Logo Height</Label>
                        <span className="text-xs text-gray-500 font-mono">
                          {config.logo_height ?? 110}px
                        </span>
                      </div>
                      <Slider
                        value={[config.logo_height ?? 110]}
                        onValueChange={([v]) => update("logo_height", v)}
                        min={40}
                        max={220}
                        step={5}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-semibold">Footer Text</Label>
                  <Input
                    className="mt-2"
                    value={config.footer_text}
                    onChange={(e) => update("footer_text", e.target.value)}
                    placeholder="e.g., Prices subject to change"
                  />
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Theme Tab */}
          <TabsContent value="theme" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-5">
                {/* Background Template Image */}
                <div className="rounded-lg border bg-gray-50 p-3">
                  <Label className="text-sm font-semibold">Background Template</Label>
                  <p className="text-xs text-gray-500 mb-3">
                    Upload a full-bleed background (textures, frames, logo, hero photo) and
                    the menu items render on top of it — designed look, still fully editable.
                    Leave the menu area of your artwork clear.
                  </p>

                  {config.background_image_url ? (
                    <div className="flex items-center gap-2 p-2 border rounded-lg bg-white mb-3">
                      <img
                        src={config.background_image_url}
                        alt=""
                        className="w-24 h-14 object-cover rounded border bg-gray-100"
                      />
                      <span className="flex-1 text-xs text-gray-600 truncate">
                        {config.background_image_url.split("/").pop()}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => update("background_image_url", undefined)}
                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center w-full h-20 border-2 border-dashed rounded-lg cursor-pointer bg-white hover:bg-gray-100 transition-colors mb-3">
                      {uploadingBg ? (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Uploading…
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Upload className="h-4 w-4" />
                          Upload background image (PNG/JPG)
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleBackgroundUpload(f);
                          e.target.value = "";
                        }}
                        disabled={uploadingBg}
                      />
                    </label>
                  )}

                  {config.background_image_url && (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        {(["cover", "contain"] as const).map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => update("background_size", size)}
                            className={`flex-1 px-3 py-1.5 rounded-lg border-2 text-xs font-medium capitalize transition-colors ${
                              (config.background_size ?? "cover") === size
                                ? "border-food-red bg-food-red/5 text-food-red"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Overlay (darken for legibility)</Label>
                        <input
                          type="color"
                          value={config.overlay_color ?? "#000000"}
                          onChange={(e) => update("overlay_color", e.target.value)}
                          className="w-9 h-9 rounded border cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-xs">Overlay Opacity</Label>
                          <span className="text-xs text-gray-500 font-mono">
                            {Math.round((config.overlay_opacity ?? 0.4) * 100)}%
                          </span>
                        </div>
                        <Slider
                          value={[config.overlay_opacity ?? 0.4]}
                          onValueChange={([v]) => update("overlay_opacity", v)}
                          min={0}
                          max={0.85}
                          step={0.05}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Typography */}
                <div className="rounded-lg border bg-gray-50 p-3">
                  <Label className="text-sm font-semibold">Typography</Label>
                  <p className="text-xs text-gray-500 mb-2">
                    Heading font (section titles) and body font (items & prices).
                  </p>
                  <div className="mb-3">
                    <Label className="text-xs">Heading font</Label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {HEADING_FONTS.map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => update("heading_font", f)}
                          style={{ fontFamily: `'${f}'` }}
                          className={`px-2 py-2 rounded border text-sm truncate transition-colors ${
                            (config.heading_font ?? "Playfair Display") === f
                              ? "border-food-red bg-food-red/5 text-food-red"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Body font</Label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {BODY_FONTS.map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => update("body_font", f)}
                          style={{ fontFamily: `'${f}'` }}
                          className={`px-2 py-2 rounded border text-sm truncate transition-colors ${
                            (config.body_font ?? "Inter") === f
                              ? "border-food-red bg-food-red/5 text-food-red"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Theme Presets */}
                <div className="rounded-lg border bg-gray-50 p-3">
                  <Label className="text-sm font-semibold">Presets</Label>
                  <p className="text-xs text-gray-500 mb-2">
                    One-click theme + layout combos.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setConfig((prev) => ({
                        ...prev,
                        layout: "restaurant",
                        theme: { ...RESTAURANT_THEME },
                      }))
                    }
                  >
                    Apply Restaurant Preset
                  </Button>
                </div>

                {[
                  { key: "background_color", label: "Background Color" },
                  { key: "text_color", label: "Text Color" },
                  { key: "accent_color", label: "Accent Color" },
                  { key: "category_header_color", label: "Category Header Color" },
                  { key: "price_color", label: "Price Color" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label className="text-sm">{label}</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={(config.theme as any)[key]}
                        onChange={(e) => updateTheme(key, e.target.value)}
                        className="w-10 h-10 rounded border cursor-pointer"
                      />
                      <Input
                        value={(config.theme as any)[key]}
                        onChange={(e) => updateTheme(key, e.target.value)}
                        className="w-28 text-xs font-mono"
                      />
                    </div>
                  </div>
                ))}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm">Font Size Scale</Label>
                    <span className="text-sm text-gray-500 font-mono">
                      {config.theme.font_size_scale.toFixed(1)}x
                    </span>
                  </div>
                  <Slider
                    value={[config.theme.font_size_scale]}
                    onValueChange={([v]) => updateTheme("font_size_scale", v)}
                    min={0.5}
                    max={2}
                    step={0.1}
                  />
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(config, slug || undefined)} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
