import type { LeagueFormat, MatchBracket } from "@prisma/client";

/**
 * Bracket generators for single- and double-elimination.
 *
 * v2.0: split from a single function. `generateBracketMatches` now
 * dispatches by format. Single-elim continues to support any team
 * count via byes (v1.8 fix). Double-elim requires a power-of-2 team
 * count in v2.0-A — bye support for DE is deferred to v2.1.
 */

export type GeneratedMatch = {
  bracket: MatchBracket;
  round: number;
  bracketPosition: number;
  teamAId: string | null;
  teamBId: string | null;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Top-level dispatch by format.
 *
 * @param teamIds - shuffled or unshuffled team ids; we always shuffle
 *                  internally for randomness
 * @param format - SINGLE_ELIM or DOUBLE_ELIM
 * @param options - format-specific options (allowBracketReset)
 */
export function generateBracketMatches(
  teamIds: string[],
  format: LeagueFormat = "SINGLE_ELIM",
  options: { allowBracketReset?: boolean } = {},
): GeneratedMatch[] {
  if (format === "DOUBLE_ELIM") {
    return generateDoubleElim(teamIds, options.allowBracketReset ?? true);
  }
  return generateSingleElim(teamIds);
}

/**
 * Single-elimination generator. Preserved from v1.8 (post bye-fix).
 * Any team count >= 2 is supported; non-power-of-2 counts use byes.
 *
 * Total matches = N - 1.
 */
export function generateSingleElim(teamIds: string[]): GeneratedMatch[] {
  const N = teamIds.length;
  if (N < 2) {
    throw new Error("Need at least 2 teams to generate a bracket.");
  }

  const shuffled = shuffle(teamIds);
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(N)));
  const byes = bracketSize - N;
  const totalRounds = Math.log2(bracketSize);

  const matches: GeneratedMatch[] = [];

  // Round 1: bottom (N - byes) shuffled teams play.
  const r1Teams = shuffled.slice(byes);
  const r1MatchCount = r1Teams.length / 2;
  for (let i = 0; i < r1MatchCount; i++) {
    matches.push({
      bracket: "WINNERS",
      round: 1,
      bracketPosition: i + 1,
      teamAId: r1Teams[2 * i],
      teamBId: r1Teams[2 * i + 1],
    });
  }

  if (totalRounds === 1) return matches;

  // Round 2: bye teams placed at the END of slots so R1 winners
  // (which cascade in position order) don't overwrite them. (v1.8 fix)
  const byeTeams = shuffled.slice(0, byes);
  const r2MatchCount = bracketSize / 4;
  const r2SlotCount = r2MatchCount * 2;

  const r2Slots: (string | null)[] = [];
  for (let slot = 0; slot < r2SlotCount; slot++) {
    if (slot < r1MatchCount) {
      r2Slots.push(null);
    } else {
      const byeIdx = slot - r1MatchCount;
      r2Slots.push(byeTeams[byeIdx] ?? null);
    }
  }

  for (let i = 0; i < r2MatchCount; i++) {
    matches.push({
      bracket: "WINNERS",
      round: 2,
      bracketPosition: i + 1,
      teamAId: r2Slots[2 * i],
      teamBId: r2Slots[2 * i + 1],
    });
  }

  // Rounds 3 onward: empty matches, filled in as upstream confirms.
  let prevRoundMatches = r2MatchCount;
  let round = 3;
  while (prevRoundMatches > 1) {
    const thisRoundMatches = prevRoundMatches / 2;
    for (let i = 0; i < thisRoundMatches; i++) {
      matches.push({
        bracket: "WINNERS",
        round,
        bracketPosition: i + 1,
        teamAId: null,
        teamBId: null,
      });
    }
    prevRoundMatches = thisRoundMatches;
    round++;
  }

  return matches;
}

/**
 * Double-elimination generator.
 *
 * v2.0-A constraint: requires a power-of-2 team count (4, 8, 16, 32).
 * The validator enforces this before we get here.
 *
 * Geometry for N teams (power of 2):
 *   - WB: log2(N) rounds, total N-1 matches (same as SE)
 *   - LB: 2 * log2(N) - 2 rounds, total N-2 matches
 *   - 1 grand final + optional 1 grand reset
 *   - Total: 2N - 2 (or 2N - 1 with reset slot)
 *
 * Initial state:
 *   - WB R1 has all teams paired (no byes since power-of-2)
 *   - All later WB matches are PENDING with null teams
 *   - LB matches are PENDING with null teams (filled by cascade)
 *   - GF and (optional) GR are PENDING with null teams
 */
export function generateDoubleElim(
  teamIds: string[],
  allowBracketReset: boolean,
): GeneratedMatch[] {
  const N = teamIds.length;
  if (N < 4) {
    throw new Error("Double elimination requires at least 4 teams.");
  }
  // Power-of-2 enforcement: log2 must be integer.
  const lg = Math.log2(N);
  if (lg !== Math.floor(lg)) {
    throw new Error(
      `Double elimination requires a power-of-2 team count (4, 8, 16, 32). Got ${N}.`,
    );
  }

  const shuffled = shuffle(teamIds);
  const bracketSize = N;
  const nWB = Math.log2(bracketSize);
  const nLB = Math.max(0, 2 * nWB - 2);

  const matches: GeneratedMatch[] = [];

  // ---- Winners bracket ----
  // R1: all teams paired in shuffle order.
  const r1Count = bracketSize / 2;
  for (let i = 0; i < r1Count; i++) {
    matches.push({
      bracket: "WINNERS",
      round: 1,
      bracketPosition: i + 1,
      teamAId: shuffled[2 * i],
      teamBId: shuffled[2 * i + 1],
    });
  }
  // R2..nWB: empty placeholders.
  for (let r = 2; r <= nWB; r++) {
    const count = bracketSize / Math.pow(2, r);
    for (let i = 0; i < count; i++) {
      matches.push({
        bracket: "WINNERS",
        round: r,
        bracketPosition: i + 1,
        teamAId: null,
        teamBId: null,
      });
    }
  }

  // ---- Losers bracket ----
  // Pair-of-rounds geometry: LB R(2k-1) and LB R(2k) both have
  // bracketSize / 2^(k+1) matches. (R1, R2: /4; R3, R4: /8; ...)
  for (let r = 1; r <= nLB; r++) {
    const k = Math.floor((r + 1) / 2);
    const count = Math.max(1, bracketSize / Math.pow(2, k + 1));
    for (let i = 0; i < count; i++) {
      matches.push({
        bracket: "LOSERS",
        round: r,
        bracketPosition: i + 1,
        teamAId: null,
        teamBId: null,
      });
    }
  }

  // ---- Grand final ----
  matches.push({
    bracket: "GRAND_FINAL",
    round: 1,
    bracketPosition: 1,
    teamAId: null,
    teamBId: null,
  });

  // ---- Optional grand reset ----
  if (allowBracketReset) {
    matches.push({
      bracket: "GRAND_RESET",
      round: 1,
      bracketPosition: 1,
      teamAId: null,
      teamBId: null,
    });
  }

  return matches;
}
