import type { SupabaseClient } from "@supabase/supabase-js";

// Match flow for POST /api/swipe (AGENTS.md 6.4). Pass the service role
// client: swipes, trips and trip_riders are only written on the server.

export type SwipeBody = { toUser: string; eventId: string; direction: "left" | "right" };
export type SwipeResult = { matched: false; full?: true } | { matched: true; tripId: string };

export class SwipeError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseSwipeBody(body: unknown): SwipeBody {
  const b = (body ?? {}) as Record<string, unknown>;
  const { toUser, eventId, direction } = b;
  if (typeof toUser !== "string" || !UUID.test(toUser)) throw new SwipeError(400, "Invalid toUser");
  if (typeof eventId !== "string" || !UUID.test(eventId)) throw new SwipeError(400, "Invalid eventId");
  if (direction !== "left" && direction !== "right") throw new SwipeError(400, "Invalid direction");
  return { toUser, eventId, direction };
}

function fail(label: string, error: { message: string }): never {
  throw new SwipeError(500, `${label}: ${error.message}`);
}

export async function recordSwipe(admin: SupabaseClient, meId: string, body: SwipeBody): Promise<SwipeResult> {
  const { toUser, eventId, direction } = body;
  if (toUser === meId) throw new SwipeError(400, "You can't swipe on yourself");

  const { data: rows, error: attendanceError } = await admin
    .from("attendance")
    .select("user_id, status, role, seats")
    .eq("event_id", eventId)
    .in("user_id", [meId, toUser]);
  if (attendanceError) fail("attendance", attendanceError);
  const mine = rows?.find((r) => r.user_id === meId);
  const theirs = rows?.find((r) => r.user_id === toUser);
  if (mine?.status !== "going" || !mine.role) throw new SwipeError(409, "Join this event before swiping on people");
  if (theirs?.status !== "going" || !theirs.role) throw new SwipeError(409, "That person is no longer going");

  // 2. Record the swipe (a later swipe replaces an earlier one).
  const { error: swipeError } = await admin
    .from("swipes")
    .upsert({ from_user: meId, to_user: toUser, event_id: eventId, direction }, { onConflict: "from_user,to_user,event_id" });
  if (swipeError) fail("swipe", swipeError);

  // 3. Left swipes never match.
  if (direction === "left") return { matched: false };

  // 4. Reciprocal right swipe?
  const { data: reciprocal, error: reciprocalError } = await admin
    .from("swipes")
    .select("direction")
    .eq("from_user", toUser)
    .eq("to_user", meId)
    .eq("event_id", eventId)
    .eq("direction", "right")
    .maybeSingle();
  if (reciprocalError) fail("reciprocal", reciprocalError);
  if (!reciprocal) return { matched: false };

  // 5. One driver, one rider.
  if (mine.role === theirs.role) return { matched: false };
  const [driver, riderId] = mine.role === "driver" ? [mine, toUser] : [theirs, meId];
  const seats = driver.seats ?? 0;

  // 6. Get or create the driver's trip for this event.
  const { error: tripInsertError } = await admin
    .from("trips")
    .upsert({ event_id: eventId, driver_id: driver.user_id }, { onConflict: "event_id,driver_id", ignoreDuplicates: true });
  if (tripInsertError) fail("trip", tripInsertError);
  const { data: trip, error: tripError } = await admin
    .from("trips")
    .select("id")
    .eq("event_id", eventId)
    .eq("driver_id", driver.user_id)
    .single();
  if (tripError) fail("trip", tripError);

  const { data: riders, error: ridersError } = await admin
    .from("trip_riders")
    .select("rider_id")
    .eq("trip_id", trip.id);
  if (ridersError) fail("riders", ridersError);
  if (riders.some((r) => r.rider_id === riderId)) return { matched: true, tripId: trip.id };

  // 7. Car full?
  if (riders.length >= seats) return { matched: false, full: true };

  // 8. Add the rider. A unique violation means they are already in a car for this event.
  const { error: insertError } = await admin
    .from("trip_riders")
    .insert({ trip_id: trip.id, rider_id: riderId, event_id: eventId });
  if (insertError) {
    if (insertError.code === "23505") return { matched: false };
    fail("trip rider", insertError);
  }

  // 9. Matched.
  return { matched: true, tripId: trip.id };
}
