"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { submitMatchReportSchema } from "@/lib/validators/match";

export type MatchActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function submitMatchReportAction(
  _prev: MatchActionState,
  formData: FormData,
): Promise<MatchActionState> {
  const user = await requireAuth();

  const parsed = submitMatchReportSchema.safeParse({
    matchId: String(formData.get("matchId") ?? ""),
    winnerTeamId: String(formData.get("winnerTeamId") ?? ""),
    scoreText: String(formData.get("scoreText") ?? ""),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const { matchId, winnerTeamId, scoreText } = parsed.data;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      league: { select: { slug: true } },
      teamA: { select: { id: true, captainUserId: true } },
      teamB: { select: { id: true, captainUserId: true } },
    },
  });
  if (!match) return { error: "Match not found." };
  if (match.status !== "AWAITING_REPORT") {
    return { error: "This match is not awaiting a report." };
  }
  if (!match.teamA || !match.teamB) {
    return { error: "Both teams must be set before reporting." };
  }

  const isCaptainInMatch =
    user.id === match.teamA.captainUserId ||
    user.id === match.teamB.captainUserId;
  if (!isCaptainInMatch) {
    return { error: "Only captains in this match can report a result." };
  }

  if (winnerTeamId !== match.teamA.id && winnerTeamId !== match.teamB.id) {
    return { error: "The winner must be one of the two teams in the match." };
  }

  await prisma.$transaction([
    prisma.matchReport.create({
      data: {
        matchId: match.id,
        reportedByUserId: user.id,
        reportedWinnerTeamId: winnerTeamId,
        scoreText: scoreText ?? null,
      },
    }),
    prisma.match.update({
      where: { id: match.id },
      data: { status: "AWAITING_CONFIRM" },
    }),
  ]);

  revalidatePath(`/leagues/${match.league.slug}`);
  revalidatePath(`/leagues/${match.league.slug}/manage`);
  return {};
}

export async function confirmMatchAction(
  _prev: MatchActionState,
  formData: FormData,
): Promise<MatchActionState> {
  const user = await requireAuth();
  const matchId = String(formData.get("matchId") ?? "");
  if (!matchId) return { error: "Match id required." };

  const slug = await prisma.$transaction(async (tx) => {
    const match = await tx.match.findUnique({
      where: { id: matchId },
      include: {
        league: { select: { id: true, slug: true } },
        teamA: { select: { id: true, captainUserId: true } },
        teamB: { select: { id: true, captainUserId: true } },
        reports: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });
    if (!match) throw new Error("Match not found.");
    if (match.status !== "AWAITING_CONFIRM") {
      throw new Error("This match is not awaiting confirmation.");
    }
    if (!match.teamA || !match.teamB) {
      throw new Error("Both teams must be set.");
    }

    const latestReport = match.reports[0];
    if (!latestReport) throw new Error("No report to confirm.");

    const isCaptainInMatch =
      user.id === match.teamA.captainUserId ||
      user.id === match.teamB.captainUserId;
    if (!isCaptainInMatch) {
      throw new Error("Only captains in this match can confirm.");
    }
    if (user.id === latestReport.reportedByUserId) {
      throw new Error("The captain who reported cannot confirm their own report.");
    }

    const winnerTeamId = latestReport.reportedWinnerTeamId;

    await tx.match.update({
      where: { id: match.id },
      data: {
        status: "CONFIRMED",
        winnerTeamId,
        confirmedAt: new Date(),
        resolvedByUserId: user.id,
      },
    });

    const nextRound = match.round + 1;
    const nextPosition = Math.ceil(match.bracketPosition / 2);

    const nextMatch = await tx.match.findUnique({
      where: {
        leagueId_round_bracketPosition: {
          leagueId: match.leagueId,
          round: nextRound,
          bracketPosition: nextPosition,
        },
      },
    });

    if (!nextMatch) {
      await tx.league.update({
        where: { id: match.leagueId },
        data: {
          state: "COMPLETED",
          completedAt: new Date(),
        },
      });
      return match.league.slug;
    }

    const isTeamASlot = match.bracketPosition % 2 === 1;
    const updateData: {
      teamAId?: string;
      teamBId?: string;
      status?: "AWAITING_REPORT";
    } = {};
    if (isTeamASlot) {
      updateData.teamAId = winnerTeamId;
    } else {
      updateData.teamBId = winnerTeamId;
    }

    const futureTeamA = isTeamASlot ? winnerTeamId : nextMatch.teamAId;
    const futureTeamB = isTeamASlot ? nextMatch.teamBId : winnerTeamId;
    if (futureTeamA && futureTeamB) {
      updateData.status = "AWAITING_REPORT";
    }

    await tx.match.update({
      where: { id: nextMatch.id },
      data: updateData,
    });

    return match.league.slug;
  });

  revalidatePath(`/leagues/${slug}`);
  revalidatePath(`/leagues/${slug}/manage`);
  revalidatePath("/dashboard");
  return {};
}

export async function disputeMatchAction(
  _prev: MatchActionState,
  formData: FormData,
): Promise<MatchActionState> {
  const user = await requireAuth();
  const matchId = String(formData.get("matchId") ?? "");
  if (!matchId) return { error: "Match id required." };

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      league: { select: { slug: true } },
      teamA: { select: { id: true, captainUserId: true } },
      teamB: { select: { id: true, captainUserId: true } },
      reports: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!match) return { error: "Match not found." };
  if (match.status !== "AWAITING_CONFIRM") {
    return { error: "Only matches awaiting confirmation can be disputed." };
  }
  if (!match.teamA || !match.teamB) {
    return { error: "Both teams must be set." };
  }

  const latestReport = match.reports[0];
  if (!latestReport) return { error: "No report to dispute." };

  const isCaptainInMatch =
    user.id === match.teamA.captainUserId ||
    user.id === match.teamB.captainUserId;
  if (!isCaptainInMatch) {
    return { error: "Only captains in this match can dispute." };
  }
  if (user.id === latestReport.reportedByUserId) {
    return { error: "The captain who reported cannot dispute their own report." };
  }

  await prisma.match.update({
    where: { id: match.id },
    data: {
      status: "DISPUTED",
      disputedAt: new Date(),
      disputedByUserId: user.id,
    },
  });

  revalidatePath(`/leagues/${match.league.slug}`);
  revalidatePath(`/leagues/${match.league.slug}/manage`);
  return {};
}

// v1.1: captain leaves their team — DRAFT or OPEN only.
export async function leaveTeamAction(formData: FormData) {
  const user = await requireAuth();
  const teamId = String(formData.get("teamId") ?? "");

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      league: { select: { id: true, slug: true, state: true } },
    },
  });
  if (!team) {
    throw new Error("Team not found.");
  }
  if (team.captainUserId !== user.id) {
    throw new Error("You are not the captain of this team.");
  }
  if (team.league.state !== "DRAFT" && team.league.state !== "OPEN") {
    throw new Error("You can only leave a team before the league starts.");
  }

  await prisma.team.delete({ where: { id: team.id } });

  revalidatePath(`/leagues/${team.league.slug}`);
  revalidatePath(`/leagues/${team.league.slug}/manage`);
  revalidatePath("/dashboard");

  redirect("/dashboard");
}
