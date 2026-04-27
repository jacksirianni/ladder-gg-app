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
