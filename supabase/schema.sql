create extension if not exists pgcrypto;

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null unique check (email ilike '%@ou.edu'),
  name text not null,
  major text,
  mpg numeric check (mpg > 0),
  interests text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  organization text,
  category text,
  location text not null,
  lat double precision not null,
  lng double precision not null,
  start_time timestamptz not null,
  tags text[] not null default '{}'
);

create table attendance (
  user_id uuid not null references profiles on delete cascade,
  event_id uuid not null references events on delete cascade,
  status text not null check (status in ('interested', 'going')),
  role text check (role in ('driver', 'rider')),
  pickup_point text,
  pickup_lat double precision,
  pickup_lng double precision,
  depart_time timestamptz,
  seats int check (seats between 1 and 7),
  joined_at timestamptz not null default now(),
  primary key (user_id, event_id),
  check (status = 'interested' or (role is not null and pickup_lat is not null and pickup_lng is not null)),
  check (role <> 'driver' or seats is not null)
);

create table swipes (
  from_user uuid not null references profiles on delete cascade,
  to_user uuid not null references profiles on delete cascade,
  event_id uuid not null references events on delete cascade,
  direction text not null check (direction in ('left', 'right')),
  created_at timestamptz not null default now(),
  primary key (from_user, to_user, event_id)
);

create table trips (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events on delete cascade,
  driver_id uuid not null references profiles on delete cascade,
  cost_mode text not null default 'split' check (cost_mode in ('free', 'split')),
  created_at timestamptz not null default now(),
  unique (event_id, driver_id)
);

create table trip_riders (
  trip_id uuid not null references trips on delete cascade,
  rider_id uuid not null references profiles on delete cascade,
  event_id uuid not null references events on delete cascade,
  primary key (trip_id, rider_id),
  unique (rider_id, event_id)  -- a rider is in at most one car per event
);

create table friends (
  user_a uuid not null references profiles on delete cascade,
  user_b uuid not null references profiles on delete cascade,
  since timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);

create view event_popularity as
select e.id, e.title,
  count(a.user_id) filter (where a.status = 'going') as going,
  count(a.user_id) filter (where a.status = 'interested') as interested,
  count(a.user_id) filter (where a.joined_at > now() - interval '7 days') as new_this_week
from events e
left join attendance a on a.event_id = e.id
group by e.id, e.title;

-- Row level security: simple hackathon rules.
alter table profiles enable row level security;
alter table events enable row level security;
alter table attendance enable row level security;
alter table swipes enable row level security;
alter table trips enable row level security;
alter table trip_riders enable row level security;
alter table friends enable row level security;

create policy "read all" on profiles for select to authenticated using (true);
create policy "own profile" on profiles for insert to authenticated with check (id = auth.uid());
create policy "update own profile" on profiles for update to authenticated using (id = auth.uid());

create policy "read events" on events for select to authenticated using (true);
create policy "create events" on events for insert to authenticated with check (true);

create policy "read attendance" on attendance for select to authenticated using (true);
create policy "own attendance" on attendance for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "read own swipes" on swipes for select to authenticated using (from_user = auth.uid());

create policy "read trips" on trips for select to authenticated using (true);
create policy "read trip riders" on trip_riders for select to authenticated using (true);

create policy "read friends" on friends for select to authenticated using (true);
create policy "add friend" on friends for insert to authenticated
  with check (auth.uid() in (user_a, user_b));

-- Auth guard: also run supabase/auth_trigger.sql to reject non @ou.edu
-- emails in auth.users itself.
