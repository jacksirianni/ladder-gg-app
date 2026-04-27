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

export async function requireLeagueCaptain(leagueId: string, userId: string) {
  const team = await prisma.team.findUnique({
    where: {
      leagueId_captainUserId: {
        leagueId,
        captainUserId: userId,
      },
    },
  });
  if (!team) {
    throw new Error("You are not a captain in this league.");
  }
  return team;
}
