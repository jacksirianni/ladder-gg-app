"use server";

import type { PaymentStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { requireLeagueOrganizer } from "@/lib/permissions/league";
import {
  canCancelLeague,
  canPublishLeague,
} from "@/lib/transitions/league";
import { generateBracketMatches } from "@/lib/bracket/generate";
import { generateInviteToken } from "@/lib/token";
import { generateSlug } from "@/lib/slug";
import {
  parseEvidenceRowsFromForm,
  resolveDisputeSchema,
} from "@/lib/validators/match";
import { validateScore } from "@/lib/match-format";
import { updateLeagueSchema } from "@/lib/validators/league";

const VALID_PAYMENT_STATUSES = new Set<PaymentStatus>([
  "PENDING",
  "PAID",
  "WAIVED",
  "REFUNDED",
]);

export type UpdateLeagueActionState = {
  error?: string;
  success?: boolean;
  fieldErrors?: Record<string, string>;
};

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

export async function bulkUpdatePaymentStatusAction(formData: FormData) {
  const user = await requireAuth();
  const leagueId = String(formData.get("leagueId") ?? "");
  const status = String(formData.get("paymentStatus") ?? "") as PaymentStatus;

  if (status !== "PAID" && status !== "WAIVED") {
    throw new Error("Bulk update only supports PAID or WAIVED.");
  }

  const league = await requireLeagueOrganizer(leagueId, user.id);
  if (league.state !== "OPEN") {
    throw new Error("Bulk update only available while the league is OPEN.");
  }

  await prisma.team.updateMany({
    where: {
      leagueId: league.id,
      paymentStatus: "PENDING",
    },
    data: { paymentStatus: status },
  });

  revalidatePath(`/leagues/${league.slug}/manage`);
  revalidatePath(`/leagues/${league.slug}`);
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
    teamAScore: formData.get("teamAScore"),
    teamBScore: formData.get("teamBScore"),
  });
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "Invalid dispute resolution.",
    );
  }

  const { matchId, winnerTeamId, teamAScore, teamBScore } = parsed.data;

  // v1.7: organizer can attach final evidence at resolution time too.
  const resolutionEvidence = parseEvidenceRowsFromForm(
    formData.getAll("evidence").map(String),
  ).slice(0, 6);

  const slug = await prisma.$transaction(async (tx) => {
    const match = await tx.match.findUnique({
      where: { id: matchId },
      include: {
        league: {
          select: {
            id: true,
            slug: true,
            organizerId: true,
            matchFormat: true,
          },
        },
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

    // v1.7: validate optional structured score against league format.
    const scoreCheck = validateScore({
      format: match.league.matchFormat,
      teamAScore,
      teamBScore,
    });
    if (!scoreCheck.ok) {
      throw new Error(scoreCheck.message);
    }

    await tx.match.update({
      where: { id: match.id },
      data: {
        status: "ORGANIZER_DECIDED",
        winnerTeamId,
        confirmedAt: new Date(),
        resolvedByUserId: user.id,
        // v1.7: persist the final score the organizer recorded.
        teamAScore: teamAScore ?? null,
        teamBScore: teamBScore ?? null,
      },
    });

    // v1.7: organizer-attached evidence rows.
    if (resolutionEvidence.length > 0) {
      await tx.matchEvidence.createMany({
        data: resolutionEvidence.map((e) => ({
          matchId: match.id,
          submittedByUserId: user.id,
          kind: e.kind,
          url: e.url ?? null,
          textValue: e.textValue ?? null,
          caption: e.caption ?? null,
        })),
      });
    }

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
}

export async function duplicateLeagueAction(formData: FormData) {
  const user = await requireAuth();
  const leagueId = String(formData.get("leagueId") ?? "");

  const source = await requireLeagueOrganizer(leagueId, user.id);

  let slug = generateSlug(`${source.name} copy`);
  for (let i = 0; i < 5; i++) {
    const existing = await prisma.league.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing) break;
    slug = generateSlug(`${source.name} copy`);
  }

  const created = await prisma.league.create({
    data: {
      name: `${source.name} (copy)`,
      description: source.description,
      game: source.game,
      teamSize: source.teamSize,
      maxTeams: source.maxTeams,
      buyInCents: source.buyInCents,
      payoutPreset: source.payoutPreset,
      paymentInstructions: source.paymentInstructions,
      prizeNotes: source.prizeNotes,
      slug,
      inviteToken: generateInviteToken(),
      organizerId: user.id,
      // v1.5: inherit the season so "Run it back" continues the series.
      seasonId: source.seasonId,
      // v1.6: preserve access policy and recruitment signal — these are
      // the organizer's preferences, not calendar-specific. The two
      // datetimes are intentionally NOT carried forward; they applied
      // to the source's run, not this one.
      visibility: source.visibility,
      lookingForTeams: source.lookingForTeams,
      // v1.7: preserve match format + game-depth context. These are
      // game-specific, not calendar-specific.
      matchFormat: source.matchFormat,
      rules: source.rules,
      mapPool: source.mapPool,
    },
    select: { slug: true },
  });

  redirect(`/leagues/${created.slug}/manage`);
}

export async function updateLeagueAction(
  _prev: UpdateLeagueActionState,
  formData: FormData,
): Promise<UpdateLeagueActionState> {
  const user = await requireAuth();
  const leagueId = String(formData.get("leagueId") ?? "");

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: { _count: { select: { teams: true } } },
  });
  if (!league) return { error: "League not found." };
  if (league.organizerId !== user.id) {
    return { error: "You are not the organizer of this league." };
  }
  if (league.state !== "DRAFT" && league.state !== "OPEN") {
    return {
      error: "League settings can only be edited before it starts.",
    };
  }

  const parsed = updateLeagueSchema.safeParse({
    description: String(formData.get("description") ?? ""),
    game: String(formData.get("game") ?? ""),
    teamSize: String(formData.get("teamSize") ?? ""),
    maxTeams: String(formData.get("maxTeams") ?? ""),
    buyInDollars: String(formData.get("buyInDollars") ?? ""),
    payoutPreset: String(formData.get("payoutPreset") ?? "WTA"),
    paymentInstructions: String(formData.get("paymentInstructions") ?? ""),
    prizeNotes: String(formData.get("prizeNotes") ?? ""),
    // v1.6: visibility + scheduling.
    visibility: String(formData.get("visibility") ?? league.visibility),
    registrationClosesAt: String(formData.get("registrationClosesAt") ?? ""),
    startsAt: String(formData.get("startsAt") ?? ""),
    lookingForTeams: formData.get("lookingForTeams") ?? undefined,
    // v1.7: match format + game depth. The early-return guard above
    // means we only reach here in DRAFT/OPEN states where editing is
    // allowed. The form's matchFormat select is also `disabled` when
    // the league is past OPEN, which means submitted forms from those
    // states won't include a `matchFormat` value either way.
    matchFormat: String(formData.get("matchFormat") ?? league.matchFormat),
    rules: String(formData.get("rules") ?? ""),
    mapPool: String(formData.get("mapPool") ?? ""),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path[0];
      if (typeof path === "string" && !fieldErrors[path]) {
        fieldErrors[path] = issue.message;
      }
    }
    return { fieldErrors };
  }

  const teamCount = league._count.teams;

  if (parsed.data.teamSize !== league.teamSize && teamCount > 0) {
    return {
      fieldErrors: {
        teamSize: "Team size cannot change once teams have registered.",
      },
    };
  }

  if (parsed.data.maxTeams < teamCount) {
    return {
      fieldErrors: {
        maxTeams: `Cannot set max teams below the current count (${teamCount}).`,
      },
    };
  }

  const buyInCents = Math.round(parsed.data.buyInDollars * 100);

  await prisma.league.update({
    where: { id: league.id },
    data: {
      description: parsed.data.description ?? null,
      game: parsed.data.game,
      teamSize: parsed.data.teamSize,
      maxTeams: parsed.data.maxTeams,
      buyInCents,
      payoutPreset: parsed.data.payoutPreset,
      paymentInstructions: parsed.data.paymentInstructions ?? null,
      prizeNotes: parsed.data.prizeNotes ?? null,
      // v1.6: visibility + scheduling.
      visibility: parsed.data.visibility,
      registrationClosesAt: parsed.data.registrationClosesAt ?? null,
      startsAt: parsed.data.startsAt ?? null,
      lookingForTeams: parsed.data.lookingForTeams,
      // v1.7: match format + game depth.
      matchFormat: parsed.data.matchFormat,
      rules: parsed.data.rules ?? null,
      mapPool: parsed.data.mapPool ?? null,
    },
  });

  revalidatePath(`/leagues/${league.slug}/manage`);
  revalidatePath(`/leagues/${league.slug}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function removeTeamAction(formData: FormData) {
  const user = await requireAuth();
  const teamId = String(formData.get("teamId") ?? "");

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      league: {
        select: { id: true, slug: true, organizerId: true, state: true },
      },
    },
  });
  if (!team) {
    throw new Error("Team not found.");
  }
  if (team.league.organizerId !== user.id) {
    throw new Error("You are not the organizer of this league.");
  }
  if (team.league.state !== "DRAFT" && team.league.state !== "OPEN") {
    throw new Error("Teams can only be removed before the league starts.");
  }

  await prisma.team.delete({ where: { id: team.id } });

  revalidatePath(`/leagues/${team.league.slug}/manage`);
  revalidatePath(`/leagues/${team.league.slug}`);
  revalidatePath("/dashboard");
}

// v1.3: organizer overrides a confirmed match result.
// Constrained to cases where downstream impact is contained: the next
// match must have no reports yet. This avoids invalidating gameplay
// that's already happened.
export async function overrideMatchAction(formData: FormData) {
  const user = await requireAuth();
  const matchId = String(formData.get("matchId") ?? "");
  const winnerTeamId = String(formData.get("winnerTeamId") ?? "");

  if (!matchId || !winnerTeamId) {
    throw new Error("Match id and winner are required.");
  }

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
      throw new Error("Only the organizer can override a match.");
    }
    if (
      match.status !== "CONFIRMED" &&
      match.status !== "ORGANIZER_DECIDED"
    ) {
      throw new Error(
        "Only confirmed or organizer-decided matches can be overridden.",
      );
    }
    if (!match.teamA || !match.teamB) {
      throw new Error("Both teams must be set.");
    }
    if (winnerTeamId !== match.teamA.id && winnerTeamId !== match.teamB.id) {
      throw new Error("Winner must be one of the two teams in this match.");
    }

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
      include: {
        reports: { take: 1, select: { id: true } },
      },
    });

    if (nextMatch && nextMatch.reports.length > 0) {
      throw new Error(
        `Cannot override — a downstream match (R${nextRound} M${nextPosition}) has already been reported. Cancel the league and rerun if a major correction is needed.`,
      );
    }

    // Update the overridden match.
    await tx.match.update({
      where: { id: match.id },
      data: {
        status: "ORGANIZER_DECIDED",
        winnerTeamId,
        confirmedAt: new Date(),
        resolvedByUserId: user.id,
      },
    });

    // Re-set the downstream slot to the new winner.
    if (nextMatch) {
      const isTeamASlot = match.bracketPosition % 2 === 1;
      const updateData = isTeamASlot
        ? { teamAId: winnerTeamId }
        : { teamBId: winnerTeamId };
      await tx.match.update({
        where: { id: nextMatch.id },
        data: updateData,
      });
    }

    return match.league.slug;
  });

  revalidatePath(`/leagues/${slug}`);
  revalidatePath(`/leagues/${slug}/manage`);
  revalidatePath("/dashboard");
}
