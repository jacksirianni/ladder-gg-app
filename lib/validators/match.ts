import { z } from "zod";

export const submitMatchReportSchema = z.object({
  matchId: z.string().min(1, "Match id required."),
  winnerTeamId: z.string().min(1, "Pick a winner."),
  scoreText: z
    .string()
    .trim()
    .max(30, "Score must be 30 characters or fewer.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type SubmitMatchReportInput = z.infer<typeof submitMatchReportSchema>;
