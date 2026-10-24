"use client";

import { useEffect } from "react";
import { markMatchesSeen } from "@/app/profile/actions";

// Clears the bell dot once the matches list has been shown.
export default function MarkMatchesSeen() {
  useEffect(() => {
    markMatchesSeen().then(() => window.dispatchEvent(new Event("nav:refresh")));
  }, []);
  return null;
}
