"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CarIcon, CheckIcon, LockIcon } from "@/components/Icons";
import { verifyDriver } from "@/app/profile/actions";

type Step = "details" | "license" | "checking" | "approved";

const STATES = [
  ["OK", "Oklahoma"],
  ["TX", "Texas"],
  ["KS", "Kansas"],
  ["AR", "Arkansas"],
  ["MO", "Missouri"],
  ["CO", "Colorado"],
  ["NM", "New Mexico"],
  ["OTHER", "Other"],
];

const CHECKS = [
  "Uploading securely",
  "Reading license details",
  "Checking expiration date",
  "Matching name to your OU profile",
  "Checking plate registration format",
];

const field = "h-14 w-full rounded-2xl bg-zinc-100 px-4 text-base outline-none focus:ring-2 focus:ring-crimson";

// Demo ID check: no verification service is connected. The photo is previewed
// in the browser only and never uploaded; the checks below are simulated.
export default function DriverVerify({ next, verifiedPlate }: { next: string; verifiedPlate: string | null }) {
  const [step, setStep] = useState<Step>(verifiedPlate ? "approved" : "details");
  const [plate, setPlate] = useState(verifiedPlate ?? "");
  const [state, setState] = useState("OK");
  const [photo, setPhoto] = useState<string | null>(null);
  const [done, setDone] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const photoRef = useRef<string | null>(null);

  useEffect(() => () => {
    if (photoRef.current) URL.revokeObjectURL(photoRef.current);
  }, []);

  useEffect(() => {
    if (step !== "checking") return;
    if (done < CHECKS.length) {
      const t = setTimeout(() => setDone((d) => d + 1), 700 + Math.random() * 500);
      return () => clearTimeout(t);
    }
    verifyDriver(plate, state).then((result) => {
      if (result.error) {
        setError(result.error);
        setStep("details");
        setDone(0);
      } else setStep("approved");
    });
  }, [step, done, plate, state]);

  function pickPhoto(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Choose a photo of your license.");
    if (photoRef.current) URL.revokeObjectURL(photoRef.current);
    photoRef.current = URL.createObjectURL(file);
    setPhoto(photoRef.current);
    setError(null);
  }

  const steps = ["details", "license", "checking"] as const;
  const stepIndex = step === "approved" ? 3 : steps.indexOf(step);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-2" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className={`h-1.5 rounded-full ${i < stepIndex || step === "approved" ? "bg-crimson" : i === stepIndex ? "bg-crimson/40" : "bg-zinc-200"}`} />
        ))}
      </div>

      {step === "details" && (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!/^[A-Za-z0-9][A-Za-z0-9 -]{1,8}[A-Za-z0-9]$/.test(plate.trim())) return setError("Enter your license plate (2 to 10 letters and numbers).");
            setError(null);
            setStep("license");
          }}
        >
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-crimson-soft text-3xl text-crimson">
              <CarIcon />
            </span>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Verify to drive</h1>
              <p className="text-zinc-500">Riders only see verified drivers.</p>
            </div>
          </div>
          <label className="flex flex-col gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
            License plate
            <input
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              placeholder="ABC-123"
              autoCapitalize="characters"
              maxLength={10}
              className={`${field} font-mono text-lg tracking-widest`}
            />
          </label>
          <label className="flex flex-col gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
            Plate state
            <select value={state} onChange={(e) => setState(e.target.value)} className={field}>
              {STATES.map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="h-14 rounded-2xl bg-crimson text-lg font-bold text-white">
            Continue
          </button>
        </form>
      )}

      {step === "license" && (
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-black tracking-tight">Photo of your driver&apos;s license</h1>
          <p className="text-zinc-500">Front side, all four corners visible, no glare.</p>
          <label className="flex aspect-[1.586] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-3xl border-2 border-dashed border-zinc-300 bg-white text-zinc-500">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- local preview of the chosen file
              <img src={photo} alt="Your license (preview)" className="h-full w-full object-cover" />
            ) : (
              <>
                <span className="text-4xl">🪪</span>
                <span className="font-semibold">Tap to take or choose a photo</span>
              </>
            )}
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => pickPhoto(e.target.files?.[0])} />
          </label>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button
            type="button"
            disabled={!photo}
            onClick={() => {
              setDone(0);
              setStep("checking");
            }}
            className="h-14 rounded-2xl bg-crimson text-lg font-bold text-white disabled:opacity-40"
          >
            Verify license
          </button>
          <button type="button" onClick={() => setStep("details")} className="text-zinc-500">
            Back
          </button>
        </div>
      )}

      {step === "checking" && (
        <div className="flex flex-col gap-5">
          <h1 className="text-2xl font-black tracking-tight">Checking your license…</h1>
          <ul className="flex flex-col gap-3 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-100">
            {CHECKS.map((check, i) => (
              <li key={check} className="flex items-center gap-3">
                {i < done ? (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-600 text-white">
                    <CheckIcon strokeWidth={3} />
                  </span>
                ) : i === done ? (
                  <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-zinc-200 border-t-crimson" />
                ) : (
                  <span className="h-7 w-7 rounded-full border-[3px] border-zinc-200" />
                )}
                <span className={i <= done ? "font-semibold" : "text-zinc-400"}>{check}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {step === "approved" && (
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex h-24 w-24 items-center justify-center rounded-full bg-green-100">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-green-600 text-3xl text-white">
              <CheckIcon strokeWidth={3} />
            </span>
          </span>
          <h1 className="text-3xl font-black tracking-tight">Approved</h1>
          <p className="text-zinc-500">You&apos;re a verified driver. Riders will see the badge on your card.</p>
          <span className="rounded-2xl bg-zinc-900 px-5 py-2 font-mono text-xl font-bold tracking-widest text-white">{plate}</span>
          <Link href={next} className="mt-4 flex h-14 w-full items-center justify-center rounded-2xl bg-crimson text-lg font-bold text-white">
            Continue
          </Link>
        </div>
      )}

      <p className="flex items-start gap-2 text-xs text-zinc-400">
        <LockIcon className="mt-0.5 shrink-0" />
        Demo verification: no ID service is connected yet. Your photo stays on this device and is never uploaded.
      </p>
    </div>
  );
}
