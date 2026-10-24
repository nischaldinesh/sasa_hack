// Seeds demo users, events, attendance and one friendship.
// Safe to run repeatedly: users are reused, demo rows are deleted and re-inserted.
// Usage: npm run seed
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { PICKUP_POINTS as PICKUPS, type PickupKey } from "../lib/places";
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

type DemoUser = {
  email: string;
  name: string;
  major: string;
  mpg: number | null;
  interests: string[];
};

const USERS: DemoUser[] = [
  { email: "driver1@ou.edu", name: "Jordan Lee", major: "Computer Science", mpg: 30, interests: ["career", "tech", "sports"] },
  { email: "driver2@ou.edu", name: "Priya Patel", major: "Engineering", mpg: 25, interests: ["career", "culture"] },
  { email: "rider1@ou.edu", name: "Maria Gonzalez", major: "Computer Science", mpg: null, interests: ["career", "culture", "music"] },
  { email: "rider2@ou.edu", name: "Kenji Tanaka", major: "Computer Science", mpg: null, interests: ["tech", "sports"] },
  { email: "rider3@ou.edu", name: "Aisha Okafor", major: "Business", mpg: null, interests: ["career", "music"] },
  { email: "rider4@ou.edu", name: "Ethan Brooks", major: "Biology", mpg: null, interests: ["sports", "culture"] },
];

// Placeholder events with real venue coordinates.
// Replace with real upcoming OU events before the demo.
type DemoEvent = {
  key: string;
  title: string;
  organization: string;
  category: string;
  location: string;
  lat: number;
  lng: number;
  daysFromNow: number;
  hour: number; // wall clock hour in America/Chicago
  tags: string[];
};

const EVENTS: DemoEvent[] = [
  { key: "career", title: "OKC Tech & Engineering Career Fair", organization: "OU Career Services", category: "Career", location: "Oklahoma City Convention Center, Oklahoma City", lat: 35.4634, lng: -97.5131, daysFromNow: 6, hour: 10, tags: ["Free entry", "Bring your resume"] },
  { key: "watch", title: "OU Game Watch Party", organization: "Sooner Union Programming", category: "Sports", location: "Lloyd Noble Center, Norman", lat: 35.1868, lng: -97.4433, daysFromNow: 8, hour: 18, tags: ["Free food"] },
  { key: "sase", title: "SASE Fall Social", organization: "SASE at OU", category: "Social", location: "Devon Energy Hall, Norman", lat: 35.2104, lng: -97.442, daysFromNow: 3, hour: 19, tags: ["Free food", "Networking"] },
  { key: "tulsa", title: "Tulsa Tech Summit", organization: "Tulsa Regional Chamber", category: "Conference", location: "Cox Business Convention Center, Tulsa", lat: 36.1497, lng: -95.9931, daysFromNow: 13, hour: 9, tags: ["Student discount"] },
  { key: "festival", title: "Norman International Cultural Festival", organization: "OU International Student Services", category: "Culture", location: "Andrews Park, Norman", lat: 35.2232, lng: -97.4447, daysFromNow: 10, hour: 12, tags: ["Family friendly", "Food trucks"] },
  { key: "concert", title: "Fall Concert on the Oval", organization: "OU School of Music", category: "Music", location: "Catlett Music Center, Norman", lat: 35.2083, lng: -97.4469, daysFromNow: 17, hour: 20, tags: ["Outdoor"] },
];

type DemoAttendance =
  | { user: string; event: string; status: "interested" }
  | { user: string; event: string; status: "going"; role: "rider"; pickup: PickupKey; departHour: number }
  | { user: string; event: string; status: "going"; role: "driver"; pickup: PickupKey; departHour: number; seats: number };

// Popularity order by going: career (6) > watch (4) > sase (2) > tulsa (1) > festival (0) > concert (0).
const ATTENDANCE: DemoAttendance[] = [
  // Career fair: 2 drivers, 4 riders at real campus pickups.
  { user: "driver1@ou.edu", event: "career", status: "going", role: "driver", pickup: "union", departHour: 9, seats: 3 },
  { user: "driver2@ou.edu", event: "career", status: "going", role: "driver", pickup: "gaylord", departHour: 9, seats: 2 },
  { user: "rider1@ou.edu", event: "career", status: "going", role: "rider", pickup: "bizzell", departHour: 9 },
  { user: "rider2@ou.edu", event: "career", status: "going", role: "rider", pickup: "union", departHour: 9 },
  { user: "rider3@ou.edu", event: "career", status: "going", role: "rider", pickup: "headington", departHour: 9 },
  { user: "rider4@ou.edu", event: "career", status: "going", role: "rider", pickup: "gaylord", departHour: 9 },
  // Watch party.
  { user: "driver1@ou.edu", event: "watch", status: "going", role: "driver", pickup: "headington", departHour: 17, seats: 4 },
  { user: "rider2@ou.edu", event: "watch", status: "going", role: "rider", pickup: "headington", departHour: 17 },
  { user: "rider4@ou.edu", event: "watch", status: "going", role: "rider", pickup: "union", departHour: 17 },
  { user: "rider3@ou.edu", event: "watch", status: "going", role: "rider", pickup: "bizzell", departHour: 17 },
  { user: "driver2@ou.edu", event: "watch", status: "interested" },
  // SASE social.
  { user: "driver2@ou.edu", event: "sase", status: "going", role: "driver", pickup: "gaylord", departHour: 18, seats: 3 },
  { user: "rider1@ou.edu", event: "sase", status: "going", role: "rider", pickup: "bizzell", departHour: 18 },
  { user: "rider2@ou.edu", event: "sase", status: "interested" },
  { user: "rider3@ou.edu", event: "sase", status: "interested" },
  // Tulsa summit.
  { user: "driver1@ou.edu", event: "tulsa", status: "going", role: "driver", pickup: "union", departHour: 6, seats: 3 },
  { user: "rider1@ou.edu", event: "tulsa", status: "interested" },
  { user: "rider2@ou.edu", event: "tulsa", status: "interested" },
  { user: "driver2@ou.edu", event: "tulsa", status: "interested" },
  // Cultural festival.
  { user: "rider1@ou.edu", event: "festival", status: "interested" },
  { user: "rider4@ou.edu", event: "festival", status: "interested" },
  // Concert.
  { user: "rider3@ou.edu", event: "concert", status: "interested" },
];

// rider1 and rider2 are friends, so rider1 sees "1 friend is going" on the career fair.
const FRIENDSHIPS: [string, string][] = [["rider1@ou.edu", "rider2@ou.edu"]];

// Wall clock time in America/Chicago, daysFromNow days after today in Chicago.
// Uses the correct UTC offset on each date, so events after Nov 1 are in CST.
function eventTime(daysFromNow: number, localHour: number): string {
  const today = chicagoToday();
  return chicagoToUtc(today.year, today.month, today.day + daysFromNow, localHour).toISOString();
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

  for (const u of USERS) {
    const meta = { name: u.name, major: u.major };
    let id = existing.get(u.email);
    if (id) {
      const { error } = await supabase.auth.admin.updateUserById(id, {
        password: PASSWORD,
        email_confirm: true,
        user_metadata: meta,
      });
      if (error) throw new Error(`update ${u.email}: ${error.message}`);
    } else {
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
      USERS.map((u) => ({
        id: ids.get(u.email)!,
        email: u.email,
        name: u.name,
        major: u.major,
        mpg: u.mpg,
        interests: u.interests,
      })),
    ),
  );

  return ids;
}

async function seedEvents(): Promise<Map<string, string>> {
  // Deleting demo events cascades to their attendance, swipes, trips and trip riders.
  check(
    "delete demo events",
    await supabase.from("events").delete().in("title", EVENTS.map((e) => e.title)),
  );

  const rows = check(
    "insert events",
    await supabase
      .from("events")
      .insert(
        EVENTS.map((e) => ({
          title: e.title,
          organization: e.organization,
          category: e.category,
          location: e.location,
          lat: e.lat,
          lng: e.lng,
          start_time: eventTime(e.daysFromNow, e.hour),
          tags: e.tags,
        })),
      )
      .select("id, title"),
  );

  const ids = new Map<string, string>();
  for (const e of EVENTS) {
    const row = rows.find((r) => r.title === e.title);
    if (!row) throw new Error(`event not inserted: ${e.title}`);
    ids.set(e.key, row.id);
  }
  return ids;
}

async function seedAttendance(users: Map<string, string>, events: Map<string, string>) {
  const userIds = [...users.values()];
  // Clear demo users' rows on any other events (e.g. joined during a demo run).
  check("delete demo attendance", await supabase.from("attendance").delete().in("user_id", userIds));
  check("delete demo swipes", await supabase.from("swipes").delete().in("from_user", userIds));
  check("delete demo trips", await supabase.from("trips").delete().in("driver_id", userIds));
  check("delete demo trip riders", await supabase.from("trip_riders").delete().in("rider_id", userIds));

  const byKey = new Map(EVENTS.map((e) => [e.key, e]));
  const rows = ATTENDANCE.map((a) => {
    const base = { user_id: users.get(a.user)!, event_id: events.get(a.event)!, status: a.status };
    if (a.status === "interested") return base;
    const ev = byKey.get(a.event)!;
    const pickup = PICKUPS[a.pickup];
    return {
      ...base,
      role: a.role,
      pickup_point: pickup.name,
      pickup_lat: pickup.lat,
      pickup_lng: pickup.lng,
      depart_time: eventTime(ev.daysFromNow, a.departHour),
      seats: a.role === "driver" ? a.seats : null,
    };
  });

  check("insert attendance", await supabase.from("attendance").insert(rows));
}

async function seedFriends(users: Map<string, string>) {
  const userIds = [...users.values()];
  check("delete demo friends a", await supabase.from("friends").delete().in("user_a", userIds));
  check("delete demo friends b", await supabase.from("friends").delete().in("user_b", userIds));

  const rows = FRIENDSHIPS.map(([e1, e2]) => {
    const [a, b] = [users.get(e1)!, users.get(e2)!].sort();
    return { user_a: a, user_b: b };
  });
  check("insert friends", await supabase.from("friends").insert(rows));
}

async function main() {
  const users = await seedUsers();
  console.log(`users: ${users.size}`);
  const events = await seedEvents();
  console.log(`events: ${events.size}`);
  await seedAttendance(users, events);
  console.log(`attendance: ${ATTENDANCE.length}`);
  await seedFriends(users);
  console.log(`friendships: ${FRIENDSHIPS.length}`);
  console.log(`Done. Demo password: ${PASSWORD}`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
