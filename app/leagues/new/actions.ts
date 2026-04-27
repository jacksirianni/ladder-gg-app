"use server";

import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { generateInviteToken } from "@/lib/token";
import { generateSlug } from "@/lib/slug";
import { createLeagueSchema } from "@/lib/validators/league";

export type CreateLeagueActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function createLeagueAction(
  _prev: CreateLeagueActionState,
  formData: FormData,
): Promise<CreateLeagueActionState> {
  const user = await requireAuth();

  const raw = {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    game: String(formData.get("game") ?? ""),
    teamSize: String(formData.get("teamSize") ?? ""),
    maxTeams: String(formData.get("maxTeams") ?? ""),
    buyInDollars: String(formData.get("buyInDollars") ?? ""),
    payoutPreset: String(formData.get("payoutPreset") ?? "WTA"),
    paymentInstructions: String(formData.get("paymentInstructions") ?? ""),
    prizeNotes: String(formData.get("prizeNotes") ?? ""),
  };

  const parsed = createLeagueSchema.safeParse(raw);
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

  const {
    buyInDollars,
    paymentInstructions,
    prizeNotes,
    ...rest
  } = parsed.data;
  const buyInCents = Math.round(buyInDollars * 100);

  // Retry on rare slug collisions.
  let slug = generateSlug(rest.name);
  for (let i = 0; i < 5; i++) {
    const existing = await prisma.league.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing) break;
    slug = generateSlug(rest.name);
  }

  const league = await prisma.league.create({
    data: {
      ...rest,
      buyInCents,
      paymentInstructions: paymentInstructions ?? null,
      prizeNotes: prizeNotes ?? null,
      slug,
      inviteToken: generateInviteToken(),
      organizerId: user.id,
    },
    select: { slug: true },
  });

  redirect(`/leagues/${league.slug}/manage`);
}
