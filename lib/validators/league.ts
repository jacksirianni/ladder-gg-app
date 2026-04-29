import { z } from "zod";

const optionalLongText = (label: string) =>
  z
    .string()
    .trim()
    .max(500, `${label} must be 500 characters or fewer.`)
    .optional()
    .or(z.literal("").transform(() => undefined));

// v1.5: optional season name. Empty/whitespace → standalone league.
const optionalSeasonName = z
  .string()
  .trim()
  .max(80, "Season name must be 80 characters or fewer.")
  .optional()
  .or(z.literal("").transform(() => undefined));

// v1.6: optional datetime field. Accepts datetime-local-style strings or
// empty. Past dates are accepted (organizer might be importing a real-
// world calendar) — the lifecycle gates handle the semantics.
const optionalDateTime = z
  .preprocess(
    (v) => (v === "" || v === undefined ? undefined : v),
    z.coerce.date().optional(),
  )
  .pipe(z.date().optional());

const visibilityEnum = z.enum(["INVITE_ONLY", "UNLISTED", "OPEN_JOIN"]);

// v1.6: a checkbox submits "on" / undefined; coerce to boolean.
const checkboxBoolean = z
  .preprocess(
    (v) => v === "on" || v === "true" || v === true,
    z.boolean(),
  )
  .pipe(z.boolean());

const sharedLeagueFields = {
  description: optionalLongText("Description"),
  game: z
    .string()
    .trim()
    .min(1, "Game is required.")
    .max(50, "Game must be 50 characters or fewer."),
  teamSize: z.coerce
    .number()
    .int("Team size must be a whole number.")
    .min(1, "Team size must be at least 1.")
    .max(10, "Team size must be 10 or fewer."),
  maxTeams: z.coerce
    .number()
    .int("Max teams must be a whole number.")
    .min(2, "Need at least 2 teams.")
    .max(32, "Max teams must be 32 or fewer."),
  buyInDollars: z.coerce
    .number()
    .min(0, "Entry fee cannot be negative.")
    .max(10000, "Entry fee must be $10,000 or less."),
  payoutPreset: z.enum(["WTA", "TOP_2", "TOP_3"]),
  paymentInstructions: optionalLongText("Payment instructions"),
  prizeNotes: optionalLongText("Prize notes"),
  // v1.6: visibility + scheduling controls.
  visibility: visibilityEnum.default("UNLISTED"),
  registrationClosesAt: optionalDateTime,
  startsAt: optionalDateTime,
  lookingForTeams: checkboxBoolean.default(false),
};

// v1.6: invariant — when both timestamps are set, the deadline must be
// on or before the scheduled start. A deadline AFTER start is non-
// sensical (you can't register for a bracket that's already running).
function refineScheduling(data: {
  registrationClosesAt?: Date;
  startsAt?: Date;
}) {
  if (
    data.registrationClosesAt &&
    data.startsAt &&
    data.registrationClosesAt.getTime() > data.startsAt.getTime()
  ) {
    return false;
  }
  return true;
}

const refineSchedulingMessage =
  "Registration must close on or before the scheduled start.";

export const createLeagueSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "League name is required.")
      .max(80, "League name must be 80 characters or fewer."),
    seasonName: optionalSeasonName,
    ...sharedLeagueFields,
  })
  .refine(refineScheduling, {
    message: refineSchedulingMessage,
    path: ["registrationClosesAt"],
  });

export type CreateLeagueInput = z.infer<typeof createLeagueSchema>;

// Same shape as create minus `name` — name is not editable post-create.
export const updateLeagueSchema = z
  .object(sharedLeagueFields)
  .refine(refineScheduling, {
    message: refineSchedulingMessage,
    path: ["registrationClosesAt"],
  });

export type UpdateLeagueInput = z.infer<typeof updateLeagueSchema>;
