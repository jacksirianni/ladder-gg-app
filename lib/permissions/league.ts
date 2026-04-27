import { prisma } from "@/lib/db/prisma";

export async function requireLeagueOrganizer(
  leagueId: string,
  userId: string,
) {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
  });
  if (!league) {
    throw new Error("League not found.");
  }
  if (league.organizerId !== userId) {
    throw new Error("You are not the organizer of this league.");
  }
  return league;
}

export async function requireLeagueOrganizerBySlug(
  slug: string,
  userId: string,
) {
  const league = await prisma.league.findUnique({
    where: { slug },
  });
  if (!league) {
    throw new Error("League not found.");
  }
  if (league.organizerId !== userId) {
    throw new Error("You are not the organizer of this league.");
  }
  return league;
}
