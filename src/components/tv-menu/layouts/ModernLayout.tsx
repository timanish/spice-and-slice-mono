import { TvMenuBoardConfig } from "@/types/tv-menu";
import { MenuItem } from "@/hooks/products/types";

interface Props {
  itemsByCategory: Map<string, { categoryName: string; items: MenuItem[] }>;
  config: TvMenuBoardConfig;
}

export function ModernLayout({ itemsByCategory, config }: Props) {
  const { theme, columns, show_descriptions, show_prices, show_images } = config;
  const cats = Array.from(itemsByCategory.entries());

  return (
    <div className="p-8 space-y-10">
      {cats.map(([catId, { categoryName, items }]) => (
        <div key={catId}>
          {/* Category Header */}
          <h2
            className="text-2xl font-serif font-bold mb-5"
            style={{ color: theme.category_header_color }}
          >
            {categoryName}
          </h2>

          {/* Item Cards */}
          <div
            className="gap-4"
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${columns}, 1fr)`,
            }}
          >
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-xl p-4 flex gap-4"
                style={{
                  backgroundColor: `${theme.text_color}08`,
                  border: `1px solid ${theme.text_color}15`,
                }}
              >
                {show_images && item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-20 h-20 rounded-lg object-cover shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3
                    className="font-semibold text-lg"
                    style={{ color: theme.text_color }}
                  >
                    {item.name}
                  </h3>
                  {show_descriptions && item.description && (
                    <p
                      className="text-sm mt-1 opacity-60 line-clamp-2"
                      style={{ color: theme.text_color }}
                    >
                      {item.description}
                    </p>
                  )}
                  {show_prices && (
                    <p
                      className="font-bold text-lg mt-2"
                      style={{ color: theme.price_color }}
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
}
