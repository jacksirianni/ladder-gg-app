import { randomBytes } from "crypto";
import type { PrismaClient } from "@prisma/client";

/** Maximum length of the slug portion (suffix not included). */
const MAX_BASE_LEN = 20;
/** Random suffix length. base36 of 4 chars = ~1.7M possibilities — plenty. */
const SUFFIX_LEN = 4;
/** Hard cap on retries; mathematically we should never approach this. */
const MAX_RETRIES = 5;

function slugifyDisplayName(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_BASE_LEN);
  return base || "player";
}

function randomSuffix(): string {
  // 3 random bytes → up to 6 base36 chars; trim to SUFFIX_LEN.
  return randomBytes(3).toString("hex").slice(0, SUFFIX_LEN);
}

/**
 * Generate a unique URL handle for a user, using their displayName as the
 * base and appending a short random suffix. Ensures uniqueness against the
 * provided Prisma client / transaction.
 *
 * Examples:
 *   generateHandle("Jack Sirianni")  → "jack-sirianni-x7k2"
 *   generateHandle("Goose 🦢")        → "goose-z9q1"
 *   generateHandle("✨✨✨")          → "player-a3b8"
 *
 * Pass the same `tx` you're using for user creation to keep handle gen
 * inside the user-create transaction; rolls back together on failure.
 */
export async function generateHandle(
  displayName: string,
  prismaOrTx: Pick<PrismaClient, "user">,
): Promise<string> {
  const base = slugifyDisplayName(displayName);

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const candidate = `${base}-${randomSuffix()}`;
    const existing = await prismaOrTx.user.findUnique({
      where: { handle: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }

  // Catastrophically unlikely: all retries collided. Fall through to a
  // longer suffix derived from the timestamp so we never throw.
  return `${base}-${Date.now().toString(36)}`;
}
