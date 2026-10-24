"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/app/events/actions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function pair(a: string, b: string) {
  const [user_a, user_b] = [a, b].sort();
  return { user_a, user_b };
}

// "Add your crewmates as friends": sends a request to each person. If they
// already sent me one, that request is accepted instead. Friendships are only
// created when someone accepts.
export async function sendFriendRequests(ids: string[]): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Sign in again." };

  const targets = [...new Set(ids)].filter((id) => UUID.test(id) && id !== user.id);
  if (targets.length === 0) return {};

  const [{ data: incoming, error: incomingError }, { data: friends, error: friendsError }] = await Promise.all([
    supabase.from("friend_requests").select("from_user").eq("to_user", user.id).eq("status", "pending").in("from_user", targets),
    supabase.from("friends").select("user_a, user_b").or(`user_a.eq.${user.id},user_b.eq.${user.id}`),
  ]);
  if (incomingError || friendsError) return { error: "Couldn't send friend requests. Try again." };

  const friendIds = new Set((friends ?? []).map((f) => (f.user_a === user.id ? f.user_b : f.user_a)));
  const theyAsked = new Set((incoming ?? []).map((r) => r.from_user));

  for (const id of targets) {
    if (friendIds.has(id)) continue;
    if (theyAsked.has(id)) {
      const result = await respondToRequest(id, true);
      if (result.error) return result;
      continue;
    }
    const { error } = await supabase
      .from("friend_requests")
      .upsert(
        { from_user: user.id, to_user: id, status: "pending", created_at: new Date().toISOString(), responded_at: null },
        { onConflict: "from_user,to_user" },
      );
    if (error) return { error: "Couldn't send friend requests. Try again." };
  }

  refresh();
  return { message: targets.length === 1 ? "Friend request sent." : "Friend requests sent." };
}

// Accept or decline a request someone sent me. Accepting creates the friendship.
export async function respondToRequest(fromId: string, accept: boolean): Promise<ActionResult> {
  if (!UUID.test(fromId)) return { error: "Invalid request." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Sign in again." };

  const { data, error } = await supabase
    .from("friend_requests")
    .update({ status: accept ? "accepted" : "declined", responded_at: new Date().toISOString() })
    .eq("from_user", fromId)
    .eq("to_user", user.id)
    .eq("status", "pending")
    .select("from_user");
  if (error) return { error: "Couldn't update that request. Try again." };
  if (!data?.length) return { error: "That request is no longer pending." };

  if (accept) {
    const { error: friendError } = await supabase
      .from("friends")
      .upsert(pair(user.id, fromId), { onConflict: "user_a,user_b", ignoreDuplicates: true });
    if (friendError) return { error: "Couldn't add your friend. Try again." };
  }

  refresh();
  return { message: accept ? "You're now friends!" : "Request declined." };
}
