import { TvMenuBoardConfig } from "@/types/tv-menu";
import { MenuItem } from "@/hooks/products/types";
import { groupBySubcategory } from "./groupBySubcategory";

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
      className="px-10 py-6 gap-10"
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
          <div key={catId} className="mb-4">
            {/* Category Header — ornamental */}
            <div className="flex items-center gap-4 mb-5">
              <div
                className="flex-1 h-px"
                style={{
                  background: `linear-gradient(90deg, transparent, ${theme.category_header_color}60)`,
                }}
              />
              <h2
                className="text-3xl font-serif font-bold tracking-wide px-3 whitespace-nowrap"
                style={{
                  color: theme.category_header_color,
                  textShadow: `0 0 30px ${theme.category_header_color}25`,
                }}
              >
                {categoryName}
              </h2>
              <div
                className="flex-1 h-px"
                style={{
                  background: `linear-gradient(90deg, ${theme.category_header_color}60, transparent)`,
                }}
              />
            </div>

            {sections.map((section, si) => (
              <div key={section.subCategory ?? si} className="mb-5">
                {/* Sub-category Header */}
                {section.subCategory && (
                  <div className="flex items-center gap-3 mb-3 mt-4">
                    <div
                      className="w-3 h-px"
                      style={{ backgroundColor: `${theme.accent_color}80` }}
                    />
                    <h3
                      className="text-xl font-serif font-semibold tracking-wide uppercase"
                      style={{
                        color: theme.accent_color,
                        letterSpacing: "0.1em",
                        fontSize: "0.95em",
                      }}
                    >
                      {section.subCategory}
                    </h3>
                    <div
                      className="flex-1 h-px"
                      style={{ backgroundColor: `${theme.accent_color}30` }}
                    />
                  </div>
                )}

                {/* Items */}
                <div className="space-y-2.5">
                  {section.items.map((item) => (
                    <div
                      key={item.id}
                      className="group flex gap-3 px-2 py-1.5 rounded-lg transition-colors"
                      style={{
                        backgroundColor: "transparent",
                      }}
                    >
                      {show_images && item.image_url && (
                        <div
                          className="w-12 h-12 rounded-lg overflow-hidden shrink-0"
                          style={{ border: `1px solid ${theme.accent_color}30` }}
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
                          <span
                            className="font-semibold text-lg tracking-wide"
                            style={{ color: theme.text_color }}
                          >
                            {item.name}
                          </span>
                          {show_prices && (
                            <>
                              <span
                                className="flex-1 mx-2 border-b border-dotted opacity-20"
                                style={{ borderColor: theme.text_color }}
                              />
                              <span
                                className="font-bold text-xl tabular-nums whitespace-nowrap"
                                style={{
                                  color: theme.price_color,
                                  textShadow: `0 0 20px ${theme.price_color}20`,
                                }}
                              >
                                ${item.price.toFixed(2)}
                              </span>
                            </>
                          )}
                        </div>
                        {show_descriptions && item.description && (
                          <p
                            className="text-sm mt-0.5 opacity-50 line-clamp-1 italic"
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
