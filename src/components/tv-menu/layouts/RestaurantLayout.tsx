import { TvMenuBoardConfig } from "@/types/tv-menu";
import { MenuItem } from "@/hooks/products/types";
import { groupBySubcategory } from "./groupBySubcategory";

interface Props {
  itemsByCategory: Map<string, { categoryName: string; items: MenuItem[] }>;
  config: TvMenuBoardConfig;
}

// Slot order: 0 = top-left, 1 = top-right, 2 = bottom-right, 3 = bottom-left.
const ACCENT_SLOTS: Array<{ key: string; style: React.CSSProperties }> = [
  { key: "tl", style: { top: "0.75rem", left: "0.75rem" } },
  { key: "tr", style: { top: "0.75rem", right: "0.75rem" } },
  { key: "br", style: { bottom: "0.75rem", right: "0.75rem" } },
  { key: "bl", style: { bottom: "0.75rem", left: "0.75rem" } },
];

export function RestaurantLayout({ itemsByCategory, config }: Props) {
  const { theme, columns, show_descriptions, show_prices } = config;
  const useSubcategories = config.group_by_subcategory ?? false;
  const accentImages = (config.accent_images ?? []).filter(Boolean);
  const cats = Array.from(itemsByCategory.entries());

  // Reserve horizontal padding only when accent images live in the top-left/top-right
  // (slots 0 and 1) — that's where they'd collide with menu panels.
  const hasTopAccents = accentImages.length > 0;
  const sidePadding = hasTopAccents ? "9rem" : "2.5rem";

  return (
    <div
      className="relative h-full"
      style={{
        paddingLeft: sidePadding,
        paddingRight: sidePadding,
        paddingTop: "1.25rem",
        paddingBottom: "1.5rem",
      }}
    >
      {/* Corner accent dish photos */}
      {accentImages.slice(0, 4).map((url, i) => (
        <div
          key={`${ACCENT_SLOTS[i].key}-${i}`}
          aria-hidden
          style={{
            position: "absolute",
            ...ACCENT_SLOTS[i].style,
            width: "9rem",
            height: "9rem",
            borderRadius: "50%",
            overflow: "hidden",
            border: `3px solid ${theme.category_header_color}AA`,
            boxShadow: `0 8px 28px rgba(0,0,0,0.55), 0 0 0 6px ${theme.background_color}`,
            zIndex: 1,
          }}
        >
          <img
            src={url}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "saturate(1.15) brightness(1.02)",
            }}
          />
        </div>
      ))}

      <div
        style={{
          columnCount: columns,
          columnGap: "1.75rem",
          position: "relative",
          zIndex: 2,
        }}
      >
        {cats.map(([catId, { categoryName, items }], idx) => {
          const sections = useSubcategories
            ? groupBySubcategory(items)
            : [{ subCategory: null, items }];

          return (
            <CategoryPanel
              key={catId}
              number={idx + 1}
              name={categoryName}
              sections={sections}
              theme={theme}
              showDescriptions={show_descriptions}
              showPrices={show_prices}
            />
          );
        })}
      </div>
    </div>
  );
}

interface CategoryPanelProps {
  number: number;
  name: string;
  sections: { subCategory: string | null; items: MenuItem[] }[];
  theme: TvMenuBoardConfig["theme"];
  showDescriptions: boolean;
  showPrices: boolean;
}

function CategoryPanel({
  number,
  name,
  sections,
  theme,
  showDescriptions,
  showPrices,
}: CategoryPanelProps) {
  const goldStrong = theme.category_header_color;
  const goldSoft = `${theme.category_header_color}55`;

  return (
    <div
      style={{
        position: "relative",
        marginBottom: "1.75rem",
        paddingTop: "1.5rem", // space for the ribbon that overlaps the top edge
        breakInside: "avoid-column",
      }}
    >
      {/* Double-rule gold frame */}
      <div
        style={{
          position: "relative",
          border: `3px double ${goldSoft}`,
          borderRadius: "0.65rem",
          padding: "1.6rem 1rem 0.9rem",
          background: `${theme.background_color}`,
          boxShadow: `inset 0 0 0 1px ${theme.category_header_color}10`,
        }}
      >
        {/* Ribbon header — orange→red gradient pill anchored over top edge */}
        <div
          style={{
            position: "absolute",
            top: "-1rem",
            left: "50%",
            transform: "translateX(-50%)",
            padding: "0.4rem 1rem",
            background: `linear-gradient(90deg, ${theme.accent_color}, #B8001F)`,
            borderRadius: "0.5rem",
            border: `1px solid ${goldStrong}`,
            boxShadow: `0 4px 12px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.2)`,
            whiteSpace: "nowrap",
          }}
        >
          <span
            className="font-serif font-bold"
            style={{
              color: "#FFFFFF",
              fontSize: "0.95rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              textShadow: "0 1px 2px rgba(0,0,0,0.35)",
            }}
          >
            {number}. {name}
          </span>
        </div>

        {sections.map((section, si) => (
          <div key={section.subCategory ?? si}>
            {section.subCategory && (
              <p
                className="uppercase font-semibold"
                style={{
                  color: theme.accent_color,
                  fontSize: "0.6rem",
                  letterSpacing: "0.18em",
                  opacity: 0.85,
                  marginTop: si === 0 ? 0 : "0.55rem",
                  marginBottom: "0.35rem",
                  textAlign: "center",
                }}
              >
                — {section.subCategory} —
              </p>
            )}

            {section.items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                theme={theme}
                showDescription={showDescriptions}
                showPrice={showPrices}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

interface ItemRowProps {
  item: MenuItem;
  theme: TvMenuBoardConfig["theme"];
  showDescription: boolean;
  showPrice: boolean;
}

function ItemRow({ item, theme, showDescription, showPrice }: ItemRowProps) {
  const dotColor = `${theme.text_color}38`;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: "0.5rem",
        padding: "0.42rem 0",
      }}
    >
      {/* Bullet */}
      <span
        aria-hidden
        style={{
          color: theme.category_header_color,
          fontSize: "0.55rem",
          flexShrink: 0,
          lineHeight: 1,
          transform: "translateY(-1px)",
        }}
      >
        ◆
      </span>

      {/* Name + dietary chips */}
      <span
        style={{
          color: theme.text_color,
          fontSize: "0.95rem",
          fontWeight: 600,
          lineHeight: 1.25,
          flexShrink: 0,
        }}
      >
        {item.name}
      </span>
      {item.is_vegetarian && <VegChip />}
      {item.is_spicy && <SpicyChip />}

      {/* Dotted leader line — flex-grows to fill space between name and price */}
      <span
        aria-hidden
        style={{
          flex: 1,
          minWidth: "0.5rem",
          borderBottom: `2px dotted ${dotColor}`,
          transform: "translateY(-4px)",
          alignSelf: "center",
        }}
      />

      {/* Price */}
      {showPrice && (
        <span
          style={{
            color: theme.price_color,
            fontSize: "1.05rem",
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            flexShrink: 0,
            letterSpacing: "0.01em",
            textShadow: `0 0 18px ${theme.price_color}25`,
          }}
        >
          ${item.price.toFixed(2)}
        </span>
      )}

      {/* Description rendered on a second visual line via wrap (rare) */}
      {showDescription && item.description && (
        <span
          style={{
            color: `${theme.text_color}55`,
            fontSize: "0.65rem",
            fontStyle: "italic",
            flexBasis: "100%",
            paddingLeft: "1rem",
            marginTop: "1px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.description}
        </span>
      )}
    </div>
  );
}

function VegChip() {
  return (
    <span
      title="Vegetarian"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "0.95rem",
        height: "0.95rem",
        borderRadius: "50%",
        background: "#1f7a1f",
        border: "1.5px solid #4ade80",
        color: "#FFFFFF",
        fontSize: "0.5rem",
        fontWeight: 800,
        lineHeight: 1,
        flexShrink: 0,
        transform: "translateY(-1px)",
      }}
    >
      V
    </span>
  );
}

function SpicyChip() {
  return (
    <span
      title="Spicy"
      aria-label="Spicy"
      style={{
        fontSize: "0.85rem",
        lineHeight: 1,
        flexShrink: 0,
        transform: "translateY(-1px)",
        filter: "drop-shadow(0 0 4px rgba(248,113,113,0.4))",
      }}
    >
      🌶️
    </span>
  );
}
