import type { SupabaseClient } from "@supabase/supabase-js";
import { buildEventSummaries } from "./events";
import type { AttendanceRow, EventRow, EventSummary, FriendRow, PopularityRow, TripRiderRow, TripRow } from "./types";

// Loads events with counts, friends going, open seats and my status.
// Pass eventId to load one event (past events included); otherwise upcoming events only.
// Throws on any Supabase error; the route's error.tsx shows a short message.
export async function getEventSummaries(
  supabase: SupabaseClient,
  userId: string,
  eventId?: string,
): Promise<EventSummary[]> {
  let eventsQuery = supabase.from("events").select("*").order("start_time");
  eventsQuery = eventId
    ? eventsQuery.eq("id", eventId)
    : eventsQuery.gte("start_time", new Date().toISOString());

  let attendanceQuery = supabase.from("attendance").select("user_id, event_id, status, role, seats");
  let popularityQuery = supabase.from("event_popularity").select("id, going, interested, new_this_week");
  let tripsQuery = supabase.from("trips").select("id, event_id, driver_id");
  let ridersQuery = supabase.from("trip_riders").select("trip_id, rider_id, event_id");
  if (eventId) {
    attendanceQuery = attendanceQuery.eq("event_id", eventId);
    popularityQuery = popularityQuery.eq("id", eventId);
    tripsQuery = tripsQuery.eq("event_id", eventId);
    ridersQuery = ridersQuery.eq("event_id", eventId);
  }

  const [events, popularity, attendance, friends, trips, tripRiders] = await Promise.all([
    eventsQuery,
    popularityQuery,
    attendanceQuery,
    supabase.from("friends").select("user_a, user_b").or(`user_a.eq.${userId},user_b.eq.${userId}`),
    tripsQuery,
    ridersQuery,
  ]);

  for (const r of [events, popularity, attendance, friends, trips, tripRiders]) {
    if (r.error) throw new Error(r.error.message);
  }

  return buildEventSummaries({
    userId,
    events: (events.data ?? []) as EventRow[],
    popularity: (popularity.data ?? []) as PopularityRow[],
    attendance: (attendance.data ?? []) as AttendanceRow[],
    friends: (friends.data ?? []) as FriendRow[],
    trips: (trips.data ?? []) as TripRow[],
    tripRiders: (tripRiders.data ?? []) as TripRiderRow[],
  });
}
