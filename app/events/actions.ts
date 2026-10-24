"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PICKUP_POINTS, isPickupKey } from "@/lib/places";
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

// Join form on the event page: going as a driver or a rider.
export async function joinEvent(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const eventId = String(formData.get("eventId") ?? "");
  const role = String(formData.get("role") ?? "");
  const pickupKey = String(formData.get("pickup") ?? "");

  if (role !== "driver" && role !== "rider") return { error: "Choose driver or rider." };
  if (!isPickupKey(pickupKey)) return { error: "Choose a pickup point." };
  const pickup = PICKUP_POINTS[pickupKey];

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

  let seats: number | null = null;
  let departTime: string | null = null;

  if (role === "driver") {
    seats = Number(formData.get("seats"));
    const mpg = Number(formData.get("mpg"));
    const depart = parseChicagoInput(String(formData.get("depart") ?? ""));

    if (!Number.isInteger(seats) || seats < 1 || seats > 7) return { error: "Seats must be between 1 and 7." };
    if (!Number.isFinite(mpg) || mpg <= 0 || mpg > 150) return { error: "Enter your car's mpg (for example 30)." };
    if (!depart) return { error: "Enter a departure time." };
    if (depart.getTime() >= Date.parse(event.start_time)) {
      return { error: "Departure must be before the event starts." };
    }
    if (depart.getTime() < Date.now()) return { error: "Departure time is in the past." };
    departTime = depart.toISOString();

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
      depart_time: departTime,
      seats,
    },
    { onConflict: "user_id,event_id" },
  );
  if (error) return { error: "Couldn't join this event. Try again." };

  refresh();
  return { message: role === "driver" ? "You're driving! 🚗" : "You're going as a rider!" };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
