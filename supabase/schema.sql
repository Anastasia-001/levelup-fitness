create extension if not exists "pgcrypto";

create type public.unit_preference as enum ('metric', 'imperial');
create type public.activity_type as enum (
  'run',
  'walk',
  'bike',
  'hike',
  'gym_workout',
  'pushups',
  'swimming',
  'other_workout'
);
create type public.mission_type as enum (
  'complete_activity',
  'distance_walk_run',
  'pushups',
  'workout_duration'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (char_length(username) between 2 and 32),
  location text,
  unit_preference public.unit_preference not null default 'metric',
  privacy_controls_enabled boolean not null default true,
  health_data_enabled boolean not null default false,
  email_notifications_enabled boolean not null default true,
  push_notifications_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  level integer not null default 1 check (level > 0),
  total_exp integer not null default 0 check (total_exp >= 0),
  coins integer not null default 120 check (coins >= 0),
  endurance_exp integer not null default 0 check (endurance_exp >= 0),
  speed_exp integer not null default 0 check (speed_exp >= 0),
  strength_exp integer not null default 0 check (strength_exp >= 0),
  consistency_exp integer not null default 0 check (consistency_exp >= 0),
  updated_at timestamptz not null default now()
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.activity_type not null,
  started_at timestamptz not null,
  completed_at timestamptz not null default now(),
  duration_seconds integer not null check (duration_seconds > 0),
  distance_meters numeric,
  route jsonb,
  sets integer,
  reps integer,
  weight_kg numeric,
  photo_url text,
  photo_path text,
  exp_earned integer not null check (exp_earned >= 0),
  stat_exp jsonb not null default '{"endurance":0,"speed":0,"strength":0,"consistency":0}'::jsonb
);

create table public.missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_date date not null,
  type public.mission_type not null,
  title text not null,
  target_value numeric not null check (target_value > 0),
  progress numeric not null default 0 check (progress >= 0),
  reward_exp integer not null check (reward_exp >= 0),
  completed_at timestamptz,
  unique (user_id, mission_date, type)
);

create table public.owned_cosmetics (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  acquired_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table public.equipped_cosmetics (
  user_id uuid primary key references auth.users(id) on delete cascade,
  head_item_id text,
  shirt_item_id text,
  pants_item_id text,
  shoes_item_id text,
  accessory_item_id text,
  frame_item_id text,
  updated_at timestamptz not null default now()
);

create index activities_user_completed_idx on public.activities (user_id, completed_at desc);
create index missions_user_date_idx on public.missions (user_id, mission_date);

alter table public.profiles enable row level security;
alter table public.characters enable row level security;
alter table public.activities enable row level security;
alter table public.missions enable row level security;
alter table public.owned_cosmetics enable row level security;
alter table public.equipped_cosmetics enable row level security;

create policy "Profiles are owned by users"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Characters are owned by users"
  on public.characters for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Activities are owned by users"
  on public.activities for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Missions are owned by users"
  on public.missions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Owned cosmetics are owned by users"
  on public.owned_cosmetics for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Equipped cosmetics are owned by users"
  on public.equipped_cosmetics for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('activity-photos', 'activity-photos', true)
on conflict (id) do nothing;

create policy "Activity photos are readable"
  on storage.objects for select
  using (bucket_id = 'activity-photos');

create policy "Users can upload their activity photos"
  on storage.objects for insert
  with check (
    bucket_id = 'activity-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update their activity photos"
  on storage.objects for update
  using (
    bucket_id = 'activity-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'activity-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create or replace function public.touch_character_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger characters_touch_updated_at
before update on public.characters
for each row execute function public.touch_character_updated_at();

create trigger equipped_cosmetics_touch_updated_at
before update on public.equipped_cosmetics
for each row execute function public.touch_character_updated_at();
