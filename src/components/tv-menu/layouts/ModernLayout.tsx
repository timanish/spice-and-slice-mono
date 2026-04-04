import { TvMenuBoardConfig } from "@/types/tv-menu";
import { MenuItem } from "@/hooks/products/types";
import { groupBySubcategory } from "./groupBySubcategory";
import { Flame, Leaf } from "lucide-react";

interface Props {
  itemsByCategory: Map<string, { categoryName: string; items: MenuItem[] }>;
  config: TvMenuBoardConfig;
}

function PriceDisplay({ price, color, bg }: { price: number; color: string; bg: string }) {
  const dollars = Math.floor(price);
  const cents = String(Math.round((price % 1) * 100)).padStart(2, "0");
  return (
    <div
      className="shrink-0 tabular-nums leading-none px-3 py-1.5 rounded-lg"
      style={{
        color,
        backgroundColor: bg,
        border: `1px solid ${color}25`,
        boxShadow: `0 2px 12px ${color}15`,
      }}
    >
      <span style={{ fontSize: "0.6em", opacity: 0.55, fontWeight: 500, marginRight: "1px" }}>$</span>
      <span style={{ fontSize: "1.15em", fontWeight: 700 }}>{dollars}</span>
      <span style={{ fontSize: "0.55em", opacity: 0.8, fontWeight: 600 }}>.{cents}</span>
    </div>
  );
}

export function ModernLayout({ itemsByCategory, config }: Props) {
  const { theme, columns, show_descriptions, show_prices, show_images } = config;
  const useSubcategories = config.group_by_subcategory ?? false;
  const cats = Array.from(itemsByCategory.entries());

  return (
    <div className="px-8 py-5 space-y-7">
      {cats.map(([catId, { categoryName, items }]) => {
        const sections = useSubcategories
          ? groupBySubcategory(items)
          : [{ subCategory: null, items }];

        return (
          <div key={catId}>
            {/* Category Header — dramatic full-width banner */}
            <div
              className="relative overflow-hidden rounded-xl mb-5"
              style={{
                background: `linear-gradient(105deg, ${theme.category_header_color}20 0%, ${theme.category_header_color}08 50%, transparent 100%)`,
                border: `1px solid ${theme.category_header_color}22`,
                boxShadow: `0 0 40px ${theme.category_header_color}08, inset 0 1px 0 ${theme.category_header_color}15`,
              }}
            >
              {/* Left accent bar */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                style={{
                  background: `linear-gradient(180deg, ${theme.category_header_color}, ${theme.category_header_color}50)`,
                  boxShadow: `2px 0 12px ${theme.category_header_color}30`,
                }}
              />
              <div className="pl-6 pr-5 py-3.5 flex items-center justify-between gap-4">
                <h2
                  className="font-serif font-bold tracking-wide"
                  style={{
                    color: theme.category_header_color,
                    fontSize: "1.4rem",
                    textShadow: `0 0 35px ${theme.category_header_color}40`,
                  }}
                >
                  {categoryName}
                </h2>
                <div
                  className="flex-1 h-px mx-4"
                  style={{
                    background: `linear-gradient(90deg, ${theme.category_header_color}30, transparent)`,
                  }}
                />
                <span
                  className="shrink-0 tracking-widest uppercase font-semibold"
                  style={{
                    fontSize: "0.55rem",
                    color: `${theme.category_header_color}55`,
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
                  <div className="flex items-center gap-2.5 mb-3 pl-1">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: theme.accent_color,
                        boxShadow: `0 0 8px ${theme.accent_color}50`,
                      }}
                    />
                    <h3
                      className="font-semibold tracking-widest uppercase"
                      style={{
                        color: theme.accent_color,
                        fontSize: "0.62rem",
                        opacity: 0.9,
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
                      className="rounded-2xl overflow-hidden relative flex flex-col"
                      style={{
                        backgroundColor: `${theme.text_color}06`,
                        border: `1px solid ${theme.text_color}0E`,
                        boxShadow: `
                          0 2px 4px rgba(0,0,0,0.2),
                          0 8px 24px rgba(0,0,0,0.25),
                          inset 0 1px 0 rgba(255,255,255,0.06)
                        `,
                      }}
                    >
                      {show_images && item.image_url ? (
                        <div className="relative h-32 overflow-hidden">
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            style={{ filter: "brightness(0.88) saturate(1.15)" }}
                          />
                          {/* Multi-stop gradient for smooth text readability */}
                          <div
                            className="absolute inset-0"
                            style={{
                              background: `linear-gradient(0deg, ${theme.background_color} 0%, ${theme.background_color}CC 18%, ${theme.background_color}55 42%, transparent 65%)`,
                            }}
                          />
                          {/* Price badge — strong contrast on image */}
                          {show_prices && (
                            <div
                              className="absolute top-2.5 right-2.5 tabular-nums leading-none px-2.5 py-1.5 rounded-xl font-bold"
                              style={{
                                backgroundColor: `${theme.background_color}E0`,
                                color: theme.price_color,
                                backdropFilter: "blur(12px)",
                                border: `1px solid ${theme.price_color}30`,
                                boxShadow: `0 2px 12px rgba(0,0,0,0.5), 0 0 20px ${theme.price_color}15`,
                                fontSize: "0.88rem",
                              }}
                            >
                              <span style={{ fontSize: "0.7em", opacity: 0.55, marginRight: "1px" }}>$</span>
                              {Math.floor(item.price)}
                              <span style={{ fontSize: "0.65em", opacity: 0.8 }}>
                                .{String(Math.round((item.price % 1) * 100)).padStart(2, "0")}
                              </span>
                            </div>
                          )}
                          {/* Dietary badges — frosted pill style */}
                          <div className="absolute top-2.5 left-2.5 flex gap-1.5">
                            {item.is_vegetarian && (
                              <span
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full font-semibold"
                                style={{
                                  fontSize: "0.55rem",
                                  letterSpacing: "0.06em",
                                  color: "#4ade80",
                                  backgroundColor: "rgba(0,0,0,0.65)",
                                  backdropFilter: "blur(8px)",
                                  border: "1px solid rgba(74,222,128,0.25)",
                                }}
                              >
                                <Leaf className="w-2.5 h-2.5" />
                                VEG
                              </span>
                            )}
                            {item.is_spicy && (
                              <span
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full font-semibold"
                                style={{
                                  fontSize: "0.55rem",
                                  letterSpacing: "0.06em",
                                  color: "#f87171",
                                  backgroundColor: "rgba(0,0,0,0.65)",
                                  backdropFilter: "blur(8px)",
                                  border: "1px solid rgba(248,113,113,0.25)",
                                }}
                              >
                                <Flame className="w-2.5 h-2.5" />
                                SPICY
                              </span>
                            )}
                          </div>
                        </div>
                      ) : null}

                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center flex-wrap gap-1.5">
                              <h3
                                className="font-bold leading-snug"
                                style={{ color: theme.text_color, fontSize: "0.95rem" }}
                              >
                                {item.name}
                              </h3>
                              {/* Show dietary only when no image (image shows them separately) */}
                              {!(show_images && item.image_url) && (
                                <>
                                  {item.is_vegetarian && (
                                    <span
                                      className="inline-flex items-center gap-0.5 px-1.5 py-px rounded-full font-semibold"
                                      style={{
                                        fontSize: "0.52rem",
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
                                        fontSize: "0.52rem",
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
                                </>
                              )}
                            </div>
                            {show_descriptions && item.description && (
                              <p
                                className="mt-1.5 line-clamp-2 italic leading-relaxed"
                                style={{ color: `${theme.text_color}45`, fontSize: "0.7rem" }}
                              >
                                {item.description}
                              </p>
                            )}
                          </div>
                          {show_prices && !(show_images && item.image_url) && (
                            <PriceDisplay
                              price={item.price}
                              color={theme.price_color}
                              bg={`${theme.price_color}12`}
                            />
                          )}
                        </div>
                      </div>

                      {/* Bottom gradient accent */}
                      <div
                        className="h-px shrink-0"
                        style={{
                          background: `linear-gradient(90deg, ${theme.accent_color}25, ${theme.category_header_color}15, transparent)`,
                        }}
                      />
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
