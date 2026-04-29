import type { MatchFormat } from "@prisma/client";

/**
 * Single source of truth for match-format logic — validation rules,
 * winner derivation, and display labels. Used by both the report-modal
 * client validation and the server actions that persist scores.
 *
 * Rule of thumb: if you need to ask "is this score valid?" or "who
 * won?" anywhere in the codebase, it routes through this module.
 */

export type FormatRules = {
  format: MatchFormat;
  /** Human-readable label, e.g. "Best of 5". */
  label: string;
  /** Number of wins required to take the series (BO-N only). */
  winsRequired: number | null;
  /** Maximum sum of both teams' scores (BO-N: 2*winsRequired - 1). */
  maxTotal: number | null;
  /** Whether the winner is computed from the score (BO-N) or selected
   *  explicitly (SINGLE_SCORE / FREEFORM). */
  winnerDerived: boolean;
};

/**
 * Static metadata for each format. Prefer indexing this over a switch
 * everywhere you need format properties.
 */
export const FORMAT_RULES: Record<MatchFormat, FormatRules> = {
  BEST_OF_3: {
    format: "BEST_OF_3",
    label: "Best of 3",
    winsRequired: 2,
    maxTotal: 3,
    winnerDerived: true,
  },
  BEST_OF_5: {
    format: "BEST_OF_5",
    label: "Best of 5",
    winsRequired: 3,
    maxTotal: 5,
    winnerDerived: true,
  },
  BEST_OF_7: {
    format: "BEST_OF_7",
    label: "Best of 7",
    winsRequired: 4,
    maxTotal: 7,
    winnerDerived: true,
  },
  SINGLE_SCORE: {
    format: "SINGLE_SCORE",
    label: "Single game with score",
    winsRequired: null,
    maxTotal: null,
    winnerDerived: false,
  },
  FREEFORM: {
    format: "FREEFORM",
    label: "Free-form score",
    winsRequired: null,
    maxTotal: null,
    winnerDerived: false,
  },
};

export type ValidateScoreInput = {
  format: MatchFormat;
  teamAScore: number | null | undefined;
  teamBScore: number | null | undefined;
};

export type ValidateScoreResult =
  | { ok: true }
  | { ok: false; field: "teamAScore" | "teamBScore" | "score"; message: string };

/**
 * Validate a (teamAScore, teamBScore) pair against a format. Returns a
 * tagged result so callers can surface errors at the right input.
 *
 * BO-N rules:
 *   - both scores in [0, winsRequired]
 *   - exactly one team must hit winsRequired (the winner)
 *   - sum must be within [winsRequired, maxTotal]
 *
 * SINGLE_SCORE rules:
 *   - if either score is provided, both must be provided
 *   - both must be non-negative integers
 *   - winner is selected by the captain, not derived (caller responsibility)
 *
 * FREEFORM:
 *   - structured scores ignored entirely
 */
export function validateScore(input: ValidateScoreInput): ValidateScoreResult {
  const rules = FORMAT_RULES[input.format];

  // FREEFORM: structured fields aren't used.
  if (input.format === "FREEFORM") return { ok: true };

  const a = input.teamAScore ?? null;
  const b = input.teamBScore ?? null;

  if (input.format === "SINGLE_SCORE") {
    // Both null — captain didn't record a score, fine.
    if (a === null && b === null) return { ok: true };
    // Mixed null — incomplete, ask for the other half.
    if (a === null) {
      return { ok: false, field: "teamAScore", message: "Enter both scores or leave both blank." };
    }
    if (b === null) {
      return { ok: false, field: "teamBScore", message: "Enter both scores or leave both blank." };
    }
    if (!Number.isInteger(a) || a < 0) {
      return { ok: false, field: "teamAScore", message: "Score must be a non-negative whole number." };
    }
    if (!Number.isInteger(b) || b < 0) {
      return { ok: false, field: "teamBScore", message: "Score must be a non-negative whole number." };
    }
    return { ok: true };
  }

  // BEST_OF_N branches.
  const winsRequired = rules.winsRequired!;
  const maxTotal = rules.maxTotal!;

  if (a === null) {
    return { ok: false, field: "teamAScore", message: "Required for this format." };
  }
  if (b === null) {
    return { ok: false, field: "teamBScore", message: "Required for this format." };
  }
  if (!Number.isInteger(a) || a < 0 || a > winsRequired) {
    return {
      ok: false,
      field: "teamAScore",
      message: `Must be between 0 and ${winsRequired}.`,
    };
  }
  if (!Number.isInteger(b) || b < 0 || b > winsRequired) {
    return {
      ok: false,
      field: "teamBScore",
      message: `Must be between 0 and ${winsRequired}.`,
    };
  }
  if (a + b > maxTotal) {
    return {
      ok: false,
      field: "score",
      message: `Total games can't exceed ${maxTotal}.`,
    };
  }
  if (a + b < winsRequired) {
    return {
      ok: false,
      field: "score",
      message: `${rules.label} requires at least ${winsRequired} games played.`,
    };
  }
  if (a !== winsRequired && b !== winsRequired) {
    return {
      ok: false,
      field: "score",
      message: `One team needs ${winsRequired} wins to take the series.`,
    };
  }
  if (a === b) {
    // Defensive — shouldn't be reachable given the prior checks.
    return { ok: false, field: "score", message: "The series can't be a tie." };
  }
  return { ok: true };
}

/**
 * For BO-N, the winner is the team that hit winsRequired. For other
 * formats, returns null — the caller picks the winner explicitly.
 *
 * Returns one of "A" / "B" / null. Caller maps that to the team id.
 */
export function deriveBracketSide(
  format: MatchFormat,
  teamAScore: number | null | undefined,
  teamBScore: number | null | undefined,
): "A" | "B" | null {
  const rules = FORMAT_RULES[format];
  if (!rules.winnerDerived) return null;
  const winsRequired = rules.winsRequired!;
  if (teamAScore === winsRequired) return "A";
  if (teamBScore === winsRequired) return "B";
  return null;
}

/**
 * Pretty-print structured scores for inline display, e.g. "3-1" or
 * "13-9". Returns null if either side is null/undefined; caller falls
 * back to scoreText or omits the score entirely.
 */
export function formatScorePair(
  teamAScore: number | null | undefined,
  teamBScore: number | null | undefined,
): string | null {
  if (
    teamAScore === null ||
    teamAScore === undefined ||
    teamBScore === null ||
    teamBScore === undefined
  ) {
    return null;
  }
  return `${teamAScore}-${teamBScore}`;
}

// ---------------------------------------------------------------
// Game presets (v1.4 chip suggestions extended with v1.7 game depth)
// ---------------------------------------------------------------
//
// Clicking a game-suggestion chip on the create-league form hydrates
// matchFormat / rules / mapPool from this map. Game names match the
// v1.4 GAME_SUGGESTIONS list verbatim.

export type GamePreset = {
  matchFormat: MatchFormat;
  rules?: string;
  mapPool?: string;
  /** v1.9: suggested team size for this game (1 = solo, 5 = 5v5). */
  teamSize?: number;
  /** v1.9: suggested max teams for the bracket. Power-of-two friendly. */
  maxTeams?: number;
  /** v1.9: optional final-match format override (e.g. BO3 → BO5 final). */
  finalMatchFormat?: MatchFormat;
};

export const GAME_PRESETS: Record<string, GamePreset> = {
  "Super Smash Bros Ultimate": {
    matchFormat: "BEST_OF_3",
    finalMatchFormat: "BEST_OF_5",
    teamSize: 1,
    maxTeams: 8,
    rules:
      "3-stock, 7-min timer. Standard tournament stage list. 1 ban each, loser of last game picks first.",
  },
  "Rocket League": {
    matchFormat: "BEST_OF_5",
    finalMatchFormat: "BEST_OF_7",
    teamSize: 3,
    maxTeams: 8,
    rules: "3v3 standard. Casual rules. 5-min games.",
  },
  "Mario Kart 8 Deluxe": {
    matchFormat: "FREEFORM",
    teamSize: 1,
    maxTeams: 8,
    rules:
      "200cc, all items. Cup format — track point totals across 4 races. Highest total wins.",
  },
  Valorant: {
    matchFormat: "BEST_OF_3",
    finalMatchFormat: "BEST_OF_5",
    teamSize: 5,
    maxTeams: 8,
    rules:
      "Best of 3 maps. Standard competitive ruleset. NA region. Tournament map pool.",
    mapPool:
      "Bind\nHaven\nSplit\nAscent\nIcebox\nBreeze\nFracture\nPearl\nLotus",
  },
  "League of Legends": {
    matchFormat: "BEST_OF_3",
    finalMatchFormat: "BEST_OF_5",
    teamSize: 5,
    maxTeams: 8,
    rules:
      "Standard draft pick. Summoner's Rift. Tournament code optional — paste in evidence panel if used.",
  },
  FIFA: {
    matchFormat: "SINGLE_SCORE",
    teamSize: 1,
    maxTeams: 8,
    rules: "Single game. 6-min halves. Track final score (goals).",
  },
  "NBA 2K": {
    matchFormat: "SINGLE_SCORE",
    teamSize: 1,
    maxTeams: 8,
    rules: "Single game. 7-min quarters. Track final score (points).",
  },
  Madden: {
    matchFormat: "SINGLE_SCORE",
    teamSize: 1,
    maxTeams: 8,
    rules: "Single game. Default game length. Track final score (points).",
  },
  Fortnite: {
    matchFormat: "FREEFORM",
    teamSize: 4,
    maxTeams: 8,
    rules: "BR or custom mode. Track points / placement / elims as agreed.",
  },
  "Call of Duty": {
    matchFormat: "BEST_OF_5",
    finalMatchFormat: "BEST_OF_7",
    teamSize: 4,
    maxTeams: 8,
    rules:
      "Best of 5 maps. CDL ruleset by default — adjust if your league prefers casual.",
  },
  // v1.7: Overwatch deep support. Map pool reflects a representative
  // OW2 competitive rotation; organizer can edit per season.
  // v1.9: BO3 default, BO5 final — standard OW2 league pattern.
  "Overwatch 2": {
    matchFormat: "BEST_OF_3",
    finalMatchFormat: "BEST_OF_5",
    teamSize: 5,
    maxTeams: 8,
    rules:
      "Role queue (1 tank, 2 DPS, 2 support). Standard competitive ruleset. NA region.",
    mapPool:
      "Hanaoka\nKing's Row\nNumbani\nEsperança\nJunkertown\nLijiang Tower\nIlios\nSamoa",
  },
};

/**
 * Look up a game preset by display name (case-insensitive). Returns null
 * for custom / unknown games.
 */
export function getGamePreset(gameName: string): GamePreset | null {
  const normalized = gameName.trim();
  if (!normalized) return null;
  // Try exact first, then case-insensitive.
  if (GAME_PRESETS[normalized]) return GAME_PRESETS[normalized];
  const lower = normalized.toLowerCase();
  for (const key of Object.keys(GAME_PRESETS)) {
    if (key.toLowerCase() === lower) return GAME_PRESETS[key];
  }
  return null;
}

/**
 * v1.9: pick the format that applies to a specific match.
 *
 * If the league has a `finalMatchFormat` and the match is the final
 * (highest round in the bracket), use that. Otherwise fall back to
 * the league's default `matchFormat`.
 *
 * `totalRounds` should be the highest `round` in the bracket — caller
 * computes once per render and passes in.
 */
export function formatForMatch(args: {
  matchRound: number;
  totalRounds: number;
  matchFormat: MatchFormat;
  finalMatchFormat: MatchFormat | null;
}): MatchFormat {
  const { matchRound, totalRounds, matchFormat, finalMatchFormat } = args;
  if (
    finalMatchFormat !== null &&
    finalMatchFormat !== matchFormat &&
    matchRound === totalRounds &&
    totalRounds > 0
  ) {
    return finalMatchFormat;
  }
  return matchFormat;
}

/**
 * v1.9: human-readable description of the per-round format setup,
 * used on public/manage pages.
 *
 *   "Best of 3" — single format
 *   "Best of 3 · Final: Best of 5" — split formats
 */
export function describeFormatSplit(
  matchFormat: MatchFormat,
  finalMatchFormat: MatchFormat | null,
): string {
  const main = FORMAT_RULES[matchFormat].label;
  if (!finalMatchFormat || finalMatchFormat === matchFormat) {
    return main;
  }
  return `${main} · Final: ${FORMAT_RULES[finalMatchFormat].label}`;
}
