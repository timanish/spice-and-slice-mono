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
    <div className="p-6 space-y-8">
      {cats.map(([catId, { categoryName, items }]) => {
        const sections = useSubcategories
          ? groupBySubcategory(items)
          : [{ subCategory: null, items }];

        return (
          <div key={catId}>
            {/* Category Header */}
            <h2
              className="text-xl font-serif font-bold mb-3 px-2"
              style={{ color: theme.category_header_color }}
            >
              {categoryName}
            </h2>

            {sections.map((section, si) => (
              <div key={section.subCategory ?? si} className="mb-4">
                {section.subCategory && (
                  <h3
                    className="text-base font-semibold mb-2 px-2 opacity-80"
                    style={{ color: theme.accent_color }}
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
                      className="rounded-lg p-3 text-center"
                      style={{
                        backgroundColor: `${theme.text_color}08`,
                        border: `1px solid ${theme.text_color}10`,
                      }}
                    >
                      {show_images && item.image_url && (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-14 h-14 rounded-lg object-cover mx-auto mb-2"
                        />
                      )}
                      <h3
                        className="font-semibold text-sm leading-tight"
                        style={{ color: theme.text_color }}
                      >
                        {item.name}
                      </h3>
                      {show_descriptions && item.description && (
                        <p
                          className="text-xs mt-1 opacity-50 line-clamp-1"
                          style={{ color: theme.text_color }}
                        >
                          {item.description}
                        </p>
                      )}
                      {show_prices && (
                        <p
                          className="font-bold text-sm mt-1"
                          style={{ color: theme.price_color }}
                        >
                          ${item.price.toFixed(2)}
                        </p>
                      )}
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
