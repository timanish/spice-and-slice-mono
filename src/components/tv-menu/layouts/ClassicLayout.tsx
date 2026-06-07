import { TvMenuBoardConfig } from "@/types/tv-menu";
import { MenuItem } from "@/hooks/products/types";
import { groupBySubcategory } from "./groupBySubcategory";
import { resolveSectionHeader } from "./sectionHeader";

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
      className="px-10 py-7"
      style={{
        columnCount: columns,
        columnGap: "3.5rem",
        columnRuleWidth: "1px",
        columnRuleStyle: "solid",
        columnRuleColor: `${theme.text_color}07`,
      }}
    >
      {cats.map(([catId, { categoryName, items }], idx) => {
        const sections = useSubcategories
          ? groupBySubcategory(items)
          : [{ subCategory: null, items }];

        return (
          <div key={catId} className="mb-8" style={{ breakInside: "avoid-column" }}>
            {/* Category header — typography is the design, no box needed */}
            <div className="mb-4">
              <h2
                className="font-serif font-bold"
                style={{
                  color: theme.category_header_color,
                  fontSize: "1.9rem",
                  letterSpacing: "0.02em",
                  lineHeight: 1.1,
                  textShadow: `0 0 80px ${theme.category_header_color}25`,
                }}
              >
                {resolveSectionHeader(config, catId, categoryName, idx)}
              </h2>
              <div
                style={{
                  marginTop: "0.45rem",
                  height: "2px",
                  background: `linear-gradient(90deg, ${theme.category_header_color}75 0%, ${theme.category_header_color}18 60%, transparent 100%)`,
                  borderRadius: "1px",
                }}
              />
            </div>

            {sections.map((section, si) => (
              <div key={section.subCategory ?? si}>
                {section.subCategory && (
                  <p
                    className="uppercase font-semibold mt-3 mb-2"
                    style={{
                      color: theme.accent_color,
                      fontSize: "0.58rem",
                      letterSpacing: "0.18em",
                      opacity: 0.75,
                    }}
                  >
                    — {section.subCategory}
                  </p>
                )}

                {section.items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: "0.75rem",
                      padding: "0.6rem 0",
                      borderBottom: `1px solid ${theme.text_color}08`,
                    }}
                  >
                    {show_images && item.image_url && (
                      <div
                        style={{
                          width: "2.6rem",
                          height: "2.6rem",
                          borderRadius: "0.45rem",
                          overflow: "hidden",
                          flexShrink: 0,
                          alignSelf: "center",
                          opacity: 0.9,
                        }}
                      >
                        <img
                          src={item.image_url}
                          alt={item.name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            filter: "saturate(1.1)",
                          }}
                        />
                      </div>
                    )}

                    {/* Name + description */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <span
                          style={{
                            color: theme.text_color,
                            fontSize: "0.97rem",
                            fontWeight: 600,
                            lineHeight: 1.3,
                          }}
                        >
                          {item.name}
                        </span>
                        {item.is_vegetarian && (
                          <span
                            title="Vegetarian"
                            style={{
                              color: "#4ade80",
                              fontSize: "0.45rem",
                              lineHeight: 1,
                              flexShrink: 0,
                            }}
                          >
                            ●
                          </span>
                        )}
                        {item.is_spicy && (
                          <span
                            title="Spicy"
                            style={{
                              color: "#f87171",
                              fontSize: "0.45rem",
                              lineHeight: 1,
                              flexShrink: 0,
                            }}
                          >
                            ●
                          </span>
                        )}
                      </div>
                      {show_descriptions && item.description && (
                        <p
                          style={{
                            color: `${theme.text_color}3E`,
                            fontSize: "0.68rem",
                            fontStyle: "italic",
                            marginTop: "2px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.description}
                        </p>
                      )}
                    </div>

                    {/* Price — large integer, small cents */}
                    {show_prices && (
                      <div
                        style={{
                          flexShrink: 0,
                          color: theme.price_color,
                          lineHeight: 1,
                          textAlign: "right",
                        }}
                      >
                        <span style={{ fontSize: "0.6rem", opacity: 0.45, fontWeight: 500 }}>$</span>
                        <span style={{ fontSize: "1.3rem", fontWeight: 700 }}>
                          {Math.floor(item.price)}
                        </span>
                        <span
                          style={{
                            fontSize: "0.58rem",
                            verticalAlign: "super",
                            fontWeight: 700,
                            opacity: 0.7,
                          }}
                        >
                          {String(Math.round((item.price % 1) * 100)).padStart(2, "0")}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
