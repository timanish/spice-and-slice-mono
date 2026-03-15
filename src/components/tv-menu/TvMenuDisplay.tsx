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

  // Hide cursor on TV display
  useEffect(() => {
    document.body.style.cursor = "none";
    return () => {
      document.body.style.cursor = "";
    };
  }, []);

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
      className="h-screen flex flex-col overflow-hidden"
      style={{
        backgroundColor: theme.background_color,
        color: theme.text_color,
        fontSize: `${scale}rem`,
      }}
    >
      <TvMenuHeader
        text={config.header_text}
        accentColor={theme.accent_color}
        textColor={theme.text_color}
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
  );
}
