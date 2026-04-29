import type { LeagueFormat, MatchBracket } from "@prisma/client";

/**
 * v2.0: pure helpers for double-elimination cascade.
 *
 * The "where does the winner / loser of this match go?" math lives here.
 * All exported functions are pure — given the same inputs, they always
 * return the same output. Heavily testable; no Prisma, no DB.
 *
 * Conventions:
 *   - `bracketSize` is the smallest power of 2 >= team count. v2.0-A
 *     requires double-elim leagues to have a power-of-2 team count
 *     (no byes), so for DE bracketSize == teamCount.
 *   - `round` and `bracketPosition` are 1-indexed.
 *   - Within each round, position 1 advances to next-round position 1
 *     (slot A) paired with position 2 (slot B); 3+4 → next position 2; etc.
 *
 * Bracket geometry recap (8 teams, DE):
 *   WB R1: 4 matches → 4 winners, 4 losers
 *   WB R2: 2 matches → 2 winners, 2 losers
 *   WB R3 (final): 1 match → 1 winner (to GF), 1 loser (drops to LB final)
 *   LB R1: 2 matches (4 WB R1 losers paired)
 *   LB R2: 2 matches (LB R1 winners + WB R2 losers)
 *   LB R3: 1 match (LB R2 winners — internal reduction)
 *   LB R4 (LB final): 1 match (LB R3 winner + WB R3 loser)
 *   GF:    1 match (WB final winner vs LB final winner)
 *   GR:    1 match if allowBracketReset && LB winner takes the GF
 *
 * Total matches: 2N - 2 (or 2N - 1 with bracket reset).
 */

/** Number of WB rounds for a power-of-2 team count. */
export function winnersRoundCount(bracketSize: number): number {
  return Math.log2(bracketSize);
}

/** Number of LB rounds for a power-of-2 team count. nLB = 2*nWB - 2. */
export function losersRoundCount(bracketSize: number): number {
  const nWB = winnersRoundCount(bracketSize);
  return Math.max(0, 2 * nWB - 2);
}

/**
 * Number of matches in a given round of a given bracket.
 *   WB round k:           bracketSize / 2^k matches (k = 1..nWB)
 *   LB round k (paired):  matches halve every two rounds.
 *     - k=1 (bootstrap):     bracketSize / 4
 *     - k=2 (merger):        bracketSize / 4
 *     - k=3 (internal):      bracketSize / 8
 *     - k=4 (merger):        bracketSize / 8
 *     - generally floor((k+1)/2) → exponent
 */
export function matchesInRound(
  bracket: "WINNERS" | "LOSERS",
  round: number,
  bracketSize: number,
): number {
  if (bracket === "WINNERS") {
    return Math.max(1, bracketSize / Math.pow(2, round));
  }
  // LOSERS: pairs of rounds share a count.
  // k=1,2 → /4; k=3,4 → /8; k=5,6 → /16; …
  const exponent = Math.floor((round + 1) / 2) + 1;
  return Math.max(1, bracketSize / Math.pow(2, exponent));
}

/**
 * Where does the winner of a given match go next?
 *
 *   - WB Rk Pp winner → WB R(k+1) P(ceil(p/2)) at slot A if p odd, B if p even.
 *     If R(k+1) doesn't exist in WB (i.e. k was the WB final), winner goes
 *     to GRAND_FINAL slot A.
 *   - LB Rk Pp winner → LB R(k+1) P(?) at slot ?
 *     - If R(k+1) doesn't exist (k was the LB final), winner goes to
 *       GRAND_FINAL slot B.
 *     - If R(k+1) is an "internal" round (next round halves matches),
 *       p maps to ceil(p/2), slot by parity.
 *     - If R(k+1) is a "merger" round (same number of matches), the
 *       LB winner takes slot A; the WB loser will fill slot B.
 *   - GRAND_FINAL winner → GRAND_RESET slot A iff `allowBracketReset` and
 *     LB winner won the GF; otherwise null (champion).
 *   - GRAND_RESET winner → null (champion).
 *
 * Returns null if this is the championship match.
 */
export function nextSlotForWinner(args: {
  bracket: MatchBracket;
  round: number;
  bracketPosition: number;
  bracketSize: number;
  /** When `bracket === GRAND_FINAL`, did the LB winner take it?
   *  Required to know whether to advance to a reset (yes) or end (no). */
  lbWinnerWonGrandFinal?: boolean;
  /** Whether the league allows the GF reset. Default true. */
  allowBracketReset?: boolean;
}): NextSlot | null {
  const {
    bracket,
    round,
    bracketPosition,
    bracketSize,
    lbWinnerWonGrandFinal = false,
    allowBracketReset = true,
  } = args;
  const nWB = winnersRoundCount(bracketSize);
  const nLB = losersRoundCount(bracketSize);

  if (bracket === "WINNERS") {
    if (round < nWB) {
      // Standard advance to next WB round.
      return {
        bracket: "WINNERS",
        round: round + 1,
        bracketPosition: Math.ceil(bracketPosition / 2),
        slot: bracketPosition % 2 === 1 ? "A" : "B",
      };
    }
    // WB final winner → GF slot A
    return { bracket: "GRAND_FINAL", round: 1, bracketPosition: 1, slot: "A" };
  }

  if (bracket === "LOSERS") {
    if (round < nLB) {
      const isCurrentMerger = lbRoundIsMerger(round);
      const nextIsMerger = lbRoundIsMerger(round + 1);
      // Number of matches in the next round determines whether positions halve.
      const halves = !nextIsMerger;
      // Decide slot for the LB winner in the next round:
      //   - If next round is a merger, the LB winner takes slot A.
      //     (The WB loser will fill slot B.)
      //   - If next round is internal, the LB winner pairs by parity.
      const slot: "A" | "B" = nextIsMerger
        ? "A"
        : bracketPosition % 2 === 1
          ? "A"
          : "B";
      const nextPosition = halves
        ? Math.ceil(bracketPosition / 2)
        : bracketPosition;
      // The current round's "internalness" doesn't affect the next-position
      // math directly — it's already encoded in matchesInRound — but we
      // capture the variable for readability/future tweaks.
      void isCurrentMerger;
      return {
        bracket: "LOSERS",
        round: round + 1,
        bracketPosition: nextPosition,
        slot,
      };
    }
    // LB final winner → GF slot B
    return { bracket: "GRAND_FINAL", round: 1, bracketPosition: 1, slot: "B" };
  }

  if (bracket === "GRAND_FINAL") {
    // If the LB winner took the GF and the league allows reset, advance
    // to GRAND_RESET. Otherwise the GF winner is the champion.
    if (lbWinnerWonGrandFinal && allowBracketReset) {
      // Both teams cascade to the reset; slots will be set by caller
      // (we don't know which side won at this layer — caller derives).
      return {
        bracket: "GRAND_RESET",
        round: 1,
        bracketPosition: 1,
        slot: "A",
      };
    }
    return null; // champion
  }

  // GRAND_RESET winner → champion.
  return null;
}

/**
 * Where does the loser of a given match go next? Only WB matches and the
 * GRAND_FINAL (with reset allowed) have a "next" for the loser.
 */
export function nextSlotForLoser(args: {
  bracket: MatchBracket;
  round: number;
  bracketPosition: number;
  bracketSize: number;
  /** Did the LB winner win the GF? Only relevant when bracket === GRAND_FINAL
   *  with reset allowed — the WB winner (loser of GF) drops into GRAND_RESET
   *  slot B for one more shot. */
  lbWinnerWonGrandFinal?: boolean;
  allowBracketReset?: boolean;
}): NextSlot | null {
  const {
    bracket,
    round,
    bracketPosition,
    bracketSize,
    lbWinnerWonGrandFinal = false,
    allowBracketReset = true,
  } = args;
  const nWB = winnersRoundCount(bracketSize);

  if (bracket === "WINNERS") {
    // WB R1 losers → LB R1 (bootstrap, paired by position).
    if (round === 1) {
      return {
        bracket: "LOSERS",
        round: 1,
        bracketPosition: Math.ceil(bracketPosition / 2),
        slot: bracketPosition % 2 === 1 ? "A" : "B",
      };
    }
    // WB R_k (k>=2) losers → LB R(2k - 2). The WB loser takes slot B
    // (LB winner from previous LB round takes slot A).
    // Position mapping: WB R_k position p drops to LB R(2k-2) position p.
    //   In WB R_k there are bracketSize / 2^k matches.
    //   In LB R(2k-2) there are also bracketSize / 2^k matches (merger
    //   round — same count as the LB round before it).
    return {
      bracket: "LOSERS",
      round: 2 * round - 2,
      bracketPosition: bracketPosition,
      slot: "B",
    };
  }

  if (bracket === "LOSERS") {
    // LB losers are eliminated. No cascade.
    return null;
  }

  if (bracket === "GRAND_FINAL") {
    // The GF loser is the runner-up unless the LB winner took the GF
    // and reset is allowed — then the WB winner (now GF loser) drops
    // into GRAND_RESET slot B for the rematch.
    if (lbWinnerWonGrandFinal && allowBracketReset) {
      return {
        bracket: "GRAND_RESET",
        round: 1,
        bracketPosition: 1,
        slot: "B",
      };
    }
    return null;
  }

  // GRAND_RESET loser is the runner-up.
  return null;
  void nWB; // referenced for future expansions
}

/** Returns true if LB round k is a "merger" round (receives WB losers). */
function lbRoundIsMerger(round: number): boolean {
  // LB R1 = bootstrap (no WB merger that round — receives WB R1 losers as
  //          fresh pairings, not as a "merger with LB winners"). For our
  //          purposes the bootstrap is treated like a merger because there
  //          are no LB winners yet — every team is fresh.
  // LB R2 = merger (LB R1 winners + WB R2 losers)
  // LB R3 = internal (LB R2 winners only)
  // LB R4 = merger (LB R3 winner + WB R3 loser)
  // ...
  // Even rounds (2, 4, 6, …) are mergers. R1 is bootstrap-merger.
  if (round === 1) return true;
  return round % 2 === 0;
}

export type NextSlot = {
  bracket: MatchBracket;
  round: number;
  bracketPosition: number;
  /** Which side of the next match this team takes. */
  slot: "A" | "B";
};

/**
 * Determine which bracket-side won the GF, given the GF's teamA/B + winner.
 * Used by the action layer to decide whether to trigger a reset.
 *
 * In our convention, GF slot A = WB final winner, slot B = LB final winner.
 */
export function lbWonGrandFinal(args: {
  teamAId: string | null;
  teamBId: string | null;
  winnerTeamId: string | null;
}): boolean {
  return (
    args.winnerTeamId !== null &&
    args.winnerTeamId === args.teamBId
  );
}

/**
 * Whether a given league format is double-elimination. Tiny convenience
 * to keep call sites readable.
 */
export function isDoubleElim(format: LeagueFormat): boolean {
  return format === "DOUBLE_ELIM";
}
