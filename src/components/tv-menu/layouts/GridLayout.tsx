import { TvMenuBoardConfig } from "@/types/tv-menu";
import { MenuItem } from "@/hooks/products/types";
import { groupBySubcategory } from "./groupBySubcategory";
import { Flame, Leaf } from "lucide-react";

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
    <div className="px-6 py-5 space-y-6">
      {cats.map(([catId, { categoryName, items }]) => {
        const sections = useSubcategories
          ? groupBySubcategory(items)
          : [{ subCategory: null, items }];

        return (
          <div key={catId}>
            {/* Category Header — centered with strong diamond ornament */}
            <div className="relative flex items-center gap-3 mb-4 justify-center">
              {/* Left decorative element */}
              <div className="flex items-center gap-1.5">
                <div
                  className="flex-1 h-px"
                  style={{
                    width: "3rem",
                    background: `linear-gradient(90deg, transparent, ${theme.category_header_color}50)`,
                  }}
                />
                <div
                  className="w-1.5 h-1.5 rotate-45"
                  style={{ backgroundColor: `${theme.category_header_color}50` }}
                />
              </div>

              {/* Title with badge-like container */}
              <div
                className="relative px-5 py-2 rounded-xl"
                style={{
                  background: `linear-gradient(135deg, ${theme.category_header_color}16, ${theme.category_header_color}08)`,
                  border: `1px solid ${theme.category_header_color}22`,
                  boxShadow: `0 0 25px ${theme.category_header_color}12, inset 0 1px 0 ${theme.category_header_color}15`,
                }}
              >
                <h2
                  className="font-serif font-bold tracking-wider text-center whitespace-nowrap"
                  style={{
                    color: theme.category_header_color,
                    fontSize: "1.1rem",
                    textShadow: `0 0 30px ${theme.category_header_color}40`,
                  }}
                >
                  {categoryName}
                </h2>
              </div>

              {/* Right decorative element */}
              <div className="flex items-center gap-1.5">
                <div
                  className="w-1.5 h-1.5 rotate-45"
                  style={{ backgroundColor: `${theme.category_header_color}50` }}
                />
                <div
                  className="flex-1 h-px"
                  style={{
                    width: "3rem",
                    background: `linear-gradient(90deg, ${theme.category_header_color}50, transparent)`,
                  }}
                />
              </div>
            </div>

            {sections.map((section, si) => (
              <div key={section.subCategory ?? si} className="mb-4">
                {section.subCategory && (
                  <div className="flex items-center gap-2 mb-2.5 justify-center">
                    <div
                      className="w-12 h-px"
                      style={{
                        background: `linear-gradient(90deg, transparent, ${theme.accent_color}30)`,
                      }}
                    />
                    <h3
                      className="font-semibold tracking-widest uppercase text-center"
                      style={{
                        color: theme.accent_color,
                        fontSize: "0.6rem",
                        letterSpacing: "0.18em",
                        opacity: 0.85,
                      }}
                    >
                      {section.subCategory}
                    </h3>
                    <div
                      className="w-12 h-px"
                      style={{
                        background: `linear-gradient(90deg, ${theme.accent_color}30, transparent)`,
                      }}
                    />
                  </div>
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
                      className="rounded-xl overflow-hidden text-center relative flex flex-col"
                      style={{
                        backgroundColor: `${theme.text_color}07`,
                        border: `1px solid ${theme.text_color}0C`,
                        boxShadow: `
                          0 2px 6px rgba(0,0,0,0.18),
                          0 6px 18px rgba(0,0,0,0.2),
                          inset 0 1px 0 rgba(255,255,255,0.05)
                        `,
                      }}
                    >
                      {show_images && item.image_url ? (
                        <div className="relative h-20 overflow-hidden">
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            style={{ filter: "brightness(0.88) saturate(1.12)" }}
                          />
                          <div
                            className="absolute inset-0"
                            style={{
                              background: `linear-gradient(0deg, ${theme.background_color} 0%, ${theme.background_color}AA 22%, transparent 55%)`,
                            }}
                          />
                          {/* Compact dietary badges over image */}
                          <div className="absolute top-1.5 left-1.5 flex gap-1">
                            {item.is_vegetarian && (
                              <div
                                className="p-0.5 rounded-full"
                                style={{
                                  backgroundColor: "rgba(0,0,0,0.65)",
                                  backdropFilter: "blur(6px)",
                                  border: "1px solid rgba(74,222,128,0.2)",
                                }}
                              >
                                <Leaf className="w-2.5 h-2.5" style={{ color: "#4ade80" }} />
                              </div>
                            )}
                            {item.is_spicy && (
                              <div
                                className="p-0.5 rounded-full"
                                style={{
                                  backgroundColor: "rgba(0,0,0,0.65)",
                                  backdropFilter: "blur(6px)",
                                  border: "1px solid rgba(248,113,113,0.2)",
                                }}
                              >
                                <Flame className="w-2.5 h-2.5" style={{ color: "#f87171" }} />
                              </div>
                            )}
                          </div>
                        </div>
                      ) : null}

                      <div className="p-2.5 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-center gap-1.5">
                            <h3
                              className="font-semibold leading-snug"
                              style={{ color: theme.text_color, fontSize: "0.8rem" }}
                            >
                              {item.name}
                            </h3>
                            {!(show_images && item.image_url) && (
                              <>
                                {item.is_vegetarian && (
                                  <Leaf className="w-2.5 h-2.5 shrink-0" style={{ color: "#4ade80" }} />
                                )}
                                {item.is_spicy && (
                                  <Flame className="w-2.5 h-2.5 shrink-0" style={{ color: "#f87171" }} />
                                )}
                              </>
                            )}
                          </div>
                          {show_descriptions && item.description && (
                            <p
                              className="mt-1 line-clamp-1 leading-snug italic"
                              style={{ color: `${theme.text_color}40`, fontSize: "0.6rem" }}
                            >
                              {item.description}
                            </p>
                          )}
                        </div>

                        {show_prices && (
                          <div
                            className="mt-2 py-1 rounded-lg tabular-nums text-center leading-none"
                            style={{
                              color: theme.price_color,
                              backgroundColor: `${theme.price_color}10`,
                              border: `1px solid ${theme.price_color}20`,
                            }}
                          >
                            <span style={{ fontSize: "0.55em", opacity: 0.55, fontWeight: 500 }}>$</span>
                            <span style={{ fontSize: "0.95rem", fontWeight: 700 }}>
                              {Math.floor(item.price)}
                            </span>
                            <span style={{ fontSize: "0.55em", opacity: 0.8, fontWeight: 600 }}>
                              .{String(Math.round((item.price % 1) * 100)).padStart(2, "0")}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Bottom accent */}
                      <div
                        className="h-px shrink-0"
                        style={{
                          background: `linear-gradient(90deg, transparent, ${theme.accent_color}20, transparent)`,
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
