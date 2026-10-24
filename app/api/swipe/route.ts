import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { SwipeError, parseSwipeBody, recordSwipe } from "@/lib/match";

// POST { toUser, eventId, direction } -> { matched, tripId?, full? }
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const body = parseSwipeBody(await request.json().catch(() => null));
    const result = await recordSwipe(createAdminClient(), user.id, body);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof SwipeError) {
      if (err.status >= 500) console.error("swipe failed:", err.message);
      return NextResponse.json(
        { error: err.status >= 500 ? "Couldn't save that swipe. Try again." : err.message },
        { status: err.status },
      );
    }
    console.error("swipe failed:", err);
    return NextResponse.json({ error: "Couldn't save that swipe. Try again." }, { status: 500 });
  }
}
