"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/app/events/actions";

// A rider rates their driver after drop off. Re-rating updates the review.
export async function submitReview(tripId: string, rating: number, comment: string): Promise<ActionResult> {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "Pick 1 to 5 stars." };
  const text = comment.trim().slice(0, 500);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Sign in again." };

  const { data: trip, error: tripError } = await supabase.from("trips").select("driver_id").eq("id", tripId).maybeSingle();
  if (tripError || !trip) return { error: "That trip no longer exists." };

  // RLS also checks that I'm a rider in this trip and the reviewee is its driver.
  const { error } = await supabase.from("reviews").upsert(
    { trip_id: tripId, reviewer_id: user.id, reviewee_id: trip.driver_id, rating, comment: text || null },
    { onConflict: "trip_id,reviewer_id" },
  );
  if (error) return { error: "Only riders on this trip can review the driver." };

  refresh();
  return { message: "Thanks for the review!" };
}
