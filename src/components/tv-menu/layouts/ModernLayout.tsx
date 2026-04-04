import { TvMenuBoardConfig } from "@/types/tv-menu";
import { MenuItem } from "@/hooks/products/types";
import { groupBySubcategory } from "./groupBySubcategory";

interface Props {
  itemsByCategory: Map<string, { categoryName: string; items: MenuItem[] }>;
  config: TvMenuBoardConfig;
}

interface FlatSection {
  type: "category";
  key: string;
  name: string;
  count: number;
} | {
  type: "subcategory";
  key: string;
  name: string;
} | {
  type: "items";
  key: string;
  items: MenuItem[];
};

export function ModernLayout({ itemsByCategory, config }: Props) {
  const { theme, columns, show_descriptions, show_prices, show_images } = config;
  const useSubcategories = config.group_by_subcategory ?? false;
  const cats = Array.from(itemsByCategory.entries());

  // Flatten into a single render list: [category header, subcategory row, items row, ...]
  // Category headers and subcategory labels span full width.
  // Items are batched into groups and rendered in a grid.
  const sections: FlatSection[] = [];
  for (const [catId, { categoryName, items }] of cats) {
    sections.push({ type: "category", key: catId, name: categoryName, count: items.length });

    const groups = useSubcategories
      ? groupBySubcategory(items)
      : [{ subCategory: null, items }];

    for (const group of groups) {
      if (group.subCategory) {
        sections.push({ type: "subcategory", key: `${catId}-${group.subCategory}`, name: group.subCategory });
      }
      sections.push({ type: "items", key: `${catId}-items-${group.subCategory ?? "all"}`, items: group.items });
    }
  }

  return (
    <div className="px-8 py-6 space-y-0">
      {sections.map((section) => {
        if (section.type === "category") {
          return (
            <div
              key={section.key}
              className="relative overflow-hidden"
              style={{
                marginBottom: "1.25rem",
                marginTop: "0.5rem",
                paddingTop: "0.25rem",
              }}
            >
              {/* Full-bleed category accent line */}
              <div
                style={{
                  position: "absolute",
                  left: "-2rem",
                  right: "-2rem",
                  top: 0,
                  height: "1px",
                  background: `linear-gradient(90deg, transparent, ${theme.category_header_color}30 20%, ${theme.category_header_color}50 50%, ${theme.category_header_color}30 80%, transparent)`,
                }}
              />
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "1rem",
                  paddingTop: "1.1rem",
                }}
              >
                <h2
                  className="font-serif font-bold"
                  style={{
                    color: theme.category_header_color,
                    fontSize: "2rem",
                    letterSpacing: "0.02em",
                    lineHeight: 1,
                    textShadow: `0 0 80px ${theme.category_header_color}30`,
                  }}
                >
                  {section.name}
                </h2>
                <div
                  style={{
                    flex: 1,
                    height: "1px",
                    background: `linear-gradient(90deg, ${theme.category_header_color}35, transparent)`,
                    position: "relative",
                    top: "-2px",
                  }}
                />
                <span
                  style={{
                    color: `${theme.category_header_color}45`,
                    fontSize: "0.65rem",
                    fontWeight: 500,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  {section.count} items
                </span>
              </div>
            </div>
          );
        }

        if (section.type === "subcategory") {
          return (
            <p
              key={section.key}
              className="uppercase font-semibold mb-2"
              style={{
                color: theme.accent_color,
                fontSize: "0.58rem",
                letterSpacing: "0.18em",
                opacity: 0.75,
                paddingLeft: "0.25rem",
              }}
            >
              — {section.name}
            </p>
          );
        }

        // Items grid
        return (
          <div
            key={section.key}
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${columns}, 1fr)`,
              gap: "0.75rem",
              marginBottom: "1rem",
            }}
          >
            {section.items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                theme={theme}
                showImage={show_images}
                showDescription={show_descriptions}
                showPrice={show_prices}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

interface CardProps {
  item: MenuItem;
  theme: TvMenuBoardConfig["theme"];
  showImage: boolean;
  showDescription: boolean;
  showPrice: boolean;
}

function ItemCard({ item, theme, showImage, showDescription, showPrice }: CardProps) {
  const hasImage = showImage && !!item.image_url;

  return (
    <div
      style={{
        borderRadius: "1rem",
        overflow: "hidden",
        background: `${theme.text_color}07`,
        border: `1px solid ${theme.text_color}0D`,
        boxShadow: `0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)`,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {hasImage ? (
        <div style={{ position: "relative", height: "7.5rem", overflow: "hidden", flexShrink: 0 }}>
          <img
            src={item.image_url!}
            alt={item.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "brightness(0.85) saturate(1.15)",
            }}
          />
          {/* Scrim for text readability */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(0deg, ${theme.background_color} 0%, ${theme.background_color}CC 16%, transparent 50%)`,
            }}
          />
          {/* Price badge — frosted, top-right */}
          {showPrice && (
            <div
              style={{
                position: "absolute",
                top: "0.6rem",
                right: "0.6rem",
                padding: "0.3rem 0.6rem",
                borderRadius: "0.5rem",
                background: `${theme.background_color}D8`,
                backdropFilter: "blur(10px)",
                border: `1px solid ${theme.price_color}30`,
                color: theme.price_color,
                lineHeight: 1,
              }}
            >
              <span style={{ fontSize: "0.55rem", opacity: 0.5 }}>$</span>
              <span style={{ fontSize: "0.95rem", fontWeight: 700 }}>{Math.floor(item.price)}</span>
              <span style={{ fontSize: "0.5rem", verticalAlign: "super", fontWeight: 700, opacity: 0.75 }}>
                {String(Math.round((item.price % 1) * 100)).padStart(2, "0")}
              </span>
            </div>
          )}
          {/* Dietary dots */}
          {(item.is_vegetarian || item.is_spicy) && (
            <div style={{ position: "absolute", top: "0.6rem", left: "0.6rem", display: "flex", gap: "0.3rem" }}>
              {item.is_vegetarian && (
                <span
                  style={{
                    display: "block",
                    width: "0.55rem",
                    height: "0.55rem",
                    borderRadius: "50%",
                    background: "#4ade80",
                    boxShadow: "0 0 6px rgba(74,222,128,0.5)",
                  }}
                />
              )}
              {item.is_spicy && (
                <span
                  style={{
                    display: "block",
                    width: "0.55rem",
                    height: "0.55rem",
                    borderRadius: "50%",
                    background: "#f87171",
                    boxShadow: "0 0 6px rgba(248,113,113,0.5)",
                  }}
                />
              )}
            </div>
          )}
        </div>
      ) : null}

      {/* Text area */}
      <div
        style={{
          padding: "0.75rem 0.9rem",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          gap: "0.4rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
            <span
              style={{
                color: theme.text_color,
                fontSize: "0.92rem",
                fontWeight: 700,
                lineHeight: 1.25,
              }}
            >
              {item.name}
            </span>
            {!hasImage && (
              <>
                {item.is_vegetarian && (
                  <span style={{ color: "#4ade80", fontSize: "0.45rem", lineHeight: 1 }}>●</span>
                )}
                {item.is_spicy && (
                  <span style={{ color: "#f87171", fontSize: "0.45rem", lineHeight: 1 }}>●</span>
                )}
              </>
            )}
          </div>
          {showDescription && item.description && (
            <p
              style={{
                color: `${theme.text_color}3A`,
                fontSize: "0.67rem",
                fontStyle: "italic",
                marginTop: "0.2rem",
                lineHeight: 1.4,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {item.description}
            </p>
          )}
        </div>

        {/* Price (when no image) */}
        {showPrice && !hasImage && (
          <div
            style={{
              color: theme.price_color,
              lineHeight: 1,
              marginTop: "0.2rem",
            }}
          >
            <span style={{ fontSize: "0.55rem", opacity: 0.45 }}>$</span>
            <span style={{ fontSize: "1.15rem", fontWeight: 700 }}>{Math.floor(item.price)}</span>
            <span style={{ fontSize: "0.55rem", verticalAlign: "super", fontWeight: 700, opacity: 0.7 }}>
              {String(Math.round((item.price % 1) * 100)).padStart(2, "0")}
            </span>
          </div>
        )}
      </div>

      {/* Bottom accent line — subtle */}
      <div
        style={{
          height: "2px",
          flexShrink: 0,
          background: `linear-gradient(90deg, ${theme.accent_color}25, ${theme.category_header_color}15, transparent)`,
        }}
      />
    </div>
  );
}
