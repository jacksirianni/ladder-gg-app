import { z } from "zod";

export function createTeamSchema(teamSize: number) {
  const rosterCount = Math.max(0, teamSize - 1);

  return z.object({
    name: z
      .string()
      .trim()
      .min(1, "Team name is required.")
      .max(80, "Team name must be 80 characters or fewer."),
    rosterMembers: z
      .array(
        z
          .string()
          .trim()
          .min(1, "Roster member name is required.")
          .max(50, "Roster member name must be 50 characters or fewer."),
      )
      .length(
        rosterCount,
        rosterCount === 0
          ? "This is a solo league — no roster members."
          : `Provide ${rosterCount} roster member${rosterCount === 1 ? "" : "s"}.`,
      ),
  });
}
