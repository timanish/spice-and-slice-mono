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
  const gridCols = Math.min(columns + 1, 5);

  return (
    <div className="px-8 py-5 space-y-6">
      {cats.map(([catId, { categoryName, items }]) => {
        const sections = useSubcategories
          ? groupBySubcategory(items)
          : [{ subCategory: null, items }];

        return (
          <div key={catId}>
            {/* Category header — centered title with flanking rules */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                marginBottom: "0.75rem",
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: "1px",
                  background: `linear-gradient(90deg, transparent, ${theme.category_header_color}40)`,
                }}
              />
              <h2
                className="font-serif font-bold"
                style={{
                  color: theme.category_header_color,
                  fontSize: "1.5rem",
                  letterSpacing: "0.06em",
                  lineHeight: 1,
                  textShadow: `0 0 60px ${theme.category_header_color}30`,
                  whiteSpace: "nowrap",
                }}
              >
                {categoryName}
              </h2>
              <div
                style={{
                  flex: 1,
                  height: "1px",
                  background: `linear-gradient(90deg, ${theme.category_header_color}40, transparent)`,
                }}
              />
            </div>

            {sections.map((section, si) => (
              <div key={section.subCategory ?? si} className="mb-3">
                {section.subCategory && (
                  <p
                    className="uppercase font-semibold mb-2 text-center"
                    style={{
                      color: theme.accent_color,
                      fontSize: "0.55rem",
                      letterSpacing: "0.18em",
                      opacity: 0.7,
                    }}
                  >
                    {section.subCategory}
                  </p>
                )}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                    gap: "0.5rem",
                  }}
                >
                  {section.items.map((item) => {
                    const hasImage = show_images && !!item.image_url;
                    return (
                      <div
                        key={item.id}
                        style={{
                          borderRadius: "0.75rem",
                          overflow: "hidden",
                          background: `${theme.text_color}07`,
                          border: `1px solid ${theme.text_color}0C`,
                          boxShadow: `0 2px 12px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)`,
                          display: "flex",
                          flexDirection: "column",
                        }}
                      >
                        {hasImage && (
                          <div style={{ position: "relative", height: "4.5rem", overflow: "hidden", flexShrink: 0 }}>
                            <img
                              src={item.image_url!}
                              alt={item.name}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                filter: "brightness(0.88) saturate(1.1)",
                              }}
                            />
                            <div
                              style={{
                                position: "absolute",
                                inset: 0,
                                background: `linear-gradient(0deg, ${theme.background_color} 0%, ${theme.background_color}99 18%, transparent 50%)`,
                              }}
                            />
                            {/* Dietary dots on image */}
                            {(item.is_vegetarian || item.is_spicy) && (
                              <div style={{ position: "absolute", top: "0.35rem", left: "0.35rem", display: "flex", gap: "0.2rem" }}>
                                {item.is_vegetarian && (
                                  <span style={{ display: "block", width: "0.4rem", height: "0.4rem", borderRadius: "50%", background: "#4ade80" }} />
                                )}
                                {item.is_spicy && (
                                  <span style={{ display: "block", width: "0.4rem", height: "0.4rem", borderRadius: "50%", background: "#f87171" }} />
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        <div
                          style={{
                            padding: "0.5rem 0.6rem",
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            gap: "0.3rem",
                            textAlign: "center",
                          }}
                        >
                          <div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem" }}>
                              <span
                                style={{
                                  color: theme.text_color,
                                  fontSize: "0.78rem",
                                  fontWeight: 600,
                                  lineHeight: 1.25,
                                }}
                              >
                                {item.name}
                              </span>
                              {!hasImage && (
                                <>
                                  {item.is_vegetarian && (
                                    <span style={{ color: "#4ade80", fontSize: "0.4rem" }}>●</span>
                                  )}
                                  {item.is_spicy && (
                                    <span style={{ color: "#f87171", fontSize: "0.4rem" }}>●</span>
                                  )}
                                </>
                              )}
                            </div>
                            {show_descriptions && item.description && (
                              <p
                                style={{
                                  color: `${theme.text_color}35`,
                                  fontSize: "0.6rem",
                                  fontStyle: "italic",
                                  marginTop: "1px",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {item.description}
                              </p>
                            )}
                          </div>

                          {show_prices && (
                            <div
                              style={{
                                marginTop: "0.2rem",
                                padding: "0.2rem 0",
                                borderRadius: "0.4rem",
                                background: `${theme.price_color}0F`,
                                border: `1px solid ${theme.price_color}1E`,
                                color: theme.price_color,
                                lineHeight: 1,
                              }}
                            >
                              <span style={{ fontSize: "0.5rem", opacity: 0.45 }}>$</span>
                              <span style={{ fontSize: "0.88rem", fontWeight: 700 }}>{Math.floor(item.price)}</span>
                              <span style={{ fontSize: "0.48rem", verticalAlign: "super", fontWeight: 700, opacity: 0.7 }}>
                                {String(Math.round((item.price % 1) * 100)).padStart(2, "0")}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
