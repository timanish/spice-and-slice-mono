import { TvMenuBoardConfig } from "@/types/tv-menu";
import { MenuItem } from "@/hooks/products/types";

interface Props {
  itemsByCategory: Map<string, { categoryName: string; items: MenuItem[] }>;
  config: TvMenuBoardConfig;
}

export function ClassicLayout({ itemsByCategory, config }: Props) {
  const { theme, columns, show_descriptions, show_prices, show_images } = config;
  const cats = Array.from(itemsByCategory.entries());

  return (
    <div
      className="p-8 gap-8"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
      }}
    >
      {cats.map(([catId, { categoryName, items }]) => (
        <div key={catId} className="mb-6">
          {/* Category Header */}
          <h2
            className="text-2xl font-serif font-bold mb-4 pb-2"
            style={{
              color: theme.category_header_color,
              borderBottom: `2px solid ${theme.category_header_color}44`,
            }}
          >
            {categoryName}
          </h2>

          {/* Items */}
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex gap-3">
                {show_images && item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-12 h-12 rounded object-cover shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1">
                    <span
                      className="font-semibold text-lg whitespace-nowrap"
                      style={{ color: theme.text_color }}
                    >
                      {item.name}
                    </span>
                    {show_prices && (
                      <>
                        <span
                          className="flex-1 border-b border-dotted mx-1 opacity-30"
                          style={{ borderColor: theme.text_color }}
                        />
                        <span
                          className="font-bold text-lg whitespace-nowrap"
                          style={{ color: theme.price_color }}
                        >
                          ${item.price.toFixed(2)}
                        </span>
                      </>
                    )}
                  </div>
                  {show_descriptions && item.description && (
                    <p
                      className="text-sm mt-0.5 opacity-60 line-clamp-1"
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
}
