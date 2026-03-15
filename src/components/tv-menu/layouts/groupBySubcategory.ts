import { MenuItem } from "@/hooks/products/types";

export interface SubcategoryGroup {
  subCategory: string | null;
  items: MenuItem[];
}

export function groupBySubcategory(items: MenuItem[]): SubcategoryGroup[] {
  const groups = new Map<string, MenuItem[]>();
  const noSubItems: MenuItem[] = [];

  for (const item of items) {
    const sub = item.sub_category?.trim();
    if (sub) {
      const existing = groups.get(sub) ?? [];
      existing.push(item);
      groups.set(sub, existing);
    } else {
      noSubItems.push(item);
    }
  }

  const result: SubcategoryGroup[] = [];

  // Items without sub_category come first
  if (noSubItems.length > 0) {
    result.push({ subCategory: null, items: noSubItems });
  }

  // Then grouped sub-categories alphabetically
  const sorted = Array.from(groups.entries()).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  for (const [subCategory, subItems] of sorted) {
    result.push({ subCategory, items: subItems });
  }

  return result;
}
