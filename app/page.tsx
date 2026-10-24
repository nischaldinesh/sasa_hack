"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import Logo from "@/components/Logo";
import { ChevronLeftIcon, CheckCircleIcon, LockIcon, MailIcon, StarIcon, UserIcon } from "@/components/Icons";
import { createClient } from "@/lib/supabase/client";
import { isOuEmail } from "@/lib/auth";

type Step = "email" | "password" | "signup";

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

const FEATURES = [
  { title: "Swipe to connect", body: "Find riders going your way", icon: <span className="font-black">◠</span>, tint: "bg-crimson-soft text-crimson" },
  { title: "Split gas fairly", body: "Auto-calculated per rider", icon: <CheckCircleIcon />, tint: "bg-green-50 text-green-600" },
  { title: "Leave as friends", body: "Every trip grows your network", icon: <StarIcon />, tint: "bg-blue-50 text-blue-500" },
];

function Feature({ title, body, icon, tint }: { title: string; body: string; icon: ReactNode; tint: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl ${tint}`}>{icon}</span>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-zinc-400">{body}</p>
      </div>
    </div>
  );
}

function Field({ icon, ...props }: { icon: ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex h-14 items-center gap-3 rounded-2xl border-2 border-zinc-200 bg-white px-4 focus-within:border-crimson">
      <span className="text-xl text-zinc-400">{icon}</span>
      <input className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-zinc-400" {...props} />
    </label>
  );
}

export default function AuthPage() {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function go(next: Step) {
    setStep(next);
    setError(null);
    setNotice(null);
  }

  function handleEmail(e: FormEvent) {
    e.preventDefault();
    if (!isOuEmail(email)) {
      setError("Use your @ou.edu email address.");
      return;
    }
    go("password");
  }

  async function handleAuth(e: FormEvent) {
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
    if (step === "signup" && !name.trim()) {
      setError("Enter your name.");
      return;
    }

    setLoading(true);
    try {
      let user: User;
      if (step === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { data: { name: name.trim() } },
        });
        if (error) return setError(error.message);
        if (!data.session || !data.user) {
          return setNotice("Check your inbox to confirm your email, then sign in.");
        }
        user = data.user;
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error) return setError(error.message);
        user = data.user;
      }
      const profileError = await ensureProfile(supabase, user);
      if (profileError) {
        await supabase.auth.signOut();
        return setError(profileError);
      }
      router.replace("/discover");
      router.refresh();
    } catch {
      setError("Something went wrong. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const primary =
    "h-14 w-full rounded-2xl bg-crimson text-lg font-bold text-white shadow-lg shadow-crimson/25 transition hover:bg-crimson-dark disabled:opacity-60";

  return (
    <main className="mx-auto grid w-full max-w-[1100px] flex-1 grid-cols-1 gap-10 px-6 py-10 md:grid-cols-2 md:items-center md:gap-16 md:py-16">
      <section className="flex flex-col items-center gap-8 pt-6 text-center md:items-start md:text-left">
        <Logo size="xl" />
        <div>
          <h1 className="text-4xl font-black tracking-tight md:text-5xl">SoonerSwipe</h1>
          <p className="mt-2 text-lg text-zinc-500">Find your ride. Make a friend.</p>
        </div>
        <div className="flex w-full max-w-sm flex-col gap-3 text-left">
          {FEATURES.map((f) => (
            <Feature key={f.title} {...f} />
          ))}
        </div>
      </section>

      <section className="flex flex-col justify-end md:rounded-3xl md:bg-white md:p-10 md:shadow-xl md:shadow-zinc-200/60">
        {step === "email" ? (
          <form onSubmit={handleEmail} className="flex flex-col gap-4" noValidate>
            <label htmlFor="email" className="font-semibold text-zinc-700">
              OU Email Address
            </label>
            <Field
              icon={<MailIcon />}
              id="email"
              type="email"
              placeholder="yourname@ou.edu"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && (
              <p role="alert" className="text-sm font-medium text-red-600">
                {error}
              </p>
            )}
            <button type="submit" className={primary}>
              Continue with OU Email
            </button>
            <p className="flex gap-2 text-sm text-zinc-400">
              <StarIcon className="mt-0.5 shrink-0" />
              Only @ou.edu addresses — every match is a verified Sooner
            </p>
          </form>
        ) : (
          <form onSubmit={handleAuth} className="flex flex-col gap-4" noValidate>
            <button
              type="button"
              onClick={() => go("email")}
              className="flex w-fit items-center gap-1 text-sm font-medium text-zinc-500"
            >
              <ChevronLeftIcon /> {email.trim().toLowerCase()}
            </button>
            <h2 className="text-2xl font-black tracking-tight">
              {step === "signup" ? "Create your account" : "Welcome back, Sooner"}
            </h2>
            {step === "signup" && (
              <Field
                icon={<UserIcon />}
                placeholder="Full name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
            <Field
              icon={<LockIcon />}
              type="password"
              placeholder="Password"
              autoComplete={step === "signup" ? "new-password" : "current-password"}
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && (
              <p role="alert" className="text-sm font-medium text-red-600">
                {error}
              </p>
            )}
            {notice && <p className="text-sm font-medium text-green-700">{notice}</p>}
            <button type="submit" disabled={loading} className={primary}>
              {loading ? "Please wait…" : step === "signup" ? "Create account" : "Sign in"}
            </button>
            <button
              type="button"
              onClick={() => go(step === "signup" ? "password" : "signup")}
              className="text-sm font-medium text-zinc-500"
            >
              {step === "signup" ? (
                <>Already have an account? <span className="font-bold text-crimson">Sign in</span></>
              ) : (
                <>New here? <span className="font-bold text-crimson">Create account</span></>
              )}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
