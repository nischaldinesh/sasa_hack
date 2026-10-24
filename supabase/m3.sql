-- M3: left swipes on events, so skipped events stay out of the deck.
-- Run once in the Supabase SQL Editor. Safe to run again.

create table if not exists event_skips (
  user_id uuid not null references profiles on delete cascade,
  event_id uuid not null references events on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

alter table event_skips enable row level security;

drop policy if exists "own skips" on event_skips;
create policy "own skips" on event_skips for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Make the new table visible to the API right away.
notify pgrst, 'reload schema';
