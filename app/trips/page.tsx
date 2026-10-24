import { redirect } from "next/navigation";

// Trips live under Profile ("My trips").
export default function TripsPage() {
  redirect("/profile#trips");
}
