import { TvMenuBoardConfig } from "@/types/tv-menu";
import { MenuItem } from "@/hooks/products/types";
import { groupBySubcategory } from "./groupBySubcategory";

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
    <div className="px-8 py-6 space-y-8">
      {cats.map(([catId, { categoryName, items }]) => {
        const sections = useSubcategories
          ? groupBySubcategory(items)
          : [{ subCategory: null, items }];

        return (
          <div key={catId}>
            {/* Category Header — centered with ornaments */}
            <div className="flex items-center gap-4 mb-5">
              <div
                className="flex-1 h-px"
                style={{
                  background: `linear-gradient(90deg, transparent, ${theme.category_header_color}50)`,
                }}
              />
              <h2
                className="text-2xl font-serif font-bold tracking-wide px-2"
                style={{
                  color: theme.category_header_color,
                  textShadow: `0 0 25px ${theme.category_header_color}20`,
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
              <div key={section.subCategory ?? si} className="mb-5">
                {section.subCategory && (
                  <h3
                    className="text-sm font-semibold mb-3 px-2 tracking-widest uppercase text-center"
                    style={{
                      color: theme.accent_color,
                      letterSpacing: "0.15em",
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
                      className="rounded-xl overflow-hidden text-center"
                      style={{
                        backgroundColor: `${theme.text_color}06`,
                        border: `1px solid ${theme.text_color}10`,
                      }}
                    >
                      {show_images && item.image_url && (
                        <div className="relative h-20 overflow-hidden">
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                          <div
                            className="absolute inset-0"
                            style={{
                              background: `linear-gradient(0deg, ${theme.background_color}CC 0%, transparent 50%)`,
                            }}
                          />
                        </div>
                      )}
                      <div className="p-3">
                        <h3
                          className="font-semibold text-sm leading-tight"
                          style={{ color: theme.text_color }}
                        >
                          {item.name}
                        </h3>
                        {show_descriptions && item.description && (
                          <p
                            className="text-xs mt-1 opacity-40 line-clamp-1"
                            style={{ color: theme.text_color }}
                          >
                            {item.description}
                          </p>
                        )}
                        {show_prices && (
                          <p
                            className="font-bold text-base mt-1.5 tabular-nums"
                            style={{
                              color: theme.price_color,
                              textShadow: `0 0 12px ${theme.price_color}15`,
                            }}
                          >
                            ${item.price.toFixed(2)}
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
