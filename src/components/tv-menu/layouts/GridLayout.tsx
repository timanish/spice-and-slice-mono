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
    <div className="px-5 py-4 space-y-5">
      {cats.map(([catId, { categoryName, items }]) => {
        const sections = useSubcategories
          ? groupBySubcategory(items)
          : [{ subCategory: null, items }];

        return (
          <div key={catId}>
            <div className="flex items-center gap-3 mb-3">
              <div
                className="flex-1 h-px"
                style={{
                  background: `linear-gradient(90deg, transparent, ${theme.category_header_color}50)`,
                }}
              />
              <h2
                className="text-lg font-serif font-bold tracking-wide px-2"
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
              <div key={section.subCategory ?? si} className="mb-3">
                {section.subCategory && (
                  <h3
                    className="font-semibold mb-2 px-1 tracking-widest uppercase text-center"
                    style={{
                      color: theme.accent_color,
                      fontSize: "0.65rem",
                      letterSpacing: "0.15em",
                    }}
                  >
                    {section.subCategory}
                  </h3>
                )}

                <div
                  className="gap-2"
                  style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                  }}
                >
                  {section.items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg overflow-hidden text-center"
                      style={{
                        backgroundColor: `${theme.text_color}06`,
                        border: `1px solid ${theme.text_color}10`,
                      }}
                    >
                      {show_images && item.image_url && (
                        <div className="relative h-16 overflow-hidden">
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
                      <div className="p-2">
                        <h3
                          className="font-semibold leading-tight"
                          style={{ color: theme.text_color, fontSize: "0.8rem" }}
                        >
                          {item.name}
                        </h3>
                        {show_descriptions && item.description && (
                          <p
                            className="mt-0.5 opacity-40 line-clamp-1"
                            style={{ color: theme.text_color, fontSize: "0.6rem" }}
                          >
                            {item.description}
                          </p>
                        )}
                        {show_prices && (
                          <p
                            className="font-bold mt-1 tabular-nums"
                            style={{
                              color: theme.price_color,
                              fontSize: "0.85rem",
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
