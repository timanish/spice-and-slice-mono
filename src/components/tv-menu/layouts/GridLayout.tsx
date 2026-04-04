import { TvMenuBoardConfig } from "@/types/tv-menu";
import { MenuItem } from "@/hooks/products/types";
import { groupBySubcategory } from "./groupBySubcategory";
import { Flame, Leaf } from "lucide-react";

interface Props {
  itemsByCategory: Map<string, { categoryName: string; items: MenuItem[] }>;
  config: TvMenuBoardConfig;
}

export function GridLayout({ itemsByCategory, config }: Props) {
  const { theme, columns, show_descriptions, show_prices, show_images } = config;
  const useSubcategories = config.group_by_subcategory ?? false;
  const cats = Array.from(itemsByCategory.entries());
  const gridCols = Math.min(columns + 1, 4);

  return (
    <div className="px-6 py-5 space-y-6">
      {cats.map(([catId, { categoryName, items }]) => {
        const sections = useSubcategories
          ? groupBySubcategory(items)
          : [{ subCategory: null, items }];

        return (
          <div key={catId}>
            {/* Category Header — centered with gradient lines */}
            <div className="flex items-center gap-4 mb-4">
              <div
                className="flex-1 h-px"
                style={{
                  background: `linear-gradient(90deg, transparent, ${theme.category_header_color}50)`,
                }}
              />
              <h2
                className="text-xl font-serif font-bold tracking-wider px-3 whitespace-nowrap"
                style={{
                  color: theme.category_header_color,
                  textShadow: `0 0 35px ${theme.category_header_color}25`,
                }}
              >
                {categoryName}
              </h2>
              <div
                className="flex-1 h-px"
                style={{
                  background: `linear-gradient(90deg, ${theme.category_header_color}50, transparent)`,
                }}
              />
            </div>

            {sections.map((section, si) => (
              <div key={section.subCategory ?? si} className="mb-4">
                {section.subCategory && (
                  <h3
                    className="font-semibold mb-3 px-1 tracking-[0.18em] uppercase text-center"
                    style={{
                      color: theme.accent_color,
                      fontSize: "0.65rem",
                      textShadow: `0 0 15px ${theme.accent_color}15`,
                    }}
                  >
                    {section.subCategory}
                  </h3>
                )}

                <div
                  className="gap-3"
                  style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                  }}
                >
                  {section.items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl overflow-hidden text-center relative"
                      style={{
                        backgroundColor: `${theme.text_color}06`,
                        border: `1px solid ${theme.text_color}10`,
                        boxShadow: `0 2px 12px ${theme.background_color}50`,
                      }}
                    >
                      {show_images && item.image_url ? (
                        <div className="relative h-20 overflow-hidden">
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            style={{ filter: "brightness(0.85) saturate(1.1)" }}
                          />
                          <div
                            className="absolute inset-0"
                            style={{
                              background: `linear-gradient(0deg, ${theme.background_color} 5%, ${theme.background_color}80 30%, transparent 55%)`,
                            }}
                          />
                          {/* Dietary badges over image */}
                          <div className="absolute top-1.5 left-1.5 flex gap-1">
                            {item.is_vegetarian && (
                              <div
                                className="p-0.5 rounded-full"
                                style={{
                                  backgroundColor: `${theme.background_color}CC`,
                                  backdropFilter: "blur(6px)",
                                }}
                              >
                                <Leaf className="w-2.5 h-2.5" style={{ color: "#4ade80" }} />
                              </div>
                            )}
                            {item.is_spicy && (
                              <div
                                className="p-0.5 rounded-full"
                                style={{
                                  backgroundColor: `${theme.background_color}CC`,
                                  backdropFilter: "blur(6px)",
                                }}
                              >
                                <Flame className="w-2.5 h-2.5" style={{ color: "#f87171" }} />
                              </div>
                            )}
                          </div>
                        </div>
                      ) : null}

                      <div className="p-2.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <h3
                            className="font-semibold leading-tight"
                            style={{ color: theme.text_color, fontSize: "0.82rem" }}
                          >
                            {item.name}
                          </h3>
                          {!(show_images && item.image_url) && (
                            <>
                              {item.is_vegetarian && (
                                <Leaf className="w-2.5 h-2.5 shrink-0" style={{ color: "#4ade80" }} />
                              )}
                              {item.is_spicy && (
                                <Flame className="w-2.5 h-2.5 shrink-0" style={{ color: "#f87171" }} />
                              )}
                            </>
                          )}
                        </div>
                        {show_descriptions && item.description && (
                          <p
                            className="mt-1 opacity-40 line-clamp-1 leading-snug"
                            style={{ color: theme.text_color, fontSize: "0.62rem" }}
                          >
                            {item.description}
                          </p>
                        )}
                        {show_prices && (
                          <p
                            className="font-bold mt-1.5 tabular-nums"
                            style={{
                              color: theme.price_color,
                              fontSize: "0.9rem",
                              textShadow: `0 0 18px ${theme.price_color}20`,
                            }}
                          >
                            ${item.price.toFixed(2)}
                          </p>
                        )}
                      </div>

                      {/* Subtle bottom accent */}
                      <div
                        className="h-px"
                        style={{
                          background: `linear-gradient(90deg, transparent, ${theme.accent_color}25, transparent)`,
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
