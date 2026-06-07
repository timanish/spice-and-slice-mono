// Curated font sets for TV menu boards + a helper to build the Google Fonts URL.
export const HEADING_FONTS = [
  "Playfair Display",
  "Cinzel",
  "Cinzel Decorative",
  "Cormorant Garamond",
  "Marcellus",
  "Bebas Neue",
];

export const BODY_FONTS = [
  "Inter",
  "Lato",
  "Roboto",
  "Cormorant Garamond",
  "EB Garamond",
];

/** Build a Google Fonts stylesheet href for the given families (deduped). */
export function googleFontsHref(families: (string | undefined)[]): string {
  const uniq = Array.from(new Set(families.filter(Boolean) as string[]));
  if (uniq.length === 0) return "";
  const q = uniq
    .map((f) => `family=${f.replace(/ /g, "+")}:wght@400;600;700`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${q}&display=swap`;
}
