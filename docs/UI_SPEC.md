# SoonerSwipe UI spec

The UI source of truth is the 9 mockups in `docs/` plus this file. Mockups are
390 px wide (rendered at 2x). Numbers and names in the mockups are examples:
every value on screen comes from the database or from `lib/` logic.

## Global style

| Token | Value |
| --- | --- |
| Primary (OU crimson) | `#841617` (hover / pressed `#6b1213`) |
| Page background | light gray `#f3f4f6` |
| Cards | white, 16 to 24 px radius, soft shadow |
| Headings | bold / black weight, tight tracking |
| Buttons | large (48 to 56 px tall), fully rounded corners (16 px or pill) |
| Success | green (`Registered`, `Confirmed`, trending pills, GOING stamp) |
| Warning | orange (`Not registered yet`, `Not set up`) |

Responsive website, not a native app:

- Under 768 px: matches the mockups (bottom tab nav on main screens, full width cards).
- 768 px and up: top navbar (logo, Discover, Events, Friends, Profile, bell, avatar),
  content centered at max 1100 px. Swipe decks are centered at about 420 px with a
  details side panel; Left = skip, Right = accept, Up = star. Event list uses a
  2 to 3 column grid. Login is two columns. Match screen and registration sheet
  are centered modals.

Navigation: 4 tabs (Discover, Events, Friends, Profile) on every main screen.
Flow screens (registration, how are you going, people deck, trip card) hide the
bottom tabs on mobile and show a back button. Trips live under Profile ("My trips").
The bell (Events header on mobile, navbar on desktop) links to new matches and shows
a dot while there are unseen matches.

## Screens

### 1. Login — `1 · Sign In.png` — route `/`

| Element | Data |
| --- | --- |
| App icon, "SoonerSwipe", tagline "Find your ride. Make a friend." | static |
| 3 feature cards (Swipe to connect, Split gas fairly, Leave as friends) | static |
| "OU Email Address" input, "Continue with OU Email" | validates `@ou.edu` (`lib/auth.ts isOuEmail`) |
| Step 2 (not in mockup): password + "Sign in"; "New here? Create account" (name + password) | `supabase.auth.signInWithPassword` / `signUp`, then `profiles` row |
| Footnote "Only @ou.edu addresses…" | static |

Components: `app/page.tsx` (client), `components/Logo.tsx`.
Desktop: brand + feature cards left, form right.
Missing schema fields: none.

### 2. Discover (event swipe) — `2 · Swipe Events (Home).png` — route `/discover`

| Element | Data |
| --- | --- |
| Header logo + "SoonerSwipe", Filter button | Filter opens category chips (from `events.category`) |
| Hint "Swipe right if you want to go · left to skip" | static |
| Card background illustration | generated per `events.category` (inline SVG, `components/EventArt.tsx`) |
| Trending pill "+N this week" | `event_popularity.new_this_week`, shown when >= 5 |
| GOING (green, drag right) / SKIP (red, drag left) stamps | drag offset |
| Category pill | `events.category` |
| Title, "Hosted by …" | `events.title`, `events.organization` |
| Date and time range | `events.start_time`, `events.end_time` (America/Chicago) |
| Venue · city | `events.location`, `events.city` |
| "N going · N interested" | `event_popularity.going`, `.interested` |
| Up to 3 chips | open seats (`lib/events.ts openSeatsByEvent`), friends going, then reason tags (`lib/reasons.ts`) |
| ✕ and ✓ buttons | skip -> `event_skips`; accept -> `attendance.status = 'interested'` |
| Bottom tabs | Discover active |

Components: `app/discover/page.tsx`, `components/DiscoverDeck.tsx`, `components/SwipeDeck.tsx`,
`components/EventSwipeCard.tsx`, `components/EventArt.tsx`.
Missing schema fields: `events.city`, `events.end_time`.

### 3. "You liked this event" registration sheet — `3 · Liked → Register.png` — sheet on `/discover`

| Element | Data |
| --- | --- |
| Pill "You liked this event", title, "date · time · venue" | `events` |
| Registration status card "Not registered yet" | `attendance.registered = false` |
| "Register to lock in your spot" + copy | static |
| 3 steps (Register, Tell us how you're getting there, Meet people riding your way) | static, step 1 active |
| "Register Now" | opens `events.registration_url` in a new tab, sets `attendance.registered = true`, goes to screen 4 |
| "I've already registered" | sets `attendance.registered = true`, goes to screen 4 |
| "Not now, keep swiping" | closes the sheet |

Shown only when `events.requires_registration` is true and the user is not registered;
other events go straight to screen 5. Desktop: centered modal.
Components: `components/RegisterSheet.tsx`.
Missing schema fields: `events.requires_registration`, `events.registration_url`, `attendance.registered`.

### 4. "You're registered!" — `4 · Registered → Next Questions.png` — route `/events/[id]/registered`

| Element | Data |
| --- | --- |
| 3 step progress bar, "Step 1 of 3 done" | step 1 done |
| Check icon, "You're registered!", event title, date · time | `events` |
| Status card: Event registration = Registered; Ride = Not set up / Set up | `attendance.registered`, `attendance.status = 'going'` |
| "Next, a few quick questions" (driving or ride, pickup, leave time) | static |
| Continue | to `/events/[id]` |

Missing schema fields: none beyond screen 3.

### 5. "How are you going?" — `5 · Driver Rider Questions.png` — route `/events/[id]`

| Element | Data |
| --- | --- |
| Back, "CATEGORY · DATE", title | `events` |
| Chips: start time; "City · N mi away"; "N going" | `events.start_time`; `events.city` + `haversineMiles(Oklahoma Memorial Union, event)` rounded; `event_popularity.going` |
| "I'm driving" card: seats stepper 1 to 7, car mpg, pickup area, split gas toggle, departure time | `attendance.seats`, `profiles.mpg`, `attendance.pickup_*`, `attendance.split_gas` (-> `trips.cost_mode`), `attendance.depart_time` |
| "I need a ride" card: pickup area, departure time | `attendance.pickup_*`, `attendance.depart_time` |
| Pickup area | text-input look, searchable list of preset campus spots (`lib/places.ts`) |
| Bottom button "Join as Driver — Find Riders" / "Join as Rider — Find Drivers" | upsert `attendance` status `going`, then `/events/[id]/people` |

Role and leaving are locked once in a trip.
Components: `app/events/[id]/page.tsx`, `components/HowGoingForm.tsx`, `components/PickupPicker.tsx`.
Missing schema fields: `attendance.split_gas`.

### 6. People deck — `6 · Swipe People.png` — route `/events/[id]/people`

| Element | Data |
| --- | --- |
| Back, "Riders going to" / "Drivers going to", event title | my role, `events.title` |
| Count badge "N riders" / "N drivers" | people in my deck |
| Avatar with initials | `profiles.name` |
| Status pill "Needs a ride" / "Has N seats" | role, seats left |
| "N mi from your pickup" | `haversineMiles(my pickup, their pickup)` |
| "Starred you" badge | `swipes.starred` toward me |
| Name, "Major · Year" | `profiles.name`, `.major`, `.year` |
| "Pickup <spot>" | `attendance.pickup_point` |
| "8:15 AM depart" chip | `attendance.depart_time` |
| Org badges | `profiles.orgs` |
| Bio quote | `profiles.bio` |
| Buttons ✕ / ★ / ✓ | `POST /api/swipe` left / right + starred / right |
| Progress dots | position in deck |

Starred people come first. Desktop: card plus details side panel, arrow keys.
Components: `app/events/[id]/people/page.tsx`, `components/PeopleDeck.tsx`, `components/PersonCard.tsx`.
Missing schema fields: `profiles.year`, `profiles.bio`, `profiles.orgs`, `swipes.starred`.

### 7. "You're Connected!" — `7 · You're Connected!.png` — modal over the people deck

| Element | Data |
| --- | --- |
| "You're Connected!", "You and <first name> are riding together to <event>" | partner `profiles.name`, `events.title` |
| Two avatars with role badges, "You" and partner short name | initials |
| "Driver · N seats", "Rider · <pickup>" | `attendance.seats`, `attendance.pickup_point` |
| Route: pickup -> venue, city | driver `attendance.pickup_point`, `events.location`, `events.city` |
| "Est. ~N mi round trip", "Depart <time>" | `roundTripMiles`, driver `attendance.depart_time` |
| View Trip Card, Keep Swiping | `/trips/[id]`, close |

Shown to the second swiper from the `POST /api/swipe` result and to the first swiper
by polling `GET /api/match` every 3 s. Desktop: centered modal.
Components: `components/MatchScreen.tsx`.
Missing schema fields: none.

### 8. Trip card — `8 · Trip Card + Cost Split.png` — route `/trips/[id]`

| Element | Data |
| --- | --- |
| Back, "Your trip · <date>", title, "Confirmed" badge | `events`, trip exists with riders |
| Your crew: driver "You (First L.)" + "car model · N mpg", role pills | `profiles.car_model`, `profiles.mpg` |
| Riders: "Major · Year · Pickup" | `profiles.major`, `.year`, `attendance.pickup_point` |
| Route: ordered pickup stops (driver first, riders by distance from driver), "Depart <time>" | `attendance` pickups, `lib/trip.ts orderStops` |
| Venue, "Arrive ~<time> · ~N mi total" | depart + one way miles / 45 mph; `roundTripMiles` |
| Gas split lines: "Fuel (M mi ÷ G mpg × $P)", "Car usage (M mi × $R)", "Total ÷ N people", "Each person pays" | `lib/cost.ts`, `NEXT_PUBLIC_GAS_PRICE`, `NEXT_PUBLIC_USAGE_RATE` |
| "Free ride" | `trips.cost_mode = 'free'` |
| "Add your crewmates as friends" + Add All | insert `friends` pairs |

Missing schema fields: `profiles.car_model`, `trip_riders.matched_at` (for new match notifications).

### 9. Events list — `Extra · Browse Search Events.png` — route `/events`

| Element | Data |
| --- | --- |
| Logo, "Events", bell with unseen dot, avatar | `profiles.matches_seen_at` vs `trip_riders.matched_at` |
| Search "Search events, orgs…" | title, organization, category (case insensitive) |
| Tabs: Most Going, Trending, Open Seats, Soonest | `lib/events.ts sortEvents` |
| Featured card (top result): category, Trending pill, title, "date · venue, city", big going count | summaries |
| Featured footer: seats open, "+N this week", friend avatars + "N friends" | open seats, `new_this_week`, friends going names |
| Compact rows: category icon tile, title, "date · venue", chips (going, seats open, tags e.g. Free food), Join | `/events/[id]` |

Desktop: featured full width, others in a 2 to 3 column grid.
Missing schema fields: none beyond screen 2.

### Not in mockups (built to the same style)

- **Friends** `/friends`: friends list and recommended events (`lib/recommend.ts`).
- **Profile** `/profile`: edit name, major, year, bio, orgs, car model, mpg; My trips; sign out.
- **Matches** `/matches`: new matches for the bell; visiting marks them seen.

## Schema additions (`supabase/m4.sql`)

| Table | Column | Why |
| --- | --- | --- |
| events | `city text` | venue · city (screens 2, 5, 7, 9) |
| events | `end_time timestamptz` | time range (screen 2) |
| events | `requires_registration boolean default false` | screen 3 |
| events | `registration_url text` | Register Now |
| attendance | `registered boolean default false` | screens 3 and 4 |
| attendance | `split_gas boolean default true` | driver toggle -> `trips.cost_mode` |
| profiles | `year text`, `bio text`, `orgs text[]`, `car_model text` | screens 6 and 8, profile |
| profiles | `matches_seen_at timestamptz` | bell dot |
| swipes | `starred boolean default false` | star / super like |
| trip_riders | `matched_at timestamptz default now()` | new match notifications |
| event_skips | table (from m3) | left swipes on events |
| trigger | `enforce_trip_seats` on `trip_riders` | last seat race (M4) |
