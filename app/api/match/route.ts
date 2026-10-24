import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPartners } from "@/lib/queries";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET ?eventId= -> { tripId, partners }. Polled every 3 s by the event page so
// the person who swiped first also sees "It's a match" without reloading.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const eventId = request.nextUrl.searchParams.get("eventId") ?? "";
  if (!UUID.test(eventId)) return NextResponse.json({ error: "Invalid eventId" }, { status: 400 });

  try {
    return NextResponse.json(await getPartners(supabase, user.id, eventId), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("match status failed:", err);
    return NextResponse.json({ error: "Couldn't check for matches" }, { status: 500 });
  }
}
