"use server";

import { refresh } from "next/cache";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isDemoEmail } from "@/lib/demoData";
import { resetDemoAccount } from "@/lib/demoReset";
import type { ActionResult } from "@/app/events/actions";

// "Reset demo" on Discover: puts the signed-in demo account back to its seeded
// state. Refused for any account that isn't one of the 6 demo logins.
export async function resetMyDemo(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Sign in again." };
  if (!isDemoEmail(user.email)) return { error: "Only demo accounts can be reset." };

  try {
    await resetDemoAccount(createAdminClient(), user.email!);
  } catch (err) {
    console.error("demo reset failed:", err);
    return { error: "Couldn't reset the demo. Try again, or run npm run seed." };
  }

  refresh();
  return { message: "Demo reset. Ready for the next person!" };
}
