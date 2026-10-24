// Seeds demo users, crowd users, events, attendance and friendships.
// Requires supabase/schema.sql and supabase/m4.sql through m6.sql.
// Safe to run repeatedly: users are reused, seeded rows are deleted and re-inserted.
// Usage: npm run seed
import { existsSync } from "node:fs";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { PICKUP_POINTS, type PickupKey } from "../lib/places";
import { chicagoToUtc, chicagoToday } from "../lib/time";

config({ path: ".env.local", quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PASSWORD = "demo1234";
const DAY = 24 * 60 * 60 * 1000;

type SeedUser = {
  email: string;
  name: string;
  major: string;
  year: string;
  mpg: number | null;
  carModel: string | null;
  bio: string | null;
  orgs: string[];
  interests: string[];
};

// The 6 demo accounts (password demo1234).
const DEMO: SeedUser[] = [
  { email: "driver1@ou.edu", name: "Jai Shah", major: "Computer Science", year: "Senior", mpg: 32, carModel: "2019 Honda Civic", bio: "Driving to OKC most Fridays. Happy to share the ride and the playlist.", orgs: ["SASE"], interests: ["career", "tech", "sports"] },
  { email: "driver2@ou.edu", name: "Emily Nguyen", major: "Industrial Engineering", year: "Junior", mpg: 30, carModel: "2017 Toyota Corolla", bio: "Early riser, always on time. Coffee stop on the way is non negotiable.", orgs: ["SWE", "SASE"], interests: ["career", "culture"] },
  { email: "rider1@ou.edu", name: "Maria Gonzalez", major: "Business", year: "Sophomore", mpg: null, carModel: null, bio: "International student, no car yet. I'll bring snacks!", orgs: ["International Student Union"], interests: ["career", "culture", "music"] },
  { email: "rider2@ou.edu", name: "Priya Krishnamurthy", major: "Computer Science", year: "Junior", mpg: null, carModel: null, bio: "Super nervous about this career fair — would love to carpool and practice elevator pitches on the way!", orgs: ["Moksha '26", "SASE"], interests: ["tech", "sports"] },
  { email: "rider3@ou.edu", name: "Arun Ramaswamy", major: "Electrical & Computer Engineering", year: "Sophomore", mpg: null, carModel: null, bio: "Building robots by day. Looking for rides to tech events.", orgs: ["IEEE", "SASE"], interests: ["career", "music"] },
  { email: "rider4@ou.edu", name: "Ethan Brooks", major: "Biology", year: "Freshman", mpg: null, carModel: null, bio: "Pre-med, first semester at OU. Want to meet people outside the lab.", orgs: ["Pre-Med Society"], interests: ["sports", "culture"] },
];

const CROWD_NAMES = [
  "Aiden Clark", "Sofia Ramirez", "Noah Patel", "Hannah Kim", "Lucas Martinez", "Grace Okafor", "Mateo Hernandez", "Chloe Nguyen",
  "Ryan Thompson", "Ananya Iyer", "Caleb Johnson", "Isabella Rossi", "Daniel Park", "Fatima Hassan", "Owen Mitchell", "Mei Lin",
  "Jacob Wilson", "Aaliyah Brown", "Ethan Chen", "Zara Ahmed", "Logan Davis", "Riya Mehta", "Samuel Lee", "Olivia Garcia",
  "Benjamin Wright", "Ava Robinson", "Elijah Scott", "Nadia Ali", "Henry Lopez", "Emma Walker", "Diego Torres", "Lily Anderson",
  "Arjun Reddy", "Madison Hall", "Kevin Tran", "Sara Haddad", "Tyler Young", "Leah Cohen", "Marcus Bell", "Yuki Tanaka",
];
const MAJORS = [
  "Computer Science", "Mechanical Engineering", "Business", "Biology", "Petroleum Engineering",
  "Psychology", "Electrical & Computer Engineering", "Finance", "Chemical Engineering", "Journalism",
];
const YEARS = ["Freshman", "Sophomore", "Junior", "Senior", "Graduate"];
const ORGS = ["SASE", "SHPE", "NSBE", "SWE", "ACM", "Indian Student Association", "Club Soccer", "Sooner Dance Marathon"];
const CARS = ["2018 Toyota Camry", "2020 Honda Accord", "2016 Mazda 3", "2021 Hyundai Elantra", "2015 Ford Focus"];
const BIOS = [
  "Always down for a road trip playlist swap.",
  "Looking to meet more people in my major.",
  "Quiet rider, great at directions.",
  "First time going, would love company!",
  null,
];

const CROWD: SeedUser[] = CROWD_NAMES.map((name, i) => {
  const driver = i % 6 === 0 || i % 7 === 0;
  return {
    email: `crowd${String(i + 1).padStart(2, "0")}@ou.edu`,
    name,
    major: MAJORS[i % MAJORS.length],
    year: YEARS[i % YEARS.length],
    mpg: driver ? 24 + (i % 4) * 3 : null,
    carModel: driver ? CARS[i % CARS.length] : null,
    bio: BIOS[i % BIOS.length],
    orgs: i % 3 === 0 ? [ORGS[i % ORGS.length]] : i % 3 === 1 ? [ORGS[i % ORGS.length], ORGS[(i + 3) % ORGS.length]] : [],
    interests: [],
  };
});

// Placeholder events with real venue coordinates.
// Replace with real upcoming OU events before the demo.
type SeedEvent = {
  key: string;
  title: string;
  organization: string;
  category: string;
  location: string;
  city: string;
  lat: number;
  lng: number;
  daysFromNow: number;
  start: [number, number]; // [hour, minute], America/Chicago
  hours: number;
  departBeforeMin: number; // drivers and riders leave this long before the start
  tags: string[];
  registrationUrl: string | null;
  driverPerk?: string;
  description?: string;
};

const EVENTS: SeedEvent[] = [
  { key: "career", title: "OU Career Fair — OKC", organization: "OU Career Services & SASE", category: "Career", location: "Cox Convention Center", city: "Oklahoma City", lat: 35.466, lng: -97.5135, daysFromNow: 8, start: [9, 0], hours: 6, departBeforeMin: 45, tags: ["Bring your resume"], registrationUrl: "https://www.ou.edu/career", driverPerk: "Free parking pass in the Cox Center garage", description: "Meet recruiters from Oklahoma and national employers hiring interns and new grads in engineering, tech and business. Bring printed resumes and dress business casual. Registration is free but required." },
  { key: "sasegm", title: "SASE General Meeting", organization: "SASE at OU", category: "Meeting", location: "Sarkeys Energy Center", city: "Norman", lat: 35.2099, lng: -97.4407, daysFromNow: 4, start: [18, 30], hours: 1.5, departBeforeMin: 15, tags: ["Free food"], registrationUrl: null, description: "Monthly SASE meeting with chapter updates, a short industry talk and time to meet members. Dinner is provided, so come hungry." },
  { key: "diwali", title: "Diwali Night 2026", organization: "Indian Student Association", category: "Culture", location: "Traditions Square", city: "Norman", lat: 35.2063, lng: -97.442, daysFromNow: 12, start: [18, 0], hours: 4, departBeforeMin: 20, tags: ["Free food", "Dance performances"], registrationUrl: "https://www.ou.edu/studentlife", driverPerk: "Reserved front-row seating", description: "Celebrate the festival of lights with dance and music performances, traditional food and diyas. Free with registration; tickets go fast." },
  { key: "watch", title: "OU Game Watch Party", organization: "Sooner Union Programming", category: "Sports", location: "Lloyd Noble Center", city: "Norman", lat: 35.1868, lng: -97.4433, daysFromNow: 9, start: [18, 0], hours: 4, departBeforeMin: 30, tags: ["Free food"], registrationUrl: null, driverPerk: "Free pizza for drivers", description: "Watch the Sooners on the big screens with hundreds of fans. Free pizza while it lasts, and wear crimson and cream." },
  { key: "social", title: "SASE Fall Social", organization: "SASE at OU", category: "Social", location: "Devon Energy Hall", city: "Norman", lat: 35.2104, lng: -97.442, daysFromNow: 3, start: [19, 0], hours: 2, departBeforeMin: 15, tags: ["Free food", "Networking"], registrationUrl: null, description: "A relaxed evening of games, snacks and networking to kick off the semester with SASE. New members welcome." },
  { key: "tulsa", title: "Tulsa Tech Summit", organization: "Tulsa Regional Chamber", category: "Conference", location: "Cox Business Convention Center", city: "Tulsa", lat: 36.1497, lng: -95.9931, daysFromNow: 13, start: [9, 0], hours: 8, departBeforeMin: 150, tags: ["Student discount"], registrationUrl: "https://www.tulsachamber.com", driverPerk: "Free lunch voucher", description: "A day of talks and demos from Oklahoma tech companies and startups, with a student track and career booth. Student discount available with an OU email." },
  { key: "festival", title: "Norman International Cultural Festival", organization: "OU International Student Services", category: "Culture", location: "Andrews Park", city: "Norman", lat: 35.2232, lng: -97.4447, daysFromNow: 10, start: [12, 0], hours: 5, departBeforeMin: 20, tags: ["Family friendly", "Food trucks"], registrationUrl: null, description: "Food trucks, performances and booths from student cultural organizations across OU and Norman. Family friendly and free." },
  { key: "concert", title: "Fall Concert on the Oval", organization: "OU School of Music", category: "Music", location: "Catlett Music Center", city: "Norman", lat: 35.2083, lng: -97.4469, daysFromNow: 17, start: [20, 0], hours: 2, departBeforeMin: 15, tags: ["Outdoor"], registrationUrl: null, description: "The OU School of Music's fall showcase with ensembles and soloists. Bring a blanket for the lawn." },
  // Past event: completed trips with reviews, so drivers have ratings.
  { key: "kickoff", title: "SASE Fall Kickoff", organization: "SASE at OU", category: "Social", location: "Oklahoma Memorial Union", city: "Norman", lat: 35.2097, lng: -97.4446, daysFromNow: -21, start: [18, 0], hours: 2, departBeforeMin: 15, tags: ["Free food"], registrationUrl: null, description: "SASE's welcome back kickoff with food and introductions." },
];

// Titles from earlier seeds, deleted so reruns don't leave duplicates behind.
const LEGACY_TITLES = ["OKC Tech & Engineering Career Fair"];

type Going = { role: "driver" | "rider"; pickup: PickupKey; seats?: number };
type SeedAttendance = {
  email: string;
  event: string;
  status: "interested" | "going";
  going?: Going;
  daysAgo: number;
};

const ATTENDANCE: SeedAttendance[] = [];
const going = (email: string, event: string, g: Going, daysAgo = 0) =>
  ATTENDANCE.push({ email, event, status: "going", going: g, daysAgo });
const interested = (email: string, event: string, daysAgo = 0) =>
  ATTENDANCE.push({ email, event, status: "interested", daysAgo });

// Demo accounts. Career fair: 2 drivers and 4 riders at real campus pickups.
going("driver1@ou.edu", "career", { role: "driver", pickup: "union", seats: 3 });
going("driver2@ou.edu", "career", { role: "driver", pickup: "gaylord", seats: 2 });
going("rider1@ou.edu", "career", { role: "rider", pickup: "bizzell" });
going("rider2@ou.edu", "career", { role: "rider", pickup: "adams" });
going("rider3@ou.edu", "career", { role: "rider", pickup: "couch" });
going("rider4@ou.edu", "career", { role: "rider", pickup: "headington" });
going("driver1@ou.edu", "watch", { role: "driver", pickup: "headington", seats: 4 }, 2);
going("rider2@ou.edu", "watch", { role: "rider", pickup: "headington" }, 2);
going("rider4@ou.edu", "watch", { role: "rider", pickup: "union" }, 3);
going("rider3@ou.edu", "watch", { role: "rider", pickup: "bizzell" }, 3);
interested("driver2@ou.edu", "watch", 4);
going("driver2@ou.edu", "social", { role: "driver", pickup: "gaylord", seats: 3 }, 5);
going("rider1@ou.edu", "social", { role: "rider", pickup: "bizzell" }, 5);
interested("rider2@ou.edu", "social", 6);
interested("rider3@ou.edu", "social", 6);
going("driver1@ou.edu", "tulsa", { role: "driver", pickup: "union", seats: 3 }, 8);
interested("rider1@ou.edu", "tulsa", 8);
interested("rider2@ou.edu", "tulsa", 9);
interested("driver2@ou.edu", "tulsa", 9);
interested("rider1@ou.edu", "festival", 10);
interested("rider4@ou.edu", "festival", 10);
interested("rider3@ou.edu", "concert", 11);

// Crowd: spread so each sort (Most going, Trending, Open seats, Soonest) gives a clear order.
const PICKUP_KEYS: PickupKey[] = [
  "union", "bizzell", "adams", "couch", "headington", "gaylord", "sarkeys", "cross",
  "campuscorner", "crimsonpark", "callaway", "jenkins", "traditions", "mainst",
];
const crowdGoing = (i: number, event: string, daysAgo: number) => {
  const u = CROWD[i];
  const isDriver = u.mpg !== null;
  going(u.email, event, { role: isDriver ? "driver" : "rider", pickup: PICKUP_KEYS[i % PICKUP_KEYS.length], seats: isDriver ? 2 + (i % 3) : undefined }, daysAgo);
};
for (let i = 0; i <= 23; i++) crowdGoing(i, "career", i < 14 ? i % 7 : 9 + (i % 6));
for (let i = 24; i <= 31; i++) interested(CROWD[i].email, "career", i < 28 ? 1 : 10);
for (let i = 10; i <= 35; i++) crowdGoing(i, "diwali", i <= 12 ? 1 : 10 + (i % 10));
for (let i = 36; i <= 39; i++) interested(CROWD[i].email, "diwali", 12);
for (const i of [30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 0, 1]) crowdGoing(i, "sasegm", i >= 32 ? i % 5 : 9);
for (let i = 2; i <= 5; i++) interested(CROWD[i].email, "sasegm", 2);
for (let i = 20; i <= 25; i++) crowdGoing(i, "watch", 8 + (i % 4));
for (const i of [26, 27]) interested(CROWD[i].email, "watch", 8);
for (let i = 2; i <= 4; i++) crowdGoing(i, "social", 9);
for (const i of [5, 7, 9]) crowdGoing(i, "tulsa", 10);
for (let i = 11; i <= 13; i++) interested(CROWD[i].email, "tulsa", 10);
for (const i of [14, 15]) crowdGoing(i, "festival", 11);
for (let i = 16; i <= 19; i++) interested(CROWD[i].email, "festival", 11);
crowdGoing(37, "concert", 12);
for (let i = 6; i <= 9; i++) interested(CROWD[i].email, "concert", 12);

// Past kickoff: driver1 drove rider3 and two crowd riders; driver2 drove rider4
// and a crowd rider; one crowd driver drove two crowd riders. Riders reviewed them.
going("driver1@ou.edu", "kickoff", { role: "driver", pickup: "headington", seats: 3 }, 25);
going("driver2@ou.edu", "kickoff", { role: "driver", pickup: "gaylord", seats: 2 }, 25);
going(CROWD[0].email, "kickoff", { role: "driver", pickup: "union", seats: 2 }, 25);
for (const email of ["rider3@ou.edu", "rider4@ou.edu", CROWD[3].email, CROWD[4].email, CROWD[5].email, CROWD[8].email, CROWD[9].email]) {
  going(email, "kickoff", { role: "rider", pickup: "couch" }, 25);
}
const PAST_TRIPS: { driver: string; riders: { email: string; rating: number; comment: string | null }[] }[] = [
  {
    driver: "driver1@ou.edu",
    riders: [
      { email: "rider3@ou.edu", rating: 5, comment: "On time and great music." },
      { email: CROWD[3].email, rating: 5, comment: "Super friendly, would ride again." },
      { email: CROWD[4].email, rating: 4, comment: null },
    ],
  },
  {
    driver: "driver2@ou.edu",
    riders: [
      { email: "rider4@ou.edu", rating: 5, comment: "Smooth drive, coffee stop was a win." },
      { email: CROWD[5].email, rating: 5, comment: null },
    ],
  },
  {
    driver: CROWD[0].email,
    riders: [
      { email: CROWD[8].email, rating: 4, comment: "Good driver." },
      { email: CROWD[9].email, rating: 5, comment: null },
    ],
  },
];

// Pending friend requests so the bell and the Friends page have something to show.
const FRIEND_REQUESTS: [string, string][] = [
  [CROWD[1].email, "rider1@ou.edu"],
  [CROWD[3].email, "driver1@ou.edu"],
  ["rider3@ou.edu", "driver1@ou.edu"],
];

// rider1 and rider2 are friends ("1 friend is going"); driver1 has 3 friends going to the career fair.
const FRIENDSHIPS: [string, string][] = [
  ["rider1@ou.edu", "rider2@ou.edu"],
  ["driver1@ou.edu", CROWD[1].email],
  ["driver1@ou.edu", CROWD[2].email],
  ["driver1@ou.edu", CROWD[7].email],
];

// Wall clock time in America/Chicago, daysFromNow days after today in Chicago.
// Uses the correct UTC offset on each date, so events after Nov 1 are in CST.
function eventTime(daysFromNow: number, hour: number, minute = 0): Date {
  const today = chicagoToday();
  return chicagoToUtc(today.year, today.month, today.day + daysFromNow, hour, minute);
}

// Event photo at public/events/<key>.jpg when one exists; otherwise the app
// shows the category illustration.
function eventImage(key: string): string | null {
  return existsSync(`public/events/${key}.jpg`) ? `/events/${key}.jpg` : null;
}

// Stable Oklahoma style plate per driver, e.g. "KTR-482".
function plateFor(email: string): string {
  let h = 0;
  for (const ch of email) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const letters = "ABCDEFGHJKLMNPRSTUVWXYZ";
  const l = (n: number) => letters[n % letters.length];
  return `${l(h)}${l(h >> 5)}${l(h >> 10)}-${String(h % 1000).padStart(3, "0")}`;
}

function check<T>(label: string, result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data as T;
}

async function findUsersByEmail(): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`list users: ${error.message}`);
    for (const u of data.users) if (u.email) ids.set(u.email.toLowerCase(), u.id);
    if (data.users.length < 1000) break;
  }
  return ids;
}

async function seedUsers(): Promise<Map<string, string>> {
  const existing = await findUsersByEmail();
  const ids = new Map<string, string>();
  const demoEmails = new Set(DEMO.map((u) => u.email));

  for (const u of [...DEMO, ...CROWD]) {
    const meta = { name: u.name, major: u.major };
    let id = existing.get(u.email);
    if (id && demoEmails.has(u.email)) {
      // Reset demo passwords in case they were changed during a demo.
      const { error } = await supabase.auth.admin.updateUserById(id, {
        password: PASSWORD,
        email_confirm: true,
        user_metadata: meta,
      });
      if (error) throw new Error(`update ${u.email}: ${error.message}`);
    } else if (!id) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: meta,
      });
      if (error) throw new Error(`create ${u.email}: ${error.message}`);
      id = data.user.id;
    }
    ids.set(u.email, id);
  }

  check(
    "upsert profiles",
    await supabase.from("profiles").upsert(
      [...DEMO, ...CROWD].map((u) => ({
        id: ids.get(u.email)!,
        email: u.email,
        name: u.name,
        major: u.major,
        year: u.year,
        mpg: u.mpg,
        car_model: u.carModel,
        // Seeded drivers are pre-verified so the demo can start driving right away.
        license_plate: u.mpg !== null ? plateFor(u.email) : null,
        license_state: u.mpg !== null ? "OK" : null,
        license_verified_at: u.mpg !== null ? new Date(Date.now() - 30 * DAY).toISOString() : null,
        bio: u.bio,
        orgs: u.orgs,
        interests: u.interests,
        matches_seen_at: new Date().toISOString(),
      })),
    ),
  );

  return ids;
}

async function seedEvents(): Promise<Map<string, string>> {
  // Deleting seeded events cascades to their attendance, swipes, trips and trip riders.
  check(
    "delete seeded events",
    await supabase.from("events").delete().in("title", [...EVENTS.map((e) => e.title), ...LEGACY_TITLES]),
  );

  const rows = check(
    "insert events",
    await supabase
      .from("events")
      .insert(
        EVENTS.map((e) => {
          const start = eventTime(e.daysFromNow, e.start[0], e.start[1]);
          return {
            title: e.title,
            organization: e.organization,
            category: e.category,
            location: e.location,
            city: e.city,
            lat: e.lat,
            lng: e.lng,
            start_time: start.toISOString(),
            end_time: new Date(start.getTime() + e.hours * 60 * 60 * 1000).toISOString(),
            tags: e.tags,
            requires_registration: e.registrationUrl !== null,
            registration_url: e.registrationUrl,
            driver_perk: e.driverPerk ?? null,
            description: e.description ?? null,
            image_url: eventImage(e.key),
          };
        }),
      )
      .select("id, title"),
  ) as { id: string; title: string }[];

  const ids = new Map<string, string>();
  for (const e of EVENTS) {
    const row = rows.find((r) => r.title === e.title);
    if (!row) throw new Error(`event not inserted: ${e.title}`);
    ids.set(e.key, row.id);
  }
  return ids;
}

async function clearUserRows(userIds: string[]) {
  // Clear seeded users' rows on any other events (e.g. joined during a demo run).
  for (const [table, column] of [
    ["attendance", "user_id"],
    ["swipes", "from_user"],
    ["swipes", "to_user"],
    ["trips", "driver_id"],
    ["trip_riders", "rider_id"],
    ["event_skips", "user_id"],
    ["friends", "user_a"],
    ["friends", "user_b"],
    ["friend_requests", "from_user"],
    ["friend_requests", "to_user"],
    ["reviews", "reviewer_id"],
    ["reviews", "reviewee_id"],
  ] as const) {
    check(`delete ${table}.${column}`, await supabase.from(table).delete().in(column, userIds));
  }
}

async function seedAttendance(users: Map<string, string>, events: Map<string, string>) {
  const byKey = new Map(EVENTS.map((e) => [e.key, e]));
  const now = Date.now();

  const rows = ATTENDANCE.map((a, n) => {
    const ev = byKey.get(a.event)!;
    // Spread join times by a minute each so ordering is stable.
    const joinedAt = new Date(now - a.daysAgo * DAY - n * 60 * 1000).toISOString();
    const base = {
      user_id: users.get(a.email)!,
      event_id: events.get(a.event)!,
      status: a.status,
      joined_at: joinedAt,
      registered: a.status === "going" && ev.registrationUrl !== null,
    };
    if (!a.going) return base;
    const pickup = PICKUP_POINTS[a.going.pickup];
    const start = eventTime(ev.daysFromNow, ev.start[0], ev.start[1]);
    return {
      ...base,
      role: a.going.role,
      pickup_point: pickup.name,
      pickup_lat: pickup.lat,
      pickup_lng: pickup.lng,
      depart_time: new Date(start.getTime() - ev.departBeforeMin * 60 * 1000).toISOString(),
      seats: a.going.role === "driver" ? a.going.seats : null,
      split_gas: true,
    };
  });

  for (let i = 0; i < rows.length; i += 100) {
    // Rows differ in shape (interested rows have no ride fields); defaultToNull: false
    // lets missing columns take their defaults (e.g. split_gas) instead of null.
    check(
      "insert attendance",
      await supabase.from("attendance").insert(rows.slice(i, i + 100), { defaultToNull: false }),
    );
  }
}

async function seedFriends(users: Map<string, string>) {
  const rows = FRIENDSHIPS.map(([e1, e2]) => {
    const [a, b] = [users.get(e1)!, users.get(e2)!].sort();
    return { user_a: a, user_b: b };
  });
  check("insert friends", await supabase.from("friends").insert(rows));
}

async function seedPastTrips(users: Map<string, string>, events: Map<string, string>) {
  const eventId = events.get("kickoff")!;
  const matchedAt = new Date(Date.now() - 22 * DAY).toISOString();
  for (const t of PAST_TRIPS) {
    const driverId = users.get(t.driver)!;
    const [trip] = check(
      "insert past trip",
      await supabase.from("trips").insert({ event_id: eventId, driver_id: driverId, cost_mode: "split" }).select("id"),
    ) as { id: string }[];
    check(
      "insert past riders",
      await supabase
        .from("trip_riders")
        .insert(t.riders.map((r) => ({ trip_id: trip.id, rider_id: users.get(r.email)!, event_id: eventId, matched_at: matchedAt }))),
    );
    check(
      "insert reviews",
      await supabase.from("reviews").insert(
        t.riders.map((r) => ({
          trip_id: trip.id,
          reviewer_id: users.get(r.email)!,
          reviewee_id: driverId,
          rating: r.rating,
          comment: r.comment,
          created_at: new Date(Date.now() - 20 * DAY).toISOString(),
        })),
      ),
    );
  }
}

async function seedFriendRequests(users: Map<string, string>) {
  check(
    "insert friend requests",
    await supabase
      .from("friend_requests")
      .insert(FRIEND_REQUESTS.map(([from, to]) => ({ from_user: users.get(from)!, to_user: users.get(to)! }))),
  );
}

async function main() {
  const users = await seedUsers();
  console.log(`users: ${DEMO.length} demo + ${CROWD.length} crowd`);
  await clearUserRows([...users.values()]);
  const events = await seedEvents();
  console.log(`events: ${events.size}`);
  await seedAttendance(users, events);
  console.log(`attendance: ${ATTENDANCE.length}`);
  await seedFriends(users);
  console.log(`friendships: ${FRIENDSHIPS.length}`);
  await seedPastTrips(users, events);
  console.log(`past trips with reviews: ${PAST_TRIPS.length}`);
  await seedFriendRequests(users);
  console.log(`pending friend requests: ${FRIEND_REQUESTS.length}`);
  console.log(`Done. Demo password: ${PASSWORD}`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
