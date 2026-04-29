"use server";

import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { findOrCreateSeasonForOrganizer } from "@/lib/season";
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
    seasonName: String(formData.get("seasonName") ?? ""),
    // v1.6: visibility + scheduling.
    visibility: String(formData.get("visibility") ?? "UNLISTED"),
    registrationClosesAt: String(formData.get("registrationClosesAt") ?? ""),
    startsAt: String(formData.get("startsAt") ?? ""),
    lookingForTeams: formData.get("lookingForTeams") ?? undefined,
    // v1.7: match format + game depth.
    matchFormat: String(formData.get("matchFormat") ?? "SINGLE_SCORE"),
    rules: String(formData.get("rules") ?? ""),
    mapPool: String(formData.get("mapPool") ?? ""),
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
    seasonName,
    visibility,
    registrationClosesAt,
    startsAt,
    lookingForTeams,
    matchFormat,
    rules,
    mapPool,
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

  // v1.5: optional season. Empty → standalone league. Non-empty →
  // attach to an existing season the organizer owns (case-insensitive
  // name match), or create a new one.
  const league = await prisma.$transaction(async (tx) => {
    const season =
      seasonName && seasonName.length > 0
        ? await findOrCreateSeasonForOrganizer(seasonName, user.id, tx)
        : null;

    return tx.league.create({
      data: {
        ...rest,
        buyInCents,
        paymentInstructions: paymentInstructions ?? null,
        prizeNotes: prizeNotes ?? null,
        slug,
        inviteToken: generateInviteToken(),
        organizerId: user.id,
        seasonId: season?.id ?? null,
        // v1.6: visibility + scheduling.
        visibility,
        registrationClosesAt: registrationClosesAt ?? null,
        startsAt: startsAt ?? null,
        lookingForTeams: lookingForTeams ?? false,
        // v1.7: match format + game depth.
        matchFormat,
        rules: rules ?? null,
        mapPool: mapPool ?? null,
      },
      select: { slug: true },
    });
  });

  redirect(`/leagues/${league.slug}/manage`);
}
