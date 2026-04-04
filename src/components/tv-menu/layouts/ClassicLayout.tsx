import { TvMenuBoardConfig } from "@/types/tv-menu";
import { MenuItem } from "@/hooks/products/types";
import { groupBySubcategory } from "./groupBySubcategory";
import { Flame, Leaf } from "lucide-react";

interface Props {
  itemsByCategory: Map<string, { categoryName: string; items: MenuItem[] }>;
  config: TvMenuBoardConfig;
}

export function ClassicLayout({ itemsByCategory, config }: Props) {
  const { theme, columns, show_descriptions, show_prices, show_images } = config;
  const useSubcategories = config.group_by_subcategory ?? false;
  const cats = Array.from(itemsByCategory.entries());

  return (
    <div
      className="px-8 py-6 gap-8"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
      }}
    >
      {cats.map(([catId, { categoryName, items }]) => {
        const sections = useSubcategories
          ? groupBySubcategory(items)
          : [{ subCategory: null, items }];

        return (
          <div key={catId}>
            {/* Category Header — elegant centered with ornaments */}
            <div className="flex items-center gap-4 mb-5">
              <div
                className="flex-1 h-px"
                style={{
                  background: `linear-gradient(90deg, transparent, ${theme.category_header_color}60)`,
                }}
              />
              <div className="flex flex-col items-center gap-1">
                <h2
                  className="text-2xl font-serif font-bold tracking-wider px-4 whitespace-nowrap"
                  style={{
                    color: theme.category_header_color,
                    textShadow: `0 0 40px ${theme.category_header_color}30, 0 0 80px ${theme.category_header_color}15`,
                  }}
                >
                  {categoryName}
                </h2>
                {/* Small ornament under category name */}
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-6 h-px"
                    style={{ backgroundColor: `${theme.category_header_color}40` }}
                  />
                  <div
                    className="w-1.5 h-1.5 rotate-45"
                    style={{ backgroundColor: `${theme.category_header_color}50` }}
                  />
                  <div
                    className="w-6 h-px"
                    style={{ backgroundColor: `${theme.category_header_color}40` }}
                  />
                </div>
              </div>
              <div
                className="flex-1 h-px"
                style={{
                  background: `linear-gradient(90deg, ${theme.category_header_color}60, transparent)`,
                }}
              />
            </div>

            {sections.map((section, si) => (
              <div key={section.subCategory ?? si} className="mb-5">
                {section.subCategory && (
                  <div className="flex items-center gap-2.5 mb-3 mt-1">
                    <div
                      className="w-5 h-px"
                      style={{ backgroundColor: `${theme.accent_color}50` }}
                    />
                    <h3
                      className="font-semibold tracking-[0.15em] uppercase"
                      style={{
                        color: theme.accent_color,
                        fontSize: "0.7rem",
                        textShadow: `0 0 20px ${theme.accent_color}20`,
                      }}
                    >
                      {section.subCategory}
                    </h3>
                    <div
                      className="flex-1 h-px"
                      style={{
                        background: `linear-gradient(90deg, ${theme.accent_color}30, transparent 80%)`,
                      }}
                    />
                  </div>
                )}

                <div className="space-y-1">
                  {section.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-3 px-2 py-1.5 rounded-lg group"
                      style={{
                        transition: "background-color 0.3s ease",
                      }}
                    >
                      {show_images && item.image_url && (
                        <div
                          className="w-10 h-10 rounded-lg overflow-hidden shrink-0"
                          style={{
                            border: `1px solid ${theme.accent_color}25`,
                            boxShadow: `0 2px 8px ${theme.background_color}80`,
                          }}
                        >
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-1">
                          <span className="flex items-center gap-1.5">
                            <span
                              className="font-semibold tracking-wide"
                              style={{ color: theme.text_color, fontSize: "1rem" }}
                            >
                              {item.name}
                            </span>
                            {/* Dietary icons */}
                            {item.is_vegetarian && (
                              <Leaf
                                className="w-3 h-3 shrink-0"
                                style={{ color: "#4ade80" }}
                              />
                            )}
                            {item.is_spicy && (
                              <Flame
                                className="w-3 h-3 shrink-0"
                                style={{ color: "#f87171" }}
                              />
                            )}
                          </span>
                          {show_prices && (
                            <>
                              <span
                                className="flex-1 mx-2 border-b border-dotted opacity-15"
                                style={{ borderColor: theme.text_color }}
                              />
                              <span
                                className="font-bold tabular-nums whitespace-nowrap"
                                style={{
                                  color: theme.price_color,
                                  fontSize: "1rem",
                                  textShadow: `0 0 25px ${theme.price_color}25`,
                                }}
                              >
                                ${item.price.toFixed(2)}
                              </span>
                            </>
                          )}
                        </div>
                        {show_descriptions && item.description && (
                          <p
                            className="mt-0.5 opacity-45 line-clamp-1 italic leading-snug"
                            style={{ color: theme.text_color, fontSize: "0.75rem" }}
                          >
                            {item.description}
                          </p>
                        )}
                      </div>
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
