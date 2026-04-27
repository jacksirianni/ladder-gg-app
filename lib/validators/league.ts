import { z } from "zod";

const optionalLongText = (label: string) =>
  z
    .string()
    .trim()
    .max(500, `${label} must be 500 characters or fewer.`)
    .optional()
    .or(z.literal("").transform(() => undefined));

export const createLeagueSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "League name is required.")
    .max(80, "League name must be 80 characters or fewer."),
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
});

export type CreateLeagueInput = z.infer<typeof createLeagueSchema>;
