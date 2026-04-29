import { z } from "zod";

// v1.7: optional integer score field. Empty → undefined; numeric strings
// coerce to integers. Negatives rejected. Format-specific bounds checked
// in lib/match-format.ts after parse so we can return targeted errors.
const optionalIntScore = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? undefined : v),
  z.coerce
    .number()
    .int("Score must be a whole number.")
    .min(0, "Score can't be negative.")
    .max(99, "Score can't exceed 99.")
    .optional(),
);

export const submitMatchReportSchema = z.object({
  matchId: z.string().min(1, "Match id required."),
  winnerTeamId: z.string().min(1, "Pick a winner."),
  scoreText: z
    .string()
    .trim()
    .max(30, "Score must be 30 characters or fewer.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  // v1.7: structured scores. Validated against League.matchFormat in
  // the action via lib/match-format.ts.
  reportedTeamAScore: optionalIntScore,
  reportedTeamBScore: optionalIntScore,
});

export type SubmitMatchReportInput = z.infer<typeof submitMatchReportSchema>;

export const resolveDisputeSchema = z.object({
  matchId: z.string().min(1, "Match id required."),
  winnerTeamId: z.string().min(1, "Pick a winner."),
  // v1.7: organizer can also record final scores at resolution time.
  teamAScore: optionalIntScore,
  teamBScore: optionalIntScore,
});

export type ResolveDisputeInput = z.infer<typeof resolveDisputeSchema>;

// v1.7: evidence attached to a match (during report, dispute, or
// resolution). Server-side validates that exactly one of url/textValue
// is populated based on kind — kept out of Zod so we can give targeted
// errors per kind.
const evidenceKindEnum = z.enum([
  "SCREENSHOT",
  "VOD_LINK",
  "REPLAY_CODE",
  "MATCH_LINK",
  "PROFILE_LINK",
  "NOTE",
]);

const optionalShortText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer.`)
    .optional()
    .or(z.literal("").transform(() => undefined));

export const evidenceItemSchema = z.object({
  kind: evidenceKindEnum,
  url: optionalShortText("URL", 500),
  textValue: optionalShortText("Value", 500),
  caption: optionalShortText("Caption", 100),
});

export type EvidenceItemInput = z.infer<typeof evidenceItemSchema>;

/** Parse an array of evidence rows from `formData.getAll("evidence")`. */
export function parseEvidenceRowsFromForm(
  rows: string[],
): EvidenceItemInput[] {
  const out: EvidenceItemInput[] = [];
  for (const raw of rows) {
    if (!raw) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    const result = evidenceItemSchema.safeParse(parsed);
    if (result.success) out.push(result.data);
  }
  return out;
}
