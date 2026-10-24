"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { PICKUP_POINTS, isPickupKey } from "@/lib/places";
import { getTripLock } from "@/lib/queries";
import { parseChicagoInput } from "@/lib/time";

export type ActionResult = { error?: string; message?: string };

// Right swipe on an event. Inserts an "interested" row only if none exists,
// so an existing "going" row is never downgraded.
export async function markInterested(eventId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Sign in again." };

  const { error } = await supabase
    .from("attendance")
    .upsert(
      { user_id: user.id, event_id: eventId, status: "interested" },
      { onConflict: "user_id,event_id", ignoreDuplicates: true },
    );
  if (error) return { error: "Couldn't save that swipe. Try again." };

  refresh();
  return {};
}

// Registration sheet: "Register Now" or "I've already registered".
// Keeps an existing going row; creates an interested row if there is none.
export async function markRegistered(eventId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Sign in again." };

  const { data, error } = await supabase
    .from("attendance")
    .update({ registered: true })
    .eq("user_id", user.id)
    .eq("event_id", eventId)
    .select("user_id");
  if (error) return { error: "Couldn't save your registration. Try again." };
  if (!data?.length) {
    const { error: insertError } = await supabase
      .from("attendance")
      .insert({ user_id: user.id, event_id: eventId, status: "interested", registered: true });
    if (insertError) return { error: "Couldn't save your registration. Try again." };
  }
  return {};
}

// Left swipe on an event: remember it so the event stays out of the deck.
export async function markSkipped(eventId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Sign in again." };

  const { error } = await supabase
    .from("event_skips")
    .upsert({ user_id: user.id, event_id: eventId }, { onConflict: "user_id,event_id", ignoreDuplicates: true });
  if (error) return { error: "Couldn't save that skip. Try again." };
  return {};
}

// Clears my swipes (both directions) and my empty trip for an event, so a new
// role or a later rejoin starts with a clean deck. Server only: swipes and
// trips are written with the service role.
async function resetMatching(userId: string, eventId: string) {
  const admin = createAdminClient();
  await Promise.all([
    admin.from("swipes").delete().eq("event_id", eventId).or(`from_user.eq.${userId},to_user.eq.${userId}`),
    admin.from("trips").delete().eq("event_id", eventId).eq("driver_id", userId),
  ]);
}

const LOCKED = "You're in a trip for this event, so you can't change your role or leave.";

// "How are you going?": going as a driver or a rider. Returns where to go next.
export async function joinEvent(_prev: ActionResult, formData: FormData): Promise<ActionResult & { next?: string }> {
  const eventId = String(formData.get("eventId") ?? "");
  const role = String(formData.get("role") ?? "");
  const pickupKey = String(formData.get("pickup") ?? "");

  if (role !== "driver" && role !== "rider") return { error: "Choose I'm driving or I need a ride." };
  if (!isPickupKey(pickupKey)) return { error: "Choose a pickup spot from the list." };
  const pickup = PICKUP_POINTS[pickupKey];
  const depart = parseChicagoInput(String(formData.get("depart") ?? ""));
  if (!depart) return { error: "Enter a departure time." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Sign in again." };

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("start_time")
    .eq("id", eventId)
    .maybeSingle();
  if (eventError || !event) return { error: "That event no longer exists." };
  if (depart.getTime() >= Date.parse(event.start_time)) return { error: "Departure must be before the event starts." };
  if (depart.getTime() < Date.now()) return { error: "Departure time is in the past." };

  const [{ locked, riderCount }, { data: current }] = await Promise.all([
    getTripLock(supabase, user.id, eventId),
    supabase.from("attendance").select("status, role").eq("user_id", user.id).eq("event_id", eventId).maybeSingle(),
  ]);
  const roleChanged = current?.status === "going" && current.role !== role;
  if (locked && roleChanged) return { error: LOCKED };

  let seats: number | null = null;
  let splitGas = true;
  if (role === "driver") {
    seats = Number(formData.get("seats"));
    const mpg = Number(formData.get("mpg"));
    splitGas = formData.get("splitGas") === "on";
    if (!Number.isInteger(seats) || seats < 1 || seats > 7) return { error: "Seats must be between 1 and 7." };
    if (seats < riderCount) return { error: `You already have ${riderCount} riders, so you need at least ${riderCount} seats.` };
    if (!Number.isFinite(mpg) || mpg <= 0 || mpg > 150) return { error: "Enter your car's mpg (for example 30)." };

    const { error: mpgError } = await supabase.from("profiles").update({ mpg }).eq("id", user.id);
    if (mpgError) return { error: "Couldn't save your mpg. Try again." };
  }

  const { error } = await supabase.from("attendance").upsert(
    {
      user_id: user.id,
      event_id: eventId,
      status: "going",
      role,
      pickup_point: pickup.name,
      pickup_lat: pickup.lat,
      pickup_lng: pickup.lng,
      depart_time: depart.toISOString(),
      seats,
      split_gas: splitGas,
    },
    { onConflict: "user_id,event_id" },
  );
  if (error) return { error: "Couldn't join this event. Try again." };

  const admin = createAdminClient();
  if (roleChanged) await resetMatching(user.id, eventId);
  else if (role === "driver") {
    // Keep an existing trip's cost mode in sync with the split gas toggle.
    await admin
      .from("trips")
      .update({ cost_mode: splitGas ? "split" : "free" })
      .eq("event_id", eventId)
      .eq("driver_id", user.id);
  }

  refresh();
  return { next: `/events/${eventId}/people` };
}

// Leave an event I'm going to. Blocked once I'm in a trip for it.
export async function leaveEvent(eventId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Sign in again." };

  const { locked } = await getTripLock(supabase, user.id, eventId);
  if (locked) return { error: LOCKED };

  const { error } = await supabase.from("attendance").delete().eq("user_id", user.id).eq("event_id", eventId);
  if (error) return { error: "Couldn't leave this event. Try again." };
  await resetMatching(user.id, eventId);

  refresh();
  return { message: "You left this event." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
