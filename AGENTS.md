# AGENTS.md: SoonerSwipe

Instructions for any coding agent (or teammate) building this project. Read this whole file before writing code. Follow the milestones in order and verify each one before moving on.

## 1. Project summary

SoonerSwipe is a mobile first web app for University of Oklahoma students. Students swipe on events, then swipe on other students going to the same event along a similar route. A mutual right swipe creates a shared ride. After the trip, matches can become friends, and the app recommends future events. Gas cost splitting is optional and only suggested, never charged.

Built for SASE Hacks for Good (8 hour hackathon). Demo first: a working core loop beats extra features.

### Core loop (must work in the demo)

1. Sign up with an `@ou.edu` email.
2. Browse and swipe on events (right = interested).
3. Join an event as a driver (seats, pickup point, departure time, mpg) or a rider (pickup point).
4. Swipe on people with the opposite role going to the same event, sorted by pickup closeness.
5. A mutual right swipe adds the rider to the driver's trip and shows a trip card with the cost share.
6. Trip members can add each other as friends.
7. Events show going and interested counts and can be sorted by popularity.

### Success criteria (measurable)

| #   | Criterion                                                            | How to check                                                                          |
| --- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| S1  | Only `@ou.edu` emails can sign up                                    | Sign up with a Gmail address and confirm it is rejected in the UI and by the database |
| S2  | Swipe, match, trip card works across two devices in under 60 seconds | Two browsers, two demo accounts, time it                                              |
| S3  | Cost share is correct to the cent                                    | `npx vitest run` passes; 40 mi, 30 mpg, $2.80, $0.10, 3 riders gives $1.93            |
| S4  | A full car stops appearing in rider decks                            | Fill all seats, then check the deck from another rider                                |
| S5  | Event counts update after a join                                     | Join from a second account, refresh, going count rises by 1                           |
| S6  | `npm run build` succeeds with zero type errors                       | Run it                                                                                |
| S7  | Usable at 390 px width                                               | Chrome devtools, iPhone 12 preset                                                     |

## 2. Tech stack

| Layer           | Choice                                                           |
| --------------- | ---------------------------------------------------------------- |
| Framework       | Next.js (App Router) + TypeScript                                |
| Styling         | Tailwind CSS                                                     |
| Swipe cards     | framer-motion (drag gestures)                                    |
| Auth + database | Supabase (email and password auth, Postgres, row level security) |
| Tests           | Vitest for pure logic                                            |
| Hosting         | Vercel                                                           |

Do not add other dependencies unless a milestone cannot be done without them. No payment SDKs. No ORMs.

## 3. Setup commands

```bash
npx create-next-app@latest soonerswipe --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm
cd soonerswipe
npm install @supabase/supabase-js @supabase/ssr framer-motion
npm install -D vitest tsx dotenv
```

Create `.env.local` (never commit it):

```bash
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_GAS_PRICE=2.80
NEXT_PUBLIC_USAGE_RATE=0.10
```

Supabase dashboard settings:

1. Authentication > Providers > Email: enabled.
2. Authentication > Settings: turn off "Confirm email" so demo signups work instantly.
3. SQL Editor: run `supabase/schema.sql`, then seed with `npx tsx scripts/seed.ts`.

Add to `package.json` scripts:

```json
"test": "vitest run",
"seed": "tsx scripts/seed.ts"
```

## 4. File structure

```
app/
  layout.tsx              # mobile shell, bottom nav: Events, Trips, Friends
  page.tsx                # sign in / sign up
  events/page.tsx         # event swipe deck + list view with search and sort
  events/[id]/page.tsx    # event detail, join as driver or rider, people deck
  trips/page.tsx          # my trips
  trips/[id]/page.tsx     # trip card: pickup, time, members, cost share, add friend
  friends/page.tsx        # friends list + recommended events
  api/swipe/route.ts      # POST: record person swipe, create match server side
components/
  SwipeDeck.tsx           # generic framer-motion card stack
  EventCard.tsx
  PersonCard.tsx
  ReasonTags.tsx
lib/
  supabase/client.ts      # browser client
  supabase/server.ts      # server client (cookies) + admin client (service role)
  cost.ts                 # cost share math
  geo.ts                  # haversine distance
  reasons.ts              # popularity reason tags
  recommend.ts            # event recommendations
  types.ts
supabase/
  schema.sql
scripts/
  seed.ts
tests/
  cost.test.ts
  geo.test.ts
  reasons.test.ts
```

## 5. Database schema

Put this in `supabase/schema.sql` and run it once.

```sql
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
```

Swipe writes, trip creation, and trip rider inserts happen only in `app/api/swipe/route.ts` using the service role client. Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.

## 6. Business logic (implement exactly)

### 6.1 Distance (`lib/geo.ts`)

```ts
export function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
```

Round trip miles for a trip = `2 * haversineMiles(driver pickup, event location)`, rounded to one decimal. Label it "approx." in the UI. A routing API is a stretch goal only.

### 6.2 Cost share (`lib/cost.ts`)

```ts
export function costShare(
  miles: number,
  mpg: number,
  gasPrice: number,
  usageRate: number,
  riders: number,
): number {
  if (miles <= 0 || mpg <= 0 || riders < 0) throw new Error("invalid input");
  const total = (miles / mpg) * gasPrice + miles * usageRate;
  return Math.round((total / (riders + 1)) * 100) / 100;
}
```

The driver counts as one of the people splitting. If `cost_mode = 'free'`, show "Free ride" and skip the math.

Required test: `costShare(40, 30, 2.80, 0.10, 3) === 1.93`.

### 6.3 Person deck query (`events/[id]`)

Show people where all of these are true:

1. `attendance.event_id` = this event and `status = 'going'`.
2. Their role is the opposite of mine.
3. Not me, and not already swiped by me for this event.
4. If they are a driver: matched riders < seats.
5. If I am a rider and already in a trip for this event: show nothing, show my trip instead.

Sort by `haversineMiles(my pickup, their pickup)` ascending. Show the distance on the card as "1.2 mi from your pickup".

### 6.4 Match flow (`POST /api/swipe`)

Body: `{ toUser: string, eventId: string, direction: "left" | "right" }`.

1. Get the current user from the server Supabase client. Reject with 401 if missing.
2. Upsert into `swipes`.
3. If `direction = 'left'`, return `{ matched: false }`.
4. Check for a reciprocal right swipe (`from_user = toUser, to_user = me, event_id`). If none, return `{ matched: false }`.
5. Find which of the two is the driver from `attendance`. If both have the same role, return `{ matched: false }`.
6. Get or create the `trips` row for `(event_id, driver_id)`.
7. If matched riders >= seats, return `{ matched: false, full: true }`.
8. Insert into `trip_riders`. On unique violation (rider already in a car), return `{ matched: false }`.
9. Return `{ matched: true, tripId }`. The client shows an "It's a match" screen linking to the trip.

### 6.5 Event swipes and popularity

- Right swipe on an event: upsert `attendance` with `status = 'interested'` (do not downgrade an existing `going`).
- Join form (driver or rider): upsert with `status = 'going'` and role fields.
- Event cards show `going`, `interested`, friends going, open seats, and up to 3 reason tags.
- List view: search box filters by title, organization, or category (case insensitive). Sort options: Most going (default), Trending (`new_this_week`), Open seats, Soonest.

### 6.6 Reason tags (`lib/reasons.ts`)

Pure function. Input: counts, friends going, majors of people going, open seats, event tags. Output: at most 3 strings, in this priority order:

1. friendsGoing >= 1: `"{n} of your friends are going"` (use "friend is" when n = 1)
2. A major that is >= 40% of going, with at least 3 going: `"Popular with {major} majors"`
3. newThisWeek >= 5: `"Trending: up {n} this week"`
4. openSeats >= 1: `"Rides available: {n} open seats"`
5. Each event tag, as is

### 6.7 Recommendations (`lib/recommend.ts`)

For upcoming events the user has not joined:
`score = 2 * friendsGoing + (category in categories of events I went to ? 1 : 0) + 0.1 * going`.
Return the top 5 by score, ties broken by soonest. Shown on the Friends page and on the trip card after a trip.

### 6.8 Friends

On the trip card, each member has an "Add friend" button. Insert into `friends` with `user_a = min(id1, id2)` and `user_b = max(id1, id2)`. Ignore duplicate errors.

## 7. Seed data (`scripts/seed.ts`)

Uses the service role key via `dotenv` loading `.env.local`. Must be safe to run twice (upsert or delete demo rows first).

- 6 demo users created with `supabase.auth.admin.createUser({ email, password: "demo1234", email_confirm: true })`, plus matching `profiles` rows:
  `driver1@ou.edu`, `driver2@ou.edu`, `rider1@ou.edu`, `rider2@ou.edu`, `rider3@ou.edu`, `rider4@ou.edu`, with mixed majors (Computer Science, Engineering, Business, Biology).
- 6 events: a mix of OKC career fair, Norman cultural festival, OU game watch party, Tulsa conference, SASE social, and campus concert. Use real coordinates for the venues and start times within the next 3 weeks. Replace these with real upcoming OU events before the demo.
- Attendance spread so popularity sort shows a clear order, and at least one event has 2 drivers and 4 riders with pickup points at real campus spots (Oklahoma Memorial Union, Bizzell Library, Gaylord Hall, Headington Hall).
- One existing friendship so a "friend is going" tag appears.

## 8. Milestones (follow in order)

Each milestone ends with its checks passing and a git commit.

| #   | Hours        | Deliverable                                                     | Done when                                                   |
| --- | ------------ | --------------------------------------------------------------- | ----------------------------------------------------------- |
| M1  | 0:00 to 0:45 | Project setup, schema, seed, sign up/in with OU email check     | S1 passes; `npm run seed` runs twice without errors         |
| M2  | 0:45 to 2:30 | Event list + event swipe deck, join as driver or rider          | Event swipes create `interested` rows; join creates `going` |
| M3  | 2:30 to 4:00 | Person deck, `/api/swipe`, match screen, trip card              | S2 and S4 pass                                              |
| M4  | 4:00 to 5:00 | Cost share on trip card, add friend, popularity counts and sort | S3 and S5 pass                                              |
| M5  | 5:00 to 6:00 | Reason tags, recommendations, UI polish                         | Tags render on seeded events; S7 passes                     |
| M6  | 6:00+        | Deploy to Vercel, record backup demo video                      | Deployed URL works with demo accounts                       |

If behind schedule, cut in this order: recommendations, reason tags, search. Never cut the M3 match flow.

## 9. Coding rules

1. TypeScript strict. No `any` unless parsing unknown JSON.
2. Keep logic in `lib/` as pure functions with tests; pages only fetch and render.
3. Server components fetch with the server client; interactive pieces are client components.
4. Mobile first: design at 390 px wide, bottom nav, thumb reachable buttons, cards at least 70% of screen height.
5. Show loading and empty states on every list ("No one going yet. Be the first driver!").
6. Handle Supabase errors by showing a short message, never a blank screen.
7. Do not add payments, chat, maps, or ratings unless M1 to M5 are done.
8. Small commits with clear messages, one per milestone at minimum.
9. Never commit `.env.local` or print secrets in logs.

## 10. Verification commands

```bash
npm run test     # all lib tests pass, including costShare = 1.93
npm run build    # zero type errors
npm run dev      # open http://localhost:3000
```

Manual demo check (two browsers, one in incognito):

1. Try `test@gmail.com`: sign up must fail.
2. Log in as `driver1@ou.edu` in browser A and `rider1@ou.edu` in browser B (password `demo1234`).
3. Both open the same event. B swipes right on A. A swipes right on B.
4. Both see "It's a match" and the trip card with the same cost share.
5. Add each other as friends; the Friends page shows the friendship and recommendations.
6. Event list sorted by Most going shows the joined event's count increased.

## 11. Demo script (90 seconds)

1. "Maria is an international student. The OKC career fair is Friday and she has no car."
2. Show the event list sorted by Most going, with reason tags.
3. Maria swipes right on the career fair, joins as a rider, and swipes on drivers near Bizzell Library.
4. On the second device, the driver swipes right. It's a match.
5. Trip card: pickup, time, $1.93 gas share.
6. They add each other as friends, and the app suggests the next event they can attend together.
