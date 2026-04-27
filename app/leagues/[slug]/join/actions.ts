"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
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
  if (!slug || !token) {
    return { error: "Invalid invite link." };
  }

  const league = await prisma.league.findUnique({
    where: { slug },
    include: { _count: { select: { teams: true } } },
  });
  if (!league || league.inviteToken !== token) {
    return { error: "Invite link is invalid." };
  }
  if (league.state !== "OPEN") {
    return { error: "Registration is not open for this league." };
  }
  if (league._count.teams >= league.maxTeams) {
    return { error: "This league is full." };
  }

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

  let teamId: string;
  try {
    const team = await prisma.team.create({
      data: {
        leagueId: league.id,
        captainUserId: user.id,
        name: parsed.data.name,
        paymentStatus: "PENDING",
        roster: {
          create: parsed.data.rosterMembers.map((displayName, position) => ({
            displayName,
            position,
          })),
        },
      },
      select: { id: true },
    });
    teamId = team.id;
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
