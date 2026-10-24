"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/profile/actions";
import type { ActionResult } from "@/app/events/actions";

const YEARS = ["Freshman", "Sophomore", "Junior", "Senior", "Graduate"];
const field = "h-12 w-full rounded-2xl bg-zinc-100 px-4 text-base outline-none focus:ring-2 focus:ring-crimson";
const label = "flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500";

type Initial = {
  name: string;
  major: string | null;
  year: string | null;
  bio: string | null;
  orgs: string[];
  carModel: string | null;
  mpg: number | null;
};

export default function ProfileForm({ initial }: { initial: Initial }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(updateProfile, {});
  return (
    <form action={action} className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <label className={label}>
        Name
        <input name="name" defaultValue={initial.name} required maxLength={80} className={field} />
      </label>
      <label className={label}>
        Major
        <input name="major" defaultValue={initial.major ?? ""} maxLength={80} placeholder="Computer Science" className={field} />
      </label>
      <label className={label}>
        Year
        <select name="year" defaultValue={initial.year ?? ""} className={field}>
          <option value="">Choose…</option>
          {YEARS.map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
      </label>
      <label className={label}>
        Orgs (comma separated)
        <input name="orgs" defaultValue={initial.orgs.join(", ")} placeholder="SASE, ACM" className={field} />
      </label>
      <label className={`${label} md:col-span-2`}>
        Bio
        <textarea
          name="bio"
          defaultValue={initial.bio ?? ""}
          maxLength={280}
          rows={3}
          placeholder="A line riders and drivers will see on your card"
          className="w-full rounded-2xl bg-zinc-100 p-4 text-base normal-case tracking-normal outline-none focus:ring-2 focus:ring-crimson"
        />
      </label>
      <label className={label}>
        Car model
        <input name="carModel" defaultValue={initial.carModel ?? ""} maxLength={60} placeholder="2019 Honda Civic" className={field} />
      </label>
      <label className={label}>
        Car mpg
        <input name="mpg" type="number" min={1} max={150} step="0.1" defaultValue={initial.mpg ?? ""} placeholder="30" className={field} />
      </label>
      <div className="flex items-center gap-4 md:col-span-2">
        <button type="submit" disabled={pending} className="h-12 rounded-2xl bg-crimson px-8 font-bold text-white disabled:opacity-60">
          {pending ? "Saving…" : "Save profile"}
        </button>
        {state.error && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {state.error}
          </p>
        )}
        {state.message && !pending && <p className="text-sm font-medium text-green-700">{state.message}</p>}
      </div>
    </form>
  );
}
