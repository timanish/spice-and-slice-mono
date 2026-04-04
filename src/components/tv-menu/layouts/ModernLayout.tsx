import { TvMenuBoardConfig } from "@/types/tv-menu";
import { MenuItem } from "@/hooks/products/types";
import { groupBySubcategory } from "./groupBySubcategory";
import { Flame, Leaf } from "lucide-react";

interface Props {
  itemsByCategory: Map<string, { categoryName: string; items: MenuItem[] }>;
  config: TvMenuBoardConfig;
}

export function ModernLayout({ itemsByCategory, config }: Props) {
  const { theme, columns, show_descriptions, show_prices, show_images } = config;
  const useSubcategories = config.group_by_subcategory ?? false;
  const cats = Array.from(itemsByCategory.entries());

  return (
    <div className="px-8 py-6 space-y-8">
      {cats.map(([catId, { categoryName, items }]) => {
        const sections = useSubcategories
          ? groupBySubcategory(items)
          : [{ subCategory: null, items }];

        return (
          <div key={catId}>
            {/* Category Header — bold accent bar with gradient background */}
            <div className="mb-5">
              <div className="flex items-center gap-4">
                <div
                  className="w-1.5 h-9 rounded-full"
                  style={{
                    background: `linear-gradient(180deg, ${theme.category_header_color}, ${theme.accent_color}80)`,
                    boxShadow: `0 0 15px ${theme.category_header_color}30`,
                  }}
                />
                <h2
                  className="text-2xl font-serif font-bold tracking-wider"
                  style={{
                    color: theme.category_header_color,
                    textShadow: `0 0 40px ${theme.category_header_color}25`,
                  }}
                >
                  {categoryName}
                </h2>
              </div>
              <div
                className="mt-2.5 h-px ml-6"
                style={{
                  background: `linear-gradient(90deg, ${theme.category_header_color}50, ${theme.accent_color}20 40%, transparent 80%)`,
                }}
              />
            </div>

            {sections.map((section, si) => (
              <div key={section.subCategory ?? si} className="mb-5">
                {section.subCategory && (
                  <div className="flex items-center gap-2.5 mb-3 ml-6">
                    <div
                      className="w-5 h-0.5 rounded-full"
                      style={{
                        backgroundColor: theme.accent_color,
                        boxShadow: `0 0 8px ${theme.accent_color}40`,
                      }}
                    />
                    <h3
                      className="font-semibold tracking-[0.18em] uppercase"
                      style={{
                        color: theme.accent_color,
                        fontSize: "0.7rem",
                        textShadow: `0 0 15px ${theme.accent_color}20`,
                      }}
                    >
                      {section.subCategory}
                    </h3>
                  </div>
                )}

                <div
                  className="gap-4"
                  style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${columns}, 1fr)`,
                  }}
                >
                  {section.items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl overflow-hidden relative"
                      style={{
                        backgroundColor: `${theme.text_color}08`,
                        border: `1px solid ${theme.text_color}10`,
                        boxShadow: `0 4px 20px ${theme.background_color}60, inset 0 1px 0 ${theme.text_color}05`,
                        backdropFilter: "blur(10px)",
                      }}
                    >
                      {show_images && item.image_url ? (
                        <div className="relative h-28 overflow-hidden">
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            style={{ filter: "brightness(0.85) saturate(1.1)" }}
                          />
                          {/* Gradient overlay for text readability */}
                          <div
                            className="absolute inset-0"
                            style={{
                              background: `linear-gradient(0deg, ${theme.background_color} 0%, ${theme.background_color}90 20%, transparent 55%)`,
                            }}
                          />
                          {/* Price badge on image */}
                          {show_prices && (
                            <div
                              className="absolute top-3 right-3 px-3 py-1 rounded-full font-bold"
                              style={{
                                fontSize: "0.85rem",
                                backgroundColor: `${theme.background_color}CC`,
                                color: theme.price_color,
                                backdropFilter: "blur(12px)",
                                border: `1px solid ${theme.price_color}25`,
                                boxShadow: `0 2px 10px ${theme.background_color}80, 0 0 20px ${theme.price_color}10`,
                              }}
                            >
                              ${item.price.toFixed(2)}
                            </div>
                          )}
                          {/* Dietary badges */}
                          <div className="absolute top-3 left-3 flex gap-1.5">
                            {item.is_vegetarian && (
                              <div
                                className="p-1 rounded-full"
                                style={{
                                  backgroundColor: `${theme.background_color}CC`,
                                  backdropFilter: "blur(8px)",
                                }}
                              >
                                <Leaf className="w-3.5 h-3.5" style={{ color: "#4ade80" }} />
                              </div>
                            )}
                            {item.is_spicy && (
                              <div
                                className="p-1 rounded-full"
                                style={{
                                  backgroundColor: `${theme.background_color}CC`,
                                  backdropFilter: "blur(8px)",
                                }}
                              >
                                <Flame className="w-3.5 h-3.5" style={{ color: "#f87171" }} />
                              </div>
                            )}
                          </div>
                        </div>
                      ) : null}

                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3
                                className="font-bold leading-tight"
                                style={{ color: theme.text_color, fontSize: "0.95rem" }}
                              >
                                {item.name}
                              </h3>
                              {/* Dietary icons (when no image) */}
                              {!(show_images && item.image_url) && (
                                <>
                                  {item.is_vegetarian && (
                                    <Leaf className="w-3.5 h-3.5 shrink-0" style={{ color: "#4ade80" }} />
                                  )}
                                  {item.is_spicy && (
                                    <Flame className="w-3.5 h-3.5 shrink-0" style={{ color: "#f87171" }} />
                                  )}
                                </>
                              )}
                            </div>
                            {show_descriptions && item.description && (
                              <p
                                className="mt-1.5 opacity-45 line-clamp-2 leading-relaxed"
                                style={{ color: theme.text_color, fontSize: "0.72rem" }}
                              >
                                {item.description}
                              </p>
                            )}
                          </div>
                          {show_prices && !(show_images && item.image_url) && (
                            <span
                              className="font-bold tabular-nums shrink-0 px-2.5 py-1 rounded-lg"
                              style={{
                                color: theme.price_color,
                                fontSize: "1rem",
                                backgroundColor: `${theme.price_color}10`,
                                textShadow: `0 0 20px ${theme.price_color}20`,
                              }}
                            >
                              ${item.price.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bottom accent line */}
                      <div
                        className="h-0.5"
                        style={{
                          background: `linear-gradient(90deg, ${theme.accent_color}30, ${theme.category_header_color}20, transparent)`,
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
