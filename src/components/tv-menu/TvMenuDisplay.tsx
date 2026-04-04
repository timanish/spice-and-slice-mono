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

    const config = data.board.config;
    const screens = totalScreens > 0 ? totalScreens : (config.total_screens ?? 1);
    const screen = screenNumber > 0 ? screenNumber : 1;

    if (screens <= 1) return data.itemsByCategory;

    // Flatten all items to split evenly across screens
    const allEntries = Array.from(data.itemsByCategory.entries());
    const totalCategories = allEntries.length;
    const perScreen = Math.ceil(totalCategories / screens);
    const start = (screen - 1) * perScreen;
    const end = Math.min(start + perScreen, totalCategories);
    const slice = allEntries.slice(start, end);

    return new Map<string, { categoryName: string; items: MenuItem[] }>(slice);
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

  const LayoutComponent =
    config.layout === "modern"
      ? ModernLayout
      : config.layout === "grid"
        ? GridLayout
        : ClassicLayout;

  const content = <LayoutComponent itemsByCategory={displayData} config={config} />;

  const isMultiScreenStatic =
    (totalScreens > 1) || ((config.total_screens ?? 1) > 1 && screenNumber > 0);

  return (
    <div
      className="h-screen flex flex-col overflow-hidden relative"
      style={{
        backgroundColor: theme.background_color,
        color: theme.text_color,
        fontSize: `${scale}rem`,
      }}
    >
      {/* Ambient background effects — animated glowing orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-[0.07] blur-[120px]"
          style={{
            background: `radial-gradient(circle, ${theme.accent_color}, transparent 70%)`,
            animation: "tvAmbient1 20s ease-in-out infinite",
          }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full opacity-[0.05] blur-[140px]"
          style={{
            background: `radial-gradient(circle, ${theme.price_color}, transparent 70%)`,
            animation: "tvAmbient2 25s ease-in-out infinite",
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full opacity-[0.03] blur-[100px]"
          style={{
            background: `radial-gradient(ellipse, ${theme.category_header_color}, transparent 70%)`,
            animation: "tvAmbient3 30s ease-in-out infinite",
          }}
        />
        {/* Subtle noise texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
            backgroundSize: "256px 256px",
          }}
        />
      </div>

      <style>{`
        @keyframes tvAmbient1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-30px, 20px) scale(1.1); }
          66% { transform: translate(20px, -15px) scale(0.95); }
        }
        @keyframes tvAmbient2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          40% { transform: translate(40px, -30px) scale(1.15); }
          70% { transform: translate(-20px, 20px) scale(0.9); }
        }
        @keyframes tvAmbient3 {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.03; }
          50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.06; }
        }
      `}</style>

      <div className="relative z-10 flex flex-col h-full">
        <TvMenuHeader
          text={config.header_text}
          accentColor={theme.accent_color}
          textColor={theme.text_color}
          backgroundColor={theme.background_color}
        />

        {isMultiScreenStatic || displayMode === "static" ? (
          <div className="flex-1 overflow-hidden">{content}</div>
        ) : displayMode === "pages" ? (
          <PageSlider duration={config.page_duration ?? 10}>
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
        />
      </div>
    </div>
  );
}
