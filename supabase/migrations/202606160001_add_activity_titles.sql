alter table public.activities
  add column if not exists title text;

update public.activities
set title = case
  when type = 'run' then 'Run'
  when type = 'bike' then 'Bike ride'
  when type = 'walk' then 'Walk'
  else 'Workout'
end
where title is null or btrim(title) = '';

alter table public.activities
  alter column title set not null;
