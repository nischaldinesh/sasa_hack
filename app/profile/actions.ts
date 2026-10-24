"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/app/events/actions";

const YEARS = ["Freshman", "Sophomore", "Junior", "Senior", "Graduate"];

export async function updateProfile(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const text = (key: string, max: number) => String(formData.get(key) ?? "").trim().slice(0, max);
  const name = text("name", 80);
  const major = text("major", 80);
  const year = text("year", 20);
  const bio = text("bio", 280);
  const carModel = text("carModel", 60);
  const mpgRaw = text("mpg", 10);
  const orgs = text("orgs", 300)
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean)
    .slice(0, 6);

  if (!name) return { error: "Enter your name." };
  if (year && !YEARS.includes(year)) return { error: "Choose a year from the list." };
  const mpg = mpgRaw ? Number(mpgRaw) : null;
  if (mpg !== null && (!Number.isFinite(mpg) || mpg <= 0 || mpg > 150)) return { error: "Enter a valid mpg (for example 30)." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Sign in again." };

  const { error } = await supabase
    .from("profiles")
    .update({
      name,
      major: major || null,
      year: year || null,
      bio: bio || null,
      orgs,
      car_model: carModel || null,
      mpg,
    })
    .eq("id", user.id);
  if (error) return { error: "Couldn't save your profile. Try again." };

  refresh();
  return { message: "Profile saved." };
}

// Visiting /matches clears the bell dot.
export async function markMatchesSeen(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Sign in again." };

  const { error } = await supabase.from("profiles").update({ matches_seen_at: new Date().toISOString() }).eq("id", user.id);
  return error ? { error: "Couldn't update notifications." } : {};
}
