alter table public.profiles
  add column if not exists location text,
  add column if not exists privacy_controls_enabled boolean not null default true,
  add column if not exists health_data_enabled boolean not null default false,
  add column if not exists email_notifications_enabled boolean not null default true,
  add column if not exists push_notifications_enabled boolean not null default true;

alter table public.activities
  add column if not exists photo_url text,
  add column if not exists photo_path text;

insert into storage.buckets (id, name, public)
values ('activity-photos', 'activity-photos', true)
on conflict (id) do nothing;

drop policy if exists "Activity photos are readable" on storage.objects;
create policy "Activity photos are readable"
  on storage.objects for select
  using (bucket_id = 'activity-photos');

drop policy if exists "Users can upload their activity photos" on storage.objects;
create policy "Users can upload their activity photos"
  on storage.objects for insert
  with check (
    bucket_id = 'activity-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can update their activity photos" on storage.objects;
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
