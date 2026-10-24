-- M5: friend requests, ride reviews, driver perks, driver verification.
-- Run once in the Supabase SQL Editor, after m4.sql. Safe to run more than once.

-- Events: a perk the organizer gives drivers (e.g. "Free parking pass").
alter table public.events add column if not exists driver_perk text;

-- Profiles: driver verification. Only the plate and the approval time are
-- stored; the license photo never leaves the driver's browser (demo check).
alter table public.profiles add column if not exists license_plate text;
alter table public.profiles add column if not exists license_state text;
alter table public.profiles add column if not exists license_verified_at timestamptz;

-- Friend requests: a friendship is created only when the other person accepts.
create table if not exists public.friend_requests (
  from_user uuid not null references public.profiles on delete cascade,
  to_user uuid not null references public.profiles on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  primary key (from_user, to_user),
  check (from_user <> to_user)
);
alter table public.friend_requests enable row level security;

drop policy if exists "read my requests" on public.friend_requests;
create policy "read my requests" on public.friend_requests for select to authenticated
  using (auth.uid() in (from_user, to_user));

drop policy if exists "send requests" on public.friend_requests;
create policy "send requests" on public.friend_requests for insert to authenticated
  with check (from_user = auth.uid() and status = 'pending');

-- The sender may re-send (back to pending); the recipient may accept or decline.
drop policy if exists "update my requests" on public.friend_requests;
create policy "update my requests" on public.friend_requests for update to authenticated
  using (auth.uid() in (from_user, to_user))
  with check (
    (to_user = auth.uid() and status in ('accepted', 'declined'))
    or (from_user = auth.uid() and status = 'pending')
  );

-- Reviews: a rider rates their driver after drop off (one per trip).
create table if not exists public.reviews (
  trip_id uuid not null references public.trips on delete cascade,
  reviewer_id uuid not null references public.profiles on delete cascade,
  reviewee_id uuid not null references public.profiles on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  primary key (trip_id, reviewer_id)
);
alter table public.reviews enable row level security;

drop policy if exists "read reviews" on public.reviews;
create policy "read reviews" on public.reviews for select to authenticated using (true);

-- Only a rider of the trip may review, and only that trip's driver.
drop policy if exists "riders review their driver" on public.reviews;
create policy "riders review their driver" on public.reviews for insert to authenticated
  with check (
    reviewer_id = auth.uid()
    and exists (
      select 1 from public.trip_riders r
      join public.trips t on t.id = r.trip_id
      where r.trip_id = reviews.trip_id
        and r.rider_id = auth.uid()
        and t.driver_id = reviews.reviewee_id
    )
  );

drop policy if exists "edit own review" on public.reviews;
create policy "edit own review" on public.reviews for update to authenticated
  using (reviewer_id = auth.uid()) with check (reviewer_id = auth.uid());

-- Driver ratings for person cards and trip cards.
create or replace view public.driver_ratings with (security_invoker = true) as
select reviewee_id as driver_id,
  round(avg(rating)::numeric, 1) as rating,
  count(*) as reviews
from public.reviews
group by reviewee_id;

grant select on public.driver_ratings to authenticated;

notify pgrst, 'reload schema';
