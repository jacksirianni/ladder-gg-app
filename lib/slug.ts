import { randomUUID } from "crypto";

export function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  const suffix = randomUUID().replace(/-/g, "").slice(0, 6);
  return `${base || "league"}-${suffix}`;
}
