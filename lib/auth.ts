// Mirrors the profiles.email check (email ilike '%@ou.edu').
export function isOuEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith("@ou.edu");
}
