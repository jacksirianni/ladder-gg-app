"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import {
  parseEvidenceRowsFromForm,
  submitMatchReportSchema,
} from "@/lib/validators/match";
import { createTeamSchema } from "@/lib/validators/team";
import { deriveBracketSide, validateScore } from "@/lib/match-format";
import { setFlashToast } from "@/lib/toast";

export type MatchActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export type TeamActionState = {
  error?: string;
  success?: boolean;
  fieldErrors?: Record<string, string>;
};

// v1.3: also accepts updates from the original reporter while AWAITING_CONFIRM,
// letting captains correct a typo before the opponent confirms.
export async function submitMatchReportAction(
  _prev: MatchActionState,
  formData: FormData,
): Promise<MatchActionState> {
  const user = await requireAuth();

  const parsed = submitMatchReportSchema.safeParse({
    matchId: String(formData.get("matchId") ?? ""),
    winnerTeamId: String(formData.get("winnerTeamId") ?? ""),
    scoreText: String(formData.get("scoreText") ?? ""),
    reportedTeamAScore: formData.get("reportedTeamAScore"),
    reportedTeamBScore: formData.get("reportedTeamBScore"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const {
    matchId,
    winnerTeamId,
    scoreText,
    reportedTeamAScore,
    reportedTeamBScore,
  } = parsed.data;

  // v1.7: parse evidence rows. Multiple rows submitted under the
  // "evidence" form key as JSON-encoded strings.
  const evidenceRows = parseEvidenceRowsFromForm(
    formData.getAll("evidence").map(String),
  ).slice(0, 6); // cap at 6 — defensive over the client-side limit.

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      league: { select: { slug: true, matchFormat: true } },
      teamA: { select: { id: true, captainUserId: true } },
      teamB: { select: { id: true, captainUserId: true } },
      reports: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { reportedByUserId: true },
      },
    },
  });
  if (!match) return { error: "Match not found." };
  if (
    match.status !== "AWAITING_REPORT" &&
    match.status !== "AWAITING_CONFIRM"
  ) {
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

  // While AWAITING_CONFIRM, only the original reporter can edit.
  if (match.status === "AWAITING_CONFIRM") {
    const latestReport = match.reports[0];
    if (!latestReport || latestReport.reportedByUserId !== user.id) {
      return {
        error:
          "Only the captain who reported this result can edit it. The opposing captain can confirm or dispute.",
      };
    }
  }

  if (winnerTeamId !== match.teamA.id && winnerTeamId !== match.teamB.id) {
    return { error: "The winner must be one of the two teams in the match." };
  }

  // v1.7: format-aware score validation. BO-N requires structured
  // scores; SINGLE_SCORE accepts optional pairs; FREEFORM ignores them.
  const scoreCheck = validateScore({
    format: match.league.matchFormat,
    teamAScore: reportedTeamAScore,
    teamBScore: reportedTeamBScore,
  });
  if (!scoreCheck.ok) {
    return {
      fieldErrors: { [scoreCheck.field]: scoreCheck.message },
    };
  }

  // For BO-N the winner is *derived* from the score; we cross-check
  // against the captain's selection so the dropdown can't disagree
  // with the typed score.
  const derivedSide = deriveBracketSide(
    match.league.matchFormat,
    reportedTeamAScore,
    reportedTeamBScore,
  );
  if (derivedSide !== null) {
    const derivedWinnerId =
      derivedSide === "A" ? match.teamA.id : match.teamB.id;
    if (winnerTeamId !== derivedWinnerId) {
      return {
        fieldErrors: {
          winnerTeamId:
            "The selected winner doesn't match the score. Pick the team with the higher game count.",
        },
      };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.matchReport.create({
      data: {
        matchId: match.id,
        reportedByUserId: user.id,
        reportedWinnerTeamId: winnerTeamId,
        scoreText: scoreText ?? null,
        reportedTeamAScore: reportedTeamAScore ?? null,
        reportedTeamBScore: reportedTeamBScore ?? null,
      },
    });
    await tx.match.update({
      where: { id: match.id },
      data: { status: "AWAITING_CONFIRM" },
    });

    // v1.7: persist any evidence the reporter attached.
    if (evidenceRows.length > 0) {
      await tx.matchEvidence.createMany({
        data: evidenceRows.map((e) => ({
          matchId: match.id,
          submittedByUserId: user.id,
          kind: e.kind,
          url: e.url ?? null,
          textValue: e.textValue ?? null,
          caption: e.caption ?? null,
        })),
      });
    }
  });

  revalidatePath(`/leagues/${match.league.slug}`);
  revalidatePath(`/leagues/${match.league.slug}/manage`);
  await setFlashToast({ kind: "success", message: "Result reported." });
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
        // v1.7: promote the reported structured scores onto the match.
        // Null-safe: legacy reports without scores leave the match
        // scoreText-only.
        teamAScore: latestReport.reportedTeamAScore,
        teamBScore: latestReport.reportedTeamBScore,
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
  await setFlashToast({ kind: "success", message: "Match confirmed." });
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

  // v1.7: parse any evidence the disputing captain attached.
  const disputeEvidence = parseEvidenceRowsFromForm(
    formData.getAll("evidence").map(String),
  ).slice(0, 6);

  await prisma.$transaction(async (tx) => {
    await tx.match.update({
      where: { id: match.id },
      data: {
        status: "DISPUTED",
        disputedAt: new Date(),
        disputedByUserId: user.id,
      },
    });

    if (disputeEvidence.length > 0) {
      await tx.matchEvidence.createMany({
        data: disputeEvidence.map((e) => ({
          matchId: match.id,
          submittedByUserId: user.id,
          kind: e.kind,
          url: e.url ?? null,
          textValue: e.textValue ?? null,
          caption: e.caption ?? null,
        })),
      });
    }
  });

  revalidatePath(`/leagues/${match.league.slug}`);
  revalidatePath(`/leagues/${match.league.slug}/manage`);
  await setFlashToast({
    kind: "warning",
    message: "Match disputed — organizer will resolve.",
  });
  return {};
}

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
  await setFlashToast({ kind: "info", message: "Team removed." });

  redirect("/dashboard");
}

export async function updateTeamAction(
  _prev: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const user = await requireAuth();
  const teamId = String(formData.get("teamId") ?? "");
  if (!teamId) return { error: "Team id required." };

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      league: {
        select: { id: true, slug: true, state: true, teamSize: true },
      },
    },
  });
  if (!team) return { error: "Team not found." };
  if (team.captainUserId !== user.id) {
    return { error: "You are not the captain of this team." };
  }
  if (team.league.state !== "DRAFT" && team.league.state !== "OPEN") {
    return {
      error: "Teams can only be edited before the league starts.",
    };
  }

  const rosterMembers = formData.getAll("rosterMembers").map(String);

  const parsed = createTeamSchema(team.league.teamSize).safeParse({
    name: String(formData.get("name") ?? ""),
    rosterMembers,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  await prisma.$transaction([
    prisma.team.update({
      where: { id: team.id },
      data: { name: parsed.data.name },
    }),
    prisma.teamRosterEntry.deleteMany({ where: { teamId: team.id } }),
    prisma.teamRosterEntry.createMany({
      data: parsed.data.rosterMembers.map((displayName, position) => ({
        teamId: team.id,
        displayName,
        position,
      })),
    }),
  ]);

  revalidatePath(`/leagues/${team.league.slug}`);
  revalidatePath(`/leagues/${team.league.slug}/manage`);
  revalidatePath("/dashboard");

  await setFlashToast({ kind: "success", message: "Team saved." });
  return { success: true };
}
