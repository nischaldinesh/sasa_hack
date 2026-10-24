-- M4 + new UI: schema additions and the last seat race guard.
-- Run once in the Supabase SQL Editor, after schema.sql (and m3.sql if you ran it).
-- Safe to run more than once.

-- Left swipes on events (same as m3.sql, repeated so m4 alone is enough).
create table if not exists public.event_skips (
  user_id uuid not null references public.profiles on delete cascade,
  event_id uuid not null references public.events on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);
alter table public.event_skips enable row level security;
drop policy if exists "own skips" on public.event_skips;
create policy "own skips" on public.event_skips for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Events: city, end time, registration.
alter table public.events add column if not exists city text;
alter table public.events add column if not exists end_time timestamptz;
alter table public.events add column if not exists requires_registration boolean not null default false;
alter table public.events add column if not exists registration_url text;

-- Attendance: registered flag, driver's split gas choice.
alter table public.attendance add column if not exists registered boolean not null default false;
alter table public.attendance add column if not exists split_gas boolean not null default true;

-- Profiles: people deck and trip card details, bell state.
alter table public.profiles add column if not exists year text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists orgs text[] not null default '{}';
alter table public.profiles add column if not exists car_model text;
alter table public.profiles add column if not exists matches_seen_at timestamptz not null default now();

-- Swipes: star (super like) is a right swipe with starred = true.
alter table public.swipes add column if not exists starred boolean not null default false;

-- Trip riders: when the match happened, for new match notifications.
alter table public.trip_riders add column if not exists matched_at timestamptz not null default now();

-- Last seat race: lock the trip row, then reject a rider beyond the driver's seats.
-- Concurrent inserts into the same trip wait on the lock, so the second one
-- counts the first and fails with 'trip_full'.
create or replace function public.enforce_trip_seats()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_driver uuid;
  v_event uuid;
  v_seats int;
  v_count int;
begin
  select driver_id, event_id into v_driver, v_event
    from public.trips where id = new.trip_id
    for update;
  if not found then
    raise exception 'trip_not_found';
  end if;

  select seats into v_seats
    from public.attendance
    where user_id = v_driver and event_id = v_event and role = 'driver';

  select count(*) into v_count from public.trip_riders where trip_id = new.trip_id;

  if v_seats is null or v_count >= v_seats then
    raise exception 'trip_full' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_trip_seats on public.trip_riders;
create trigger enforce_trip_seats
  before insert on public.trip_riders
  for each row execute function public.enforce_trip_seats();

-- Make new columns visible to the API right away.
notify pgrst, 'reload schema';
