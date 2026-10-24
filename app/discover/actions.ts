"use server";

import { refresh } from "next/cache";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { resetAccount } from "@/lib/demoReset";
import type { ActionResult } from "@/app/events/actions";

// "Reset demo" on Discover: resets only the signed-in account (seeded accounts
// go back to their seeded state, others are cleared).
export async function resetMyDemo(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Your session expired. Sign in again." };

  try {
    await resetAccount(createAdminClient(), { id: user.id, email: user.email });
  } catch (err) {
    console.error("demo reset failed:", err);
    return { error: "Couldn't reset the demo. Try again, or run npm run seed." };
  }

  refresh();
  return { message: "Demo reset. Ready for the next person!" };
}
