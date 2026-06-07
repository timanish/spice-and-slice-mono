import { TvMenuBoardConfig } from "@/types/tv-menu";

/**
 * Resolve a section's display header: a per-board label override (falling back
 * to the category name), optionally prefixed with its 1-based number.
 */
export function resolveSectionHeader(
  config: TvMenuBoardConfig,
  catId: string,
  categoryName: string,
  index: number,
): string {
  const label = config.section_labels?.[catId]?.trim() || categoryName;
  const showNumbers = config.show_section_numbers ?? true;
  return showNumbers ? `${index + 1}. ${label}` : label;
}
