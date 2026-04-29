import { randomUUID } from "crypto";
import type { Prisma, PrismaClient, Season } from "@prisma/client";

/** Slugify a season name. Same shape as the league slug helper. */
function slugifySeasonName(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const suffix = randomUUID().replace(/-/g, "").slice(0, 6);
  return `${base || "season"}-${suffix}`;
}

type TxLike = PrismaClient | Prisma.TransactionClient;

/**
 * Season name → Season row, scoped to one organizer.
 *
 * - Case-insensitive name match within the organizer's own seasons.
 * - If a match exists, returns it.
 * - Otherwise creates a new Season with a globally-unique slug. Slug
 *   collisions across organizers are extremely unlikely thanks to the
 *   random suffix, but we still retry up to a few times to be safe.
 *
 * Names matching seasons owned by *other* organizers are ignored — we
 * never auto-attach a league to someone else's series.
 */
export async function findOrCreateSeasonForOrganizer(
  rawName: string,
  organizerId: string,
  prismaOrTx: TxLike,
): Promise<Season> {
  const name = rawName.trim();

  // Find by case-insensitive name within this organizer's own seasons.
  const existing = await prismaOrTx.season.findFirst({
    where: {
      organizerId,
      name: { equals: name, mode: "insensitive" },
    },
  });
  if (existing) return existing;

  // Generate unique slug. Random suffix keeps collisions vanishingly rare
  // even across many organizers reusing common names.
  let slug = slugifySeasonName(name);
  for (let i = 0; i < 5; i++) {
    const slugTaken = await prismaOrTx.season.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!slugTaken) break;
    slug = slugifySeasonName(name);
  }

  return prismaOrTx.season.create({
    data: {
      name,
      slug,
      organizerId,
    },
  });
}
