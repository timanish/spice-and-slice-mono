import { TvMenuBoardConfig } from "@/types/tv-menu";
import { MenuItem } from "@/hooks/products/types";
import { groupBySubcategory } from "./groupBySubcategory";
import { Flame, Leaf } from "lucide-react";

interface Props {
  itemsByCategory: Map<string, { categoryName: string; items: MenuItem[] }>;
  config: TvMenuBoardConfig;
}

function PriceDisplay({ price, color }: { price: number; color: string }) {
  const dollars = Math.floor(price);
  const cents = String(Math.round((price % 1) * 100)).padStart(2, "0");
  return (
    <div className="shrink-0 tabular-nums leading-none text-right" style={{ color }}>
      <span
        style={{
          fontSize: "0.6em",
          opacity: 0.55,
          verticalAlign: "super",
          marginRight: "1px",
          fontWeight: 500,
        }}
      >
        $
      </span>
      <span style={{ fontSize: "1.25em", fontWeight: 700 }}>{dollars}</span>
      <span
        style={{
          fontSize: "0.6em",
          opacity: 0.75,
          verticalAlign: "super",
          fontWeight: 600,
        }}
      >
        {cents}
      </span>
    </div>
  );
}

export function ClassicLayout({ itemsByCategory, config }: Props) {
  const { theme, columns, show_descriptions, show_prices, show_images } = config;
  const useSubcategories = config.group_by_subcategory ?? false;
  const cats = Array.from(itemsByCategory.entries());

  return (
    <div
      className="px-8 py-5"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: "1.5rem 2.5rem",
        alignContent: "start",
      }}
    >
      {cats.map(([catId, { categoryName, items }]) => {
        const sections = useSubcategories
          ? groupBySubcategory(items)
          : [{ subCategory: null, items }];

        return (
          <div key={catId}>
            {/* Category Header — premium panel with left-border accent + warm fill */}
            <div
              className="mb-4 rounded-xl overflow-hidden"
              style={{
                background: `linear-gradient(105deg, ${theme.category_header_color}16 0%, ${theme.category_header_color}06 60%, transparent 100%)`,
                borderTop: `1px solid ${theme.category_header_color}20`,
                borderRight: `1px solid ${theme.category_header_color}10`,
                borderBottom: `1px solid ${theme.category_header_color}12`,
                borderLeft: `4px solid ${theme.category_header_color}`,
                boxShadow: `inset 0 1px 0 ${theme.category_header_color}08`,
              }}
            >
              <div className="px-4 py-3 flex items-center justify-between gap-4">
                <h2
                  className="font-serif font-bold tracking-wide"
                  style={{
                    color: theme.category_header_color,
                    fontSize: "1.35rem",
                    lineHeight: 1.2,
                    textShadow: `0 0 40px ${theme.category_header_color}35`,
                  }}
                >
                  {categoryName}
                </h2>
                <span
                  className="shrink-0 tracking-widest uppercase font-medium rounded-full px-2 py-0.5"
                  style={{
                    fontSize: "0.55rem",
                    color: `${theme.category_header_color}70`,
                    backgroundColor: `${theme.category_header_color}10`,
                    border: `1px solid ${theme.category_header_color}18`,
                    letterSpacing: "0.15em",
                  }}
                >
                  {items.length} items
                </span>
              </div>
            </div>

            {sections.map((section, si) => (
              <div key={section.subCategory ?? si} className="mb-5">
                {section.subCategory && (
                  <div className="flex items-center gap-2 mb-2.5 px-1">
                    <div
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: `${theme.accent_color}70` }}
                    />
                    <h3
                      className="font-semibold tracking-widest uppercase"
                      style={{
                        color: theme.accent_color,
                        fontSize: "0.6rem",
                        opacity: 0.85,
                      }}
                    >
                      {section.subCategory}
                    </h3>
                    <div
                      className="flex-1 h-px"
                      style={{
                        background: `linear-gradient(90deg, ${theme.accent_color}25, transparent)`,
                      }}
                    />
                  </div>
                )}

                <div className="space-y-px">
                  {section.items.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                      style={{
                        backgroundColor:
                          index % 2 === 0
                            ? `${theme.text_color}05`
                            : "transparent",
                      }}
                    >
                      {show_images && item.image_url && (
                        <div
                          className="w-11 h-11 rounded-lg overflow-hidden shrink-0"
                          style={{
                            border: `1px solid ${theme.accent_color}18`,
                            boxShadow: `0 2px 10px rgba(0,0,0,0.35)`,
                          }}
                        >
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            style={{ filter: "brightness(0.9) saturate(1.1)" }}
                          />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className="font-semibold leading-snug"
                            style={{
                              color: theme.text_color,
                              fontSize: "0.95rem",
                            }}
                          >
                            {item.name}
                          </span>
                          {item.is_vegetarian && (
                            <span
                              className="inline-flex items-center gap-0.5 px-1.5 py-px rounded-full font-semibold"
                              style={{
                                fontSize: "0.55rem",
                                letterSpacing: "0.08em",
                                color: "#4ade80",
                                backgroundColor: "rgba(74,222,128,0.1)",
                                border: "1px solid rgba(74,222,128,0.22)",
                              }}
                            >
                              <Leaf className="w-2.5 h-2.5" />
                              VEG
                            </span>
                          )}
                          {item.is_spicy && (
                            <span
                              className="inline-flex items-center gap-0.5 px-1.5 py-px rounded-full font-semibold"
                              style={{
                                fontSize: "0.55rem",
                                letterSpacing: "0.08em",
                                color: "#f87171",
                                backgroundColor: "rgba(248,113,113,0.1)",
                                border: "1px solid rgba(248,113,113,0.22)",
                              }}
                            >
                              <Flame className="w-2.5 h-2.5" />
                              SPICY
                            </span>
                          )}
                        </div>
                        {show_descriptions && item.description && (
                          <p
                            className="mt-0.5 line-clamp-1 italic leading-snug"
                            style={{
                              color: `${theme.text_color}45`,
                              fontSize: "0.7rem",
                            }}
                          >
                            {item.description}
                          </p>
                        )}
                      </div>

                      {show_prices && (
                        <PriceDisplay price={item.price} color={theme.price_color} />
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
