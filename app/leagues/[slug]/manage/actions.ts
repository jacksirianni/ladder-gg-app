"use server";

import type { PaymentStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { requireLeagueOrganizer } from "@/lib/permissions/league";
import {
  canCancelLeague,
  canPublishLeague,
} from "@/lib/transitions/league";
import { generateBracketMatches } from "@/lib/bracket/generate";
import { resolveDisputeSchema } from "@/lib/validators/match";

const VALID_PAYMENT_STATUSES = new Set<PaymentStatus>([
  "PENDING",
  "PAID",
  "WAIVED",
  "REFUNDED",
]);

export async function publishLeagueAction(formData: FormData) {
  const user = await requireAuth();
  const leagueId = String(formData.get("leagueId") ?? "");

  const league = await requireLeagueOrganizer(leagueId, user.id);

  if (!canPublishLeague(league)) {
    throw new Error("League cannot be published from its current state.");
  }

  await prisma.league.update({
    where: { id: league.id },
    data: {
      state: "OPEN",
      publishedAt: new Date(),
    },
  });

  revalidatePath(`/leagues/${league.slug}/manage`);
  revalidatePath(`/leagues/${league.slug}`);
  revalidatePath("/dashboard");
}

export async function cancelLeagueAction(formData: FormData) {
  const user = await requireAuth();
  const leagueId = String(formData.get("leagueId") ?? "");

  const league = await requireLeagueOrganizer(leagueId, user.id);

  if (!canCancelLeague(league)) {
    throw new Error("League cannot be cancelled from its current state.");
  }

  await prisma.league.update({
    where: { id: league.id },
    data: {
      state: "CANCELLED",
      cancelledAt: new Date(),
    },
  });

  revalidatePath(`/leagues/${league.slug}/manage`);
  revalidatePath(`/leagues/${league.slug}`);
  revalidatePath("/dashboard");
}

export async function updateTeamPaymentStatusAction(formData: FormData) {
  const user = await requireAuth();
  const teamId = String(formData.get("teamId") ?? "");
  const status = String(formData.get("paymentStatus") ?? "") as PaymentStatus;

  if (!VALID_PAYMENT_STATUSES.has(status)) {
    throw new Error("Invalid payment status.");
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      league: { select: { id: true, slug: true, organizerId: true } },
    },
  });
  if (!team) {
    throw new Error("Team not found.");
  }
  if (team.league.organizerId !== user.id) {
    throw new Error("You are not the organizer of this league.");
  }

  await prisma.team.update({
    where: { id: team.id },
    data: { paymentStatus: status },
  });

  revalidatePath(`/leagues/${team.league.slug}/manage`);
  revalidatePath(`/leagues/${team.league.slug}`);
  revalidatePath("/dashboard");
}

export async function startLeagueAction(formData: FormData) {
  const user = await requireAuth();
  const leagueId = String(formData.get("leagueId") ?? "");

  const league = await requireLeagueOrganizer(leagueId, user.id);
  if (league.state !== "OPEN") {
    throw new Error("League must be OPEN to start.");
  }

  const eligibleTeams = await prisma.team.findMany({
    where: {
      leagueId: league.id,
      paymentStatus: { in: ["PAID", "WAIVED"] },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (eligibleTeams.length < 2) {
    throw new Error("Need at least 2 teams marked PAID or WAIVED to start.");
  }

  const bracketMatches = generateBracketMatches(
    eligibleTeams.map((t) => t.id),
  );

  await prisma.$transaction([
    prisma.match.createMany({
      data: bracketMatches.map((m) => ({
        leagueId: league.id,
        round: m.round,
        bracketPosition: m.bracketPosition,
        teamAId: m.teamAId,
        teamBId: m.teamBId,
        status: m.teamAId && m.teamBId ? "AWAITING_REPORT" : "PENDING",
      })),
    }),
    prisma.league.update({
      where: { id: league.id },
      data: {
        state: "IN_PROGRESS",
        startedAt: new Date(),
      },
    }),
  ]);

  revalidatePath(`/leagues/${league.slug}/manage`);
  revalidatePath(`/leagues/${league.slug}`);
  revalidatePath("/dashboard");
}

export async function resolveDisputeAction(formData: FormData) {
  const user = await requireAuth();

  const parsed = resolveDisputeSchema.safeParse({
    matchId: String(formData.get("matchId") ?? ""),
    winnerTeamId: String(formData.get("winnerTeamId") ?? ""),
  });
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "Invalid dispute resolution.",
    );
  }

  const { matchId, winnerTeamId } = parsed.data;

  const slug = await prisma.$transaction(async (tx) => {
    const match = await tx.match.findUnique({
      where: { id: matchId },
      include: {
        league: { select: { id: true, slug: true, organizerId: true } },
        teamA: { select: { id: true } },
        teamB: { select: { id: true } },
      },
    });
    if (!match) throw new Error("Match not found.");
    if (match.league.organizerId !== user.id) {
      throw new Error("Only the organizer can resolve a dispute.");
    }
    if (match.status !== "DISPUTED") {
      throw new Error("Only disputed matches can be resolved.");
    }
    if (!match.teamA || !match.teamB) {
      throw new Error("Both teams must be set.");
    }
    if (winnerTeamId !== match.teamA.id && winnerTeamId !== match.teamB.id) {
      throw new Error("Winner must be one of the two teams in this match.");
    }

    // Mark match ORGANIZER_DECIDED.
    await tx.match.update({
      where: { id: match.id },
      data: {
        status: "ORGANIZER_DECIDED",
        winnerTeamId,
        confirmedAt: new Date(),
        resolvedByUserId: user.id,
      },
    });

    // Advance winner — same logic as confirmMatchAction.
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
      // Final — complete league.
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
}
