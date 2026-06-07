-- Per-item ordering for menu_items (TV menu + lists). Lower = earlier; name is
-- the tiebreaker. Idempotent so it's safe to apply locally and (later) on prod.
alter table public.menu_items
  add column if not exists display_order integer not null default 0;

create index if not exists idx_menu_items_display_order
  on public.menu_items (display_order);
