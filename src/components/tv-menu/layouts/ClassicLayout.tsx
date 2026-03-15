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
      className="px-6 py-4 gap-6"
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
            {/* Category Header */}
            <div className="flex items-center gap-3 mb-3">
              <div
                className="flex-1 h-px"
                style={{
                  background: `linear-gradient(90deg, transparent, ${theme.category_header_color}60)`,
                }}
              />
              <h2
                className="text-xl font-serif font-bold tracking-wide px-2 whitespace-nowrap"
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
              <div key={section.subCategory ?? si} className="mb-3">
                {section.subCategory && (
                  <div className="flex items-center gap-2 mb-1.5 mt-2">
                    <div
                      className="w-3 h-px"
                      style={{ backgroundColor: `${theme.accent_color}80` }}
                    />
                    <h3
                      className="font-semibold tracking-wider uppercase"
                      style={{
                        color: theme.accent_color,
                        fontSize: "0.75rem",
                        letterSpacing: "0.1em",
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

                <div className="space-y-1">
                  {section.items.map((item) => (
                    <div key={item.id} className="flex gap-2 px-1 py-0.5">
                      {show_images && item.image_url && (
                        <div
                          className="w-8 h-8 rounded overflow-hidden shrink-0"
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
                            className="font-semibold tracking-wide"
                            style={{ color: theme.text_color, fontSize: "0.95rem" }}
                          >
                            {item.name}
                          </span>
                          {show_prices && (
                            <>
                              <span
                                className="flex-1 mx-1 border-b border-dotted opacity-20"
                                style={{ borderColor: theme.text_color }}
                              />
                              <span
                                className="font-bold tabular-nums whitespace-nowrap"
                                style={{
                                  color: theme.price_color,
                                  fontSize: "0.95rem",
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
                            className="mt-0 opacity-50 line-clamp-1 italic"
                            style={{ color: theme.text_color, fontSize: "0.7rem" }}
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
