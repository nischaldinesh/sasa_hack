"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/app/events/actions";

// "Add your crewmates as friends". Stores each pair as (min id, max id) and
// ignores pairs that are already friends.
export async function addFriends(friendIds: string[]): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Sign in again." };

  const rows = [...new Set(friendIds)]
    .filter((id) => id !== user.id)
    .map((id) => {
      const [a, b] = [user.id, id].sort();
      return { user_a: a, user_b: b };
    });
  if (rows.length === 0) return {};

  const { error } = await supabase.from("friends").upsert(rows, { onConflict: "user_a,user_b", ignoreDuplicates: true });
  if (error) return { error: "Couldn't add friends. Try again." };

  refresh();
  return { message: rows.length === 1 ? "Friend added!" : "Friends added!" };
}
