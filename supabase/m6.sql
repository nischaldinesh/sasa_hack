-- M6: event photos for the Events page cards.
-- Run once in the Supabase SQL Editor, after m5.sql. Safe to run more than once.

-- Path to a photo in /public (e.g. /events/career.jpg) or a full https URL.
alter table public.events add column if not exists image_url text;

-- Added to m5.sql after it first shipped; repeated here so m6 alone is enough.
alter table public.events add column if not exists description text;

notify pgrst, 'reload schema';
