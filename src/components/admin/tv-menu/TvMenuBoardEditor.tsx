import { useState, useEffect } from "react";
import { TvMenuBoard, TvMenuBoardConfig, DEFAULT_CONFIG } from "@/types/tv-menu";
import { useCategoriesFetcher } from "@/hooks/useCategoriesFetcher";
import { useMenuItemFetcher } from "@/hooks/products/useProductFetcher";
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
import { Loader2 } from "lucide-react";

interface Props {
  board: TvMenuBoard;
  open: boolean;
  onClose: () => void;
  onSave: (config: TvMenuBoardConfig) => void;
  isSaving: boolean;
}

export function TvMenuBoardEditor({ board, open, onClose, onSave, isSaving }: Props) {
  const [config, setConfig] = useState<TvMenuBoardConfig>({
    ...DEFAULT_CONFIG,
    ...board.config,
    theme: { ...DEFAULT_CONFIG.theme, ...(board.config?.theme ?? {}) },
  });

  const { data: categories = [], isLoading: categoriesLoading } = useCategoriesFetcher();
  const { data: menuItems = [], isLoading: itemsLoading } = useMenuItemFetcher();

  useEffect(() => {
    setConfig({
      ...DEFAULT_CONFIG,
      ...board.config,
      theme: { ...DEFAULT_CONFIG.theme, ...(board.config?.theme ?? {}) },
    });
  }, [board]);

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
                        </label>
                      ))}
                    </div>
                  )}
                </div>

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
                    {(["classic", "modern", "grid"] as const).map((layout) => (
                      <button
                        key={layout}
                        onClick={() => update("layout", layout)}
                        className={`p-4 rounded-lg border-2 text-center transition-colors ${
                          config.layout === layout
                            ? "border-food-red bg-food-red/5"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="text-sm font-medium capitalize">{layout}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {layout === "classic" && "Dark, dotted leaders"}
                          {layout === "modern" && "Light, card-based"}
                          {layout === "grid" && "Dense, compact cards"}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Columns */}
                <div>
                  <Label className="text-sm font-semibold">Columns</Label>
                  <div className="flex gap-3 mt-2">
                    {[1, 2, 3].map((n) => (
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
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-semibold">Auto-Scroll</Label>
                    <p className="text-xs text-gray-500">
                      Automatically scroll through the menu on the TV
                    </p>
                  </div>
                  <Switch
                    checked={config.auto_scroll}
                    onCheckedChange={(v) => update("auto_scroll", v)}
                  />
                </div>

                {config.auto_scroll && (
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

                <div>
                  <Label className="text-sm font-semibold">Header Text</Label>
                  <Input
                    className="mt-2"
                    value={config.header_text}
                    onChange={(e) => update("header_text", e.target.value)}
                    placeholder="Our Menu"
                  />
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
          <Button onClick={() => onSave(config)} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
