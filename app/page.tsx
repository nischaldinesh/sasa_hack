"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { isOuEmail } from "@/lib/auth";

type Mode = "signin" | "signup";

const MAJORS = ["Computer Science", "Engineering", "Business", "Biology", "Other"];

// Creates the profiles row on first sign in if it is missing. The database
// rejects non @ou.edu emails here too (profiles.email check constraint).
async function ensureProfile(supabase: SupabaseClient, user: User) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (error) return error.message;
  if (data) return null;

  const meta = user.user_metadata as { name?: string; major?: string };
  const { error: insertError } = await supabase.from("profiles").insert({
    id: user.id,
    email: user.email,
    name: meta.name || user.email?.split("@")[0] || "Sooner",
    major: meta.major || null,
  });
  if (insertError) {
    return insertError.code === "23514"
      ? "Only @ou.edu emails can use SoonerSwipe."
      : insertError.message;
  }
  return null;
}

export default function AuthPage() {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [major, setMajor] = useState(MAJORS[0]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!isOuEmail(cleanEmail)) {
      setError("Use your @ou.edu email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (mode === "signup" && !name.trim()) {
      setError("Enter your name.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { data: { name: name.trim(), major } },
        });
        if (error) return setError(error.message);
        if (!data.session || !data.user) {
          return setNotice("Check your inbox to confirm your email, then sign in.");
        }
        const profileError = await ensureProfile(supabase, data.user);
        if (profileError) {
          await supabase.auth.signOut();
          return setError(profileError);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error) return setError(error.message);
        const profileError = await ensureProfile(supabase, data.user);
        if (profileError) {
          await supabase.auth.signOut();
          return setError(profileError);
        }
      }
      router.replace("/events");
      router.refresh();
    } catch {
      setError("Something went wrong. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const input =
    "h-12 rounded-xl border border-zinc-300 bg-transparent px-4 text-base dark:border-zinc-700";

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 p-4">
      <div>
        <h1 className="text-3xl font-bold text-red-800 dark:text-red-500">SoonerSwipe</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Swipe on OU events. Share the ride.
        </p>
      </div>

      <div className="grid grid-cols-2 rounded-full bg-zinc-100 p-1 dark:bg-zinc-900">
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError(null);
              setNotice(null);
            }}
            className={`h-10 rounded-full font-medium ${
              mode === m ? "bg-white shadow dark:bg-zinc-800" : "text-zinc-500"
            }`}
          >
            {m === "signin" ? "Sign in" : "Sign up"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
        {mode === "signup" && (
          <>
            <input
              className={input}
              placeholder="Full name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <select
              className={input}
              value={major}
              onChange={(e) => setMajor(e.target.value)}
              aria-label="Major"
            >
              {MAJORS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </>
        )}
        <input
          className={input}
          type="email"
          placeholder="you@ou.edu"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className={input}
          type="password"
          placeholder="Password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        {notice && <p className="text-sm text-green-700">{notice}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 h-12 rounded-full bg-red-800 font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>
    </main>
  );
}
