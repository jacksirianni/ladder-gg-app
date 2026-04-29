"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { canJoinLeague } from "@/lib/league-access";
import { createTeamSchema } from "@/lib/validators/team";

export type CreateTeamActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function createTeamAction(
  _prev: CreateTeamActionState,
  formData: FormData,
): Promise<CreateTeamActionState> {
  const user = await requireAuth();

  const slug = String(formData.get("slug") ?? "");
  const token = String(formData.get("token") ?? "");
  if (!slug) {
    return { error: "Invalid league." };
  }

  // First fetch — used to bail early without holding a transaction open.
  // The authoritative checks repeat inside the transaction below.
  const league = await prisma.league.findUnique({
    where: { slug },
    select: {
      id: true,
      state: true,
      visibility: true,
      inviteToken: true,
      maxTeams: true,
      teamSize: true,
      registrationClosesAt: true,
    },
  });
  if (!league) {
    return { error: "League not found." };
  }

  // Roster validation can happen outside the transaction since it's
  // pure form parsing.
  const rosterMembers = formData.getAll("rosterMembers").map(String);
  const parsed = createTeamSchema(league.teamSize).safeParse({
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

  // Race-safe registration. The capacity check runs inside the
  // transaction against a fresh team count so two concurrent joins on
  // the last spot can't both succeed. canJoinLeague is also used by
  // the join page for display — single source of truth.
  let teamId: string;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const [viewerTeam, teamCount] = await Promise.all([
        tx.team.findUnique({
          where: {
            leagueId_captainUserId: {
              leagueId: league.id,
              captainUserId: user.id,
            },
          },
          select: { id: true },
        }),
        tx.team.count({ where: { leagueId: league.id } }),
      ]);

      const access = canJoinLeague(
        {
          state: league.state,
          visibility: league.visibility,
          inviteToken: league.inviteToken,
          maxTeams: league.maxTeams,
          registrationClosesAt: league.registrationClosesAt,
        },
        {
          viewerId: user.id,
          viewerHasTeam: viewerTeam !== null,
          token,
          teamCount,
        },
      );

      if (access.kind !== "ALLOW") {
        return { error: errorMessageForAccess(access) };
      }

      const team = await tx.team.create({
        data: {
          leagueId: league.id,
          captainUserId: user.id,
          name: parsed.data.name,
          paymentStatus: "PENDING",
          roster: {
            create: parsed.data.rosterMembers.map(
              (displayName, position) => ({
                displayName,
                position,
              }),
            ),
          },
        },
        select: { id: true },
      });
      return { teamId: team.id };
    });

    if ("error" in result) {
      return { error: result.error };
    }
    teamId = result.teamId;
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return { error: "You already have a team in this league." };
    }
    throw e;
  }

  redirect(`/leagues/${slug}/join/success?team=${teamId}`);
}

/**
 * Convert a `canJoinLeague` block result into a user-facing error
 * string for the action layer. The page layer renders richer states
 * directly off the discriminated union.
 */
function errorMessageForAccess(
  access: ReturnType<typeof canJoinLeague>,
): string {
  switch (access.kind) {
    case "ALLOW":
      // Unreachable — caller checks for ALLOW before calling.
      return "Allowed.";
    case "ALREADY_REGISTERED":
      return "You already have a team in this league.";
    case "BLOCK_NEEDS_AUTH":
      return "Sign in to register a team.";
    case "BLOCK_DRAFT":
      return "This league hasn't been published yet.";
    case "BLOCK_NOT_OPEN":
      return access.state === "CANCELLED"
        ? "This league was cancelled."
        : access.state === "COMPLETED"
          ? "This league has finished."
          : "This league has already started.";
    case "BLOCK_DEADLINE":
      return "Registration has closed for this league.";
    case "BLOCK_FULL":
      return `This league is full (${access.maxTeams} of ${access.maxTeams}).`;
    case "BLOCK_NEEDS_TOKEN":
      return "An invite link is required to register. Ask the organizer.";
    case "BLOCK_BAD_TOKEN":
      return "Invite link is invalid.";
  }
}
