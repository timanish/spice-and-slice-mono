import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { usePublishedTvMenu } from "@/hooks/usePublishedTvMenu";
import { TvMenuHeader } from "./TvMenuHeader";
import { TvMenuFooter } from "./TvMenuFooter";
import { AutoScroller } from "./AutoScroller";
import { MenuComingSoon } from "./MenuComingSoon";
import { ClassicLayout } from "./layouts/ClassicLayout";
import { ModernLayout } from "./layouts/ModernLayout";
import { GridLayout } from "./layouts/GridLayout";
import { Loader2 } from "lucide-react";

export function TvMenuDisplay() {
  const [searchParams] = useSearchParams();
  const boardId = searchParams.get("board_id") ?? undefined;

  const { data, isLoading, error } = usePublishedTvMenu(boardId);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-amber-400" />
      </div>
    );
  }

  if (error || !data) {
    return <MenuComingSoon />;
  }

  const { board, itemsByCategory } = data;
  const config = board.config;
  const { theme } = config;
  const scale = theme.font_size_scale ?? 1;

  const LayoutComponent =
    config.layout === "modern"
      ? ModernLayout
      : config.layout === "grid"
        ? GridLayout
        : ClassicLayout;

  return (
    <div
      className="min-h-screen flex flex-col"
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

      <AutoScroller enabled={config.auto_scroll} speed={config.scroll_speed}>
        <LayoutComponent itemsByCategory={itemsByCategory} config={config} />
      </AutoScroller>

      <TvMenuFooter
        text={config.footer_text}
        textColor={theme.text_color}
        accentColor={theme.accent_color}
      />
    </div>
  );
}
