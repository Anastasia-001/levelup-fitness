alter table public.characters
  add column if not exists coins integer not null default 120 check (coins >= 0);

create table if not exists public.owned_cosmetics (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  acquired_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table if not exists public.equipped_cosmetics (
  user_id uuid primary key references auth.users(id) on delete cascade,
  head_item_id text,
  shirt_item_id text,
  pants_item_id text,
  shoes_item_id text,
  accessory_item_id text,
  frame_item_id text,
  updated_at timestamptz not null default now()
);

alter table public.owned_cosmetics enable row level security;
alter table public.equipped_cosmetics enable row level security;

drop policy if exists "Owned cosmetics are owned by users" on public.owned_cosmetics;
create policy "Owned cosmetics are owned by users"
  on public.owned_cosmetics for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Equipped cosmetics are owned by users" on public.equipped_cosmetics;
create policy "Equipped cosmetics are owned by users"
  on public.equipped_cosmetics for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists equipped_cosmetics_touch_updated_at on public.equipped_cosmetics;
create trigger equipped_cosmetics_touch_updated_at
before update on public.equipped_cosmetics
for each row execute function public.touch_character_updated_at();
