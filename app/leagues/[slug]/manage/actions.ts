"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { requireLeagueOrganizer } from "@/lib/permissions/league";
import {
  canCancelLeague,
  canPublishLeague,
} from "@/lib/transitions/league";

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
