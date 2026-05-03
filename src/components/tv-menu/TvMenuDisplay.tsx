import { useEffect, useMemo } from "react";
import { useSearchParams, useParams } from "react-router-dom";
import { usePublishedTvMenu } from "@/hooks/usePublishedTvMenu";
import { TvMenuHeader } from "./TvMenuHeader";
import { TvMenuFooter } from "./TvMenuFooter";
import { AutoScroller } from "./AutoScroller";
import { PageSlider } from "./PageSlider";
import { MenuComingSoon } from "./MenuComingSoon";
import { ClassicLayout } from "./layouts/ClassicLayout";
import { ModernLayout } from "./layouts/ModernLayout";
import { GridLayout } from "./layouts/GridLayout";
import { RestaurantLayout } from "./layouts/RestaurantLayout";
import { StaticImagesLayout } from "./layouts/StaticImagesLayout";
import { Loader2 } from "lucide-react";
import { MenuItem } from "@/hooks/products/types";

export function TvMenuDisplay() {
  const [searchParams] = useSearchParams();
  const { slug } = useParams<{ slug?: string }>();
  const boardId = searchParams.get("board_id") ?? undefined;
  const screenNumber = parseInt(searchParams.get("screen") ?? "0") || 0;
  const totalScreens = parseInt(searchParams.get("of") ?? "0") || 0;

  const { data, isLoading, error } = usePublishedTvMenu(boardId, slug);

  // Daily reload for memory hygiene on 24/7 displays
  useEffect(() => {
    const timer = setTimeout(
      () => window.location.reload(),
      24 * 60 * 60 * 1000,
    );
    return () => clearTimeout(timer);
  }, []);

  // Hide cursor only when ?cursor=hide is set (for actual TV deployment)
  const hideCursor = searchParams.get("cursor") === "hide";
  useEffect(() => {
    if (!hideCursor) return;
    document.body.style.cursor = "none";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hideCursor]);

  // Split items for multi-screen mode
  const displayData = useMemo(() => {
    if (!data) return null;

    // Only split categories when BOTH ?screen= and ?of= params are present in the URL.
    // Falling back to config.total_screens caused truncation when visiting the plain
    // /tv-menu/[slug] URL on boards configured for multi-screen deployment.
    const isMultiScreenUrl = screenNumber > 0 && totalScreens > 1;
    if (!isMultiScreenUrl) return data.itemsByCategory;

    // Split evenly across screens
    const allEntries = Array.from(data.itemsByCategory.entries());
    const perScreen = Math.ceil(allEntries.length / totalScreens);
    const start = (screenNumber - 1) * perScreen;
    const end = Math.min(start + perScreen, allEntries.length);

    return new Map<string, { categoryName: string; items: MenuItem[] }>(
      allEntries.slice(start, end),
    );
  }, [data, screenNumber, totalScreens]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-amber-400" />
      </div>
    );
  }

  if (error || !data || !displayData) {
    return <MenuComingSoon />;
  }

  const { board } = data;
  const config = board.config;
  const { theme } = config;
  const scale = theme.font_size_scale ?? 1;
  const displayMode = config.display_mode ?? (config.auto_scroll ? "scroll" : "static");

  // Static-images layout: bypass everything (header/footer/orbs/data) and render
  // the uploaded image(s) full-bleed. The image IS the menu.
  if (config.layout === "static_images") {
    return (
      <StaticImagesLayout
        images={config.static_images ?? []}
        screenNumber={screenNumber}
        totalScreens={totalScreens}
        durationSeconds={config.page_duration ?? 10}
        backgroundColor={theme.background_color}
      />
    );
  }

  const LayoutComponent =
    config.layout === "modern"
      ? ModernLayout
      : config.layout === "grid"
        ? GridLayout
        : config.layout === "restaurant"
          ? RestaurantLayout
          : ClassicLayout;

  const content = <LayoutComponent itemsByCategory={displayData} config={config} />;

  // Force static (no auto-scroll/paging) only when viewing a specific split screen
  const isMultiScreenStatic = screenNumber > 0 && totalScreens > 1;

  const isRestaurant = config.layout === "restaurant";

  return (
    <div
      className="h-screen flex flex-col overflow-hidden relative"
      style={{
        backgroundColor: theme.background_color,
        color: theme.text_color,
        fontSize: `${scale}rem`,
      }}
    >
      {/* Ambient background effects — printed-menu look in restaurant mode skips
          the orbs/grain in favor of a clean warm bg with just a vignette. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {!isRestaurant && (
          <>
            {/* Primary accent orb — top-right */}
            <div
              className="absolute -top-48 -right-48 w-[700px] h-[700px] rounded-full"
              style={{
                background: `radial-gradient(circle, ${theme.accent_color}22 0%, ${theme.accent_color}0A 40%, transparent 70%)`,
                animation: "tvAmbient1 22s ease-in-out infinite",
              }}
            />
            {/* Price-color orb — bottom-left */}
            <div
              className="absolute -bottom-48 -left-48 w-[700px] h-[700px] rounded-full"
              style={{
                background: `radial-gradient(circle, ${theme.price_color}18 0%, ${theme.price_color}08 40%, transparent 70%)`,
                animation: "tvAmbient2 28s ease-in-out infinite",
              }}
            />
            {/* Center atmosphere — very subtle */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] rounded-full"
              style={{
                background: `radial-gradient(ellipse, ${theme.category_header_color}0C 0%, transparent 65%)`,
                animation: "tvAmbient3 35s ease-in-out infinite",
              }}
            />
            {/* Subtle film grain for depth */}
            <div
              className="absolute inset-0 opacity-[0.022]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
                backgroundRepeat: "repeat",
                backgroundSize: "256px 256px",
              }}
            />
          </>
        )}
        {/* Vignette — darkens edges, focuses center */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 85% 85% at center, transparent 50%, rgba(0,0,0,0.35) 100%)`,
          }}
        />
      </div>

      <style>{`
        @keyframes tvAmbient1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-40px, 30px) scale(1.12); }
          66% { transform: translate(25px, -20px) scale(0.94); }
        }
        @keyframes tvAmbient2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          40% { transform: translate(50px, -35px) scale(1.18); }
          70% { transform: translate(-25px, 25px) scale(0.88); }
        }
        @keyframes tvAmbient3 {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.25); }
        }
      `}</style>

      <div className="relative z-10 flex flex-col h-full">
        <TvMenuHeader
          text={config.header_text}
          accentColor={theme.accent_color}
          textColor={theme.text_color}
          backgroundColor={theme.background_color}
          variant={isRestaurant ? "restaurant" : "default"}
          categoryHeaderColor={theme.category_header_color}
        />

        {isMultiScreenStatic || displayMode === "static" ? (
          <div className="flex-1 overflow-hidden">{content}</div>
        ) : displayMode === "pages" ? (
          <PageSlider duration={config.page_duration ?? 10} accentColor={theme.accent_color}>
            {content}
          </PageSlider>
        ) : (
          <AutoScroller
            enabled={config.auto_scroll}
            speed={config.scroll_speed}
          >
            {content}
          </AutoScroller>
        )}

        <TvMenuFooter
          text={config.footer_text}
          textColor={theme.text_color}
          accentColor={theme.accent_color}
          variant={isRestaurant ? "restaurant" : "default"}
          categoryHeaderColor={theme.category_header_color}
        />
      </div>
    </div>
  );
}
