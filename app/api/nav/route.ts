import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMatches } from "@/lib/queries";

// GET -> { name, unseenMatches } for the navbar avatar and the bell dot.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const [{ data: profile }, matches] = await Promise.all([
      supabase.from("profiles").select("name").eq("id", user.id).maybeSingle(),
      getMatches(supabase, user.id),
    ]);
    return NextResponse.json(
      { name: profile?.name ?? user.email ?? "", unseenMatches: matches.filter((m) => m.unseen).length },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("nav failed:", err);
    return NextResponse.json({ error: "Couldn't load" }, { status: 500 });
  }
}
