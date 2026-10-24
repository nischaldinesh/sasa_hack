import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPartners, getTripDetail } from "@/lib/queries";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET ?eventId= -> { tripId, partners, trip }. Polled every 3 s by the people
// deck so the person who swiped first also sees the match without reloading.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const eventId = request.nextUrl.searchParams.get("eventId") ?? "";
  if (!UUID.test(eventId)) return NextResponse.json({ error: "Invalid eventId" }, { status: 400 });

  try {
    const { tripId, partners } = await getPartners(supabase, user.id, eventId);
    const trip = tripId ? await getTripDetail(supabase, user.id, tripId) : null;
    return NextResponse.json({ tripId, partners, trip }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("match status failed:", err);
    return NextResponse.json({ error: "Couldn't check for matches" }, { status: 500 });
  }
}
