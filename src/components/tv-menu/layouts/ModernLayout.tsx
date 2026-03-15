import { TvMenuBoardConfig } from "@/types/tv-menu";
import { MenuItem } from "@/hooks/products/types";
import { groupBySubcategory } from "./groupBySubcategory";

interface Props {
  itemsByCategory: Map<string, { categoryName: string; items: MenuItem[] }>;
  config: TvMenuBoardConfig;
}

export function ModernLayout({ itemsByCategory, config }: Props) {
  const { theme, columns, show_descriptions, show_prices, show_images } = config;
  const useSubcategories = config.group_by_subcategory ?? false;
  const cats = Array.from(itemsByCategory.entries());

  return (
    <div className="px-10 py-6 space-y-10">
      {cats.map(([catId, { categoryName, items }]) => {
        const sections = useSubcategories
          ? groupBySubcategory(items)
          : [{ subCategory: null, items }];

        return (
          <div key={catId}>
            {/* Category Header — bold with accent bar */}
            <div className="mb-6">
              <div className="flex items-center gap-4">
                <div
                  className="w-1.5 h-10 rounded-full"
                  style={{
                    background: `linear-gradient(180deg, ${theme.category_header_color}, ${theme.accent_color})`,
                  }}
                />
                <h2
                  className="text-3xl font-serif font-bold tracking-wide"
                  style={{
                    color: theme.category_header_color,
                    textShadow: `0 0 30px ${theme.category_header_color}20`,
                  }}
                >
                  {categoryName}
                </h2>
              </div>
              <div
                className="mt-3 h-px ml-6"
                style={{
                  background: `linear-gradient(90deg, ${theme.category_header_color}40, transparent 80%)`,
                }}
              />
            </div>

            {sections.map((section, si) => (
              <div key={section.subCategory ?? si} className="mb-6">
                {section.subCategory && (
                  <div className="flex items-center gap-3 mb-4 ml-6">
                    <div
                      className="w-6 h-0.5 rounded-full"
                      style={{ backgroundColor: theme.accent_color }}
                    />
                    <h3
                      className="text-lg font-semibold tracking-wider uppercase"
                      style={{
                        color: theme.accent_color,
                        fontSize: "0.85em",
                        letterSpacing: "0.15em",
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
                        backgroundColor: `${theme.text_color}06`,
                        border: `1px solid ${theme.text_color}12`,
                        boxShadow: `0 4px 20px ${theme.background_color}40`,
                      }}
                    >
                      {/* Image with gradient overlay */}
                      {show_images && item.image_url && (
                        <div className="relative h-36 overflow-hidden">
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                          <div
                            className="absolute inset-0"
                            style={{
                              background: `linear-gradient(0deg, ${theme.background_color} 0%, transparent 60%)`,
                            }}
                          />
                          {/* Price badge on image */}
                          {show_prices && (
                            <div
                              className="absolute top-3 right-3 px-3 py-1 rounded-full text-sm font-bold"
                              style={{
                                backgroundColor: `${theme.price_color}20`,
                                color: theme.price_color,
                                backdropFilter: "blur(8px)",
                                border: `1px solid ${theme.price_color}30`,
                              }}
                            >
                              ${item.price.toFixed(2)}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <h3
                            className="font-bold text-lg leading-tight"
                            style={{ color: theme.text_color }}
                          >
                            {item.name}
                          </h3>
                          {/* Price when no image */}
                          {show_prices && !(show_images && item.image_url) && (
                            <span
                              className="font-bold text-xl tabular-nums shrink-0"
                              style={{
                                color: theme.price_color,
                                textShadow: `0 0 15px ${theme.price_color}20`,
                              }}
                            >
                              ${item.price.toFixed(2)}
                            </span>
                          )}
                        </div>
                        {show_descriptions && item.description && (
                          <p
                            className="text-sm mt-2 opacity-50 line-clamp-2 leading-relaxed"
                            style={{ color: theme.text_color }}
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
